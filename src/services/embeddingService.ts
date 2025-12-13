import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { aiConfig } from '../config/ai.config';
import logger from '../utils/logger';
import { ethers } from 'ethers';

/**
 * Voyage AI Multimodal Embedding Response
 */
interface VoyageEmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    total_tokens: number;
  };
}

/**
 * Generate multimodal embeddings using Voyage AI
 * Supports text, images (base64), and video frames
 */
export async function generateEmbedding(input: string | string[]): Promise<number[][]> {
  try {
    const response = await axios.post<VoyageEmbeddingResponse>(
      `${aiConfig.voyageAI.apiBaseUrl}/embeddings`,
      {
        model: aiConfig.voyageAI.multimodalModel,
        input: Array.isArray(input) ? input : [input],
        input_type: 'document', // 'query' for search queries, 'document' for content
      },
      {
        headers: {
          Authorization: `Bearer ${aiConfig.voyageAI.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const embeddings = response.data.data.map((item) => item.embedding);

    logger.info('Successfully generated embeddings with Voyage AI', {
      model: aiConfig.voyageAI.multimodalModel,
      inputCount: Array.isArray(input) ? input.length : 1,
      embeddingDimension: embeddings[0]?.length || 0,
      tokensUsed: response.data.usage.total_tokens,
    });

    return embeddings;
  } catch (error: any) {
    logger.error(`Failed to generate embeddings with Voyage AI: ${JSON.stringify({
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    })}`);
    throw new Error(`Embedding generation failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Download file from IPFS gateway to temporary location
 */
async function downloadFromIPFS(ipfsURI: string, tempDir: string): Promise<string> {
  const gatewayUrl = ipfsURI.replace('ipfs://', process.env.PINATA_GATEWAY + '/ipfs/');
  const filename = path.basename(new URL(gatewayUrl).pathname);
  const tempPath = path.join(tempDir, filename);

  logger.info('Downloading file from IPFS', { ipfsURI, gatewayUrl, tempPath });

  const response = await axios.get(gatewayUrl, {
    responseType: 'stream',
  });

  const writer = createWriteStream(tempPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(tempPath));
    writer.on('error', reject);
  });
}

/**
 * Extract frames from video at 1 fps
 */
async function extractVideoFrames(videoPath: string, outputDir: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const framePattern = path.join(outputDir, 'frame-%04d.jpg');
    const extractedFrames: string[] = [];

    ffmpeg(videoPath)
      .outputOptions([
        '-vf fps=1', // Extract 1 frame per second
        '-vframes', aiConfig.embedding.maxVideoFrames.toString(), // Maximum frames
      ])
      .output(framePattern)
      .on('end', async () => {
        try {
          const files = await fs.readdir(outputDir);
          const frameFiles = files
            .filter((file) => file.startsWith('frame-') && file.endsWith('.jpg'))
            .map((file) => path.join(outputDir, file));

          logger.info('Successfully extracted video frames', {
            videoPath,
            framesExtracted: frameFiles.length,
          });

          resolve(frameFiles);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', (error) => {
        logger.error(`Failed to extract video frames: ${JSON.stringify({ error: error.message, videoPath })}`);
        reject(error);
      })
      .run();
  });
}

/**
 * Convert image to base64
 */
async function imageToBase64(imagePath: string): Promise<string> {
  const imageBuffer = await fs.readFile(imagePath);
  return imageBuffer.toString('base64');
}

/**
 * Generate embedding for image using Voyage AI multimodal model
 */
async function generateImageEmbedding(imagePath: string): Promise<number[]> {
  const base64Image = await imageToBase64(imagePath);
  
  // Voyage AI accepts base64 images with data URI format
  const dataUri = `data:image/jpeg;base64,${base64Image}`;
  const [embedding] = await generateEmbedding(dataUri);
  
  return embedding;
}

/**
 * Generate embedding for video by extracting frames and averaging their embeddings
 */
async function generateVideoEmbedding(videoPath: string): Promise<{ embedding: number[]; framesExtracted: number }> {
  const tempDir = path.join('/tmp', `orion-video-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    const framesPaths = await extractVideoFrames(videoPath, tempDir);

    if (framesPaths.length === 0) {
      throw new Error('No frames could be extracted from video');
    }

    // Generate embeddings for all frames
    const frameEmbeddings = await Promise.all(framesPaths.map((framePath) => generateImageEmbedding(framePath)));

    // Average all frame embeddings to get single video embedding
    const dimension = frameEmbeddings[0].length;
    const averagedEmbedding = new Array(dimension).fill(0);

    for (const frameEmb of frameEmbeddings) {
      for (let i = 0; i < dimension; i++) {
        averagedEmbedding[i] += frameEmb[i];
      }
    }

    for (let i = 0; i < dimension; i++) {
      averagedEmbedding[i] /= frameEmbeddings.length;
    }

    logger.info('Successfully generated video embedding', {
      videoPath,
      framesExtracted: framesPaths.length,
      embeddingDimension: dimension,
    });

    return {
      embedding: averagedEmbedding,
      framesExtracted: framesPaths.length,
    };
  } finally {
    // Cleanup temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * Generate embedding for content based on asset type
 */
export async function generateContentEmbedding(
  contentURI: string,
  assetType: 'video' | 'image' | 'audio' | 'text'
): Promise<{ embedding: number[]; framesExtracted?: number }> {
  const tempDir = path.join('/tmp', `orion-embedding-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });

  try {
    if (assetType === 'text') {
      // For text, download from IPFS and read content
      logger.info(`Generating text embedding for: ${contentURI}`);
      const filePath = await downloadFromIPFS(contentURI, tempDir);
      const textContent = await fs.readFile(filePath, 'utf-8');
      logger.info(`Text content downloaded, length: ${textContent.length} characters`);
      logger.info(`📝 EMBEDDING TEXT PREVIEW (first 200 chars): ${textContent.substring(0, 200)}`);
      const [embedding] = await generateEmbedding(textContent);
      return { embedding };
    }

    // Download file from IPFS
    const filePath = await downloadFromIPFS(contentURI, tempDir);

    if (assetType === 'video') {
      const result = await generateVideoEmbedding(filePath);
      return result;
    }

    if (assetType === 'image') {
      const embedding = await generateImageEmbedding(filePath);
      return { embedding };
    }

    // For audio, treat as text for now (future: use audio embedding models)
    const [embedding] = await generateEmbedding(contentURI);
    return { embedding };
  } finally {
    // Cleanup temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * Generate content hash from IP metadata URI
 */
export function generateContentHash(ipMetadataURI: string, nftMetadataURI: string): string {
  const hash = ethers.solidityPackedKeccak256(
    ['string', 'string'],
    [ipMetadataURI, nftMetadataURI]
  );
  return hash;
}

/**
 * Generate unique Pinecone ID
 */
export function generatePineconeId(contentHash: string): string {
  return `emb_${contentHash.substring(2, 42)}`; // Use first 40 chars of hash (without 0x prefix)
}
