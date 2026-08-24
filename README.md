# Personal Finance & Expense Dashboard

A full-stack personal finance application where each registered user can securely record income and expenses, filter transactions, and view live analytics and Chart.js visualizations.

## Features
- JWT registration, login and frontend logout
- User-isolated transaction CRUD with type, category and month filters
- MongoDB-powered income, expense, savings and transaction-count totals
- Monthly, category, and expense-trend charts
- Smart financial-health score, month-end expense forecast, and unusual-spending alerts
- Monthly category Budget Guard with real-time progress tracking
- Responsive vanilla HTML/CSS/JavaScript interface

## Stack and architecture
HTML, CSS, JavaScript (Fetch API), Node.js, Express, MongoDB/Mongoose, JWT, bcryptjs, and Chart.js. Browser pages call `/api`; Express routes delegate to controllers; controllers query Mongoose models.

## Project structure
`client/` contains pages, styles, and browser scripts. `server/` contains Express configuration, models, routes, middleware, and controllers. See [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) for a detailed guide.

## Setup and run
1. Install Node.js and run `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` and a long `JWT_SECRET`.
3. Start MongoDB locally (or use a MongoDB Atlas URI).
4. Run `npm run dev`, then open `http://localhost:5000`.

## Deploy to Render
The repository includes `render.yaml`. Push it to GitHub, then in Render choose **New → Blueprint**, select the repository, and enter a MongoDB Atlas `MONGODB_URI` when prompted. Render generates `JWT_SECRET` automatically and checks `/api/health` after deployment. In MongoDB Atlas, allow Render's network access (or temporarily `0.0.0.0/0` for development) and create a database user before deploying.

## API endpoints
| Method | Endpoint | Auth |
|---|---|---|
| GET | `/api/health` | No |
| POST | `/api/auth/register` | No |
| POST | `/api/auth/login` | No |
| GET, POST | `/api/transactions` | JWT |
| PUT, DELETE | `/api/transactions/:id` | JWT |
| GET | `/api/analytics/summary` | JWT |
| GET | `/api/analytics/category` | JWT |
| GET | `/api/analytics/monthly` | JWT |
| GET | `/api/analytics/insights` | JWT |
| GET, POST | `/api/budgets` | JWT |
| PUT, DELETE | `/api/budgets/:id` | JWT |

## Testing
The API is ready for Postman using `Authorization: Bearer <token>` on protected requests. Automated syntax checks can be run with `node --check` on server/browser JavaScript. A MongoDB instance is required for live end-to-end API tests.

## Screenshots
Run the project locally to view the dashboard; no screenshots are committed.

## Future improvements
Add budget limits, pagination, export, password reset, test coverage, rate limiting, and a content-security policy.
