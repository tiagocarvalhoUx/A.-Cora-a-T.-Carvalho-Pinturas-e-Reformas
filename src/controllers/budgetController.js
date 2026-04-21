const Budget = require('../models/Budget');

exports.createBudget = async (req, res) => {
  try {
    const { serviceType, description, area, address, phone } = req.body;

    if (!serviceType || !description || !area || !address) {
      return res.status(400).json({ message: 'Campos obrigatórios: serviceType, description, area, address' });
    }

    let parsedAddress;
    try {
      parsedAddress = typeof address === 'string' ? JSON.parse(address) : address;
    } catch {
      return res.status(400).json({ message: 'Endereço inválido.' });
    }

    // f.path exists when using CloudinaryStorage; skip if using memoryStorage (no path/filename)
    const photos = (req.files || [])
      .filter((f) => f.path)
      .map((f) => ({ url: f.path, publicId: f.filename }));

    const budget = new Budget({
      client: req.user._id,
      serviceType,
      description,
      phone: phone || null,
      area: Number(area),
      address: parsedAddress,
      photos,
    });
    budget.estimatedPrice = budget.calculateEstimate();
    await budget.save();
    await budget.populate('client', 'name email phone');

    res.status(201).json({ budget });
  } catch (err) {
    console.error('createBudget error:', err);
    res.status(500).json({ message: err.message || 'Erro interno ao criar orçamento.' });
  }
};

exports.getMyBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({ client: req.user._id }).sort({ createdAt: -1 });
    res.json({ budgets });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllBudgets = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const budgets = await Budget.find(filter)
      .populate('client', 'name email phone avatar')
      .sort({ createdAt: -1 });
    res.json({ budgets });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBudgetById = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id).populate('client', 'name email phone avatar');
    if (!budget) return res.status(404).json({ message: 'Orçamento não encontrado' });

    const isOwner = budget.client._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Acesso negado' });

    res.json({ budget });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateBudget = async (req, res) => {
  try {
    const updates = { ...req.body };

    // Convert scheduledDate from DD/MM/YYYY to ISO if needed
    if (updates.scheduledDate && typeof updates.scheduledDate === 'string') {
      const parts = updates.scheduledDate.split('/');
      if (parts.length === 3) {
        // DD/MM/YYYY → YYYY-MM-DD
        updates.scheduledDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        updates.scheduledDate = new Date(updates.scheduledDate);
      }
      if (isNaN(updates.scheduledDate)) delete updates.scheduledDate;
    }

    const budget = await Budget.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('client', 'name email phone avatar');

    if (!budget) return res.status(404).json({ message: 'Orçamento não encontrado' });
    res.json({ budget });
  } catch (err) {
    console.error('updateBudget error:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findByIdAndDelete(req.params.id);
    if (!budget) return res.status(404).json({ message: 'Orçamento não encontrado' });
    res.json({ message: 'Orçamento excluído.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.rateBudget = async (req, res) => {
  try {
    const { stars, comment } = req.body;
    const budget = await Budget.findOne({ _id: req.params.id, client: req.user._id });
    if (!budget) return res.status(404).json({ message: 'Orçamento não encontrado' });
    if (budget.status !== 'completed') return res.status(400).json({ message: 'Serviço ainda não concluído' });

    budget.rating = { stars, comment };
    await budget.save();
    res.json({ budget });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
