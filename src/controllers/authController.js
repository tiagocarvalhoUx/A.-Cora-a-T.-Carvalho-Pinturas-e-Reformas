const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getFirebaseAuthAdmin } = require('../services/firebaseAdmin');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

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
