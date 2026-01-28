// Klarna Network API Configuration

export const config = {
  klarna: {
    apiKey: process.env.acquiring_partner_api_key || '',
    baseUrl: process.env.KLARNA_BASE_URL || 'https://api-global.test.klarna.com',
    apiVersion: process.env.KLARNA_API_VERSION || 'v2',
    certPath: process.env.KLARNA_CERT_PATH || './certs/client-cert.pem',
    keyPath: process.env.KLARNA_KEY_PATH || './certs/client-key.pem',
  },
  integrator: {
    name: process.env.INTEGRATOR_NAME || 'KlarnaNetworkDemo',
    moduleVersion: process.env.MODULE_VERSION || 'v1.0',
  },
} as const;

export function getFullApiUrl(path: string): string {
  const { baseUrl, apiVersion } = config.klarna;
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}/${apiVersion}${normalizedPath}`;
}

export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.klarna.apiKey) {
    errors.push('acquiring_partner_api_key is not set');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
