# Frontend Integration Guide - License Token Tracking

## Quick Reference

Base URL: `http://localhost:3001/api` (Development)

**All endpoints are public** - No authentication required during development.

---

## 🎯 Common Use Cases

### 1. Record License Purchase (After Minting)

**When to use**: After successfully minting a license token on-chain via Story Protocol SDK.

```typescript
// After minting license token on-chain
const mintResult = await storyClient.License.mintLicenseTokens({
  licenseTermsId: "2665",
  licensorIpId: ipAsset.ipId,
  amount: 1,
  receiver: userWalletAddress,
  txOptions: { waitForTransaction: true }
});

// Record in backend
const response = await fetch('http://localhost:3001/api/license-tokens/mint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    licenseTokenId: mintResult.licenseTokenIds[0].toString(),
    txHash: mintResult.txHash,
    blockNumber: mintResult.blockNumber,
    ipId: ipAsset.ipId,
    ipTokenId: ipAsset.tokenId,
    licenseTermsId: "2665",
    licenseeAddress: userWalletAddress,
    amount: 1,
    mintingFee: "0", // or actual fee paid
    currency: "0xB132A6B7AE652c974EE1557A3521D53d18F6739f",
    royaltyPercentage: 10,
    licenseTerms: {
      commercialUse: true,
      derivativesAllowed: true,
      transferable: true
    },
    metadata: {
      ipMetadataURI: ipAsset.metadataURI,
      nftMetadataURI: ipAsset.nftMetadataURI,
      ipType: "Text", // "Text" | "Image" | "Video" | "Audio"
      ipTitle: "My IP Asset Title"
    }
  })
});

const data = await response.json();
// data.data.licenseTokenId - The recorded license token ID
// data.data.explorerUrl - Link to transaction on block explorer
```

---

### 2. Display User's Purchased Licenses

**When to use**: Show all licenses owned by a user in their dashboard.

```typescript
// Fetch all licenses for a user
const response = await fetch(
  `http://localhost:3001/api/license-tokens/user/${walletAddress}?page=1&limit=20`
);

const data = await response.json();

// Display licenses
data.data.licenses.forEach(license => {
  console.log({
    id: license.licenseTokenId,
    ipTitle: license.ipTitle,
    ipType: license.ipType,
    status: license.status, // "active" | "expired" | "revoked" | "transferred"
    mintedAt: license.mintedAt, // Unix timestamp
    canUseCommercially: license.licenseTerms.commercialUse,
    canCreateDerivatives: license.licenseTerms.derivativesAllowed,
    usageCount: license.usageCount,
    derivativesCreated: license.derivativeCount
  });
});

// Pagination info
console.log({
  currentPage: data.data.pagination.currentPage,
  totalPages: data.data.pagination.totalPages,
  hasMore: data.data.pagination.hasNext
});
```

**With Filters**:
```typescript
// Filter by status
const activeOnly = await fetch(
  `http://localhost:3001/api/license-tokens/user/${walletAddress}?status=active`
);

// Filter by IP type
const imagesOnly = await fetch(
  `http://localhost:3001/api/license-tokens/user/${walletAddress}?ipType=Image`
);

// Sort by newest first
const newest = await fetch(
  `http://localhost:3001/api/license-tokens/user/${walletAddress}?sortBy=timestamp&sortOrder=desc`
);
```

---

### 3. Display Licensed IPs in Marketplace

**When to use**: Show all IPs available for licensing in marketplace.

```typescript
// Get all licensed IPs
const response = await fetch(
  'http://localhost:3001/api/marketplace/licensed?page=1&limit=20'
);

const data = await response.json();

// Display marketplace listings
data.data.ips.forEach(ip => {
  console.log({
    ipId: ip.ipId,
    tokenId: ip.tokenId,
    creator: ip.creatorAddress,
    title: ip.metadata.nftMetadataURI, // Fetch from IPFS for full metadata
    licenseType: ip.license.licenseType, // "commercial_remix" | "non_commercial"
    royalty: ip.license.royaltyPercent, // 0-100
    commercialUse: ip.license.commercialUse,
    allowDerivatives: ip.license.allowDerivatives,
    licensedAt: ip.license.licenseAttachedAt // Unix timestamp
  });
});
```

**With Filters**:
```typescript
// Commercial use only
const commercial = await fetch(
  'http://localhost:3001/api/marketplace/licensed?commercialUse=true'
);

// Low royalty IPs (≤ 5%)
const lowRoyalty = await fetch(
  'http://localhost:3001/api/marketplace/licensed?maxRoyalty=5'
);

// Specific license type
const commercialRemix = await fetch(
  'http://localhost:3001/api/marketplace/licensed?licenseType=commercial_remix'
);
```

---

### 4. Show IP Analytics (Creator Dashboard)

**When to use**: Display licensing statistics for an IP asset owner.

```typescript
// Get analytics for a specific IP
const response = await fetch(
  `http://localhost:3001/api/license-tokens/analytics/ip/${ipId}`
);

const data = await response.json();

// Display analytics
console.log({
  // Overview
  totalLicensesSold: data.data.overview.totalLicensesMinted,
  activeLicenses: data.data.overview.activeLicenses,
  uniqueBuyers: data.data.overview.uniqueLicensees,
  totalRevenue: data.data.overview.totalRevenue, // in wei
  averagePrice: data.data.overview.averageMintingFee, // in wei
  
  // Derivatives
  totalDerivatives: data.data.derivatives.totalDerivatives,
  avgDerivativesPerLicense: data.data.derivatives.averageDerivativesPerLicense,
  
  // Top buyers
  topLicensees: data.data.topLicensees.map(buyer => ({
    address: buyer.address,
    licensesPurchased: buyer.licenseCount,
    derivativesCreated: buyer.derivativeCount,
    totalSpent: buyer.totalSpent // in wei
  }))
});
```

---

### 5. Verify License Ownership

**When to use**: Before allowing a user to create derivatives or use an IP commercially.

```typescript
// Check if user owns a specific license
const response = await fetch(
  `http://localhost:3001/api/license-tokens/verify/${licenseTokenId}/owner/${walletAddress}`
);

const data = await response.json();

if (data.data.isOwner && data.data.isValid) {
  // User owns the license and it's valid
  if (data.data.licenseTerms.derivativesAllowed) {
    // Allow derivative creation
  }
  if (data.data.licenseTerms.commercialUse) {
    // Allow commercial use
  }
} else {
  // User doesn't own license or it's expired/revoked
  console.log("Access denied:", data.data.status);
}
```

---

### 6. Track Derivative Creation

**When to use**: After a user creates a derivative using a license token.

```typescript
// After registering derivative on-chain
const derivativeResult = await storyClient.IPAsset.registerDerivative({
  childIpId: newDerivativeIpId,
  parentIpIds: [parentIpId],
  licenseTokenIds: [licenseTokenId],
  txOptions: { waitForTransaction: true }
});

// Update license usage
const response = await fetch(
  `http://localhost:3001/api/license-tokens/${licenseTokenId}/usage`,
  {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'derivative_created',
      derivativeIpId: newDerivativeIpId
    })
  }
);

const data = await response.json();
// data.data.derivativeCount - Updated count
```

---

### 7. Platform Statistics (Admin Dashboard)

**When to use**: Display global platform metrics.

```typescript
const response = await fetch(
  'http://localhost:3001/api/license-tokens/stats/global'
);

const data = await response.json();

console.log({
  totalLicenses: data.data.totalLicensesMinted,
  totalIPs: data.data.totalIPsLicensed,
  totalUsers: data.data.totalLicensees,
  platformRevenue: data.data.totalRevenue, // in wei
  activeLicenses: data.data.activeLicenses,
  totalDerivatives: data.data.totalDerivatives,
  
  // Top performing IPs
  topIPs: data.data.topIPs.map(ip => ({
    ipId: ip.ipId,
    title: ip.title,
    licensesSold: ip.licenseCount,
    revenue: ip.revenue
  })),
  
  // Recent activity
  recentMints: data.data.recentMints.map(mint => ({
    licenseId: mint.licenseTokenId,
    ipTitle: mint.ipTitle,
    buyer: mint.licenseeAddress,
    timestamp: mint.timestamp
  }))
});
```

---

## 📋 Complete API Reference

### 1. Record License Mint
**POST** `/api/license-tokens/mint`

**Request Body**:
```typescript
{
  licenseTokenId: string;        // Required
  txHash: string;                // Required
  blockNumber?: number;
  ipId: string;                  // Required
  ipTokenId?: number;
  licenseTermsId: string;        // Required
  licenseeAddress: string;       // Required
  amount?: number;               // Default: 1
  mintingFee?: string;           // Default: "0" (in wei)
  currency?: string;             // Default: Story testnet currency
  royaltyPercentage?: number;    // 0-100, Default: 0
  licenseTerms?: {
    commercialUse: boolean;
    derivativesAllowed: boolean;
    transferable: boolean;
    expirationDate?: number;     // Unix timestamp
    territories?: string[];
  };
  metadata?: {
    ipMetadataURI: string;
    nftMetadataURI: string;
    ipType: string;              // "Text" | "Image" | "Video" | "Audio"
    ipTitle?: string;
  };
}
```

**Response (201)**:
```typescript
{
  success: true,
  data: {
    id: string;
    licenseTokenId: string;
    txHash: string;
    status: "active";
    blockNumber: number;
    timestamp: number;
    explorerUrl: string;
  },
  message: "License token mint recorded successfully"
}
```

---

### 2. Get User's Licenses
**GET** `/api/license-tokens/user/:walletAddress`

**Query Parameters**:
- `status` (optional): `"active"` | `"expired"` | `"revoked"` | `"transferred"`
- `ipType` (optional): `"Text"` | `"Image"` | `"Video"` | `"Audio"`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `sortBy` (optional): `"timestamp"` | `"licenseTokenId"` (default: `"timestamp"`)
- `sortOrder` (optional): `"asc"` | `"desc"` (default: `"desc"`)

**Response (200)**:
```typescript
{
  success: true,
  data: {
    licenses: Array<{
      id: string;
      licenseTokenId: string;
      txHash: string;
      ipId: string;
      ipTitle: string;
      ipType: string;
      status: string;
      mintedAt: number;
      licenseTerms: object;
      usageCount: number;
      derivativeCount: number;
    }>,
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNext: boolean;
      hasPrev: boolean;
    }
  }
}
```

---

### 3. Get Licenses for IP
**GET** `/api/license-tokens/ip/:ipId`

**Query Parameters**:
- `status` (optional): Filter by license status
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response (200)**:
```typescript
{
  success: true,
  data: {
    ipId: string;
    licenses: Array<{
      licenseTokenId: string;
      licenseeAddress: string;
      status: string;
      mintedAt: number;
      usageCount: number;
      derivativeCount: number;
    }>,
    analytics: {
      totalLicensesMinted: number;
      activeLicenses: number;
      uniqueLicensees: number;
      totalRevenue: string;
      lastMintedAt: number;
    },
    pagination: object;
  }
}
```

---

### 4. Get License Details
**GET** `/api/license-tokens/:licenseTokenId`

**Response (200)**: Complete license token object

---

### 5. Update License Usage
**PATCH** `/api/license-tokens/:licenseTokenId/usage`

**Request Body**:
```typescript
{
  action: "derivative_created" | "commercial_use" | "transfer";
  derivativeIpId?: string;  // Required if action = "derivative_created"
  newOwner?: string;        // Required if action = "transfer"
}
```

---

### 6. Get IP Analytics
**GET** `/api/license-tokens/analytics/ip/:ipId`

**Query Parameters**:
- `startDate` (optional): Unix timestamp
- `endDate` (optional): Unix timestamp
- `groupBy` (optional): `"day"` | `"week"` | `"month"`

---

### 7. Get Global Stats
**GET** `/api/license-tokens/stats/global`

Returns platform-wide statistics.

---

### 8. Verify Ownership
**GET** `/api/license-tokens/verify/:licenseTokenId/owner/:walletAddress`

**Response (200)**:
```typescript
{
  success: true,
  data: {
    isOwner: boolean;
    licenseTokenId: string;
    status: string;
    isValid: boolean;
    expiresAt: number | null;
    licenseTerms: object;
  }
}
```

---

### 9. Get Licensed IPs (Marketplace)
**GET** `/api/marketplace/licensed`

**Query Parameters**:
- `commercialUse`: `true` | `false`
- `licenseType`: `"commercial_remix"` | `"non_commercial"`
- `minRoyalty`: 0-100
- `maxRoyalty`: 0-100
- `page`: Page number
- `limit`: Items per page

**Response (200)**:
```typescript
{
  success: true,
  data: {
    ips: Array<{
      nonce: number;
      ipId: string;
      tokenId: number;
      creatorAddress: string;
      contentHash: string;
      status: string;
      metadata: {
        ipMetadataURI: string;
        nftMetadataURI: string;
      };
      license: {
        licenseTermsId: string;
        licenseType: string;
        royaltyPercent: number;
        allowDerivatives: boolean;
        commercialUse: boolean;
        licenseTxHash: string;
        licenseAttachedAt: number;
      };
      registeredAt: number;
    }>,
    pagination: object;
    filters: object;
  }
}
```

---

## 🔄 Common Workflows

### Workflow 1: User Purchases License

```typescript
// 1. Browse marketplace
const marketplace = await fetch('/api/marketplace/licensed?page=1');

// 2. User selects an IP and mints license (Story Protocol SDK)
const mintResult = await storyClient.License.mintLicenseTokens({...});

// 3. Record purchase in backend
await fetch('/api/license-tokens/mint', {
  method: 'POST',
  body: JSON.stringify({
    licenseTokenId: mintResult.licenseTokenIds[0].toString(),
    txHash: mintResult.txHash,
    // ... other fields
  })
});

// 4. Redirect to user's licenses page
const userLicenses = await fetch(`/api/license-tokens/user/${walletAddress}`);
```

### Workflow 2: User Creates Derivative

```typescript
// 1. Get user's licenses
const licenses = await fetch(`/api/license-tokens/user/${walletAddress}`);

// 2. Verify license allows derivatives
const verification = await fetch(
  `/api/license-tokens/verify/${licenseTokenId}/owner/${walletAddress}`
);

if (verification.data.licenseTerms.derivativesAllowed) {
  // 3. Register derivative (Story Protocol SDK)
  const derivative = await storyClient.IPAsset.registerDerivative({...});
  
  // 4. Update usage stats
  await fetch(`/api/license-tokens/${licenseTokenId}/usage`, {
    method: 'PATCH',
    body: JSON.stringify({
      action: 'derivative_created',
      derivativeIpId: derivative.ipId
    })
  });
}
```

### Workflow 3: Creator Views Analytics

```typescript
// 1. Get all IPs created by user
const userAssets = await fetch(`/api/assets/wallet/${walletAddress}`);

// 2. For each IP, get analytics
for (const asset of userAssets.data.assets) {
  const analytics = await fetch(`/api/license-tokens/analytics/ip/${asset.ipId}`);
  
  // Display:
  // - Total licenses sold
  // - Revenue earned
  // - Top licensees
  // - Derivative activity
}
```

---

## 🛠️ Error Handling

All endpoints return consistent error format:

```typescript
{
  success: false,
  error: "LT001" | "LT002" | "LT003" | ... | "LT010",
  message: "Detailed error message"
}
```

**Error Codes**:
- `LT001`: Invalid license token data
- `LT002`: License token already recorded
- `LT003`: Transaction hash already recorded
- `LT004`: License token not found
- `LT009`: Invalid wallet address
- `LT010`: Database/server error

**Example Error Handling**:
```typescript
const response = await fetch('/api/license-tokens/mint', {
  method: 'POST',
  body: JSON.stringify(data)
});

const result = await response.json();

if (!result.success) {
  switch (result.error) {
    case 'LT002':
      console.error('License already recorded');
      break;
    case 'LT001':
      console.error('Invalid data:', result.message);
      break;
    default:
      console.error('Error:', result.message);
  }
}
```

---

## 💡 Best Practices

1. **Always record after on-chain confirmation**
   - Wait for transaction confirmation before calling `/mint`
   - Pass actual blockchain data, not predicted values

2. **Handle pagination properly**
   - Use `hasNext` and `hasPrev` to show navigation
   - Default limit is 20, max is 100

3. **Cache static data**
   - IP metadata URIs don't change
   - License terms are snapshots

4. **Update usage in real-time**
   - Call `/usage` endpoint immediately after derivative creation
   - Keeps analytics accurate

5. **Verify before actions**
   - Always verify ownership before allowing derivative creation
   - Check `isValid` flag for expired licenses

6. **Display readable formats**
   - Convert wei to ETH for display: `ethers.formatEther(wei)`
   - Convert timestamps: `new Date(timestamp * 1000)`

---

## 🧪 Testing

Run tests:
```bash
npm run test
```

Test coverage includes:
- ✅ License mint recording
- ✅ User license queries with filters
- ✅ IP analytics calculations
- ✅ Ownership verification
- ✅ Usage tracking
- ✅ Marketplace order creation
- ✅ Global statistics
- ✅ Error scenarios

---

## 📞 Support

For issues or questions:
1. Check error codes and messages
2. Verify request body matches schema
3. Ensure wallet addresses are checksummed format
4. Check CORS settings if calling from different origin

---

**Last Updated**: December 12, 2025
