# AltruGreen — Golf Charity Subscription Platform

> **Play Golf. Win Big. Change Lives.**

A production-grade SaaS platform where golf enthusiasts subscribe monthly/yearly, enter their last 5 Stableford scores, participate in monthly draw-based rewards, and donate a percentage to their chosen charity.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Zustand |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB (Mongoose) |
| Auth | JWT (HS256) |
| Payments | Stripe (Subscriptions + Webhooks) |
| Email | Nodemailer (Resend SMTP) |

---

## 📁 Project Structure

```
AltruGreen/
├── server/              # Express API backend
│   └── src/
│       ├── config/      # DB, env, Stripe
│       ├── models/      # User, Subscription, Score, Charity, Draw, Winner, Transaction
│       ├── services/    # Business logic
│       ├── controllers/ # Request handlers
│       ├── routes/      # Express routes
│       ├── middlewares/ # Auth, RBAC, validation, errors, rate limiting
│       ├── utils/       # File upload
│       └── tests/       # Jest unit + integration tests
├── client/              # Next.js frontend
│   ├── app/             # App Router pages
│   │   ├── page.tsx         # Landing page
│   │   ├── auth/            # Login + Signup
│   │   ├── dashboard/       # User dashboard
│   │   └── admin/           # Admin dashboard
│   ├── services/        # Axios API layer
│   ├── store/           # Zustand stores
│   └── lib/             # Utility functions
├── .env.example
└── README.md
```

---

## 🚀 Local Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Stripe account (test mode)

### 1. Clone & Install

```bash
# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

### 2. Environment Variables

**Backend** (`server/.env`):
```env
MONGODB_URI=mongodb://localhost:27017/altrugreen
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars
JWT_EXPIRES_IN=7d
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
STRIPE_PRICE_ID_MONTHLY=price_xxx
STRIPE_PRICE_ID_YEARLY=price_xxx
EMAIL_SERVICE_API_KEY=re_your_resend_key
ADMIN_EMAIL=admin@altrugreen.com
CLIENT_URL=http://localhost:3000
PORT=5000
NODE_ENV=development
```

**Frontend** (`client/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 3. Run Locally

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Visit: http://localhost:3000

### 4. Stripe Webhook (Local)

```bash
# Install Stripe CLI and forward webhooks:
stripe listen --forward-to localhost:5000/api/subscriptions/webhook
```

---

## 🧪 Testing

```bash
cd server && npm run test
```

Tests cover:
- Auth: signup, login, duplicate email, JWT guard
- Scores: FIFO replacement, range validation (1-45), sort order
- Draw: prize distribution math (40/35/25%), rollover trigger
- Webhooks: all 5 Stripe event types (mocked)

---

## 🎲 Draw Engine

The draw engine generates 5 numbers (1-45) using one of two modes:

| Mode | Description |
|------|-------------|
| **Random** | Cryptographically secure via `crypto.randomInt` |
| **Algorithm** | Weighted probability distribution based on score frequency across all active users |

**Prize Pool Distribution:**
- 5 Matches → **40%** (split equally among all 5-match winners)
- 4 Matches → **35%** (split equally)
- 3 Matches → **25%** (split equally)
- **Jackpot Rollover**: If no 5-match winners, 40% rolls over to next month

**Admin workflow**: Simulate → Review preview → Execute

---

## 🔒 Security Features

- bcrypt password hashing (12 rounds)
- JWT with expiry
- Role-based access (user / admin)
- Helmet secure headers
- CORS configuration
- Rate limiting (100 req/15min; 10 req/15min on auth)
- Zod input validation on all endpoints
- Stripe webhook signature verification
- Subscription guard on protected routes

---

## 🚀 Deployment

### Frontend → Vercel

1. Push `client/` to GitHub
2. Import to Vercel, set Framework: Next.js
3. Add env: `NEXT_PUBLIC_API_URL=https://your-api.onrender.com/api`
4. Deploy

### Backend → Render / Railway

1. Push `server/` to GitHub
2. Create Web Service, build: `npm run build`, start: `npm start`
3. Add all env vars from `.env.example`
4. Set Stripe webhook endpoint to `https://your-api.onrender.com/api/subscriptions/webhook`

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register user + create Stripe customer |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/me` | Update profile / charity / donation % |

### Subscriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/subscriptions/checkout` | Create Stripe Checkout session |
| POST | `/api/subscriptions/portal` | Stripe Customer Portal |
| GET | `/api/subscriptions/status` | Current subscription |
| POST | `/api/subscriptions/webhook` | Stripe webhooks (raw body) |

### Scores
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/scores` | Get user's 5 scores (newest first) |
| POST | `/api/scores` | Add score, FIFO replacement |

### Draws
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/draws/current` | Current month draw |
| GET | `/api/draws` | Paginated draw history |
| POST | `/api/draws/simulate` | Admin: simulate draw |
| POST | `/api/draws/execute` | Admin: execute draw |
| GET | `/api/draws/rollover` | Admin: current rollover amount |

### Charities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/charities` | List active charities |
| POST | `/api/charities` | Admin: create |
| PUT | `/api/charities/:id` | Admin: update |
| DELETE | `/api/charities/:id` | Admin: soft delete |

### Winners
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/winners/my` | User winnings history |
| POST | `/api/winners/:id/proof` | Upload proof image |
| GET | `/api/winners` | Admin: all winners |
| PUT | `/api/winners/:id/verify` | Admin: approve/reject |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | Paginated user list |
| PUT | `/api/admin/users/:id/subscription` | Override subscription |
| GET | `/api/admin/analytics` | KPI metrics |
| GET | `/api/admin/analytics/revenue` | Monthly MRR |
| GET | `/api/admin/analytics/charities` | Charity donation breakdown |
| GET | `/api/admin/analytics/draws` | Draw participation data |

---

## 🌿 Making an Admin

```js
// In MongoDB Atlas or mongosh:
db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } })
```

---

## 📝 License

MIT
