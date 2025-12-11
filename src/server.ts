import app from './app';
import connectDB from './config/database';
import logger from './utils/logger';
import dotenv from 'dotenv';
import { startTokenExpiryWorker } from './jobs/tokenExpiryWorker';

dotenv.config();

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  logger.info('Starting server...');
  try {
    logger.info('Connecting to database...');
    await connectDB();
    logger.info('Database connected successfully.');
    
    logger.info('Starting background workers...');
    startTokenExpiryWorker();

    app.listen(PORT, () => {
      logger.info(`Server is listening on http://localhost:${PORT}`);
    });
  } catch (error: any) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
