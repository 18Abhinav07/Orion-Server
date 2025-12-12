# RAG Similarity Engine - Implementation Guide

## Overview

The RAG (Retrieval-Augmented Generation) Similarity Engine is an AI-powered IP forgery detection system that prevents copyright infringement by analyzing content similarity before minting. It uses Together AI for multimodal embeddings and LLM analysis, combined with Pinecone vector database for fast similarity search.

## Architecture

### Components

1. **Embedding Generation Service** (`src/services/embeddingService.ts`)
   - Generates high-dimensional vector embeddings from content
   - Supports video, image, audio, and text content
   - Extracts video frames at 1 fps for multimodal analysis
   - Uses Together AI's embedding models

2. **Pinecone Service** (`src/services/pineconeService.ts`)
   - Manages vector database operations
   - Upserts embeddings to registered/pending namespaces
   - Queries for similar content using cosine similarity
   - Handles index creation and statistics

3. **Similarity Service** (`src/services/similarityService.ts`)
   - Core similarity checking logic
   - Implements threshold-based decision tree:
     - 0-40%: CLEAN (auto-approve)
     - 40-75%: WARNING (derivative recommendation)
     - 75-100%: BLOCKED (admin review required)
   - Registers embeddings after successful minting

4. **Verification Controller** (`src/controllers/verificationController.ts`)
   - Integrated similarity check into mint token generation
   - Returns BLOCKED error (403) for high-similarity content
   - Includes WARNING in response for medium-similarity content
   - Registers embeddings in Pinecone after minting

5. **Admin Dashboard** (`src/controllers/similarityController.ts`)
   - View similarity statistics
   - Review flagged content
   - Update review notes and status
   - Inspect detailed match information

## Configuration

### Environment Variables

```bash
# AI Services - Together AI
TOGETHER_AI_API_KEY=your-together-ai-api-key
TOGETHER_AI_EMBEDDING_MODEL=togethercomputer/m2-bert-80M-8k-retrieval
TOGETHER_AI_CHAT_MODEL=meta-llama/Llama-3.3-70B-Instruct-Turbo
TOGETHER_AI_VISION_MODEL=meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo

# Vector Database - Pinecone
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=orion-ip-embeddings
PINECONE_NAMESPACE_REGISTERED=registered-ips
PINECONE_NAMESPACE_PENDING=pending-review

# RAG Similarity Engine Configuration
SIMILARITY_THRESHOLD_CLEAN=40        # 0-40% = clean
SIMILARITY_THRESHOLD_WARNING=75      # 40-75% = warning, 75-100% = blocked
SIMILARITY_ENABLE_LLM_ANALYSIS=true  # Future: LLM reasoning for edge cases
SIMILARITY_TOP_K_MATCHES=10          # Number of similar matches to retrieve
EMBEDDING_DIMENSION=768              # Embedding vector dimension
```

### Dependencies

```json
{
  "@pinecone-database/pinecone": "^3.x.x",
  "together-ai": "^1.x.x",
  "fluent-ffmpeg": "^2.x.x",
  "@types/fluent-ffmpeg": "^2.x.x"
}
```

## API Endpoints

### Public Endpoints

#### POST /api/verification/generate-mint-token

Generate mint token with similarity check.

**Request:**
```json
{
  "creatorAddress": "0x...",
  "contentHash": "0x...",
  "ipMetadataURI": "ipfs://...",
  "nftMetadataURI": "ipfs://...",
  "assetType": "video" // "video" | "image" | "audio" | "text"
}
```

**Response - Success (Clean):**
```json
{
  "success": true,
  "data": {
    "signature": "0x...",
    "nonce": 123,
    "expiresAt": 1234567890,
    "expiresIn": 900
  }
}
```

**Response - Warning (Medium Similarity):**
```json
{
  "success": true,
  "data": {
    "signature": "0x...",
    "nonce": 123,
    "expiresAt": 1234567890,
    "expiresIn": 900,
    "similarity": {
      "warning": true,
      "message": "Warning: This content shows 65% similarity to existing registered IP...",
      "score": 65,
      "topMatch": {
        "contentHash": "0x...",
        "score": 65,
        "assetType": "video",
        "creatorAddress": "0x...",
        "storyIpId": "0x..."
      },
      "matches": [...]
    }
  }
}
```

**Response - Blocked (High Similarity):**
```json
{
  "success": false,
  "error": "SIMILARITY_BLOCKED",
  "message": "Blocked: This content shows 85% similarity to existing registered IP...",
  "similarity": {
    "score": 85,
    "topMatch": {
      "contentHash": "0x...",
      "score": 85,
      "assetType": "video",
      "creatorAddress": "0x...",
      "storyIpId": "0x...",
      "ipMetadataURI": "ipfs://...",
      "nftMetadataURI": "ipfs://..."
    },
    "matches": [...]
  }
}
```

### Admin Endpoints (Require Admin Auth)

#### GET /api/admin/similarity/stats

Get similarity engine statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "embeddings": {
      "total": 1500,
      "clean": 1200,
      "warning": 250,
      "blocked": 40,
      "pendingReview": 10,
      "recentBlocked": [...]
    },
    "pinecone": {
      "namespaces": {
        "registered-ips": { "vectorCount": 1200 },
        "pending-review": { "vectorCount": 260 }
      },
      "dimension": 768,
      "indexFullness": 0.012
    }
  }
}
```

#### GET /api/admin/similarity/flagged?status=blocked&page=1&limit=20

Get flagged content for review.

**Response:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "contentHash": "0x...",
        "assetType": "video",
        "creatorAddress": "0x...",
        "similarityStatus": "blocked",
        "topMatchScore": 85,
        "topMatchContentHash": "0x...",
        "ipMetadataURI": "ipfs://...",
        "nftMetadataURI": "ipfs://...",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 40,
      "pages": 2
    }
  }
}
```

#### GET /api/admin/similarity/content/:contentHash

Get detailed similarity matches for specific content.

**Response:**
```json
{
  "success": true,
  "data": {
    "content": {
      "contentHash": "0x...",
      "assetType": "video",
      "creatorAddress": "0x...",
      "similarityStatus": "blocked",
      "topMatchScore": 85,
      "topMatchContentHash": "0x...",
      "reviewNotes": "Pending investigation..."
    },
    "topMatch": {
      "contentHash": "0x...",
      "assetType": "video",
      "creatorAddress": "0x...",
      "storyIpId": "0x...",
      "ipMetadataURI": "ipfs://...",
      "nftMetadataURI": "ipfs://..."
    }
  }
}
```

#### PATCH /api/admin/similarity/content/:contentHash/review

Update review notes for flagged content.

**Request:**
```json
{
  "reviewNotes": "Reviewed - legitimate derivative work, approved",
  "similarityStatus": "clean" // Optional: "clean" | "warning" | "blocked" | "pending-review"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Review notes updated successfully",
  "data": {
    "contentHash": "0x...",
    "similarityStatus": "clean",
    "reviewNotes": "Reviewed - legitimate derivative work, approved"
  }
}
```

## Data Flow

### Minting Flow with Similarity Check

1. **User submits minting request**
   - Frontend calls POST /api/verification/generate-mint-token
   - Includes assetType parameter

2. **Backend generates embedding**
   - Downloads content from IPFS
   - For videos: extracts frames at 1 fps
   - Generates embedding using Together AI
   - Stores embedding in MongoDB

3. **Similarity search**
   - Queries Pinecone for top K similar embeddings
   - Converts cosine similarity to percentage (0-100)
   - Determines status based on thresholds

4. **Decision tree**
   - **CLEAN (0-40%)**: Generate signature, return success
   - **WARNING (40-75%)**: Generate signature, return success with warning
   - **BLOCKED (75-100%)**: Reject request with 403, flag for admin review

5. **Post-minting registration**
   - After successful mint on-chain
   - Frontend calls PATCH /api/verification/token/:nonce/update
   - Backend moves embedding from pending to registered namespace
   - Updates MongoDB with Story IP ID

## Database Schema

### Embedding Model

```typescript
{
  contentHash: string;           // keccak256 hash (unique)
  embeddingVector: number[];     // 768-dimensional vector
  pineconeId: string;            // Pinecone vector ID
  assetType: 'video' | 'image' | 'audio' | 'text';
  creatorAddress: string;        // Ethereum address
  storyIpId?: string;            // Story Protocol IP ID (after registration)
  ipMetadataURI: string;         // IPFS URI
  nftMetadataURI: string;        // IPFS URI
  extractedFrames?: number;      // Video frames count
  embeddingModel: string;        // Model name used
  similarityStatus: 'clean' | 'warning' | 'blocked' | 'pending-review';
  topMatchScore?: number;        // 0-100
  topMatchContentHash?: string;  // Content hash of top match
  reviewNotes?: string;          // Admin review notes
  createdAt: Date;
  updatedAt: Date;
}
```

## Performance Considerations

### Video Processing
- Extracts 1 frame per second (configurable via `videoFramesPerSecond`)
- Maximum 300 frames per video (5 minutes at 1 fps)
- Averages frame embeddings for final video embedding
- Temporary files cleaned up after processing

### Pinecone Namespaces
- **registered-ips**: Confirmed registered IPs (baseline for similarity)
- **pending-review**: Pending/warning content (included in similarity checks)

### Caching
- Embeddings stored in MongoDB for audit trail
- Duplicate content hash check before generating new embedding

## Security

### Admin Authentication
- All admin endpoints protected with `protect` + `isAdmin` middleware
- JWT token required with admin role

### Content Validation
- Asset type validated against allowed values
- Content hash verified for duplicates
- URIs validated for IPFS format

## Monitoring & Logging

All operations logged with structured data:
- Embedding generation: model, dimension, tokens used
- Similarity checks: status, score, matches found
- Pinecone operations: namespace, vector count
- Admin actions: content hash, status changes

## Future Enhancements

1. **LLM Analysis** (Phase 3)
   - Use Together AI vision model for semantic understanding
   - Detect derivative works vs direct copies
   - Generate detailed similarity reports

2. **Multimodal Analysis**
   - Audio fingerprinting for music similarity
   - Text similarity for scripts/stories
   - Combined multi-asset analysis

3. **Performance Optimization**
   - Parallel frame extraction
   - Embedding caching
   - Batch processing for multiple uploads

4. **Admin Dashboard UI**
   - Visual similarity comparison
   - Side-by-side content preview
   - Approval workflow

## Testing

```bash
# Run all tests
npm test

# Test similarity service specifically
npm test -- --testPathPattern=similarity

# Test with coverage
npm run test:coverage
```

## Troubleshooting

### Pinecone Connection Errors
- Verify `PINECONE_API_KEY` is set correctly
- Check `PINECONE_ENVIRONMENT` matches your index region
- Ensure index exists or server will create it on startup

### Together AI API Errors
- Verify `TOGETHER_AI_API_KEY` is valid
- Check model names match available models
- Monitor token usage and rate limits

### Video Processing Errors
- Ensure FFmpeg is installed on server
- Check video file format compatibility
- Verify sufficient disk space for temporary files

### High Memory Usage
- Embedding vectors are 768 dimensions (large)
- Consider pagination for admin queries
- Use `.select('-embeddingVector')` to exclude vectors when not needed

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review Pinecone dashboard for index stats
3. Monitor Together AI usage dashboard
4. Contact team with error logs and request details
