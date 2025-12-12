import { Schema, model, Document } from 'mongoose';

export interface IEmbedding extends Document {
  contentHash: string; // keccak256 hash of the content for uniqueness
  embeddingVector: number[]; // High-dimensional vector from Together AI
  pineconeId: string; // ID stored in Pinecone for fast retrieval
  assetType: 'video' | 'image' | 'audio' | 'text'; // Type of content
  creatorAddress: string; // Ethereum address of the creator
  storyIpId?: string; // Story Protocol IP ID if registered
  ipMetadataURI: string; // IPFS URI of IP metadata
  nftMetadataURI: string; // IPFS URI of NFT metadata
  extractedFrames?: number; // Number of video frames extracted (for videos)
  embeddingModel: string; // Model name used for embedding generation
  similarityStatus: 'clean' | 'warning' | 'blocked' | 'pending-review'; // Similarity check result
  topMatchScore?: number; // Highest similarity score found (0-100)
  topMatchContentHash?: string; // Content hash of most similar content
  reviewNotes?: string; // Admin notes for flagged content
  createdAt: Date;
  updatedAt: Date;
}

const EmbeddingSchema = new Schema<IEmbedding>(
  {
    contentHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    embeddingVector: {
      type: [Number],
      required: true,
    },
    pineconeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    assetType: {
      type: String,
      required: true,
      enum: ['video', 'image', 'audio', 'text'],
    },
    creatorAddress: {
      type: String,
      required: true,
      index: true,
    },
    storyIpId: {
      type: String,
      index: true,
      sparse: true, // Allow null/undefined values
    },
    ipMetadataURI: {
      type: String,
      required: true,
    },
    nftMetadataURI: {
      type: String,
      required: true,
    },
    extractedFrames: {
      type: Number,
    },
    embeddingModel: {
      type: String,
      required: true,
    },
    similarityStatus: {
      type: String,
      required: true,
      enum: ['clean', 'warning', 'blocked', 'pending-review'],
      default: 'pending-review',
      index: true,
    },
    topMatchScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    topMatchContentHash: {
      type: String,
    },
    reviewNotes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient similarity search queries
EmbeddingSchema.index({ similarityStatus: 1, createdAt: -1 });
EmbeddingSchema.index({ creatorAddress: 1, createdAt: -1 });

export const Embedding = model<IEmbedding>('Embedding', EmbeddingSchema);
