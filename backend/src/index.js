import express from 'express';
import session from 'express-session';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { env, isProd } from './config/env.js';
import './db/index.js';
import authRoutes from './routes/authRoutes.js';
import tokenRoutes from './routes/tokenRoutes.js';
import paccRoutes from './routes/paccRoutes.js';

const app = express();
app.set('trust proxy', env.TRUST_PROXY);

const allowedOrigins = new Set([
  env.FRONTEND_URL,
  ...(env.FRONTEND_URLS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
]);

app.use(helmet({
  crossOriginResourcePolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use(session({
  name: 'svp_panel_session',
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
}));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/token', tokenRoutes);
app.use('/api/pacc', paccRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error.' });
});

app.listen(env.PORT, () => {
  console.log(`Backend running on http://localhost:${env.PORT}`);
});
