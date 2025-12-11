import mongoose, { Schema, Document } from 'mongoose';

export interface IDerivativeLink extends Document {
  parentIpId: string;
  childIpId: string;
  licenseTermsId: string;
  licenseTokenId: number;
  royaltyPercentage?: number;
  linkType: 'auto_detected' | 'user_declared' | 'admin_enforced';
  txHash: string;
  blockNumber: number;
  linkedAt: Date;
}

const DerivativeLinkSchema: Schema = new Schema({
  parentIpId: { type: String, indexed: true, required: true },
  childIpId: { type: String, indexed: true, required: true },
  licenseTermsId: { type: String, required: true },
  licenseTokenId: { type: Number, required: true },
  royaltyPercentage: { type: Number },
  linkType: {
    type: String,
    enum: ['auto_detected', 'user_declared', 'admin_enforced'],
    required: true,
  },
  txHash: { type: String, required: true },
  blockNumber: { type: Number, required: true },
  linkedAt: { type: Date, default: Date.now, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model<IDerivativeLink>('DerivativeLink', DerivativeLinkSchema);
