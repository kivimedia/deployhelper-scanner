import { randomBytes, createCipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt a credential value using AES-256-GCM.
 * The server has the ENCRYPTION_KEY and will decrypt.
 * We use a shared key approach: the CLI encrypts with a key derived from
 * the user's scanner token, and the server re-encrypts for vault storage.
 *
 * For MVP: We send plain values over HTTPS (TLS) and let the server encrypt.
 * This matches the existing vault API behavior (POST /vault sends plain value).
 * The server encrypts server-side before storing.
 */
export function encryptForTransport(value: string, key: string): { encrypted: string; iv: string; tag: string } {
  const keyBuf = Buffer.alloc(32);
  keyBuf.write(key);
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, keyBuf, iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return {
    encrypted: encrypted + ':' + tag,
    iv: iv.toString('hex'),
    tag,
  };
}

/**
 * Mask a credential value for display.
 * Shows first 4 and last 4 characters.
 */
export function maskValue(value: string): string {
  if (value.length <= 12) return '••••••••';
  return value.slice(0, 4) + '••••' + value.slice(-4);
}
