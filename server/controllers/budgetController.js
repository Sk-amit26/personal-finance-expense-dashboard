const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const validMonth = value => /^\d{4}-\d{2}$/.test(value || '') ? value : new Date().toISOString().slice(0, 7);

exports.listBudgets = async (req, res, next) => {
  try {
    const month = validMonth(req.query.month);
    const [year, number] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, number - 1, 1)); const end = new Date(Date.UTC(year, number, 1));
    const [budgets, expenses] = await Promise.all([
      Budget.find({ userId: req.user.id, month }).sort({ category: 1 }),
      Transaction.aggregate([{ $match: { userId: req.user.id, type: 'expense', date: { $gte: start, $lt: end } } }, { $group: { _id: '$category', spent: { $sum: '$amount' } } }])
    ]);
    const spent = Object.fromEntries(expenses.map(row => [row._id, row.spent]));
    res.json({ month, budgets: budgets.map(b => ({ ...b.toObject(), spent: spent[b.category] || 0 })) });
  } catch (err) { next(err); }
};
exports.createBudget = async (req, res, next) => { try { const budget = await Budget.create({ userId: req.user.id, category: req.body.category, month: validMonth(req.body.month), limit: req.body.limit }); res.status(201).json({ budget }); } catch (err) { next(err); } };
exports.updateBudget = async (req, res, next) => { try { const budget = await Budget.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { limit: req.body.limit }, { new: true, runValidators: true }); if (!budget) return res.status(404).json({ message: 'Budget not found.' }); res.json({ budget }); } catch (err) { next(err); } };
exports.deleteBudget = async (req, res, next) => { try { const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user.id }); if (!budget) return res.status(404).json({ message: 'Budget not found.' }); res.json({ message: 'Budget removed.' }); } catch (err) { next(err); } };
