import { SubstitutionResult, VariableValidationResult } from './types';
import { generateDynamicVariable, isDynamicVariable } from './bruno-dynamic-variables';

// Pattern to match {{variable_name}} or {{$variable_name}} in text
// Supports both environment variables and Bruno dynamic variables (prefixed with $)
const VARIABLE_PATTERN = /\{\{(\$?[a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

/**
 * Find all variable references in a text string
 * Returns unique variable names found
 */
export function findVariablesInText(text: string): string[] {
  if (!text) return [];
  
  const matches = [...text.matchAll(VARIABLE_PATTERN)];
  const variables = matches.map(match => match[1]);
  
  // Return unique variable names
  return [...new Set(variables)];
}

/**
 * Substitute variables in a string with their values
 * Supports both Bruno dynamic variables (prefixed with $) and environment variables
 * Dynamic variables are generated fresh on each call
 * Environment variables are looked up from the provided envVars object
 * Variables not found are left as-is (for debugging)
 */
export function substituteInString(
  text: string,
  envVars: Record<string, string>,
  leaveUnmatched = true
): SubstitutionResult {
  if (!text) {
    return {
      result: text,
      substitutedVariables: [],
      missingVariables: [],
      hasErrors: false,
    };
  }
  
  const substitutedVariables: string[] = [];
  const missingVariables: string[] = [];
  
  const result = text.replace(VARIABLE_PATTERN, (match, varName) => {
    // Check if this is a Bruno dynamic variable (starts with $)
    if (varName.startsWith('$')) {
      const dynamicValue = generateDynamicVariable(varName);
      if (dynamicValue !== null) {
        substitutedVariables.push(varName);
        return dynamicValue;
      } else {
        // Unknown dynamic variable
        missingVariables.push(varName);
        return leaveUnmatched ? match : '';
      }
    }
    
    // Regular environment variable lookup
    if (varName in envVars) {
      substitutedVariables.push(varName);
      return envVars[varName];
    } else {
      missingVariables.push(varName);
      return leaveUnmatched ? match : '';
    }
  });
  
  return {
    result,
    substitutedVariables: [...new Set(substitutedVariables)],
    missingVariables: [...new Set(missingVariables)],
    hasErrors: missingVariables.length > 0,
  };
}

/**
 * Substitute variables in an object recursively
 * Works on JSON-like objects, replacing string values that contain {{variables}}
 */
export function substituteInObject(
  obj: unknown,
  envVars: Record<string, string>
): { result: unknown; allMissing: string[]; allSubstituted: string[] } {
  const allMissing: string[] = [];
  const allSubstituted: string[] = [];
  
  function processValue(value: unknown): unknown {
    if (typeof value === 'string') {
      const { result, missingVariables, substitutedVariables } = substituteInString(value, envVars);
      allMissing.push(...missingVariables);
      allSubstituted.push(...substitutedVariables);
      return result;
    }
    
    if (Array.isArray(value)) {
      return value.map(item => processValue(item));
    }
    
    if (value !== null && typeof value === 'object') {
      const processed: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        processed[key] = processValue(val);
      }
      return processed;
    }
    
    return value;
  }
  
  const result = processValue(obj);
  
  return {
    result,
    allMissing: [...new Set(allMissing)],
    allSubstituted: [...new Set(allSubstituted)],
  };
}

/**
 * Validate that all variables in text have values
 * Dynamic variables (starting with $) are validated against known Bruno variables
 * Environment variables are validated against the provided envVars object
 */
export function validateVariables(
  text: string,
  envVars: Record<string, string>
): VariableValidationResult {
  const variables = findVariablesInText(text);
  const usedVariables: string[] = [];
  const missingVariables: string[] = [];
  
  for (const varName of variables) {
    // Check if this is a dynamic variable
    if (varName.startsWith('$')) {
      if (isDynamicVariable(varName)) {
        usedVariables.push(varName);
      } else {
        missingVariables.push(varName);
      }
    } else {
      // Regular environment variable
      if (varName in envVars) {
        usedVariables.push(varName);
      } else {
        missingVariables.push(varName);
      }
    }
  }
  
  return {
    isValid: missingVariables.length === 0,
    missingVariables,
    usedVariables,
  };
}

/**
 * Highlight variables in text for display
 * Returns text with variables wrapped in spans/markers for syntax highlighting
 */
export function highlightVariables(
  text: string,
  envVars: Record<string, string>
): { html: string; hasUnresolved: boolean } {
  if (!text) {
    return { html: '', hasUnresolved: false };
  }
  
  let hasUnresolved = false;
  
  const html = text.replace(VARIABLE_PATTERN, (match, varName) => {
    const exists = varName in envVars;
    if (!exists) hasUnresolved = true;
    
    const className = exists ? 'env-var-valid' : 'env-var-missing';
    return `<span class="${className}">${match}</span>`;
  });
  
  return { html, hasUnresolved };
}

/**
 * Check if a string contains any variable references
 * (both environment variables and dynamic variables)
 */
export function hasVariables(text: string): boolean {
  if (!text) return false;
  return VARIABLE_PATTERN.test(text);
}

/**
 * Check if a string contains any Bruno dynamic variables (prefixed with $)
 */
export function hasDynamicVariables(text: string): boolean {
  if (!text) return false;
  const matches = [...text.matchAll(VARIABLE_PATTERN)];
  return matches.some(match => match[1].startsWith('$'));
}

/**
 * Check if a string contains any environment variables (not prefixed with $)
 */
export function hasEnvironmentVariables(text: string): boolean {
  if (!text) return false;
  const matches = [...text.matchAll(VARIABLE_PATTERN)];
  return matches.some(match => !match[1].startsWith('$'));
}

/**
 * Escape special characters for use in regex
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a preview of what the substituted value will look like
 * Shows the variable and its resolved value
 */
export function createSubstitutionPreview(
  text: string,
  envVars: Record<string, string>
): Array<{ variable: string; value: string | null; position: number }> {
  if (!text) return [];
  
  const preview: Array<{ variable: string; value: string | null; position: number }> = [];
  
  let match;
  const pattern = new RegExp(VARIABLE_PATTERN.source, 'g');
  
  while ((match = pattern.exec(text)) !== null) {
    const varName = match[1];
    preview.push({
      variable: varName,
      value: envVars[varName] ?? null,
      position: match.index,
    });
  }
  
  return preview;
}
