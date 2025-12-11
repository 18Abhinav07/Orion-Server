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
    sessionId,
    fingerprintId,
  } = req.body;

  // TODO: Add full validation logic from the spec here
  if (!creatorAddress || !contentHash || !ipMetadataURI || !nftMetadataURI || !sessionId || !fingerprintId) {
    logger.warn(`generateMintToken failed: Missing required parameters. Body: ${JSON.stringify(req.body)}`);
    return formatError(res, 'Missing required parameters.', null, 400);
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
      status: 'valid',
      sessionId,
      fingerprintId,
    });

    await mintToken.save();
    logger.info(`Successfully saved mint token for nonce ${nonce}`);

    const tokenResponse = {
      message,
      signature,
      nonce,
      expiresAt: mintToken.expiresAt,
      validFor: 900,
    };

    // TODO: Add full verification details from session
    const verificationDetails = {
      contentVerified: true,
      similarityScore: 0,
      isOriginal: true,
      fingerprintId,
    }

    return formatSuccess(res, 'Mint token generated successfully.', { mintToken: tokenResponse, verificationDetails });
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
      return formatError(res, 'Nonce is required.', null, 400);
    }

    const token = await MintToken.findOne({ nonce: parseInt(nonce, 10) });
    if (!token) {
      logger.warn(`getTokenStatus failed: Token not found for nonce ${nonce}`);
      return formatError(res, 'Token not found.', null, 404);
    }

    // Optionally check if the token is expired and update its status
    if (token.status === 'valid' && token.expiresAt < new Date()) {
      logger.info(`Token with nonce ${nonce} has expired. Updating status.`);
      token.status = 'expired';
      await token.save();
    }

    const statusResponse = {
      nonce: token.nonce,
      status: token.status,
      issuedAt: token.issuedAt,
      expiresAt: token.expiresAt,
      usedAt: token.usedAt || null,
      creatorAddress: token.creatorAddress,
    };

    logger.info(`Successfully retrieved status for token with nonce ${nonce}: ${token.status}`);
    return formatSuccess(res, 'Token status retrieved successfully.', statusResponse);
  } catch (error: any) {
    logger.error(`Error getting token status for nonce ${req.params.nonce}:`, error.message);
    return formatError(res, 'Failed to get token status.', error.message, 500);
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

    if (token.status !== 'valid') {
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
