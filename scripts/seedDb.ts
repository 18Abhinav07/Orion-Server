import mongoose from 'mongoose';
import connectDB from '../src/config/database';
import User from '../src/models/User';
import logger from '../src/utils/logger';

// TODO: Define some sample data for users, fingerprints, etc.
const seedData = {
  users: [
    {
      walletAddress: '0xSampleWalletAddress1',
      email: 'creator1@example.com',
      roles: ['creator'],
      nonce: 'sample-nonce-1',
    },
    {
      walletAddress: '0xSampleWalletAddressAdmin',
      email: 'admin@example.com',
      roles: ['admin', 'creator'],
      nonce: 'sample-nonce-admin',
    },
  ],
  // Add other models' seed data here
};

const seedDatabase = async () => {
  await connectDB();
  try {
    logger.info('Seeding database...');

    // Clear existing data (optional, useful for development)
    await User.deleteMany({});
    // await IpFingerprint.deleteMany({});
    // await SimilarityDispute.deleteMany({});
    // await DerivativeLink.deleteMany({});

    // Insert new data
    await User.insertMany(seedData.users);
    // await IpFingerprint.insertMany(seedData.ipFingerprints);

    logger.info('Database seeded successfully!');
    process.exit(0);
  } catch (error: any) {
    logger.error('Error seeding database:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

seedDatabase();
