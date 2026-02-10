#!/usr/bin/env node

/**
 * Parse Bruno API collection files to extract endpoint information
 * including path parameters, headers, body templates, query parameters,
 * and environment variables from .env files.
 */

const fs = require('fs');
const path = require('path');

const REFERENCE_DIR = path.join(__dirname, '../reference');
const COLLECTION_DIR = path.join(__dirname, '../reference/Klarna_Network_v2_r2512_PUBLIC');
const BRUNO_DIR = path.join(__dirname, '../reference/Klarna_Network_v2_r2512_PUBLIC/Management API');

const VALIDATE_MODE = process.argv.includes('--validate');

/**
 * Parse a Bruno-style .env file
 * Format: key = value (with optional spaces around =)
 */
function parseEnvFile(content) {
  const variables = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }
    
    const separatorIndex = trimmedLine.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    
    const key = trimmedLine.substring(0, separatorIndex).trim();
    const value = trimmedLine.substring(separatorIndex + 1).trim();
    
    if (key) {
      variables[key] = value;
    }
  }
  
  return variables;
}

/**
 * Find and parse the .env file in the Bruno collection
 */
function loadBrunoEnvFile() {
  try {
    const entries = fs.readdirSync(REFERENCE_DIR, { withFileTypes: true });
    const collectionDir = entries.find(e => e.isDirectory());
    
    if (!collectionDir) {
      console.warn('No collection directory found');
      return null;
    }
    
    const envFilePath = path.join(REFERENCE_DIR, collectionDir.name, '.env');
    
    if (!fs.existsSync(envFilePath)) {
      console.warn('.env file not found at:', envFilePath);
      return null;
    }
    
    const content = fs.readFileSync(envFilePath, 'utf-8');
    return parseEnvFile(content);
  } catch (error) {
    console.error('Error loading .env file:', error);
    return null;
  }
}

function parseBrunoFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const endpoint = {
    name: '',
    method: '',
    url: '',
    pathParams: [],
    queryParams: [],
    headers: [],
    body: null,
  };
  
  let section = null;
  let bodyContent = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Parse meta section
    if (line.startsWith('meta {')) {
      section = 'meta';
    } else if (line.startsWith('name:') && section === 'meta') {
      endpoint.name = line.replace('name:', '').trim();
    }
    
    // Parse HTTP method sections
    else if (line.match(/^(get|post|patch|put|delete) \{/)) {
      endpoint.method = line.split(' ')[0].toUpperCase();
      section = 'http';
    } else if (line.startsWith('url:') && section === 'http') {
      endpoint.url = line.replace('url:', '').trim();
    }
    
    // Parse path parameters
    else if (line.startsWith('params:path {')) {
      section = 'path-params';
    } else if (section === 'path-params' && line.includes(':') && !line.startsWith('}')) {
      const [name, value] = line.split(':').map(s => s.trim());
      if (name && name !== '}') {
        endpoint.pathParams.push(name);
      }
    }
    
    // Parse query parameters
    else if (line.startsWith('params:query {')) {
      section = 'query-params';
    } else if (section === 'query-params' && line.includes(':') && !line.startsWith('}')) {
      const [name, value] = line.split(':').map(s => s.trim());
      if (name && name !== '}') {
        endpoint.queryParams.push(name);
      }
    }
    
    // Parse headers
    else if (line.startsWith('headers {')) {
      section = 'headers';
    } else if (section === 'headers' && line.includes(':') && !line.startsWith('}')) {
      const [name, value] = line.split(':').map(s => s.trim());
      if (name && name !== '}') {
        endpoint.headers.push(name);
      }
    }
    
    // Parse body
    else if (line.startsWith('body:json {')) {
      section = 'body';
    } else if (section === 'body' && !line.startsWith('}')) {
      bodyContent.push(line);
    }
    
    // End of section
    else if (line === '}') {
      if (section === 'body' && bodyContent.length > 0) {
        try {
          endpoint.body = bodyContent.join('\n').trim();
        } catch (e) {
          // Invalid JSON, skip
        }
      }
      section = null;
    }
  }
  
  return endpoint;
}

function extractPathParamsFromUrl(url) {
  // Extract parameters in the format :param or {param}
  const colonParams = url.match(/:(\w+)/g) || [];
  const braceParams = url.match(/\{(\w+)\}/g) || [];
  
  const params = [
    ...colonParams.map(p => p.replace(':', '')),
    ...braceParams.map(p => p.replace(/[{}]/g, ''))
  ];
  
  return [...new Set(params)]; // Remove duplicates
}

function scanDirectory(dir, category = '') {
  const endpoints = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Recursively scan subdirectories
        endpoints.push(...scanDirectory(fullPath, item));
      } else if (item.endsWith('.bru') && item !== 'folder.bru' && item !== 'collection.bru') {
        const endpoint = parseBrunoFile(fullPath);
        
        // Clean up URL and extract path params
        let cleanUrl = endpoint.url
          .replace(/\{\{base_url\}\}/g, '')
          .replace(/\{\{version\}\}/g, '/v2')
          .replace(/\?.*$/g, '') // Remove query string
          .replace(/^\/+/, '/') // Ensure single leading slash
          .replace(/:(\w+)/g, '{$1}') // Convert :param to {param}
          .replace(/\{\{(\w+)\}\}/g, '{$1}'); // Convert {{param}} to {param}

        // Extract path params from URL
        const urlPathParams = extractPathParamsFromUrl(cleanUrl);
        
        endpoints.push({
          file: item,
          category: category || 'Other',
          name: endpoint.name,
          method: endpoint.method,
          endpoint: cleanUrl,
          pathParams: urlPathParams,
          queryParams: endpoint.queryParams,
          headers: endpoint.headers.filter(h => h !== 'Content-Type'),
          hasBody: !!endpoint.body,
          bodyPreview: endpoint.body ? endpoint.body.substring(0, 200) : null,
        });
      }
    }
  } catch (e) {
    console.error(`Error scanning directory ${dir}:`, e.message);
  }
  
  return endpoints;
}

function generateTypeScriptCode(endpoints) {
  const grouped = {};
  
  // Group by category
  endpoints.forEach(ep => {
    if (!grouped[ep.category]) {
      grouped[ep.category] = [];
    }
    grouped[ep.category].push(ep);
  });
  
  console.log('\n=== Endpoints with Path Parameters ===\n');
  
  Object.keys(grouped).sort().forEach(category => {
    const categoryEndpoints = grouped[category].filter(ep => ep.pathParams.length > 0);
    
    if (categoryEndpoints.length > 0) {
      console.log(`\n// ${category}`);
      categoryEndpoints.forEach(ep => {
        console.log(`// ${ep.name} (${ep.method})`);
        console.log(`// Endpoint: ${ep.endpoint}`);
        console.log(`// Path Params: ${ep.pathParams.join(', ')}`);
        if (ep.queryParams.length > 0) {
          console.log(`// Query Params: ${ep.queryParams.join(', ')}`);
        }
        if (ep.headers.length > 0) {
          console.log(`// Custom Headers: ${ep.headers.join(', ')}`);
        }
        console.log();
      });
    }
  });
  
  console.log('\n=== Summary ===\n');
  console.log(`Total endpoints: ${endpoints.length}`);
  console.log(`Endpoints with path parameters: ${endpoints.filter(ep => ep.pathParams.length > 0).length}`);
  console.log(`Endpoints with query parameters: ${endpoints.filter(ep => ep.queryParams.length > 0).length}`);
  console.log(`Endpoints with custom headers: ${endpoints.filter(ep => ep.headers.length > 0).length}`);
  console.log(`Endpoints with body: ${endpoints.filter(ep => ep.hasBody).length}`);
  
  // Generate JSON output
  const outputPath = path.join(__dirname, '../scripts/parsed-endpoints.json');
  fs.writeFileSync(outputPath, JSON.stringify(endpoints, null, 2));
  console.log(`\nDetailed output written to: ${outputPath}`);
}

/**
 * Validate static endpoint definitions against Bruno-parsed endpoints.
 * Compares URLs by normalizing both and matching on method + name similarity.
 */
function validateStaticEndpoints(brunoEndpoints) {
  // Load static endpoints by requiring the compiled TypeScript
  // We'll read the source files directly and extract endpoint strings
  const staticFiles = [
    'credentials.ts', 'accounts.ts', 'onboarding.ts',
    'payments.ts', 'webhooks.ts', 'settlements.ts',
  ];

  const staticEndpoints = [];
  const endpointRegex = /endpoint:\s*['"]([^'"]+)['"]/g;
  const nameRegex = /name:\s*['"]([^'"]+)['"]/g;
  const methodRegex = /method:\s*['"]([^'"]+)['"]/g;

  for (const file of staticFiles) {
    const filePath = path.join(__dirname, '../lib/endpoints', file);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, 'utf-8');
    // Split into individual endpoint blocks by '{' after array items
    const blocks = content.split(/\n\s*\{/).slice(1);

    for (const block of blocks) {
      const epMatch = block.match(/endpoint:\s*['"]([^'"]+)['"]/);
      const nameMatch = block.match(/name:\s*['"]([^'"]+)['"]/);
      const methodMatch = block.match(/method:\s*['"]([^'"]+)['"]/);

      if (epMatch && nameMatch) {
        // Normalize :param to {param} for comparison
        const normalizedEndpoint = epMatch[1].replace(/:(\w+)/g, '{$1}');
        staticEndpoints.push({
          name: nameMatch[1],
          method: methodMatch ? methodMatch[1] : 'GET',
          endpoint: normalizedEndpoint,
          file,
        });
      }
    }
  }

  // Build a lookup of Bruno endpoints by normalized path
  const brunoByPath = new Map();
  for (const ep of brunoEndpoints) {
    const key = `${ep.method} ${ep.endpoint}`;
    brunoByPath.set(key, ep);
    // Also index by endpoint path alone for fuzzy matching
    if (!brunoByPath.has(ep.endpoint)) {
      brunoByPath.set(ep.endpoint, ep);
    }
  }

  console.log('\n=== Validation: Static vs Bruno Endpoints ===\n');

  let mismatches = 0;
  let matches = 0;
  let notFound = 0;

  for (const staticEp of staticEndpoints) {
    const exactKey = `${staticEp.method} ${staticEp.endpoint}`;

    if (brunoByPath.has(exactKey)) {
      matches++;
      continue;
    }

    // Try to find a Bruno endpoint with the same method and similar name
    const brunoMatch = brunoEndpoints.find(bep => {
      if (bep.method !== staticEp.method) return false;
      const bName = bep.name.toLowerCase();
      const sName = staticEp.name.toLowerCase();
      return bName.includes(sName) || sName.includes(bName) ||
        bName.replace(/\s+/g, '').includes(sName.replace(/\s+/g, ''));
    });

    if (brunoMatch) {
      if (brunoMatch.endpoint !== staticEp.endpoint) {
        mismatches++;
        console.log(`MISMATCH [${staticEp.file}] ${staticEp.name} (${staticEp.method})`);
        console.log(`  Static: ${staticEp.endpoint}`);
        console.log(`  Bruno:  ${brunoMatch.endpoint}`);
        console.log();
      } else {
        matches++;
      }
    } else {
      notFound++;
      console.log(`NOT IN BRUNO [${staticEp.file}] ${staticEp.name} (${staticEp.method} ${staticEp.endpoint})`);
    }
  }

  console.log(`\nResults: ${matches} matching, ${mismatches} mismatched, ${notFound} not in Bruno`);

  if (mismatches > 0) {
    console.log('\n⚠ Fix mismatches by updating the static endpoint URLs to match the Bruno .bru files.');
    process.exit(1);
  }
}

// Main execution
console.log('Parsing Bruno API collection files...\n');

// Scan all API directories in the collection, not just Management API
const allEndpoints = [];
if (fs.existsSync(COLLECTION_DIR)) {
  const apiDirs = fs.readdirSync(COLLECTION_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== 'environments');

  for (const dir of apiDirs) {
    const dirPath = path.join(COLLECTION_DIR, dir.name);
    console.log(`Scanning: ${dir.name}`);
    const dirEndpoints = scanDirectory(dirPath);
    allEndpoints.push(...dirEndpoints);
  }
} else {
  console.log(`Scanning directory: ${BRUNO_DIR}\n`);
  allEndpoints.push(...scanDirectory(BRUNO_DIR));
}

if (VALIDATE_MODE) {
  validateStaticEndpoints(allEndpoints);
} else {
  generateTypeScriptCode(allEndpoints);

  // Also parse and output environment variables
  console.log('\n=== Environment Variables ===\n');
  const envVars = loadBrunoEnvFile();

  if (envVars) {
    console.log(`Found ${Object.keys(envVars).length} environment variables:\n`);

    Object.entries(envVars).forEach(([key, value]) => {
      // Mask secret values for display
      const secretPatterns = /api_key|secret|password|token|credential|private|cert|key$/i;
      const displayValue = secretPatterns.test(key)
        ? value.substring(0, 10) + '...'
        : value;
      console.log(`  ${key}: ${displayValue}`);
    });

    // Write environment variables to JSON file
    const envOutputPath = path.join(__dirname, 'parsed-env.json');
    fs.writeFileSync(envOutputPath, JSON.stringify(envVars, null, 2));
    console.log(`\nEnvironment variables written to: ${envOutputPath}`);
  } else {
    console.log('No environment variables found.');
  }
}
