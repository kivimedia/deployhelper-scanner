import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.deployhelper');
const TOKEN_FILE = join(CONFIG_DIR, 'scanner-token');

/**
 * Store the scanner API token.
 * For MVP, uses a file in ~/.deployhelper/ with restricted permissions.
 * Future: use OS keychain via keytar.
 */
export async function storeToken(token: string): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  await writeFile(TOKEN_FILE, token, { mode: 0o600 });
}

/**
 * Retrieve the stored scanner API token.
 */
export async function getToken(): Promise<string | null> {
  try {
    const token = await readFile(TOKEN_FILE, 'utf-8');
    return token.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Remove stored token (logout).
 */
export async function removeToken(): Promise<void> {
  try {
    const { unlink } = await import('fs/promises');
    await unlink(TOKEN_FILE);
  } catch {
    // File doesn't exist, that's fine
  }
}

/**
 * Get the config directory path.
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}
