const cron = require('node-cron');
const { processRecurring } = require('./recurringJob');

function startScheduler() {
  // Run daily at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Running scheduled recurring transactions job...');
    try {
      await processRecurring();
    } catch (err) {
      console.error('[Cron Error] Recurring job failed:', err.message);
    }
  });
  console.log('[Scheduler] Cron scheduler initialized.');
}

module.exports = { startScheduler };
