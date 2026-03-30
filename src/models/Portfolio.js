const mongoose = require('mongoose');

const portfolioSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    serviceType: {
      type: String,
      enum: ['internal', 'external', 'texture', 'lacquering', 'waterproofing', 'restoration'],
      required: true,
    },
    beforeImage: { url: String, publicId: String },
    afterImage: { url: String, publicId: String },
    area: { type: Number },
    duration: { type: String }, // ex: "3 dias"
    location: { type: String },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Portfolio', portfolioSchema);
