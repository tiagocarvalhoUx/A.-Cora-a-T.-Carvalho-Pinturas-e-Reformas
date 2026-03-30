const Budget = require('../models/Budget');

exports.createBudget = async (req, res) => {
  try {
    const { serviceType, description, area, address, phone } = req.body;
    const photos = req.files?.map((f) => ({ url: f.path, publicId: f.filename })) || [];

    const budget = new Budget({
      client: req.user._id,
      serviceType,
      description,
      phone: phone || null,
      area: Number(area),
      address: typeof address === 'string' ? JSON.parse(address) : address,
      photos,
    });
    budget.estimatedPrice = budget.calculateEstimate();
    await budget.save();
    await budget.populate('client', 'name email phone');

    res.status(201).json({ budget });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    const budget = await Budget.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!budget) return res.status(404).json({ message: 'Orçamento não encontrado' });
    res.json({ budget });
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
