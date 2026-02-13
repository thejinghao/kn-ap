import type { Party, StepTemplate, FlowEventName } from '@/lib/types/payment-flow';

// ============================================================================
// AP HOSTED FLOW
// ============================================================================

export const AP_HOSTED_PARTIES: Party[] = [
  { id: 'customer', label: 'Customer', color: 'green' },
  { id: 'ap-frontend', label: 'AP Frontend', color: 'blue' },
  { id: 'klarna-sdk', label: 'Klarna SDK', color: 'pink' },
  { id: 'klarna-api', label: 'Klarna API', color: 'pink' },
];

export const AP_HOSTED_STEPS: StepTemplate[] = [
  { id: 'aph-1', from: 'ap-frontend', to: 'klarna-sdk', label: 'Initialize SDK', sublabel: 'clientId + partnerAccountId', type: 'call' },
  { id: 'aph-2', from: 'klarna-sdk', to: 'ap-frontend', label: 'Presentation received', sublabel: 'Payment option + button component', type: 'response' },
  { id: 'aph-3', from: 'ap-frontend', to: 'klarna-sdk', label: 'Mount payment button', type: 'call' },
  { id: 'aph-4', from: 'customer', to: 'klarna-sdk', label: 'Customer clicks button', type: 'event' },
  { id: 'aph-5', from: 'klarna-sdk', to: 'ap-frontend', label: 'SDK calls initiate()', type: 'call' },
  { id: 'aph-6', from: 'ap-frontend', to: 'klarna-api', label: 'Authorize payment', sublabel: 'POST /payment/authorize', type: 'call' },
  { id: 'aph-7', from: 'klarna-api', to: 'ap-frontend', label: 'STEP_UP_REQUIRED', sublabel: '+ paymentRequestId', type: 'response' },
  { id: 'aph-8', from: 'ap-frontend', to: 'klarna-sdk', label: 'Return { paymentRequestId }', type: 'response' },
  { id: 'aph-9', from: 'klarna-sdk', to: 'customer', label: 'Customer Klarna journey', sublabel: 'Step-up / redirect', type: 'redirect' },
  { id: 'aph-10', from: 'customer', to: 'klarna-sdk', label: 'Journey complete', sublabel: 'Session token received', type: 'event' },
  { id: 'aph-11', from: 'ap-frontend', to: 'klarna-api', label: 'Final authorize', sublabel: '+ Klarna-Network-Session-Token', type: 'call' },
  { id: 'aph-12', from: 'klarna-api', to: 'ap-frontend', label: 'APPROVED', type: 'response' },
];

// ============================================================================
// SERVER-SIDE FLOW
// ============================================================================

export const SERVER_SIDE_PARTIES: Party[] = [
  { id: 'customer', label: 'Customer', color: 'green' },
  { id: 'sub-partner', label: 'Sub-partner', color: 'amber' },
  { id: 'klarna-sdk', label: 'Klarna SDK', color: 'pink' },
  { id: 'ap-backend', label: 'AP Backend', color: 'blue' },
  { id: 'klarna-api', label: 'Klarna API', color: 'pink' },
];

export const SERVER_SIDE_STEPS: StepTemplate[] = [
  { id: 'ss-1', from: 'sub-partner', to: 'klarna-sdk', label: 'Initialize SDK', sublabel: 'clientId only (no partnerAccountId)', type: 'call' },
  { id: 'ss-2', from: 'klarna-sdk', to: 'sub-partner', label: 'Presentation received', sublabel: 'Payment option + button component', type: 'response' },
  { id: 'ss-3', from: 'sub-partner', to: 'klarna-sdk', label: 'Mount payment button', type: 'call' },
  { id: 'ss-4', from: 'customer', to: 'klarna-sdk', label: 'Customer clicks button', type: 'event' },
  { id: 'ss-5', from: 'klarna-sdk', to: 'sub-partner', label: 'SDK calls initiate()', type: 'call' },
  { id: 'ss-6', from: 'sub-partner', to: 'klarna-api', label: 'Authorize payment (via AP)', sublabel: 'POST /payment/authorize', type: 'call' },
  { id: 'ss-7', from: 'klarna-api', to: 'sub-partner', label: 'STEP_UP_REQUIRED', sublabel: '+ paymentRequestId', type: 'response' },
  { id: 'ss-8', from: 'sub-partner', to: 'klarna-sdk', label: 'Return { paymentRequestId }', type: 'response' },
  { id: 'ss-9', from: 'klarna-sdk', to: 'customer', label: 'Customer Klarna journey', sublabel: 'Step-up / redirect', type: 'redirect' },
  { id: 'ss-10', from: 'customer', to: 'klarna-sdk', label: 'Journey complete', sublabel: 'Session token received', type: 'event' },
  { id: 'ss-11', from: 'sub-partner', to: 'ap-backend', label: 'Forward session token to AP', type: 'call' },
  { id: 'ss-12', from: 'ap-backend', to: 'klarna-api', label: 'Final authorize', sublabel: '+ Klarna-Network-Session-Token', type: 'call' },
  { id: 'ss-13', from: 'klarna-api', to: 'ap-backend', label: 'APPROVED', type: 'response' },
  { id: 'ss-14', from: 'ap-backend', to: 'sub-partner', label: 'Payment success', type: 'response' },
];

// ============================================================================
// STEP ID MAPPINGS — maps flow event names to step IDs per mode
// ============================================================================

export const STEP_ID_MAP: Record<'ap-hosted' | 'server-side', Partial<Record<FlowEventName, string>>> = {
  'ap-hosted': {
    'sdk-init': 'aph-1',
    'presentation-received': 'aph-2',
    'button-mounted': 'aph-3',
    'button-clicked': 'aph-4',
    'initiate-called': 'aph-5',
    'authorize-request': 'aph-6',
    'authorize-response': 'aph-7',
    'return-to-sdk': 'aph-8',
    'klarna-journey': 'aph-9',
    'journey-complete': 'aph-10',
    'final-authorize-request': 'aph-11',
    'final-authorize-response': 'aph-12',
  },
  'server-side': {
    'sdk-init': 'ss-1',
    'presentation-received': 'ss-2',
    'button-mounted': 'ss-3',
    'button-clicked': 'ss-4',
    'initiate-called': 'ss-5',
    'authorize-request': 'ss-6',
    'authorize-response': 'ss-7',
    'return-to-sdk': 'ss-8',
    'klarna-journey': 'ss-9',
    'journey-complete': 'ss-10',
    'forward-token': 'ss-11',
    'final-authorize-request': 'ss-12',
    'final-authorize-response': 'ss-13',
    'payment-success': 'ss-14',
  },
};
