import { RefObject } from 'react';

// ============================================================================
// STEP DETAIL — discriminated union for inspector panel content
// ============================================================================

export type StepDetail =
  | { type: 'code'; language: string; code: string }
  | { type: 'api-request'; method: string; path: string; body?: unknown }
  | { type: 'api-response'; status: number; body: unknown }
  | { type: 'event'; name: string; data?: unknown }
  | { type: 'info'; message: string };

// ============================================================================
// SEQUENCE DIAGRAM TYPES
// ============================================================================

export interface Party {
  id: string;
  label: string;
  color: 'blue' | 'pink' | 'amber' | 'green';
}

export interface StepTemplate {
  id: string;
  from: string;
  to: string;
  label: string;
  sublabel?: string;
  type: 'call' | 'response' | 'event' | 'redirect';
}

export interface SequenceDiagramState {
  activatedSteps: Record<string, StepDetail | null>;
  activeStepId: string | null;
  selectedStepId: string | null;
}

export interface SequenceDiagramRef {
  activateStep: (stepId: string, detail?: StepDetail) => void;
  reset: () => void;
  getState: () => SequenceDiagramState;
  restoreState: (state: SequenceDiagramState) => void;
}

// ============================================================================
// FLOW EVENT TYPES
// ============================================================================

export type FlowEventName =
  | 'sdk-init'
  | 'presentation-received'
  | 'button-mounted'
  | 'button-clicked'
  | 'initiate-called'
  | 'authorize-request'
  | 'authorize-response'
  | 'return-to-sdk'
  | 'klarna-journey'
  | 'journey-complete'
  | 'forward-token'
  | 'final-authorize-request'
  | 'final-authorize-response'
  | 'payment-success';

export interface FlowEvent {
  name: FlowEventName;
  stepId: string;
  detail: StepDetail;
}

// ============================================================================
// HOOK TYPES
// ============================================================================

export type FlowState =
  | 'IDLE'
  | 'INITIALIZING'
  | 'READY'
  | 'AUTHORIZING'
  | 'STEP_UP'
  | 'COMPLETING'
  | 'SUCCESS'
  | 'ERROR';

export interface UsePaymentFlowOptions {
  mode: 'ap-hosted' | 'server-side';
  clientId: string;
  partnerAccountId?: string;
  amount?: number;
  returnUrl?: string;
  onFlowEvent: (event: FlowEvent) => void;
}

export interface UsePaymentFlowReturn {
  flowState: FlowState;
  errorMessage: string | null;
  buttonContainerRef: RefObject<HTMLDivElement>;
  presentationRef: RefObject<any>;
  start: () => Promise<void>;
  reset: () => void;
  resumeAfterRedirect: (sessionToken: string) => Promise<void>;
}

// ============================================================================
// API TYPES
// ============================================================================

export interface AuthorizeResponse {
  success: boolean;
  data: {
    result: 'APPROVED' | 'DECLINED' | 'STEP_UP_REQUIRED';
    resultReason?: string;
    paymentTransaction?: {
      paymentTransactionId: string;
      paymentTransactionReference: string;
      amount: number;
      currency: string;
      expiresAt?: string;
    };
    paymentRequest?: {
      paymentRequestId: string;
      paymentRequestReference: string;
      amount: number;
      currency: string;
      state: string;
      expiresAt: string;
      stateContext?: {
        customerInteraction?: {
          method: string;
          paymentRequestUrl?: string;
        };
      };
    };
  } | null;
  error?: string;
  rawKlarnaRequest?: unknown;
  rawKlarnaResponse?: unknown;
  requestMetadata: {
    correlationId: string;
    idempotencyKey?: string;
    timestamp?: string;
  };
}
