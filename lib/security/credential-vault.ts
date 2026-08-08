import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function readKey() {
  const encoded = process.env.ERP_CREDENTIAL_ENCRYPTION_KEY?.trim();
  if (!encoded) throw new Error("ERP_CREDENTIAL_ENCRYPTION_KEY is required");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("ERP_CREDENTIAL_ENCRYPTION_KEY must be a base64 encoded 32 byte key");
  return key;
}

export function encryptCredential(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, readKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptCredential(payload: string) {
  const [ivText, tagText, ciphertextText] = payload.split(".");
  if (!ivText || !tagText || !ciphertextText) throw new Error("Stored credential format is invalid");
  const decipher = crypto.createDecipheriv(ALGORITHM, readKey(), Buffer.from(ivText, "base64"));
  decipher.setAuthTag(Buffer.from(tagText, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64")), decipher.final()]).toString("utf8");
}

export function secretLast4(value: string) {
  return value.length <= 4 ? "•".repeat(value.length) : `••••${value.slice(-4)}`;
}
