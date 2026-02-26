import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { submitToVault, listVault } from '../api-client.js';
import { getToken } from '../auth.js';
import type { ScanResult } from './scan.js';

export async function submitCommand(scanResult: ScanResult) {
  // Check auth
  const token = await getToken();
  if (!token) {
    console.log(chalk.red('Not logged in. Run: dhscan login'));
    process.exit(1);
  }

  if (scanResult.credentials.length === 0) {
    console.log(chalk.yellow('No credentials to submit.'));
    return;
  }

  // Check for existing vault entries to avoid duplicates
  const checkSpinner = ora('Checking existing vault entries...').start();
  let existingKeys = new Set<string>();

  try {
    const vault = await listVault();
    for (const svc of vault.services) {
      for (const key of svc.keys) {
        existingKeys.add(key.key_name);
      }
    }
    const duplicates = scanResult.credentials.filter(c => existingKeys.has(c.key_name));
    if (duplicates.length > 0) {
      checkSpinner.info(`${duplicates.length} key${duplicates.length > 1 ? 's' : ''} already in vault — will skip`);
    } else {
      checkSpinner.succeed('No duplicates found in vault');
    }
  } catch {
    checkSpinner.warn('Could not check existing vault (will submit all)');
  }

  // Filter out already-existing keys
  const toSubmit = scanResult.credentials.filter(c => !existingKeys.has(c.key_name));

  if (toSubmit.length === 0) {
    console.log(chalk.green('✓ All found credentials are already in your vault!'));
    return;
  }

  // Confirm submission
  console.log('');
  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: `Submit ${chalk.bold(toSubmit.length)} credentials to your DeployHelper vault?`,
    default: true,
  }]);

  if (!confirm) {
    console.log(chalk.dim('Cancelled.'));
    return;
  }

  // Submit
  const submitSpinner = ora(`Uploading ${toSubmit.length} credentials...`).start();

  const entries = toSubmit.map(c => ({
    service_name: c.service_name,
    service_icon: c.service_icon,
    key_name: c.key_name,
    value: c.value,
    environment: 'production',
  }));

  const result = await submitToVault(entries);

  if (result.errors.length > 0) {
    submitSpinner.warn(`Imported ${result.imported}, skipped ${result.skipped}, ${result.errors.length} errors`);
    for (const err of result.errors) {
      console.log(chalk.red(`  ✗ ${err}`));
    }
  } else {
    submitSpinner.succeed(
      chalk.green(`${result.imported} credentials added to vault`) +
      (result.skipped > 0 ? chalk.dim(` (${result.skipped} duplicates skipped)`) : '')
    );
  }

  console.log('');
  console.log(chalk.bold('Done! 🎉'));
  console.log(`View your credentials at ${chalk.cyan('https://deployhelper.co/vault')}`);
  console.log('');
}
