import { aiConfig } from '../config/ai.config';
import logger from '../utils/logger';
import { querySimilarEmbeddings, upsertEmbeddings, deleteEmbedding } from './pineconeService';
import { generateContentEmbedding, generateContentHash, generatePineconeId } from './embeddingService';
import { Embedding, IEmbedding } from '../models/Embedding';
import { analyzeSimilarityWithLLM, LLMAnalysisResult } from './llmAnalysisService';

/**
 * Similarity check result
 */
export interface SimilarityCheckResult {
  status: 'CLEAN' | 'WARNING' | 'BLOCKED';
  similarityScore: number; // 0-100
  topMatch?: {
    contentHash: string;
    score: number;
    assetType: string;
    creatorAddress: string;
    storyIpId?: string;
    ipMetadataURI: string;
    nftMetadataURI: string;
  };
  matches: Array<{
    contentHash: string;
    score: number;
    assetType: string;
    creatorAddress: string;
    storyIpId?: string;
  }>;
  message: string;
  llmAnalysis?: LLMAnalysisResult; // Optional LLM analysis for high-similarity content
}

/**
 * Convert Pinecone cosine similarity (0-1) to percentage (0-100)
 */
function cosineSimilarityToPercentage(cosineSimilarity: number): number {
  // Cosine similarity ranges from -1 to 1, but for embeddings it's typically 0 to 1
  // Convert to percentage: 0 = 0%, 1 = 100%
  return Math.round(cosineSimilarity * 100);
}

/**
 * Determine similarity status based on threshold
 */
function determineSimilarityStatus(
  similarityPercentage: number
): 'CLEAN' | 'WARNING' | 'BLOCKED' {
  if (similarityPercentage <= aiConfig.similarity.thresholdClean) {
    return 'CLEAN';
  } else if (similarityPercentage <= aiConfig.similarity.thresholdWarning) {
    return 'WARNING';
  } else {
    return 'BLOCKED';
  }
}

/**
 * Generate message based on similarity status
 */
function getSimilarityMessage(
  status: 'CLEAN' | 'WARNING' | 'BLOCKED',
  similarityScore: number,
  topMatchCreator?: string
): string {
  if (status === 'CLEAN') {
    return `No similar content found. Your content appears to be original (${similarityScore}% similarity).`;
  } else if (status === 'WARNING') {
    return `Warning: This content shows ${similarityScore}% similarity to existing registered IP${
      topMatchCreator ? ` from creator ${topMatchCreator}` : ''
    }. Consider creating a derivative work or licensing instead of direct minting.`;
  } else {
    return `Blocked: This content shows ${similarityScore}% similarity to existing registered IP${
      topMatchCreator ? ` from creator ${topMatchCreator}` : ''
    }. This appears to be potential copyright infringement and has been flagged for admin review.`;
  }
}

/**
 * Check content similarity against existing registered IPs
 */
export async function checkContentSimilarity(
  ipMetadataURI: string,
  nftMetadataURI: string,
  assetType: 'video' | 'image' | 'audio' | 'text',
  creatorAddress: string
): Promise<SimilarityCheckResult> {
  try {
    logger.info('Starting content similarity check', {
      ipMetadataURI,
      nftMetadataURI,
      assetType,
      creatorAddress,
    });

    // Generate content hash
    const contentHash = generateContentHash(ipMetadataURI, nftMetadataURI);

    // Check if this exact content already exists
    const existingEmbedding = await Embedding.findOne({ contentHash });
    if (existingEmbedding) {
      logger.info('Exact content hash already exists', {
        contentHash,
        existingStatus: existingEmbedding.similarityStatus,
      });

      return {
        status: 'BLOCKED',
        similarityScore: 100,
        topMatch: {
          contentHash: existingEmbedding.contentHash,
          score: 100,
          assetType: existingEmbedding.assetType,
          creatorAddress: existingEmbedding.creatorAddress,
          storyIpId: existingEmbedding.storyIpId,
          ipMetadataURI: existingEmbedding.ipMetadataURI,
          nftMetadataURI: existingEmbedding.nftMetadataURI,
        },
        matches: [],
        message: 'This exact content has already been registered.',
      };
    }

    // Generate embedding for the new content
    const { embedding, framesExtracted } = await generateContentEmbedding(
      ipMetadataURI,
      assetType
    );

    // Query Pinecone for similar embeddings
    const similarMatches = await querySimilarEmbeddings(
      embedding,
      aiConfig.similarity.topKMatches,
      aiConfig.pinecone.namespace.registered
    );

    logger.info('Retrieved similar embeddings from Pinecone', {
      matchesFound: similarMatches.length,
      topScore: similarMatches[0]?.score || 0,
    });

    // Convert scores to percentages and format matches
    const formattedMatches = similarMatches.map((match) => ({
      contentHash: match.metadata.contentHash,
      score: cosineSimilarityToPercentage(match.score),
      assetType: match.metadata.assetType,
      creatorAddress: match.metadata.creatorAddress,
      storyIpId: match.metadata.storyIpId,
    }));

    const topMatch = similarMatches[0];
    const topScore = topMatch ? cosineSimilarityToPercentage(topMatch.score) : 0;
    const status = determineSimilarityStatus(topScore);

    // LLM Analysis for WARNING or BLOCKED content (if enabled)
    let llmAnalysis: LLMAnalysisResult | undefined;
    if (aiConfig.similarity.enableLLMAnalysis && topMatch && topScore >= aiConfig.similarity.thresholdClean) {
      try {
        logger.info('Running LLM analysis for high-similarity content', {
          similarityScore: topScore,
          topMatchContentHash: topMatch.metadata.contentHash,
        });

        llmAnalysis = await analyzeSimilarityWithLLM(
          {
            assetType,
            ipMetadataURI,
            nftMetadataURI,
            creatorAddress,
          },
          {
            assetType: topMatch.metadata.assetType,
            ipMetadataURI: topMatch.metadata.ipMetadataURI,
            nftMetadataURI: topMatch.metadata.nftMetadataURI,
            creatorAddress: topMatch.metadata.creatorAddress,
            storyIpId: topMatch.metadata.storyIpId,
          },
          topScore
        );

        logger.info('LLM analysis completed', {
          recommendation: llmAnalysis.recommendation,
          confidenceScore: llmAnalysis.confidence_score,
          isDerivative: llmAnalysis.is_derivative,
        });
      } catch (error: any) {
        logger.warn('LLM analysis failed, falling back to threshold-based decision', {
          error: error.message,
        });
      }
    }

    const result: SimilarityCheckResult = {
      status,
      similarityScore: topScore,
      topMatch: topMatch
        ? {
            contentHash: topMatch.metadata.contentHash,
            score: cosineSimilarityToPercentage(topMatch.score),
            assetType: topMatch.metadata.assetType,
            creatorAddress: topMatch.metadata.creatorAddress,
            storyIpId: topMatch.metadata.storyIpId,
            ipMetadataURI: topMatch.metadata.ipMetadataURI,
            nftMetadataURI: topMatch.metadata.nftMetadataURI,
          }
        : undefined,
      matches: formattedMatches,
      message: llmAnalysis 
        ? `${getSimilarityMessage(status, topScore, topMatch?.metadata.creatorAddress)}\n\nAI Analysis: ${llmAnalysis.summary}`
        : getSimilarityMessage(status, topScore, topMatch?.metadata.creatorAddress),
      llmAnalysis,
    };

    // Store embedding in MongoDB
    const newEmbedding = new Embedding({
      contentHash,
      embeddingVector: embedding,
      pineconeId: generatePineconeId(contentHash),
      assetType,
      creatorAddress,
      ipMetadataURI,
      nftMetadataURI,
      extractedFrames: framesExtracted,
      embeddingModel: aiConfig.voyageAI.multimodalModel,
      similarityStatus: status.toLowerCase(),
      topMatchScore: topScore,
      topMatchContentHash: topMatch?.metadata.contentHash,
    });

    await newEmbedding.save();

    // If not blocked, upsert to Pinecone pending namespace for future comparisons
    if (status !== 'BLOCKED') {
      await upsertEmbeddings(
        [
          {
            id: newEmbedding.pineconeId,
            values: embedding,
            metadata: {
              contentHash,
              assetType,
              creatorAddress,
              ipMetadataURI,
              nftMetadataURI,
              timestamp: Date.now(),
            },
          },
        ],
        aiConfig.pinecone.namespace.pending
      );
    }

    logger.info('Similarity check completed', {
      contentHash,
      status,
      similarityScore: topScore,
      matchesFound: formattedMatches.length,
    });

    return result;
  } catch (error: any) {
    logger.error(`Failed to check content similarity: ${JSON.stringify({
      error: error.message,
      stack: error.stack,
      ipMetadataURI
    })}`);
    throw new Error(`Similarity check failed: ${error.message}`);
  }
}

/**
 * Register content embedding after successful minting
 * Moves embedding from pending to registered namespace in Pinecone
 */
export async function registerContentEmbedding(
  contentHash: string,
  storyIpId: string
): Promise<void> {
  try {
    logger.info('Attempting to register content embedding', { contentHash, storyIpId });
    
    const embedding = await Embedding.findOne({ contentHash });

    if (!embedding) {
      const errorMsg = `Embedding not found for content hash: ${contentHash}`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    logger.info('Found embedding in MongoDB', {
      pineconeId: embedding.pineconeId,
      currentStatus: embedding.similarityStatus,
      hasEmbeddingVector: !!embedding.embeddingVector,
      vectorLength: embedding.embeddingVector?.length || 0,
    });

    // Update MongoDB with Story IP ID
    embedding.storyIpId = storyIpId;
    embedding.similarityStatus = 'clean'; // Registered content is now baseline
    await embedding.save();
    logger.info('Updated embedding in MongoDB', { contentHash, storyIpId });

    // Delete from pending namespace first
    try {
      await deleteEmbedding(embedding.pineconeId, aiConfig.pinecone.namespace.pending);
      logger.info('Deleted embedding from pending namespace', {
        pineconeId: embedding.pineconeId,
      });
    } catch (deleteError: any) {
      // Log but don't fail if deletion fails (embedding might not exist in pending)
      logger.warn('Failed to delete from pending namespace (may not exist)', {
        error: deleteError.message,
        pineconeId: embedding.pineconeId,
      });
    }

    // Add to registered namespace in Pinecone
    logger.info('Upserting to registered namespace', {
      pineconeId: embedding.pineconeId,
      namespace: aiConfig.pinecone.namespace.registered,
    });
    
    await upsertEmbeddings(
      [
        {
          id: embedding.pineconeId,
          values: embedding.embeddingVector,
          metadata: {
            contentHash: embedding.contentHash,
            assetType: embedding.assetType,
            creatorAddress: embedding.creatorAddress,
            storyIpId,
            ipMetadataURI: embedding.ipMetadataURI,
            nftMetadataURI: embedding.nftMetadataURI,
            timestamp: Date.now(),
          },
        },
      ],
      aiConfig.pinecone.namespace.registered
    );

    logger.info('Successfully registered content embedding', {
      contentHash,
      storyIpId,
      pineconeId: embedding.pineconeId,
    });
  } catch (error: any) {
    logger.error('Failed to register content embedding', { 
      error: error.message,
      stack: error.stack,
      contentHash, 
      storyIpId 
    });
    throw error;
  }
}

/**
 * Get similarity statistics for admin dashboard
 */
export async function getSimilarityStatistics() {
  try {
    const totalEmbeddings = await Embedding.countDocuments();
    const cleanCount = await Embedding.countDocuments({ similarityStatus: 'clean' });
    const warningCount = await Embedding.countDocuments({ similarityStatus: 'warning' });
    const blockedCount = await Embedding.countDocuments({ similarityStatus: 'blocked' });
    const pendingReviewCount = await Embedding.countDocuments({ similarityStatus: 'pending-review' });

    const recentBlocked = await Embedding.find({ similarityStatus: 'blocked' })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('contentHash creatorAddress topMatchScore topMatchContentHash createdAt');

    return {
      total: totalEmbeddings,
      clean: cleanCount,
      warning: warningCount,
      blocked: blockedCount,
      pendingReview: pendingReviewCount,
      recentBlocked,
    };
  } catch (error) {
    logger.error('Failed to get similarity statistics', { error });
    throw error;
  }
}
