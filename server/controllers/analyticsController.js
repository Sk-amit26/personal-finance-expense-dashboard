const Transaction = require('../models/Transaction');
const base = userId => ({ $match: { userId } });
exports.summary = async (req, res, next) => { try { const data = await Transaction.aggregate([base(req.user.id), { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }]); const values = data.reduce((a, x) => ({ ...a, [x._id]: x.total, count: a.count + x.count }), { income: 0, expense: 0, count: 0 }); res.json({ totalIncome: values.income, totalExpenses: values.expense, savings: values.income - values.expense, transactionCount: values.count }); } catch (err) { next(err); } };
exports.category = async (req, res, next) => { try { const categories = await Transaction.aggregate([base(req.user.id), { $match: { type: 'expense' } }, { $group: { _id: '$category', total: { $sum: '$amount' } } }, { $sort: { total: -1 } }]); res.json({ categories: categories.map(x => ({ category: x._id, total: x.total })) }); } catch (err) { next(err); } };
exports.monthly = async (req, res, next) => { try { const monthly = await Transaction.aggregate([base(req.user.id), { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' }, total: { $sum: '$amount' } } }, { $sort: { '_id.year': 1, '_id.month': 1 } }]); const map = {}; monthly.forEach(x => { const key = `${x._id.year}-${String(x._id.month).padStart(2, '0')}`; map[key] ||= { month: key, income: 0, expenses: 0 }; map[key][x._id.type === 'income' ? 'income' : 'expenses'] = x.total; }); res.json({ months: Object.values(map) }); } catch (err) { next(err); } };

exports.insights = async (req, res, next) => {
  try {
    const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const all = await Transaction.find({ userId: req.user.id }).sort({ date: -1 }).lean();
    const expenses = all.filter(t => t.type === 'expense'); const income = all.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenseTotal = expenses.reduce((sum, t) => sum + t.amount, 0); const current = expenses.filter(t => new Date(t.date) >= start);
    const currentTotal = current.reduce((sum, t) => sum + t.amount, 0); const groups = {};
    expenses.forEach(t => { groups[t.category] ||= { total: 0, count: 0 }; groups[t.category].total += t.amount; groups[t.category].count += 1; });
    const currentGroups = current.reduce((map, t) => ({ ...map, [t.category]: (map[t.category] || 0) + t.amount }), {});
    const top = Object.entries(currentGroups).sort((a, b) => b[1] - a[1])[0];
    const alert = current.find(t => groups[t.category].count >= 3 && t.amount > (groups[t.category].total / groups[t.category].count) * 1.8);
    const savingsRate = income ? ((income - expenseTotal) / income) * 100 : 0;
    const score = all.length ? Math.max(0, Math.min(100, Math.round(50 + savingsRate / 2 + (all.length >= 5 ? 10 : 0)))) : 0;
    res.json({ score, savingsRate: Math.round(savingsRate), monthForecast: Math.round((currentTotal / Math.max(now.getDate(), 1)) * new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()), topCategory: top ? { category: top[0], total: top[1] } : null, unusualExpense: alert ? { description: alert.description, amount: alert.amount, category: alert.category } : null });
  } catch (err) { next(err); }
};
