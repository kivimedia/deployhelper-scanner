import { basename } from 'path';
import type { MatchedCredential } from './scanner/service-matcher.js';

export type ConflictGroup = {
  key_name: string;
  service_name: string;
  variants: MatchedCredential[];
};

/**
 * Detect conflicts: same key_name across multiple files with different values.
 */
export function detectConflicts(credentials: MatchedCredential[]): ConflictGroup[] {
  const byKey = new Map<string, MatchedCredential[]>();

  for (const cred of credentials) {
    const existing = byKey.get(cred.key_name) || [];
    existing.push(cred);
    byKey.set(cred.key_name, existing);
  }

  const conflicts: ConflictGroup[] = [];
  for (const [key, variants] of byKey) {
    // Check for different values
    const uniqueValues = new Set(variants.map(v => v.value));
    if (uniqueValues.size > 1) {
      conflicts.push({
        key_name: key,
        service_name: variants[0].service_name,
        variants,
      });
    }
  }

  return conflicts;
}

/**
 * Score a credential source for auto-recommendation.
 * Higher score = more likely to be the production/correct value.
 */
export function scoreSource(filePath: string): number {
  const name = basename(filePath).toLowerCase();
  let score = 0;

  if (name.includes('.local')) score += 30;
  if (name.includes('production')) score += 25;
  if (name.includes('staging')) score += 10;
  if (name.includes('development')) score -= 10;
  if (name === '.env.example') score -= 100;
  if (name === '.env') score += 5;

  return score;
}

/**
 * Deduplicate credentials: for keys with the same value across files, keep one.
 * For keys with different values, return conflicts for resolution.
 */
export function deduplicateCredentials(
  credentials: MatchedCredential[]
): { unique: MatchedCredential[]; conflicts: ConflictGroup[] } {
  const byKey = new Map<string, MatchedCredential[]>();

  for (const cred of credentials) {
    const existing = byKey.get(cred.key_name) || [];
    existing.push(cred);
    byKey.set(cred.key_name, existing);
  }

  const unique: MatchedCredential[] = [];
  const conflicts: ConflictGroup[] = [];

  for (const [key, variants] of byKey) {
    const uniqueValues = new Set(variants.map(v => v.value));
    if (uniqueValues.size === 1) {
      // All same value — pick the best source
      const sorted = [...variants].sort(
        (a, b) => scoreSource(b.source_file) - scoreSource(a.source_file)
      );
      unique.push(sorted[0]);
    } else {
      conflicts.push({
        key_name: key,
        service_name: variants[0].service_name,
        variants,
      });
    }
  }

  return { unique, conflicts };
}
