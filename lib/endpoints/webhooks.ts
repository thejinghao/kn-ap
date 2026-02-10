import { EndpointPreset } from '../types';

export const webhooksPresets: EndpointPreset[] = [
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
      id: 'get-webhook',
      name: 'Get Webhook',
      description: 'Get a specific webhook',
      method: 'GET',
      endpoint: '/v2/notification/webhooks/:webhook_id',
      category: 'webhooks',
      pathParams: [
        {
          name: 'webhook_id',
          description: 'The webhook ID',
          required: true,
        },
      ],
    },

  {
      id: 'update-webhook',
      name: 'Update Webhook',
      description: 'Update a webhook subscription',
      method: 'PATCH',
      endpoint: '/v2/notification/webhooks/:webhook_id',
      category: 'webhooks',
      pathParams: [
        {
          name: 'webhook_id',
          description: 'The webhook ID',
          required: true,
        },
      ],
      bodyTemplate: {
        url: 'https://your-webhook-endpoint.com/klarna',
        event_types: ['payment.request.*', 'payment.dispute.*'],
        status: 'ENABLED',
      },
    },

  {
      id: 'delete-webhook',
      name: 'Delete Webhook',
      description: 'Delete a webhook subscription',
      method: 'DELETE',
      endpoint: '/v2/notification/webhooks/:webhook_id',
      category: 'webhooks',
      pathParams: [
        {
          name: 'webhook_id',
          description: 'The webhook ID',
          required: true,
        },
      ],
    },

  {
      id: 'simulate-webhook',
      name: 'Simulate Webhook',
      description: 'Simulate a webhook event for testing',
      method: 'POST',
      endpoint: '/v2/notification/webhooks/:webhook_id/simulate',
      category: 'webhooks',
      pathParams: [
        {
          name: 'webhook_id',
          description: 'The webhook ID',
          required: true,
        },
      ],
      bodyTemplate: {
        event_type: 'payment.request.state-change.completed',
        event_version: 'v2',
      },
    },

  {
      id: 'list-signing-keys',
      name: 'List Signing Keys',
      description: 'Get webhook signing keys',
      method: 'GET',
      endpoint: '/v2/notification/signing-keys',
      category: 'webhooks',
    },

  {
      id: 'create-signing-key',
      name: 'Create Signing Key',
      description: 'Create a new signing key for webhooks',
      method: 'POST',
      endpoint: '/v2/notification/signing-keys',
      category: 'webhooks',
    },

  {
      id: 'get-signing-key',
      name: 'Get Signing Key',
      description: 'Get a specific signing key',
      method: 'GET',
      endpoint: '/v2/notification/signing-keys/:signing_key_id',
      category: 'webhooks',
      pathParams: [
        {
          name: 'signing_key_id',
          description: 'The signing key ID',
          required: true,
        },
      ],
    },

  {
      id: 'delete-signing-key',
      name: 'Delete Signing Key',
      description: 'Delete a signing key',
      method: 'DELETE',
      endpoint: '/v2/notification/signing-keys/:signing_key_id',
      category: 'webhooks',
      pathParams: [
        {
          name: 'signing_key_id',
          description: 'The signing key ID',
          required: true,
        },
      ],
    },
];
