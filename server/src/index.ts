import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import path from 'path';
import { env } from './config/env';
import { connectDB } from './config/db';
import { errorHandler } from './middlewares/errorHandler';
import { generalLimiter } from './middlewares/rateLimiter';

// Routes
import authRoutes from './routes/authRoutes';
import scoreRoutes from './routes/scoreRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import drawRoutes from './routes/drawRoutes';
import charityRoutes from './routes/charityRoutes';
import winnerRoutes from './routes/winnerRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();

// ─── Security & Utility Middleware ────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: env.NODE_ENV === 'production',
  })
);
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(compression());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(generalLimiter);

// ─── Stripe Webhook (raw body MUST come before json()) ───────────────────────
app.use('/api/subscriptions', subscriptionRoutes);

// ─── JSON Body Parser ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static File Serving (uploads) ───────────────────────────────────────────
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/draws', drawRoutes);
app.use('/api/charities', charityRoutes);
app.use('/api/winners', winnerRoutes);
app.use('/api/admin', adminRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: env.NODE_ENV });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
const startServer = async () => {
  await connectDB();
  const port = parseInt(env.PORT, 10);
  app.listen(port, () => {
    console.log(`🚀 AltruGreen API running on http://localhost:${port}`);
    console.log(`📝 Environment: ${env.NODE_ENV}`);
  });
};

startServer().catch(console.error);

export default app;
