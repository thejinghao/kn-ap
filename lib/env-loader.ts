import fs from 'fs';
import path from 'path';

export interface ParsedEnvVariables {
  [key: string]: string;
}

// Known API variable names that should be loaded from environment
// These use the exact same names in both local .env.local and Vercel
const API_VARIABLE_NAMES = [
  'acquiring_partner_api_key',
  'subpartner_api_key',
  'payment_profile',
  'payment_acquiring_account_id',
  'credential_id',
  'partner_account_id',
  'ap_partner_account_id',
  'payment_account_id_standard',
  'payment_account_id_PiFnG',
  'credential_group_owner_id',
  'klarna_client_id',
  'secret_key_jwt',
  'x5c_jwt',
  'cpgw_username',
  'cpgw_password',
  'username',
  'password',
  'bank_account_preset_id',
  'legacy_price_plan_standard',
  'legacy_price_plan_PiFnG',
];

/**
 * Parse a .env file content string
 * Format: key = value (with optional spaces around =)
 * Supports multiline values with \n escape sequences
 */
export function parseEnvFile(content: string): ParsedEnvVariables {
  const variables: ParsedEnvVariables = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Skip empty lines and comments
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }
    
    // Parse key = value format
    const separatorIndex = trimmedLine.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    
    const key = trimmedLine.substring(0, separatorIndex).trim();
    const value = trimmedLine.substring(separatorIndex + 1).trim();
    
    // Skip empty keys
    if (!key) {
      continue;
    }
    
    // Handle escaped newlines in values (convert \n to actual newlines for display)
    // Keep them as-is for storage, the UI can handle display
    variables[key] = value;
  }
  
  return variables;
}

/**
 * Load environment variables from process.env using exact variable names
 * Used for Vercel deployment where variables are set in the dashboard
 */
export function loadFromProcessEnv(): ParsedEnvVariables {
  const variables: ParsedEnvVariables = {};
  
  for (const varName of API_VARIABLE_NAMES) {
    const value = process.env[varName];
    if (value !== undefined) {
      variables[varName] = value;
    }
  }
  
  return variables;
}

/**
 * Check if we're actually running on Vercel (not just local dev)
 * Note: Next.js loads .env.local into process.env locally, so we can't just
 * check if API variables exist - we need to check the VERCEL env var
 */
export function isRunningOnVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

/**
 * Check if running in production/Vercel environment
 */
export function isProductionEnvironment(): boolean {
  return Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';
}

/**
 * Load and parse the .env.local file from the project root
 */
export function loadLocalEnvFile(): ParsedEnvVariables | null {
  try {
    const envFilePath = path.join(process.cwd(), '.env.local');
    
    if (!fs.existsSync(envFilePath)) {
      console.warn('[Env Loader] .env.local file not found at:', envFilePath);
      return null;
    }
    
    const content = fs.readFileSync(envFilePath, 'utf-8');
    const variables = parseEnvFile(content);
    
    // Filter out Next.js/system variables (KLARNA_BASE_URL, KLARNA_CERT_PATH, etc.)
    // Only return API collection variables (lowercase keys without special prefixes)
    const apiVariables: ParsedEnvVariables = {};
    for (const [key, value] of Object.entries(variables)) {
      // Skip uppercase variables (likely Next.js/system config)
      if (key === key.toUpperCase() && key.startsWith('KLARNA_')) {
        continue;
      }
      apiVariables[key] = value;
    }
    
    console.log(`[Env Loader] Loaded ${Object.keys(apiVariables).length} API variables from .env.local`);
    return apiVariables;
  } catch (error) {
    console.error('[Env Loader] Error loading .env.local file:', error);
    return null;
  }
}

/**
 * Load environment variables with hybrid approach:
 * - On Vercel: Load from process.env (same variable names)
 * - Local development: Load from .env.local in project root
 * 
 * Returns an object with variables and the source type
 */
export function loadEnvironmentVariables(): {
  variables: ParsedEnvVariables;
  source: 'vercel' | 'env_file' | 'none';
} {
  const onVercel = isRunningOnVercel();
  
  // On Vercel: Load from process.env
  if (onVercel) {
    console.log('[Env Loader] Running on Vercel - loading from process.env');
    const variables = loadFromProcessEnv();
    
    if (Object.keys(variables).length === 0) {
      console.warn('[Env Loader] Running on Vercel but no API variables found in process.env!');
    }
    
    return { variables, source: 'vercel' };
  }
  
  // Local development: Load from .env.local file
  console.log('[Env Loader] Local development - loading from .env.local file');
  const localVars = loadLocalEnvFile();
  
  if (localVars && Object.keys(localVars).length > 0) {
    return { variables: localVars, source: 'env_file' };
  }
  
  // No variables found
  console.warn('[Env Loader] No environment variables found from any source');
  return { variables: {}, source: 'none' };
}

/**
 * Convert parsed environment variables to exportable .env format
 */
export function toEnvFormat(variables: ParsedEnvVariables): string {
  return Object.entries(variables)
    .map(([key, value]) => `${key} = ${value}`)
    .join('\n');
}

/**
 * Detect if a variable name suggests it should be treated as a secret
 */
export function isSecretVariable(name: string): boolean {
  const secretPatterns = [
    /api_key/i,
    /secret/i,
    /password/i,
    /token/i,
    /credential/i,
    /private/i,
    /cert/i,
    /key$/i,
    /jwt$/i,
  ];
  
  return secretPatterns.some(pattern => pattern.test(name));
}

/**
 * Get the list of known API variable names
 */
export function getApiVariableNames(): string[] {
  return [...API_VARIABLE_NAMES];
}
