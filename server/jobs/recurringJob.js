const RecurringTransaction = require('../models/RecurringTransaction');
const Transaction = require('../models/Transaction');

function computeNextDate(currentDate, frequency) {
  const next = new Date(currentDate);
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }
  return next;
}

async function processRecurring() {
  const now = new Date();
  const dueItems = await RecurringTransaction.find({
    isActive: true,
    nextRunDate: { $lte: now }
  });

  if (dueItems.length === 0) {
    return { processed: 0 };
  }

  const createdTransactions = [];

  for (const item of dueItems) {
    // Create new transaction
    const txn = await Transaction.create({
      userId: item.userId,
      type: item.type,
      amount: item.amount,
      category: item.category,
      description: item.description + ' (Recurring)',
      date: item.nextRunDate
    });
    createdTransactions.push(txn);

    // Advance next run date
    item.lastProcessedDate = now;
    item.nextRunDate = computeNextDate(item.nextRunDate, item.frequency);
    await item.save();
  }

  console.log(`[Recurring Job] Created ${createdTransactions.length} automated transactions.`);
  return { processed: createdTransactions.length };
}

module.exports = { processRecurring, computeNextDate };
