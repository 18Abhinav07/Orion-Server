# Voyage AI + Together AI Integration Guide

## Architecture Overview

**Two-Service AI Stack:**
1. **Voyage AI** → Multimodal embedding generation (images, videos, text)
2. **Together AI** → LLM semantic analysis and scoring

This architecture provides:
- ✅ Best-in-class multimodal embeddings (Voyage AI)
- ✅ Advanced semantic understanding (Together AI LLMs)
- ✅ Cost-effective pricing ($0.12/1M tokens for embeddings)
- ✅ Scalable to millions of IPs

## How It Works

### Phase 1: Embedding Generation (Voyage AI)

```
User uploads content → Download from IPFS → Extract features:
├── Video: Extract frames @ 1fps → Base64 encode → Voyage API
├── Image: Base64 encode → Voyage API
└── Text: Direct text → Voyage API

→ Returns 1024-dimensional vector
→ Store in Pinecone for similarity search
```

### Phase 2: Similarity Search (Pinecone)

```
Query embedding → Pinecone cosine similarity search
→ Top K matches with scores (0-1)
→ Convert to percentage (0-100%)
```

### Phase 3: LLM Analysis (Together AI) - Optional

```
If similarity > 40% AND SIMILARITY_ENABLE_LLM_ANALYSIS=true:

Send to Together AI Llama 3.3 70B:
├── Query content metadata
├── Matched content metadata
├── Similarity score
└── Prompt: "Is this derivative, copy, or original?"

→ Returns JSON analysis:
   {
     "summary": "...",
     "is_derivative": true/false,
     "confidence_score": 85,
     "recommendation": "approve/warn/block",
     "detailed_comparison": "..."
   }
```

## API Keys Setup

### 1. Voyage AI

**Get API Key:**
```
1. Visit https://dash.voyageai.com
2. Sign up for account
3. Navigate to API Keys section
4. Create new API key
5. Add to .env:
   VOYAGE_AI_API_KEY=pa-...
```

**Pricing:**
- Free tier: 50M tokens/month
- voyage-multimodal-3: $0.12 per 1M tokens
- Example: 1000 videos (~300 frames each) = ~$36

**Model Details:**
- `voyage-multimodal-3`: 1024 dimensions
- Supports: Images (base64), text, mixed content
- Best for: Visual similarity, video fingerprinting

### 2. Together AI

**Get API Key:**
```
1. Visit https://api.together.xyz/signup
2. Sign up for account
3. Go to Settings → API Keys
4. Create new API key
5. Add to .env:
   TOGETHER_AI_API_KEY=...
```

**Pricing:**
- Llama 3.3 70B Instruct: $0.88 per 1M tokens
- Llama 3.2 11B Vision: $0.15 per 1M tokens
- Example: 1000 LLM analyses (~500 tokens each) = ~$0.44

**Models Used:**
- `meta-llama/Llama-3.3-70B-Instruct-Turbo`: Semantic analysis
- `meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo`: Visual understanding

## Environment Variables

```bash
# Voyage AI - Multimodal Embeddings
VOYAGE_AI_API_KEY=pa-your-key-here
VOYAGE_AI_MULTIMODAL_MODEL=voyage-multimodal-3
VOYAGE_AI_API_BASE_URL=https://api.voyageai.com/v1

# Together AI - LLM Analysis
TOGETHER_AI_API_KEY=your-key-here
TOGETHER_AI_CHAT_MODEL=meta-llama/Llama-3.3-70B-Instruct-Turbo
TOGETHER_AI_VISION_MODEL=meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo

# Embedding Configuration
EMBEDDING_DIMENSION=1024  # voyage-multimodal-3 dimension

# LLM Analysis Toggle
SIMILARITY_ENABLE_LLM_ANALYSIS=true  # Set to false to save costs
```

## API Response Examples

### Without LLM Analysis (Fast, Low Cost)

```json
{
  "success": true,
  "data": {
    "signature": "0x...",
    "nonce": 123,
    "similarity": {
      "warning": true,
      "message": "Warning: This content shows 65% similarity to existing IP...",
      "score": 65,
      "topMatch": { "contentHash": "0x...", "creatorAddress": "0x..." }
    }
  }
}
```

### With LLM Analysis (Detailed, Higher Cost)

```json
{
  "success": true,
  "data": {
    "signature": "0x...",
    "nonce": 123,
    "similarity": {
      "warning": true,
      "message": "Warning: 65% similarity...\n\nAI Analysis: This appears to be a derivative remix with transformative elements.",
      "score": 65,
      "topMatch": { ... },
      "llmAnalysis": {
        "summary": "The new content is a derivative remix with transformative elements. While visually similar, it adds creative value.",
        "similarity_reasoning": "High visual similarity due to shared subject matter, but different composition and style",
        "is_derivative": true,
        "confidence_score": 87,
        "recommendation": "warn",
        "detailed_comparison": "Both works feature similar subjects, but the new work uses different artistic techniques..."
      }
    }
  }
}
```

## Cost Optimization

### Scenario 1: High Volume, Budget Conscious
```bash
SIMILARITY_ENABLE_LLM_ANALYSIS=false
```
- Only uses Voyage AI embeddings
- ~$0.036 per video (300 frames)
- Decision based on threshold only

### Scenario 2: High Accuracy, Legal Safety
```bash
SIMILARITY_ENABLE_LLM_ANALYSIS=true
SIMILARITY_THRESHOLD_CLEAN=40  # Only analyze 40%+ similarity
```
- Uses Voyage AI + Together AI for risky cases
- ~$0.036 + $0.0004 per flagged video
- Better for legal compliance

### Scenario 3: Premium Service
```bash
SIMILARITY_ENABLE_LLM_ANALYSIS=true
SIMILARITY_THRESHOLD_CLEAN=0  # Analyze everything
```
- Full LLM analysis on all uploads
- ~$0.0404 per video
- Best user experience

## Testing

### 1. Test Embedding Generation

```bash
# In MongoDB shell or your test script
POST /api/verification/generate-mint-token
{
  "creatorAddress": "0x...",
  "contentHash": "0x...",
  "ipMetadataURI": "ipfs://QmTest123",
  "nftMetadataURI": "ipfs://QmTest456",
  "assetType": "image"
}

# Should return:
# - signature
# - nonce
# - No similarity warning (first upload)
```

### 2. Test Similarity Detection

```bash
# Upload same content again
POST /api/verification/generate-mint-token
{
  # Same data as above
}

# Should return:
# - error: "DUPLICATE_CONTENT"
# - 100% similarity score
```

### 3. Test LLM Analysis

```bash
# Set SIMILARITY_ENABLE_LLM_ANALYSIS=true
# Upload content with 40-75% similarity

# Should return:
# - signature (WARNING status)
# - llmAnalysis object with detailed reasoning
```

## Monitoring

### Check Logs

```bash
tail -f logs/combined.log | grep "Voyage AI\|Together AI\|LLM"
```

Look for:
- `Successfully generated embeddings with Voyage AI`
- `Successfully generated LLM similarity analysis`
- Token usage metrics

### Monitor Costs

**Voyage AI Dashboard:**
- https://dash.voyageai.com/usage
- Track token usage and billing

**Together AI Dashboard:**
- https://api.together.xyz/usage
- Monitor LLM API calls

## Troubleshooting

### "VOYAGE_AI_API_KEY is not set"
```bash
# Add to .env
VOYAGE_AI_API_KEY=pa-your-actual-key

# Restart server
npm run dev
```

### "Failed to generate embeddings"
```bash
# Check API key is valid
curl -X POST https://api.voyageai.com/v1/embeddings \
  -H "Authorization: Bearer pa-your-key" \
  -H "Content-Type: application/json" \
  -d '{"model":"voyage-multimodal-3","input":["test"]}'

# Should return embedding array
```

### "LLM analysis failed"
```bash
# LLM analysis is non-critical - it falls back to threshold decision
# Check Together AI API key:
curl -X POST https://api.together.xyz/v1/chat/completions \
  -H "Authorization: Bearer your-key" \
  -H "Content-Type: application/json" \
  -d '{"model":"meta-llama/Llama-3.3-70B-Instruct-Turbo","messages":[{"role":"user","content":"test"}]}'
```

### "EMBEDDING_DIMENSION mismatch"
```bash
# Ensure .env has:
EMBEDDING_DIMENSION=1024

# Restart server
# If Pinecone index exists with wrong dimension, delete and recreate:
# Index will auto-recreate with correct dimension on next startup
```

## Migration from Together-Only

If you previously used Together AI for embeddings:

1. **Update .env:**
   ```bash
   # Remove old
   # TOGETHER_AI_EMBEDDING_MODEL=...
   
   # Add new
   VOYAGE_AI_API_KEY=pa-...
   VOYAGE_AI_MULTIMODAL_MODEL=voyage-multimodal-3
   EMBEDDING_DIMENSION=1024
   ```

2. **Recreate Pinecone Index:**
   ```bash
   # Delete old index (768 dimensions)
   # Server will auto-create new index (1024 dimensions)
   ```

3. **Restart server:**
   ```bash
   npm run dev
   ```

## Best Practices

1. **Enable LLM Analysis Selectively:**
   - Use for WARNING/BLOCKED cases only
   - Saves ~90% of LLM costs

2. **Batch Frame Extraction:**
   - Current: 1 fps = 300 frames for 5min video
   - Consider: 0.5 fps = 150 frames (50% cost reduction)

3. **Cache Common Content:**
   - Store embeddings in MongoDB
   - Check for duplicate contentHash before re-embedding

4. **Monitor Token Usage:**
   - Set up billing alerts
   - Review usage weekly
   - Adjust sampling rate if needed

## Support

- **Voyage AI Docs:** https://docs.voyageai.com
- **Together AI Docs:** https://docs.together.ai
- **Pinecone Docs:** https://docs.pinecone.io
- **Implementation:** See `RAG_IMPLEMENTATION.md`
