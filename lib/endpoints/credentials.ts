import { EndpointPreset } from '../types';

export const credentialsPresets: EndpointPreset[] = [
  // ========== API Credentials ==========
    {
      id: 'list-api-keys',
      name: 'List All API Keys',
      description: 'Get a list of all API keys for the account',
      method: 'GET',
      endpoint: '/v2/account/integration/credentials/api-key',
      category: 'credentials',
    },

  {
      id: 'get-api-key',
      name: 'Read an API Key',
      description: 'Get details of a specific API key',
      method: 'GET',
      endpoint: '/v2/account/integration/credentials/api-key/{credential_id}',
      category: 'credentials',
      pathParams: [
        {
          name: 'credential_id',
          description: 'The unique identifier of the API key (KRN format)',
          required: true,
          type: 'string',
          example: 'krn:partner:global:account:credential:api-key:...',
        },
      ],
    },

  {
      id: 'create-api-key',
      name: 'Create an API Key',
      description: 'Create a new API key',
      method: 'POST',
      endpoint: '/v2/account/integration/credentials/api-key',
      category: 'credentials',
      bodyTemplate: {
        description: 'New API Key created via Demo App',
      },
    },

  {
      id: 'update-api-key',
      name: 'Update an API Key',
      description: 'Update an existing API key',
      method: 'PATCH',
      endpoint: '/v2/account/integration/credentials/api-key/{credential_id}',
      category: 'credentials',
      pathParams: [
        {
          name: 'credential_id',
          description: 'The unique identifier of the API key',
          required: true,
          type: 'string',
          example: 'krn:partner:global:account:credential:api-key:...',
        },
      ],
      bodyTemplate: {
        description: 'Updated description',
      },
    },

  {
      id: 'disable-api-key',
      name: 'Disable an API Key',
      description: 'Disable an API key',
      method: 'DELETE',
      endpoint: '/v2/account/integration/credentials/api-key/{credential_id}',
      category: 'credentials',
      pathParams: [
        {
          name: 'credential_id',
          description: 'The unique identifier of the API key',
          required: true,
          type: 'string',
          example: 'krn:partner:global:account:credential:api-key:...',
        },
      ],
    },

  // Client Identifiers
    {
      id: 'list-client-ids',
      name: 'List All Client Identifiers',
      description: 'Get a list of all client identifiers',
      method: 'GET',
      endpoint: '/v2/account/integration/credentials/client-identifier',
      category: 'credentials',
    },

  {
      id: 'create-client-id',
      name: 'Create Client Identifier',
      description: 'Create a new client identifier',
      method: 'POST',
      endpoint: '/v2/account/integration/credentials/client-identifier',
      category: 'credentials',
      bodyTemplate: {
        description: 'Client ID for Demo App',
        config: {
          allowed_domains: ['https://localhost:3000', 'https://example.com'],
        },
      },
    },

  {
      id: 'get-client-id',
      name: 'Read a Client Identifier',
      description: 'Read a specific client identifier',
      method: 'GET',
      endpoint: '/v2/account/integration/credentials/client-identifier/{credential_id}',
      category: 'credentials',
      pathParams: [
        {
          name: 'credential_id',
          description: 'The client identifier ID',
          required: true,
        },
      ],
    },

  {
      id: 'update-client-id',
      name: 'Update a Client Identifier',
      description: 'Update a client identifier',
      method: 'PATCH',
      endpoint: '/v2/account/integration/credentials/client-identifier/{credential_id}',
      category: 'credentials',
      pathParams: [
        {
          name: 'credential_id',
          description: 'The client identifier ID',
          required: true,
        },
      ],
      bodyTemplate: {
        description: 'Updated description',
      },
    },

  {
      id: 'disable-client-id',
      name: 'Disable a Client Identifier',
      description: 'Disable a client identifier',
      method: 'DELETE',
      endpoint: '/v2/account/integration/credentials/client-identifier/{credential_id}',
      category: 'credentials',
      pathParams: [
        {
          name: 'credential_id',
          description: 'The client identifier ID',
          required: true,
        },
      ],
    },

  // Client Certificates
    {
      id: 'list-certificates',
      name: 'List Client Certificates',
      description: 'Get all current client certificates',
      method: 'GET',
      endpoint: '/v2/account/integration/credentials/client-certificate',
      category: 'credentials',
    },

  {
      id: 'create-mtls-certificate',
      name: 'Create mTLS Certificate',
      description: 'Create a new mTLS client certificate',
      method: 'POST',
      endpoint: '/v2/account/integration/credentials/client-certificate',
      category: 'credentials',
      bodyTemplate: {
        description: 'mTLS Certificate',
        config: {
          usage: 'MTLS',
          certificate_signing_request: '-----BEGIN CERTIFICATE REQUEST-----\n...\n-----END CERTIFICATE REQUEST-----',
        },
      },
    },

  {
      id: 'create-jwt-certificate',
      name: 'Create JWT Signing Certificate',
      description: 'Create a new JWT signing client certificate',
      method: 'POST',
      endpoint: '/v2/account/integration/credentials/client-certificate',
      category: 'credentials',
      bodyTemplate: {
        description: 'JWT Signing Certificate',
        config: {
          usage: 'JWT_SIGNING',
          certificate_signing_request: '-----BEGIN CERTIFICATE REQUEST-----\n...\n-----END CERTIFICATE REQUEST-----',
        },
      },
    },

  {
      id: 'get-client-certificate',
      name: 'Read a Client Certificate',
      description: 'Read the data for a specific client certificate',
      method: 'GET',
      endpoint: '/v2/account/integration/credentials/client-certificate/{credential_id}',
      category: 'credentials',
      pathParams: [
        {
          name: 'credential_id',
          description: 'The client certificate ID',
          required: true,
        },
      ],
    },

  {
      id: 'update-client-certificate',
      name: 'Update a Client Certificate',
      description: 'Update a client certificate',
      method: 'PATCH',
      endpoint: '/v2/account/integration/credentials/client-certificate/{credential_id}',
      category: 'credentials',
      pathParams: [
        {
          name: 'credential_id',
          description: 'The client certificate ID',
          required: true,
        },
      ],
      bodyTemplate: {
        description: 'Updated description',
      },
    },

  {
      id: 'revoke-client-certificate',
      name: 'Revoke a Client Certificate',
      description: 'Revoke a client certificate',
      method: 'POST',
      endpoint: '/v2/account/integration/credentials/client-certificate/{credential_id}/revoke',
      category: 'credentials',
      pathParams: [
        {
          name: 'credential_id',
          description: 'The client certificate ID',
          required: true,
        },
      ],
      bodyTemplate: {
        revoked_from: new Date().toISOString(),
      },
    },

  {
      id: 'mtls-enforcement-status',
      name: 'Read mTLS Enforcement Status',
      description: 'Check if mTLS authorization is enforced',
      method: 'GET',
      endpoint: '/v2/account/integration/client-certificates/enforcement',
      category: 'credentials',
    },

  {
      id: 'enforce-mtls',
      name: 'Enforce MTLS Authorization',
      description: 'Enable mTLS authorization enforcement',
      method: 'PUT',
      endpoint: '/v2/account/integration/client-certificates/enforcement',
      category: 'credentials',
      bodyTemplate: {
        enforced_from: 'NOW',
      },
    },

  {
      id: 'remove-mtls-enforcement',
      name: 'Remove MTLS Enforcement',
      description: 'Remove enforcement of mTLS authorization',
      method: 'DELETE',
      endpoint: '/v2/account/integration/client-certificates/enforcement',
      category: 'credentials',
    },
];
