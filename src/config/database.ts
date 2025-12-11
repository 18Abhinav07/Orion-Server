import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.NODE_ENV === 'test'
      ? process.env.MONGODB_TEST_URI
      : process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI or MONGODB_TEST_URI not defined in .env file');
    }

    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully.');
  } catch (err: any) {
    console.error('MongoDB connection error:', err.message);
    // Exit process with failure
    process.exit(1);
  }
};

export default connectDB;

