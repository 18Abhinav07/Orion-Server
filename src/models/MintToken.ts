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
  status: 'pending' | 'used' | 'expired' | 'revoked';
  ipId?: string;
  tokenId?: number;
  txHash?: string;
  usedAt?: Date;
  usedInTx?: string;
  revokedAt?: Date;
  revokedReason?: string;
  sessionId: string;
  fingerprintId: string;
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
    enum: ['pending', 'used', 'expired', 'revoked'],
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
}, { timestamps: true });

export default mongoose.model<IMintToken>('MintToken', MintTokenSchema);
