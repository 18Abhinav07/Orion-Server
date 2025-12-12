# RAG Similarity Engine - Implementation Summary

## What Was Built

A complete AI-powered IP forgery detection system integrated into the Orion minting verification flow. The system prevents copyright infringement by analyzing content similarity before allowing mints to proceed.

## Key Features

### 1. **Multimodal Embedding Generation**
- Supports video, image, audio, and text content
- Video: Extracts frames at 1 fps, averages embeddings
- Image: Direct embedding generation
- Text/Audio: Text-based embedding
- Uses Together AI's embedding models (768-dimensional vectors)

### 2. **Vector Similarity Search**
- Pinecone vector database for fast cosine similarity search
- Two namespaces:
  - `registered-ips`: Confirmed registered content (baseline)
  - `pending-review`: Pending/warning content
- Top K matching with configurable thresholds

### 3. **Threshold-Based Decision Tree**
```
0-40% similarity   → CLEAN (auto-approve)
40-75% similarity  → WARNING (show derivative recommendation)
75-100% similarity → BLOCKED (reject with 403, flag for admin)
```

### 4. **Admin Review Dashboard**
- View similarity statistics and Pinecone index stats
- Browse flagged content with pagination
- Update review notes and override status
- Inspect detailed match information

### 5. **Seamless Integration**
- Integrated into existing `/api/verification/generate-mint-token` endpoint
- Requires new `assetType` parameter
- Returns similarity warnings in successful responses
- Blocks high-similarity content with detailed error
- Registers embeddings in Pinecone after successful minting

## Files Created/Modified

### New Files
1. `src/models/Embedding.ts` - MongoDB schema for embeddings
2. `src/config/ai.config.ts` - AI service configuration
3. `src/services/pineconeService.ts` - Pinecone vector DB integration
4. `src/services/embeddingService.ts` - Together AI embedding generation
5. `src/services/similarityService.ts` - Core similarity checking logic
6. `src/routes/admin.similarity.routes.ts` - Admin API routes
7. `RAG_IMPLEMENTATION.md` - Comprehensive documentation
8. `RAG_IMPLEMENTATION_SUMMARY.md` - This file

### Modified Files
1. `src/controllers/verificationController.ts` - Added similarity check to mint flow
2. `src/controllers/similarityController.ts` - Replaced placeholders with admin endpoints
3. `src/middleware/auth.ts` - Added `isAdmin` middleware
4. `src/app.ts` - Registered admin routes
5. `src/server.ts` - Initialize Pinecone on startup
6. `.env` - Added AI service configuration
7. `.env.example` - Added AI service configuration template

## Environment Variables Added

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
SIMILARITY_THRESHOLD_CLEAN=40
SIMILARITY_THRESHOLD_WARNING=75
SIMILARITY_ENABLE_LLM_ANALYSIS=true
SIMILARITY_TOP_K_MATCHES=10
EMBEDDING_DIMENSION=768
```

## NPM Packages Installed

```json
{
  "@pinecone-database/pinecone": "^3.x.x",
  "together-ai": "^1.x.x",
  "fluent-ffmpeg": "^2.x.x",
  "@types/fluent-ffmpeg": "^2.x.x"
}
```

## API Changes

### Modified Endpoint: POST /api/verification/generate-mint-token

**New Required Field:**
- `assetType`: "video" | "image" | "audio" | "text"

**New Response Fields:**
- `similarity.warning`: Boolean indicating medium similarity
- `similarity.message`: User-facing warning message
- `similarity.score`: Similarity percentage (0-100)
- `similarity.topMatch`: Details of most similar content
- `similarity.matches`: Array of similar content

**New Error Response:**
```json
{
  "success": false,
  "error": "SIMILARITY_BLOCKED",
  "message": "Blocked: This content shows 85% similarity...",
  "similarity": { ... }
}
```

### New Admin Endpoints

1. **GET /api/admin/similarity/stats** - Similarity statistics
2. **GET /api/admin/similarity/flagged** - Flagged content list
3. **GET /api/admin/similarity/content/:contentHash** - Content details
4. **PATCH /api/admin/similarity/content/:contentHash/review** - Update review

All require admin JWT token.

## How It Works

### Minting Flow

1. **User uploads content** → Frontend sends mint request with `assetType`
2. **Backend generates embedding** → Downloads from IPFS, extracts features, calls Together AI
3. **Query Pinecone** → Find top K similar embeddings using cosine similarity
4. **Calculate similarity score** → Convert cosine similarity to percentage (0-100)
5. **Decision tree:**
   - **0-40%**: ✅ Generate signature, return success (CLEAN)
   - **40-75%**: ⚠️ Generate signature, return success with warning (WARNING)
   - **75-100%**: ❌ Reject with 403, flag for admin review (BLOCKED)
6. **Store embedding** → Save in MongoDB, upsert to Pinecone pending namespace
7. **After on-chain mint** → Move embedding from pending to registered namespace

### Admin Review Flow

1. **Admin logs in** → JWT with admin role
2. **View flagged content** → GET /api/admin/similarity/flagged?status=blocked
3. **Inspect details** → GET /api/admin/similarity/content/:contentHash
4. **Make decision:**
   - Approve: PATCH with `similarityStatus: "clean"` and review notes
   - Keep blocked: PATCH with review notes explaining decision
5. **Embedding updated** → Status changed, notes saved to MongoDB

## Configuration Requirements

### Prerequisites

1. **Together AI Account**
   - Sign up at https://together.ai
   - Get API key from dashboard
   - Note: Free tier available for testing

2. **Pinecone Account**
   - Sign up at https://pinecone.io
   - Create project in us-east-1 (or update PINECONE_ENVIRONMENT)
   - Get API key from console
   - Index created automatically on server startup

3. **FFmpeg Installation** (for video processing)
   ```bash
   # macOS
   brew install ffmpeg
   
   # Ubuntu/Debian
   apt-get install ffmpeg
   ```

### Startup

The server gracefully degrades if AI services aren't configured:

```
✅ Server starts normally
⚠️  Logs warning: "AI services not configured. Similarity engine will be unavailable."
⚠️  Similarity checks will fail until API keys are added
```

To enable RAG engine:
1. Add API keys to `.env`
2. Restart server
3. Server will initialize Pinecone and create index

## Testing

```bash
# Run build to verify compilation
npm run build

# Run all tests
npm test

# Test specific service
npm test -- --testPathPattern=similarity
```

## Next Steps for Full Production

### Phase 1: Foundation ✅ (COMPLETED)
- [x] Embedding generation with Together AI
- [x] Pinecone vector database integration
- [x] MongoDB storage for embeddings
- [x] Threshold-based similarity detection
- [x] Admin review endpoints

### Phase 2: Frontend Integration (TODO)
- [ ] Update frontend to include `assetType` parameter
- [ ] Show similarity warnings to users
- [ ] Handle BLOCKED errors gracefully
- [ ] Add derivative work recommendation UI

### Phase 3: LLM Intelligence (TODO)
- [ ] Integrate Together AI vision model
- [ ] Semantic analysis of similar content
- [ ] Distinguish derivative works from copies
- [ ] Generate detailed similarity reports

### Phase 4: Admin Dashboard UI (TODO)
- [ ] Build React admin panel
- [ ] Visual similarity comparison
- [ ] Side-by-side content preview
- [ ] Approval workflow with notes

### Phase 5: Optimization (TODO)
- [ ] Parallel frame extraction for videos
- [ ] Embedding caching layer
- [ ] Batch processing for multiple uploads
- [ ] Performance monitoring and alerts

## Cost Considerations

### Together AI
- Embedding generation: ~$0.0001 per 1K tokens
- Video (300 frames): ~$0.03 per video
- Image: ~$0.001 per image
- Estimated: $10-50/month for 1000-5000 uploads

### Pinecone
- Serverless tier: $0.096 per 1M read/write units
- Storage: ~$0.10 per GB/month
- Estimated: $20-100/month for 10K-100K vectors

## Security Notes

1. **API Keys**: Stored in environment variables, never committed
2. **Admin Auth**: Required for all admin endpoints
3. **Content Validation**: Asset type validated, IPFS URIs verified
4. **Rate Limiting**: Consider adding rate limits for embedding generation

## Monitoring

All operations logged with structured data:
- Embedding generation: model, tokens, dimension
- Similarity checks: score, matches, decision
- Pinecone operations: namespace, vector count
- Admin actions: status changes, review notes

Check logs at: `logs/combined.log` and `logs/error.log`

## Troubleshooting

### "TOGETHER_AI_API_KEY is not set"
- Add API key to `.env` file
- Restart server
- Verify key is valid in Together AI dashboard

### "Failed to initialize Pinecone"
- Check API key is correct
- Verify PINECONE_ENVIRONMENT matches your index region
- Ensure network connectivity to Pinecone

### "No frames could be extracted from video"
- Install FFmpeg: `brew install ffmpeg`
- Check video file format (MP4, MOV, AVI supported)
- Verify IPFS gateway is accessible

### High memory usage
- Embeddings are 768 dimensions (large arrays)
- Use pagination for admin queries
- Exclude embedding vectors with `.select('-embeddingVector')`

## Support Resources

1. **Documentation**: `RAG_IMPLEMENTATION.md`
2. **Plan**: `RAG_SIMILARITY_ENGINE_PLAN.md`
3. **Together AI Docs**: https://docs.together.ai
4. **Pinecone Docs**: https://docs.pinecone.io
5. **Logs**: `logs/` directory

## Success Metrics

The RAG engine is working correctly when:
- ✅ Server starts without errors
- ✅ Pinecone index created automatically
- ✅ `npm run build` compiles successfully
- ✅ Embeddings generated for test uploads
- ✅ Similar content detected and blocked
- ✅ Admin endpoints return statistics
- ✅ Embeddings registered after minting

---

**Implementation Status**: 🎉 PHASE 1 COMPLETE - Ready for API key configuration and testing!

**Next Action**: Configure TOGETHER_AI_API_KEY and PINECONE_API_KEY in `.env`, then test with sample content upload.
