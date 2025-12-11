import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';
import { IIpFingerprint } from './IpFingerprint';

export interface ISimilarityDispute extends Document {
  childFingerprintId: IIpFingerprint['_id'];
  parentFingerprintId: IIpFingerprint['_id'];
  similarityScore: number;
  uploaderWallet: string;
  originalCreatorWallet: string;
  status: 'pending' | 'approved_as_original' | 'enforced_derivative' | 'rejected';
  reviewedBy?: IUser['_id'];
  reviewNotes?: string;
  resolutionAction?: 'approved' | 'linked' | 'rejected';
  resolutionTxHash?: string;
  resolvedAt?: Date;
}

const SimilarityDisputeSchema: Schema = new Schema({
  childFingerprintId: { type: Schema.Types.ObjectId, ref: 'IpFingerprint', required: true },
  parentFingerprintId: { type: Schema.Types.ObjectId, ref: 'IpFingerprint', required: true },
  similarityScore: { type: Number, required: true },
  uploaderWallet: { type: String, required: true },
  originalCreatorWallet: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved_as_original', 'enforced_derivative', 'rejected'],
    default: 'pending',
    indexed: true,
  },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewNotes: { type: String },
  resolutionAction: {
    type: String,
    enum: ['approved', 'linked', 'rejected'],
  },
  resolutionTxHash: { type: String },
  resolvedAt: { type: Date },
}, { timestamps: true });

export default mongoose.model<ISimilarityDispute>('SimilarityDispute', SimilarityDisputeSchema);
