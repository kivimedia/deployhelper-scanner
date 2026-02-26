import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { storeToken, removeToken, getToken } from '../auth.js';
import { verifyAuth } from '../api-client.js';

export async function loginCommand() {
  console.log('');
  console.log(chalk.bold('🔐 DeployHelper Scanner Login'));
  console.log('');
  console.log(`To get your API token:`);
  console.log(`  1. Go to ${chalk.cyan('https://deployhelper.co/settings')}`);
  console.log(`  2. Sign in to your account`);
  console.log(`  3. Copy your JWT token from the browser`);
  console.log('');
  console.log(chalk.dim('(In the future, this will open your browser automatically)'));
  console.log('');

  const { token } = await inquirer.prompt([{
    type: 'password',
    name: 'token',
    message: 'Paste your DeployHelper token:',
    mask: '•',
    validate: (input: string) => input.length > 10 || 'Token seems too short',
  }]);

  const spinner = ora('Verifying token...').start();

  try {
    await storeToken(token);
    const user = await verifyAuth();
    spinner.succeed(chalk.green(`Logged in as ${chalk.bold((user as any).user?.email || (user as any).email || 'user')}`));
  } catch (err: any) {
    spinner.fail(chalk.red('Invalid token'));
    await removeToken();
    console.log(chalk.dim(`Error: ${err.message}`));
    process.exit(1);
  }
}

export async function logoutCommand() {
  await removeToken();
  console.log(chalk.green('✓ Logged out. Token removed.'));
}

export async function whoamiCommand() {
  const token = await getToken();
  if (!token) {
    console.log(chalk.yellow('Not logged in. Run: dhscan login'));
    return;
  }

  const spinner = ora('Checking...').start();
  try {
    const user = await verifyAuth();
    spinner.succeed(`Logged in as ${chalk.bold((user as any).user?.email || (user as any).email || 'user')}`);
  } catch {
    spinner.fail('Token expired or invalid. Run: dhscan login');
  }
}
