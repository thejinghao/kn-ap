import { NextResponse } from 'next/server';
import { loadBrunoEnvFile, isSecretVariable } from '@/lib/bruno-env-parser';
import { EnvironmentVariable } from '@/lib/types';

// Cache the loaded environment variables
let cachedVariables: Record<string, EnvironmentVariable> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * GET /api/env
 * Returns Bruno environment variables from the collection's .env file
 */
export async function GET() {
  try {
    const now = Date.now();
    
    // Check if cache is still valid
    if (cachedVariables && (now - cacheTimestamp) < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        variables: cachedVariables,
        cached: true,
      });
    }
    
    // Load fresh variables from .env file
    const rawVariables = loadBrunoEnvFile();
    
    if (!rawVariables) {
      return NextResponse.json({
        success: true,
        variables: {},
        message: 'No .env file found in Bruno collection',
      });
    }
    
    // Convert to EnvironmentVariable format
    const variables: Record<string, EnvironmentVariable> = {};
    
    for (const [name, value] of Object.entries(rawVariables)) {
      variables[name] = {
        name,
        value,
        source: 'bruno',
        isSecret: isSecretVariable(name),
        createdAt: new Date().toISOString(),
      };
    }
    
    // Update cache
    cachedVariables = variables;
    cacheTimestamp = now;
    
    return NextResponse.json({
      success: true,
      variables,
      count: Object.keys(variables).length,
    });
    
  } catch (error) {
    console.error('[API /env] Error loading environment variables:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      variables: {},
    }, { status: 500 });
  }
}

/**
 * POST /api/env/reload
 * Force reload of environment variables (clears cache)
 */
export async function POST() {
  try {
    // Clear cache
    cachedVariables = null;
    cacheTimestamp = 0;
    
    // Load fresh
    const rawVariables = loadBrunoEnvFile();
    
    if (!rawVariables) {
      return NextResponse.json({
        success: true,
        variables: {},
        message: 'No .env file found in Bruno collection',
      });
    }
    
    // Convert to EnvironmentVariable format
    const variables: Record<string, EnvironmentVariable> = {};
    
    for (const [name, value] of Object.entries(rawVariables)) {
      variables[name] = {
        name,
        value,
        source: 'bruno',
        isSecret: isSecretVariable(name),
        createdAt: new Date().toISOString(),
      };
    }
    
    // Update cache
    cachedVariables = variables;
    cacheTimestamp = Date.now();
    
    return NextResponse.json({
      success: true,
      variables,
      count: Object.keys(variables).length,
      message: 'Environment variables reloaded',
    });
    
  } catch (error) {
    console.error('[API /env/reload] Error reloading environment variables:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
