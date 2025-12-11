import mongoose, { Schema, Document } from 'mongoose';

export interface ICreationSession extends Document {
  sessionId: string;
  userId: string;
  currentStep: 'metadata' | 'fingerprint' | 'similarity' | 'dispute' | 'ready-to-mint';
  completedSteps: string[];
  data: {
    title?: string;
    description?: string;
    category?: string;
    ipfsCid?: string;
    contentHash?: string;
    fingerprintId?: string;
    similarityScore?: number;
    isOriginal?: boolean;
    detectedParents?: any[];
    mintTokenNonce?: number;
    mintTokenExpiresAt?: Date;
  };
  status: 'in-progress' | 'completed' | 'expired' | 'disputed';
  expiresAt: Date;
}

const CreationSessionSchema: Schema = new Schema({
  sessionId: { type: String, required: true, unique: true, indexed: true },
  userId: { type: String, required: true, indexed: true },
  currentStep: {
    type: String,
    enum: ['metadata', 'fingerprint', 'similarity', 'dispute', 'ready-to-mint'],
    required: true,
  },
  completedSteps: { type: [String], default: [] },
  data: {
    title: { type: String },
    description: { type: String },
    category: { type: String },
    ipfsCid: { type: String },
    contentHash: { type: String },
    fingerprintId: { type: String },
    similarityScore: { type: Number },
    isOriginal: { type: Boolean },
    detectedParents: { type: Array, default: [] },
    mintTokenNonce: { type: Number },
    mintTokenExpiresAt: { type: Date },
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'expired', 'disputed'],
    default: 'in-progress',
  },
  expiresAt: { type: Date, required: true, indexed: true },
}, { timestamps: true });

export default mongoose.model<ICreationSession>('CreationSession', CreationSessionSchema);
