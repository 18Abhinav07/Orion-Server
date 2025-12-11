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
      const req = mockRequest({
        creatorAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        contentHash: ethers.hexlify(ethers.randomBytes(32)),
        ipMetadataURI: 'ipfs://somesid1',
        nftMetadataURI: 'ipfs://somesid2',
        sessionId: 'sess_123',
        fingerprintId: 'fp_123',
      });
      const res = mockResponse();

      await VerificationController.generateMintToken(req as any, res as any);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          mintToken: expect.objectContaining({
            signature: expect.stringMatching(/^0x[a-fA-F0-9]{130}$/),
            nonce: 1,
          }),
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
            message: 'Missing required parameters.'
        }));
    });
  });

  // TODO: Add tests for getTokenStatus and revokeToken
});
