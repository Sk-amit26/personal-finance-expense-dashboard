const mongoose = require('mongoose');
const { categories } = require('./Transaction');

const recurringSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true, min: [0.01, 'Amount must be greater than zero'] },
  category: { type: String, required: true, enum: categories },
  description: { type: String, required: true, trim: true, maxlength: 140 },
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], default: 'monthly', required: true },
  startDate: { type: Date, required: true, default: Date.now },
  nextRunDate: { type: Date, required: true, index: true },
  isActive: { type: Boolean, default: true, index: true },
  lastProcessedDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('RecurringTransaction', recurringSchema);
