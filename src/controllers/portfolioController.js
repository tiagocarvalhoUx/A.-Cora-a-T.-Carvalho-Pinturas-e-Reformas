const Portfolio = require('../models/Portfolio');

exports.getAll = async (req, res) => {
  try {
    const { featured } = req.query;
    const filter = { isActive: true };
    if (featured === 'true') filter.featured = true;
    const items = await Portfolio.find(filter).sort({ createdAt: -1 });
    res.json({ portfolio: items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await Portfolio.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item não encontrado' });
    res.json({ item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, description, serviceType, area, duration, location, featured } = req.body;
    const files = req.files || {};

    const beforeImage = files.before?.[0]
      ? { url: files.before[0].path, publicId: files.before[0].filename }
      : undefined;
    const afterImage = files.after?.[0]
      ? { url: files.after[0].path, publicId: files.after[0].filename }
      : undefined;

    const item = await Portfolio.create({
      title,
      description,
      serviceType,
      area,
      duration,
      location,
      featured: featured === 'true',
      beforeImage,
      afterImage,
    });
    res.status(201).json({ item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const item = await Portfolio.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ message: 'Item não encontrado' });
    res.json({ item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await Portfolio.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Item removido' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
