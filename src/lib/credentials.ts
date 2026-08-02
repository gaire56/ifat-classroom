import crypto from "crypto";

function key() {
  const raw = process.env.GROUP_CREDENTIAL_KEY;
  if (!raw) throw new Error("GROUP_CREDENTIAL_KEY is missing.");
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== 32) throw new Error("GROUP_CREDENTIAL_KEY must decode to exactly 32 bytes.");
  return decoded;
}

export function encryptCredential(plaintext: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map(v => v.toString("base64url")).join(".");
}

export function decryptCredential(token: string) {
  const [iv, tag, encrypted] = token.split(".").map(v => Buffer.from(v, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function randomPassword(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join("");
}

export function randomLoginId(prefix = "GRP") {
  return `${prefix}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}
