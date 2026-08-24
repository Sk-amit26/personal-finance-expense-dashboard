const mongoose = require('mongoose');
const { categories } = require('./Transaction');

const budgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: String, required: true, enum: categories },
  month: { type: String, required: true, match: [/^\d{4}-\d{2}$/, 'Month must be YYYY-MM'] },
  limit: { type: Number, required: true, min: [1, 'Budget must be greater than zero'] }
}, { timestamps: true });
budgetSchema.index({ userId: 1, category: 1, month: 1 }, { unique: true });
module.exports = mongoose.model('Budget', budgetSchema);
