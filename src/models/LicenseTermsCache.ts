import { Schema, model, Document } from 'mongoose';

export interface ILicenseTermsCache extends Document {
  licenseType: 'commercial_remix' | 'non_commercial';
  royaltyPercent: number;
  licenseTermsId: string; // Story Protocol license terms ID
  transactionHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LicenseTermsCacheSchema = new Schema<ILicenseTermsCache>(
  {
    licenseType: {
      type: String,
      required: true,
      enum: ['commercial_remix', 'non_commercial'],
      index: true,
    },
    royaltyPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      index: true,
    },
    licenseTermsId: {
      type: String,
      required: true,
    },
    transactionHash: {
      type: String,
      match: /^0x[a-fA-F0-9]{64}$/,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: one entry per license type + royalty combination
LicenseTermsCacheSchema.index(
  { licenseType: 1, royaltyPercent: 1 },
  { unique: true }
);

export const LicenseTermsCache = model<ILicenseTermsCache>(
  'LicenseTermsCache',
  LicenseTermsCacheSchema
);
