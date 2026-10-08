import crypto from "node:crypto";

function key() {
  const raw = process.env.APP_ENCRYPTION_KEY_B64;
  if (!raw) throw new Error("APP_ENCRYPTION_KEY_B64 is missing.");
  const value = Buffer.from(raw, "base64");
  if (value.length !== 32) throw new Error("APP_ENCRYPTION_KEY_B64 must decode to 32 bytes.");
  return value;
}

export function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(value: string): string {
  const [ivEncoded, tagEncoded, ciphertextEncoded] = value.split(".");
  if (!ivEncoded || !tagEncoded || !ciphertextEncoded) throw new Error("Invalid encrypted secret.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, "base64url")), decipher.final()]).toString("utf8");
}

export function hashRecoveryToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function randomRecoveryToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
