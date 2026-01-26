import { EndpointPreset, CategoryInfo } from './types';

// Category definitions - matching the design spec
export const categories: CategoryInfo[] = [
  {
    id: 'credentials',
    name: 'Credentials',
    description: 'Manage API keys and client identifiers',
  },
  {
    id: 'accounts',
    name: 'Accounts',
    description: 'Manage partner accounts and business entities',
  },
  {
    id: 'onboarding',
    name: 'Onboarding',
    description: 'Onboard and manage partners',
  },
  {
    id: 'payments',
    name: 'Payments',
    description: 'Payment requests and transactions',
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Configure webhook notifications',
  },
  {
    id: 'settlements',
    name: 'Settlements',
    description: 'Settlement reports and transactions',
  },
];

// Static endpoint presets (legacy/manual definitions)
export const staticEndpointPresets: EndpointPreset[] = [
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
    id: 'mtls-enforcement-status',
    name: 'Read mTLS Enforcement Status',
    description: 'Check if mTLS authorization is enforced',
    method: 'GET',
    endpoint: '/v2/account/integration/credentials/client-certificate/mtls-enforcement',
    category: 'credentials',
  },

  // ========== Partner Accounts ==========
  {
    id: 'read-partner-account',
    name: 'Read Partner Account',
    description: 'Get details of a partner account',
    method: 'GET',
    endpoint: '/v2/accounts/{account_id}',
    category: 'accounts',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account (KRN format)',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
    ],
  },
  {
    id: 'update-partner-account',
    name: 'Update Partner Account',
    description: 'Update partner account details',
    method: 'PATCH',
    endpoint: '/v2/accounts/{account_id}',
    category: 'accounts',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
    ],
    bodyTemplate: {
      partner_account_name: 'Updated Partner Name',
      partner_account_contact: {
        given_name: 'John',
        family_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '+15555555555',
      },
    },
  },

  // Partner Business Entities
  {
    id: 'list-business-entities',
    name: 'List Business Entities',
    description: 'Get all partner business entities',
    method: 'GET',
    endpoint: '/v2/accounts/{account_id}/partner-business-entities',
    category: 'accounts',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
    ],
  },
  {
    id: 'get-business-entity',
    name: 'Read Business Entity',
    description: 'Get a specific partner business entity',
    method: 'GET',
    endpoint: '/v2/accounts/{account_id}/partner-business-entities/{partner_business_entity_id}',
    category: 'accounts',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
      {
        name: 'partner_business_entity_id',
        description: 'The unique identifier of the partner business entity',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:partner-business-entity:...',
      },
    ],
  },

  // ========== Onboarding ==========
  {
    id: 'onboard-partner',
    name: 'Onboard a Partner',
    description: 'Onboard a new partner to Klarna',
    method: 'POST',
    endpoint: '/v2/distribution/onboard',
    category: 'onboarding',
    bodyTemplate: {
      partner_account_reference: 'M123786123412',
      partner_account_name: 'Demo Partner Store',
      partner_account_contact: {
        given_name: 'John',
        family_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '+18445527621',
      },
      products: [
        {
          type: 'PAYMENT',
          payment_profile_id: '{payment_profile_id}',
          payment_accounts: [
            {
              payment_acquiring_account_id: '{payment_acquiring_account_id}',
              payment_account_reference: 'REF995847',
              partner_business_entity_reference: 'LE_US002',
              default_store_group_reference: 'STORE_NY004',
              default_merchant_category_code: '5411',
            },
          ],
        },
      ],
      partner_business_entities: [
        {
          partner_business_entity_reference: 'LE_US002',
          legal_registered_entity_name: 'Demo Partner LLC',
          legal_registration_country: 'US',
          enabled_merchant_category_codes: ['5411'],
        },
      ],
      store_groups: [
        {
          store_group_reference: 'STORE_NY004',
          stores: [
            {
              type: 'WEBSITE',
              store_reference: 'mystore',
              url: 'https://example.com',
            },
          ],
        },
      ],
    },
  },

  // ========== Payment Profiles & Programs ==========
  {
    id: 'list-payment-profiles',
    name: 'List Payment Profiles',
    description: 'Get all available payment profiles',
    method: 'GET',
    endpoint: '/v2/distribution/payment-profiles',
    category: 'onboarding',
  },
  {
    id: 'list-payment-program-plans',
    name: 'List Payment Program Plans',
    description: 'Get all payment program plans',
    method: 'GET',
    endpoint: '/v2/distribution/payment-program-plans',
    category: 'onboarding',
  },
  {
    id: 'list-acquiring-accounts',
    name: 'List Acquiring Accounts',
    description: 'Get all payment acquiring accounts',
    method: 'GET',
    endpoint: '/v2/account/acquiring/accounts',
    category: 'onboarding',
  },

  // ========== Payment Products ==========
  {
    id: 'list-payment-products',
    name: 'List Payment Products',
    description: 'Get payment products for an account',
    method: 'GET',
    endpoint: '/v2/accounts/{account_id}/payment-products',
    category: 'payments',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
    ],
  },
  {
    id: 'list-payment-accounts',
    name: 'List Payment Accounts',
    description: 'Get payment accounts for a product',
    method: 'GET',
    endpoint: '/v2/accounts/{account_id}/payment-products/{payment_product_id}/payment-accounts',
    category: 'payments',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
      {
        name: 'payment_product_id',
        description: 'The unique identifier of the payment product',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:payment-product:...',
      },
    ],
  },

  // ========== Webhooks ==========
  {
    id: 'list-webhooks',
    name: 'List Webhooks',
    description: 'Get all configured webhooks',
    method: 'GET',
    endpoint: '/v2/account/integration/notifications/webhooks',
    category: 'webhooks',
  },
  {
    id: 'create-webhook',
    name: 'Create Webhook',
    description: 'Create a new webhook subscription',
    method: 'POST',
    endpoint: '/v2/account/integration/notifications/webhooks',
    category: 'webhooks',
    bodyTemplate: {
      url: 'https://your-webhook-endpoint.com/klarna',
      events: ['partner.account.state-change.operational'],
    },
  },
  {
    id: 'list-signing-keys',
    name: 'List Signing Keys',
    description: 'Get webhook signing keys',
    method: 'GET',
    endpoint: '/v2/account/integration/notifications/signing-keys',
    category: 'webhooks',
  },

  // ========== Settlements ==========
  {
    id: 'list-settlements',
    name: 'List Settlements',
    description: 'Get settlement reports',
    method: 'GET',
    endpoint: '/v2/distribution/settlements',
    category: 'settlements',
  },
  {
    id: 'get-settlement-details',
    name: 'Get Settlement Details',
    description: 'Get details of a specific settlement',
    method: 'GET',
    endpoint: '/v2/distribution/settlements/{settlement_id}',
    category: 'settlements',
    pathParams: [
      {
        name: 'settlement_id',
        description: 'The unique identifier of the settlement',
        required: true,
        type: 'string',
        example: 'krn:partner:global:settlement:...',
      },
    ],
  },

  // ========== Brands ==========
  {
    id: 'list-brands',
    name: 'List Brands',
    description: 'Get all brands for a partner account',
    method: 'GET',
    endpoint: '/v2/accounts/{account_id}/brands',
    category: 'accounts',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
    ],
  },
  {
    id: 'get-brand',
    name: 'Read Brand',
    description: 'Get a specific brand',
    method: 'GET',
    endpoint: '/v2/accounts/{account_id}/brands/{brand_id}',
    category: 'accounts',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
      {
        name: 'brand_id',
        description: 'The unique identifier of the brand',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:brand:...',
      },
    ],
  },
  {
    id: 'create-brand',
    name: 'Create Brand',
    description: 'Create a new brand',
    method: 'POST',
    endpoint: '/v2/accounts/{account_id}/brands',
    category: 'accounts',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
    ],
    bodyTemplate: {
      brand_reference: 'brand-001',
      display_name: 'My Brand',
      element: {
        logo_url: 'https://example.com/logo.png',
      },
    },
  },
  {
    id: 'update-brand',
    name: 'Update Brand',
    description: 'Update an existing brand',
    method: 'PATCH',
    endpoint: '/v2/accounts/{account_id}/brands/{brand_id}',
    category: 'accounts',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
      {
        name: 'brand_id',
        description: 'The unique identifier of the brand',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:brand:...',
      },
    ],
    bodyTemplate: {
      display_name: 'Updated Brand Name',
    },
  },

  // ========== Store Groups ==========
  {
    id: 'list-store-groups',
    name: 'List Store Groups',
    description: 'Get all store groups for a partner account',
    method: 'GET',
    endpoint: '/v2/accounts/{account_id}/store-groups',
    category: 'accounts',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
    ],
  },
  {
    id: 'get-store-group',
    name: 'Read Store Group',
    description: 'Get a specific store group',
    method: 'GET',
    endpoint: '/v2/accounts/{account_id}/store-groups/{store_group_id}',
    category: 'accounts',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
      {
        name: 'store_group_id',
        description: 'The unique identifier of the store group',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:store-group:...',
      },
    ],
  },
  {
    id: 'create-store-group',
    name: 'Create Store Group',
    description: 'Create a new store group',
    method: 'POST',
    endpoint: '/v2/accounts/{account_id}/store-groups',
    category: 'accounts',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
    ],
    bodyTemplate: {
      store_group_reference: 'store-group-001',
      brand_id: '{brand_id}',
    },
  },
  {
    id: 'update-store-group',
    name: 'Update Store Group',
    description: 'Update an existing store group',
    method: 'PATCH',
    endpoint: '/v2/accounts/{account_id}/store-groups/{store_group_id}',
    category: 'accounts',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
      {
        name: 'store_group_id',
        description: 'The unique identifier of the store group',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:store-group:...',
      },
    ],
    bodyTemplate: {
      brand_id: '{brand_id}',
    },
  },

  // ========== Stores ==========
  {
    id: 'list-stores',
    name: 'List Stores',
    description: 'Get all stores for a partner account',
    method: 'GET',
    endpoint: '/v2/accounts/{account_id}/stores',
    category: 'accounts',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
    ],
  },
  {
    id: 'get-store',
    name: 'Read Store',
    description: 'Get a specific store',
    method: 'GET',
    endpoint: '/v2/accounts/{account_id}/stores/{store_id}',
    category: 'accounts',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
      {
        name: 'store_id',
        description: 'The unique identifier of the store',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:store:...',
      },
    ],
  },
  {
    id: 'create-store',
    name: 'Create Store',
    description: 'Create a new store',
    method: 'POST',
    endpoint: '/v2/accounts/{account_id}/stores',
    category: 'accounts',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
    ],
    bodyTemplate: {
      type: 'WEBSITE',
      store_reference: 'store-001',
      store_group_id: '{store_group_id}',
      url: 'https://example.com',
    },
  },
  {
    id: 'update-store',
    name: 'Update Store',
    description: 'Update an existing store',
    method: 'PATCH',
    endpoint: '/v2/accounts/{account_id}/stores/{store_id}',
    category: 'accounts',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
      {
        name: 'store_id',
        description: 'The unique identifier of the store',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:store:...',
      },
    ],
    bodyTemplate: {
      url: 'https://updated-example.com',
    },
  },

  // ========== Partner Business Entities (Create/Update) ==========
  {
    id: 'create-business-entity',
    name: 'Create Business Entity',
    description: 'Create a new partner business entity',
    method: 'POST',
    endpoint: '/v2/accounts/{account_id}/partner-business-entities',
    category: 'accounts',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
    ],
    bodyTemplate: {
      partner_business_entity_reference: 'LE-001',
      legal_registered_entity_name: 'New Business Entity LLC',
      legal_registration_country: 'US',
      enabled_merchant_category_codes: ['5411'],
    },
  },
  {
    id: 'update-business-entity',
    name: 'Update Business Entity',
    description: 'Update an existing partner business entity',
    method: 'PATCH',
    endpoint: '/v2/accounts/{account_id}/partner-business-entities/{partner_business_entity_id}',
    category: 'accounts',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
      {
        name: 'partner_business_entity_id',
        description: 'The unique identifier of the partner business entity',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:partner-business-entity:...',
      },
    ],
    bodyTemplate: {
      legal_registered_entity_name: 'Updated Business Entity LLC',
    },
  },

  // ========== Payment Accounts (Create/Update) ==========
  {
    id: 'create-payment-account',
    name: 'Create Payment Account',
    description: 'Create a new payment account',
    method: 'POST',
    endpoint: '/v2/accounts/{account_id}/payment-products/{payment_product_id}/payment-accounts',
    category: 'payments',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
      {
        name: 'payment_product_id',
        description: 'The unique identifier of the payment product',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:payment-product:...',
      },
    ],
    bodyTemplate: {
      payment_account_reference: 'PA-001',
      payment_acquiring_account_id: '{payment_acquiring_account_id}',
      default_merchant_category_code: '5411',
      partner_business_entity_id: '{partner_business_entity_id}',
      default_store_group_id: '{store_group_id}',
    },
  },
  {
    id: 'update-payment-account',
    name: 'Update Payment Account',
    description: 'Update an existing payment account',
    method: 'PATCH',
    endpoint: '/v2/accounts/{account_id}/payment-products/{payment_product_id}/payment-accounts/{payment_account_id}',
    category: 'payments',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
      {
        name: 'payment_product_id',
        description: 'The unique identifier of the payment product',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:payment-product:...',
      },
      {
        name: 'payment_account_id',
        description: 'The unique identifier of the payment account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:payment-account:...',
      },
    ],
    bodyTemplate: {
      default_merchant_category_code: '5412',
    },
  },

  // ========== Payment Products (Disable/Re-enable) ==========
  {
    id: 'disable-payment-product',
    name: 'Disable Payment Product',
    description: 'Disable a payment product',
    method: 'POST',
    endpoint: '/v2/accounts/{account_id}/payment-products/{payment_product_id}/disable',
    category: 'payments',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
      {
        name: 'payment_product_id',
        description: 'The unique identifier of the payment product',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:payment-product:...',
      },
    ],
  },
  {
    id: 'reenable-payment-product',
    name: 'Re-enable Payment Product',
    description: 'Re-enable a disabled payment product',
    method: 'POST',
    endpoint: '/v2/accounts/{account_id}/payment-products/{payment_product_id}/enable',
    category: 'payments',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
      {
        name: 'payment_product_id',
        description: 'The unique identifier of the payment product',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:payment-product:...',
      },
    ],
  },

  // ========== Payment Program Enablements ==========
  {
    id: 'list-payment-program-enablements',
    name: 'List Payment Program Enablements',
    description: 'Get all payment program enablements for a payment account',
    method: 'GET',
    endpoint: '/v2/accounts/{account_id}/payment-products/{payment_product_id}/payment-accounts/{payment_account_id}/payment-program-enablements',
    category: 'payments',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
      {
        name: 'payment_product_id',
        description: 'The unique identifier of the payment product',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:payment-product:...',
      },
      {
        name: 'payment_account_id',
        description: 'The unique identifier of the payment account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:payment-account:...',
      },
    ],
  },
  {
    id: 'get-payment-program-enablement',
    name: 'Read Payment Program Enablement',
    description: 'Get a specific payment program enablement',
    method: 'GET',
    endpoint: '/v2/accounts/{account_id}/payment-products/{payment_product_id}/payment-accounts/{payment_account_id}/payment-program-enablements/{payment_program_enablement_id}',
    category: 'payments',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
      {
        name: 'payment_product_id',
        description: 'The unique identifier of the payment product',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:payment-product:...',
      },
      {
        name: 'payment_account_id',
        description: 'The unique identifier of the payment account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:payment-account:...',
      },
      {
        name: 'payment_program_enablement_id',
        description: 'The unique identifier of the payment program enablement',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:payment-program-enablement:...',
      },
    ],
  },
  {
    id: 'create-payment-program-enablement',
    name: 'Create Payment Program Enablement',
    description: 'Create a new payment program enablement',
    method: 'POST',
    endpoint: '/v2/accounts/{account_id}/payment-products/{payment_product_id}/payment-accounts/{payment_account_id}/payment-program-enablements',
    category: 'payments',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
      {
        name: 'payment_product_id',
        description: 'The unique identifier of the payment product',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:payment-product:...',
      },
      {
        name: 'payment_account_id',
        description: 'The unique identifier of the payment account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:payment-account:...',
      },
    ],
    bodyTemplate: {
      payment_program_id: '{payment_program_id}',
    },
  },
  {
    id: 'delete-payment-program-enablement',
    name: 'Delete Payment Program Enablement',
    description: 'Delete a payment program enablement',
    method: 'DELETE',
    endpoint: '/v2/accounts/{account_id}/payment-products/{payment_product_id}/payment-accounts/{payment_account_id}/payment-program-enablements/{payment_program_enablement_id}',
    category: 'payments',
    pathParams: [
      {
        name: 'account_id',
        description: 'The unique identifier of the partner account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:...',
      },
      {
        name: 'payment_product_id',
        description: 'The unique identifier of the payment product',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:payment-product:...',
      },
      {
        name: 'payment_account_id',
        description: 'The unique identifier of the payment account',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:payment-account:...',
      },
      {
        name: 'payment_program_enablement_id',
        description: 'The unique identifier of the payment program enablement',
        required: true,
        type: 'string',
        example: 'krn:partner:global:account:payment-program-enablement:...',
      },
    ],
  },

  // ========== Price Plans ==========
  {
    id: 'list-price-plans',
    name: 'List Price Plans',
    description: 'Get all price plans',
    method: 'GET',
    endpoint: '/v2/distribution/price-plans',
    category: 'onboarding',
  },
  {
    id: 'get-price-plan',
    name: 'Read Price Plan',
    description: 'Get a specific price plan',
    method: 'GET',
    endpoint: '/v2/distribution/price-plans/{price_plan_id}',
    category: 'onboarding',
    pathParams: [
      {
        name: 'price_plan_id',
        description: 'The unique identifier of the price plan',
        required: true,
        type: 'string',
        example: 'krn:partner:global:price-plan:...',
      },
    ],
  },

  // ========== Payment Programs ==========
  {
    id: 'list-payment-programs',
    name: 'List Payment Programs',
    description: 'Get all payment programs for a payment program plan',
    method: 'GET',
    endpoint: '/v2/distribution/payment-program-plans/{payment_program_plan_id}/payment-programs',
    category: 'onboarding',
    pathParams: [
      {
        name: 'payment_program_plan_id',
        description: 'The unique identifier of the payment program plan',
        required: true,
        type: 'string',
        example: 'krn:partner:global:payment-program-plan:...',
      },
    ],
  },

];

// For client-side use - only contains static presets
export const endpointPresets: EndpointPreset[] = staticEndpointPresets;

// Note: For server-side endpoint loading (including Bruno files),
// use the functions from './klarna-endpoints-server' instead
