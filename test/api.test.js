const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { startTestServer, stopTestServer } = require('./setup');

describe('Personal Finance API Test Suite', () => {
  let baseURL;
  let authToken = '';
  let userId = '';
  let createdTxId = '';
  let createdBudgetId = '';
  let createdGoalId = '';

  const testUser = {
    name: 'Tester Automated',
    email: `test_${Date.now()}@example.com`,
    password: 'Password123!'
  };

  before(async () => {
    try {
      const setup = await startTestServer();
      baseURL = setup.baseURL;
    } catch (err) {
      console.warn('MongoDB connection not available during test initialization, skipping live tests if DB unavailable:', err.message);
    }
  });

  after(async () => {
    await stopTestServer();
  });

  // --- 1. AUTHENTICATION TESTS ---
  test('1. POST /api/auth/register creates user and returns JWT', async (t) => {
    if (!baseURL) t.skip('No test server');
    const res = await fetch(`${baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.ok(data.token, 'Should return a JWT token');
    assert.strictEqual(data.user.email, testUser.email.toLowerCase());
    authToken = data.token;
    userId = data.user.id;
  });

  test('2. POST /api/auth/register rejects duplicate email with 409', async (t) => {
    if (!baseURL) t.skip('No test server');
    const res = await fetch(`${baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    assert.strictEqual(res.status, 409);
  });

  test('3. POST /api/auth/login succeeds with valid credentials', async (t) => {
    if (!baseURL) t.skip('No test server');
    const res = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: testUser.password })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(data.token);
  });

  test('4. POST /api/auth/login rejects incorrect password with 401', async (t) => {
    if (!baseURL) t.skip('No test server');
    const res = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: 'WrongPassword' })
    });
    assert.strictEqual(res.status, 401);
  });

  // --- 2. TRANSACTION TESTS ---
  test('5. POST /api/transactions creates a valid expense', async (t) => {
    if (!baseURL) t.skip('No test server');
    const res = await fetch(`${baseURL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        type: 'expense',
        amount: 2500,
        category: 'Food',
        description: 'Team Lunch',
        date: new Date().toISOString()
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.transaction.amount, 2500);
    assert.strictEqual(data.transaction.category, 'Food');
    createdTxId = data.transaction._id;
  });

  test('6. POST /api/transactions creates an income entry', async (t) => {
    if (!baseURL) t.skip('No test server');
    const res = await fetch(`${baseURL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        type: 'income',
        amount: 50000,
        category: 'Salary',
        description: 'Monthly Base Pay',
        date: new Date().toISOString()
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.transaction.amount, 50000);
  });

  test('7. GET /api/transactions retrieves user transactions', async (t) => {
    if (!baseURL) t.skip('No test server');
    const res = await fetch(`${baseURL}/transactions`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(data.transactions));
    assert.strictEqual(data.transactions.length, 2);
  });

  test('8. GET /api/transactions?type=expense filters by type', async (t) => {
    if (!baseURL) t.skip('No test server');
    const res = await fetch(`${baseURL}/transactions?type=expense`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.transactions.length, 1);
    assert.strictEqual(data.transactions[0].type, 'expense');
  });

  test('9. PUT /api/transactions/:id updates a transaction', async (t) => {
    if (!baseURL) t.skip('No test server');
    const res = await fetch(`${baseURL}/transactions/${createdTxId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        amount: 3000,
        description: 'Team Lunch Buffet'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.transaction.amount, 3000);
  });

  // --- 3. ANALYTICS TESTS ---
  test('10. GET /api/analytics/summary returns correct cashflow totals', async (t) => {
    if (!baseURL) t.skip('No test server');
    const res = await fetch(`${baseURL}/analytics/summary`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.totalIncome, 50000);
    assert.strictEqual(data.totalExpenses, 3000);
    assert.strictEqual(data.savings, 47000);
    assert.strictEqual(data.transactionCount, 2);
  });

  test('11. GET /api/analytics/category returns grouped categories', async (t) => {
    if (!baseURL) t.skip('No test server');
    const res = await fetch(`${baseURL}/analytics/category`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(data.categories));
    assert.strictEqual(data.categories[0].category, 'Food');
    assert.strictEqual(data.categories[0].total, 3000);
  });

  test('12. GET /api/analytics/insights calculates health score', async (t) => {
    if (!baseURL) t.skip('No test server');
    const res = await fetch(`${baseURL}/analytics/insights`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(typeof data.score === 'number');
    assert.ok(data.score > 0);
  });

  // --- 4. BUDGET TESTS ---
  test('13. POST /api/budgets creates category budget limit', async (t) => {
    if (!baseURL) t.skip('No test server');
    const currentMonth = new Date().toISOString().slice(0, 7);
    const res = await fetch(`${baseURL}/budgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        category: 'Food',
        limit: 10000,
        month: currentMonth
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.budget.limit, 10000);
    createdBudgetId = data.budget._id;
  });

  test('14. GET /api/budgets returns budget with spent tracking', async (t) => {
    if (!baseURL) t.skip('No test server');
    const currentMonth = new Date().toISOString().slice(0, 7);
    const res = await fetch(`${baseURL}/budgets?month=${currentMonth}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.budgets.length, 1);
    assert.strictEqual(data.budgets[0].spent, 3000);
  });

  // --- 5. GOAL TESTS ---
  test('15. POST /api/goals creates savings goal', async (t) => {
    if (!baseURL) t.skip('No test server');
    const res = await fetch(`${baseURL}/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        name: 'MacBook Pro Fund',
        targetAmount: 150000,
        savedAmount: 20000,
        icon: '💻'
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.goal.name, 'MacBook Pro Fund');
    createdGoalId = data.goal._id;
  });

  test('16. POST /api/goals/:id/contribute adds funds to goal', async (t) => {
    if (!baseURL) t.skip('No test server');
    const res = await fetch(`${baseURL}/goals/${createdGoalId}/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ amount: 15000 })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.goal.savedAmount, 35000);
  });

  // --- 6. RECURRING & CLEANUP TESTS ---
  test('17. POST /api/recurring schedules a recurring transfer', async (t) => {
    if (!baseURL) t.skip('No test server');
    const res = await fetch(`${baseURL}/recurring`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        type: 'expense',
        amount: 999,
        category: 'Entertainment',
        description: 'Netflix Premium',
        frequency: 'monthly',
        startDate: new Date().toISOString()
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.recurring.description, 'Netflix Premium');
  });

  test('18. GET /api/transactions rejects request without JWT (401)', async (t) => {
    if (!baseURL) t.skip('No test server');
    const res = await fetch(`${baseURL}/transactions`);
    assert.strictEqual(res.status, 401);
  });
});
