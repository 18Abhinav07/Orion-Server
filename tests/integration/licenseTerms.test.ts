// tests/integration/licenseTerms.test.ts
import request from 'supertest';
import app from '../../src/app';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import { LicenseTermsCache } from '../../src/models/LicenseTermsCache';
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
  await LicenseTermsCache.deleteMany({});
  await MintToken.deleteMany({});
});

describe('License Terms API - Integration Tests', () => {
  
  describe('GET /api/license-terms/find', () => {
    it('should return cached license terms when found', async () => {
      // Seed database with a license term
      await LicenseTermsCache.create({
        licenseType: 'commercial_remix',
        royaltyPercent: 10,
        licenseTermsId: '10',
        transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      });

      const res = await request(app)
        .get('/api/license-terms/find')
        .query({ type: 'commercial_remix', royalty: 10 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.cached).toBe(true);
      expect(res.body.data.licenseTermsId).toBe('10');
      expect(res.body.data.licenseType).toBe('commercial_remix');
      expect(res.body.data.royaltyPercent).toBe(10);
    });

    it('should return not cached when license terms not found', async () => {
      const res = await request(app)
        .get('/api/license-terms/find')
        .query({ type: 'commercial_remix', royalty: 15 });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.cached).toBe(false);
      expect(res.body.data).toBeFalsy();
    });

    it('should return 400 when type parameter is missing', async () => {
      const res = await request(app)
        .get('/api/license-terms/find')
        .query({ royalty: 10 });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('INVALID_INPUT');
    });

    it('should return 400 when royalty parameter is missing', async () => {
      const res = await request(app)
        .get('/api/license-terms/find')
        .query({ type: 'commercial_remix' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('INVALID_INPUT');
    });

    it('should return 422 when license type is invalid', async () => {
      const res = await request(app)
        .get('/api/license-terms/find')
        .query({ type: 'invalid_type', royalty: 10 });

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message || res.body.error).toBeTruthy();
    });

    it('should return 422 when royalty is out of range', async () => {
      const res = await request(app)
        .get('/api/license-terms/find')
        .query({ type: 'commercial_remix', royalty: 150 });

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message || res.body.error).toBeTruthy();
    });

    it('should return 422 when royalty is negative', async () => {
      const res = await request(app)
        .get('/api/license-terms/find')
        .query({ type: 'commercial_remix', royalty: -5 });

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message || res.body.error).toBeTruthy();
    });
  });

  describe('POST /api/license-terms/cache', () => {
    it('should cache new license terms with valid JWT', async () => {
      const requestBody = {
        licenseType: 'commercial_remix',
        royaltyPercent: 12,
        licenseTermsId: '42',
        transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };

      const res = await request(app)
        .post('/api/license-terms/cache')
        .set('Authorization', `Bearer ${validJWT}`)
        .send(requestBody);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        licenseTermsId: '42',
        licenseType: 'commercial_remix',
        royaltyPercent: 12
      });

      // Verify it's actually in the database
      const cached = await LicenseTermsCache.findOne({
        licenseType: 'commercial_remix',
        royaltyPercent: 12
      });
      expect(cached).toBeTruthy();
      expect(cached?.licenseTermsId).toBe('42');
    });

    it('should return 401 when JWT is missing', async () => {
      const requestBody = {
        licenseType: 'commercial_remix',
        royaltyPercent: 12,
        licenseTermsId: '42',
        transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };

      const res = await request(app)
        .post('/api/license-terms/cache')
        .send(requestBody);

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 when JWT is invalid', async () => {
      const requestBody = {
        licenseType: 'commercial_remix',
        royaltyPercent: 12,
        licenseTermsId: '42',
        transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };

      const res = await request(app)
        .post('/api/license-terms/cache')
        .set('Authorization', 'Bearer invalid-jwt-token')
        .send(requestBody);

      expect(res.statusCode).toBe(401);
    });

    it('should update existing cache entry when same license terms submitted', async () => {
      // Create initial entry
      await LicenseTermsCache.create({
        licenseType: 'commercial_remix',
        royaltyPercent: 10,
        licenseTermsId: '10',
        transactionHash: '0xold'
      });

      const requestBody = {
        licenseType: 'commercial_remix',
        royaltyPercent: 10,
        licenseTermsId: '10-updated',
        transactionHash: '0xnew'
      };

      const res = await request(app)
        .post('/api/license-terms/cache')
        .set('Authorization', `Bearer ${validJWT}`)
        .send(requestBody);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.licenseTermsId).toBe('10-updated');

      // Verify only one entry exists
      const count = await LicenseTermsCache.countDocuments({
        licenseType: 'commercial_remix',
        royaltyPercent: 10
      });
      expect(count).toBe(1);
    });

    it('should return 400 when required fields are missing', async () => {
      const requestBody = {
        licenseType: 'commercial_remix',
        // Missing royaltyPercent, licenseTermsId, transactionHash
      };

      const res = await request(app)
        .post('/api/license-terms/cache')
        .set('Authorization', `Bearer ${validJWT}`)
        .send(requestBody);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('INVALID_INPUT');
    });

    it('should return 422 when license type is invalid', async () => {
      const requestBody = {
        licenseType: 'invalid_type',
        royaltyPercent: 10,
        licenseTermsId: '42',
        transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };

      const res = await request(app)
        .post('/api/license-terms/cache')
        .set('Authorization', `Bearer ${validJWT}`)
        .send(requestBody);

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should return 422 when royalty is out of range', async () => {
      const requestBody = {
        licenseType: 'commercial_remix',
        royaltyPercent: 101,
        licenseTermsId: '42',
        transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };

      const res = await request(app)
        .post('/api/license-terms/cache')
        .set('Authorization', `Bearer ${validJWT}`)
        .send(requestBody);

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.message || res.body.error).toBeTruthy();
    });

    it('should accept decimal royalty percentages', async () => {
      const requestBody = {
        licenseType: 'commercial_remix',
        royaltyPercent: 12.5,
        licenseTermsId: '42',
        transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };

      const res = await request(app)
        .post('/api/license-terms/cache')
        .set('Authorization', `Bearer ${validJWT}`)
        .send(requestBody);

      expect(res.statusCode).toBe(201);
      expect(res.body.data.royaltyPercent).toBe(12.5);
    });

    it('should handle non_commercial license type', async () => {
      const requestBody = {
        licenseType: 'non_commercial',
        royaltyPercent: 0,
        licenseTermsId: '1',
        transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };

      const res = await request(app)
        .post('/api/license-terms/cache')
        .set('Authorization', `Bearer ${validJWT}`)
        .send(requestBody);

      expect(res.statusCode).toBe(201);
      expect(res.body.data.licenseType).toBe('non_commercial');
    });
  });
});
