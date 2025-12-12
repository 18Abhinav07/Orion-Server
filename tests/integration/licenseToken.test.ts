// tests/integration/licenseToken.test.ts
import request from 'supertest';
import app from '../../src/app';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import LicenseTokenMint from '../../src/models/LicenseTokenMint';
import MarketplaceOrder from '../../src/models/MarketplaceOrder';

let mongoServer: MongoMemoryServer;

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
  await LicenseTokenMint.deleteMany({});
  await MarketplaceOrder.deleteMany({});
});

describe('License Token Tracking API Tests', () => {
  
  const mockLicenseData = {
    licenseTokenId: '64804',
    txHash: '0x63e00fb77287b9d86cf69e448631ed1077b9402d8a67ffb7b6bcf6eda8ab892d',
    blockNumber: 12345678,
    ipId: '0xE5756dc04dAa9daF41162Bc34c0b955c34Bd863E',
    ipTokenId: 1234,
    licenseTermsId: '2665',
    licenseeAddress: '0x23e67597f0898f747Fa3291C8920168adF9455D0',
    amount: 1,
    mintingFee: '100000000000000000',
    currency: '0xB132A6B7AE652c974EE1557A3521D53d18F6739f',
    royaltyPercentage: 10,
    licenseTerms: {
      commercialUse: true,
      derivativesAllowed: true,
      transferable: true,
    },
    metadata: {
      ipMetadataURI: 'ipfs://QmTest123',
      nftMetadataURI: 'ipfs://QmTest456',
      ipType: 'Text',
      ipTitle: 'Test IP Asset',
    },
  };

  describe('POST /api/license-tokens/mint', () => {
    it('should record a new license token mint successfully', async () => {
      const res = await request(app)
        .post('/api/license-tokens/mint')
        .send(mockLicenseData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.licenseTokenId).toBe('64804');
      expect(res.body.data.txHash).toBe(mockLicenseData.txHash);
      expect(res.body.data.status).toBe('active');
      expect(res.body.message).toContain('successfully');

      // Verify database record
      const dbRecord = await LicenseTokenMint.findOne({ licenseTokenId: '64804' });
      expect(dbRecord).toBeTruthy();
      expect(dbRecord?.licenseeAddress).toBe(mockLicenseData.licenseeAddress);
      expect(dbRecord?.currentOwner).toBe(mockLicenseData.licenseeAddress);

      // Verify marketplace order was created
      const orderRecord = await MarketplaceOrder.findOne({ licenseTokenId: '64804' });
      expect(orderRecord).toBeTruthy();
      expect(orderRecord?.orderType).toBe('license_purchase');
      expect(orderRecord?.status).toBe('completed');
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        licenseTokenId: '64805',
        // Missing required fields
      };

      const res = await request(app)
        .post('/api/license-tokens/mint')
        .send(invalidData);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('LT001');
    });

    it('should return 409 for duplicate license token ID', async () => {
      // First mint
      await request(app)
        .post('/api/license-tokens/mint')
        .send(mockLicenseData);

      // Attempt duplicate
      const res = await request(app)
        .post('/api/license-tokens/mint')
        .send(mockLicenseData);

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('LT002');
      expect(res.body.message).toContain('already recorded');
    });

    it('should return 409 for duplicate transaction hash', async () => {
      // First mint
      await request(app)
        .post('/api/license-tokens/mint')
        .send(mockLicenseData);

      // Attempt with same txHash but different license token ID
      const duplicateTxData = {
        ...mockLicenseData,
        licenseTokenId: '64806',
      };

      const res = await request(app)
        .post('/api/license-tokens/mint')
        .send(duplicateTxData);

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('LT003');
    });
  });

  describe('GET /api/license-tokens/user/:walletAddress', () => {
    beforeEach(async () => {
      // Create multiple license tokens for testing
      await request(app).post('/api/license-tokens/mint').send(mockLicenseData);
      
      await request(app).post('/api/license-tokens/mint').send({
        ...mockLicenseData,
        licenseTokenId: '64805',
        txHash: '0x' + 'b'.repeat(64),
        metadata: {
          ...mockLicenseData.metadata,
          ipType: 'Image',
        },
      });
    });

    it('should get all licenses for a user', async () => {
      const res = await request(app)
        .get(`/api/license-tokens/user/${mockLicenseData.licenseeAddress}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.licenses).toHaveLength(2);
      expect(res.body.data.pagination.totalItems).toBe(2);
    });

    it('should filter licenses by status', async () => {
      const res = await request(app)
        .get(`/api/license-tokens/user/${mockLicenseData.licenseeAddress}?status=active`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.licenses).toHaveLength(2);
    });

    it('should filter licenses by IP type', async () => {
      const res = await request(app)
        .get(`/api/license-tokens/user/${mockLicenseData.licenseeAddress}?ipType=Image`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.licenses).toHaveLength(1);
      expect(res.body.data.licenses[0].ipType).toBe('Image');
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get(`/api/license-tokens/user/${mockLicenseData.licenseeAddress}?page=1&limit=1`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.licenses).toHaveLength(1);
      expect(res.body.data.pagination.itemsPerPage).toBe(1);
      expect(res.body.data.pagination.hasNext).toBe(true);
    });

    it('should return 400 for invalid wallet address', async () => {
      const res = await request(app)
        .get('/api/license-tokens/user/invalid-address');

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('LT009');
    });
  });

  describe('GET /api/license-tokens/ip/:ipId', () => {
    beforeEach(async () => {
      await request(app).post('/api/license-tokens/mint').send(mockLicenseData);
      
      await request(app).post('/api/license-tokens/mint').send({
        ...mockLicenseData,
        licenseTokenId: '64806',
        txHash: '0x' + 'c'.repeat(64),
        licenseeAddress: '0x' + 'a'.repeat(40),
      });
    });

    it('should get all licenses for an IP asset', async () => {
      const res = await request(app)
        .get(`/api/license-tokens/ip/${mockLicenseData.ipId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ipId).toBe(mockLicenseData.ipId);
      expect(res.body.data.licenses).toHaveLength(2);
      expect(res.body.data.analytics).toBeDefined();
      expect(res.body.data.analytics.totalLicensesMinted).toBe(2);
      expect(res.body.data.analytics.uniqueLicensees).toBe(2);
    });

    it('should include analytics data', async () => {
      const res = await request(app)
        .get(`/api/license-tokens/ip/${mockLicenseData.ipId}`);

      expect(res.body.data.analytics.activeLicenses).toBe(2);
      expect(res.body.data.analytics.totalRevenue).toBeDefined();
    });
  });

  describe('GET /api/license-tokens/:licenseTokenId', () => {
    beforeEach(async () => {
      await request(app).post('/api/license-tokens/mint').send(mockLicenseData);
    });

    it('should get license token details', async () => {
      const res = await request(app)
        .get('/api/license-tokens/64804');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.licenseTokenId).toBe('64804');
      expect(res.body.data.ipId).toBe(mockLicenseData.ipId);
      expect(res.body.data.licenseTerms).toBeDefined();
      expect(res.body.data.metadata).toBeDefined();
    });

    it('should return 404 for non-existent license token', async () => {
      const res = await request(app)
        .get('/api/license-tokens/99999');

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('LT004');
    });
  });

  describe('PATCH /api/license-tokens/:licenseTokenId/usage', () => {
    beforeEach(async () => {
      await request(app).post('/api/license-tokens/mint').send(mockLicenseData);
    });

    it('should update usage for derivative creation', async () => {
      const res = await request(app)
        .patch('/api/license-tokens/64804/usage')
        .send({
          action: 'derivative_created',
          derivativeIpId: '0x' + 'd'.repeat(40),
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.usageCount).toBe(1);
      expect(res.body.data.derivativeCount).toBe(1);
    });

    it('should update usage for commercial use', async () => {
      const res = await request(app)
        .patch('/api/license-tokens/64804/usage')
        .send({
          action: 'commercial_use',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.usageCount).toBe(1);
      expect(res.body.data.derivativeCount).toBe(0);
    });

    it('should update status for transfer', async () => {
      const newOwner = '0x' + 'e'.repeat(40);
      const res = await request(app)
        .patch('/api/license-tokens/64804/usage')
        .send({
          action: 'transfer',
          newOwner,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('transferred');

      // Verify database update
      const dbRecord = await LicenseTokenMint.findOne({ licenseTokenId: '64804' });
      expect(dbRecord?.currentOwner).toBe(newOwner);
    });

    it('should return 400 for transfer without newOwner', async () => {
      const res = await request(app)
        .patch('/api/license-tokens/64804/usage')
        .send({
          action: 'transfer',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('LT001');
    });
  });

  describe('GET /api/license-tokens/analytics/ip/:ipId', () => {
    beforeEach(async () => {
      await request(app).post('/api/license-tokens/mint').send(mockLicenseData);
      
      await request(app).post('/api/license-tokens/mint').send({
        ...mockLicenseData,
        licenseTokenId: '64807',
        txHash: '0x' + 'f'.repeat(64),
        licenseeAddress: '0x' + 'b'.repeat(40),
      });
    });

    it('should get comprehensive analytics for IP', async () => {
      const res = await request(app)
        .get(`/api/license-tokens/analytics/ip/${mockLicenseData.ipId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overview).toBeDefined();
      expect(res.body.data.overview.totalLicensesMinted).toBe(2);
      expect(res.body.data.overview.activeLicenses).toBe(2);
      expect(res.body.data.overview.uniqueLicensees).toBe(2);
      expect(res.body.data.derivatives).toBeDefined();
      expect(res.body.data.topLicensees).toBeDefined();
    });

    it('should include derivative statistics', async () => {
      const res = await request(app)
        .get(`/api/license-tokens/analytics/ip/${mockLicenseData.ipId}`);

      expect(res.body.data.derivatives.totalDerivatives).toBeDefined();
      expect(res.body.data.derivatives.averageDerivativesPerLicense).toBeDefined();
    });
  });

  describe('GET /api/license-tokens/stats/global', () => {
    beforeEach(async () => {
      // Create licenses for different IPs
      await request(app).post('/api/license-tokens/mint').send(mockLicenseData);
      
      await request(app).post('/api/license-tokens/mint').send({
        ...mockLicenseData,
        licenseTokenId: '64808',
        txHash: '0x' + 'g'.repeat(64),
        ipId: '0x' + 'h'.repeat(40),
      });
    });

    it('should get global platform statistics', async () => {
      const res = await request(app)
        .get('/api/license-tokens/stats/global');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalLicensesMinted).toBe(2);
      expect(res.body.data.totalIPsLicensed).toBe(2);
      expect(res.body.data.totalLicensees).toBeGreaterThanOrEqual(1);
      expect(res.body.data.activeLicenses).toBe(2);
      expect(res.body.data.topIPs).toBeDefined();
      expect(res.body.data.recentMints).toBeDefined();
    });

    it('should include top IPs and recent mints', async () => {
      const res = await request(app)
        .get('/api/license-tokens/stats/global');

      expect(Array.isArray(res.body.data.topIPs)).toBe(true);
      expect(Array.isArray(res.body.data.recentMints)).toBe(true);
      expect(res.body.data.recentMints.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /api/license-tokens/verify/:licenseTokenId/owner/:walletAddress', () => {
    beforeEach(async () => {
      await request(app).post('/api/license-tokens/mint').send(mockLicenseData);
    });

    it('should verify ownership for correct owner', async () => {
      const res = await request(app)
        .get(`/api/license-tokens/verify/64804/owner/${mockLicenseData.licenseeAddress}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isOwner).toBe(true);
      expect(res.body.data.isValid).toBe(true);
      expect(res.body.data.status).toBe('active');
    });

    it('should deny ownership for incorrect owner', async () => {
      const wrongAddress = '0x' + 'z'.repeat(40);
      const res = await request(app)
        .get(`/api/license-tokens/verify/64804/owner/${wrongAddress}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.isOwner).toBe(false);
    });

    it('should return 404 for non-existent license token', async () => {
      const res = await request(app)
        .get(`/api/license-tokens/verify/99999/owner/${mockLicenseData.licenseeAddress}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('LT004');
    });
  });

  describe('Marketplace Order Integration', () => {
    it('should create marketplace order when license is minted', async () => {
      await request(app)
        .post('/api/license-tokens/mint')
        .send(mockLicenseData);

      const orders = await MarketplaceOrder.find({ licenseTokenId: '64804' });
      expect(orders).toHaveLength(1);
      expect(orders[0].orderType).toBe('license_purchase');
      expect(orders[0].buyerAddress).toBe(mockLicenseData.licenseeAddress);
      expect(orders[0].status).toBe('completed');
      expect(orders[0].metadata.ipTitle).toBe('Test IP Asset');
    });
  });
});
