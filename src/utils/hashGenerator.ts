import crypto from 'crypto';

/**
 * Generates a SHA256 hash for a given buffer.
 * @param buffer The data to hash.
 * @returns The SHA256 hash as a hex string.
 */
export function generateSha256(buffer: Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(buffer);
  return hash.digest('hex');
}

/**
 * Generates a perceptual hash for an image.
 * This is a placeholder. A real implementation would use a library like 'sharp'
 * and an algorithm like pHash.
 * @param imageBuffer The image data to hash.
 * @returns A promise that resolves to the perceptual hash string.
 */
export async function generatePerceptualHash(imageBuffer: Buffer): Promise<string> {
  // TODO: Implement a real perceptual hashing algorithm (e.g., pHash).
  // This is a dummy implementation for placeholder purposes.
  console.log(imageBuffer);
  const dummyHash = crypto.createHash('md5').update(imageBuffer).digest('hex');
  return Promise.resolve(dummyHash);
}
