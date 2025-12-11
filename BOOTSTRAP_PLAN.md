# 🚀 ORION SERVER - BOOTSTRAP PLAN
## IP Protection & Story Protocol Integration Backend

**Project:** Content Fingerprinting + Story Protocol Derivative Tracking
**Date:** December 12, 2025
**Status:** Initial Commit Planning

---

## 📖 PROJECT VISION & FEEL

### **What We're Building**
A backend service that acts as the **intelligent layer** between content creators and Story Protocol's IP registry. This isn't just another CRUD API - it's a **content forensics engine** that:

- **Fingerprints** uploaded media files (videos, images, audio) using perceptual hashing
- **Detects** derivative works through similarity matching algorithms
- **Enforces** IP relationships by auto-linking derivatives to parent IPs on Story Protocol
- **Mediates** disputes when similarity falls in gray areas (70-90% match)
- **Orchestrates** blockchain interactions with Story Protocol SDK

### **The Vibe**
Think of this as **"Content Police meets Smart Contracts"** - we're building:
- 🕵️ **Detection First**: Every upload gets fingerprinted and compared
- ⚖️ **Fair but Firm**: Clear thresholds for clean/warning/review/derivative
- 🤝 **Dispute Resolution**: Human-in-the-loop for edge cases
- 🔗 **Blockchain Native**: Story Protocol integration for immutable IP records
- 📦 **Decentralized Storage**: IPFS via Pinata for all content

### **Key Differences from RWA Platform**
Unlike the existing RWA tokenization spec, this backend focuses on:
- **Content analysis** over asset management
- **Similarity detection** over simple metadata storage
- **Derivative tracking** over token economics
- **Story Protocol** over Flow blockchain
- **Admin mediation** for IP disputes

---

## 🏗️ DIRECTORY STRUCTURE

```
orion-server/
│
├── src/
│   ├── config/
│   │   ├── database.js              # MongoDB connection & config
│   │   ├── storyProtocol.js         # Story Protocol SDK initialization
│   │   ├── pinata.js                # IPFS/Pinata client setup
│   │   └── constants.js             # Similarity thresholds, enums
│   │
│   ├── models/
│   │   ├── User.js                  # User schema (wallet, roles)
│   │   ├── IpFingerprint.js         # Fingerprint records (hash, CID, status)
│   │   ├── SimilarityDispute.js     # Gray area disputes (70-90%)
│   │   └── DerivativeLink.js        # Parent-child IP relationships
│   │
│   ├── controllers/
│   │   ├── authController.js        # Wallet auth, JWT generation
│   │   ├── fingerprintController.js # Upload, hash generation
│   │   ├── similarityController.js  # Similarity check logic
│   │   ├── storyController.js       # Story Protocol operations
│   │   ├── disputeController.js     # Admin dispute resolution
│   │   └── assetController.js       # Asset metadata CRUD
│   │
│   ├── services/
│   │   ├── fingerprintService.js    # SHA256 + pHash generation
│   │   ├── similarityEngine.js      # Hamming distance, threshold logic
│   │   ├── ipfsService.js           # Pinata upload/pin operations
│   │   ├── storyService.js          # SDK wrappers (registerIpAsset, etc.)
│   │   ├── notificationService.js   # Email/webhook alerts
│   │   └── queueService.js          # Optional: Bull/Redis for heavy jobs
│   │
│   ├── middleware/
│   │   ├── auth.js                  # JWT verification
│   │   ├── roleCheck.js             # RBAC (admin, creator, public)
│   │   ├── upload.js                # Multer config for file uploads
│   │   ├── errorHandler.js          # Global error handling
│   │   └── rateLimiter.js           # Express-rate-limit config
│   │
│   ├── routes/
│   │   ├── auth.routes.js           # POST /auth/login, /register, /verify-wallet
│   │   ├── fingerprint.routes.js    # POST /api/fingerprint
│   │   ├── similarity.routes.js     # POST /api/check-similarity
│   │   ├── story.routes.js          # POST /api/story/register-ip, /attach-license
│   │   ├── dispute.routes.js        # GET /api/disputes, POST /resolve
│   │   └── asset.routes.js          # CRUD for asset metadata
│   │
│   ├── utils/
│   │   ├── hashGenerator.js         # Crypto utils (SHA256, pHash algorithms)
│   │   ├── similarity.js            # Hamming distance calculator
│   │   ├── validators.js            # Input validation helpers
│   │   ├── logger.js                # Winston/Pino logger setup
│   │   └── responseFormatter.js     # Standardized API responses
│   │
│   ├── jobs/
│   │   ├── fingerprintWorker.js     # Background job for heavy hashing
│   │   └── ipfsWorker.js            # Async IPFS uploads
│   │
│   └── app.js                       # Express app initialization
│   └── server.js                    # HTTP server + port binding
│
├── tests/
│   ├── unit/
│   │   ├── fingerprint.test.js
│   │   ├── similarity.test.js
│   │   └── storyService.test.js
│   └── integration/
│       └── api.test.js
│
├── scripts/
│   ├── seedDb.js                    # Sample data for development
│   └── setupIndexes.js              # MongoDB index creation
│
├── docs/
│   ├── API.md                       # API documentation
│   ├── SIMILARITY_LOGIC.md          # Threshold explanation
│   └── STORY_INTEGRATION.md         # Story Protocol guide
│
├── uploads/                         # Temporary file storage (gitignored)
│
├── .env.example                     # Environment template
├── .gitignore
├── package.json
├── package-lock.json
├── README.md
├── BACKEND_SPEC.md                  # (existing)
├── cretical_sequence.mmd            # (existing)
└── BOOTSTRAP_PLAN.md                # (this file)
```

---

## 🛠️ TECHNOLOGY STACK

### **Core Framework**
```json
{
  "runtime": "Node.js 18+",
  "framework": "Express.js 4.18+",
  "language": "JavaScript (ES6+) or TypeScript (optional)"
}
```

### **Blockchain & Storage**
```json
{
  "blockchain": "@story-protocol/core-sdk",
  "web3": "ethers.js 6.x",
  "ipfs": "pinata-sdk or @pinata/sdk 2.x",
  "network": "Story Protocol Testnet (Odyssey)"
}
```

### **Database**
```json
{
  "database": "MongoDB 6+",
  "odm": "mongoose 8.x",
  "indexes": "text search on hashes, compound on status+timestamp"
}
```

### **Fingerprinting & Media**
```json
{
  "hashing": "crypto (built-in SHA256)",
  "perceptual": "sharp (image pHash), fluent-ffmpeg (video frames)",
  "similarity": "hamming-distance or custom algorithm",
  "fileUpload": "multer with file-type validation"
}
```

### **Authentication & Security**
```json
{
  "auth": "jsonwebtoken (JWT)",
  "walletAuth": "ethers.js signature verification",
  "encryption": "bcryptjs (if password auth needed)",
  "cors": "cors middleware",
  "rateLimit": "express-rate-limit"
}
```

### **Utilities**
```json
{
  "validation": "express-validator or joi",
  "logging": "winston or pino",
  "environment": "dotenv",
  "jobs": "bull + redis (optional for background tasks)",
  "testing": "jest + supertest"
}
```

---

## 📦 PACKAGE.JSON (Initial Dependencies)

```json
{
  "name": "orion-server",
  "version": "1.0.0",
  "description": "IP Protection & Story Protocol Integration Backend",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest --coverage",
    "seed": "node scripts/seedDb.js",
    "setup-indexes": "node scripts/setupIndexes.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "dotenv": "^16.3.1",
    "@story-protocol/core-sdk": "^latest",
    "ethers": "^6.9.0",
    "@pinata/sdk": "^2.1.0",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.0",
    "fluent-ffmpeg": "^2.1.2",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "express-validator": "^7.0.1",
    "express-rate-limit": "^7.1.5",
    "winston": "^3.11.0",
    "bull": "^4.12.0",
    "redis": "^4.6.11"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }
}
```

---

## 🔐 ENVIRONMENT VARIABLES (.env.example)

```bash
# Server Configuration
NODE_ENV=development
PORT=3001
API_BASE_URL=http://localhost:3001

# Database
MONGODB_URI=mongodb://localhost:27017/orion-ip-tracking
MONGODB_TEST_URI=mongodb://localhost:27017/orion-test

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=24h

# Story Protocol
STORY_PROTOCOL_NETWORK=odyssey
STORY_PROTOCOL_RPC_URL=https://odyssey.storyrpc.io
STORY_PROTOCOL_CHAIN_ID=1516
STORY_PROTOCOL_PRIVATE_KEY=0xYourPrivateKeyForAdminOperations

# IPFS / Pinata
PINATA_API_KEY=your-pinata-api-key
PINATA_SECRET_KEY=your-pinata-secret-key
PINATA_JWT=your-pinata-jwt-token
PINATA_GATEWAY=https://gateway.pinata.cloud

# File Upload Limits
MAX_FILE_SIZE=100000000
ALLOWED_MIME_TYPES=video/mp4,video/quicktime,image/png,image/jpeg

# Similarity Thresholds (0-100 scale)
SIMILARITY_CLEAN_MAX=40
SIMILARITY_WARNING_MIN=40
SIMILARITY_WARNING_MAX=70
SIMILARITY_REVIEW_MIN=70
SIMILARITY_REVIEW_MAX=90
SIMILARITY_DERIVATIVE_MIN=90

# Redis (for background jobs)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Notification Service (optional)
NOTIFICATION_EMAIL_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug
LOG_FILE_PATH=./logs/app.log
```

---

## 🗄️ DATABASE SCHEMAS

### **1. User Model**
```javascript
// src/models/User.js
{
  _id: ObjectId,
  walletAddress: String (unique, indexed, required),
  email: String (optional, unique),
  roles: [String], // ['creator', 'admin']
  nonce: String, // for wallet signature verification
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date
}
```

### **2. IpFingerprint Model**
```javascript
// src/models/IpFingerprint.js
{
  _id: ObjectId,

  // Hashing Data
  sha256Hash: String (indexed, unique),
  perceptualHash: String (indexed), // pHash for similarity

  // File Metadata
  originalFilename: String,
  mimeType: String,
  fileSize: Number,
  duration: Number, // for videos/audio

  // IPFS Storage
  ipfsCid: String (indexed),
  ipfsUrl: String,
  pinataMetadata: Object,

  // Story Protocol Integration
  storyIpId: String (indexed, optional), // 0xIP_A...
  storyTokenId: Number,
  licenseTermsId: String,

  // Ownership
  creatorWallet: String (indexed),
  creatorUserId: ObjectId (ref: 'User'),

  // Status Tracking
  status: String, // 'pending', 'registered', 'disputed', 'rejected'
  isDerivative: Boolean (default: false),
  parentIpId: String, // if derivative

  // Similarity Scores (cached)
  highestSimilarityScore: Number (default: 0),
  matchedParentId: ObjectId (ref: 'IpFingerprint'),

  // Timestamps
  createdAt: Date,
  registeredAt: Date,
  updatedAt: Date
}
```

### **3. SimilarityDispute Model**
```javascript
// src/models/SimilarityDispute.js
{
  _id: ObjectId,

  // Dispute Details
  childFingerprintId: ObjectId (ref: 'IpFingerprint'),
  parentFingerprintId: ObjectId (ref: 'IpFingerprint'),
  similarityScore: Number,

  // User Context
  uploaderWallet: String,
  originalCreatorWallet: String,

  // Admin Review
  status: String, // 'pending', 'approved_as_original', 'enforced_derivative', 'rejected'
  reviewedBy: ObjectId (ref: 'User'),
  reviewNotes: String,

  // Resolution
  resolutionAction: String, // 'approved', 'linked', 'rejected'
  resolutionTxHash: String, // Story Protocol tx if enforced

  // Timestamps
  createdAt: Date,
  resolvedAt: Date
}
```

### **4. DerivativeLink Model**
```javascript
// src/models/DerivativeLink.js
{
  _id: ObjectId,

  // IP Relationship
  parentIpId: String (indexed), // Story Protocol IP ID
  childIpId: String (indexed),

  // License Terms
  licenseTermsId: String,
  licenseTokenId: Number,
  royaltyPercentage: Number,

  // Link Type
  linkType: String, // 'auto_detected', 'user_declared', 'admin_enforced'

  // Transaction Details
  txHash: String,
  blockNumber: Number,

  // Timestamps
  linkedAt: Date,
  createdAt: Date
}
```

### **5. MongoDB Indexes**
```javascript
// Auto-run in scripts/setupIndexes.js
db.users.createIndex({ walletAddress: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true, sparse: true });

db.ipfingerprints.createIndex({ sha256Hash: 1 }, { unique: true });
db.ipfingerprints.createIndex({ perceptualHash: 1 });
db.ipfingerprints.createIndex({ storyIpId: 1 });
db.ipfingerprints.createIndex({ creatorWallet: 1 });
db.ipfingerprints.createIndex({ status: 1 });
db.ipfingerprints.createIndex({ createdAt: -1 });

db.similaritydisputes.createIndex({ status: 1 });
db.similaritydisputes.createIndex({ createdAt: -1 });

db.derivativelinks.createIndex({ parentIpId: 1 });
db.derivativelinks.createIndex({ childIpId: 1 });
```

---

## 🎯 API ENDPOINT STRUCTURE

### **Authentication Routes** (`/auth`)
```
POST   /auth/wallet-login        # Wallet signature verification
POST   /auth/wallet-verify       # Check if wallet is registered
GET    /auth/profile             # Get current user profile
POST   /auth/logout              # Invalidate session
```

### **Fingerprint Routes** (`/api/fingerprint`)
```
POST   /api/fingerprint          # Upload file, generate hash, store IPFS
GET    /api/fingerprint/:id      # Get fingerprint details
GET    /api/fingerprint/hash/:hash  # Lookup by hash
DELETE /api/fingerprint/:id      # Delete pending fingerprint
```

### **Similarity Routes** (`/api/similarity`)
```
POST   /api/check-similarity     # Check hash against database
GET    /api/similarity/matches/:id  # Get all matches for a fingerprint
POST   /api/similarity/report    # User-initiated similarity report
```

### **Story Protocol Routes** (`/api/story`)
```
POST   /api/story/register-ip           # Register IP asset on Story Protocol
POST   /api/story/attach-license        # Attach license terms to IP
POST   /api/story/register-derivative   # Link child to parent IP
POST   /api/story/mint-license-token    # Mint license for derivative
GET    /api/story/ip/:ipId              # Get IP details from Story
```

### **Dispute Routes** (`/api/disputes`)
```
GET    /api/disputes               # Get all disputes (admin)
GET    /api/disputes/pending       # Get pending disputes
GET    /api/disputes/:id           # Get dispute details
POST   /api/disputes/create        # Create new dispute
POST   /api/disputes/:id/resolve   # Admin resolve dispute
POST   /api/disputes/:id/comment   # Add review notes
```

### **Asset Routes** (`/api/assets`)
```
GET    /api/assets                 # List all assets (paginated)
GET    /api/assets/:id             # Get asset details
GET    /api/assets/wallet/:address # Get assets by creator
PATCH  /api/assets/:id             # Update asset metadata
DELETE /api/assets/:id             # Delete asset (admin only)
```

### **Health & Admin Routes**
```
GET    /health                     # Service health check
GET    /admin/stats                # Platform statistics
GET    /admin/recent-uploads       # Recent activity
```

---

## 🧩 KEY SERVICES EXPLAINED

### **1. Fingerprint Service** (`services/fingerprintService.js`)
**Responsibilities:**
- Generate SHA256 hash from file buffer
- Extract video frames using ffmpeg
- Generate perceptual hash (pHash) for images/video frames
- Normalize hashes for comparison
- Handle multiple file types (video, image, audio)

**Key Functions:**
```javascript
async generateFingerprint(fileBuffer, mimeType)
  → Returns { sha256Hash, perceptualHash, metadata }

async extractVideoFrame(fileBuffer, timestamp)
  → Returns frame buffer for pHash generation

async generatePerceptualHash(imageBuffer)
  → Returns pHash string for similarity matching
```

### **2. Similarity Engine** (`services/similarityEngine.js`)
**Responsibilities:**
- Calculate Hamming distance between perceptual hashes
- Apply threshold logic (clean/warning/review/derivative)
- Query database for potential matches
- Return similarity score + parent IP references

**Key Functions:**
```javascript
async checkSimilarity(perceptualHash)
  → Returns { score, status, matchedFingerprint }

calculateHammingDistance(hash1, hash2)
  → Returns distance (0-100 scale)

determineStatus(score)
  → Returns 'CLEAN' | 'WARNING' | 'REVIEW_REQUIRED' | 'DERIVATIVE'
```

### **3. Story Service** (`services/storyService.js`)
**Responsibilities:**
- Initialize Story Protocol SDK client
- Register IP assets on-chain
- Attach Commercial Remix PIL licenses
- Create derivative relationships
- Mint license tokens

**Key Functions:**
```javascript
async registerIpAsset(nftContract, tokenId, ipMetadata)
  → Returns { ipId, txHash }

async attachCommercialRemixLicense(ipId, royaltyPercent)
  → Returns { licenseTermsId, txHash }

async registerDerivative(childIpId, parentIpId, licenseTokenId)
  → Returns { txHash, success }

async mintLicenseToken(parentIpId, licenseTermsId, amount)
  → Returns { licenseTokenId, txHash }
```

### **4. IPFS Service** (`services/ipfsService.js`)
**Responsibilities:**
- Upload files to Pinata
- Pin metadata JSON to IPFS
- Generate IPFS URIs (ipfs://...)
- Handle unpinning for deleted assets

**Key Functions:**
```javascript
async uploadFile(fileBuffer, filename, metadata)
  → Returns { ipfsCid, ipfsUrl }

async uploadJSON(jsonObject, filename)
  → Returns { ipfsCid, ipfsUrl }

async unpinFile(cid)
  → Returns { success }
```

### **5. Notification Service** (`services/notificationService.js`)
**Responsibilities:**
- Send email alerts to users
- Notify creators when derivatives are detected
- Alert admins of new disputes
- Webhook integration for external systems

**Key Functions:**
```javascript
async notifyDerivativeDetected(uploaderEmail, parentCreator, score)
async notifyDisputeCreated(adminEmail, disputeId)
async notifyResolution(userEmail, status, ipId)
```

---

## 🔄 SIMILARITY DETECTION LOGIC

### **Threshold Breakdown**

```javascript
// config/constants.js
module.exports = {
  SIMILARITY_THRESHOLDS: {
    CLEAN: { min: 0, max: 40 },        // Proceed as original
    WARNING: { min: 40, max: 70 },     // Show warning, user decides
    REVIEW: { min: 70, max: 90 },      // Admin mediation required
    DERIVATIVE: { min: 90, max: 100 }  // Force link to parent
  },

  STATUSES: {
    CLEAN: 'CLEAN',
    WARNING: 'WARNING',
    REVIEW_REQUIRED: 'REVIEW_REQUIRED',
    DERIVATIVE: 'DERIVATIVE'
  }
};
```

### **Detection Flow**

1. **User uploads file** → `POST /api/fingerprint`
2. **Generate hashes** (SHA256 + pHash)
3. **Query database** for similar perceptual hashes
4. **Calculate Hamming distance** for each match
5. **Apply threshold logic**:
   - **< 40%**: Return "CLEAN", proceed to registration
   - **40-70%**: Return "WARNING" + parent IP reference
   - **70-90%**: Auto-create dispute, notify admin
   - **> 90%**: Return "DERIVATIVE", force link flow

6. **Frontend handles response**:
   - Clean → Normal Story Protocol registration
   - Warning → Show modal, user confirms
   - Review → Hold upload, show "pending review"
   - Derivative → Force derivative registration flow

---

## 📋 INITIAL COMMIT FILE CHECKLIST

### **✅ Configuration Files**
- [ ] `.env.example`
- [ ] `.gitignore`
- [ ] `package.json`
- [ ] `README.md`
- [ ] `BACKEND_SPEC.md` (existing)
- [ ] `BOOTSTRAP_PLAN.md` (this file)

### **✅ Source Code Structure**
- [ ] `src/app.js` (Express app setup)
- [ ] `src/server.js` (HTTP server)
- [ ] `src/config/database.js`
- [ ] `src/config/storyProtocol.js`
- [ ] `src/config/pinata.js`
- [ ] `src/config/constants.js`

### **✅ Models**
- [ ] `src/models/User.js`
- [ ] `src/models/IpFingerprint.js`
- [ ] `src/models/SimilarityDispute.js`
- [ ] `src/models/DerivativeLink.js`

### **✅ Controllers** (empty stubs with TODO comments)
- [ ] `src/controllers/authController.js`
- [ ] `src/controllers/fingerprintController.js`
- [ ] `src/controllers/similarityController.js`
- [ ] `src/controllers/storyController.js`
- [ ] `src/controllers/disputeController.js`

### **✅ Services** (interface definitions)
- [ ] `src/services/fingerprintService.js`
- [ ] `src/services/similarityEngine.js`
- [ ] `src/services/ipfsService.js`
- [ ] `src/services/storyService.js`

### **✅ Middleware**
- [ ] `src/middleware/auth.js`
- [ ] `src/middleware/roleCheck.js`
- [ ] `src/middleware/upload.js`
- [ ] `src/middleware/errorHandler.js`

### **✅ Routes**
- [ ] `src/routes/auth.routes.js`
- [ ] `src/routes/fingerprint.routes.js`
- [ ] `src/routes/similarity.routes.js`
- [ ] `src/routes/story.routes.js`
- [ ] `src/routes/dispute.routes.js`

### **✅ Utilities**
- [ ] `src/utils/hashGenerator.js`
- [ ] `src/utils/similarity.js`
- [ ] `src/utils/validators.js`
- [ ] `src/utils/logger.js`
- [ ] `src/utils/responseFormatter.js`

### **✅ Scripts**
- [ ] `scripts/seedDb.js`
- [ ] `scripts/setupIndexes.js`

### **✅ Documentation**
- [ ] `docs/API.md` (stub with endpoint list)
- [ ] `docs/SIMILARITY_LOGIC.md` (threshold explanation)

### **✅ Testing** (basic structure)
- [ ] `tests/unit/fingerprint.test.js` (sample test)
- [ ] `tests/integration/api.test.js` (sample test)

---

## 🎨 IMPLEMENTATION FEEL & PHILOSOPHY

### **1. Detection-First Architecture**
Every file upload immediately triggers:
```
Upload → Fingerprint → Similarity Check → Status Determination → Action
```
No asset can bypass the similarity engine. This is the core of the platform.

### **2. Fail-Safe Defaults**
- Unknown similarity → Flag for review (don't assume clean)
- Failed Story Protocol tx → Rollback database status
- IPFS upload failure → Queue for retry, don't lose data
- Missing license terms → Use platform default (10% royalty)

### **3. Admin as Safety Net**
The 70-90% gray area is where humans shine. Give admins:
- Side-by-side video/image preview
- Similarity score + hash comparison
- One-click approve or enforce buttons
- Audit trail of all decisions

### **4. Blockchain-Aware State Machine**
Asset status progression:
```
pending → hash_generated → similarity_checked →
  ↓
  ├─ [CLEAN] → ready_for_registration → registered
  ├─ [WARNING] → user_confirmed → registered
  ├─ [REVIEW] → admin_review → approved/enforced
  └─ [DERIVATIVE] → forced_link → derivative_registered
```

Each state change logged with timestamps and transaction hashes.

### **5. Caching & Performance**
- Cache Story Protocol license terms (they don't change often)
- Index perceptual hashes with MongoDB text search
- Use Redis for rate limiting and job queues
- Lazy-load IPFS metadata (fetch on-demand, not on upload)

### **6. Error Handling Philosophy**
```javascript
// Always return structured responses
{
  success: Boolean,
  message: String,
  data: Object | null,
  error: {
    code: String,
    details: String
  } | null
}
```
Never throw raw errors to frontend - always catch, log, and format.

---

## 🚦 DEVELOPMENT PHASES

### **Phase 1: Foundation** (Initial Commit)
- ✅ Project structure
- ✅ Database models
- ✅ Basic Express server
- ✅ Environment configuration
- ✅ Logging and error handling

### **Phase 2: Core Services** (Week 1)
- File upload with Multer
- SHA256 + pHash generation
- IPFS integration
- MongoDB CRUD operations
- Basic similarity matching

### **Phase 3: Story Protocol Integration** (Week 2)
- SDK initialization
- IP asset registration
- License attachment
- Derivative linking
- Transaction monitoring

### **Phase 4: Similarity Engine** (Week 2-3)
- Hamming distance calculation
- Threshold logic
- Database queries for matches
- Dispute creation flow
- Admin resolution endpoints

### **Phase 5: Frontend Integration** (Week 3)
- API testing with Postman
- Frontend consumption endpoints
- WebSocket for real-time updates (optional)
- CORS and security hardening

### **Phase 6: Production Readiness** (Week 4)
- Redis job queues
- Email notifications
- Rate limiting
- Comprehensive testing
- Deployment scripts

---

## 🔒 SECURITY CONSIDERATIONS

### **1. File Upload Security**
```javascript
// middleware/upload.js
const multer = require('multer');
const fileType = require('file-type');

const upload = multer({
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: async (req, file, cb) => {
    const allowedMimes = ['video/mp4', 'image/png', 'image/jpeg'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'));
    }
    cb(null, true);
  }
});
```

### **2. Wallet Authentication**
```javascript
// Verify wallet ownership via signature
const ethers = require('ethers');

function verifyWalletSignature(walletAddress, signature, nonce) {
  const message = `Sign this message to authenticate: ${nonce}`;
  const recoveredAddress = ethers.verifyMessage(message, signature);
  return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
}
```

### **3. Rate Limiting**
```javascript
const rateLimit = require('express-rate-limit');

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per window
  message: 'Too many uploads, please try again later'
});

app.use('/api/fingerprint', uploadLimiter);
```

### **4. Private Key Management**
- **NEVER** commit private keys
- Use environment variables for Story Protocol admin key
- Consider AWS Secrets Manager or HashiCorp Vault for production
- Implement key rotation policy

---

## 📊 MONITORING & LOGGING

### **Key Metrics to Track**
- Total fingerprints generated
- Similarity checks per day
- Derivative detection rate (% of uploads flagged > 90%)
- Admin dispute resolution time
- IPFS upload success rate
- Story Protocol transaction success rate
- Average hash generation time

### **Log Structure**
```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});
```

---

## 🎯 SUCCESS CRITERIA FOR INITIAL COMMIT

**The initial commit should enable a developer to:**
1. Clone the repo
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in credentials
4. Run `npm run setup-indexes` to create MongoDB indexes
5. Run `npm run dev` and see server start successfully
6. Hit `GET /health` and get a 200 response
7. Understand the project structure from README
8. Know what needs to be implemented from TODO comments

**What the initial commit does NOT need:**
- ❌ Fully implemented controllers (stubs are fine)
- ❌ Complete test coverage (sample tests only)
- ❌ Production deployment configs
- ❌ Advanced features (webhooks, analytics, etc.)

**What the initial commit MUST have:**
- ✅ Clear directory structure
- ✅ All models with proper schemas
- ✅ Database connection working
- ✅ Environment configuration template
- ✅ Basic Express app initialization
- ✅ Comprehensive documentation (this file + README)

---

## 🎬 NEXT STEPS AFTER BOOTSTRAP

1. **Initialize Git Repo**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Project bootstrap with structure and documentation"
   ```

2. **Set Up Development Database**
   ```bash
   # Install MongoDB locally or use Docker
   docker run -d -p 27017:27017 --name orion-mongo mongo:6
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Configure Environment**
   ```bash
   cp .env.example .env
   # Fill in Story Protocol RPC, Pinata keys, etc.
   ```

5. **Create Database Indexes**
   ```bash
   npm run setup-indexes
   ```

6. **Start Development**
   ```bash
   npm run dev
   ```

7. **Begin Implementation Priority Order:**
   - Auth middleware (wallet signature verification)
   - Fingerprint service (SHA256 + pHash)
   - IPFS service (Pinata integration)
   - Similarity engine (Hamming distance)
   - Story Protocol service (SDK integration)
   - Dispute resolution endpoints

---

## 📞 INTEGRATION POINTS WITH FRONTEND

### **Expected Frontend Flow**

```javascript
// 1. User uploads file
const formData = new FormData();
formData.append('file', videoFile);
formData.append('walletAddress', userWallet);

const { hash, ipfsCid } = await fetch('/api/fingerprint', {
  method: 'POST',
  body: formData,
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// 2. Check similarity
const { score, status, parentIpId } = await fetch('/api/check-similarity', {
  method: 'POST',
  body: JSON.stringify({ hash }),
  headers: { 'Content-Type': 'application/json' }
}).then(r => r.json());

// 3. Handle based on status
switch(status) {
  case 'CLEAN':
    // Proceed to Story Protocol registration
    await storyClient.ipAsset.registerIpAsset(...);
    break;

  case 'WARNING':
    // Show modal: "Similar content found, continue?"
    if (userConfirms) {
      await storyClient.ipAsset.registerIpAsset(...);
    }
    break;

  case 'REVIEW_REQUIRED':
    // Show message: "Under review by admin"
    break;

  case 'DERIVATIVE':
    // Force derivative flow
    await storyClient.license.mintLicenseTokens(parentIpId, ...);
    await storyClient.ipAsset.registerDerivative(...);
    break;
}
```

---

## 🎉 CONCLUSION

This bootstrap plan establishes a **production-ready foundation** for an IP protection platform that:

✨ **Detects derivatives** through perceptual hashing
✨ **Enforces IP relationships** via Story Protocol
✨ **Mediates disputes** with admin oversight
✨ **Stores immutably** on IPFS
✨ **Scales gracefully** with proper architecture

The initial commit should be **lean but complete** - providing structure, documentation, and clear implementation paths without overengineering. Every file has a purpose, every service has a clear responsibility, and every endpoint maps to a user need defined in the sequence diagram.

**Let's build this thing!** 🚀

---

**Document Version:** 1.0
**Last Updated:** December 12, 2025
**Author:** Orion Development Team
**Status:** Ready for Implementation
