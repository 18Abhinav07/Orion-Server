// tests/integration/finalizeMintToken.test.ts
import request from 'supertest';
import app from '../../src/app';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import MintToken from '../../src/models/MintToken';

let mongoServer: MongoMemoryServer;
let validJWT: string;

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.BACKEND_VERIFIER_PRIVATE_KEY = '0x0123456789012345678901234567890123456789012345678901234567890123';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Generate a valid JWT token for protected endpoints
  validJWT = jwt.sign(
    { userId: 'test-user-123', address: '0xTestAddress' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clean up database after each test
  await MintToken.deleteMany({});
});

describe('Finalize Mint Token API - Integration Tests', () => {
  
  describe('PATCH /api/verification/token/:nonce/finalize', () => {
    let usedToken: any;

    beforeEach(async () => {
      // Create a token in 'used' status (IP already registered)
      usedToken = await MintToken.create({
        nonce: 123,
        creatorAddress: '0xCreator',
        contentHash: '0x' + 'a'.repeat(64),
        ipMetadataURI: 'ipfs://metadata',
        nftMetadataURI: 'ipfs://nft',
        message: '0x' + 'c'.repeat(64),
        signature: '0x' + 'd'.repeat(130),
        ipId: '0xIPAddress',
        tokenId: '456',
        txHash: '0x' + 'b'.repeat(64),
        status: 'used',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 900000),
        usedAt: new Date()
      });
    });

    it('should finalize token with license terms successfully', async () => {
      const requestBody = {
        licenseTermsId: '10',
        licenseType: 'commercial_remix',
        royaltyPercent: 10,
        allowDerivatives: true,
        commercialUse: true,
        licenseTxHash: '0x' + 'c'.repeat(64)
      };

      const res = await request(app)
        .patch('/api/verification/token/123/finalize')
        .set('Authorization', `Bearer ${validJWT}`)
        .send(requestBody);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        nonce: 123,
        status: 'registered',
        ipId: '0xIPAddress',
        license: {
          licenseTermsId: '10',
          licenseType: 'commercial_remix',
          royaltyPercent: 10,
          allowDerivatives: true,
          commercialUse: true,
          licenseTxHash: requestBody.licenseTxHash
        }
      });

      // Verify database was updated
      const updated = await MintToken.findOne({ nonce: 123 });
      expect(updated?.status).toBe('registered');
      expect(updated?.licenseTermsId).toBe('10');
      expect(updated?.licenseAttachedAt).toBeTruthy();
    });

    it('should return 401 when JWT is missing', async () => {
      const requestBody = {
        licenseTermsId: '10',
        licenseType: 'commercial_remix',
        royaltyPercent: 10,
        allowDerivatives: true,
        commercialUse: true,
        licenseTxHash: '0x' + 'c'.repeat(64)
      };

      const res = await request(app)
        .patch('/api/verification/token/123/finalize')
        .send(requestBody);

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 when JWT is invalid', async () => {
      const requestBody = {
        licenseTermsId: '10',
        licenseType: 'commercial_remix',
        royaltyPercent: 10,
        allowDerivatives: true,
        commercialUse: true,
        licenseTxHash: '0x' + 'c'.repeat(64)
      };

      const res = await request(app)
        .patch('/api/verification/token/123/finalize')
        .set('Authorization', 'Bearer invalid-jwt')
        .send(requestBody);

      expect(res.statusCode).toBe(401);
    });

    it('should return 400 when required fields are missing', async () => {
      const requestBody = {
        licenseTermsId: '10',
        // Missing other required fields
      };

      const res = await request(app)
        .patch('/api/verification/token/123/finalize')
        .set('Authorization', `Bearer ${validJWT}`)
        .send(requestBody);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('INVALID_INPUT');
    });

    it('should return 404 when token not found', async () => {
      const requestBody = {
        licenseTermsId: '10',
        licenseType: 'commercial_remix',
        royaltyPercent: 10,
        allowDerivatives: true,
        commercialUse: true,
        licenseTxHash: '0x' + 'c'.repeat(64)
      };

      const res = await request(app)
        .patch('/api/verification/token/999/finalize')
        .set('Authorization', `Bearer ${validJWT}`)
        .send(requestBody);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('TOKEN_NOT_FOUND');
    });

    it('should return 409 when token status is not "used"', async () => {
      // Create a pending token
      await MintToken.create({
        nonce: 456,
        creatorAddress: '0xCreator',
        contentHash: '0x' + 'a'.repeat(64),
        ipMetadataURI: 'ipfs://metadata',
        nftMetadataURI: 'ipfs://nft',
        message: '0x' + 'c'.repeat(64),
        signature: '0x' + 'd'.repeat(130),
        status: 'pending',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 900000)
      });

      const requestBody = {
        licenseTermsId: '10',
        licenseType: 'commercial_remix',
        royaltyPercent: 10,
        allowDerivatives: true,
        commercialUse: true,
        licenseTxHash: '0x' + 'c'.repeat(64)
      };

      const res = await request(app)
        .patch('/api/verification/token/456/finalize')
        .set('Authorization', `Bearer ${validJWT}`)
        .send(requestBody);

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('INVALID_STATUS');
    });

    it('should return 409 when token already finalized', async () => {
      // Create already finalized token
      await MintToken.create({
        nonce: 789,
        creatorAddress: '0xCreator',
        contentHash: '0x' + 'a'.repeat(64),
        ipMetadataURI: 'ipfs://metadata',
        nftMetadataURI: 'ipfs://nft',
        message: '0x' + 'c'.repeat(64),
        signature: '0x' + 'e'.repeat(130),
        ipId: '0xIPAddress',
        tokenId: '456',
        txHash: '0x' + 'b'.repeat(64),
        status: 'used',
        licenseTermsId: '20',
        licenseType: 'commercial_remix',
        royaltyPercent: 20,
        licenseTxHash: '0x' + 'd'.repeat(64),
        licenseAttachedAt: new Date(),
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 900000),
        usedAt: new Date()
      });

      const requestBody = {
        licenseTermsId: '10',
        licenseType: 'commercial_remix',
        royaltyPercent: 10,
        allowDerivatives: true,
        commercialUse: true,
        licenseTxHash: '0x' + 'c'.repeat(64)
      };

      const res = await request(app)
        .patch('/api/verification/token/789/finalize')
        .set('Authorization', `Bearer ${validJWT}`)
        .send(requestBody);

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('ALREADY_FINALIZED');
      expect(res.body.existingLicense).toMatchObject({
        licenseTermsId: '20',
        licenseType: 'commercial_remix',
        royaltyPercent: 20
      });
    });

    it('should return 422 for invalid license type', async () => {
      const requestBody = {
        licenseTermsId: '10',
        licenseType: 'invalid_type',
        royaltyPercent: 10,
        allowDerivatives: true,
        commercialUse: true,
        licenseTxHash: '0x' + 'c'.repeat(64)
      };

      const res = await request(app)
        .patch('/api/verification/token/123/finalize')
        .set('Authorization', `Bearer ${validJWT}`)
        .send(requestBody);

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should return 422 for royalty out of range', async () => {
      const requestBody = {
        licenseTermsId: '10',
        licenseType: 'commercial_remix',
        royaltyPercent: 150,
        allowDerivatives: true,
        commercialUse: true,
        licenseTxHash: '0x' + 'c'.repeat(64)
      };

      const res = await request(app)
        .patch('/api/verification/token/123/finalize')
        .set('Authorization', `Bearer ${validJWT}`)
        .send(requestBody);

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should return 422 for negative royalty', async () => {
      const requestBody = {
        licenseTermsId: '10',
        licenseType: 'commercial_remix',
        royaltyPercent: -5,
        allowDerivatives: true,
        commercialUse: true,
        licenseTxHash: '0x' + 'c'.repeat(64)
      };

      const res = await request(app)
        .patch('/api/verification/token/123/finalize')
        .set('Authorization', `Bearer ${validJWT}`)
        .send(requestBody);

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should accept non_commercial license type', async () => {
      const requestBody = {
        licenseTermsId: '1',
        licenseType: 'non_commercial',
        royaltyPercent: 0,
        allowDerivatives: true,
        commercialUse: false,
        licenseTxHash: '0x' + 'c'.repeat(64)
      };

      const res = await request(app)
        .patch('/api/verification/token/123/finalize')
        .set('Authorization', `Bearer ${validJWT}`)
        .send(requestBody);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.license.licenseType).toBe('non_commercial');
      expect(res.body.data.license.commercialUse).toBe(false);
    });

    it('should accept decimal royalty percentages', async () => {
      const requestBody = {
        licenseTermsId: '42',
        licenseType: 'commercial_remix',
        royaltyPercent: 12.5,
        allowDerivatives: true,
        commercialUse: true,
        licenseTxHash: '0x' + 'c'.repeat(64)
      };

      const res = await request(app)
        .patch('/api/verification/token/123/finalize')
        .set('Authorization', `Bearer ${validJWT}`)
        .send(requestBody);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.license.royaltyPercent).toBe(12.5);
    });

    it('should set licenseAttachedAt timestamp', async () => {
      const requestBody = {
        licenseTermsId: '10',
        licenseType: 'commercial_remix',
        royaltyPercent: 10,
        allowDerivatives: true,
        commercialUse: true,
        licenseTxHash: '0x' + 'c'.repeat(64)
      };

      const before = Math.floor(Date.now() / 1000);
      
      const res = await request(app)
        .patch('/api/verification/token/123/finalize')
        .set('Authorization', `Bearer ${validJWT}`)
        .send(requestBody);

      const after = Math.floor(Date.now() / 1000);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.license.licenseAttachedAt).toBeGreaterThanOrEqual(before);
      expect(res.body.data.license.licenseAttachedAt).toBeLessThanOrEqual(after);
    });

    it('should handle boolean fields correctly', async () => {
      const requestBody = {
        licenseTermsId: '10',
        licenseType: 'commercial_remix',
        royaltyPercent: 10,
        allowDerivatives: false,
        commercialUse: false,
        licenseTxHash: '0x' + 'c'.repeat(64)
      };

      const res = await request(app)
        .patch('/api/verification/token/123/finalize')
        .set('Authorization', `Bearer ${validJWT}`)
        .send(requestBody);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.license.allowDerivatives).toBe(false);
      expect(res.body.data.license.commercialUse).toBe(false);
    });
  });
});
