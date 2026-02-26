import inquirer from 'inquirer';
import chalk from 'chalk';
import { relative } from 'path';
import { scoreSource, type ConflictGroup } from './conflicts.js';
import type { MatchedCredential } from './scanner/service-matcher.js';

/**
 * Interactively resolve conflicts by prompting the user (CLI only).
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
