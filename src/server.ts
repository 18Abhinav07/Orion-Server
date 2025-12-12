import app from './app';
import connectDB from './config/database';
import logger from './utils/logger';
import dotenv from 'dotenv';
import { startTokenExpiryWorker } from './jobs/tokenExpiryWorker';
import { validateAIConfig } from './config/ai.config';
import { initializePinecone } from './services/pineconeService';

dotenv.config();

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  logger.info('Starting server...');
  try {
    logger.info('Connecting to database...');
    await connectDB();
    logger.info('Database connected successfully.');
    
    logger.info('Validating AI configuration...');
    try {
      validateAIConfig();
      logger.info('AI configuration validated successfully.');
      
      logger.info('Initializing Pinecone vector database...');
      await initializePinecone();
      logger.info('Pinecone initialized successfully.');
    } catch (aiError: any) {
      logger.warn('AI services not configured. Similarity engine will be unavailable.', {
        error: aiError.message,
      });
      logger.warn('To enable RAG similarity engine, configure TOGETHER_AI_API_KEY and PINECONE_API_KEY in .env');
    }
    
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
