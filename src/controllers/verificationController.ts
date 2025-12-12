import { Request, Response } from 'express';
import { ethers } from 'ethers';
import MintToken from '../models/MintToken';
import Counter from '../models/Counter';
import { formatSuccess, formatError } from '../utils/responseFormatter';
import logger from '../utils/logger';
import { checkContentSimilarity, registerContentEmbedding } from '../services/similarityService';

async function getNextNonce(): Promise<number> {
  logger.info('Attempting to get next nonce...');
  const counter = await Counter.findByIdAndUpdate(
    { _id: 'mint_token_nonce' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  logger.info(`Next nonce is ${counter.seq}`);
  return counter.seq;
}

export const generateMintToken = async (req: Request, res: Response) => {
  logger.info(`generateMintToken request body: ${JSON.stringify(req.body)}`);
  const {
    creatorAddress,
    contentHash,
    ipMetadataURI,
    nftMetadataURI,
    assetType, // 'video' | 'image' | 'audio' | 'text'
  } = req.body;

  // Validate required fields
  if (!creatorAddress || !contentHash || !ipMetadataURI || !nftMetadataURI || !assetType) {
    logger.warn(`generateMintToken failed: Missing required parameters. Body: ${JSON.stringify(req.body)}`);
    return res.status(400).json({
      success: false,
      error: 'INVALID_INPUT',
      message: 'Missing required field: ' + (!creatorAddress ? 'creatorAddress' : !contentHash ? 'contentHash' : !ipMetadataURI ? 'ipMetadataURI' : !nftMetadataURI ? 'nftMetadataURI' : 'assetType')
    });
  }

  // Validate assetType
  if (!['video', 'image', 'audio', 'text'].includes(assetType)) {
    logger.warn(`generateMintToken failed: Invalid assetType ${assetType}`);
    return res.status(400).json({
      success: false,
      error: 'INVALID_INPUT',
      message: 'Invalid assetType. Must be one of: video, image, audio, text'
    });
  }

  // Check for duplicate content (already minted)
  const existingMint = await MintToken.findOne({ 
    contentHash, 
    status: 'used' 
  });
  
  if (existingMint && existingMint.ipId) {
    logger.warn(`Duplicate content detected for hash ${contentHash}`);
    return res.status(409).json({
      success: false,
      error: 'DUPLICATE_CONTENT',
      message: 'This content has already been minted',
      existingMint: {
        ipId: existingMint.ipId,
        tokenId: existingMint.tokenId,
        txHash: existingMint.txHash
      }
    });
  }

  try {
    // ============ RAG SIMILARITY CHECK ============
    logger.info('Starting RAG similarity check for content', {
      creatorAddress,
      contentHash,
      assetType,
    });

    const similarityResult = await checkContentSimilarity(
      ipMetadataURI,
      nftMetadataURI,
      assetType,
      creatorAddress
    );

    logger.info('Similarity check completed', {
      status: similarityResult.status,
      similarityScore: similarityResult.similarityScore,
      topMatchContentHash: similarityResult.topMatch?.contentHash,
    });

    // If content is BLOCKED, reject immediately
    if (similarityResult.status === 'BLOCKED') {
      logger.warn('Content blocked due to high similarity', {
        contentHash,
        similarityScore: similarityResult.similarityScore,
        topMatch: similarityResult.topMatch,
      });

      return res.status(403).json({
        success: false,
        error: 'SIMILARITY_BLOCKED',
        message: similarityResult.message,
        similarity: {
          score: similarityResult.similarityScore,
          topMatch: similarityResult.topMatch,
          matches: similarityResult.matches,
        }
      });
    }

    // If WARNING, include similarity info in successful response
    const similarityWarning = similarityResult.status === 'WARNING' ? {
      warning: true,
      message: similarityResult.message,
      score: similarityResult.similarityScore,
      topMatch: similarityResult.topMatch,
      matches: similarityResult.matches,
    } : undefined;

    if (similarityWarning) {
      logger.info('Content has similarity warning', {
        contentHash,
        similarityScore: similarityResult.similarityScore,
      });
    }

    // ============ CONTINUE WITH SIGNATURE GENERATION ============
    const nonce = await getNextNonce();
    const expiryTimestamp = Math.floor(Date.now() / 1000) + 900; // 15 minutes
    logger.info(`Generating token with nonce ${nonce} and expiry ${expiryTimestamp}`);

    // Hash the URIs first to match the contract's _hashMessage function
    const ipMetadataHash = ethers.keccak256(ethers.toUtf8Bytes(ipMetadataURI));
    const nftMetadataHash = ethers.keccak256(ethers.toUtf8Bytes(nftMetadataURI));
    
    logger.info(`Hashed ipMetadataURI: ${ipMetadataHash}, nftMetadataURI: ${nftMetadataHash}`);
    logger.info(`Message hash inputs: creatorAddress=${creatorAddress}, contentHash=${contentHash}, ipMetadataHash=${ipMetadataHash}, nftMetadataHash=${nftMetadataHash}, nonce=${nonce}, expiryTimestamp=${expiryTimestamp}`);

    const message = ethers.solidityPackedKeccak256(
      ['address', 'bytes32', 'bytes32', 'bytes32', 'uint256', 'uint256'],
      [creatorAddress, contentHash, ipMetadataHash, nftMetadataHash, nonce, expiryTimestamp]
    );

    const privateKey = process.env.BACKEND_VERIFIER_PRIVATE_KEY;
    if (!privateKey) {
      logger.error('BACKEND_VERIFIER_PRIVATE_KEY is not set.');
      return formatError(res, 'Server configuration error.', 'Verifier key not set.', 500);
    }
    const wallet = new ethers.Wallet(privateKey);
    const signerAddress = wallet.address;
    logger.info(`Signing with wallet address: ${signerAddress}`);
    
    const signature = await wallet.signMessage(ethers.getBytes(message));
    logger.info(`Generated signature ${signature} for message ${message}`);

    const mintToken = new MintToken({
      nonce,
      creatorAddress,
      contentHash,
      ipMetadataURI,
      nftMetadataURI,
      message,
      signature,
      issuedAt: new Date(),
      expiresAt: new Date(expiryTimestamp * 1000),
      status: 'pending',
      sessionId: req.body.sessionId || 'direct-api',
      fingerprintId: req.body.fingerprintId || 'not-tracked',
    });

    await mintToken.save();
    logger.info(`Successfully saved mint token for nonce ${nonce}`);

    const responseData: any = {
      signature,
      nonce,
      expiresAt: expiryTimestamp,
      expiresIn: 900
    };

    // Add similarity warning if present
    if (similarityWarning) {
      responseData.similarity = similarityWarning;
    }

    return res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error: any) {
    logger.error(`Error generating mint token: ${error.message}`);
    return formatError(res, 'Failed to generate mint token.', error.message, 500);
  }
};

export const getTokenStatus = async (req: Request, res: Response) => {
  logger.info(`getTokenStatus request params: ${JSON.stringify(req.params)}`);
  try {
    const { nonce } = req.params;
    if (!nonce) {
      logger.warn('getTokenStatus failed: Nonce is required.');
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Nonce is required'
      });
    }

    const token = await MintToken.findOne({ nonce: parseInt(nonce, 10) });
    if (!token) {
      logger.warn(`getTokenStatus failed: Token not found for nonce ${nonce}`);
      return res.status(404).json({
        success: false,
        error: 'TOKEN_NOT_FOUND',
        message: `No token found with nonce: ${nonce}`
      });
    }

    // Check if the token is expired and update its status
    const isExpired = token.status === 'pending' && token.expiresAt < new Date();
    if (isExpired) {
      logger.info(`Token with nonce ${nonce} has expired. Updating status.`);
      token.status = 'expired';
      await token.save();
    }

    const now = new Date();
    const remainingMs = token.expiresAt.getTime() - now.getTime();
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    const statusResponse: any = {
      nonce: token.nonce,
      status: token.status,
      isExpired: token.status === 'expired' || isExpired,
      expiresAt: Math.floor(token.expiresAt.getTime() / 1000),
      createdAt: Math.floor(token.issuedAt.getTime() / 1000)
    };

    if (token.status === 'pending') {
      statusResponse.remainingSeconds = remainingSeconds;
    }

    if (token.status === 'used' && token.ipId) {
      statusResponse.mintDetails = {
        ipId: token.ipId,
        tokenId: token.tokenId,
        txHash: token.txHash,
        usedAt: Math.floor((token.usedAt?.getTime() || 0) / 1000)
      };
    }

    logger.info(`Successfully retrieved status for token with nonce ${nonce}: ${token.status}`);
    return res.status(200).json({
      success: true,
      data: statusResponse
    });
  } catch (error: any) {
    logger.error(`Error getting token status for nonce ${req.params.nonce}:`, error.message);
    return formatError(res, 'Failed to get token status.', error.message, 500);
  }
};

export const updateMintToken = async (req: Request, res: Response) => {
  logger.info(`updateMintToken request for nonce ${req.params.nonce}, body: ${JSON.stringify(req.body)}`);
  try {
    const { nonce } = req.params;
    const { ipId, tokenId, txHash } = req.body;

    if (!nonce) {
      logger.warn('updateMintToken failed: Nonce is required.');
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Nonce is required'
      });
    }

    if (!ipId || !tokenId || !txHash) {
      logger.warn('updateMintToken failed: Missing required fields.');
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Missing required fields: ipId, tokenId, and txHash are required'
      });
    }

    const token = await MintToken.findOne({ nonce: parseInt(nonce, 10) });
    if (!token) {
      logger.warn(`updateMintToken failed: Token not found for nonce ${nonce}`);
      return res.status(404).json({
        success: false,
        error: 'TOKEN_NOT_FOUND',
        message: `No token found with nonce: ${nonce}`
      });
    }

    if (token.status === 'used') {
      logger.warn(`Attempted to update token with nonce ${nonce}, but it was already used.`);
      return res.status(409).json({
        success: false,
        error: 'TOKEN_ALREADY_USED',
        message: 'This token has already been used',
        existingMint: {
          ipId: token.ipId,
          tokenId: token.tokenId,
          txHash: token.txHash,
          usedAt: Math.floor((token.usedAt?.getTime() || 0) / 1000)
        }
      });
    }

    token.status = 'used';
    token.ipId = ipId;
    token.tokenId = tokenId;
    token.txHash = txHash;
    token.usedAt = new Date();
    await token.save();
    logger.info(`Successfully marked token ${nonce} as used with ipId ${ipId}`);

    // ============ REGISTER EMBEDDING IN PINECONE ============
    // After successful minting, move embedding from pending to registered namespace
    try {
      await registerContentEmbedding(token.contentHash, ipId);
      logger.info('Successfully registered content embedding in Pinecone', {
        contentHash: token.contentHash,
        ipId,
      });
    } catch (embeddingError: any) {
      // Log error but don't fail the update (minting already succeeded)
      logger.error('Failed to register embedding in Pinecone (non-critical)', {
        error: embeddingError.message,
        contentHash: token.contentHash,
        ipId,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Token marked as used',
      data: {
        nonce: token.nonce,
        status: token.status,
        usedAt: Math.floor(token.usedAt.getTime() / 1000)
      }
    });
  } catch (error: any) {
    logger.error(`Error updating mint token for nonce ${req.params.nonce}:`, error.message);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to update token'
    });
  }
};

export const revokeToken = async (req: Request, res: Response) => {
  logger.info(`revokeToken request body: ${JSON.stringify(req.body)}`);
  try {
    const { nonce, reason } = req.body;
    if (!nonce) {
      logger.warn('revokeToken failed: Nonce is required.');
      return formatError(res, 'Nonce is required to revoke a token.', null, 400);
    }

    const token = await MintToken.findOne({ nonce });
    if (!token) {
      logger.warn(`revokeToken failed: Token not found for nonce ${nonce}`);
      return formatError(res, 'Token not found.', null, 404);
    }

    if (token.status !== 'pending') {
      logger.warn(`Attempted to revoke token with nonce ${nonce}, but status was '${token.status}'.`);
      return formatError(res, `Cannot revoke token because its status is '${token.status}'.`, null, 409);
    }

    token.status = 'revoked';
    token.revokedAt = new Date();
    token.revokedReason = reason || 'No reason provided.';
    await token.save();
    logger.info(`Successfully revoked token with nonce ${nonce}`);

    const revocationResponse = {
      nonce: token.nonce,
      revokedAt: token.revokedAt,
      reason: token.revokedReason,
    };

    return formatSuccess(res, 'Token revoked successfully.', revocationResponse);
  } catch (error: any) {
    logger.error(`Error revoking token for nonce ${req.body.nonce}:`, error.message);
    return formatError(res, 'Failed to revoke token.', error.message, 500);
  }
};
