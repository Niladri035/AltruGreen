# AltruGreen — Build Walkthrough

## What Was Built

A **complete production-grade Golf Charity SaaS platform** from scratch covering every PRD feature.

---

## Backend (`/server`)

### Models (7 total)
| Model | Key Fields |
|-------|-----------|
| `User` | name, email, passwordHash, role, charityId, subscriptionStatus, stripeCustomerId, donationPercentage |
| `Subscription` | userId, stripeSubscriptionId, plan, status, currentPeriodEnd, cancelAtPeriodEnd |
| `Score` | userId, scores[5] (FIFO, max 5, values 1–45), sorted newest-first |
| `Charity` | name, description, totalDonated, memberCount, isActive |
| `Draw` | month (YYYY-MM), drawNumbers[5], prizePool, rolloverAmount, winnersSnapshot, status |
| `Winner` | drawId, userId, tier (3/4/5-match), prizeAmount, proofImageUrl, verificationStatus |
| `Transaction` | userId, type (subscription/donation/prize_payout), amount, stripePaymentIntentId |

### Services
- **`authService`** — bcrypt (12 rounds) + Stripe customer creation, JWT sign, updateMe
- **`scoreService`** — FIFO replacement, range 1–45, newest-first sort
- **`drawService`** — Random draw (`crypto.randomInt`), algorithm draw (score frequency histogram), simulation mode (no DB write), prize pool 40/35/25%, jackpot rollover
- **`subscriptionService`** — Stripe Checkout, Customer Portal, 5 webhook events
- **`charityService`** — CRUD, soft delete, donation aggregation
- **`winnerService`** — Proof upload (multer), admin verify + email
- **`emailService`** — Branded HTML emails for all transactional events
- **`analyticsService`** — MongoDB aggregations: MRR, charity breakdown, draw participation, user growth

### Middleware
`auth.ts` (JWT), `roleGuard.ts`, `validate.ts` (Zod factory), `errorHandler.ts`, `rateLimiter.ts`, `upload.ts` (multer 5MB)

---

## Frontend (`/client`)

| Route | Description |
|-------|-------------|
| `/` | Landing: hero parallax + floating score cards + animated counters, How It Works, Prize Pool, Charity showcase, Pricing + Stripe CTA |
| `/auth/login` | Glassmorphism login, animated error |
| `/auth/signup` | 3-step wizard: details → charity select → plan → Stripe Checkout |
| `/dashboard` | Scores (FIFO entry), winnings (proof upload), subscription (Portal), overview + countdown |
| `/admin` | KPI cards, Recharts charts, user management, draw control (simulate+execute), charity CRUD, winner verification |

---

## Quick Start

```bash
cp server/.env.example server/.env   # Fill in vars
cd server && npm run dev              # Backend on :5000
cd client && npm run dev              # Frontend on :3000
stripe listen --forward-to localhost:5000/api/subscriptions/webhook
cd server && npm test                 # Run tests
```

**Make admin:**
```js
db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })
```
