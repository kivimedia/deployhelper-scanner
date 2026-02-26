#!/usr/bin/env node

import { Command } from 'commander';
import { loginCommand, logoutCommand, whoamiCommand } from './commands/login.js';
import { scanCommand } from './commands/scan.js';
import { submitCommand } from './commands/submit.js';

const program = new Command();

program
  .name('dhscan')
  .description('DeployHelper Scanner — find and upload API keys from your local dev environment')
  .version('0.1.0');

program
  .command('login')
  .description('Authenticate with your DeployHelper account')
  .action(loginCommand);

program
  .command('logout')
  .description('Remove stored authentication token')
  .action(logoutCommand);

program
  .command('whoami')
  .description('Check current authentication status')
  .action(whoamiCommand);

program
  .command('scan [path]')
  .description('Scan a directory for API keys and credentials')
  .option('--auto', 'Auto-scan common project directories (~/projects, ~/workspace, etc.)')
  .option('--deep', 'Scan deeper into nested directories (up to 8 levels)')
  .option('--submit', 'Submit found credentials to vault after scanning')
  .action(async (path: string | undefined, options) => {
    const result = await scanCommand(path, options);

    if (result && options.submit) {
      await submitCommand(result);
    } else if (result && !options.submit) {
      console.log('');
      console.log('To upload these to your vault, run:');
      console.log('  dhscan scan --submit' + (path ? ` ${path}` : ''));
      console.log('');
    }
  });

program
  .command('status')
  .description('Show scanner status and recent activity')
  .action(async () => {
    const { getToken } = await import('./auth.js');
    const token = await getToken();
    if (!token) {
      console.log('Not logged in. Run: dhscan login');
      return;
    }
    await whoamiCommand();
  });

program.parse();
