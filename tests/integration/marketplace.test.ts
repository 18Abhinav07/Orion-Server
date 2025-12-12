// tests/integration/marketplace.test.ts
import request from 'supertest';
import app from '../../src/app';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import MintToken from '../../src/models/MintToken';

let mongoServer: MongoMemoryServer;

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key';

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

describe('Marketplace API - Integration Tests', () => {
  
  describe('GET /api/marketplace/ips', () => {
    beforeEach(async () => {
      // Seed database with test IPs
      await MintToken.create([
        {
          nonce: 1,
          creatorAddress: '0xCreator1',
          contentHash: '0x' + 'a'.repeat(64),
          ipMetadataURI: 'ipfs://metadata1',
          nftMetadataURI: 'ipfs://nft1',
          message: '0x' + 'm'.repeat(64),
          signature: '0x' + 's'.repeat(130),
          ipId: '0xIP1',
          tokenId: '101',
          status: 'registered',
          licenseTermsId: '10',
          licenseType: 'commercial_remix',
          royaltyPercent: 10,
          allowDerivatives: true,
          commercialUse: true,
          licenseTxHash: '0x' + '1'.repeat(64),
          licenseAttachedAt: new Date('2024-01-01'),
          issuedAt: new Date('2024-01-01'),
          expiresAt: new Date('2024-12-31'),
          usedAt: new Date('2024-01-01')
        },
        {
          nonce: 2,
          creatorAddress: '0xCreator2',
          contentHash: '0x' + 'b'.repeat(64),
          ipMetadataURI: 'ipfs://metadata2',
          nftMetadataURI: 'ipfs://nft2',
          message: '0x' + 'm'.repeat(64),
          signature: '0x' + 's'.repeat(130),
          ipId: '0xIP2',
          tokenId: '102',
          status: 'registered',
          licenseTermsId: '20',
          licenseType: 'commercial_remix',
          royaltyPercent: 20,
          allowDerivatives: true,
          commercialUse: true,
          licenseTxHash: '0x' + '2'.repeat(64),
          licenseAttachedAt: new Date('2024-01-02'),
          issuedAt: new Date('2024-01-02'),
          expiresAt: new Date('2024-12-31'),
          usedAt: new Date('2024-01-02')
        },
        {
          nonce: 3,
          creatorAddress: '0xCreator3',
          contentHash: '0x' + 'c'.repeat(64),
          ipMetadataURI: 'ipfs://metadata3',
          nftMetadataURI: 'ipfs://nft3',
          message: '0x' + 'm'.repeat(64),
          signature: '0x' + 's'.repeat(130),
          ipId: '0xIP3',
          tokenId: '103',
          status: 'registered',
          licenseTermsId: '1',
          licenseType: 'non_commercial',
          royaltyPercent: 0,
          allowDerivatives: true,
          commercialUse: false,
          licenseTxHash: '0x' + '3'.repeat(64),
          licenseAttachedAt: new Date('2024-01-03'),
          issuedAt: new Date('2024-01-03'),
          expiresAt: new Date('2024-12-31'),
          usedAt: new Date('2024-01-03')
        },
        {
          nonce: 4,
          creatorAddress: '0xCreator4',
          contentHash: '0x' + 'd'.repeat(64),
          ipMetadataURI: 'ipfs://metadata4',
          nftMetadataURI: 'ipfs://nft4',
          message: '0x' + 'm'.repeat(64),
          signature: '0x' + 's'.repeat(130),
          ipId: '0xIP4',
          tokenId: '104',
          status: 'used', // Not finalized, should not appear by default
          issuedAt: new Date('2024-01-04'),
          expiresAt: new Date('2024-12-31'),
          usedAt: new Date('2024-01-04')
        }
      ]);
    });

    it('should return all registered IPs by default', async () => {
      const res = await request(app).get('/api/marketplace/ips');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ips).toHaveLength(3); // Only registered IPs
      expect(res.body.data.pagination.totalItems).toBe(3);
    });

    it('should filter by commercialUse=true', async () => {
      const res = await request(app)
        .get('/api/marketplace/ips')
        .query({ commercialUse: 'true' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.ips).toHaveLength(2); // Only commercial_remix IPs
      expect(res.body.data.ips.every((ip: any) => ip.license.commercialUse === true)).toBe(true);
    });

    it('should filter by commercialUse=false', async () => {
      const res = await request(app)
        .get('/api/marketplace/ips')
        .query({ commercialUse: 'false' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.ips).toHaveLength(1); // Only non_commercial IP
      expect(res.body.data.ips[0].license.commercialUse).toBe(false);
    });

    it('should filter by maxRoyalty', async () => {
      const res = await request(app)
        .get('/api/marketplace/ips')
        .query({ maxRoyalty: 10 });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.ips).toHaveLength(2); // 10% and 0% royalty IPs
      expect(res.body.data.ips.every((ip: any) => ip.license.royaltyPercent <= 10)).toBe(true);
    });

    it('should filter by minRoyalty', async () => {
      const res = await request(app)
        .get('/api/marketplace/ips')
        .query({ minRoyalty: 15 });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.ips).toHaveLength(1); // Only 20% royalty IP
      expect(res.body.data.ips[0].license.royaltyPercent).toBe(20);
    });

    it('should filter by royalty range', async () => {
      const res = await request(app)
        .get('/api/marketplace/ips')
        .query({ minRoyalty: 5, maxRoyalty: 15 });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.ips).toHaveLength(1); // Only 10% royalty IP
      expect(res.body.data.ips[0].license.royaltyPercent).toBe(10);
    });

    it('should filter by licenseType', async () => {
      const res = await request(app)
        .get('/api/marketplace/ips')
        .query({ licenseType: 'commercial_remix' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.ips).toHaveLength(2);
      expect(res.body.data.ips.every((ip: any) => ip.license.licenseType === 'commercial_remix')).toBe(true);
    });

    it('should filter by status=used', async () => {
      const res = await request(app)
        .get('/api/marketplace/ips')
        .query({ status: 'used' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.ips).toHaveLength(1);
      expect(res.body.data.ips[0].nonce).toBe(4);
    });

    it('should combine multiple filters', async () => {
      const res = await request(app)
        .get('/api/marketplace/ips')
        .query({
          commercialUse: 'true',
          maxRoyalty: 15,
          licenseType: 'commercial_remix'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.ips).toHaveLength(1);
      expect(res.body.data.ips[0].license.royaltyPercent).toBe(10);
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/api/marketplace/ips')
        .query({ page: 1, limit: 2 });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.ips).toHaveLength(2);
      expect(res.body.data.pagination).toMatchObject({
        page: 1,
        limit: 2,
        totalItems: 3,
        totalPages: 2,
        hasNextPage: true,
        hasPreviousPage: false
      });
    });

    it('should return second page', async () => {
      const res = await request(app)
        .get('/api/marketplace/ips')
        .query({ page: 2, limit: 2 });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.ips).toHaveLength(1);
      expect(res.body.data.pagination).toMatchObject({
        page: 2,
        limit: 2,
        totalItems: 3,
        totalPages: 2,
        hasNextPage: false,
        hasPreviousPage: true
      });
    });

    it('should enforce maximum limit of 100', async () => {
      const res = await request(app)
        .get('/api/marketplace/ips')
        .query({ limit: 200 });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.pagination.limit).toBe(100);
    });

    it('should return empty array when no IPs match filters', async () => {
      const res = await request(app)
        .get('/api/marketplace/ips')
        .query({ minRoyalty: 50 });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.ips).toHaveLength(0);
      expect(res.body.data.pagination.totalItems).toBe(0);
    });

    it('should return 422 for invalid status', async () => {
      const res = await request(app)
        .get('/api/marketplace/ips')
        .query({ status: 'invalid' });

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should return 422 for invalid commercialUse value', async () => {
      const res = await request(app)
        .get('/api/marketplace/ips')
        .query({ commercialUse: 'maybe' });

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should return 422 for invalid maxRoyalty', async () => {
      const res = await request(app)
        .get('/api/marketplace/ips')
        .query({ maxRoyalty: 150 });

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should return 422 for negative minRoyalty', async () => {
      const res = await request(app)
        .get('/api/marketplace/ips')
        .query({ minRoyalty: -5 });

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should return 422 for invalid licenseType', async () => {
      const res = await request(app)
        .get('/api/marketplace/ips')
        .query({ licenseType: 'invalid_type' });

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });

    it('should return IPs sorted by most recently finalized first', async () => {
      const res = await request(app).get('/api/marketplace/ips');

      expect(res.statusCode).toBe(200);
      expect(res.body.data.ips[0].nonce).toBe(3); // Most recent
      expect(res.body.data.ips[2].nonce).toBe(1); // Oldest
    });

    it('should include all required fields in response', async () => {
      const res = await request(app).get('/api/marketplace/ips');

      expect(res.statusCode).toBe(200);
      const ip = res.body.data.ips[0];
      
      expect(ip).toHaveProperty('nonce');
      expect(ip).toHaveProperty('ipId');
      expect(ip).toHaveProperty('tokenId');
      expect(ip).toHaveProperty('creatorAddress');
      expect(ip).toHaveProperty('contentHash');
      expect(ip).toHaveProperty('metadata');
      expect(ip.metadata).toHaveProperty('ipMetadataURI');
      expect(ip.metadata).toHaveProperty('nftMetadataURI');
      expect(ip).toHaveProperty('license');
      expect(ip.license).toHaveProperty('licenseTermsId');
      expect(ip.license).toHaveProperty('licenseType');
      expect(ip.license).toHaveProperty('royaltyPercent');
      expect(ip.license).toHaveProperty('allowDerivatives');
      expect(ip.license).toHaveProperty('commercialUse');
      expect(ip.license).toHaveProperty('licenseTxHash');
      expect(ip.license).toHaveProperty('licenseAttachedAt');
      expect(ip).toHaveProperty('registeredAt');
    });

    it('should include filter summary in response', async () => {
      const res = await request(app)
        .get('/api/marketplace/ips')
        .query({ commercialUse: 'true', maxRoyalty: 15 });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.filters).toMatchObject({
        status: 'registered',
        commercialUse: true,
        royaltyRange: { max: 15 }
      });
    });
  });
});
