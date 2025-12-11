// tests/unit/fingerprint.test.ts
import { generateSha256 } from '../../src/utils/hashGenerator';

describe('Unit Test: Fingerprint Service', () => {

  it('should generate a valid SHA256 hash', () => {
    const buffer = Buffer.from('hello world');
    const hash = generateSha256(buffer);

    // SHA256 hash for "hello world"
    const expectedHash = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';

    expect(hash).toBe(expectedHash);
    expect(hash).toHaveLength(64);
  });

  it('should generate different hashes for different inputs', () => {
    const buffer1 = Buffer.from('hello world');
    const buffer2 = Buffer.from('hello there');

    const hash1 = generateSha256(buffer1);
    const hash2 = generateSha256(buffer2);

    expect(hash1).not.toBe(hash2);
  });

  // TODO: Add tests for perceptual hashing once a library is chosen and implemented.
  // it('should generate a perceptual hash for an image', async () => { ... });

  // TODO: Add tests for video frame extraction.
  // it('should extract a frame from a video', async () => { ... });
});
