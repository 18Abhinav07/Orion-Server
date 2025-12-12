// tests/unit/verification.test.ts
import { ethers } from 'ethers';
import * as VerificationController from '../../src/controllers/verificationController';
import MintToken from '../../src/models/MintToken';
import Counter from '../../src/models/Counter';

// Mock the models
jest.mock('../../src/models/MintToken');
jest.mock('../../src/models/Counter');

const mockRequest = (body: any, params: any = {}) => ({
  body,
  params,
});

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Unit Test: Verification Controller', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the nonce counter
    (Counter.findByIdAndUpdate as jest.Mock).mockResolvedValue({ seq: 1 });
    // Mock the private key
    process.env.BACKEND_VERIFIER_PRIVATE_KEY = '0x0123456789012345678901234567890123456789012345678901234567890123';
  });

  describe('generateMintToken', () => {
    it('should generate a valid signature and save the token', async () => {
      // Mock no duplicate exists
      (MintToken.findOne as jest.Mock).mockResolvedValue(null);
      
      const req = mockRequest({
        creatorAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        contentHash: ethers.hexlify(ethers.randomBytes(32)),
        ipMetadataURI: 'ipfs://somesid1',
        nftMetadataURI: 'ipfs://somesid2',
      });
      const res = mockResponse();

      await VerificationController.generateMintToken(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          signature: expect.stringMatching(/^0x[a-fA-F0-9]{130}$/),
          nonce: 1,
          expiresAt: expect.any(Number),
          expiresIn: 900,
        }),
      }));
      expect(MintToken.prototype.save).toHaveBeenCalledTimes(1);
    });

    it('should return a 400 error if required parameters are missing', async () => {
      const req = mockRequest({});
      const res = mockResponse();
      await VerificationController.generateMintToken(req as any, res as any);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'INVALID_INPUT',
        message: expect.stringContaining('Missing required field')
      }));
    });

    it('should return 409 for duplicate content', async () => {
      // Mock existing minted token
      (MintToken.findOne as jest.Mock).mockResolvedValue({
        status: 'used',
        ipId: '0xabc123',
        tokenId: 42,
        txHash: '0xdef456'
      });

      const req = mockRequest({
        creatorAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        contentHash: '0x' + 'a'.repeat(64),
        ipMetadataURI: 'ipfs://somesid1',
        nftMetadataURI: 'ipfs://somesid2',
      });
      const res = mockResponse();

      await VerificationController.generateMintToken(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'DUPLICATE_CONTENT',
        message: 'This content has already been minted',
        existingMint: expect.objectContaining({
          ipId: '0xabc123',
          tokenId: 42,
          txHash: '0xdef456'
        })
      }));
    });
  });

  describe('getTokenStatus', () => {
    it('should return token status for pending token', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 min in future
      const mockToken = {
        nonce: 42,
        status: 'pending',
        expiresAt: futureDate,
        issuedAt: new Date(),
      };
      
      (MintToken.findOne as jest.Mock).mockResolvedValue(mockToken);

      const req = mockRequest({}, { nonce: '42' });
      const res = mockResponse();

      await VerificationController.getTokenStatus(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          nonce: 42,
          status: 'pending',
          isExpired: false,
          remainingSeconds: expect.any(Number),
        })
      }));
    });

    it('should return 404 for non-existent token', async () => {
      (MintToken.findOne as jest.Mock).mockResolvedValue(null);

      const req = mockRequest({}, { nonce: '999' });
      const res = mockResponse();

      await VerificationController.getTokenStatus(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'TOKEN_NOT_FOUND',
      }));
    });

    it('should include mintDetails for used token', async () => {
      const mockToken = {
        nonce: 42,
        status: 'used',
        expiresAt: new Date(),
        issuedAt: new Date(),
        ipId: '0xabc123',
        tokenId: 123,
        txHash: '0xdef456',
        usedAt: new Date(),
      };
      
      (MintToken.findOne as jest.Mock).mockResolvedValue(mockToken);

      const req = mockRequest({}, { nonce: '42' });
      const res = mockResponse();

      await VerificationController.getTokenStatus(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          status: 'used',
          mintDetails: expect.objectContaining({
            ipId: '0xabc123',
            tokenId: 123,
            txHash: '0xdef456',
          })
        })
      }));
    });
  });

  describe('updateMintToken', () => {
    it('should update pending token to used', async () => {
      const mockToken = {
        nonce: 42,
        status: 'pending',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        save: jest.fn().mockResolvedValue(true),
        usedAt: new Date(),
      };
      
      (MintToken.findOne as jest.Mock).mockResolvedValue(mockToken);

      const req = mockRequest({
        ipId: '0x1234567890abcdef1234567890abcdef12345678',
        tokenId: 123,
        txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
      }, { nonce: '42' });
      const res = mockResponse();

      await VerificationController.updateMintToken(req as any, res as any);

      expect(mockToken.status).toBe('used');
      expect(mockToken.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Token marked as used',
      }));
    });

    it('should return 409 if token already used', async () => {
      const mockToken = {
        nonce: 42,
        status: 'used',
        ipId: '0xold123',
        tokenId: 999,
        txHash: '0xold456',
        usedAt: new Date(),
      };
      
      (MintToken.findOne as jest.Mock).mockResolvedValue(mockToken);

      const req = mockRequest({
        ipId: '0xnew123',
        tokenId: 123,
        txHash: '0xnew456'
      }, { nonce: '42' });
      const res = mockResponse();

      await VerificationController.updateMintToken(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'TOKEN_ALREADY_USED',
      }));
    });

    it('should return 400 if missing required fields', async () => {
      const req = mockRequest({ ipId: '0x123' }, { nonce: '42' });
      const res = mockResponse();

      await VerificationController.updateMintToken(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'INVALID_INPUT',
      }));
    });
  });
});
