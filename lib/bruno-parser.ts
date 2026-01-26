import fs from 'fs';
import path from 'path';
import { EndpointPreset, HttpMethod, ParameterDefinition, EndpointCategory } from './types';

interface BrunoFile {
  name: string;
  method: HttpMethod;
  url: string;
  pathParams: Record<string, string>;
  headers: Record<string, string>;
  body: string | null;
  bodyType: 'json' | 'none' | 'text';
}

/**
 * Parse a Bruno (.bru) file and extract API endpoint information
 */
export function parseBrunoFile(filePath: string): BrunoFile | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    let name = '';
    let method: HttpMethod = 'GET';
    let url = '';
    const pathParams: Record<string, string> = {};
    const headers: Record<string, string> = {};
    let body: string | null = null;
    let bodyType: 'json' | 'none' | 'text' = 'none';
    
    let currentSection = '';
    let bodyLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Parse meta section
      if (line.startsWith('meta {')) {
        currentSection = 'meta';
        continue;
      }
      
      // Parse method sections
      if (line.match(/^(get|post|patch|put|delete) {$/)) {
        const methodMatch = line.match(/^(get|post|patch|put|delete) {$/);
        if (methodMatch) {
          method = methodMatch[1].toUpperCase() as HttpMethod;
          currentSection = method.toLowerCase();
        }
        continue;
      }
      
      // Parse params:path section
      if (line.startsWith('params:path {')) {
        currentSection = 'params:path';
        continue;
      }
      
      // Parse headers section
      if (line.startsWith('headers {')) {
        currentSection = 'headers';
        continue;
      }
      
      // Parse body:json section
      if (line.startsWith('body:json {')) {
        currentSection = 'body:json';
        bodyType = 'json';
        continue;
      }
      
      // End of section - but be careful with body:json which has nested braces
      if (line === '}') {
        if (currentSection === 'body:json') {
          // Check if this is the final closing brace by tracking depth
          if (bodyLines.length > 0) {
            // Count open and close braces to determine if we're done
            const bodyContent = bodyLines.join('\n');
            const openBraces = (bodyContent.match(/\{/g) || []).length;
            const closeBraces = (bodyContent.match(/\}/g) || []).length;
            
            if (openBraces === closeBraces) {
              // We've reached the end of the body:json section
              body = bodyContent;
              currentSection = '';
              bodyLines = [];
              continue;
            } else {
              // Still inside the JSON, add the closing brace
              bodyLines.push(lines[i]);
              continue;
            }
          }
        }
        currentSection = '';
        bodyLines = [];
        continue;
      }
      
      // Parse content based on current section
      if (currentSection === 'meta') {
        if (line.startsWith('name:')) {
          name = line.substring(5).trim();
        }
      } else if (currentSection === method.toLowerCase()) {
        if (line.startsWith('url:')) {
          url = line.substring(4).trim();
        } else if (line.startsWith('body:')) {
          const bodyValue = line.substring(5).trim();
          if (bodyValue === 'json') {
            bodyType = 'json';
          } else if (bodyValue === 'none') {
            bodyType = 'none';
          } else {
            bodyType = 'text';
          }
        }
      } else if (currentSection === 'params:path') {
        const match = line.match(/^(\w+):\s*(.+)$/);
        if (match) {
          pathParams[match[1]] = match[2];
        }
      } else if (currentSection === 'headers') {
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          headers[match[1].trim()] = match[2].trim();
        }
      } else if (currentSection === 'body:json') {
        bodyLines.push(lines[i]); // Keep original indentation
      }
    }
    
    return {
      name,
      method,
      url,
      pathParams,
      headers,
      body,
      bodyType,
    };
  } catch (error) {
    console.error(`Error parsing Bruno file ${filePath}:`, error);
    return null;
  }
}

/**
 * Extract path parameter names from URL template
 * e.g., "/v2/payment/requests/:payment_request_id" or "/v2/payment/requests/{payment_request_id}"
 */
function extractPathParamsFromUrl(url: string): string[] {
  // Match both :param and {param} styles
  const colonStyleParams = [...url.matchAll(/:(\w+)/g)].map(match => match[1]);
  const braceStyleParams = [...url.matchAll(/\{(\w+)\}/g)].map(match => match[1]);
  
  return [...colonStyleParams, ...braceStyleParams];
}

/**
 * Convert Bruno URL format to standard format
 * Replace {{base_url}}/{{version}} with empty string and :param with {param}
 */
function normalizeUrl(url: string): string {
  return url
    .replace(/\{\{base_url\}\}/g, '')
    .replace(/\{\{version\}\}/g, '/v2')
    .replace(/:(\w+)/g, '{$1}') // Convert :param to {param}
    .replace(/^\/+/, '/'); // Ensure single leading slash
}

/**
 * Determine category from file path
 */
function getCategoryFromPath(filePath: string): EndpointCategory {
  const pathLower = filePath.toLowerCase();
  
  if (pathLower.includes('credential') || pathLower.includes('api-key') || pathLower.includes('client-identifier')) {
    return 'credentials';
  }
  if (pathLower.includes('account') || pathLower.includes('business-entit')) {
    return 'accounts';
  }
  if (pathLower.includes('onboard') || pathLower.includes('distribution')) {
    return 'onboarding';
  }
  if (pathLower.includes('payment') || pathLower.includes('transaction')) {
    return 'payments';
  }
  if (pathLower.includes('webhook') || pathLower.includes('notification')) {
    return 'webhooks';
  }
  if (pathLower.includes('settlement')) {
    return 'settlements';
  }
  
  return 'other';
}

/**
 * Generate a unique ID from file path and name
 */
function generateId(filePath: string, name: string): string {
  const relativePath = filePath.split('reference/')[1] || filePath;
  const parts = relativePath.split('/').filter(p => p && p !== 'folder.bru');
  const sanitized = [...parts, name]
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  return sanitized;
}

/**
 * Parse all Bruno files in a directory recursively
 */
export function parseBrunoDirectory(dirPath: string): EndpointPreset[] {
  const presets: EndpointPreset[] = [];
  
  function traverseDirectory(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        traverseDirectory(fullPath);
      } else if (entry.name.endsWith('.bru') && entry.name !== 'folder.bru') {
        const brunoData = parseBrunoFile(fullPath);
        
        if (brunoData && brunoData.name && brunoData.url) {
          const normalizedUrl = normalizeUrl(brunoData.url);
          const pathParamNames = extractPathParamsFromUrl(normalizedUrl);
          
          // Create path parameter definitions
          const pathParams: ParameterDefinition[] = pathParamNames.map(paramName => ({
            name: paramName,
            description: `Path parameter: ${paramName}`,
            required: true,
            type: 'string',
          }));
          
          // Parse body template if available
          // IMPORTANT: We preserve {{variable}} syntax for runtime substitution
          let bodyTemplate: unknown = undefined;
          if (brunoData.body && brunoData.bodyType === 'json') {
            // Validate that it's valid JSON by parsing with placeholders replaced
            try {
              // Replace {{...}} placeholders with a simple value (no quotes)
              // This handles both standalone placeholders and placeholders inside strings
              const testBody = brunoData.body.replace(/\{\{[^}]+\}\}/g, 'PLACEHOLDER');
              JSON.parse(testBody); // Just validate, don't store
            } catch (error) {
              console.warn(`Invalid JSON in ${fullPath}:`, error);
            }
            
            // Store the body as a formatted string to preserve {{}} placeholders
            // The body already has proper formatting from the Bruno file
            bodyTemplate = brunoData.body;
          }
          
          // Create required headers definitions
          const requiredHeaders: ParameterDefinition[] = Object.entries(brunoData.headers)
            .filter(([key]) => !key.startsWith('{{')) // Skip variable headers
            .map(([key, value]) => ({
              name: key,
              description: `Header: ${key}`,
              required: true,
              type: 'string',
              example: value,
            }));
          
          const preset: EndpointPreset = {
            id: generateId(fullPath, brunoData.name),
            name: brunoData.name,
            description: brunoData.name,
            method: brunoData.method,
            endpoint: normalizedUrl,
            category: getCategoryFromPath(fullPath),
            pathParams: pathParams.length > 0 ? pathParams : undefined,
            bodyTemplate,
            requiredHeaders: requiredHeaders.length > 0 ? requiredHeaders : undefined,
          };
          
          presets.push(preset);
        }
      }
    }
  }
  
  traverseDirectory(dirPath);
  return presets;
}

/**
 * Load all Bruno endpoints from the reference directory
 */
export function loadBrunoEndpoints(): EndpointPreset[] {
  const referenceDir = path.join(process.cwd(), 'reference');
  
  if (!fs.existsSync(referenceDir)) {
    console.warn('Reference directory not found:', referenceDir);
    return [];
  }
  
  return parseBrunoDirectory(referenceDir);
}

export interface FolderStructure {
  name: string;
  path: string;
  presets: EndpointPreset[];
  subfolders: FolderStructure[];
}

/**
 * Build hierarchical folder structure from Bruno files
 */
export function buildFolderHierarchy(dirPath: string): FolderStructure {
  const rootName = path.basename(dirPath);
  const structure: FolderStructure = {
    name: rootName,
    path: dirPath,
    presets: [],
    subfolders: [],
  };
  
  function traverseDirectory(currentPath: string, currentStructure: FolderStructure) {
    if (!fs.existsSync(currentPath)) {
      return;
    }
    
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        // Create subfolder structure
        const subfolder: FolderStructure = {
          name: entry.name,
          path: fullPath,
          presets: [],
          subfolders: [],
        };
        
        traverseDirectory(fullPath, subfolder);
        currentStructure.subfolders.push(subfolder);
      } else if (entry.name.endsWith('.bru') && entry.name !== 'folder.bru') {
        // Parse and add endpoint to current folder
        const brunoData = parseBrunoFile(fullPath);
        
        if (brunoData && brunoData.name && brunoData.url) {
          const normalizedUrl = normalizeUrl(brunoData.url);
          const pathParamNames = extractPathParamsFromUrl(normalizedUrl);
          
          // Create path parameter definitions
          const pathParams: ParameterDefinition[] = pathParamNames.map(paramName => ({
            name: paramName,
            description: `Path parameter: ${paramName}`,
            required: true,
            type: 'string',
          }));
          
          // Parse body template if available
          // IMPORTANT: We preserve {{variable}} syntax for runtime substitution
          let bodyTemplate: unknown = undefined;
          if (brunoData.body && brunoData.bodyType === 'json') {
            // Validate that it's valid JSON by parsing with placeholders replaced
            try {
              // Replace {{...}} placeholders with a simple value (no quotes)
              // This handles both standalone placeholders and placeholders inside strings
              const testBody = brunoData.body.replace(/\{\{[^}]+\}\}/g, 'PLACEHOLDER');
              JSON.parse(testBody); // Just validate, don't store
            } catch (error) {
              console.warn(`Invalid JSON in ${fullPath}:`, error);
            }
            
            // Store the body as a formatted string to preserve {{}} placeholders
            // The body already has proper formatting from the Bruno file
            bodyTemplate = brunoData.body;
          }
          
          // Create required headers definitions
          const requiredHeaders: ParameterDefinition[] = Object.entries(brunoData.headers)
            .filter(([key]) => !key.startsWith('{{')) // Skip variable headers
            .map(([key, value]) => ({
              name: key,
              description: `Header: ${key}`,
              required: true,
              type: 'string',
              example: value,
            }));
          
          const preset: EndpointPreset = {
            id: generateId(fullPath, brunoData.name),
            name: brunoData.name,
            description: brunoData.name,
            method: brunoData.method,
            endpoint: normalizedUrl,
            category: getCategoryFromPath(fullPath),
            pathParams: pathParams.length > 0 ? pathParams : undefined,
            bodyTemplate,
            requiredHeaders: requiredHeaders.length > 0 ? requiredHeaders : undefined,
          };
          
          currentStructure.presets.push(preset);
        }
      }
    }
    
    // Sort subfolders alphabetically
    currentStructure.subfolders.sort((a, b) => a.name.localeCompare(b.name));
    // Sort presets alphabetically
    currentStructure.presets.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  traverseDirectory(dirPath, structure);
  return structure;
}

/**
 * Load hierarchical Bruno endpoints structure from the reference directory
 */
export function loadBrunoHierarchy(): FolderStructure | null {
  const referenceDir = path.join(process.cwd(), 'reference');
  
  if (!fs.existsSync(referenceDir)) {
    console.warn('Reference directory not found:', referenceDir);
    return null;
  }
  
  // Find the first subdirectory (usually the collection folder)
  const entries = fs.readdirSync(referenceDir, { withFileTypes: true });
  const collectionDir = entries.find(e => e.isDirectory());
  
  if (!collectionDir) {
    console.warn('No collection directory found in reference folder');
    return null;
  }
  
  const collectionPath = path.join(referenceDir, collectionDir.name);
  return buildFolderHierarchy(collectionPath);
}
