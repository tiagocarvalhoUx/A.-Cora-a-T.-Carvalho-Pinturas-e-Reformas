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

function buildExtraImages(files) {
  const extras = [];
  (files.extraBefore || []).forEach((f) => extras.push({ url: f.path, publicId: f.filename, type: 'before' }));
  (files.extraAfter  || []).forEach((f) => extras.push({ url: f.path, publicId: f.filename, type: 'after'  }));
  return extras;
}

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
      extraImages: buildExtraImages(files),
    });
    res.status(201).json({ item });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const files = req.files || {};
    const update = { ...req.body };

    if (files.before?.[0])
      update.beforeImage = { url: files.before[0].path, publicId: files.before[0].filename };
    if (files.after?.[0])
      update.afterImage = { url: files.after[0].path, publicId: files.after[0].filename };

    const newExtras = buildExtraImages(files);
    if (newExtras.length > 0) {
      update.$push = { extraImages: { $each: newExtras } };
      delete update.extraImages;
    }

    const item = await Portfolio.findByIdAndUpdate(req.params.id, update, { new: true });
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
