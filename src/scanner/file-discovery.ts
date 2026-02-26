import { glob } from 'glob';
import { stat } from 'fs/promises';
import { join, basename } from 'path';

export type DiscoveredFile = {
  path: string;
  name: string;
  type: 'env' | 'json' | 'toml' | 'yaml' | 'prisma';
  modifiedAt: Date;
};

const ENV_PATTERNS = [
  '**/.env',
  '**/.env.local',
  '**/.env.production',
  '**/.env.staging',
  '**/.env.development',
  '**/.env.*.local',
];

const CONFIG_PATTERNS = [
  '**/firebase.json',
  '**/.firebaserc',
  '**/wrangler.toml',
  '**/supabase/config.toml',
  '**/prisma/schema.prisma',
  '**/docker-compose.yml',
  '**/docker-compose.yaml',
  '**/docker-compose.prod.yml',
  '**/serverless.yml',
  '**/netlify.toml',
];

const IGNORE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '.vercel',
  '.output',
  'coverage',
  '__pycache__',
  'venv',
  '.venv',
  'vendor',
];

function getFileType(name: string): DiscoveredFile['type'] {
  if (name.startsWith('.env')) return 'env';
  if (name.endsWith('.json') || name === '.firebaserc') return 'json';
  if (name.endsWith('.toml')) return 'toml';
  if (name.endsWith('.yml') || name.endsWith('.yaml')) return 'yaml';
  if (name.endsWith('.prisma')) return 'prisma';
  return 'env';
}

export async function discoverFiles(scanPath: string, deep = false): Promise<DiscoveredFile[]> {
  const allPatterns = [...ENV_PATTERNS, ...CONFIG_PATTERNS];
  const ignoreGlobs = IGNORE_DIRS.map(d => `**/${d}/**`);

  const maxDepth = deep ? 8 : 4;

  const matches = await glob(allPatterns, {
    cwd: scanPath,
    absolute: true,
    ignore: ignoreGlobs,
    dot: true,
    maxDepth,
  });

  const files: DiscoveredFile[] = [];

  for (const filePath of matches) {
    try {
      const s = await stat(filePath);
      // Skip files larger than 1MB (unlikely to be env files)
      if (s.size > 1_000_000) continue;

      files.push({
        path: filePath,
        name: basename(filePath),
        type: getFileType(basename(filePath)),
        modifiedAt: s.mtime,
      });
    } catch {
      // Skip inaccessible files
    }
  }

  return files;
}

export function getAutoScanPaths(): string[] {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const candidates = [
    join(home, 'projects'),
    join(home, 'Projects'),
    join(home, 'workspace'),
    join(home, 'Workspace'),
    join(home, 'dev'),
    join(home, 'Development'),
    join(home, 'Documents', 'projects'),
    join(home, 'Documents', 'Projects'),
    join(home, 'code'),
    join(home, 'Code'),
    join(home, 'repos'),
    join(home, 'src'),
  ];
  return candidates;
}
