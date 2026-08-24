# Personal Finance & Expense Dashboard — Study Guide

## 1. Project Overview
Moneywise is a personal finance dashboard. Registered users add income and expenses, manage their own transaction history, and see totals and charts calculated from MongoDB. It was built to demonstrate a focused full-stack CRUD application without a frontend framework.

## 2. Technology Stack
HTML supplies the pages; CSS provides responsive layout; browser JavaScript manipulates the DOM and calls APIs with Fetch. Node.js runs the server, Express defines APIs and middleware, MongoDB stores data, and Mongoose defines/query schemas. REST is the HTTP interface. bcryptjs hashes passwords; JWT identifies a logged-in user; Chart.js renders the three dashboard charts.

## 3. Architecture
`Frontend → Fetch API → Express REST route → controller → Mongoose → MongoDB`. A browser request includes a JWT in `Authorization: Bearer ...`. The auth middleware verifies it and puts its user id on `req.user`; the controller uses that id in every transaction query, then returns JSON to the page.

## 4. Folder Structure
- `client/`: `index.html`, auth pages, dashboard and transactions pages; `css/` styles; `js/` API, auth, dashboard and transaction behavior.
- `server/config/db.js`: MongoDB connection.
- `server/models/`: User and Transaction schemas.
- `server/routes/`: concise endpoint-to-controller mapping.
- `server/controllers/`: request logic and database aggregation.
- `server/middleware/`: JWT protection and centralized errors.
- `server/server.js`: application setup, static files, routes, and startup.

## 5. Frontend
The login/register forms are handled by `client/js/auth.js`. `api.js` centralizes Fetch, JSON headers, token attachment, money formatting, logout, and toast errors. `transactions.js` creates table rows and connects form/Edit/Delete DOM events to APIs. `dashboard.js` requests analytics in parallel, sets KPI text, and creates Chart.js canvases.

## 6. Backend
Express parses JSON, enables CORS, serves `client`, and mounts API routers. A route calls a controller, which validates or queries MongoDB. `errorMiddleware.js` turns validation, duplicate key, bad id, and unexpected errors into safe JSON responses.

## 7. REST APIs
| Method | Endpoint | Purpose | Authentication |
|---|---|---|---|
| GET | `/api/health` | Server health | No |
| POST | `/api/auth/register` | Create account + token | No |
| POST | `/api/auth/login` | Verify account + token | No |
| GET | `/api/transactions` | List own transactions; supports `type`, `category`, `month` | JWT |
| POST | `/api/transactions` | Create transaction | JWT |
| PUT | `/api/transactions/:id` | Update owned transaction | JWT |
| DELETE | `/api/transactions/:id` | Delete owned transaction | JWT |
| GET | `/api/analytics/summary` | Totals/savings/count | JWT |
| GET | `/api/analytics/category` | Expense totals by category | JWT |
| GET | `/api/analytics/monthly` | Monthly income and expenses | JWT |

## 8. MongoDB
MongoDB has `users` and `transactions` collections. A User has name, unique email, hashed password, and timestamps. A Transaction has `userId`, type, amount, category, description, date, and timestamps. `userId` is an ObjectId reference to User, which creates the ownership relationship. Mongoose enforces schema constraints and supplies `find`, `create`, and aggregation APIs.

## 9. Authentication
Register → User pre-save hook hashes the password with bcrypt → MongoDB saves it. Login selects the normally hidden password and compares it with bcrypt. On success `tokenFor` signs `{ id, name }` into a JWT. The client stores it in localStorage. `request()` attaches it to protected Fetch requests. `protect` verifies it and exposes `req.user.id`; invalid/expired tokens receive 401 and trigger frontend logout.

## 10. CRUD
Create: `POST /api/transactions`. Read: `GET /api/transactions`. Update: `PUT /api/transactions/:id`. Delete: `DELETE /api/transactions/:id`. Update/delete use `{ _id, userId: req.user.id }`, so another user’s id returns 404 instead of granting access.

## 11. Analytics
`summary` groups a user’s transactions by `type`, then calculates savings as income minus expense. `category` filters to expense then groups by category. `monthly` groups by year, month, and type, then reshapes results into `{month, income, expenses}`. These are MongoDB aggregation results, never dashboard constants.

## 12. Charts
`dashboard.js` fetches summary/category/monthly together. Monthly labels and values form a bar chart for income vs expenses and a line chart for expenses. Category labels/totals form a doughnut chart. Charts are destroyed before redraw to prevent duplicate canvas instances.

## 13. Security
bcrypt hashing prevents plaintext password storage. JWT middleware protects financial endpoints. Each database query is scoped to the authenticated `userId`. Configuration lives in `.env`, ignored by Git; `.env.example` contains only placeholders. Mongoose validation restricts transaction type/category, positive amounts, date, and description size.

## 14. Error Handling
Missing inputs return 400; duplicate email returns 409; invalid login/token returns 401; absent/foreign transaction returns 404; malformed ids return 400; validation errors become readable 400 messages. The client displays API messages as inline auth errors or toast notifications.

## 15. Testing
Run health check first. In Postman: register a user, log in, copy its token, create transactions, list/filter them, update and delete one, then call all three analytics endpoints with the Bearer token. Test isolation by logging in as a second user and attempting the first user’s transaction id: it must return 404. Live tests require a running MongoDB server.

## 16. Important Code Concepts
- `server/models/User.js → pre('save')`: hashes only newly changed passwords.
- `server/middleware/authMiddleware.js → protect`: decodes/verifies JWT before controller access.
- `server/controllers/transactionController.js → findOneAndUpdate`: combines id and owner check.
- `server/controllers/analyticsController.js → aggregate`: lets MongoDB sum/group records efficiently.
- `client/js/api.js → request`: one consistent authenticated Fetch wrapper.

## 17. Complete Application Flow
1. Registration posts form data and receives a token.
2. Login verifies password and stores token/user locally.
3. Dashboard loads analytics and draws charts.
4. Add expense posts form JSON; MongoDB stores it with the user id.
5. Transactions page reads and displays only that user’s records.
6. Edit sends a PUT to the selected owned record.
7. Delete sends DELETE and refreshes the table.
8. Dashboard reloads fresh aggregation results.
9. Logout removes local token/user and returns to login.

## 18. Interview Questions
**HTML/CSS/JavaScript:** How is responsiveness done? CSS grid and media queries. How is the table updated? JavaScript replaces `tbody` content after API calls.

**Node/Express:** Why controllers? They keep route files small and isolate request/database logic. What is middleware? A function in the request chain, such as JSON parsing or JWT verification.

**REST/Fetch:** How is data sent? Fetch sends JSON and the `Authorization` header. Why proper methods? GET reads, POST creates, PUT updates, DELETE removes.

**MongoDB/Mongoose:** How is ownership modeled? A Transaction stores the owner ObjectId in `userId`. Why aggregation? It groups/sums directly in MongoDB.

**JWT/bcrypt:** JWT carries the signed user id for protected requests; bcrypt one-way hashes and compares passwords.

**CRUD/Chart.js:** Which endpoint edits? `PUT /api/transactions/:id`. How are charts live? They consume the analytics JSON rather than hardcoded values.

## 19. Resume Explanation
**30 seconds:** I built a personal finance dashboard using vanilla JavaScript, Express, MongoDB, JWT, and Chart.js. Users authenticate, manage private income/expense records, and see live financial analytics.

**1 minute:** The app is a REST-based CRUD dashboard. I used Mongoose schemas and bcrypt password hashing, signed JWTs at login, and middleware to protect user-specific queries. MongoDB aggregations calculate totals, monthly results, and spending categories. The vanilla frontend uses Fetch and Chart.js to render the data.

**Technical interviewer:** The Express app serves static pages and exposes distinct auth, transactions, and analytics routers. The client stores a JWT and a wrapper attaches it to calls. Middleware verifies it; controllers scope every transaction action by `userId`. Analytics use aggregation pipelines, and Chart.js translates those response arrays into charts. Validation and a central error middleware handle common bad input safely.

## 20. Possible Improvements
Budgets and alerts, recurring entries, pagination/search, CSV/PDF export, password reset, HTTPS cookies, rate limiting, helmet/CSP, automated integration tests, and deployment configuration.
