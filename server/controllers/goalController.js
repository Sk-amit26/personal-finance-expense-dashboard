const Goal = require('../models/Goal');
const Transaction = require('../models/Transaction');

exports.listGoals = async (req, res, next) => {
  try {
    const goals = await Goal.find({ userId: req.user.id }).sort({ deadline: 1, createdAt: -1 });
    
    // Calculate monthly savings rate to estimate completion
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const txs = await Transaction.find({ userId: req.user.id, date: { $gte: threeMonthsAgo } }).lean();
    
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const monthlyNetSavings = Math.max(0, Math.round((income - expenses) / 3));

    const enriched = goals.map(g => {
      const target = g.targetAmount;
      const saved = g.savedAmount;
      const percent = Math.min(100, Math.round((saved / target) * 100));
      const remaining = Math.max(0, target - saved);
      
      let monthsToGoal = null;
      let estimatedDate = null;
      if (monthlyNetSavings > 0 && remaining > 0) {
        monthsToGoal = Math.ceil(remaining / monthlyNetSavings);
        const est = new Date();
        est.setMonth(est.getMonth() + monthsToGoal);
        estimatedDate = est.toISOString().slice(0, 10);
      }

      return {
        ...g.toObject(),
        percent,
        remaining,
        isCompleted: saved >= target,
        monthsToGoal,
        estimatedDate
      };
    });

    res.json({ goals: enriched, monthlyNetSavings });
  } catch (err) {
    next(err);
  }
};

exports.createGoal = async (req, res, next) => {
  try {
    const { name, targetAmount, savedAmount, deadline, category, icon } = req.body;
    const goal = await Goal.create({
      userId: req.user.id,
      name,
      targetAmount: Number(targetAmount),
      savedAmount: Number(savedAmount) || 0,
      deadline: deadline ? new Date(deadline) : undefined,
      category: category || 'General',
      icon: icon || '🎯'
    });
    res.status(201).json({ goal });
  } catch (err) {
    next(err);
  }
};

exports.updateGoal = async (req, res, next) => {
  try {
    const updates = { ...req.body };
    if (updates.targetAmount) updates.targetAmount = Number(updates.targetAmount);
    if (updates.savedAmount !== undefined) updates.savedAmount = Number(updates.savedAmount);
    if (updates.deadline) updates.deadline = new Date(updates.deadline);

    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      updates,
      { new: true, runValidators: true }
    );
    if (!goal) return res.status(404).json({ message: 'Goal not found.' });
    res.json({ goal });
  } catch (err) {
    next(err);
  }
};

exports.contributeGoal = async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Contribution amount must be greater than 0.' });
    }

    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user.id });
    if (!goal) return res.status(404).json({ message: 'Goal not found.' });

    goal.savedAmount = Math.min(goal.targetAmount * 2, goal.savedAmount + amount);
    await goal.save();

    res.json({ goal, message: `Added ₹${amount} to ${goal.name}!` });
  } catch (err) {
    next(err);
  }
};

exports.deleteGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!goal) return res.status(404).json({ message: 'Goal not found.' });
    res.json({ message: 'Goal removed successfully.' });
  } catch (err) {
    next(err);
  }
};
