import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

// Enforce IPv4 in nodemailer shared module so resolveHostname only queries and returns IPv4 addresses
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const shared = require('nodemailer/lib/shared');
  if (shared && shared.networkInterfaces) {
    for (const key of Object.keys(shared.networkInterfaces)) {
      if (Array.isArray(shared.networkInterfaces[key])) {
        shared.networkInterfaces[key] = shared.networkInterfaces[key].filter(
          (i: any) => i.family === 'IPv4' || i.family === 4
        );
      }
    }
  }
} catch {}

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('[FATAL CONFIGURATION ERROR] JWT_SECRET environment variable is missing.');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('[FATAL CONFIGURATION ERROR] MONGODB_URI environment variable is missing.');
  process.exit(1);
}

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { connectDB } from './config/db';
import { initRedis } from './config/redis';
import { initSocketIO } from './services/socketService';
import apiRouter from './routes';
import { errorHandler } from './middleware/error';
import { mongoSanitize } from './middleware/sanitize';
import rateLimit from 'express-rate-limit';

const app = express();
const server = http.createServer(app);

// Trust Render/Heroku/Vercel reverse proxy so express-rate-limit can identify real client IPs
// via X-Forwarded-For header. Without this, ERR_ERL_UNEXPECTED_X_FORWARDED_FOR is thrown.
app.set('trust proxy', 1);

// 1. Security & Logging Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    xContentTypeOptions: true,
    xFrameOptions: { action: 'sameorigin' },
    // OWASP A05: Enforce HTTPS via HSTS, hide Express fingerprinting, strict referrer policy
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    dnsPrefetchControl: { allow: false },
  })
);
app.disable('x-powered-by');

const defaultOrigins = [
  'https://sih26044-ayush-portal.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://sih26044-ayush-portal-production.up.railway.app',
];

const envOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim().replace(/\/+$/, ''))
  : [];

const frontendUrlOrigin = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL.trim().replace(/\/+$/, '')]
  : [];

const allowedOrigins = Array.from(
  new Set([...defaultOrigins, ...envOrigins, ...frontendUrlOrigin])
).filter(Boolean);

const isProd = process.env.NODE_ENV === 'production';

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (mobile, server-to-server, health check probes)
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/+$/, '');

      // OWASP A01 / A05: Strictly allow this specific project's Vercel & Railway domains (including previews)
      const isOfficialVercelDeployment =
        normalizedOrigin === 'https://sih26044-ayush-portal.vercel.app' ||
        /^https:\/\/sih26044-ayush-portal(-[a-zA-Z0-9_-]+)?\.vercel\.app$/.test(normalizedOrigin);

      const isOfficialRailwayDeployment =
        normalizedOrigin === 'https://sih26044-ayush-portal-production.up.railway.app' ||
        /^https:\/\/sih26044-ayush-portal(-[a-zA-Z0-9_-]+)?\.up\.railway\.app$/.test(normalizedOrigin);

      if (
        allowedOrigins.includes(normalizedOrigin) ||
        isOfficialVercelDeployment ||
        isOfficialRailwayDeployment ||
        !isProd
      ) {
        callback(null, true);
      } else {
        if (isProd) {
          callback(new Error(`CORS blocked for unauthorized origin: ${origin}`));
        } else {
          callback(null, true);
        }
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 2. Production Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP. Please try again after 15 minutes.',
    },
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
  },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/send-otp', authLimiter);
app.use('/api/auth/send-registration-otp', authLimiter);
app.use('/api', globalLimiter);

app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize);

// 3. Initialize Real-Time WebSockets
initSocketIO(server);

// 4. Health Check & Root Endpoints (Handles GET & HEAD for Render health checks and uptime probes)
const handleHealthCheck = (_req: express.Request, res: express.Response) => {
  const appName = process.env.APP_NAME?.trim() || 'Ayush Portal';
  const dbState = mongoose.connection.readyState;
  const dbStatus =
    dbState === 1 ? 'connected' :
    dbState === 2 ? 'connecting' :
    dbState === 3 ? 'disconnecting' : 'disconnected';

  res.status(200).json({
    status: 'ok',
    service: `${appName} Backend API`,
    message: `${appName} Backend API is running.`,
    database: dbStatus,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      emailHealth: '/api/health/email',
      apiBase: '/api',
    },
  });
};

app.get(['/', '/health'], handleHealthCheck);
app.head(['/', '/health'], (_req: express.Request, res: express.Response) => {
  res.status(200).end();
});
app.get('/health/email', async (_req: express.Request, res: express.Response) => {
  try {
    const { checkEmailConfig } = await import('./services/emailService');
    const result = await checkEmailConfig();
    const statusCode = result.configured && result.verified ? 200 : result.configured ? 502 : 503;
    res.status(statusCode).json(result);
  } catch (err: any) {
    res.status(500).json({ configured: false, error: err?.message || 'Failed to check email configuration' });
  }
});

// 5. Mount Master API Routes
app.use('/api', apiRouter);

// 6. 404 Handler for undefined routes
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// 7. Centralized Error Handler
app.use(errorHandler);

// 8. Connect Database & Start Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await initRedis();

    const appName = process.env.APP_NAME?.trim() || 'Ayush Portal';
    // Use the real public URL in production if available (Railway sets RAILWAY_PUBLIC_DOMAIN, Render sets RENDER_EXTERNAL_URL)
    const railwayUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN.trim().replace(/^https?:\/\//, '')}`
      : null;
    const defaultPublicUrl = isProd
      ? 'https://sih26044-ayush-portal-production.up.railway.app'
      : `http://localhost:${PORT}`;
    const publicUrl =
      railwayUrl ||
      process.env.RENDER_EXTERNAL_URL?.trim() ||
      process.env.BACKEND_URL?.trim() ||
      defaultPublicUrl;
    const wsUrl = publicUrl.replace(/^https?:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
    server.listen(Number(PORT) || 5000, '0.0.0.0', () => {
      console.log(`=======================================================`);
      console.log(`🚀 ${appName} Backend Server running on port ${PORT}`);
      console.log(`📡 Health Check: ${publicUrl}/api/health`);
      console.log(`📧 Email Diagnostics: ${publicUrl}/api/health/email`);
      console.log(`🔗 REST API Base: ${publicUrl}/api`);
      console.log(`🔌 WebSockets: ${wsUrl}`);
      console.log(`=======================================================`);
    });
  } catch (err: any) {
    console.error('Critical server bootstrap error:', err.message);
  }
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, server };
