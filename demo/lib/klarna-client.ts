import https from 'https';
import fs from 'fs';
import path from 'path';
import { config, getFullApiUrl } from './config';
import { randomUUID } from 'crypto';

// Types for Klarna API responses
export interface KlarnaCredential {
  credential_id: string;
  description?: string;
  created_at?: string;
  state?: string;
}

export interface KlarnaCredentialsResponse {
  credentials: KlarnaCredential[];
}

export interface KlarnaApiError {
  error_code?: string;
  error_messages?: string[];
  correlation_id?: string;
}

export interface KlarnaRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

// Create HTTPS agent with mTLS configuration
function createMtlsAgent(): https.Agent | undefined {
  try {
    const certPath = path.resolve(process.cwd(), config.klarna.certPath);
    const keyPath = path.resolve(process.cwd(), config.klarna.keyPath);

    // Check if certificate files exist
    if (!fs.existsSync(certPath)) {
      console.warn(`Certificate file not found: ${certPath}`);
      return undefined;
    }
    if (!fs.existsSync(keyPath)) {
      console.warn(`Key file not found: ${keyPath}`);
      return undefined;
    }

    const cert = fs.readFileSync(certPath);
    const key = fs.readFileSync(keyPath);

    return new https.Agent({
      cert,
      key,
      rejectUnauthorized: true, // Verify Klarna's server certificate
    });
  } catch (error) {
    console.error('Failed to create mTLS agent:', error);
    return undefined;
  }
}

// Generate integration metadata header
function getIntegrationMetadata(sessionReference: string): string {
  return JSON.stringify({
    integrator: {
      name: config.integrator.name,
      session_reference: sessionReference,
      module_name: 'klarna-network-demo',
      module_version: config.integrator.moduleVersion,
    },
    originators: [],
  });
}

// Create Basic Auth header value
function getBasicAuthHeader(): string {
  // Klarna uses empty username with API key as password
  const credentials = `:${config.klarna.apiKey}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

/**
 * Make a request to the Klarna Network API with mTLS authentication
 */
export async function klarnaRequest<T>(
  endpoint: string,
  options: KlarnaRequestOptions = {}
): Promise<{ data?: T; error?: KlarnaApiError; status: number }> {
  const { method = 'GET', body, headers = {} } = options;
  
  const url = getFullApiUrl(endpoint);
  const correlationId = randomUUID();
  const sessionReference = randomUUID();

  const requestHeaders: Record<string, string> = {
    'Authorization': getBasicAuthHeader(),
    'Partner-Correlation-Id': correlationId,
    'Klarna-Integration-Metadata': getIntegrationMetadata(sessionReference),
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...headers,
  };

  const agent = createMtlsAgent();

  try {
    const fetchOptions: RequestInit & { agent?: https.Agent } = {
      method,
      headers: requestHeaders,
    };

    // Add body for POST/PATCH requests
    if (body && ['POST', 'PATCH'].includes(method)) {
      fetchOptions.body = JSON.stringify(body);
    }

    // Add mTLS agent if available
    if (agent) {
      fetchOptions.agent = agent;
    }

    console.log(`[Klarna API] ${method} ${url}`);
    console.log(`[Klarna API] Correlation ID: ${correlationId}`);

    const response = await fetch(url, fetchOptions as RequestInit);
    
    const responseText = await response.text();
    let responseData: T | KlarnaApiError | undefined;
    
    try {
      responseData = responseText ? JSON.parse(responseText) : undefined;
    } catch {
      console.error('[Klarna API] Failed to parse response:', responseText);
    }

    if (!response.ok) {
      console.error(`[Klarna API] Error ${response.status}:`, responseData);
      return {
        error: responseData as KlarnaApiError,
        status: response.status,
      };
    }

    return {
      data: responseData as T,
      status: response.status,
    };
  } catch (error) {
    console.error('[Klarna API] Request failed:', error);
    return {
      error: {
        error_code: 'REQUEST_FAILED',
        error_messages: [error instanceof Error ? error.message : 'Unknown error'],
        correlation_id: correlationId,
      },
      status: 500,
    };
  }
}

/**
 * List all API keys for the account
 */
export async function listApiKeys(): Promise<{
  data?: KlarnaCredentialsResponse;
  error?: KlarnaApiError;
  status: number;
}> {
  return klarnaRequest<KlarnaCredentialsResponse>(
    '/account/integration/credentials/api-key'
  );
}

/**
 * Get a specific API key by credential ID
 */
export async function getApiKey(credentialId: string): Promise<{
  data?: KlarnaCredential;
  error?: KlarnaApiError;
  status: number;
}> {
  return klarnaRequest<KlarnaCredential>(
    `/account/integration/credentials/api-key/${credentialId}`
  );
}
