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
import { connectDB } from './config/db';
import { initRedis } from './config/redis';
import { initSocketIO } from './services/socketService';
import apiRouter from './routes';
import { errorHandler } from './middleware/error';
import { mongoSanitize } from './middleware/sanitize';
import rateLimit from 'express-rate-limit';

const app = express();
const server = http.createServer(app);

// 1. Security & Logging Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    xContentTypeOptions: true,
    xFrameOptions: { action: 'sameorigin' },
  })
);

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

const isProd = process.env.NODE_ENV === 'production';

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (mobile, server-to-server, health check probes)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || (!isProd && allowedOrigins.includes('*'))) {
        callback(null, true);
      } else {
        if (isProd) {
          callback(new Error(`CORS blocked for origin: ${origin}`));
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
app.use('/api/auth/send-registration-otp', authLimiter);
app.use('/api', globalLimiter);

app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize);

// 3. Initialize Real-Time WebSockets
initSocketIO(server);

// 4. Mount Master API Routes
app.use('/api', apiRouter);

// 5. Centralized Error Handler
app.use(errorHandler);

// 6. Connect Database & Start Server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await initRedis();

    server.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 SIH26044 Backend Server running on port ${PORT}`);
      console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🔗 REST API Base: http://localhost:${PORT}/api`);
      console.log(`🔌 WebSockets: ws://localhost:${PORT}`);
      console.log(`=======================================================`);
    });
  } catch (err: any) {
    console.error('Critical server bootstrap error:', err.message);
  }
};

startServer();

export { app, server };
