import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;
const COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  if (!password) throw new Error("Password is required.");
  const derived = scryptSync(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${COST}$${BLOCK_SIZE}$${PARALLELIZATION}$${salt}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, encodedHash: string | undefined) {
  if (!password || !encodedHash) return false;
  const [algorithm, costText, blockSizeText, parallelizationText, salt, expectedHex, ...rest] = encodedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex || rest.length) return false;

  const N = Number(costText);
  const r = Number(blockSizeText);
  const p = Number(parallelizationText);
  if (N !== COST || r !== BLOCK_SIZE || p !== PARALLELIZATION) return false;

  try {
    const expected = Buffer.from(expectedHex, "hex");
    const actual = scryptSync(password, salt, expected.length, { N, r, p, maxmem: 64 * 1024 * 1024 });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
