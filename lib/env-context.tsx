'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  EnvironmentVariable,
  EnvironmentContextType,
  SetVariableOptions,
  ResponseMetadata,
} from './types';
import {
  substituteInString,
  findVariablesInText,
} from './env-substitution';

/**
 * Detect if a variable name suggests it should be treated as a secret
 * (Duplicated from env-loader.ts to avoid importing server-side code)
 */
function isSecretVariable(name: string): boolean {
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

/**
 * Parse a .env file content string
 * Format: key = value (with optional spaces around =)
 */
function parseEnvFileContent(content: string): Record<string, string> {
  const variables: Record<string, string> = {};
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

// LocalStorage key for user overrides
const LOCAL_STORAGE_KEY = 'kn-ap-env-variables';

// Default context value
const defaultContextValue: EnvironmentContextType = {
  variables: {},
  isLoading: true,
  error: null,
  getVariable: () => undefined,
  setVariable: () => {},
  deleteVariable: () => {},
  resetVariable: () => {},
  getAllVariables: () => [],
  substituteVariables: (text) => text,
  findMissingVariables: () => [],
  saveFromResponse: () => { return; },
  importEnvFile: () => {},
  exportEnvFile: () => '',
};

// Create the context
const EnvironmentContext = createContext<EnvironmentContextType>(defaultContextValue);

// Hook to use the environment context
export function useEnvironment(): EnvironmentContextType {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error('useEnvironment must be used within an EnvironmentProvider');
  }
  return context;
}

interface EnvironmentProviderProps {
  children: ReactNode;
}

export function EnvironmentProvider({ children }: EnvironmentProviderProps) {
  // Base variables (read-only, loaded from API - either Vercel or .env.local)
  const [baseVariables, setBaseVariables] = useState<Record<string, EnvironmentVariable>>({});
  
  // User variables (can be edited, persisted to localStorage)
  const [userVariables, setUserVariables] = useState<Record<string, EnvironmentVariable>>({});
  
  // Loading and error state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load base variables from API on mount (Vercel or .env.local)
  useEffect(() => {
    async function loadBaseVariables() {
      try {
        const response = await fetch('/api/env');
        const data = await response.json();
        
        if (data.success && data.variables) {
          setBaseVariables(data.variables);
          console.log(`[Environment] Loaded variables from source: ${data.source || 'unknown'}`);
        } else if (data.error) {
          console.warn('[Environment] Error loading variables:', data.error);
        }
      } catch (err) {
        console.error('[Environment] Failed to load environment variables:', err);
        setError('Failed to load environment variables');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadBaseVariables();
  }, []);
  
  // Load user variables from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserVariables(parsed);
      }
    } catch (err) {
      console.error('[Environment] Failed to load user variables from localStorage:', err);
    }
  }, []);
  
  // Save user variables to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userVariables));
    } catch (err) {
      console.error('[Environment] Failed to save user variables to localStorage:', err);
    }
  }, [userVariables]);
  
  // Merge base and user variables (user overrides take precedence)
  const mergedVariables: Record<string, EnvironmentVariable> = {
    ...baseVariables,
    ...userVariables,
  };
  
  // Get a variable value by name
  const getVariable = useCallback((name: string): string | undefined => {
    return mergedVariables[name]?.value;
  }, [mergedVariables]);
  
  // Set a variable value
  const setVariable = useCallback((
    name: string,
    value: string,
    options?: SetVariableOptions
  ) => {
    const now = new Date().toISOString();
    
    setUserVariables(prev => ({
      ...prev,
      [name]: {
        name,
        value,
        source: options?.source || 'user',
        description: options?.description,
        isSecret: options?.isSecret ?? isSecretVariable(name),
        metadata: options?.metadata,
        createdAt: prev[name]?.createdAt || now,
        usageCount: prev[name]?.usageCount || 0,
      },
    }));
  }, []);
  
  // Delete a variable
  const deleteVariable = useCallback((name: string) => {
    setUserVariables(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);
  
  // Reset a variable to base default (remove user override)
  const resetVariable = useCallback((name: string) => {
    // Only delete if it's a user override of a base variable
    if (baseVariables[name]) {
      setUserVariables(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  }, [baseVariables]);
  
  // Get all variables as an array
  const getAllVariables = useCallback((): EnvironmentVariable[] => {
    const allVars: EnvironmentVariable[] = [];
    
    // Add base variables first (from Vercel or .env.local)
    for (const [name, variable] of Object.entries(baseVariables)) {
      // Check if overridden by user
      const userOverride = userVariables[name];
      if (userOverride) {
        // Show user override with indication it overrides base default
        allVars.push({
          ...userOverride,
          description: userOverride.description || `Overrides default`,
        });
      } else {
        allVars.push(variable);
      }
    }
    
    // Add user-only variables (not in base)
    for (const [name, variable] of Object.entries(userVariables)) {
      if (!baseVariables[name]) {
        allVars.push(variable);
      }
    }
    
    // Sort alphabetically
    return allVars.sort((a, b) => a.name.localeCompare(b.name));
  }, [baseVariables, userVariables]);
  
  // Substitute variables in text
  const substituteVariables = useCallback((text: string): string => {
    // Build flat value map
    const valueMap: Record<string, string> = {};
    for (const [name, variable] of Object.entries(mergedVariables)) {
      valueMap[name] = variable.value;
    }
    
    const { result } = substituteInString(text, valueMap);
    return result;
  }, [mergedVariables]);
  
  // Find missing variables in text
  const findMissingVariables = useCallback((text: string): string[] => {
    const variables = findVariablesInText(text);
    return variables.filter(name => !(name in mergedVariables));
  }, [mergedVariables]);
  
  // Save a value from API response
  const saveFromResponse = useCallback((
    name: string,
    value: string,
    isSecret?: boolean,
    metadata?: ResponseMetadata
  ) => {
    setVariable(name, value, {
      source: 'response',
      isSecret: isSecret ?? isSecretVariable(name),
      metadata,
    });
  }, [setVariable]);
  
  // Import variables from .env file content
  const importEnvFile = useCallback((content: string) => {
    const parsed = parseEnvFileContent(content);
    const now = new Date().toISOString();
    
    setUserVariables(prev => {
      const next = { ...prev };
      
      for (const [name, value] of Object.entries(parsed)) {
        next[name] = {
          name,
          value,
          source: 'user',
          isSecret: isSecretVariable(name),
          createdAt: now,
        };
      }
      
      return next;
    });
  }, []);
  
  // Export variables to .env format
  const exportEnvFile = useCallback((): string => {
    const lines: string[] = [];
    
    for (const variable of getAllVariables()) {
      lines.push(`${variable.name} = ${variable.value}`);
    }
    
    return lines.join('\n');
  }, [getAllVariables]);
  
  const contextValue: EnvironmentContextType = {
    variables: mergedVariables,
    isLoading,
    error,
    getVariable,
    setVariable,
    deleteVariable,
    resetVariable,
    getAllVariables,
    substituteVariables,
    findMissingVariables,
    saveFromResponse,
    importEnvFile,
    exportEnvFile,
  };
  
  return (
    <EnvironmentContext.Provider value={contextValue}>
      {children}
    </EnvironmentContext.Provider>
  );
}

export default EnvironmentContext;
