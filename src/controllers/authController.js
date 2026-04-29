const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const MagicLinkToken = require('../models/MagicLinkToken');
const { sendMagicLinkEmail } = require('../services/magicLinkMailer');
const { getFirebaseAuthAdmin } = require('../services/firebaseAdmin');

const MAGIC_LINK_TTL_MIN = 15;

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const firstClientUrl = () => {
  const configured = process.env.PUBLIC_APP_URL || process.env.CLIENT_URL;
  return configured?.split(',')[0]?.trim()?.replace(/\/$/, '');
};

const requestOrigin = (req) => {
  const origin = req.get('origin');
  return origin?.startsWith('http') ? origin.replace(/\/$/, '') : null;
};

const buildMagicLink = (req, token) => {
  const configured = process.env.MAGIC_LINK_REDIRECT_URL;
  const webBase = firstClientUrl() || requestOrigin(req);
  const base = configured?.startsWith('http')
    ? configured
    : webBase
      ? `${webBase}/magic-link`
      : configured || 'acoraca://magic-link';
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}token=${token}`;
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'E-mail já cadastrado' });

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: role === 'admin' ? 'admin' : 'client',
    });

    const token = signToken(user._id);
    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'E-mail ou senha incorretos' });
    }
    if (!user.isActive) return res.status(403).json({ message: 'Conta desativada' });

    const token = signToken(user._id);
    user.password = undefined;
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};

exports.updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    await User.findByIdAndUpdate(req.user._id, { fcmToken });
    res.json({ message: 'Token FCM atualizado' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.requestMagicLink = async (req, res) => {
  const successResponse = {
    message: 'Se o e-mail estiver válido, enviaremos um link de acesso em instantes.',
  };

  try {
    const rawEmail = (req.body?.email || '').toString().trim().toLowerCase();
    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return res.status(400).json({ message: 'E-mail inválido' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MIN * 60 * 1000);

    await MagicLinkToken.create({
      email: rawEmail,
      tokenHash,
      expiresAt,
      requestIp: req.ip,
    });

    const link = buildMagicLink(req, token);

    try {
      await sendMagicLinkEmail({ to: rawEmail, link });
    } catch (mailErr) {
      console.error('[magic-link] falha ao enviar e-mail:', mailErr.message);
      return res.status(502).json({ message: 'Não foi possível enviar o e-mail no momento. Tente novamente.' });
    }

    return res.json(successResponse);
  } catch (err) {
    console.error('[magic-link] request error:', err);
    return res.status(500).json({ message: 'Erro ao processar solicitação' });
  }
};

exports.verifyMagicLink = async (req, res) => {
  try {
    const token = (req.body?.token || '').toString().trim();
    if (!token || token.length < 32) {
      return res.status(400).json({ message: 'Token inválido' });
    }

    const tokenHash = hashToken(token);
    const record = await MagicLinkToken.findOne({ tokenHash });

    if (!record) return res.status(400).json({ message: 'Link inválido' });
    if (record.usedAt) return res.status(400).json({ message: 'Este link já foi utilizado' });
    if (record.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: 'Link expirado. Solicite um novo.' });
    }

    record.usedAt = new Date();
    await record.save();

    let user = await User.findOne({ email: record.email });
    if (!user) {
      const placeholderPassword = crypto.randomBytes(24).toString('hex');
      user = await User.create({
        name: record.email.split('@')[0],
        email: record.email,
        password: placeholderPassword,
        role: 'client',
      });
    }
    if (!user.isActive) return res.status(403).json({ message: 'Conta desativada' });

    const jwtToken = signToken(user._id);
    return res.json({ token: jwtToken, user });
  } catch (err) {
    console.error('[magic-link] verify error:', err);
    return res.status(500).json({ message: 'Erro ao validar link' });
  }
};

exports.verifyFirebaseMagicLink = async (req, res) => {
  try {
    const idToken = (req.body?.idToken || '').toString().trim();
    if (!idToken) {
      return res.status(400).json({ message: 'Token do Firebase nao informado' });
    }

    const decoded = await getFirebaseAuthAdmin().verifyIdToken(idToken);
    const email = (decoded.email || '').toString().trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: 'E-mail nao disponivel no token do Firebase' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      const placeholderPassword = crypto.randomBytes(24).toString('hex');
      user = await User.create({
        name: decoded.name || email.split('@')[0],
        email,
        password: placeholderPassword,
        role: 'client',
      });
    }

    if (!user.isActive) return res.status(403).json({ message: 'Conta desativada' });

    const token = signToken(user._id);
    return res.json({ token, user });
  } catch (err) {
    console.error('[firebase-auth] verify error:', err);
    return res.status(401).json({
      message:
        'Nao foi possivel validar o acesso com Firebase. Confira a configuracao do Firebase Admin no backend.',
    });
  }
};
