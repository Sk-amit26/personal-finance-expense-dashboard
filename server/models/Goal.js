const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: [true, 'Goal name is required'], trim: true, maxlength: 80 },
  targetAmount: { type: Number, required: [true, 'Target amount is required'], min: [1, 'Target amount must be at least 1'] },
  savedAmount: { type: Number, default: 0, min: [0, 'Saved amount cannot be negative'] },
  deadline: { type: Date },
  category: { type: String, default: 'General' },
  icon: { type: String, default: '🎯' }
}, { timestamps: true });

goalSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Goal', goalSchema);
