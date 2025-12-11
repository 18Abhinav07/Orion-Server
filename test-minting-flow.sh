#!/bin/bash

# Test script for the minting verification flow
# Make sure the server is running on http://localhost:3001

BASE_URL="http://localhost:3001/api/verification"

echo "🎯 Testing Minting Verification Flow"
echo "======================================"
echo ""

# Test 1: Generate Mint Token
echo "1️⃣ Testing: POST /generate-mint-token"
echo "--------------------------------------"

RESPONSE=$(curl -s -X POST "$BASE_URL/generate-mint-token" \
  -H "Content-Type: application/json" \
  -d '{
    "creatorAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "contentHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "ipMetadataURI": "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "nftMetadataURI": "ipfs://QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx"
  }')

echo "$RESPONSE" | jq '.'

# Extract nonce from response
NONCE=$(echo "$RESPONSE" | jq -r '.data.nonce')
echo ""
echo "✅ Generated token with nonce: $NONCE"
echo ""

# Test 2: Check Token Status
echo "2️⃣ Testing: GET /token/$NONCE/status"
echo "--------------------------------------"

STATUS_RESPONSE=$(curl -s "$BASE_URL/token/$NONCE/status")
echo "$STATUS_RESPONSE" | jq '.'
echo ""

# Test 3: Update Token (Mark as Used)
echo "3️⃣ Testing: PATCH /token/$NONCE/update"
echo "--------------------------------------"

UPDATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/token/$NONCE/update" \
  -H "Content-Type: application/json" \
  -d '{
    "ipId": "0x1234567890abcdef1234567890abcdef12345678",
    "tokenId": 123,
    "txHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
  }')

echo "$UPDATE_RESPONSE" | jq '.'
echo ""

# Test 4: Check Status Again (Should be 'used')
echo "4️⃣ Testing: GET /token/$NONCE/status (after update)"
echo "--------------------------------------"

FINAL_STATUS=$(curl -s "$BASE_URL/token/$NONCE/status")
echo "$FINAL_STATUS" | jq '.'
echo ""

# Test 5: Try Duplicate Content
echo "5️⃣ Testing: Duplicate Content Detection"
echo "--------------------------------------"

DUPLICATE_RESPONSE=$(curl -s -X POST "$BASE_URL/generate-mint-token" \
  -H "Content-Type: application/json" \
  -d '{
    "creatorAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "contentHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "ipMetadataURI": "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
    "nftMetadataURI": "ipfs://QmZ4tDuvesekSs4qM5ZBKpXiZGun7S2CYtEZRB3DYXkjGx"
  }')

echo "$DUPLICATE_RESPONSE" | jq '.'
echo ""

# Test 6: Try to Update Already Used Token
echo "6️⃣ Testing: Update Already Used Token (Should Fail)"
echo "--------------------------------------"

DOUBLE_UPDATE=$(curl -s -X PATCH "$BASE_URL/token/$NONCE/update" \
  -H "Content-Type: application/json" \
  -d '{
    "ipId": "0xdifferent123",
    "tokenId": 999,
    "txHash": "0xsomethingelse"
  }')

echo "$DOUBLE_UPDATE" | jq '.'
echo ""

# Test 7: Test Missing Parameters
echo "7️⃣ Testing: Missing Required Parameters"
echo "--------------------------------------"

ERROR_RESPONSE=$(curl -s -X POST "$BASE_URL/generate-mint-token" \
  -H "Content-Type: application/json" \
  -d '{
    "creatorAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }')

echo "$ERROR_RESPONSE" | jq '.'
echo ""

echo "======================================"
echo "✅ All tests completed!"
echo "======================================"
