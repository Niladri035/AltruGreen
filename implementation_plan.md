# Golf Charity Subscription Platform — Full Implementation Plan

## Overview

**AltruGreen** is a production-grade SaaS platform where golf enthusiasts subscribe monthly/yearly, enter their last 5 Stableford scores (1–45), participate in monthly draw-based rewards, donate a percentage of the prize pool to their chosen charity, and track winnings and participation history.

**Monorepo structure:**
```
AltruGreen/
├── server/          # Node.js + Express + TypeScript
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── services/
│       ├── repositories/
│       ├── models/
│       ├── routes/
│       ├── middlewares/
│       ├── utils/
│       └── tests/
├── client/          # Next.js 14 App Router + TypeScript
│   └── src/
│       ├── app/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── store/
│       └── lib/
├── .env.example
└── README.md
```

---

## User Review Required

> [!IMPORTANT]
> **Stripe Keys**: You must supply `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_MONTHLY`, `STRIPE_PRICE_ID_YEARLY` before testing payments.

> [!IMPORTANT]
> **MongoDB URI**: Supply `MONGODB_URI` pointing to Atlas or a local instance.

> [!WARNING]
> **File Uploads (Winner Proof)**: Uses `multer` + local disk storage by default. Swap to S3/Cloudinary in `server/src/utils/upload.ts` for production.

> [!NOTE]
> **Draw Engine**: Algorithm-based draw uses a weighted probability distribution based on score frequency. Admins must review simulation results before executing a live draw.

---

## Proposed Changes

---

### 1. Project Scaffolding

#### [NEW] `server/package.json`
Dependencies: `express`, `mongoose`, `stripe`, `bcryptjs`, `jsonwebtoken`, `zod`, `multer`, `nodemailer`, `resend`, `express-rate-limit`, `helmet`, `cors`, `morgan`, `uuid`  
Dev: `typescript`, `ts-node-dev`, `jest`, `supertest`, `@types/*`

#### [NEW] `server/tsconfig.json`
Strict TypeScript config with path aliases.

#### [NEW] `client/` — Next.js 14 App Router scaffold
```bash
npx create-next-app@latest client --typescript --tailwind --eslint --app
```
Additional packages: `framer-motion`, `zustand`, `axios`, `zod`, `react-hook-form`, `@hookform/resolvers`, `shadcn-ui`, `lucide-react`, `recharts`, `date-fns`, `stripe`

#### [NEW] `.env.example` (root)
```
MONGODB_URI=
JWT_SECRET=
JWT_EXPIRES_IN=7d
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_MONTHLY=
STRIPE_PRICE_ID_YEARLY=
EMAIL_SERVICE_API_KEY=
ADMIN_EMAIL=
CLIENT_URL=http://localhost:3000
PORT=5000
NODE_ENV=development
```

---

### 2. Backend — Config & Database

#### [NEW] `server/src/config/db.ts`
Mongoose connection with retry logic and graceful shutdown.

#### [NEW] `server/src/config/env.ts`
Zod-validated typed env loader — fails fast on missing required vars.

#### [NEW] `server/src/config/stripe.ts`
Singleton Stripe client initialisation.

---

### 3. Backend — Models

#### [NEW] `server/src/models/User.ts`
```
name, email, passwordHash, role (user|admin),
charityId (ref Charity), subscriptionStatus (active|inactive|cancelled|past_due),
stripeCustomerId, isEmailVerified, createdAt
```

#### [NEW] `server/src/models/Subscription.ts`
```
userId (ref User), stripeSubscriptionId, stripePriceId,
plan (monthly|yearly), status, currentPeriodStart, currentPeriodEnd,
cancelAtPeriodEnd, createdAt
```

#### [NEW] `server/src/models/Score.ts`
```
userId (ref User), scores [{ value (1-45), submittedAt }] max 5,
updatedAt
```
- FIFO: new score replaces oldest when array length exceeds 5
- Sorted reverse chronological order

#### [NEW] `server/src/models/Charity.ts`
```
name, description, logoUrl, websiteUrl, registrationNumber,
isActive, totalDonated, createdAt
```

#### [NEW] `server/src/models/Draw.ts`
```
month (YYYY-MM), status (pending|simulated|executed|cancelled),
drawNumbers [5] (1-45), executionType (random|algorithm),
prizePool, rolloverAmount (jackpot from previous draw),
totalEntries, winnersSnapshot [], executedAt, adminId
```

#### [NEW] `server/src/models/Winner.ts`
```
drawId (ref Draw), userId (ref User),
tier (3-match|4-match|5-match), prizeAmount,
charityDonationAmount, charityId,
proofImageUrl, verificationStatus (pending|approved|rejected),
adminNotes, verifiedAt, verifiedBy
```

#### [NEW] `server/src/models/Transaction.ts`
```
userId (ref User), type (subscription|donation|prize_payout),
amount, currency, stripePaymentIntentId,
charityId, drawId, status, createdAt
```

---

### 4. Backend — Middlewares

#### [NEW] `server/src/middlewares/auth.ts`
Verify Bearer JWT → attach `req.user = { id, role }`.

#### [NEW] `server/src/middlewares/roleGuard.ts`
`requireAdmin` middleware — 403 if role !== 'admin'.

#### [NEW] `server/src/middlewares/validate.ts`
Generic Zod schema validation factory for body/params/query.

#### [NEW] `server/src/middlewares/errorHandler.ts`
Global error handler — formats errors, hides stack in production.

#### [NEW] `server/src/middlewares/rateLimiter.ts`
`express-rate-limit`: 100 req/15min general, 10 req/15min for auth routes.

#### [NEW] `server/src/middlewares/secureHeaders.ts`
`helmet()` with CSP, HSTS, X-Frame-Options.

#### [NEW] `server/src/middlewares/rawBody.ts`
Preserve raw body buffer for Stripe webhook signature verification.

---

### 5. Backend — Repositories

#### [NEW] `server/src/repositories/userRepository.ts`
findById, findByEmail, create, updateSubscriptionStatus, list (paginated)

#### [NEW] `server/src/repositories/scoreRepository.ts`
findByUserId, upsert (FIFO 5-score), getTopScorers

#### [NEW] `server/src/repositories/drawRepository.ts`
create, findByMonth, updateStatus, addWinners

#### [NEW] `server/src/repositories/charityRepository.ts`
findAll, findById, create, update, delete, incrementDonated

#### [NEW] `server/src/repositories/winnerRepository.ts`
findByDraw, findByUser, updateVerification, uploadProof

#### [NEW] `server/src/repositories/transactionRepository.ts`
create, findByUser, aggregateByCharity

---

### 6. Backend — Services

#### [NEW] `server/src/services/authService.ts`
- `signup(name, email, password, charityId)` → hash password (bcrypt 12 rounds), create User, send welcome email
- `login(email, password)` → compare hash, sign JWT (RS256 or HS256), return token + user
- `refreshToken(token)` → verify + re-issue
- `getMe(userId)` → populate charity

#### [NEW] `server/src/services/subscriptionService.ts`
- `createCheckoutSession(userId, plan)` → Stripe Checkout Session (subscription mode)
- `createPortalSession(userId)` → Stripe Customer Portal
- `handleWebhook(event)` → processes:
  - `checkout.session.completed` → activate subscription
  - `invoice.payment_succeeded` → renew, create Transaction, trigger donation calc
  - `invoice.payment_failed` → mark past_due, send warning email
  - `customer.subscription.deleted` → mark cancelled, restrict access
  - `customer.subscription.updated` → sync plan/status

#### [NEW] `server/src/services/scoreService.ts`
- `getScores(userId)` → return sorted scores (newest first)
- `addScore(userId, value)` → push to array, if length > 5 remove oldest (FIFO), validate 1-45
- `getParticipationHistory(userId)` → scores + draw entries

#### [NEW] `server/src/services/drawService.ts`
**Core Draw Engine:**
- `generateRandomNumbers()` → 5 unique numbers 1-45 (cryptographically random via `crypto.randomInt`)
- `generateAlgorithmNumbers(entries)` → builds frequency map from all active users' recent scores, samples 5 numbers via weighted probability distribution
- `simulateDraw(month, type)` → run draw logic without saving — returns preview results
- `executeDraw(month, type, adminId)` → finalise draw:
  1. Pull all active subscribers with ≥1 score
  2. Generate draw numbers
  3. Compare each user's scores to draw numbers → compute match count
  4. **Prize pool distribution:**
     - 5-match → 40% of prize pool, split equally among all 5-match winners
     - 4-match → 35%, split equally among all 4-match winners
     - 3-match → 25%, split equally among all 3-match winners
  5. **Charity donation:** deduct donation % (min 10%) from each winner's prize per their charity selection
  6. **Jackpot rollover:** if no 5-match winners → carry forward to next month's prize pool
  7. Create Winner records, create Transaction records, send winner emails
- `getRolloverAmount()` → sum unclaimed jackpots from previous draws
- `getDrawHistory(page, limit)` → paginated draws

#### [NEW] `server/src/services/charityService.ts`
- `listCharities()` → active charities only
- `getCharity(id)`
- `createCharity(data)` → admin only
- `updateCharity(id, data)` → admin only
- `deleteCharity(id)` → soft delete (isActive = false)
- `processDonation(userId, charityId, amount)` → create Transaction, increment Charity.totalDonated
- `getCharityStats()` → aggregated donation totals per charity

#### [NEW] `server/src/services/winnerService.ts`
- `uploadProof(winnerId, userId, file)` → save file, update Winner.proofImageUrl, status → pending
- `verifyWinner(winnerId, adminId, status, notes)` → admin approve/reject, if approved trigger payment email
- `getWinnersByDraw(drawId)`
- `getUserWinnings(userId)` → participation history including winnings

#### [NEW] `server/src/services/emailService.ts`
Nodemailer (SMTP) + Resend fallback:
- `sendWelcomeEmail(user)`
- `sendSubscriptionConfirmation(user, plan)`
- `sendPaymentFailedEmail(user)`
- `sendCancellationEmail(user)`
- `sendWinnerNotification(user, winner, draw)`
- `sendProofRequiredEmail(user, winner)`
- `sendVerificationResult(user, winner, status)`
- `sendDrawReminder(users)` — monthly reminder to enter scores

#### [NEW] `server/src/services/analyticsService.ts`
- `getDashboardMetrics()` → total users, active subscribers, total donated, draws run
- `getRevenueByMonth()` → monthly MRR
- `getCharityBreakdown()` → donations per charity
- `getDrawParticipation()` → entries per draw
- `getScoreDistribution()` → histogram of all scores entered

---

### 7. Backend — Controllers & Routes

#### [NEW] Auth Routes `POST /api/auth/*`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/signup` | Public | Register + charity selection |
| POST | `/login` | Public | Login, returns JWT |
| GET | `/me` | JWT | Current user profile |
| PUT | `/me` | JWT | Update profile/charity |
| POST | `/logout` | JWT | Invalidate client token |

#### [NEW] Subscription Routes `POST /api/subscriptions/*`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/checkout` | JWT | Create Stripe Checkout session |
| POST | `/portal` | JWT | Create Stripe Customer Portal session |
| GET | `/status` | JWT | Current subscription details |
| POST | `/webhooks/stripe` | None (raw body + sig) | Stripe webhook handler |

#### [NEW] Score Routes `/api/scores`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | JWT | Get user's 5 scores (newest first) |
| POST | `/` | JWT + subscribed | Add new score (auto-FIFO) |
| GET | `/history` | JWT | Full participation history |

#### [NEW] Draw Routes `/api/draws`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | JWT | List draws (paginated) |
| GET | `/current` | JWT | Current month draw info |
| GET | `/:id` | JWT | Draw detail + results |
| POST | `/simulate` | Admin | Run simulation (no save) |
| POST | `/execute` | Admin | Execute final draw |
| GET | `/rollover` | Admin | Current rollover amount |

#### [NEW] Charity Routes `/api/charities`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List all active charities |
| GET | `/:id` | Public | Charity detail + stats |
| POST | `/` | Admin | Create charity |
| PUT | `/:id` | Admin | Update charity |
| DELETE | `/:id` | Admin | Soft delete charity |
| GET | `/stats` | Admin | Donation analytics |

#### [NEW] Winner Routes `/api/winners`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/my` | JWT | My winnings history |
| POST | `/:id/proof` | JWT | Upload proof image |
| GET | `/` | Admin | All winners (filterable) |
| PUT | `/:id/verify` | Admin | Approve / Reject winner |

#### [NEW] Admin Routes `/api/admin`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | Admin | Paginated user list |
| GET | `/users/:id` | Admin | User detail |
| PUT | `/users/:id/subscription` | Admin | Override subscription status |
| DELETE | `/users/:id` | Admin | Deactivate account |
| GET | `/analytics` | Admin | Dashboard metrics |
| GET | `/analytics/revenue` | Admin | Monthly MRR |
| GET | `/analytics/charities` | Admin | Charity breakdown |
| GET | `/analytics/draws` | Admin | Participation per draw |

---

### 8. Backend — Tests

#### [NEW] `server/src/tests/auth.test.ts`
- Signup with valid data → 201 + token
- Signup duplicate email → 409
- Login invalid password → 401
- JWT protected route without token → 401

#### [NEW] `server/src/tests/score.test.ts`
- Add score 1-45 → stored
- Score outside range → 400
- 6th score replaces oldest (FIFO)
- Sorted newest first

#### [NEW] `server/src/tests/draw.test.ts`
- Prize pool: 5-match = 40%, 4-match = 35%, 3-match = 25%
- Rollover triggered if no 5-match winners
- Algorithm draw produces numbers in 1-45 range
- Simulation does not persist to DB

#### [NEW] `server/src/tests/webhook.test.ts`
- `checkout.session.completed` → subscription activated
- `invoice.payment_failed` → status = past_due
- `customer.subscription.deleted` → status = cancelled

---

### 9. Frontend — Design System

#### [NEW] `client/src/app/globals.css`
CSS variables:
- `--green-dark: #0A2416`
- `--green-mid: #1A4D2E`
- `--gold: #C9A84C`
- `--gold-light: #E8C97A`
- `--glass: rgba(255,255,255,0.07)`
- Grain texture overlay
- Smooth scroll

#### [NEW] `client/tailwind.config.ts`
Extended theme: custom colors, `Bricolage Grotesque` (display) + `Inter` (body), gradient utilities, animation keyframes.

#### [NEW] ShadCN Components
Install: `button`, `input`, `form`, `dialog`, `table`, `badge`, `card`, `select`, `tabs`, `dropdown-menu`, `avatar`, `progress`, `toast`, `skeleton`, `separator`, `sheet`

---

### 10. Frontend — Zustand Stores

#### [NEW] `client/src/store/useAuthStore.ts`
```ts
{ user, token, isLoading, login(), logout(), fetchMe() }
```
Persisted to localStorage (token only).

#### [NEW] `client/src/store/useDrawStore.ts`
```ts
{ currentDraw, history, fetchCurrentDraw(), fetchHistory() }
```

#### [NEW] `client/src/store/useCharityStore.ts`
```ts
{ charities, fetchCharities() }
```

---

### 11. Frontend — API Service Layer

#### [NEW] `client/src/services/apiClient.ts`
Axios instance with:
- Base URL from `NEXT_PUBLIC_API_URL`
- Request interceptor → attach `Authorization: Bearer <token>`
- Response interceptor → 401 → logout + redirect to `/auth/login`

#### [NEW] `client/src/services/*.service.ts`
| File | Methods |
|------|---------|
| `auth.service.ts` | signup, login, getMe, updateMe |
| `subscription.service.ts` | createCheckout, createPortal, getStatus |
| `score.service.ts` | getScores, addScore, getHistory |
| `draw.service.ts` | getCurrentDraw, getDraws, getDrawById, simulate, execute |
| `charity.service.ts` | getCharities, getCharity, create, update, remove |
| `winner.service.ts` | getMyWinnings, uploadProof, getAllWinners, verify |
| `admin.service.ts` | getUsers, getUser, updateSub, deleteUser, getAnalytics |

---

### 12. Frontend — Pages & Components

#### [NEW] Landing Page `/` — Awwwards-level design
**Sections:**
1. **Hero** — Full-viewport animated gradient mesh background, large display headline ("Play Golf. Win Big. Change Lives."), animated sub-headline, dual CTA (`Get Started` + `See How It Works`), floating score cards with Framer Motion
2. **How It Works** — Horizontal scroll or stepped animation: 1-Subscribe → 2-Enter Scores → 3-Draw Day → 4-Give Back
3. **Impact Stats** — Animated counters: total donated, charities supported, members, draws completed
4. **Charity Showcase** — Horizontal scroll carousel of charity cards with glassmorphism
5. **Pricing** — Monthly/Yearly toggle with Framer Motion layout animation, feature checklist, Stripe checkout CTA
6. **Draw Mechanics** — Visual explanation of the prize pool split (40/35/25%) and jackpot rollover
7. **Testimonials** — Scroll-triggered card reveal
8. **Footer** — Links, social, charity impact statement

#### [NEW] `/auth/signup`
- Step 1: Name + Email + Password (strength meter)
- Step 2: Charity selection (animated cards, single-select)
- Step 3: Plan selection → Stripe Checkout redirect
- Progress bar stepper with Framer Motion slides

#### [NEW] `/auth/login`
- Email + Password form
- Glassmorphism card, animated logo

#### [NEW] `/dashboard` — User Dashboard
Layout with sidebar navigation:
- **Overview** — Subscription status badge, next draw countdown, recent score summary, charity impact meter
- **Score Entry** (`/dashboard/scores`)
  - Display current 5 scores (newest first)
  - Input field (1-45, validated)
  - Submit → FIFO replacement with animation
  - Score history timeline
- **Charity** (`/dashboard/charity`)
  - Current charity card
  - Donation % selector (min 10%, slider)
  - Change charity option
  - My total donated counter
- **Participation History** (`/dashboard/history`)
  - Table of all draws entered
  - Match result per draw (how many numbers matched)
  - Status badge (entered / winner / no match)
- **Winnings** (`/dashboard/winnings`)
  - Cards for each win (tier, amount, charity donated)
  - Proof upload button (file input, image preview)
  - Verification status badge (pending/approved/rejected)
- **Subscription** (`/dashboard/subscription`)
  - Current plan, renewal date
  - Upgrade / Cancel buttons → Stripe Portal

#### [NEW] `/admin` — Admin Dashboard
Layout with sidebar:
- **Analytics** (`/admin/analytics`)
  - KPI cards: total users, MRR, total donated, active draws
  - Line chart: MRR over time (Recharts)
  - Donut chart: charity donation breakdown
  - Bar chart: draw participation
  - Score distribution histogram
- **User Management** (`/admin/users`)
  - Searchable, filterable, paginated table
  - Columns: name, email, plan, status, charity, joined
  - Actions: view detail, override subscription, deactivate
- **Draw Control** (`/admin/draws`)
  - Current month draw status
  - Configuration panel: select draw type (random/algorithm)
  - **Simulate** button → preview results in modal (users who would win, prize amounts)
  - **Execute Draw** button (confirm dialog) → finalise
  - Jackpot rollover amount display
  - Draw history table with expandable rows
- **Charity Management** (`/admin/charities`)
  - CRUD table with inline edit
  - Add new charity form (name, description, logo upload, website, registration number)
  - Toggle active/inactive
  - Total donated per charity statsT
- **Winner Verification** (`/admin/winners`)
  - Queue of pending verifications
  - Image preview panel
  - Approve / Reject buttons with notes field
  - Status filter tabs (all / pending / approved / rejected)

---

### 13. Frontend — Hooks

#### [NEW] `client/src/hooks/useAuth.ts`
Auto-fetch user on mount, expose login/logout.

#### [NEW] `client/src/hooks/useSubscriptionGuard.ts`
Redirect non-subscribed users from protected dashboard pages.

#### [NEW] `client/src/hooks/useCountdown.ts`
Countdown timer to next draw date (last day of current month).

#### [NEW] `client/src/hooks/useAnimatedCounter.ts`
Framer Motion animated number counter for stats section.

#### [NEW] `client/src/hooks/useScores.ts`
Fetch, add score, optimistic UI updates.

---

### 14. Frontend — Key Reusable Components

#### [NEW] `ScoreEntryForm`
5-count score display + single input (1-45) + submit, with slot animation for replacement.

#### [NEW] `DrawCountdown`
Days/Hours/Minutes/Seconds countdown to end of month draw.

#### [NEW] `CharityCard`
Animated selection card with logo, impact stats, glassmorphism.

#### [NEW] `PricingCard`
Monthly/yearly toggle, feature list, animated `Popular` badge, Stripe CTA.

#### [NEW] `WinnerModal`
Prize breakdown, proof upload dropzone, verification status timeline.

#### [NEW] `AdminDrawPanel`
Simulation → Confirm → Execute multi-step UI with result preview table.

#### [NEW] `SubscriptionBadge`
Status chip: Active (green), Past Due (amber), Cancelled (red), Inactive (grey).

#### [NEW] `ProtectedRoute`
Client-side HOC checking auth + subscription status before rendering page.

#### [NEW] `AppSidebar`
Responsive collapsible sidebar (Sheet on mobile) with active link highlighting.

---

### 15. Deployment

#### [NEW] `client/vercel.json`
```json
{ "framework": "nextjs", "buildCommand": "npm run build", "outputDirectory": ".next" }
```

#### [NEW] `server/Dockerfile`
Multi-stage Node build for Railway/Render.

#### [NEW] `server/render.yaml` / `railway.toml`
Service definition with env var references.

#### [NEW] `README.md`
- Project overview
- Local setup guide
- Environment variable reference
- API documentation (all endpoints, request/response shapes)
- Deployment checklist

---

## Verification Plan

### Automated Tests
```bash
cd server && npm run test
```
Runs Jest with Supertest covering:
- Auth: signup, login, duplicate email, JWT guard
- Scores: FIFO replacement, range validation, sort order
- Draw: prize distribution maths, rollover trigger, simulation isolation
- Webhooks: all 5 Stripe event types mocked

### Manual Verification Checklist
1. `npm run dev` in both `/server` and `/client`
2. Landing page loads with animations
3. Signup → charity select → Stripe checkout (test card `4242 4242 4242 4242`)
4. Webhook fires → subscription activated in DB
5. Login → dashboard → add 6 scores → confirm FIFO (5 remain, oldest gone)
6. Admin login → Draw simulate → review preview → Execute draw
7. Winner receives notification email, uploads proof
8. Admin approves proof → winner status updates
9. Cancelled subscription → access to score entry blocked
10. Jackpot rollover: execute draw with no 5-match → verify rolloverAmount on next draw
