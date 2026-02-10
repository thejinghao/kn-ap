import { EndpointPreset } from '../types';

export const paymentsPresets: EndpointPreset[] = [
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
];
