import { SERVICE_RULES, type ServiceRule } from './service-rules.js';
import type { ParsedEnvVar } from './env-parser.js';

export type MatchedCredential = {
  service_name: string;
  service_icon: string;
  key_name: string;
  value: string;
  source_file: string;
  source_line: number;
};

export type ServiceFindings = {
  service_name: string;
  service_icon: string;
  key_url: string;
  credentials: MatchedCredential[];
};

/**
 * Match parsed env vars against service rules.
 * Groups credentials by service.
 */
export function matchCredentials(envVars: ParsedEnvVar[]): ServiceFindings[] {
  const serviceMap = new Map<string, ServiceFindings>();

  for (const envVar of envVars) {
    const rule = findMatchingRule(envVar.key);
    if (!rule) continue;

    if (!serviceMap.has(rule.name)) {
      serviceMap.set(rule.name, {
        service_name: rule.name,
        service_icon: rule.icon,
        key_url: rule.key_url,
        credentials: [],
      });
    }

    serviceMap.get(rule.name)!.credentials.push({
      service_name: rule.name,
      service_icon: rule.icon,
      key_name: envVar.key,
      value: envVar.value,
      source_file: envVar.file,
      source_line: envVar.line,
    });
  }

  return Array.from(serviceMap.values());
}

function findMatchingRule(keyName: string): ServiceRule | null {
  for (const rule of SERVICE_RULES) {
    if (rule.env_patterns.length === 0) continue;
    if (rule.env_patterns.some(pattern => keyName.startsWith(pattern))) {
      return rule;
    }
  }

  // Special cases: DATABASE_URL could be Neon, PlanetScale, Supabase, etc.
  // Default to generic "Database" match
  if (keyName === 'DATABASE_URL') {
    return SERVICE_RULES.find(r => r.name === 'Neon') || null;
  }

  return null;
}

/**
 * Detect potential credential values that don't match any service rule.
 * Useful for finding generic secrets.
 */
export function findUnmatchedSecrets(envVars: ParsedEnvVar[]): ParsedEnvVar[] {
  return envVars.filter(v => {
    // Skip already matched
    if (findMatchingRule(v.key)) return false;

    // Check for common secret key patterns
    const lowerKey = v.key.toLowerCase();
    return lowerKey.includes('secret') ||
           lowerKey.includes('token') ||
           lowerKey.includes('api_key') ||
           lowerKey.includes('apikey') ||
           lowerKey.includes('password') ||
           lowerKey.includes('private_key');
  });
}
