import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

// ============================================================================
// TYPES
// ============================================================================

interface CreatePaymentRequestBody {
  currency: string;
  amount: number;
  lineItems: Array<{
    name: string;
    quantity: number;
    totalAmount: number;
    unitPrice: number;
  }>;
  returnUrl: string;
  shippingCountries?: string[];
}

interface CreatePaymentRequestResponse {
  success: boolean;
  paymentRequestId?: string;
  error?: string;
  rawKlarnaRequest?: unknown;
  rawKlarnaResponse?: unknown;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestMetadata: {
    timestamp: string;
    correlationId: string;
    idempotencyKey: string;
  };
}

// ============================================================================
// CERTIFICATE LOADING (reuse from klarna-proxy)
// ============================================================================

function loadCertificates(): { cert: Buffer | null; key: Buffer | null } {
  const skipMtls = process.env.KLARNA_SKIP_MTLS === 'true';

  if (skipMtls) {
    console.log('[Payment CreateRequest] mTLS disabled via KLARNA_SKIP_MTLS');
    return { cert: null, key: null };
  }

  const certPath = process.env.KLARNA_CERT_PATH;
  const keyPath = process.env.KLARNA_KEY_PATH;

  if (!certPath || !keyPath) {
    console.warn('[Payment CreateRequest] Certificate paths not configured');
    return { cert: null, key: null };
  }

  try {
    const resolvedCertPath = path.isAbsolute(certPath)
      ? certPath
      : path.join(process.cwd(), certPath);
    const resolvedKeyPath = path.isAbsolute(keyPath)
      ? keyPath
      : path.join(process.cwd(), keyPath);

    const cert = fs.readFileSync(resolvedCertPath);
    const key = fs.readFileSync(resolvedKeyPath);

    return { cert, key };
  } catch (error) {
    console.error('[Payment CreateRequest] Failed to load certificates:', error);
    return { cert: null, key: null };
  }
}

// ============================================================================
// HTTPS REQUEST HELPER
// ============================================================================

async function makeKlarnaRequest(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: unknown
): Promise<{ status: number; statusText: string; data: unknown; headers: Record<string, string> }> {
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

        const responseHeaders: Record<string, string> = {};
        Object.entries(res.headers).forEach(([key, value]) => {
          if (value) {
            responseHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
          }
        });

        resolve({
          status: res.statusCode || 500,
          statusText: res.statusMessage || 'Unknown',
          data,
          headers: responseHeaders,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (requestBody) {
      req.write(requestBody);
    }

    req.end();
  });
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<CreatePaymentRequestResponse>> {
  const timestamp = new Date().toISOString();
  const correlationId = uuidv4();
  const idempotencyKey = uuidv5(correlationId, uuidv5.URL);

  try {
    const body: CreatePaymentRequestBody = await request.json();

    // Validate required fields
    if (!body.currency || !body.amount || !body.returnUrl) {
      return NextResponse.json({
        success: false,
        error: 'currency, amount, and returnUrl are required',
        requestMetadata: { timestamp, correlationId, idempotencyKey },
      }, { status: 400 });
    }

    const apiKey = process.env.subpartner_api_key;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'subpartner_api_key not configured. Add it to your .env.local file.',
        requestMetadata: { timestamp, correlationId, idempotencyKey },
      }, { status: 500 });
    }

    // Build Klarna API URL — sub-partner endpoint (no account ID in path)
    const baseUrl = process.env.KLARNA_BASE_URL || 'https://api-global.test.klarna.com';
    const url = `${baseUrl}/v2/payment/requests`;

    // Build headers
    const headers: Record<string, string> = {
      'Authorization': `Basic ${apiKey}`,
      'Content-Type': 'application/json',
      'Partner-Correlation-Id': correlationId,
      'Klarna-Idempotency-Key': idempotencyKey,
      'Klarna-Integration-Metadata': JSON.stringify({
        integrator: {
          name: 'KlarnaNetworkDemo',
          session_reference: uuidv4(),
          module_name: 'server-side-payment',
          module_version: 'v1.0',
        },
        originators: [],
      }),
    };

    // Build sanitized request headers (redact auth)
    const sanitizedRequestHeaders = { ...headers };
    sanitizedRequestHeaders['Authorization'] = 'Basic ****';

    // Build request body
    const paymentRequestReference = `pr_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const purchaseReference = `purchase_${Date.now()}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const klarnaBody: any = {
      currency: body.currency,
      amount: body.amount,
      payment_request_reference: paymentRequestReference,
      supplementary_purchase_data: {
        purchase_reference: purchaseReference,
        line_items: body.lineItems?.map(item => ({
          name: item.name,
          quantity: item.quantity,
          total_amount: item.totalAmount,
          unit_price: item.unitPrice,
        })),
      },
      customer_interaction_config: {
        return_url: body.returnUrl,
      },
      shipping_config: {
        mode: 'EDITABLE',
        supported_countries: body.shippingCountries || ['US'],
      },
    };

    console.log(`[Payment CreateRequest] POST ${url} (correlation: ${correlationId})`);
    console.log(`[Payment CreateRequest] Request body:`, JSON.stringify(klarnaBody, null, 2));

    // Make the request
    const response = await makeKlarnaRequest('POST', url, headers, klarnaBody);

    console.log(`[Payment CreateRequest] Response status: ${response.status}`);
    console.log(`[Payment CreateRequest] Response data:`, JSON.stringify(response.data, null, 2));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseData = response.data as any;

    if (response.status >= 200 && response.status < 300) {
      const paymentRequestId = responseData?.payment_request_id;

      return NextResponse.json({
        success: true,
        paymentRequestId,
        rawKlarnaRequest: klarnaBody,
        rawKlarnaResponse: responseData,
        requestHeaders: sanitizedRequestHeaders,
        responseHeaders: response.headers,
        requestMetadata: { timestamp, correlationId, idempotencyKey },
      });
    } else {
      // Error response
      let errorMessage = `HTTP ${response.status}`;

      if (responseData?.error_messages && Array.isArray(responseData.error_messages)) {
        errorMessage = responseData.error_messages.map((e: { text?: string; field?: string }) =>
          e.field ? `${e.field}: ${e.text}` : e.text
        ).join('; ');
      } else if (responseData?.message) {
        errorMessage = responseData.message;
      } else if (responseData?.error) {
        errorMessage = typeof responseData.error === 'string'
          ? responseData.error
          : JSON.stringify(responseData.error);
      } else if (typeof responseData === 'string') {
        errorMessage = responseData;
      }

      console.error(`[Payment CreateRequest] Klarna API error: ${errorMessage}`);

      return NextResponse.json({
        success: false,
        error: errorMessage,
        rawKlarnaRequest: klarnaBody,
        rawKlarnaResponse: responseData,
        requestHeaders: sanitizedRequestHeaders,
        responseHeaders: response.headers,
        requestMetadata: { timestamp, correlationId, idempotencyKey },
      }, { status: response.status });
    }
  } catch (error) {
    console.error('[Payment CreateRequest] Error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      requestMetadata: { timestamp, correlationId, idempotencyKey },
    }, { status: 500 });
  }
}
