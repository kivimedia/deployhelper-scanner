import { resolve } from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { discoverFiles, getAutoScanPaths } from '../scanner/file-discovery.js';
import { parseEnvFile, parseDockerComposeVars } from '../scanner/env-parser.js';
import { matchCredentials, findUnmatchedSecrets } from '../scanner/service-matcher.js';
import { deduplicateCredentials } from '../conflicts.js';
import { resolveConflicts } from '../conflicts-cli.js';
import { maskValue } from '../crypto.js';
import type { MatchedCredential } from '../scanner/service-matcher.js';
import type { ParsedEnvVar } from '../scanner/env-parser.js';
import { readFile, stat } from 'fs/promises';

export type ScanResult = {
  credentials: MatchedCredential[];
  unmatchedSecrets: ParsedEnvVar[];
  filesScanned: number;
  servicesFound: number;
};

export async function scanCommand(
  path: string | undefined,
  options: { auto?: boolean; deep?: boolean; submit?: boolean }
): Promise<ScanResult | null> {
  console.log('');
  console.log(chalk.bold('🔍 DeployHelper Deep Scan'));
  console.log('');

  // Determine scan paths
  let scanPaths: string[] = [];

  if (options.auto) {
    const candidates = getAutoScanPaths();
    const spinner = ora('Finding project directories...').start();
    for (const p of candidates) {
      try {
        const s = await stat(p);
        if (s.isDirectory()) scanPaths.push(p);
      } catch { /* skip */ }
    }
    if (scanPaths.length === 0) {
      spinner.fail('No common project directories found');
      console.log(chalk.dim('Try specifying a path: dhscan scan ~/my-project'));
      return null;
    }
    spinner.succeed(`Found ${scanPaths.length} project directories`);
  } else {
    const scanPath = resolve(path || '.');
    try {
      const s = await stat(scanPath);
      if (!s.isDirectory()) {
        console.log(chalk.red(`Not a directory: ${scanPath}`));
        return null;
      }
    } catch {
      console.log(chalk.red(`Path not found: ${scanPath}`));
      return null;
    }
    scanPaths = [scanPath];
  }

  // Discover files
  const fileSpinner = ora('Scanning for credential files...').start();
  let allFiles: Awaited<ReturnType<typeof discoverFiles>> = [];

  for (const scanPath of scanPaths) {
    const files = await discoverFiles(scanPath, options.deep);
    allFiles = allFiles.concat(files);
  }

  if (allFiles.length === 0) {
    fileSpinner.fail('No .env or config files found');
    console.log(chalk.dim('Make sure you\'re scanning a directory with project files.'));
    return null;
  }
  fileSpinner.succeed(`Found ${chalk.bold(allFiles.length)} credential files`);

  // Parse files
  const parseSpinner = ora('Parsing credentials...').start();
  const allEnvVars: ParsedEnvVar[] = [];

  for (const file of allFiles) {
    try {
      if (file.type === 'env') {
        const vars = await parseEnvFile(file.path);
        allEnvVars.push(...vars);
      } else if (file.type === 'yaml' && file.name.startsWith('docker-compose')) {
        const content = await readFile(file.path, 'utf-8');
        const vars = parseDockerComposeVars(content, file.path);
        allEnvVars.push(...vars);
      }
      // JSON/TOML parsing can be added later
    } catch {
      // Skip unparseable files
    }
  }

  if (allEnvVars.length === 0) {
    parseSpinner.fail('No credentials found in scanned files');
    return null;
  }
  parseSpinner.succeed(`Parsed ${chalk.bold(allEnvVars.length)} environment variables`);

  // Match against service rules
  const matchSpinner = ora('Matching services...').start();
  const findings = matchCredentials(allEnvVars);
  const allCreds = findings.flatMap(f => f.credentials);
  const unmatched = findUnmatchedSecrets(allEnvVars);

  matchSpinner.succeed(`Matched ${chalk.bold(allCreds.length)} credentials across ${chalk.bold(findings.length)} services`);

  // Deduplicate and detect conflicts
  const { unique, conflicts } = deduplicateCredentials(allCreds);

  // Display summary
  console.log('');
  console.log(chalk.bold('📋 Scan Results'));
  console.log(chalk.dim('─'.repeat(50)));

  for (const finding of findings) {
    const count = finding.credentials.length;
    const uniqueKeys = new Set(finding.credentials.map(c => c.key_name));
    console.log(`  ${finding.service_icon} ${chalk.bold(finding.service_name)} — ${uniqueKeys.size} key${uniqueKeys.size > 1 ? 's' : ''}`);
    for (const keyName of uniqueKeys) {
      const cred = finding.credentials.find(c => c.key_name === keyName)!;
      console.log(`    ${chalk.dim(keyName)} = ${chalk.dim(maskValue(cred.value))}`);
    }
  }

  if (unmatched.length > 0) {
    console.log('');
    console.log(`  ${chalk.yellow('?')} ${chalk.bold('Other secrets')} — ${unmatched.length} unmatched`);
    for (const v of unmatched.slice(0, 5)) {
      console.log(`    ${chalk.dim(v.key)} = ${chalk.dim(maskValue(v.value))}`);
    }
    if (unmatched.length > 5) {
      console.log(chalk.dim(`    ... and ${unmatched.length - 5} more`));
    }
  }

  console.log(chalk.dim('─'.repeat(50)));

  // Handle conflicts
  if (conflicts.length > 0) {
    console.log('');
    console.log(chalk.yellow(`⚠  ${conflicts.length} conflict${conflicts.length > 1 ? 's' : ''} detected (same key, different values)`));

    const resolved = await resolveConflicts(conflicts, scanPaths[0]);

    // Replace conflicted entries with resolved ones
    for (const [keyName, winner] of resolved) {
      unique.push(winner);
    }
  }

  // Git tracking warnings
  for (const cred of unique) {
    if (!cred.source_file.includes('.gitignore') && !cred.source_file.includes('.local')) {
      // Simple heuristic: if the file doesn't have .local, it might be git-tracked
      const fileName = cred.source_file.split('/').pop() || '';
      if (fileName === '.env') {
        console.log('');
        console.log(chalk.yellow(`⚠  ${chalk.bold(cred.key_name)} found in ${chalk.bold('.env')} — ensure this file is in .gitignore!`));
      }
    }
  }

  console.log('');
  console.log(chalk.bold(`Total: ${unique.length} credentials ready to submit`));

  return {
    credentials: unique,
    unmatchedSecrets: unmatched,
    filesScanned: allFiles.length,
    servicesFound: findings.length,
  };
}
