# Moneywise — Intelligent Personal Finance & Wealth Dashboard

Moneywise is a production-grade full-stack personal finance application built with **Node.js, Express, MongoDB, vanilla JavaScript (ES6+), and Chart.js**. It empowers users to securely record cashflows, automate recurring transfers, simulate long-term investment strategies, set savings goals, import bank CSV statements, and generate downloadable PDF/Excel reports.

---

## 🚀 Key Features

### 1. 🌙 System-Aware Dark & Light Mode
- Custom CSS variable theming with persistent `localStorage` preference.
- Dynamic Chart.js canvas re-rendering according to active theme contrast.

### 2. 📊 Financial Command Center & Visualizations
- Real-time aggregation pipelines calculating total inflows, outflows, net savings, and savings velocity.
- Interactive Chart.js graphs: Monthly Income vs Expenses bar chart, Category expense doughnut chart, and Monthly Trajectory line chart.
- **Smart Signals & Anomaly Detection**: Month-end expense forecasting, financial health score (0–100), top spending category, and unusual spending alerts.

### 3. 🎯 Savings Goals & Wealth Milestones
- Dedicated goal tracker with animated progress bars, remaining target amounts, and custom milestone icons.
- Intelligent completion date estimation calculated from the user's real monthly savings velocity.
- One-click contribution modal with dynamic balance updates.

### 4. 📄 CSV Bank Statement Import
- Bulk transaction upload supporting standard bank CSV exports.
- Robust validation, flexible header normalization, and transaction deduplication/filtering.
- Comes with `sample_transactions.csv` ready for testing.

### 5. 📑 PDF & Excel Financial Reports
- **PDF Report Generation**: Built with `pdfkit`, producing formatted financial statements with user metadata, period summaries, category breakdown tables, and transaction ledgers.
- **Excel Workbook Generation**: Built with `exceljs`, creating structured multi-tab spreadsheets (`Summary` & `Transactions`) with styled headers and currency formats.

### 6. 🔁 Automated Recurring Transactions Engine
- Define recurring salaries, SIP investments, and utility subscriptions across `daily`, `weekly`, `monthly`, or `yearly` frequencies.
- Integrated background task runner with `node-cron` executing daily automated transaction processing.
- Pause/resume toggle and schedule management.

### 7. 🔮 What-If Financial Scenario Calculator
- Mathematical projection model allowing users to simulate the compound effect of cutting expenses, boosting income, and investing savings over 1 to 5 years.
- Interactive dual-line comparison chart visualizing Baseline vs. Optimized wealth accumulation.

### 8. 🛡️ Security, Privacy & Category Budget Guard
- Isolated multi-tenant architecture using JWT token authentication and `bcryptjs` password hashing.
- Monthly Category Budget Guard with real-time progress indicators (Normal / Warning / Over-budget alerts).

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3 (Modern CSS variables, Glassmorphism, Responsive Grid/Flexbox), JavaScript (ES6+, Fetch API, DOM manipulation), Chart.js
- **Backend**: Node.js, Express.js, RESTful API architecture, Express Middleware, Multer (file parsing), PDFKit, ExcelJS, Node-Cron
- **Database**: MongoDB & Mongoose ORM (Aggregation pipelines, compound indexes)
- **Authentication**: JSON Web Tokens (JWT), Bcrypt password hashing
- **Testing**: Built-in `node:test` and `node:assert` test runner

---

## 📡 Complete REST API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | Public | Service health & timestamp |
| POST | `/api/auth/register` | Public | Create new account |
| POST | `/api/auth/login` | Public | Authenticate and obtain JWT |
| DELETE | `/api/auth/account` | JWT | Permanently erase account & all data |
| GET, POST | `/api/transactions` | JWT | List / Create transactions |

| PUT, DELETE | `/api/transactions/:id` | JWT | Update / Delete transaction |
| GET | `/api/analytics/summary` | JWT | Total income, expense, savings |
| GET | `/api/analytics/category` | JWT | Expense by category breakdown |
| GET | `/api/analytics/monthly` | JWT | Monthly cashflow trend |
| GET | `/api/analytics/insights` | JWT | Health score, pacing & alerts |
| GET, POST | `/api/budgets` | JWT | List / Create monthly budget guard |
| PUT, DELETE | `/api/budgets/:id` | JWT | Update / Delete budget |
| GET, POST | `/api/goals` | JWT | List / Create savings goals |
| PUT, DELETE | `/api/goals/:id` | JWT | Update / Delete savings goal |
| POST | `/api/goals/:id/contribute` | JWT | Add funds toward a goal |
| GET, POST | `/api/recurring` | JWT | List / Schedule recurring transfer |
| PUT, DELETE | `/api/recurring/:id` | JWT | Update / Delete recurring schedule |
| PATCH | `/api/recurring/:id/toggle` | JWT | Pause / Resume recurring schedule |
| POST | `/api/import/csv` | JWT | Upload & bulk-insert CSV statement |
| GET | `/api/export/pdf` | JWT | Download formatted PDF report |
| GET | `/api/export/excel` | JWT | Download multi-tab Excel spreadsheet |

---

## 🧪 Automated Testing

The project includes an automated end-to-end integration test suite covering Authentication, Transaction CRUD, Analytics Aggregations, Budget Limits, and Savings Goals.

Run the test suite:
```bash
npm test
```

---

## ⚙️ Setup & Local Run

1. Clone repository and install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/personal_finance_dashboard
   JWT_SECRET=your_long_secure_random_jwt_secret
   JWT_EXPIRES_IN=7d
   ```
3. Start the application:
   ```bash
   npm run dev
   # or production mode
   npm start
   ```
4. Access the web dashboard at `http://localhost:5000`.

