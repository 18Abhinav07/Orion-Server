import { StoryClient, StoryConfig } from '@story-protocol/core-sdk';
import { http } from 'viem';
import { privateKeyToAccount, Address } from 'viem/accounts';
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

// Create account from private key using viem (Story Protocol SDK uses viem internally)
const account = privateKeyToAccount(STORY_PROTOCOL_PRIVATE_KEY as Address);

// Create the Story Client
const config: StoryConfig = {
  account: account,
  transport: http(STORY_PROTOCOL_RPC_URL),
  chainId: 'aeneid', // Story Protocol testnet (odyssey is now called aeneid)
};
const client: StoryClient = StoryClient.newClient(config);

export { client, account };

