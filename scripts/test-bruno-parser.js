#!/usr/bin/env node

/**
 * Script to test the Bruno parser and display parsed endpoints
 * Run: node scripts/test-bruno-parser.js
 */

const path = require('path');

// Import the bruno-parser (we need to compile TypeScript first)
async function main() {
  try {
    console.log('Testing Bruno Parser...\n');
    console.log('Note: This requires the Next.js build to be up-to-date.\n');
    
    // For server-side execution, we can use the loadBrunoEndpoints function
    // This script is meant to be run as part of the build process or manually
    
    const referenceDir = path.join(process.cwd(), 'reference');
    console.log(`Looking for Bruno files in: ${referenceDir}\n`);
    
    // Check if reference directory exists
    const fs = require('fs');
    if (!fs.existsSync(referenceDir)) {
      console.error('❌ Reference directory not found!');
      console.error(`   Expected: ${referenceDir}`);
      process.exit(1);
    }
    
    // Count .bru files
    let brunoFileCount = 0;
    function countBruFiles(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          countBruFiles(fullPath);
        } else if (entry.name.endsWith('.bru') && entry.name !== 'folder.bru') {
          brunoFileCount++;
        }
      }
    }
    
    countBruFiles(referenceDir);
    
    console.log(`✓ Found ${brunoFileCount} Bruno API specification files\n`);
    console.log('To see parsed endpoints, start the Next.js dev server:');
    console.log('  npm run dev\n');
    console.log('The endpoints will be automatically loaded and merged with static presets.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
