import { getToken } from './auth.js';

const API_BASE = 'https://deployhelper.co/api';

type VaultSubmission = {
  service_name: string;
  service_icon: string;
  key_name: string;
  value: string;
  environment?: string;
  source_file?: string;
};

type SubmitResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error('Not logged in. Run: dhscan login');

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error || `API error: ${res.status}`);
  }

  return res.json() as T;
}

/**
 * Verify the stored token is valid.
 */
export async function verifyAuth(): Promise<{ email: string; name: string | null }> {
  return request('/auth/me');
}

/**
 * Submit credentials to vault one by one (reuses existing vault API).
 */
export async function submitToVault(entries: VaultSubmission[]): Promise<SubmitResult> {
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const entry of entries) {
    try {
      await request('/vault', {
        method: 'POST',
        body: JSON.stringify(entry),
      });
      imported++;
    } catch (err: any) {
      if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
        skipped++;
      } else {
        errors.push(`${entry.key_name}: ${err.message}`);
      }
    }
  }

  return { imported, skipped, errors };
}

/**
 * List existing vault entries to check for duplicates.
 */
export async function listVault(): Promise<{ services: Array<{ service_name: string; keys: Array<{ key_name: string }> }> }> {
  return request('/vault');
}

/**
 * Verify a specific API key (optional validation).
 */
export async function validateKey(provider: string, key: string): Promise<{ valid: boolean }> {
  return request('/validate-key', {
    method: 'POST',
    body: JSON.stringify({ provider, key }),
  });
}
