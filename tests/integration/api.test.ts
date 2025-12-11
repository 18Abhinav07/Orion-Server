// tests/integration/api.test.ts
import request from 'supertest';
import app from '../../src/app'; // The Express app
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

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

describe('Integration Test: API Endpoints', () => {

  it('should return 200 for the /health endpoint', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ status: 'UP' });
  });

  describe('POST /api/verification/generate-mint-token', () => {
    it('should generate a mint token for a verified session', async () => {
      // 1. Mock user authentication by creating a valid JWT
      const user = { id: new mongoose.Types.ObjectId().toHexString(), roles: ['creator'] };
      const token = jwt.sign(user, process.env.JWT_SECRET!);

      // 2. Mock pre-existing data
      // (This would be created in a real flow by preceding API calls)
      // For this test, we assume they exist. We can add setup steps later.
      
      const requestBody = {
        creatorAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        contentHash: '0x' + 'a'.repeat(64),
        ipMetadataURI: 'ipfs://somesid1',
        nftMetadataURI: 'ipfs://somesid2',
        sessionId: 'sess_123',
        fingerprintId: 'fp_123',
      };

      // 3. Make the request
      const res = await request(app)
        .post('/api/verification/generate-mint-token')
        .set('Authorization', `Bearer ${token}`)
        .send(requestBody);

      // 4. Assert the response
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mintToken).toBeDefined();
      expect(res.body.data.mintToken.signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
      expect(res.body.data.mintToken.nonce).toBeGreaterThan(0);
    });

    it('should return 401 if no auth token is provided', async () => {
        const res = await request(app)
            .post('/api/verification/generate-mint-token')
            .send({});
        expect(res.statusCode).toEqual(401);
    });

    // TODO: Add more integration tests for failure cases (e.g., unverified content, rate limits)
  });
});
