/**
 * Calculates the Hamming distance between two hex strings.
 * The Hamming distance is the number of positions at which the corresponding symbols are different.
 * @param hex1 The first hex string.
 * @param hex2 The second hex string.
 * @returns The Hamming distance as a number.
 */
export function calculateHammingDistance(hex1: string, hex2: string): number {
  if (hex1.length !== hex2.length) {
    throw new Error('Strings must have the same length to calculate Hamming distance.');
  }

  let distance = 0;
  for (let i = 0; i < hex1.length; i++) {
    if (hex1[i] !== hex2[i]) {
      distance++;
    }
  }
  return distance;
}

/**
 * Normalizes the Hamming distance to a percentage score (0-100).
 * A lower distance means higher similarity.
 * @param distance The Hamming distance.
 * @param hashLength The length of the hashes that were compared.
 * @returns A similarity score from 0 to 100, where 100 is a perfect match.
 */
export function normalizeDistanceToScore(distance: number, hashLength: number): number {
  if (hashLength === 0) return 100;
  const similarity = (hashLength - distance) / hashLength;
  return Math.round(similarity * 100);
}
