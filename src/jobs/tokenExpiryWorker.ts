import cron from 'node-cron';
import MintToken from '../models/MintToken';
import logger from '../utils/logger';

// This cron job runs every 5 minutes
const tokenExpiryJob = cron.schedule('*/5 * * * *', async () => {
  const now = new Date();
  logger.info(`Running token expiry job at ${now}...`);

  try {
    const result = await MintToken.updateMany(
      {
        status: 'valid',
        expiresAt: { $lt: now },
      },
      {
        $set: { status: 'expired' },
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`Expired ${result.modifiedCount} tokens.`);
    } else {
      logger.info('No tokens to expire.');
    }
  } catch (error: any) {
    logger.error('Error during token expiry job:', error.message);
  }
});

export const startTokenExpiryWorker = () => {
  logger.info('Starting token expiry worker...');
  tokenExpiryJob.start();
};
