const Transaction = require('../models/Transaction');
const allowed = ['type', 'amount', 'category', 'description', 'date'];
const fields = body => Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));

exports.getTransactions = async (req, res, next) => {
  try {
    const query = { userId: req.user.id };
    if (req.query.type) query.type = req.query.type;
    if (req.query.category) query.category = req.query.category;
    if (req.query.month && /^\d{4}-\d{2}$/.test(req.query.month)) { const start = new Date(`${req.query.month}-01T00:00:00.000Z`); const end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 1); query.date = { $gte: start, $lt: end }; }
    const transactions = await Transaction.find(query).sort({ date: -1, createdAt: -1 });
    res.json({ transactions });
  } catch (err) { next(err); }
};
exports.createTransaction = async (req, res, next) => { try { const tx = await Transaction.create({ ...fields(req.body), userId: req.user.id }); res.status(201).json({ transaction: tx }); } catch (err) { next(err); } };
exports.updateTransaction = async (req, res, next) => { try { const tx = await Transaction.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, fields(req.body), { new: true, runValidators: true }); if (!tx) return res.status(404).json({ message: 'Transaction not found.' }); res.json({ transaction: tx }); } catch (err) { next(err); } };
exports.deleteTransaction = async (req, res, next) => { try { const tx = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user.id }); if (!tx) return res.status(404).json({ message: 'Transaction not found.' }); res.json({ message: 'Transaction deleted.' }); } catch (err) { next(err); } };
