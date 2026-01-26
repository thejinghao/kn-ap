import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

// Type definitions for the proxy request
interface ProxyRequest {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  endpoint: string;
  headers?: Record<string, string>;
  body?: unknown;
}

interface ProxyResponse {
  success: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  requestMetadata: {
    timestamp: string;
    fullUrl: string;
    method: string;
    correlationId: string;
    idempotencyKey?: string;
  };
  error?: string;
}

// Load mTLS certificates
function loadCertificates(): { cert: Buffer | null; key: Buffer | null } {
  const skipMtls = process.env.KLARNA_SKIP_MTLS === 'true';
  
  if (skipMtls) {
    console.log('[Klarna Proxy] mTLS disabled via KLARNA_SKIP_MTLS');
    return { cert: null, key: null };
  }

  const certPath = process.env.KLARNA_CERT_PATH;
  const keyPath = process.env.KLARNA_KEY_PATH;

  if (!certPath || !keyPath) {
    console.warn('[Klarna Proxy] Certificate paths not configured');
    return { cert: null, key: null };
  }

  try {
    // Resolve paths relative to project root
    const resolvedCertPath = path.isAbsolute(certPath) 
      ? certPath 
      : path.join(process.cwd(), certPath);
    const resolvedKeyPath = path.isAbsolute(keyPath) 
      ? keyPath 
      : path.join(process.cwd(), keyPath);

    const cert = fs.readFileSync(resolvedCertPath);
    const key = fs.readFileSync(resolvedKeyPath);
    
    console.log('[Klarna Proxy] mTLS certificates loaded successfully');
    return { cert, key };
  } catch (error) {
    console.error('[Klarna Proxy] Failed to load certificates:', error);
    return { cert: null, key: null };
  }
}

// Create HTTPS agent with mTLS
function createHttpsAgent(): https.Agent {
  const { cert, key } = loadCertificates();
  
  const agentOptions: https.AgentOptions = {
    rejectUnauthorized: true,
  };

  if (cert && key) {
    agentOptions.cert = cert;
    agentOptions.key = key;
  }

  return new https.Agent(agentOptions);
}

// Generate required Klarna headers
function generateKlarnaHeaders(
  method: string,
  customHeaders?: Record<string, string>
): { headers: Record<string, string>; correlationId: string; idempotencyKey?: string } {
  const apiKey = process.env.KLARNA_API_KEY;
  
  if (!apiKey) {
    throw new Error('KLARNA_API_KEY is not configured');
  }

  const correlationId = uuidv4();
  const headers: Record<string, string> = {
    'Authorization': `Basic ${apiKey}`,
    'Content-Type': 'application/json',
    'Partner-Correlation-Id': correlationId,
    'Klarna-Integration-Metadata': JSON.stringify({
      integrator: {
        name: 'KlarnaNetworkDemo',
        session_reference: uuidv4(),
        module_name: 'api-tester',
        module_version: 'v1.0'
      },
      originators: []
    }),
  };

  // Add idempotency key for mutating operations
  let idempotencyKey: string | undefined;
  if (['POST', 'PATCH', 'PUT'].includes(method.toUpperCase())) {
    const namespace = uuidv5.URL; // 6ba7b811-9dad-11d1-80b4-00c04fd430c8
    idempotencyKey = uuidv5(correlationId, namespace);
    headers['Klarna-Idempotency-Key'] = idempotencyKey;
  }

  // Merge custom headers (custom headers take precedence)
  if (customHeaders) {
    Object.entries(customHeaders).forEach(([key, value]) => {
      if (value && key.toLowerCase() !== 'authorization') {
        // Don't allow overriding authorization
        headers[key] = value;
      }
    });
  }

  return { headers, correlationId, idempotencyKey };
}

// Make request to Klarna API using native https module for proper mTLS support
async function makeKlarnaRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: unknown
): Promise<{ status: number; statusText: string; headers: Record<string, string>; data: unknown }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const { cert, key } = loadCertificates();
    
    const requestBody = body ? JSON.stringify(body) : undefined;
    
    const options: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method.toUpperCase(),
      headers: {
        ...headers,
        ...(requestBody ? { 'Content-Length': Buffer.byteLength(requestBody) } : {}),
      },
      rejectUnauthorized: true,
    };

    // Add mTLS certificates if available
    if (cert && key) {
      options.cert = cert;
      options.key = key;
    }

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        // Convert headers to plain object
        const responseHeaders: Record<string, string> = {};
        Object.entries(res.headers).forEach(([headerKey, value]) => {
          if (value) {
            responseHeaders[headerKey] = Array.isArray(value) ? value.join(', ') : value;
          }
        });

        // Try to parse response as JSON
        let data: unknown;
        const contentType = res.headers['content-type'];
        if (contentType?.includes('application/json')) {
          try {
            data = JSON.parse(responseData);
          } catch {
            data = responseData;
          }
        } else {
          data = responseData;
        }

        resolve({
          status: res.statusCode || 500,
          statusText: res.statusMessage || 'Unknown',
          headers: responseHeaders,
          data,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    // Set timeout
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    // Write body if present
    if (requestBody) {
      req.write(requestBody);
    }
    
    req.end();
  });
}

export async function POST(request: NextRequest): Promise<NextResponse<ProxyResponse>> {
  const timestamp = new Date().toISOString();
  
  try {
    // Parse the proxy request
    const proxyRequest: ProxyRequest = await request.json();
    const { method, endpoint, headers: customHeaders, body } = proxyRequest;

    // Validate required fields
    if (!method || !endpoint) {
      return NextResponse.json({
        success: false,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        data: null,
        requestMetadata: {
          timestamp,
          fullUrl: '',
          method: method || 'UNKNOWN',
          correlationId: '',
        },
        error: 'Missing required fields: method and endpoint are required',
      }, { status: 400 });
    }

    // Validate endpoint (prevent path traversal)
    if (!endpoint.startsWith('/')) {
      return NextResponse.json({
        success: false,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        data: null,
        requestMetadata: {
          timestamp,
          fullUrl: '',
          method,
          correlationId: '',
        },
        error: 'Endpoint must start with /',
      }, { status: 400 });
    }

    // Build full URL
    const baseUrl = process.env.KLARNA_BASE_URL || 'https://api-global.test.klarna.com';
    const fullUrl = `${baseUrl}${endpoint}`;

    // Generate headers
    const { headers, correlationId, idempotencyKey } = generateKlarnaHeaders(method, customHeaders);

    console.log(`[Klarna Proxy] ${method} ${fullUrl} (correlation: ${correlationId})`);

    // Make the request
    const response = await makeKlarnaRequest(method, fullUrl, headers, body);

    return NextResponse.json({
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
      requestMetadata: {
        timestamp,
        fullUrl,
        method,
        correlationId,
        idempotencyKey,
      },
    });

  } catch (error) {
    console.error('[Klarna Proxy] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json({
      success: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: {},
      data: null,
      requestMetadata: {
        timestamp,
        fullUrl: '',
        method: 'UNKNOWN',
        correlationId: '',
      },
      error: errorMessage,
    }, { status: 500 });
  }
}

// Handle OPTIONS for CORS preflight (if needed)
export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json({}, { status: 200 });
}
