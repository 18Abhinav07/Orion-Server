import { Pinecone } from '@pinecone-database/pinecone';
import { aiConfig } from '../config/ai.config';
import logger from '../utils/logger';

let pineconeClient: Pinecone | null = null;

/**
 * Initialize Pinecone client singleton
 */
export async function initializePinecone(): Promise<Pinecone> {
  if (pineconeClient) {
    return pineconeClient;
  }

  try {
    pineconeClient = new Pinecone({
      apiKey: aiConfig.pinecone.apiKey,
    });

    logger.info('Pinecone client initialized successfully', {
      indexName: aiConfig.pinecone.indexName,
      environment: aiConfig.pinecone.environment,
    });

    return pineconeClient;
  } catch (error) {
    logger.error('Failed to initialize Pinecone client', { error });
    throw new Error('Pinecone initialization failed');
  }
}

/**
 * Get or create Pinecone index
 */
export async function getOrCreateIndex() {
  const client = await initializePinecone();
  const indexName = aiConfig.pinecone.indexName;

  try {
    // Check if index exists
    const indexes = await client.listIndexes();
    const indexExists = indexes.indexes?.some((idx) => idx.name === indexName);

    if (!indexExists) {
      logger.info('Creating new Pinecone index', { indexName });

      await client.createIndex({
        name: indexName,
        dimension: aiConfig.embedding.dimension,
        metric: 'cosine', // Cosine similarity for embedding comparisons
        spec: {
          serverless: {
            cloud: 'aws',
            region: aiConfig.pinecone.environment,
          },
        },
      });

      // Wait for index to be ready
      await new Promise((resolve) => setTimeout(resolve, 5000));
      logger.info('Pinecone index created successfully', { indexName });
    }

    return client.index(indexName);
  } catch (error) {
    logger.error('Failed to get or create Pinecone index', { error, indexName });
    throw error;
  }
}

/**
 * Upsert embedding vectors to Pinecone
 */
export async function upsertEmbeddings(
  vectors: Array<{
    id: string;
    values: number[];
    metadata: {
      contentHash: string;
      assetType: string;
      creatorAddress: string;
      storyIpId?: string;
      ipMetadataURI: string;
      nftMetadataURI: string;
      timestamp: number;
    };
  }>,
  namespace: string = aiConfig.pinecone.namespace.registered
): Promise<void> {
  try {
    const index = await getOrCreateIndex();
    const pineconeNamespace = index.namespace(namespace);

    await pineconeNamespace.upsert(vectors);

    logger.info('Successfully upserted embeddings to Pinecone', {
      count: vectors.length,
      namespace,
    });
  } catch (error) {
    logger.error('Failed to upsert embeddings to Pinecone', { error, namespace });
    throw error;
  }
}

/**
 * Query Pinecone for similar embeddings
 */
export async function querySimilarEmbeddings(
  queryVector: number[],
  topK: number = aiConfig.similarity.topKMatches,
  namespace: string = aiConfig.pinecone.namespace.registered,
  filter?: Record<string, any>
): Promise<
  Array<{
    id: string;
    score: number;
    metadata: {
      contentHash: string;
      assetType: string;
      creatorAddress: string;
      storyIpId?: string;
      ipMetadataURI: string;
      nftMetadataURI: string;
      timestamp: number;
    };
  }>
> {
  try {
    const index = await getOrCreateIndex();
    const pineconeNamespace = index.namespace(namespace);

    const queryResponse = await pineconeNamespace.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
      filter,
    });

    logger.info('Successfully queried Pinecone for similar embeddings', {
      topK,
      namespace,
      matchesFound: queryResponse.matches?.length || 0,
    });

    return (queryResponse.matches || []).map((match) => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata as any,
    }));
  } catch (error) {
    logger.error('Failed to query Pinecone for similar embeddings', { error, namespace });
    throw error;
  }
}

/**
 * Delete embedding from Pinecone
 */
export async function deleteEmbedding(
  pineconeId: string,
  namespace: string = aiConfig.pinecone.namespace.registered
): Promise<void> {
  try {
    const index = await getOrCreateIndex();
    const pineconeNamespace = index.namespace(namespace);

    await pineconeNamespace.deleteOne(pineconeId);

    logger.info('Successfully deleted embedding from Pinecone', { pineconeId, namespace });
  } catch (error) {
    logger.error('Failed to delete embedding from Pinecone', { error, pineconeId, namespace });
    throw error;
  }
}

/**
 * Get index statistics
 */
export async function getIndexStats() {
  try {
    const index = await getOrCreateIndex();
    const stats = await index.describeIndexStats();

    logger.info('Retrieved Pinecone index statistics', { stats });
    return stats;
  } catch (error) {
    logger.error('Failed to retrieve Pinecone index statistics', { error });
    throw error;
  }
}
