/**
 * Encrypt/decrypt sensitive tokens at rest (TASK-019).
 * Key derived from SESSION_SECRET via scrypt. AES-256-GCM.
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;
const SALT = "family-dashboard-token-v1";

function deriveKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set (>= 32 chars) for token encryption",
    );
  }
  return scryptSync(secret, SALT, KEY_LEN);
}

/** Encrypt plaintext → base64(iv + tag + ciphertext). */
export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

/** Decrypt base64 payload → plaintext. Throws on tamper/wrong key. */
export function decryptSecret(payload: string): string {
  const key = deriveKey();
  const buf = Buffer.from(payload, "base64");
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error("Invalid ciphertext");
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}
