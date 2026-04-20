const User = require('../models/User');
const Budget = require('../models/Budget');

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const update = { name, phone, address };
    if (req.file) update.avatar = req.file.path;

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.setRole = async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!['client', 'admin'].includes(role)) return res.status(400).json({ message: 'Role inválido' });
    const user = await User.findOneAndUpdate({ email }, { role }, { new: true });
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.json({ message: `${email} agora é ${role}`, user: { email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAdminStats = async (req, res) => {
  try {
    const [totalBudgets, pendingBudgets, completedBudgets, inProgressBudgets] = await Promise.all([
      Budget.countDocuments(),
      Budget.countDocuments({ status: 'pending' }),
      Budget.countDocuments({ status: 'completed' }),
      Budget.countDocuments({ status: 'in_progress' }),
    ]);

    const revenueAgg = await Budget.aggregate([
      { $match: { status: 'completed', finalPrice: { $exists: true, $ne: null } } },
      { $group: { _id: null, total: { $sum: '$finalPrice' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    const ratingAgg = await Budget.aggregate([
      { $match: { 'rating.stars': { $exists: true, $ne: null } } },
      { $group: { _id: null, avg: { $avg: '$rating.stars' } } },
    ]);
    const avgRating = ratingAgg[0]?.avg?.toFixed(1) || '0.0';

    const recentBudgets = await Budget.find()
      .populate('client', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      stats: {
        totalBudgets,
        pendingBudgets,
        completedBudgets,
        inProgressBudgets,
        totalRevenue,
        avgRating: Number(avgRating),
      },
      recentBudgets,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
