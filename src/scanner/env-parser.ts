import { readFile } from 'fs/promises';

export type ParsedEnvVar = {
  key: string;
  value: string;
  line: number;
  file: string;
};

/**
 * Parse a .env file and extract KEY=VALUE pairs.
 * Handles quoted values, comments, empty lines.
 * Skips entries with empty values or placeholder patterns.
 */
export async function parseEnvFile(filePath: string): Promise<ParsedEnvVar[]> {
  const content = await readFile(filePath, 'utf-8');
  return parseEnvContent(content, filePath);
}

export function parseEnvContent(content: string, filePath: string): ParsedEnvVar[] {
  const results: ParsedEnvVar[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('#')) continue;

    // Match KEY=VALUE (with optional export prefix)
    const match = line.match(/^(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const key = match[1];
    let value = match[2];

    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Remove inline comments (only for unquoted values)
    if (!match[2].startsWith('"') && !match[2].startsWith("'")) {
      const commentIdx = value.indexOf(' #');
      if (commentIdx > 0) value = value.slice(0, commentIdx).trim();
    }

    // Skip empty values and common placeholders
    if (!value ||
        value === 'your_key_here' ||
        value === 'xxx' ||
        value === 'CHANGEME' ||
        value === 'TODO' ||
        value === 'your-api-key' ||
        value.startsWith('<') ||
        value.startsWith('${')) {
      continue;
    }

    results.push({ key, value, line: i + 1, file: filePath });
  }

  return results;
}

/**
 * Extract DATABASE_URL from prisma/schema.prisma
 */
export async function parsePrismaSchema(filePath: string): Promise<ParsedEnvVar[]> {
  try {
    const content = await readFile(filePath, 'utf-8');
    // Look for env("DATABASE_URL") pattern — this tells us the var name, not the value
    // For actual values, we rely on .env files
    return [];
  } catch {
    return [];
  }
}

/**
 * Extract env vars from docker-compose.yml
 */
export function parseDockerComposeVars(content: string, filePath: string): ParsedEnvVar[] {
  const results: ParsedEnvVar[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Match "- KEY=VALUE" in environment sections
    const match = line.match(/^-\s+([A-Z_][A-Z0-9_]*)=(.+)$/);
    if (match) {
      const value = match[2].trim();
      if (value && !value.startsWith('${')) {
        results.push({ key: match[1], value, line: i + 1, file: filePath });
      }
    }
  }

  return results;
}
