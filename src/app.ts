import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

// Import routes
import authRoutes from './routes/auth.routes';
import fingerprintRoutes from './routes/fingerprint.routes';
import similarityRoutes from './routes/similarity.routes';
import storyRoutes from './routes/story.routes';
import disputeRoutes from './routes/dispute.routes';
import verificationRoutes from './routes/verification.routes';

const app = express();

// Middleware
app.use(cors());
app.use(json());

// Request logging
app.use((req, res, next) => {
  const userAgent = req.headers['user-agent'] || 'unknown';
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  logger.info(`${req.method} ${req.originalUrl} - Agent: ${userAgent} - IP: ${ip}`);
  next();
});

// API Routes
app.use('/auth', authRoutes);
app.use('/api/fingerprint', fingerprintRoutes);
app.use('/api/similarity', similarityRoutes);
app.use('/api/story', storyRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/verification', verificationRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Global Error Handler (should be last)
app.use(errorHandler);

export default app;

