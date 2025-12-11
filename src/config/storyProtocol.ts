import { StoryClient, StoryConfig } from '@story-protocol/core-sdk';
import { ethers, Wallet, JsonRpcProvider } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const {
  STORY_PROTOCOL_NETWORK,
  STORY_PROTOCOL_RPC_URL,
  STORY_PROTOCOL_PRIVATE_KEY,
} = process.env;

if (!STORY_PROTOCOL_RPC_URL || !STORY_PROTOCOL_PRIVATE_KEY) {
  console.warn('Story Protocol RPC URL or Private Key not set. Blockchain operations will fail.');
}

// Configure the provider and signer
const provider: JsonRpcProvider = new ethers.JsonRpcProvider(STORY_PROTOCOL_RPC_URL);
const signer: Wallet = new ethers.Wallet(STORY_PROTOCOL_PRIVATE_KEY!, provider);

// Create the Story Client
const config: StoryConfig = {
  network: STORY_PROTOCOL_NETWORK as any, // Cast to any to bypass type errors if network is not a valid enum
  signer,
};
const client: StoryClient = StoryClient.newClient(config);

export { client, provider as storyProvider, signer as storySigner };

