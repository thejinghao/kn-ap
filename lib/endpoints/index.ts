import { EndpointPreset } from '../types';
import { categories } from './categories';
import { credentialsPresets } from './credentials';
import { accountsPresets } from './accounts';
import { onboardingPresets } from './onboarding';
import { paymentsPresets } from './payments';
import { webhooksPresets } from './webhooks';
import { settlementsPresets } from './settlements';

export { categories } from './categories';

export const staticEndpointPresets: EndpointPreset[] = [
  ...credentialsPresets,
  ...accountsPresets,
  ...onboardingPresets,
  ...paymentsPresets,
  ...webhooksPresets,
  ...settlementsPresets,
];

// Alias for backwards compatibility
export const endpointPresets: EndpointPreset[] = staticEndpointPresets;

export { categories as endpointCategories };
