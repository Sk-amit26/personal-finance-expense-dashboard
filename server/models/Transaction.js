const mongoose = require('mongoose');
const categories = ['Salary', 'Freelance', 'Investment', 'Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Education', 'Health', 'Other'];

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true, min: [0.01, 'Amount must be greater than zero'] },
  category: { type: String, required: true, enum: categories },
  description: { type: String, required: true, trim: true, maxlength: 140 },
  date: { type: Date, required: true }
}, { timestamps: true });
module.exports = mongoose.model('Transaction', transactionSchema);
module.exports.categories = categories;
