const crypto = require('crypto');
const Budget = require('../models/Budget');
const User = require('../models/User');

const normalizeEmail = (email = '') => String(email).trim().toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const BUSINESS_WHATSAPP = process.env.BUSINESS_WHATSAPP || '5518981142927';

const getApiBaseUrl = (req) => {
  const configured = process.env.PUBLIC_API_URL || process.env.API_URL;
  if (configured) return configured.replace(/\/api\/?$/, '').replace(/\/$/, '');
  const proto = req.get('x-forwarded-proto') || req.protocol;
  return `${proto}://${req.get('host')}`;
};

const parseAddress = (address) => {
  if (!address) return null;
  return typeof address === 'string' ? JSON.parse(address) : address;
};

async function getOrCreateClient({ reqUser, name, email, phone }) {
  if (reqUser) return reqUser;

  const normalizedPhone = String(phone || '').replace(/\D/g, '');
  const fallbackEmail = normalizedPhone ? `${normalizedPhone}@whatsapp.local` : null;
  const userEmail = email && isValidEmail(email) ? email : fallbackEmail;
  if (!userEmail) throw new Error('Informe um WhatsApp valido.');

  const existing = await User.findOne({ email: userEmail });
  if (existing) {
    existing.name = name;
    if (phone) existing.phone = phone;
    await existing.save();
    return existing;
  }

  return User.create({
    name,
    email: userEmail,
    phone,
    password: crypto.randomBytes(24).toString('hex'),
    role: 'client',
  });
}

function makeWhatsappLink({ budget, code }) {
  const message = [
    `Ola, quero validar meu agendamento.`,
    `Codigo: ${code}`,
    `Orcamento: ${budget._id}`,
    `Nome: ${budget.contactName}`,
    `WhatsApp: ${budget.phone || ''}`,
  ].join('\n');

  return `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

exports.createBudget = async (req, res) => {
  try {
    const { serviceType, description, area, address, phone, name } = req.body;
    const email = normalizeEmail(req.body.email || req.user?.email);
    const contactName = String(name || req.user?.name || '').trim();

    if (!contactName) {
      return res.status(400).json({ message: 'Informe seu nome.' });
    }

    if (!phone || String(phone).replace(/\D/g, '').length < 10) {
      return res.status(400).json({ message: 'Informe um WhatsApp valido para validacao.' });
    }

    if (!serviceType || !description || !area || !address) {
      return res.status(400).json({ message: 'Campos obrigatorios: serviceType, description, area, address' });
    }

    let parsedAddress;
    try {
      parsedAddress = parseAddress(address);
    } catch {
      return res.status(400).json({ message: 'Endereco invalido.' });
    }

    const photos = (req.files || [])
      .filter((f) => f.path)
      .map((f) => ({ url: f.path, publicId: f.filename }));

    const client = await getOrCreateClient({
      reqUser: req.user,
      name: contactName,
      email,
      phone,
    });

    const whatsappValidationCode = crypto.randomInt(100000, 999999).toString();
    const budget = new Budget({
      client: client._id,
      contactName,
      contactEmail: email && isValidEmail(email) ? email : null,
      serviceType,
      description,
      phone: phone || null,
      area: Number(area),
      address: parsedAddress,
      photos,
      contactValidationMethod: 'whatsapp',
      whatsappValidationCode,
      whatsappValidationRequestedAt: new Date(),
    });

    budget.estimatedPrice = budget.calculateEstimate();
    await budget.save();
    await budget.populate('client', 'name email phone');

    const whatsappLink = makeWhatsappLink({ budget, code: whatsappValidationCode });

    return res.status(201).json({
      budget,
      whatsappLink,
      whatsappValidationCode,
      message: 'Orcamento enviado. Valide pelo WhatsApp para confirmar o atendimento.',
    });
  } catch (err) {
    console.error('createBudget error:', err);
    return res.status(500).json({ message: err.message || 'Erro interno ao criar orcamento.' });
  }
};

exports.verifyBudgetEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('Token ausente.');

    const budget = await Budget.findOne({
      emailVerificationToken: hashToken(String(token)),
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!budget) {
      return res.status(400).send(`
        <html><body style="font-family:Arial,sans-serif;background:#101010;color:#fff;padding:32px">
          <h1>Link invalido ou expirado</h1>
          <p>Solicite um novo agendamento pelo site.</p>
        </body></html>
      `);
    }

    budget.emailVerified = true;
    budget.emailVerifiedAt = new Date();
    budget.emailVerificationToken = null;
    budget.emailVerificationExpires = null;
    await budget.save();

    return res.send(`
      <html><body style="font-family:Arial,sans-serif;background:#101010;color:#fff;padding:32px">
        <h1>Email validado</h1>
        <p>Seu agendamento foi validado. Nossa equipe entrara em contato em breve.</p>
      </body></html>
    `);
  } catch (err) {
    console.error('verifyBudgetEmail error:', err);
    return res.status(500).send('Erro ao validar email.');
  }
};

exports.getMyBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ client: req.user._id }).sort({ createdAt: -1 });
    return res.json({ budgets });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getAllBudgets = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const budgets = await Budget.find(filter)
      .populate('client', 'name email phone avatar')
      .sort({ createdAt: -1 });
    return res.json({ budgets });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getBudgetById = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id).populate('client', 'name email phone avatar');
    if (!budget) return res.status(404).json({ message: 'Orcamento nao encontrado' });

    const isOwner = budget.client._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Acesso negado' });

    return res.json({ budget });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateBudget = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (updates.scheduledDate && typeof updates.scheduledDate === 'string') {
      const parts = updates.scheduledDate.split('/');
      updates.scheduledDate = parts.length === 3
        ? new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
        : new Date(updates.scheduledDate);
      if (isNaN(updates.scheduledDate)) delete updates.scheduledDate;
    }

    const budget = await Budget.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('client', 'name email phone avatar');

    if (!budget) return res.status(404).json({ message: 'Orcamento nao encontrado' });
    return res.json({ budget });
  } catch (err) {
    console.error('updateBudget error:', err);
    return res.status(500).json({ message: err.message });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findByIdAndDelete(req.params.id);
    if (!budget) return res.status(404).json({ message: 'Orcamento nao encontrado' });
    return res.json({ message: 'Orcamento excluido.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.rateBudget = async (req, res) => {
  try {
    const { stars, comment } = req.body;
    const budget = await Budget.findOne({ _id: req.params.id, client: req.user._id });
    if (!budget) return res.status(404).json({ message: 'Orcamento nao encontrado' });
    if (budget.status !== 'completed') return res.status(400).json({ message: 'Servico ainda nao concluido' });

    budget.rating = { stars, comment };
    await budget.save();
    return res.json({ budget });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
