import pinataSDK from '@pinata/sdk';
import dotenv from 'dotenv';

dotenv.config();

const { PINATA_API_KEY, PINATA_SECRET_KEY } = process.env;

if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
  console.warn('Pinata API Key or Secret Key is not set in the environment variables. IPFS operations will fail.');
}

const pinata = new pinataSDK(PINATA_API_KEY, PINATA_SECRET_KEY);

export default pinata;

