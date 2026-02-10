import { CategoryInfo } from '../types';

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
