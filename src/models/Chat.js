const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String },
    image: { url: String, publicId: String },
    type: { type: String, enum: ['text', 'image'], default: 'text' },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const chatSchema = new mongoose.Schema(
  {
    budget: { type: mongoose.Schema.Types.ObjectId, ref: 'Budget', default: null },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    messages: [messageSchema],
    lastMessage: { type: String, default: null },
    lastMessageAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Chat', chatSchema);
