require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('../server/middleware/errorMiddleware');

const app = express();
app.use(cors());
app.use(express.json());

// Register API Routes
app.use('/api/auth', require('../server/routes/authRoutes'));
app.use('/api/transactions', require('../server/routes/transactionRoutes'));
app.use('/api/analytics', require('../server/routes/analyticsRoutes'));
app.use('/api/budgets', require('../server/routes/budgetRoutes'));
app.use('/api/goals', require('../server/routes/goalRoutes'));
app.use('/api/recurring', require('../server/routes/recurringRoutes'));
app.use('/api/import', require('../server/routes/importRoutes'));
app.use('/api/export', require('../server/routes/exportRoutes'));

app.use(notFound);
app.use(errorHandler);

let server;
let baseURL;

async function startTestServer() {
  const testDbUri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/personal_finance_test';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(testDbUri);
  }

  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseURL = `http://127.0.0.1:${port}/api`;
      resolve({ server, baseURL });
    });
  });
}

async function stopTestServer() {
  if (server) {
    await new Promise((res) => server.close(res));
  }
  if (mongoose.connection.readyState !== 0) {
    // Clean up test collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      try {
        await collections[key].deleteMany({});
      } catch (_) {}
    }
    await mongoose.disconnect();
  }
}

module.exports = { app, startTestServer, stopTestServer };
