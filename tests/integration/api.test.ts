// tests/integration/api.test.ts
import request from 'supertest';
import app from '../../src/app'; // The Express app
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import MintToken from '../../src/models/MintToken';

let mongoServer: MongoMemoryServer;

// Mock environment variables
process.env.BACKEND_VERIFIER_PRIVATE_KEY = '0x0123456789012345678901234567890123456789012345678901234567890123';
process.env.JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  // Clean up database after each test
  await MintToken.deleteMany({});
});

describe('Integration Test: API Endpoints', () => {

  it('should return 200 for the /health endpoint', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ status: 'UP' });
  });

  describe('POST /api/verification/generate-mint-token', () => {
    it('should generate a mint token without authentication (public endpoint)', async () => {
      const requestBody = {
        creatorAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        contentHash: '0x' + 'a'.repeat(64),
        ipMetadataURI: 'ipfs://somesid1',
        nftMetadataURI: 'ipfs://somesid2',
      };

      const res = await request(app)
        .post('/api/verification/generate-mint-token')
        .send(requestBody);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
      expect(res.body.data.nonce).toBeGreaterThan(0);
      expect(res.body.data.expiresIn).toBe(900);
      expect(res.body.data.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should return 400 if missing required fields', async () => {
      const res = await request(app)
        .post('/api/verification/generate-mint-token')
        .send({ creatorAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('INVALID_INPUT');
    });

    it('should return 409 for duplicate content', async () => {
      const requestBody = {
        creatorAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        contentHash: '0x' + 'b'.repeat(64),
        ipMetadataURI: 'ipfs://somesid1',
        nftMetadataURI: 'ipfs://somesid2',
      };

      // First mint
      const res1 = await request(app)
        .post('/api/verification/generate-mint-token')
        .send(requestBody);
      
      expect(res1.statusCode).toEqual(200);
      const nonce = res1.body.data.nonce;

      // Mark as used
      await request(app)
        .patch(`/api/verification/token/${nonce}/update`)
        .send({
          ipId: '0x1234567890abcdef1234567890abcdef12345678',
          tokenId: 123,
          txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        });

      // Try to mint same content again
      const res2 = await request(app)
        .post('/api/verification/generate-mint-token')
        .send(requestBody);
      
      expect(res2.statusCode).toEqual(409);
      expect(res2.body.success).toBe(false);
      expect(res2.body.error).toBe('DUPLICATE_CONTENT');
      expect(res2.body.existingMint).toBeDefined();
      expect(res2.body.existingMint.ipId).toBe('0x1234567890abcdef1234567890abcdef12345678');
    });
  });

  describe('GET /api/verification/token/:nonce/status', () => {
    it('should return status for pending token', async () => {
      // Generate a token first
      const generateRes = await request(app)
        .post('/api/verification/generate-mint-token')
        .send({
          creatorAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          contentHash: '0x' + 'c'.repeat(64),
          ipMetadataURI: 'ipfs://somesid1',
          nftMetadataURI: 'ipfs://somesid2',
        });

      const nonce = generateRes.body.data.nonce;

      // Check status
      const statusRes = await request(app)
        .get(`/api/verification/token/${nonce}/status`);

      expect(statusRes.statusCode).toEqual(200);
      expect(statusRes.body.success).toBe(true);
      expect(statusRes.body.data.nonce).toBe(nonce);
      expect(statusRes.body.data.status).toBe('pending');
      expect(statusRes.body.data.isExpired).toBe(false);
      expect(statusRes.body.data.remainingSeconds).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent token', async () => {
      const res = await request(app)
        .get('/api/verification/token/999999/status');

      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('TOKEN_NOT_FOUND');
    });

    it('should return mintDetails for used token', async () => {
      // Generate token
      const generateRes = await request(app)
        .post('/api/verification/generate-mint-token')
        .send({
          creatorAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          contentHash: '0x' + 'd'.repeat(64),
          ipMetadataURI: 'ipfs://somesid1',
          nftMetadataURI: 'ipfs://somesid2',
        });

      const nonce = generateRes.body.data.nonce;

      // Mark as used
      await request(app)
        .patch(`/api/verification/token/${nonce}/update`)
        .send({
          ipId: '0x9876543210fedcba9876543210fedcba98765432',
          tokenId: 456,
          txHash: '0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff'
        });

      // Check status
      const statusRes = await request(app)
        .get(`/api/verification/token/${nonce}/status`);

      expect(statusRes.statusCode).toEqual(200);
      expect(statusRes.body.data.status).toBe('used');
      expect(statusRes.body.data.mintDetails).toBeDefined();
      expect(statusRes.body.data.mintDetails.ipId).toBe('0x9876543210fedcba9876543210fedcba98765432');
      expect(statusRes.body.data.mintDetails.tokenId).toBe(456);
    });
  });

  describe('PATCH /api/verification/token/:nonce/update', () => {
    it('should update pending token to used', async () => {
      // Generate token
      const generateRes = await request(app)
        .post('/api/verification/generate-mint-token')
        .send({
          creatorAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          contentHash: '0x' + 'e'.repeat(64),
          ipMetadataURI: 'ipfs://somesid1',
          nftMetadataURI: 'ipfs://somesid2',
        });

      const nonce = generateRes.body.data.nonce;

      // Update
      const updateRes = await request(app)
        .patch(`/api/verification/token/${nonce}/update`)
        .send({
          ipId: '0x1234567890abcdef1234567890abcdef12345678',
          tokenId: 789,
          txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        });

      expect(updateRes.statusCode).toEqual(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.message).toBe('Token marked as used');
      expect(updateRes.body.data.status).toBe('used');
    });

    it('should return 400 if missing required fields', async () => {
      const res = await request(app)
        .patch('/api/verification/token/1/update')
        .send({ ipId: '0x123' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('INVALID_INPUT');
    });

    it('should return 409 if token already used', async () => {
      // Generate token
      const generateRes = await request(app)
        .post('/api/verification/generate-mint-token')
        .send({
          creatorAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          contentHash: '0x' + 'f'.repeat(64),
          ipMetadataURI: 'ipfs://somesid1',
          nftMetadataURI: 'ipfs://somesid2',
        });

      const nonce = generateRes.body.data.nonce;

      // First update
      await request(app)
        .patch(`/api/verification/token/${nonce}/update`)
        .send({
          ipId: '0x1234567890abcdef1234567890abcdef12345678',
          tokenId: 111,
          txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        });

      // Try to update again
      const res = await request(app)
        .patch(`/api/verification/token/${nonce}/update`)
        .send({
          ipId: '0x9999999999999999999999999999999999999999',
          tokenId: 222,
          txHash: '0x8888888888888888888888888888888888888888888888888888888888888888'
        });

      expect(res.statusCode).toEqual(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('TOKEN_ALREADY_USED');
      expect(res.body.existingMint).toBeDefined();
    });

    it('should return 404 for non-existent token', async () => {
      const res = await request(app)
        .patch('/api/verification/token/999999/update')
        .send({
          ipId: '0x1234567890abcdef1234567890abcdef12345678',
          tokenId: 123,
          txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
        });

      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('TOKEN_NOT_FOUND');
    });
  });

  describe('Complete Minting Flow', () => {
    it('should complete the full flow: generate → check → update → verify', async () => {
      const contentHash = '0x' + '1234567890abcdef'.repeat(4);
      
      // Step 1: Generate mint token
      const generateRes = await request(app)
        .post('/api/verification/generate-mint-token')
        .send({
          creatorAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          contentHash,
          ipMetadataURI: 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
          nftMetadataURI: 'ipfs://QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx',
        });

      expect(generateRes.statusCode).toEqual(200);
      const { nonce, signature } = generateRes.body.data;

      // Step 2: Check status (should be pending)
      const status1Res = await request(app)
        .get(`/api/verification/token/${nonce}/status`);

      expect(status1Res.body.data.status).toBe('pending');

      // Step 3: Update after minting
      const updateRes = await request(app)
        .patch(`/api/verification/token/${nonce}/update`)
        .send({
          ipId: '0xabcdef1234567890abcdef1234567890abcdef12',
          tokenId: 42,
          txHash: '0x1111111111111111111111111111111111111111111111111111111111111111'
        });

      expect(updateRes.statusCode).toEqual(200);

      // Step 4: Verify status is now 'used'
      const status2Res = await request(app)
        .get(`/api/verification/token/${nonce}/status`);

      expect(status2Res.body.data.status).toBe('used');
      expect(status2Res.body.data.mintDetails.ipId).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
      expect(status2Res.body.data.mintDetails.tokenId).toBe(42);

      // Step 5: Try to mint same content again (should fail)
      const duplicateRes = await request(app)
        .post('/api/verification/generate-mint-token')
        .send({
          creatorAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          contentHash,
          ipMetadataURI: 'ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
          nftMetadataURI: 'ipfs://QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx',
        });

      expect(duplicateRes.statusCode).toEqual(409);
      expect(duplicateRes.body.error).toBe('DUPLICATE_CONTENT');
    });
  });
});
