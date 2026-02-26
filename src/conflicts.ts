import inquirer from 'inquirer';
import chalk from 'chalk';
import { basename, relative } from 'path';
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
function scoreSource(filePath: string): number {
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
 * Interactively resolve conflicts by prompting the user.
 * Returns the winning credential for each conflict.
 */
export async function resolveConflicts(
  conflicts: ConflictGroup[],
  basePath: string,
): Promise<Map<string, MatchedCredential>> {
  const resolved = new Map<string, MatchedCredential>();

  for (const conflict of conflicts) {
    console.log('');
    console.log(chalk.yellow(`⚠  Conflict: ${chalk.bold(conflict.key_name)} (${conflict.service_name})`));

    // Sort by score (highest first)
    const sorted = [...conflict.variants].sort(
      (a, b) => scoreSource(b.source_file) - scoreSource(a.source_file)
    );

    const choices = sorted.map((v, i) => {
      const relPath = relative(basePath, v.source_file) || v.source_file;
      const masked = v.value.length > 12
        ? v.value.slice(0, 6) + '••••' + v.value.slice(-4)
        : '••••••••';
      const recommended = i === 0 ? chalk.green(' (recommended)') : '';
      return {
        name: `${relPath} → ${masked}${recommended}`,
        value: v,
      };
    });

    choices.push({
      name: chalk.dim('Skip this credential'),
      value: null as any,
    });

    const { picked } = await inquirer.prompt([{
      type: 'list',
      name: 'picked',
      message: `Which value for ${chalk.bold(conflict.key_name)}?`,
      choices,
    }]);

    if (picked) {
      resolved.set(conflict.key_name, picked);
    }
  }

  return resolved;
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
