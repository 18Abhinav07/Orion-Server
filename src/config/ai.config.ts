import dotenv from 'dotenv';
dotenv.config();

export const aiConfig = {
  voyageAI: {
    apiKey: process.env.VOYAGE_AI_API_KEY || '',
    multimodalModel: process.env.VOYAGE_AI_MULTIMODAL_MODEL || 'voyage-multimodal-3',
    apiBaseUrl: process.env.VOYAGE_AI_API_BASE_URL || 'https://api.voyageai.com/v1',
  },
  togetherAI: {
    apiKey: process.env.TOGETHER_AI_API_KEY || '',
    chatModel: process.env.TOGETHER_AI_CHAT_MODEL || 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    visionModel: process.env.TOGETHER_AI_VISION_MODEL || 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
    apiBaseUrl: 'https://api.together.xyz/v1',
  },
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1',
    indexName: process.env.PINECONE_INDEX_NAME || 'orion-ip-embeddings',
    namespace: {
      registered: process.env.PINECONE_NAMESPACE_REGISTERED || 'registered-ips',
      pending: process.env.PINECONE_NAMESPACE_PENDING || 'pending-review',
    },
  },
  similarity: {
    thresholdClean: parseInt(process.env.SIMILARITY_THRESHOLD_CLEAN || '40', 10), // 0-40% = clean
    thresholdWarning: parseInt(process.env.SIMILARITY_THRESHOLD_WARNING || '75', 10), // 40-75% = warning, 75-100% = blocked
    enableLLMAnalysis: process.env.SIMILARITY_ENABLE_LLM_ANALYSIS === 'true',
    topKMatches: parseInt(process.env.SIMILARITY_TOP_K_MATCHES || '10', 10),
  },
  embedding: {
    dimension: parseInt(process.env.EMBEDDING_DIMENSION || '1024', 10), // voyage-multimodal-3 uses 1024 dimensions
    videoFramesPerSecond: 1, // Extract 1 frame per second for video analysis
    maxVideoFrames: 300, // Maximum 300 frames (5 minutes at 1 fps)
  },
};

// Validate critical configuration
export function validateAIConfig(): void {
  const errors: string[] = [];

  if (!aiConfig.voyageAI.apiKey) {
    errors.push('VOYAGE_AI_API_KEY is not set');
  }

  if (!aiConfig.togetherAI.apiKey) {
    errors.push('TOGETHER_AI_API_KEY is not set');
  }

  if (!aiConfig.pinecone.apiKey) {
    errors.push('PINECONE_API_KEY is not set');
  }

  if (aiConfig.similarity.thresholdClean >= aiConfig.similarity.thresholdWarning) {
    errors.push('SIMILARITY_THRESHOLD_CLEAN must be less than SIMILARITY_THRESHOLD_WARNING');
  }

  if (errors.length > 0) {
    throw new Error(`AI Configuration errors:\n${errors.join('\n')}`);
  }
}
