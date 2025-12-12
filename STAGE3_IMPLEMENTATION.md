# Stage 3: License Terms Management - Implementation Summary

## Overview
Stage 3 implements the license terms management system for the Orion IP protection platform. This system enables efficient caching of Story Protocol license terms, reduces blockchain gas costs, and provides a marketplace API for discovering registered IPs with license filtering.

## Architecture

### Database Layer
- **LicenseTermsCache Model**: MongoDB caching layer for license terms
- **MintToken Extensions**: Added license metadata fields to existing verification tokens

### API Endpoints

#### 1. Find License Terms (GET /api/license-terms/find)
**Access**: Public  
**Purpose**: Check if license terms are already cached to reuse existing IDs  
**Query Parameters**:
- `type` (required): License type (`commercial_remix` | `non_commercial`)
- `royalty` (required): Royalty percentage (0-100)

**Response**:
```json
{
  "success": true,
  "cached": true,
  "data": {
    "licenseTermsId": "10",
    "licenseType": "commercial_remix",
    "royaltyPercent": 10,
    "transactionHash": "0x..."
  }
}
```

#### 2. Cache License Terms (POST /api/license-terms/cache)
**Access**: Protected (JWT required)  
**Purpose**: Store newly registered license terms for reuse  
**Request Body**:
```json
{
  "licenseType": "commercial_remix",
  "royaltyPercent": 12,
  "licenseTermsId": "42",
  "transactionHash": "0x..."
}
```

#### 3. Finalize Mint Token (PATCH /api/verification/token/:nonce/finalize)
**Access**: Protected (JWT required)  
**Purpose**: Attach license terms to minted IP after registration  
**Request Body**:
```json
{
  "licenseTermsId": "10",
  "licenseType": "commercial_remix",
  "royaltyPercent": 10,
  "allowDerivatives": true,
  "commercialUse": true,
  "licenseTxHash": "0x..."
}
```

**Response**:
```json
{
  "success": true,
  "message": "Token finalized with license terms",
  "data": {
    "nonce": 123,
    "status": "registered",
    "ipId": "0x...",
    "license": {
      "licenseTermsId": "10",
      "licenseType": "commercial_remix",
      "royaltyPercent": 10,
      "allowDerivatives": true,
      "commercialUse": true,
      "licenseTxHash": "0x...",
      "licenseAttachedAt": 1735123456
    }
  }
}
```

#### 4. Marketplace IPs (GET /api/marketplace/ips)
**Access**: Public  
**Purpose**: Query registered IPs with advanced filtering  
**Query Parameters**:
- `status`: Filter by status (`registered` | `used`) - default: `registered`
- `commercialUse`: Filter by commercial use (`true` | `false`)
- `maxRoyalty`: Maximum royalty percentage (0-100)
- `minRoyalty`: Minimum royalty percentage (0-100)
- `licenseType`: Filter by license type (`commercial_remix` | `non_commercial`)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response**:
```json
{
  "success": true,
  "data": {
    "ips": [
      {
        "nonce": 123,
        "ipId": "0x...",
        "tokenId": "456",
        "creatorAddress": "0x...",
        "contentHash": "0x...",
        "metadata": {
          "ipMetadataURI": "ipfs://...",
          "nftMetadataURI": "ipfs://..."
        },
        "license": {
          "licenseTermsId": "10",
          "licenseType": "commercial_remix",
          "royaltyPercent": 10,
          "allowDerivatives": true,
          "commercialUse": true,
          "licenseTxHash": "0x...",
          "licenseAttachedAt": 1735123456
        },
        "registeredAt": 1735123400
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 42,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPreviousPage": false
    },
    "filters": {
      "status": "registered",
      "commercialUse": true,
      "licenseType": "commercial_remix",
      "royaltyRange": {
        "min": 0,
        "max": 15
      }
    }
  }
}
```

## License Types

### commercial_remix
- **Derivatives**: Allowed ✅
- **Commercial Use**: Allowed ✅
- **Royalty**: User-defined (0-100%)

### non_commercial
- **Derivatives**: Allowed ✅
- **Commercial Use**: Not allowed ❌
- **Royalty**: Typically 0%

## Story Protocol Presets

### Pre-registered License Terms (Gas Optimization)
To reduce blockchain transaction costs, common license configurations are pre-registered on Story Protocol:

| License Type | Royalty | License Terms ID | Use Case |
|--------------|---------|------------------|----------|
| `commercial_remix` | 10% | `10` | Standard commercial license |
| `commercial_remix` | 20% | `20` | Premium commercial license |
| `non_commercial` | 0% | `1` | Free creative commons |

### Seeding Presets
Run the database seeder to populate the cache with these presets:

```bash
npm run seed:license-terms
```

## Database Schema Changes

### LicenseTermsCache Model
```typescript
{
  licenseType: 'commercial_remix' | 'non_commercial', // Required
  royaltyPercent: Number (0-100),                      // Required
  licenseTermsId: String,                              // Story Protocol ID
  transactionHash: String,                             // Blockchain tx hash
  cachedAt: Date                                       // Auto-generated
}
```

**Indexes**:
- Compound unique index on `(licenseType, royaltyPercent)` for fast cache lookups

### MintToken Model Extensions
```typescript
{
  // Existing fields...
  status: 'pending' | 'used' | 'expired' | 'revoked' | 'registered',
  
  // New license fields
  licenseTermsId?: String,        // Story Protocol license terms ID
  licenseType?: String,           // commercial_remix | non_commercial
  royaltyPercent?: Number,        // 0-100
  allowDerivatives?: Boolean,     // Derivatives allowed
  commercialUse?: Boolean,        // Commercial use allowed
  licenseTxHash?: String,         // License attachment transaction hash
  licenseAttachedAt?: Date        // When license was attached
}
```

**New Indexes**:
- `licenseTermsId` (non-unique)
- `licenseType` (non-unique)
- `royaltyPercent` (non-unique)
- `commercialUse` (non-unique)

## Workflow

### Frontend Minting Flow

#### Step 1: Check Cache (Optional - Optimize Gas)
```typescript
const response = await fetch(
  `/api/license-terms/find?type=commercial_remix&royalty=10`
);
const { cached, data } = await response.json();

if (cached) {
  // Reuse existing licenseTermsId
  licenseTermsId = data.licenseTermsId;
} else {
  // Register new license terms on Story Protocol
  licenseTermsId = await storyProtocol.registerLicenseTerms(...);
  
  // Cache for future use
  await fetch('/api/license-terms/cache', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt}` },
    body: JSON.stringify({
      licenseType: 'commercial_remix',
      royaltyPercent: 10,
      licenseTermsId,
      transactionHash: tx.hash
    })
  });
}
```

#### Step 2: Generate Mint Token
```typescript
const { signature, nonce } = await fetch('/api/verification/generate-mint-token', {
  method: 'POST',
  body: JSON.stringify({
    creatorAddress,
    contentHash,
    ipMetadataURI,
    nftMetadataURI,
    assetType: 'video'
  })
});
```

#### Step 3: Register IP on Story Protocol
```typescript
const { ipId, tokenId, txHash } = await storyProtocol.mintAndRegisterIp(
  signature,
  nonce,
  ...
);

// Update backend with registration details
await fetch(`/api/verification/token/${nonce}/update`, {
  method: 'PATCH',
  body: JSON.stringify({ ipId, tokenId, txHash })
});
```

#### Step 4: Attach License Terms
```typescript
const licenseTx = await storyProtocol.attachLicenseTerms(
  ipId,
  licenseTermsId
);

// Finalize token with license metadata
await fetch(`/api/verification/token/${nonce}/finalize`, {
  method: 'PATCH',
  headers: { 'Authorization': `Bearer ${jwt}` },
  body: JSON.stringify({
    licenseTermsId,
    licenseType: 'commercial_remix',
    royaltyPercent: 10,
    allowDerivatives: true,
    commercialUse: true,
    licenseTxHash: licenseTx.hash
  })
});
```

## Files Created/Modified

### Created Files
1. `src/models/LicenseTermsCache.ts` - License terms caching model
2. `src/controllers/licenseTermsController.ts` - Find and cache endpoints
3. `src/controllers/marketplaceController.ts` - Marketplace query API
4. `src/routes/licenseTerms.routes.ts` - License terms routes
5. `src/routes/marketplace.routes.ts` - Marketplace routes
6. `src/scripts/seedLicenseTerms.ts` - Database seeder for presets

### Modified Files
1. `src/models/MintToken.ts` - Added license fields and indexes
2. `src/controllers/verificationController.ts` - Added `finalizeMintToken` endpoint
3. `src/routes/verification.routes.ts` - Added finalize route
4. `src/app.ts` - Registered license-terms and marketplace routes
5. `package.json` - Added `seed:license-terms` script

## Validation Rules

### License Type
- Must be `commercial_remix` or `non_commercial`
- Case-sensitive

### Royalty Percentage
- Must be a number between 0 and 100 (inclusive)
- Decimal values allowed (e.g., 12.5%)

### License Terms ID
- Required string from Story Protocol
- Typically numeric but stored as string

### Transaction Hashes
- Must be valid Ethereum transaction hashes
- Format: `0x` followed by 64 hexadecimal characters

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_INPUT` | 400 | Missing or invalid required fields |
| `VALIDATION_ERROR` | 422 | Invalid data format or values |
| `TOKEN_NOT_FOUND` | 404 | Token with specified nonce not found |
| `INVALID_STATUS` | 409 | Token status not valid for operation |
| `ALREADY_FINALIZED` | 409 | Token already has license terms attached |
| `SERVER_ERROR` | 500 | Internal server error |

## Authentication

### JWT Required Endpoints
- `POST /api/license-terms/cache`
- `PATCH /api/verification/token/:nonce/finalize`

### JWT Format
```
Authorization: Bearer <jwt_token>
```

## Testing

### Manual Testing with cURL

#### 1. Find License Terms (Public)
```bash
curl "http://localhost:5001/api/license-terms/find?type=commercial_remix&royalty=10"
```

#### 2. Cache License Terms (Protected)
```bash
curl -X POST http://localhost:5001/api/license-terms/cache \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "licenseType": "commercial_remix",
    "royaltyPercent": 12,
    "licenseTermsId": "42",
    "transactionHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
  }'
```

#### 3. Finalize Token (Protected)
```bash
curl -X PATCH http://localhost:5001/api/verification/token/123/finalize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "licenseTermsId": "10",
    "licenseType": "commercial_remix",
    "royaltyPercent": 10,
    "allowDerivatives": true,
    "commercialUse": true,
    "licenseTxHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
  }'
```

#### 4. Query Marketplace (Public)
```bash
# Basic query
curl "http://localhost:5001/api/marketplace/ips"

# With filters
curl "http://localhost:5001/api/marketplace/ips?commercialUse=true&maxRoyalty=15&page=1&limit=10"

# Filter by license type
curl "http://localhost:5001/api/marketplace/ips?licenseType=commercial_remix&minRoyalty=10&maxRoyalty=20"
```

## Performance Optimizations

### Database Indexes
- **LicenseTermsCache**: Compound unique index on `(licenseType, royaltyPercent)` ensures O(1) cache lookups
- **MintToken**: Individual indexes on license fields enable fast marketplace queries

### Pagination
- Default limit: 20 items
- Maximum limit: 100 items
- Prevents large dataset transfers

### Query Optimization
- Parallel MongoDB queries for counts and results
- Lean queries (plain JavaScript objects instead of Mongoose documents)
- Selective field projection reduces data transfer

## Gas Cost Savings

### Without Caching
Each unique license configuration requires a blockchain transaction:
- 10% commercial: ~50,000 gas
- 12% commercial: ~50,000 gas
- 20% commercial: ~50,000 gas
- **Total**: ~150,000 gas

### With Caching
Reuse existing license terms IDs:
- First registration: ~50,000 gas
- Subsequent uses: 0 gas (reuse ID)
- **Savings**: Up to 90% for common configurations

## Monitoring

### Key Metrics to Track
1. **Cache Hit Rate**: `cached / total_lookups`
2. **Popular License Types**: Distribution of license types
3. **Royalty Distribution**: Common royalty percentages
4. **Marketplace Queries**: Most common filter combinations

### Logs
All operations are logged with context:
```typescript
logger.info('Finding license terms', { licenseType, royaltyPercent });
logger.info('License terms found in cache', { licenseTermsId });
logger.warn('License terms not found in cache');
logger.error('Error caching license terms', { error: error.message });
```

## Next Steps

1. **Testing**: Create comprehensive Jest tests for all endpoints
2. **Frontend Integration**: Update frontend to use new license endpoints
3. **Analytics**: Build dashboard for license statistics
4. **Advanced Filters**: Add search by creator address, date ranges
5. **License Templates**: Create preset license templates for users
6. **Royalty Calculator**: Build tool to estimate royalty earnings

## Related Documentation
- [RAG_IMPLEMENTATION.md](./RAG_IMPLEMENTATION.md) - Similarity engine
- [VOYAGE_TOGETHER_INTEGRATION.md](./VOYAGE_TOGETHER_INTEGRATION.md) - AI services
- [STAGE3_BACKEND_API_SPEC.md](./STAGE3_BACKEND_API_SPEC.md) - API specification

---

**Implementation Date**: December 2024  
**Version**: 1.0.0  
**Status**: ✅ Complete - Ready for testing
