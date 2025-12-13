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
    // IP Metadata fields (optional)
    name,
    description,
    image,
    external_url,
    attributes,
    tags
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
    const skipSimilarityCheck = process.env.SKIP_SIMILARITY_CHECK === 'true';

    let similarityResult;
    if (skipSimilarityCheck) {
      logger.info(`⚠️  SKIPPING similarity check (SKIP_SIMILARITY_CHECK=true) for ${JSON.stringify({
        creatorAddress,
        contentHash,
        assetType,
      })}`);
      // Return a clean result for testing
      similarityResult = {
        status: 'CLEAN' as const,
        message: 'Similarity check skipped for testing',
        similarityScore: 0,
        topMatch: null,
        matches: [],
      };
    } else {
      logger.info(`Starting RAG similarity check for content: ${JSON.stringify({
        creatorAddress,
        contentHash,
        assetType,
      })}`);

      similarityResult = await checkContentSimilarity(
        ipMetadataURI,
        nftMetadataURI,
        assetType,
        creatorAddress,
        contentHash
      );

      logger.info(`Similarity check completed: ${JSON.stringify({
        status: similarityResult.status,
        similarityScore: similarityResult.similarityScore,
        topMatchContentHash: similarityResult.topMatch?.contentHash,
      })}`);
    }

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
      // IP Metadata fields
      ...(name && { name }),
      ...(description && { description }),
      ...(image && { image }),
      ...(external_url && { external_url }),
      ...(attributes && { attributes }),
      ...(tags && { tags }),
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
    logger.error(`Error generating mint token: ${JSON.stringify({
      message: error.message,
      stack: error.stack
    })}`);
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

export const finalizeMintToken = async (req: Request, res: Response) => {
  logger.info(`finalizeMintToken request for nonce ${req.params.nonce}, body: ${JSON.stringify(req.body)}`);
  try {
    const { nonce } = req.params;
    const { 
      licenseTermsId, 
      licenseType, 
      royaltyPercent, 
      allowDerivatives, 
      commercialUse, 
      licenseTxHash,
      // Optional IP Metadata updates
      name,
      description,
      image,
      external_url,
      attributes,
      tags
    } = req.body;

    // Validate nonce
    if (!nonce) {
      logger.warn('finalizeMintToken failed: Nonce is required.');
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Nonce is required'
      });
    }

    // Validate required license fields
    if (!licenseTermsId || !licenseType || royaltyPercent === undefined || 
        allowDerivatives === undefined || commercialUse === undefined || !licenseTxHash) {
      logger.warn('finalizeMintToken failed: Missing required license fields.');
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'Missing required fields: licenseTermsId, licenseType, royaltyPercent, allowDerivatives, commercialUse, and licenseTxHash are required'
      });
    }

    // Validate license type
    const validLicenseTypes = ['commercial_remix', 'non_commercial'];
    if (!validLicenseTypes.includes(licenseType)) {
      logger.warn(`finalizeMintToken failed: Invalid licenseType ${licenseType}`);
      return res.status(422).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: `Invalid licenseType. Must be one of: ${validLicenseTypes.join(', ')}`
      });
    }

    // Validate royalty percentage
    if (typeof royaltyPercent !== 'number' || royaltyPercent < 0 || royaltyPercent > 100) {
      logger.warn(`finalizeMintToken failed: Invalid royaltyPercent ${royaltyPercent}`);
      return res.status(422).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'royaltyPercent must be a number between 0 and 100'
      });
    }

    // Find the token
    const token = await MintToken.findOne({ nonce: parseInt(nonce, 10) });
    if (!token) {
      logger.warn(`finalizeMintToken failed: Token not found for nonce ${nonce}`);
      return res.status(404).json({
        success: false,
        error: 'TOKEN_NOT_FOUND',
        message: `No token found with nonce: ${nonce}`
      });
    }

    // Verify token is in 'used' status (IP already registered)
    if (token.status !== 'used') {
      logger.warn(`finalizeMintToken failed: Token with nonce ${nonce} has status '${token.status}', must be 'used'`);
      return res.status(409).json({
        success: false,
        error: 'INVALID_STATUS',
        message: `Token must be in 'used' status. Current status: ${token.status}`
      });
    }

    // Check if already finalized (if license terms already attached)
    if (token.licenseTermsId) {
      logger.warn(`Token with nonce ${nonce} is already finalized.`);
      return res.status(409).json({
        success: false,
        error: 'ALREADY_FINALIZED',
        message: 'Token has already been finalized with license terms',
        existingLicense: {
          licenseTermsId: token.licenseTermsId,
          licenseType: token.licenseType,
          royaltyPercent: token.royaltyPercent,
          licenseTxHash: token.licenseTxHash,
          licenseAttachedAt: token.licenseAttachedAt
        }
      });
    }

    // Update token with license metadata
    token.licenseTermsId = licenseTermsId;
    token.licenseType = licenseType;
    token.royaltyPercent = royaltyPercent;
    token.allowDerivatives = allowDerivatives;
    token.commercialUse = commercialUse;
    token.licenseTxHash = licenseTxHash;
    token.licenseAttachedAt = new Date();
    token.status = 'registered';
    
    // Update IP metadata if provided
    if (name) token.name = name;
    if (description) token.description = description;
    if (image) token.image = image;
    if (external_url) token.external_url = external_url;
    if (attributes) token.attributes = attributes;
    if (tags) token.tags = tags;
    
    await token.save();

    logger.info(`Successfully finalized token ${nonce} with license terms ${licenseTermsId}`);

    return res.status(200).json({
      success: true,
      message: 'Token finalized with license terms',
      data: {
        nonce: token.nonce,
        status: token.status,
        ipId: token.ipId,
        license: {
          licenseTermsId: token.licenseTermsId,
          licenseType: token.licenseType,
          royaltyPercent: token.royaltyPercent,
          allowDerivatives: token.allowDerivatives,
          commercialUse: token.commercialUse,
          licenseTxHash: token.licenseTxHash,
          licenseAttachedAt: Math.floor(token.licenseAttachedAt!.getTime() / 1000)
        }
      }
    });
  } catch (error: any) {
    logger.error(`Error finalizing mint token for nonce ${req.params.nonce}:`, error.message);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to finalize token'
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
