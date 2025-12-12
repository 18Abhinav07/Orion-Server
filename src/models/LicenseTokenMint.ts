import mongoose, { Schema, Document } from 'mongoose';

export interface ILicenseTokenMint extends Document {
  // Primary identifiers
  licenseTokenId: string;
  
  // Transaction details
  txHash: string;
  blockNumber?: number;
  timestamp: number;
  
  // IP Asset details
  ipId: string;
  ipTokenId?: number;
  licenseTermsId: string;
  
  // Licensee details
  licenseeAddress: string;
  amount: number;
  
  // Financial details
  mintingFee: string;
  currency: string;
  royaltyPercentage: number;
  
  // License terms snapshot
  licenseTerms: {
    commercialUse: boolean;
    derivativesAllowed: boolean;
    transferable: boolean;
    expirationDate?: number;
    territories?: string[];
  };
  
  // Metadata
  metadata: {
    ipMetadataURI: string;
    nftMetadataURI: string;
    ipType: string;
    ipTitle?: string;
  };
  
  // Status tracking
  status: 'active' | 'expired' | 'revoked' | 'transferred';
  currentOwner: string;
  
  // Analytics
  usageCount: number;
  derivativeCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const LicenseTokenMintSchema: Schema = new Schema({
  // Primary identifiers
  licenseTokenId: {
    type: String,
    required: true,
    unique: true,
    indexed: true,
  },
  
  // Transaction details
  txHash: {
    type: String,
    required: true,
    unique: true,
    indexed: true,
  },
  blockNumber: {
    type: Number,
    indexed: true,
  },
  timestamp: {
    type: Number,
    required: true,
    indexed: true,
  },
  
  // IP Asset details
  ipId: {
    type: String,
    required: true,
    indexed: true,
  },
  ipTokenId: {
    type: Number,
  },
  licenseTermsId: {
    type: String,
    required: true,
    indexed: true,
  },
  
  // Licensee details
  licenseeAddress: {
    type: String,
    required: true,
    indexed: true,
  },
  amount: {
    type: Number,
    required: true,
    default: 1,
  },
  
  // Financial details
  mintingFee: {
    type: String,
    required: true,
  },
  currency: {
    type: String,
    required: true,
  },
  royaltyPercentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  
  // License terms snapshot
  licenseTerms: {
    commercialUse: {
      type: Boolean,
      required: true,
    },
    derivativesAllowed: {
      type: Boolean,
      required: true,
    },
    transferable: {
      type: Boolean,
      required: true,
    },
    expirationDate: {
      type: Number,
    },
    territories: [{
      type: String,
    }],
  },
  
  // Metadata
  metadata: {
    ipMetadataURI: {
      type: String,
      default: '',
    },
    nftMetadataURI: {
      type: String,
      default: '',
    },
    ipType: {
      type: String,
      default: 'Unknown',
    },
    ipTitle: {
      type: String,
    },
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['active', 'expired', 'revoked', 'transferred'],
    default: 'active',
    indexed: true,
  },
  currentOwner: {
    type: String,
    required: true,
    indexed: true,
  },
  
  // Analytics
  usageCount: {
    type: Number,
    default: 0,
  },
  derivativeCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Compound indexes for common queries
LicenseTokenMintSchema.index({ licenseeAddress: 1, status: 1, timestamp: -1 });
LicenseTokenMintSchema.index({ ipId: 1, status: 1, timestamp: -1 });
LicenseTokenMintSchema.index({ currentOwner: 1, status: 1 });
LicenseTokenMintSchema.index({ timestamp: 1, ipId: 1 });

export default mongoose.model<ILicenseTokenMint>('LicenseTokenMint', LicenseTokenMintSchema);
