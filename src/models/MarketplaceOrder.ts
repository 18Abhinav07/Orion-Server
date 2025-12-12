import mongoose, { Schema, Document } from 'mongoose';

export interface IMarketplaceOrder extends Document {
  // Order identifiers
  orderId: string;
  orderType: 'license_purchase' | 'ip_sale' | 'derivative_creation' | 'royalty_payment';
  
  // Transaction details
  txHash: string;
  blockNumber?: number;
  timestamp: number;
  
  // Parties involved
  buyerAddress: string;
  sellerAddress: string;
  
  // Asset details
  ipId?: string;
  licenseTokenId?: string;
  derivativeIpId?: string;
  
  // Financial details
  amount: string; // in wei
  currency: string;
  fee: string; // platform fee in wei
  royalty?: string; // royalty amount in wei
  
  // Order status
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  
  // Metadata
  metadata: {
    ipTitle?: string;
    ipType?: string;
    licenseType?: string;
    description?: string;
  };
  
  // Error tracking
  errorMessage?: string;
  errorCode?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const MarketplaceOrderSchema: Schema = new Schema({
  // Order identifiers
  orderId: {
    type: String,
    required: true,
    unique: true,
    indexed: true,
  },
  orderType: {
    type: String,
    enum: ['license_purchase', 'ip_sale', 'derivative_creation', 'royalty_payment'],
    required: true,
    indexed: true,
  },
  
  // Transaction details
  txHash: {
    type: String,
    required: true,
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
  
  // Parties involved
  buyerAddress: {
    type: String,
    required: true,
    indexed: true,
  },
  sellerAddress: {
    type: String,
    required: true,
    indexed: true,
  },
  
  // Asset details
  ipId: {
    type: String,
    indexed: true,
  },
  licenseTokenId: {
    type: String,
    indexed: true,
  },
  derivativeIpId: {
    type: String,
    indexed: true,
  },
  
  // Financial details
  amount: {
    type: String,
    required: true,
  },
  currency: {
    type: String,
    required: true,
  },
  fee: {
    type: String,
    default: '0',
  },
  royalty: {
    type: String,
  },
  
  // Order status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending',
    indexed: true,
  },
  
  // Metadata
  metadata: {
    ipTitle: String,
    ipType: String,
    licenseType: String,
    description: String,
  },
  
  // Error tracking
  errorMessage: String,
  errorCode: String,
  
  // Timestamps
  completedAt: Date,
}, {
  timestamps: true,
});

// Compound indexes for common queries
MarketplaceOrderSchema.index({ buyerAddress: 1, status: 1, timestamp: -1 });
MarketplaceOrderSchema.index({ sellerAddress: 1, status: 1, timestamp: -1 });
MarketplaceOrderSchema.index({ ipId: 1, orderType: 1, timestamp: -1 });
MarketplaceOrderSchema.index({ orderType: 1, status: 1, timestamp: -1 });

export default mongoose.model<IMarketplaceOrder>('MarketplaceOrder', MarketplaceOrderSchema);
