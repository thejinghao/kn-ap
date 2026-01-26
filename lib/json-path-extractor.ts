import { SaveableField } from './types';

/**
 * Extract a value from an object using dot notation path
 * Supports array indexing: 'items[0].id'
 */
export function extractValueByPath(obj: unknown, path: string): unknown {
  if (!obj || !path) return undefined;
  
  // Split path by dots, but handle array indices
  const parts = path.split(/\.(?![^\[]*\])/);
  
  let current: unknown = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    
    // Check for array index notation: field[0]
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    
    if (arrayMatch) {
      const [, fieldName, indexStr] = arrayMatch;
      const index = parseInt(indexStr, 10);
      
      if (typeof current !== 'object') return undefined;
      
      const field = (current as Record<string, unknown>)[fieldName];
      if (!Array.isArray(field)) return undefined;
      
      current = field[index];
    } else {
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }
  }
  
  return current;
}

/**
 * Generate a clean variable name from a JSON path
 * Examples:
 *   'data.credential_id' → 'credential_id'
 *   'result.payment.request_id' → 'payment_request_id'
 *   'items[0].id' → 'item_id'
 *   'response.data.secret.secret' → 'secret'
 */
export function suggestVariableName(path: string): string {
  if (!path) return 'value';
  
  // Split path and get meaningful parts
  const parts = path.split(/\.|\[|\]/).filter(Boolean);
  
  // Remove common wrapper fields
  const ignorePrefixes = ['data', 'result', 'response', 'body', 'payload'];
  const filteredParts = parts.filter(p => !ignorePrefixes.includes(p.toLowerCase()));
  
  // If we filtered everything, use the last part of original
  if (filteredParts.length === 0) {
    return parts[parts.length - 1] || 'value';
  }
  
  // Handle array indices - remove numbers and use singular form
  const cleanedParts = filteredParts.map(part => {
    if (/^\d+$/.test(part)) return null; // Remove pure numbers
    // Simple singular conversion (items → item)
    if (part.endsWith('s') && part.length > 2) {
      return part.slice(0, -1);
    }
    return part;
  }).filter(Boolean) as string[];
  
  // If path ends with common ID field, use parent + field
  if (cleanedParts.length >= 2) {
    const lastPart = cleanedParts[cleanedParts.length - 1];
    const secondLast = cleanedParts[cleanedParts.length - 2];
    
    // Avoid duplication like 'credential_credential_id'
    if (lastPart.includes('_') || lastPart === 'id') {
      // Check if second last is already in the last part
      if (!lastPart.toLowerCase().includes(secondLast.toLowerCase())) {
        return `${secondLast}_${lastPart}`.toLowerCase();
      }
    }
  }
  
  // Return the last meaningful part
  return cleanedParts[cleanedParts.length - 1]?.toLowerCase() || 'value';
}

/**
 * Get the type of a value for display
 */
function getValueType(value: unknown): SaveableField['valueType'] {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'string';
}

/**
 * Patterns for fields that are commonly saved as variables
 */
const SAVEABLE_PATTERNS = [
  /_id$/i,
  /^id$/i,
  /_key$/i,
  /_token$/i,
  /_secret$/i,
  /^token$/i,
  /^key$/i,
  /^secret$/i,
  /credential/i,
  /api_key/i,
  /access_token/i,
  /refresh_token/i,
  /payment_request_id/i,
  /partner_account_id/i,
  /^krn:/i, // Klarna Resource Names
];

/**
 * Check if a field name matches saveable patterns
 */
function matchesSaveablePattern(fieldName: string, value: unknown): boolean {
  // Check if the field name matches patterns
  if (SAVEABLE_PATTERNS.some(pattern => pattern.test(fieldName))) {
    return true;
  }
  
  // Check if the value looks like a KRN (Klarna Resource Name)
  if (typeof value === 'string' && value.startsWith('krn:')) {
    return true;
  }
  
  // Check if value looks like an API key
  if (typeof value === 'string' && value.startsWith('klarna_')) {
    return true;
  }
  
  return false;
}

/**
 * Recursively scan an object to find saveable fields
 */
export function detectSaveableFields(
  obj: unknown,
  currentPath = '',
  results: SaveableField[] = []
): SaveableField[] {
  if (obj === null || obj === undefined) {
    return results;
  }
  
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      detectSaveableFields(item, `${currentPath}[${index}]`, results);
    });
    return results;
  }
  
  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const newPath = currentPath ? `${currentPath}.${key}` : key;
      
      // Check if this field is saveable
      const valueType = getValueType(value);
      const isSaveable = valueType === 'string' || valueType === 'number';
      
      if (isSaveable && matchesSaveablePattern(key, value)) {
        results.push({
          path: newPath,
          suggestedName: suggestVariableName(newPath),
          value,
          valueType,
          isAutoSuggested: true,
        });
      }
      
      // Recursively check nested objects
      if (valueType === 'object' || valueType === 'array') {
        detectSaveableFields(value, newPath, results);
      }
    }
  }
  
  return results;
}

/**
 * Generate path from a clicked position in the JSON tree
 * This is used when the user clicks on a specific value to save it
 */
export function buildPathFromKeys(keys: (string | number)[]): string {
  return keys.map((key, index) => {
    if (typeof key === 'number') {
      return `[${key}]`;
    }
    return index === 0 ? key : `.${key}`;
  }).join('');
}

/**
 * Format a value for display as a variable
 * Converts to string representation
 */
export function formatValueForVariable(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  // For objects/arrays, JSON stringify
  return JSON.stringify(value);
}

/**
 * Get all fields from an object that can be saved as variables
 * Includes both auto-suggested and all primitive values
 */
export function getAllSaveableFields(obj: unknown): SaveableField[] {
  const results: SaveableField[] = [];
  
  function traverse(current: unknown, path: string) {
    if (current === null || current === undefined) return;
    
    if (Array.isArray(current)) {
      current.forEach((item, index) => {
        traverse(item, `${path}[${index}]`);
      });
      return;
    }
    
    if (typeof current === 'object') {
      for (const [key, value] of Object.entries(current)) {
        const newPath = path ? `${path}.${key}` : key;
        const valueType = getValueType(value);
        
        // Only include primitive values that can be stored as variables
        if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
          results.push({
            path: newPath,
            suggestedName: suggestVariableName(newPath),
            value,
            valueType,
            isAutoSuggested: matchesSaveablePattern(key, value),
          });
        }
        
        // Recurse into objects and arrays
        if (valueType === 'object' || valueType === 'array') {
          traverse(value, newPath);
        }
      }
    }
  }
  
  traverse(obj, '');
  return results;
}
