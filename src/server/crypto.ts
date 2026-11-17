import crypto from "node:crypto";
import bcrypt from "bcryptjs";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateSlug(length: number = 6): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < length; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

export function generateQuickCode(): string {
  // Generates a 6-digit numeric code like "482915"
  const num = Math.floor(100000 + Math.random() * 900000);
  return num.toString();
}

export function generateEditToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

// AES-256-GCM Encryption for Password-Protected Pastes
export interface EncryptedPayload {
  encryptedContent: string; // Base64
  iv: string;              // Base64
  authTag: string;         // Base64
  salt: string;            // Base64
}

export function encryptPaste(plainText: string, passphrase: string): EncryptedPayload {
  const salt = crypto.randomBytes(16);
  // Derive 32-byte key using PBKDF2 (100,000 iterations, sha256)
  const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, "sha256");
  const iv = crypto.randomBytes(12); // Standard GCM IV length is 12 bytes (96 bits)

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedContent: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    salt: salt.toString("base64")
  };
}

export function decryptPaste(encryptedContentBase64: string, passphrase: string, ivBase64: string, authTagBase64: string, saltBase64: string): string {
  const salt = Buffer.from(saltBase64, "base64");
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const encrypted = Buffer.from(encryptedContentBase64, "base64");

  const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, "sha256");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
