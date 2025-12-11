import { ethers } from 'ethers';

function generateVerifierKey() {
  const wallet = ethers.Wallet.createRandom();

  console.log('🔑 New Verifier Keypair Generated 🔑');
  console.log('------------------------------------');
  console.log(`Private Key: ${wallet.privateKey}`);
  console.log(`Public Address: ${wallet.address}`);
  console.log('------------------------------------');
  console.log('⚠️  Store the private key securely in your backend .env file as BACKEND_VERIFIER_PRIVATE_KEY.');
  console.log('⚠️  Use the public address in your OrionVerifiedMinter smart contract constructor.');
}

generateVerifierKey();
