const RecurringTransaction = require('../models/RecurringTransaction');
const { processRecurring } = require('../jobs/recurringJob');

exports.listRecurring = async (req, res, next) => {
  try {
    const list = await RecurringTransaction.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ recurring: list });
  } catch (err) {
    next(err);
  }
};

exports.createRecurring = async (req, res, next) => {
  try {
    const { type, amount, category, description, frequency, startDate } = req.body;
    const start = startDate ? new Date(startDate) : new Date();
    const recurring = await RecurringTransaction.create({
      userId: req.user.id,
      type,
      amount: Number(amount),
      category,
      description,
      frequency: frequency || 'monthly',
      startDate: start,
      nextRunDate: start,
      isActive: true
    });
    res.status(201).json({ recurring });
  } catch (err) {
    next(err);
  }
};

exports.updateRecurring = async (req, res, next) => {
  try {
    const recurring = await RecurringTransaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!recurring) return res.status(404).json({ message: 'Recurring transaction not found.' });
    res.json({ recurring });
  } catch (err) {
    next(err);
  }
};

exports.toggleRecurring = async (req, res, next) => {
  try {
    const recurring = await RecurringTransaction.findOne({ _id: req.params.id, userId: req.user.id });
    if (!recurring) return res.status(404).json({ message: 'Recurring transaction not found.' });
    recurring.isActive = !recurring.isActive;
    await recurring.save();
    res.json({ recurring, message: recurring.isActive ? 'Recurring transaction resumed.' : 'Recurring transaction paused.' });
  } catch (err) {
    next(err);
  }
};

exports.deleteRecurring = async (req, res, next) => {
  try {
    const recurring = await RecurringTransaction.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!recurring) return res.status(404).json({ message: 'Recurring transaction not found.' });
    res.json({ message: 'Recurring transaction deleted.' });
  } catch (err) {
    next(err);
  }
};

exports.triggerManualProcess = async (req, res, next) => {
  try {
    const result = await processRecurring();
    res.json({ message: 'Processed recurring transactions.', ...result });
  } catch (err) {
    next(err);
  }
};
