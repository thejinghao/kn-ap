import { EndpointPreset } from '../types';

export const onboardingPresets: EndpointPreset[] = [
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
