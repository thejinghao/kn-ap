import { NextRequest, NextResponse } from 'next/server';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

// ============================================================================
// TYPES
// ============================================================================

interface AuthorizeRequest {
  partnerAccountId: string;
  currency: string;
  amount: number;
  paymentOptionId?: string;
  paymentTransactionReference: string;
  paymentRequestReference?: string;
  returnUrl: string;
  appReturnUrl?: string;
  klarnaNetworkSessionToken?: string; // For final authorization
  supplementaryPurchaseData?: {
    purchaseReference?: string;
    lineItems?: Array<{
      name: string;
      quantity: number;
      totalAmount: number;
      unitPrice: number;
    }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    shipping?: any;
  };
}

interface AuthorizeResponse {
  success: boolean;
  data: {
    result: 'APPROVED' | 'DECLINED' | 'STEP_UP_REQUIRED';
    resultReason?: string;
    paymentTransaction?: {
      paymentTransactionId: string;
      paymentTransactionReference: string;
      amount: number;
      currency: string;
      expiresAt?: string;
    };
    paymentRequest?: {
      paymentRequestId: string;
      paymentRequestReference: string;
      amount: number;
      currency: string;
      state: string;
      expiresAt: string;
      stateContext?: {
        customerInteraction?: {
          method: string;
          paymentRequestUrl?: string;
        };
      };
    };
  } | null;
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
    console.log('[Payment Authorize] mTLS disabled via KLARNA_SKIP_MTLS');
    return { cert: null, key: null };
  }

  const certPath = process.env.KLARNA_CERT_PATH;
  const keyPath = process.env.KLARNA_KEY_PATH;

  if (!certPath || !keyPath) {
    console.warn('[Payment Authorize] Certificate paths not configured');
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
    console.error('[Payment Authorize] Failed to load certificates:', error);
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

export async function POST(request: NextRequest): Promise<NextResponse<AuthorizeResponse>> {
  const timestamp = new Date().toISOString();
  const correlationId = uuidv4();
  const idempotencyKey = uuidv5(correlationId, uuidv5.URL);

  try {
    const body: AuthorizeRequest = await request.json();
    
    // Validate required fields
    if (!body.partnerAccountId) {
      return NextResponse.json({
        success: false,
        data: null,
        error: 'partnerAccountId is required',
        requestMetadata: { timestamp, correlationId, idempotencyKey },
      }, { status: 400 });
    }

    const apiKey = process.env.acquiring_partner_api_key;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        data: null,
        error: 'acquiring_partner_api_key not configured',
        requestMetadata: { timestamp, correlationId, idempotencyKey },
      }, { status: 500 });
    }

    // Build Klarna API URL
    const baseUrl = process.env.KLARNA_BASE_URL || 'https://api-global.test.klarna.com';
    const url = `${baseUrl}/v2/accounts/${body.partnerAccountId}/payment/authorize`;

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
          module_name: 'payment-button',
          module_version: 'v1.0'
        },
        originators: []
      }),
    };

    // Add Klarna-Network-Session-Token header for final authorization
    if (body.klarnaNetworkSessionToken) {
      headers['Klarna-Network-Session-Token'] = body.klarnaNetworkSessionToken;
    }

    // Build sanitized request headers (redact auth)
    const sanitizedRequestHeaders = { ...headers };
    sanitizedRequestHeaders['Authorization'] = 'Basic ****';

    // Build request body for Klarna API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const klarnaBody: any = {
      currency: body.currency,
      request_payment_transaction: {
        amount: body.amount,
        payment_transaction_reference: body.paymentTransactionReference,
      },
    };

    // Add payment_option_id if provided
    if (body.paymentOptionId) {
      klarnaBody.request_payment_transaction.payment_option_id = body.paymentOptionId;
    }

    // Add supplementary purchase data if provided
    if (body.supplementaryPurchaseData) {
      klarnaBody.supplementary_purchase_data = {
        purchase_reference: body.supplementaryPurchaseData.purchaseReference,
        line_items: body.supplementaryPurchaseData.lineItems?.map(item => ({
          name: item.name,
          quantity: item.quantity,
          total_amount: item.totalAmount,
          unit_price: item.unitPrice,
        })),
      };

      // Pass through shipping recipient/address data if provided
      if (body.supplementaryPurchaseData.shipping) {
        klarnaBody.supplementary_purchase_data.shipping = body.supplementaryPurchaseData.shipping;
      }
    }

    // Add step_up_config for initial authorization (when no session token)
    if (!body.klarnaNetworkSessionToken && body.returnUrl) {
      klarnaBody.step_up_config = {
        payment_request_reference: body.paymentRequestReference || `pr_${uuidv4()}`,
        customer_interaction_config: {
          method: 'HANDOVER',
          return_url: body.returnUrl,
        },
      };

      if (body.appReturnUrl) {
        klarnaBody.step_up_config.customer_interaction_config.app_return_url = body.appReturnUrl;
      }
    }

    console.log(`[Payment Authorize] POST ${url} (correlation: ${correlationId})`);
    console.log(`[Payment Authorize] Request body:`, JSON.stringify(klarnaBody, null, 2));

    // Make the request
    const response = await makeKlarnaRequest('POST', url, headers, klarnaBody);

    console.log(`[Payment Authorize] Response status: ${response.status}`);
    console.log(`[Payment Authorize] Response data:`, JSON.stringify(response.data, null, 2));

    // Parse and transform response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseData = response.data as any;
    
    if (response.status >= 200 && response.status < 300) {
      const transactionResponse = responseData?.payment_transaction_response;
      const result = transactionResponse?.result;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformedData: any = {
        result: result,
        resultReason: transactionResponse?.result_reason,
      };

      // Add payment transaction if approved
      if (result === 'APPROVED' && transactionResponse?.payment_transaction) {
        const tx = transactionResponse.payment_transaction;
        transformedData.paymentTransaction = {
          paymentTransactionId: tx.payment_transaction_id,
          paymentTransactionReference: tx.payment_transaction_reference,
          amount: tx.amount,
          currency: tx.currency,
          expiresAt: tx.expires_at,
        };
      }

      // Add payment request if step-up required
      if (result === 'STEP_UP_REQUIRED' && responseData?.payment_request) {
        const pr = responseData.payment_request;
        transformedData.paymentRequest = {
          paymentRequestId: pr.payment_request_id,
          paymentRequestReference: pr.payment_request_reference,
          amount: pr.amount,
          currency: pr.currency,
          state: pr.state,
          expiresAt: pr.expires_at,
          stateContext: pr.state_context ? {
            customerInteraction: pr.state_context.customer_interaction ? {
              method: pr.state_context.customer_interaction.method,
              paymentRequestUrl: pr.state_context.customer_interaction.payment_request_url,
            } : undefined,
          } : undefined,
        };
      }

      return NextResponse.json({
        success: true,
        data: transformedData,
        rawKlarnaRequest: klarnaBody,
        rawKlarnaResponse: responseData,
        requestHeaders: sanitizedRequestHeaders,
        responseHeaders: response.headers,
        requestMetadata: { timestamp, correlationId, idempotencyKey },
      });
    } else {
      // Error response - extract detailed error message from Klarna
      let errorMessage = `HTTP ${response.status}`;
      
      if (responseData?.error_messages && Array.isArray(responseData.error_messages)) {
        // Klarna API v2 error format
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

      console.error(`[Payment Authorize] Klarna API error: ${errorMessage}`);
      console.error(`[Payment Authorize] Full error response:`, JSON.stringify(responseData, null, 2));
      
      return NextResponse.json({
        success: false,
        data: null,
        error: errorMessage,
        rawKlarnaRequest: klarnaBody,
        rawKlarnaResponse: responseData,
        requestHeaders: sanitizedRequestHeaders,
        responseHeaders: response.headers,
        requestMetadata: { timestamp, correlationId, idempotencyKey },
      }, { status: response.status });
    }

  } catch (error) {
    console.error('[Payment Authorize] Error:', error);
    
    return NextResponse.json({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      requestMetadata: { timestamp, correlationId, idempotencyKey },
    }, { status: 500 });
  }
}
