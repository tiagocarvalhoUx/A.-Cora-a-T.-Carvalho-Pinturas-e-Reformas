const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contactName: { type: String, required: true, trim: true },
    contactEmail: { type: String, lowercase: true, trim: true, default: null },
    serviceType: {
      type: String,
      enum: ['internal', 'external', 'texture', 'lacquering', 'waterproofing', 'restoration'],
      required: true,
    },
    description: { type: String, required: true },
    phone: { type: String, default: null },
    area: { type: Number, required: true }, // em m²
    photos: [{ url: String, publicId: String }],
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: String,
    },
    estimatedPrice: { type: Number, default: null },
    finalPrice: { type: Number, default: null },
    status: {
      type: String,
      enum: ['pending', 'quoted', 'approved', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    scheduledDate: { type: Date, default: null },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },
    emailVerifiedAt: { type: Date, default: null },
    contactValidationMethod: { type: String, enum: ['whatsapp', 'email'], default: 'whatsapp' },
    whatsappValidationCode: { type: String, default: null },
    whatsappValidationRequestedAt: { type: Date, default: null },
    completedDate: { type: Date, default: null },
    adminNotes: { type: String, default: null },
    rating: {
      stars: { type: Number, min: 1, max: 5, default: null },
      comment: { type: String, default: null },
    },
  },
  { timestamps: true }
);

// Calcula preço estimado com base no tipo de serviço e área
budgetSchema.methods.calculateEstimate = function () {
  const pricePerM2 = {
    internal: 25,
    external: 35,
    texture: 45,
    lacquering: 120,
    waterproofing: 55,
    restoration: 40,
  };
  return this.area * (pricePerM2[this.serviceType] || 30);
};

module.exports = mongoose.model('Budget', budgetSchema);
