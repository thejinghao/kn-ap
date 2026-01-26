import fs from 'fs';
import path from 'path';

export interface ParsedEnvVariables {
  [key: string]: string;
}

/**
 * Parse a Bruno-style .env file
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
    let value = trimmedLine.substring(separatorIndex + 1).trim();
    
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
 * Load and parse the Bruno .env file from the reference directory
 */
export function loadBrunoEnvFile(): ParsedEnvVariables | null {
  try {
    // Look for .env file in the Bruno collection directory
    const referenceDir = path.join(process.cwd(), 'reference');
    
    if (!fs.existsSync(referenceDir)) {
      console.warn('[Bruno Env Parser] Reference directory not found');
      return null;
    }
    
    // Find the collection directory (first subdirectory)
    const entries = fs.readdirSync(referenceDir, { withFileTypes: true });
    const collectionDir = entries.find(e => e.isDirectory());
    
    if (!collectionDir) {
      console.warn('[Bruno Env Parser] No collection directory found');
      return null;
    }
    
    const envFilePath = path.join(referenceDir, collectionDir.name, '.env');
    
    if (!fs.existsSync(envFilePath)) {
      console.warn('[Bruno Env Parser] .env file not found at:', envFilePath);
      return null;
    }
    
    const content = fs.readFileSync(envFilePath, 'utf-8');
    const variables = parseEnvFile(content);
    
    console.log(`[Bruno Env Parser] Loaded ${Object.keys(variables).length} variables from .env`);
    return variables;
  } catch (error) {
    console.error('[Bruno Env Parser] Error loading .env file:', error);
    return null;
  }
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
  ];
  
  return secretPatterns.some(pattern => pattern.test(name));
}
