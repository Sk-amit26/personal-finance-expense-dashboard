const Transaction = require('../models/Transaction');

const base = userId => ({ $match: { userId } });

exports.summary = async (req, res, next) => {
  try {
    const data = await Transaction.aggregate([
      base(req.user.id),
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    const values = data.reduce((a, x) => ({ ...a, [x._id]: x.total, count: a.count + x.count }), { income: 0, expense: 0, count: 0 });
    res.json({
      totalIncome: values.income,
      totalExpenses: values.expense,
      savings: values.income - values.expense,
      transactionCount: values.count
    });
  } catch (err) {
    next(err);
  }
};

exports.category = async (req, res, next) => {
  try {
    const categories = await Transaction.aggregate([
      base(req.user.id),
      { $match: { type: 'expense' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ]);
    res.json({ categories: categories.map(x => ({ category: x._id, total: x.total })) });
  } catch (err) {
    next(err);
  }
};

exports.monthly = async (req, res, next) => {
  try {
    const monthly = await Transaction.aggregate([
      base(req.user.id),
      { $group: { _id: { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' }, total: { $sum: '$amount' } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    const map = {};
    monthly.forEach(x => {
      const key = `${x._id.year}-${String(x._id.month).padStart(2, '0')}`;
      map[key] ||= { month: key, income: 0, expenses: 0 };
      map[key][x._id.type === 'income' ? 'income' : 'expenses'] = x.total;
    });
    res.json({ months: Object.values(map) });
  } catch (err) {
    next(err);
  }
};

exports.insights = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const all = await Transaction.find({ userId: req.user.id }).sort({ date: -1 }).lean();

    const expenses = all.filter(t => t.type === 'expense');
    const income = all.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenseTotal = expenses.reduce((sum, t) => sum + t.amount, 0);

    const currentMonthExpenses = expenses.filter(t => new Date(t.date) >= startOfMonth);
    const currentTotal = currentMonthExpenses.reduce((sum, t) => sum + t.amount, 0);

    // Grouping by category
    const historicalGroups = {};
    expenses.forEach(t => {
      historicalGroups[t.category] ||= { total: 0, count: 0 };
      historicalGroups[t.category].total += t.amount;
      historicalGroups[t.category].count += 1;
    });

    const currentGroups = currentMonthExpenses.reduce((map, t) => ({
      ...map,
      [t.category]: (map[t.category] || 0) + t.amount
    }), {});

    const top = Object.entries(currentGroups).sort((a, b) => b[1] - a[1])[0];

    // Unusual expense spike alert (>= 1.8x category average)
    const alert = currentMonthExpenses.find(t =>
      historicalGroups[t.category] &&
      historicalGroups[t.category].count >= 3 &&
      t.amount > (historicalGroups[t.category].total / historicalGroups[t.category].count) * 1.8
    );

    // Savings rate calculation
    const savingsRate = income > 0 ? Math.max(0, ((income - expenseTotal) / income) * 100) : 0;

    // Financial health score (0 to 100)
    // 50 (base) + (savingsRate * 0.4) + (data consistency bonus up to 10)
    const score = all.length ? Math.max(0, Math.min(100, Math.round(40 + (savingsRate * 0.5) + (all.length >= 5 ? 10 : 0)))) : 0;

    // Month-End Forecast calculation (Daily Pacing Model)
    // Days in current month (e.g. 31 in Aug)
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    // Days elapsed so far (e.g. 25th day)
    const daysElapsed = Math.max(1, now.getDate());
    
    // Extrapolated pacing: (Spent so far / Days elapsed) * Total days in month
    let monthForecast = 0;
    if (currentTotal > 0) {
      monthForecast = Math.round((currentTotal / daysElapsed) * totalDaysInMonth);
    } else if (expenses.length > 0) {
      // If no expenses logged yet this month, estimate from recent average
      const recentMonthAvg = expenseTotal / Math.max(1, Math.ceil((now - new Date(all[all.length - 1].date)) / (1000 * 60 * 60 * 24 * 30)));
      monthForecast = Math.round(recentMonthAvg);
    }

    res.json({
      score,
      savingsRate: Math.round(savingsRate),
      monthForecast,
      topCategory: top ? { category: top[0], total: top[1] } : null,
      unusualExpense: alert ? { description: alert.description, amount: alert.amount, category: alert.category } : null
    });
  } catch (err) {
    next(err);
  }
};

