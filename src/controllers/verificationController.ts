import { Request, Response } from 'express';
import { ethers } from 'ethers';
import MintToken from '../models/MintToken';
import Counter from '../models/Counter';
import { formatSuccess, formatError } from '../utils/responseFormatter';
import logger from '../utils/logger';

async function getNextNonce(): Promise<number> {
  logger.debug('Attempting to get next nonce...');
  const counter = await Counter.findByIdAndUpdate(
    { _id: 'mint_token_nonce' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  logger.info(`Next nonce is ${counter.seq}`);
  return counter.seq;
}

export const generateMintToken = async (req: Request, res: Response) => {
  logger.debug(`generateMintToken request body: ${JSON.stringify(req.body)}`);
  const {
    creatorAddress,
    contentHash,
    ipMetadataURI,
    nftMetadataURI,
  } = req.body;

  // Validate required fields
  if (!creatorAddress || !contentHash || !ipMetadataURI || !nftMetadataURI) {
    logger.warn(`generateMintToken failed: Missing required parameters. Body: ${JSON.stringify(req.body)}`);
    return res.status(400).json({
      success: false,
      error: 'INVALID_INPUT',
      message: 'Missing required field: ' + (!creatorAddress ? 'creatorAddress' : !contentHash ? 'contentHash' : !ipMetadataURI ? 'ipMetadataURI' : 'nftMetadataURI')
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
    const nonce = await getNextNonce();
    const expiryTimestamp = Math.floor(Date.now() / 1000) + 900; // 15 minutes
    logger.debug(`Generating token with nonce ${nonce} and expiry ${expiryTimestamp}`);

    const message = ethers.solidityPackedKeccak256(
      ['address', 'bytes32', 'string', 'string', 'uint256', 'uint256'],
      [creatorAddress, contentHash, ipMetadataURI, nftMetadataURI, nonce, expiryTimestamp]
    );

    const privateKey = process.env.BACKEND_VERIFIER_PRIVATE_KEY;
    if (!privateKey) {
      logger.error('BACKEND_VERIFIER_PRIVATE_KEY is not set.');
      return formatError(res, 'Server configuration error.', 'Verifier key not set.', 500);
    }
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signMessage(ethers.getBytes(message));
    logger.debug(`Generated signature ${signature} for message ${message}`);

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

    return res.status(200).json({
      success: true,
      data: {
        signature,
        nonce,
        expiresAt: expiryTimestamp,
        expiresIn: 900
      }
    });
  } catch (error: any) {
    logger.error(`Error generating mint token: ${error.message}`);
    return formatError(res, 'Failed to generate mint token.', error.message, 500);
  }
};

export const getTokenStatus = async (req: Request, res: Response) => {
  logger.debug(`getTokenStatus request params: ${JSON.stringify(req.params)}`);
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
  logger.debug(`updateMintToken request for nonce ${req.params.nonce}`);
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
  logger.debug(`revokeToken request body: ${JSON.stringify(req.body)}`);
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
