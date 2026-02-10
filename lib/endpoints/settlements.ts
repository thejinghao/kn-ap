import { EndpointPreset } from '../types';

export const settlementsPresets: EndpointPreset[] = [
  // ========== Settlements ==========
    {
      id: 'list-settlements',
      name: 'List Settlements',
      description: 'Get settlement reports',
      method: 'GET',
      endpoint: '/v2/settlements',
      category: 'settlements',
    },

  {
      id: 'get-settlement-details',
      name: 'Get Settlement Details',
      description: 'Get details of a specific settlement',
      method: 'GET',
      endpoint: '/v2/settlements/{settlement_id}',
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
];
