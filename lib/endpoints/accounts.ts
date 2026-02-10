import { EndpointPreset } from '../types';

export const accountsPresets: EndpointPreset[] = [
  // ========== Partner Accounts ==========
    {
      id: 'read-partner-account',
      name: 'Read Partner Account',
      description: 'Get details of a partner account',
      method: 'GET',
      endpoint: '/v2/accounts/{partner_account_id}',
      category: 'accounts',
      pathParams: [
        {
          name: 'partner_account_id',
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
      endpoint: '/v2/accounts/{partner_account_id}',
      category: 'accounts',
      pathParams: [
        {
          name: 'partner_account_id',
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
      endpoint: '/v2/accounts/{partner_account_id}/partner-business-entities',
      category: 'accounts',
      pathParams: [
        {
          name: 'partner_account_id',
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
      endpoint: '/v2/accounts/{partner_account_id}/partner-business-entities/{partner_business_entity_id}',
      category: 'accounts',
      pathParams: [
        {
          name: 'partner_account_id',
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

  // ========== Brands ==========
    {
      id: 'list-brands',
      name: 'List Brands',
      description: 'Get all brands for a partner account',
      method: 'GET',
      endpoint: '/v2/accounts/{partner_account_id}/brands',
      category: 'accounts',
      pathParams: [
        {
          name: 'partner_account_id',
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
      endpoint: '/v2/accounts/{partner_account_id}/brands/{brand_id}',
      category: 'accounts',
      pathParams: [
        {
          name: 'partner_account_id',
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
      endpoint: '/v2/accounts/{partner_account_id}/brands',
      category: 'accounts',
      pathParams: [
        {
          name: 'partner_account_id',
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
      endpoint: '/v2/accounts/{partner_account_id}/brands/{brand_id}',
      category: 'accounts',
      pathParams: [
        {
          name: 'partner_account_id',
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
      endpoint: '/v2/accounts/{partner_account_id}/store-groups',
      category: 'accounts',
      pathParams: [
        {
          name: 'partner_account_id',
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
      endpoint: '/v2/accounts/{partner_account_id}/store-groups/{store_group_id}',
      category: 'accounts',
      pathParams: [
        {
          name: 'partner_account_id',
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
      endpoint: '/v2/accounts/{partner_account_id}/store-groups',
      category: 'accounts',
      pathParams: [
        {
          name: 'partner_account_id',
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
      endpoint: '/v2/accounts/{partner_account_id}/store-groups/{store_group_id}',
      category: 'accounts',
      pathParams: [
        {
          name: 'partner_account_id',
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
      endpoint: '/v2/accounts/{partner_account_id}/stores',
      category: 'accounts',
      pathParams: [
        {
          name: 'partner_account_id',
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
      endpoint: '/v2/accounts/{partner_account_id}/stores/{store_id}',
      category: 'accounts',
      pathParams: [
        {
          name: 'partner_account_id',
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
      endpoint: '/v2/accounts/{partner_account_id}/stores',
      category: 'accounts',
      pathParams: [
        {
          name: 'partner_account_id',
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
      endpoint: '/v2/accounts/{partner_account_id}/stores/{store_id}',
      category: 'accounts',
      pathParams: [
        {
          name: 'partner_account_id',
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
      endpoint: '/v2/accounts/{partner_account_id}/partner-business-entities',
      category: 'accounts',
      pathParams: [
        {
          name: 'partner_account_id',
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
      endpoint: '/v2/accounts/{partner_account_id}/partner-business-entities/{partner_business_entity_id}',
      category: 'accounts',
      pathParams: [
        {
          name: 'partner_account_id',
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
];
