import axios from 'axios';
import { aiConfig } from '../config/ai.config';
import logger from '../utils/logger';

/**
 * Together AI Chat Completion Response
 */
interface TogetherChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * LLM Analysis Result
 */
export interface LLMAnalysisResult {
  summary: string;
  similarity_reasoning: string;
  is_derivative: boolean;
  confidence_score: number; // 0-100
  recommendation: 'approve' | 'warn' | 'block';
  detailed_comparison: string;
}

/**
 * Analyze similarity between two pieces of content using Together AI LLM
 * This provides semantic understanding beyond just embedding similarity
 */
export async function analyzeSimilarityWithLLM(
  queryContent: {
    assetType: string;
    ipMetadataURI: string;
    nftMetadataURI: string;
    creatorAddress: string;
  },
  matchedContent: {
    assetType: string;
    ipMetadataURI: string;
    nftMetadataURI: string;
    creatorAddress: string;
    storyIpId?: string;
  },
  similarityScore: number
): Promise<LLMAnalysisResult> {
  try {
    const prompt = `You are an AI copyright expert analyzing potential IP infringement.

**Query Content (New Upload):**
- Asset Type: ${queryContent.assetType}
- Creator: ${queryContent.creatorAddress}
- IP Metadata: ${queryContent.ipMetadataURI}
- NFT Metadata: ${queryContent.nftMetadataURI}

**Matched Content (Existing Registered IP):**
- Asset Type: ${matchedContent.assetType}
- Creator: ${matchedContent.creatorAddress}
- Story IP ID: ${matchedContent.storyIpId || 'N/A'}
- IP Metadata: ${matchedContent.ipMetadataURI}
- NFT Metadata: ${matchedContent.nftMetadataURI}

**Embedding Similarity Score:** ${similarityScore}% (cosine similarity)

**Your Task:**
Analyze whether the new content is:
1. An exact copy/plagiarism (recommend BLOCK)
2. A derivative work with transformative elements (recommend WARN - suggest licensing)
3. Coincidentally similar but original (recommend APPROVE)

Consider:
- Are the creators the same person?
- Is this a legitimate derivative/remix?
- Are there transformative creative elements?
- Is proper attribution likely?

Respond ONLY with valid JSON in this exact format:
{
  "summary": "Brief 2-sentence summary of your analysis",
  "similarity_reasoning": "Explain why the similarity score is what it is",
  "is_derivative": true/false,
  "confidence_score": 85,
  "recommendation": "approve/warn/block",
  "detailed_comparison": "Detailed comparison of the two works"
}`;

    const response = await axios.post<TogetherChatResponse>(
      `${aiConfig.togetherAI.apiBaseUrl}/chat/completions`,
      {
        model: aiConfig.togetherAI.chatModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert AI copyright analyst. Always respond with valid JSON only, no markdown formatting.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Low temperature for more consistent analysis
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${aiConfig.togetherAI.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const analysisText = response.data.choices[0].message.content;
    const analysis: LLMAnalysisResult = JSON.parse(analysisText);

    logger.info('Successfully generated LLM similarity analysis', {
      model: aiConfig.togetherAI.chatModel,
      similarityScore,
      recommendation: analysis.recommendation,
      confidenceScore: analysis.confidence_score,
      tokensUsed: response.data.usage.total_tokens,
    });

    return analysis;
  } catch (error: any) {
    logger.error('Failed to generate LLM analysis', {
      error: error.response?.data || error.message,
    });
    
    // Return fallback analysis if LLM fails
    return {
      summary: 'LLM analysis unavailable - using similarity score only',
      similarity_reasoning: `Embedding similarity detected at ${similarityScore}%`,
      is_derivative: similarityScore > 40 && similarityScore < 75,
      confidence_score: 50,
      recommendation: similarityScore > 75 ? 'block' : similarityScore > 40 ? 'warn' : 'approve',
      detailed_comparison: 'Detailed LLM analysis could not be performed. Decision based on embedding similarity threshold.',
    };
  }
}

/**
 * Analyze image/video content using Together AI Vision model
 * Extracts semantic understanding from visual content
 */
export async function analyzeVisualContent(
  base64Image: string,
  assetType: 'image' | 'video'
): Promise<string> {
  try {
    const prompt = assetType === 'video' 
      ? 'Describe this video frame in detail. Focus on: main subjects, artistic style, composition, notable elements, and any text or logos visible.'
      : 'Describe this image in detail. Focus on: main subjects, artistic style, composition, notable elements, and any text or logos visible.';

    const response = await axios.post<TogetherChatResponse>(
      `${aiConfig.togetherAI.apiBaseUrl}/chat/completions`,
      {
        model: aiConfig.togetherAI.visionModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${aiConfig.togetherAI.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const description = response.data.choices[0].message.content;

    logger.info('Successfully generated visual content analysis', {
      model: aiConfig.togetherAI.visionModel,
      assetType,
      tokensUsed: response.data.usage.total_tokens,
    });

    return description;
  } catch (error: any) {
    logger.error('Failed to analyze visual content', {
      error: error.response?.data || error.message,
    });
    return 'Visual analysis unavailable';
  }
}
