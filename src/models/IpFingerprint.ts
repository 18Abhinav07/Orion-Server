import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User';

export interface IIpFingerprint extends Document {
  sha256Hash: string;
  perceptualHash: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  duration?: number;
  ipfsCid: string;
  ipfsUrl: string;
  pinataMetadata?: object;
  storyIpId?: string;
  storyTokenId?: number;
  licenseTermsId?: string;
  creatorWallet: string;
  creatorUserId: IUser['_id'];
  status: 'pending' | 'registered' | 'disputed' | 'rejected';
  isDerivative: boolean;
  parentIpId?: string;
  highestSimilarityScore: number;
  matchedParentId?: IIpFingerprint['_id'];
  registeredAt?: Date;
}

const IpFingerprintSchema: Schema = new Schema({
  sha256Hash: { type: String, indexed: true, unique: true, required: true },
  perceptualHash: { type: String, indexed: true, required: true },
  originalFilename: { type: String, required: true },
  mimeType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  duration: { type: Number },
  ipfsCid: { type: String, indexed: true, required: true },
  ipfsUrl: { type: String, required: true },
  pinataMetadata: { type: Object },
  storyIpId: { type: String, indexed: true },
  storyTokenId: { type: Number },
  licenseTermsId: { type: String },
  creatorWallet: { type: String, indexed: true, required: true },
  creatorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'registered', 'disputed', 'rejected'],
    default: 'pending',
  },
  isDerivative: { type: Boolean, default: false },
  parentIpId: { type: String },
  highestSimilarityScore: { type: Number, default: 0 },
  matchedParentId: { type: Schema.Types.ObjectId, ref: 'IpFingerprint' },
  registeredAt: { type: Date },
}, { timestamps: true });

export default mongoose.model<IIpFingerprint>('IpFingerprint', IpFingerprintSchema);
