import { NextResponse } from 'next/server';
import { loadEnvironmentVariables, isSecretVariable } from '@/lib/env-loader';
import { EnvironmentVariable, EnvironmentVariableSource } from '@/lib/types';

// Cache the loaded environment variables
let cachedVariables: Record<string, EnvironmentVariable> | null = null;
let cachedSource: EnvironmentVariableSource | 'none' | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * GET /api/env
 * Returns environment variables from Vercel (production) or .env.local (development)
 */
export async function GET() {
  try {
    const now = Date.now();
    
    // Check if cache is still valid
    if (cachedVariables && cachedSource && (now - cacheTimestamp) < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        variables: cachedVariables,
        source: cachedSource,
        cached: true,
      });
    }
    
    // Load fresh variables using hybrid approach
    const { variables: rawVariables, source } = loadEnvironmentVariables();
    
    if (!rawVariables || Object.keys(rawVariables).length === 0) {
      return NextResponse.json({
        success: true,
        variables: {},
        source: 'none',
        message: source === 'none' 
          ? 'No environment variables found. Add variables to .env.local or configure KN_AP_ variables in Vercel.'
          : 'No variables loaded',
      });
    }
    
    // Convert to EnvironmentVariable format
    const variables: Record<string, EnvironmentVariable> = {};
    
    // Map the source from loader to our type (both 'vercel' and 'env_file' are valid sources)
    const variableSource: EnvironmentVariableSource = source === 'none' ? 'env_file' : source;
    
    for (const [name, value] of Object.entries(rawVariables)) {
      variables[name] = {
        name,
        value,
        source: variableSource,
        isSecret: isSecretVariable(name),
        createdAt: new Date().toISOString(),
      };
    }
    
    // Update cache
    cachedVariables = variables;
    cachedSource = source;
    cacheTimestamp = now;
    
    return NextResponse.json({
      success: true,
      variables,
      source,
      count: Object.keys(variables).length,
    });
    
  } catch (error) {
    console.error('[API /env] Error loading environment variables:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      variables: {},
      source: 'none',
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
    cachedSource = null;
    cacheTimestamp = 0;
    
    // Load fresh using hybrid approach
    const { variables: rawVariables, source } = loadEnvironmentVariables();
    
    if (!rawVariables || Object.keys(rawVariables).length === 0) {
      return NextResponse.json({
        success: true,
        variables: {},
        source: 'none',
        message: 'No environment variables found',
      });
    }
    
    // Convert to EnvironmentVariable format
    const variables: Record<string, EnvironmentVariable> = {};
    const variableSource: EnvironmentVariableSource = source === 'none' ? 'env_file' : source;
    
    for (const [name, value] of Object.entries(rawVariables)) {
      variables[name] = {
        name,
        value,
        source: variableSource,
        isSecret: isSecretVariable(name),
        createdAt: new Date().toISOString(),
      };
    }
    
    // Update cache
    cachedVariables = variables;
    cachedSource = source;
    cacheTimestamp = Date.now();
    
    return NextResponse.json({
      success: true,
      variables,
      source,
      count: Object.keys(variables).length,
      message: 'Environment variables reloaded',
    });
    
  } catch (error) {
    console.error('[API /env/reload] Error reloading environment variables:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'none',
    }, { status: 500 });
  }
}
