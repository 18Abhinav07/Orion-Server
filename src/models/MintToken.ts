import mongoose, { Schema, Document } from 'mongoose';

export interface IMintToken extends Document {
  nonce: number;
  creatorAddress: string;
  contentHash: string;
  ipMetadataURI: string;
  nftMetadataURI: string;
  message: string;
  signature: string;
  issuedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'used' | 'expired' | 'revoked' | 'registered';
  ipId?: string;
  tokenId?: number;
  txHash?: string;
  usedAt?: Date;
  usedInTx?: string;
  revokedAt?: Date;
  revokedReason?: string;
  sessionId: string;
  fingerprintId: string;
  // License terms fields
  licenseTermsId?: string;
  licenseType?: 'commercial_remix' | 'non_commercial';
  royaltyPercent?: number;
  allowDerivatives?: boolean;
  commercialUse?: boolean;
  licenseTxHash?: string;
  licenseAttachedAt?: Date;
  // IP Metadata fields (denormalized for fast queries)
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  tags?: string[];
}

const MintTokenSchema: Schema = new Schema({
  nonce: { type: Number, required: true, unique: true, indexed: true },
  creatorAddress: { type: String, required: true, indexed: true },
  contentHash: { type: String, required: true },
  ipMetadataURI: { type: String, required: true },
  nftMetadataURI: { type: String, required: true },
  message: { type: String, required: true },
  signature: { type: String, required: true },
  issuedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, indexed: true },
  status: {
    type: String,
    enum: ['pending', 'used', 'expired', 'revoked', 'registered'],
    default: 'pending',
    indexed: true,
  },
  ipId: { type: String },
  tokenId: { type: Number },
  txHash: { type: String },
  usedAt: { type: Date },
  usedInTx: { type: String },
  revokedAt: { type: Date },
  revokedReason: { type: String },
  sessionId: { type: String, indexed: true },
  fingerprintId: { type: String },
  // License terms fields
  licenseTermsId: { type: String, indexed: true },
  licenseType: {
    type: String,
    enum: ['commercial_remix', 'non_commercial'],
    indexed: true,
  },
  royaltyPercent: {
    type: Number,
    min: 0,
    max: 100,
    indexed: true,
  },
  allowDerivatives: { type: Boolean },
  commercialUse: { type: Boolean, indexed: true },
  licenseTxHash: { type: String },
  licenseAttachedAt: { type: Date },
  // IP Metadata fields (denormalized for fast queries)
  name: { type: String },
  description: { type: String },
  image: { type: String },
  external_url: { type: String },
  attributes: [{
    trait_type: { type: String },
    value: { type: Schema.Types.Mixed }
  }],
  tags: [{ type: String }],
}, { timestamps: true });

export default mongoose.model<IMintToken>('MintToken', MintTokenSchema);
