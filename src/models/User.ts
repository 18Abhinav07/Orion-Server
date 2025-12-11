import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  walletAddress: string;
  email?: string;
  roles: string[];
  nonce?: string;
  isActive: boolean;
  lastLogin?: Date;
}

const UserSchema: Schema = new Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    indexed: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // allows null values to not be unique
  },
  roles: {
    type: [String],
    default: ['creator'], // e.g., ['creator', 'admin']
  },
  nonce: {
    type: String,
    // nonce for wallet signature verification
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);

