# 🚀 Orion Server - Quick Setup Guide

## Prerequisites

- Node.js 18+ installed
- MongoDB running (local or cloud)
- Pinata account (for IPFS storage)
- Story Protocol testnet access

---

## 📦 Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build
```

---

## ⚙️ Environment Configuration

### 1. Copy Environment Template

```bash
cp .env.example .env
```

### 2. Generate Backend Verifier Keypair

This generates the cryptographic keypair used to sign mint authorization tokens:

```bash
npx ts-node scripts/generateVerifierKey.ts
```

**Output will look like:**
```
🔑 New Verifier Keypair Generated 🔑
------------------------------------
Private Key: 0x1234567890abcdef...
Public Address: 0xABCD1234...
------------------------------------
```

**IMPORTANT:** 
- Copy the **Private Key** to `.env` as `BACKEND_VERIFIER_PRIVATE_KEY`
- Copy the **Public Address** to `.env` as `BACKEND_VERIFIER_ADDRESS`
- Use the **Public Address** in your `OrionVerifiedMinter` smart contract deployment

### 3. Configure Required Environment Variables

Edit `.env` and fill in these **required** values:

#### Database (MongoDB)
```bash
MONGODB_URI=mongodb://localhost:27017/orion-ip-tracking
# For local MongoDB, this works as-is
# For MongoDB Atlas, use your connection string:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/orion-ip-tracking
```

#### JWT Secret (Authentication)
```bash
# Generate a secure random string (min 32 characters)
JWT_SECRET=your-super-secret-jwt-key-change-in-production-use-64-chars-min
```

#### Backend Verifier (from step 2)
```bash
BACKEND_VERIFIER_PRIVATE_KEY=0xYourGeneratedPrivateKey
BACKEND_VERIFIER_ADDRESS=0xYourGeneratedPublicAddress
```

#### Story Protocol
```bash
STORY_PROTOCOL_NETWORK=odyssey
STORY_PROTOCOL_RPC_URL=https://odyssey.storyrpc.io
STORY_PROTOCOL_CHAIN_ID=1516
STORY_PROTOCOL_PRIVATE_KEY=0xYourWalletPrivateKeyForStoryProtocolOperations
```

#### Pinata (IPFS Storage)
Get your keys from: https://app.pinata.cloud/developers/api-keys

```bash
PINATA_API_KEY=your-pinata-api-key
PINATA_SECRET_KEY=your-pinata-secret-key
PINATA_JWT=your-pinata-jwt-token
```

---

## 🗄️ Database Setup

### Option 1: Local MongoDB

```bash
# Install MongoDB
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Verify it's running
mongosh
```

### Option 2: MongoDB Atlas (Cloud)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

---

## 🏃 Running the Server

### Development Mode (with auto-reload)

```bash
npm run dev
```

Server starts at `http://localhost:3001`

### Production Mode

```bash
# Build TypeScript
npm run build

# Run compiled JavaScript
npm start
```

---

## ✅ Verify Setup

### 1. Health Check

```bash
curl http://localhost:3001/health
```

**Expected Response:**
```json
{"status":"UP"}
```

### 2. Test Verification System

```bash
# First, get an auth token (you'll need a user account)
# Then test mint token generation:

curl -X POST http://localhost:3001/api/verification/generate-mint-token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "creatorAddress": "0xYourWalletAddress",
    "contentHash": "0x1234...",
    "ipMetadataURI": "ipfs://Qm...",
    "nftMetadataURI": "ipfs://Qm...",
    "sessionId": "sess_test",
    "fingerprintId": "fp_test"
  }'
```

---

## 🧪 Run Tests

```bash
# Run all tests with coverage
npm test

# Watch mode (for development)
npm run test:watch
```

---

## 📁 Project Structure

```
orion-server/
├── src/
│   ├── config/          # Database, Story Protocol, Pinata configs
│   ├── models/          # MongoDB schemas
│   ├── controllers/     # API endpoint handlers
│   ├── services/        # Business logic (fingerprinting, similarity)
│   ├── middleware/      # Auth, upload, error handling
│   ├── routes/          # API route definitions
│   ├── utils/           # Helper functions
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── scripts/             # Utility scripts (key generation, seeding)
├── tests/               # Unit and integration tests
├── logs/                # Application logs (created at runtime)
└── uploads/             # Temporary file storage (gitignored)
```

---

## 🔑 API Endpoints

### Authentication
- `POST /auth/wallet-login` - Wallet signature login
- `POST /auth/wallet-verify` - Check if wallet is registered
- `GET /auth/profile` - Get user profile (protected)

### Verification (Mint Authorization)
- `POST /api/verification/generate-mint-token` - Generate signed token
- `GET /api/verification/token/:nonce/status` - Check token status
- `POST /api/verification/revoke-token` - Revoke unused token

### Fingerprinting
- `POST /api/fingerprint` - Upload & fingerprint content
- `GET /api/fingerprint/:id` - Get fingerprint details

### Similarity Detection
- `POST /api/similarity/check` - Check content similarity
- `GET /api/similarity/matches/:id` - Get similar content

### Story Protocol
- `POST /api/story/register-ip` - Register IP asset
- `POST /api/story/attach-license` - Attach license terms
- `POST /api/story/register-derivative` - Link derivative work

### Disputes
- `GET /api/disputes` - List disputes (admin)
- `POST /api/disputes/create` - Create dispute
- `POST /api/disputes/:id/resolve` - Resolve dispute (admin)

---

## 🔒 Security Checklist

- [ ] Generated unique `JWT_SECRET` (min 64 characters)
- [ ] Generated `BACKEND_VERIFIER_PRIVATE_KEY` via script
- [ ] Never committed `.env` file to git (it's in `.gitignore`)
- [ ] Stored private keys securely (use vault in production)
- [ ] Updated `BACKEND_VERIFIER_ADDRESS` in smart contract
- [ ] Configured CORS for production domains
- [ ] Set `NODE_ENV=production` for production deployment

---

## 🐛 Troubleshooting

### MongoDB Connection Failed
```bash
# Check if MongoDB is running
mongosh

# If not running, start it:
brew services start mongodb-community  # macOS
sudo systemctl start mongod            # Linux
```

### Port 3001 Already in Use
```bash
# Change PORT in .env to another port (e.g., 3002)
PORT=3002
```

### Pinata Upload Fails
- Verify your API keys at https://app.pinata.cloud/developers/api-keys
- Check if you have quota remaining on your Pinata plan

### Story Protocol RPC Issues
- Verify network is `odyssey` testnet
- Check RPC URL: https://odyssey.storyrpc.io
- Ensure you have testnet ETH for gas

---

## 📚 Additional Documentation

- [BOOTSTRAP_PLAN.md](./BOOTSTRAP_PLAN.md) - Full system architecture
- [BACKEND_VERIFICATION_SPEC.md](./BACKEND_VERIFICATION_SPEC.md) - Verification system details
- [BACKEND_SPEC.md](./BACKEND_SPEC.md) - API specifications

---

## 🚀 Deployment

### Environment Variables for Production

```bash
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Use secure, randomly generated secrets
JWT_SECRET=<64-character-random-string>
BACKEND_VERIFIER_PRIVATE_KEY=<from-secure-vault>

# Use production MongoDB
MONGODB_URI=mongodb+srv://prod-user:password@cluster.mongodb.net/orion-prod

# Production Story Protocol
STORY_PROTOCOL_NETWORK=mainnet  # when available
```

### Deployment Platforms

- **Vercel/Railway**: Set env vars in dashboard, deploy from GitHub
- **AWS/GCP**: Use Secrets Manager for private keys
- **Docker**: Create `.env.production` and mount as volume

---

## 📞 Support

- Check existing issues: [GitHub Issues](https://github.com/18Abhinav07/Orion-Server/issues)
- Review logs: `tail -f logs/combined.log`
- Run diagnostics: `npm test`

---

**Last Updated:** December 12, 2025  
**Status:** Production Ready (Verification System)
