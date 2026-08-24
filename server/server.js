require('dotenv').config();
const path = require('path'); const express = require('express'); const cors = require('cors'); const connectDB = require('./config/db'); const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const app = express(); app.use(cors()); app.use(express.json()); app.use(express.static(path.join(__dirname, '../client')));
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/auth', require('./routes/authRoutes')); app.use('/api/transactions', require('./routes/transactionRoutes')); app.use('/api/analytics', require('./routes/analyticsRoutes')); app.use('/api/budgets', require('./routes/budgetRoutes'));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../client/index.html'))); app.use(notFound); app.use(errorHandler);
const port = process.env.PORT || 5000; connectDB().then(() => app.listen(port, () => console.log(`Server running on http://localhost:${port}`))).catch(err => { console.error('Database connection failed:', err.message); process.exit(1); });
