// tests/unit/similarity.test.ts
import { calculateHammingDistance, normalizeDistanceToScore } from '../../src/utils/similarity';

describe('Unit Test: Similarity Engine', () => {

  describe('calculateHammingDistance', () => {
    it('should return 0 for identical hashes', () => {
      const hash1 = 'abcde';
      const hash2 = 'abcde';
      expect(calculateHammingDistance(hash1, hash2)).toBe(0);
    });

    it('should return the correct distance for different hashes', () => {
      const hash1 = 'abcde';
      const hash2 = 'axcye';
      expect(calculateHammingDistance(hash1, hash2)).toBe(2);
    });

    it('should throw an error for hashes of different lengths', () => {
      const hash1 = 'abc';
      const hash2 = 'abcd';
      expect(() => calculateHammingDistance(hash1, hash2)).toThrow('Strings must have the same length');
    });
  });

  describe('normalizeDistanceToScore', () => {
    it('should return 100 for a distance of 0', () => {
      expect(normalizeDistanceToScore(0, 64)).toBe(100);
    });

    it('should return 0 for a distance equal to the hash length', () => {
      expect(normalizeDistanceToScore(64, 64)).toBe(0);
    });

    it('should return 50 for a distance of half the hash length', () => {
      expect(normalizeDistanceToScore(32, 64)).toBe(50);
    });
  });

  // TODO: Add tests for the determineStatus function when implemented
  // describe('determineStatus', () => { ... });
});
