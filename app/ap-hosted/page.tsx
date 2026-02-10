'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import styles from './page.module.css';

// ============================================================================
// TYPES
// ============================================================================

type FlowState = 
  | 'IDLE' 
  | 'INITIALIZING' 
  | 'READY' 
  | 'AUTHORIZING' 
  | 'STEP_UP' 
  | 'COMPLETING' 
  | 'SUCCESS' 
  | 'ERROR';

interface EventLogItem {
  id: string;
  title: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
  data?: unknown;
  source?: 'sdk' | 'api' | 'flow';
  direction?: 'request' | 'response';
  path?: string;
}

interface AuthorizeResponse {
  success: boolean;
  data: {
    result: 'APPROVED' | 'DECLINED' | 'STEP_UP_REQUIRED';
    resultReason?: string;
    paymentTransaction?: {
      paymentTransactionId: string;
      paymentTransactionReference: string;
      amount: number;
      currency: string;
    };
    paymentRequest?: {
      paymentRequestId: string;
      paymentRequestReference: string;
      state: string;
    };
  } | null;
  error?: string;
  rawKlarnaRequest?: unknown;
  rawKlarnaResponse?: unknown;
  requestMetadata: {
    correlationId: string;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KlarnaSDK = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PaymentPresentation = any;

// Serializable presentation info for display
interface PresentationInfo {
  instruction: string;
  paymentOptionId: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Default configuration - US market
const DEFAULT_CONFIG = {
  locale: 'en-US',
  currency: 'USD',
  country: 'US',
  amount: 11836, // $118.36 in cents
};

// Default Client ID for testing (replace with your own)
const DEFAULT_CLIENT_ID = 'klarna_test_client_SyVDdUcvcTQhQjUkVEhyRFgzWFhxRU4xRHdjZVE4UTUsMmVkZGVlNzMtNGIyMy00MzQyLTgxZmItYWEzMzFkYWM1OTU2LDEsVXhrQ3N5UzNQbVJ5UkdJS1VKeHV0MDg5RDUyOUVCTE94ck8yaVpjVXRPWT0';

// Default Partner Account ID for testing
const DEFAULT_PARTNER_ACCOUNT_ID = 'krn:partner:global:account:test:MKPMV6MS';

// localStorage key for event log persistence
const EVENT_LOG_STORAGE_KEY = 'klarna-payment-button-event-log';

const inputClasses = 'w-full border border-gray-300 rounded px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-400';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Load event log from localStorage
function loadEventLogFromStorage(): EventLogItem[] {
  if (typeof window === 'undefined') {
    return [];
  }
  
  try {
    const stored = localStorage.getItem(EVENT_LOG_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    
    const parsed = JSON.parse(stored);
    // Reconstruct Date objects from ISO strings
    return parsed.map((item: EventLogItem & { timestamp: string }) => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }));
  } catch (error) {
    console.error('Failed to load event log from localStorage:', error);
    return [];
  }
}

// Save event log to localStorage
function saveEventLogToStorage(eventLog: EventLogItem[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    // Serialize Date objects to ISO strings
    const serialized = eventLog.map(item => ({
      ...item,
      timestamp: item.timestamp.toISOString(),
    }));
    localStorage.setItem(EVENT_LOG_STORAGE_KEY, JSON.stringify(serialized));
  } catch (error) {
    console.error('Failed to save event log to localStorage:', error);
  }
}

// ============================================================================
// UTILITY: Build default payment request data JSON
// ============================================================================

function buildDefaultPaymentRequestData(origin: string): string {
  return JSON.stringify({
    currency: DEFAULT_CONFIG.currency,
    amount: DEFAULT_CONFIG.amount,
    paymentRequestReference: 'Auto-generated on button click',
    supplementaryPurchaseData: {
      purchaseReference: 'Auto-generated on button click',
      lineItems: [{
        name: 'Test Product',
        quantity: 1,
        totalAmount: DEFAULT_CONFIG.amount,
        unitPrice: DEFAULT_CONFIG.amount,
      }],
    },
    customerInteractionConfig: {
      returnUrl: `${origin}/ap-hosted?status=complete`,
    },
  }, null, 2);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PaymentButtonPage() {
  // Client-side mount tracking (for hydration safety)
  const [isMounted, setIsMounted] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState('');
  
  // Configuration State
  const [clientId, setClientId] = useState(DEFAULT_CLIENT_ID);
  const [partnerAccountId, setPartnerAccountId] = useState(DEFAULT_PARTNER_ACCOUNT_ID);
  
  // Flow State
  const [flowState, setFlowState] = useState<FlowState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // SDK State
  const [klarna, setKlarna] = useState<KlarnaSDK | null>(null);
  const [presentationInfo, setPresentationInfo] = useState<PresentationInfo | null>(null);
  const [paymentTransaction, setPaymentTransaction] = useState<AuthorizeResponse['data'] | null>(null);
  
  // Event Log
  const [eventLog, setEventLog] = useState<EventLogItem[]>([]);
  
  // Initiation mode toggle
  const [usePaymentRequestData, setUsePaymentRequestData] = useState(true);
  const usePaymentRequestDataRef = useRef(true);
  const [paymentRequestDataJson, setPaymentRequestDataJson] = useState('');
  const paymentRequestDataJsonRef = useRef('');

  // Refs
  const buttonWrapperRef = useRef<HTMLDivElement>(null);
  const sdkInitializedRef = useRef(false);
  const presentationRef = useRef<PaymentPresentation | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mountedButtonRef = useRef<any>(null);
  const sdkMountIdRef = useRef<string>('klarna-sdk-mount');
  const finalAuthInProgressRef = useRef(false);

  // ============================================================================
  // EVENT LOGGING
  // ============================================================================

  const logEvent = useCallback((
    title: string,
    type: EventLogItem['type'],
    data?: unknown,
    source?: EventLogItem['source'],
    direction?: EventLogItem['direction'],
    path?: string,
  ) => {
    setEventLog(prev => [{
      id: generateId(),
      title,
      timestamp: new Date(),
      type,
      data,
      source,
      direction,
      path,
    }, ...prev]);
  }, []);

  const clearLog = useCallback(() => {
    setEventLog([]);
    // Also clear from localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(EVENT_LOG_STORAGE_KEY);
      } catch (error) {
        console.error('Failed to clear event log from localStorage:', error);
      }
    }
  }, []);

  // ============================================================================
  // AUTHORIZE PAYMENT API CALL
  // ============================================================================

  const authorizePayment = useCallback(async (
    paymentOptionId?: string,
    klarnaNetworkSessionToken?: string
  ): Promise<AuthorizeResponse> => {
    const response = await fetch('/api/payment/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerAccountId,
        currency: DEFAULT_CONFIG.currency,
        amount: DEFAULT_CONFIG.amount,
        paymentOptionId,
        paymentTransactionReference: `tx_${Date.now()}_${generateId()}`,
        paymentRequestReference: `pr_${Date.now()}_${generateId()}`,
        returnUrl: `${currentOrigin}/ap-hosted?status=complete`,
        klarnaNetworkSessionToken,
        supplementaryPurchaseData: {
          purchaseReference: `purchase_${Date.now()}`,
          lineItems: [{
            name: 'Test Product',
            quantity: 1,
            totalAmount: DEFAULT_CONFIG.amount,
            unitPrice: DEFAULT_CONFIG.amount,
          }],
        },
      }),
    });

    return response.json();
  }, [partnerAccountId, currentOrigin]);

  // ============================================================================
  // INITIATE CALLBACK (called when button is clicked)
  // ============================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInitiate = useCallback(async (): Promise<any> => {
    // Get paymentOptionId from the stored presentation
    const paymentOptionId = presentationRef.current?.paymentOption?.paymentOptionId;

    logEvent('Button Clicked - Initiating Payment', 'info', {
      paymentOptionId,
      mode: usePaymentRequestDataRef.current ? 'paymentRequestData' : 'paymentRequestId',
    }, 'flow');
    setFlowState('AUTHORIZING');
    setErrorMessage(null);

    if (usePaymentRequestDataRef.current) {
      // === Payment Request Data mode (client-side) ===
      try {
        const data = JSON.parse(paymentRequestDataJsonRef.current);
        // Auto-generate references
        if (!data.paymentRequestReference || data.paymentRequestReference.includes('Auto-generated')) {
          data.paymentRequestReference = `pr_${Date.now()}_${generateId()}`;
        }
        if (data.supplementaryPurchaseData?.purchaseReference?.includes('Auto-generated')) {
          data.supplementaryPurchaseData.purchaseReference = `purchase_${Date.now()}`;
        }
        // Add paymentOptionId from current presentation
        if (paymentOptionId) {
          data.paymentOptionId = paymentOptionId;
        }
        logEvent('Payment Request Data', 'info', data, 'flow');
        return data; // SDK will create the payment request
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Invalid JSON';
        setFlowState('ERROR');
        setErrorMessage(msg);
        logEvent('Invalid Payment Request Data', 'error', { error: msg }, 'flow');
        throw new Error(msg);
      }
    } else {
      // === Payment Request ID mode (server-side) ===
      const result = await authorizePayment(paymentOptionId);
      const apiPath = `POST /v2/accounts/${partnerAccountId}/payment/authorize`;

      logEvent('Authorization Request', 'info', result.rawKlarnaRequest, 'api', 'request', apiPath);
      logEvent('Authorization Response', result.success ? 'success' : 'error', result.rawKlarnaResponse, 'api', 'response', apiPath);

      if (!result.success || !result.data) {
        const errorMsg = result.error || 'Authorization failed';
        setFlowState('ERROR');
        setErrorMessage(errorMsg);
        logEvent('Authorization Error', 'error', { error: errorMsg }, 'api', 'response', apiPath);
        throw new Error(errorMsg);
      }

      const { result: authResult, paymentRequest, paymentTransaction: tx } = result.data;

      switch (authResult) {
        case 'APPROVED':
          setFlowState('SUCCESS');
          setPaymentTransaction(result.data);
          logEvent('Payment Approved', 'success', tx, 'flow');
          return { returnUrl: `${currentOrigin}/ap-hosted?status=approved` };

        case 'STEP_UP_REQUIRED':
          if (!paymentRequest?.paymentRequestId) {
            const errorMsg = 'No payment request ID returned';
            setFlowState('ERROR');
            setErrorMessage(errorMsg);
            throw new Error(errorMsg);
          }
          setFlowState('STEP_UP');
          logEvent('Step-up Required - Launching Klarna Journey', 'info', paymentRequest, 'flow');
          return { paymentRequestId: paymentRequest.paymentRequestId };

        case 'DECLINED':
          const declineMsg = result.data.resultReason || 'Payment declined';
          setFlowState('ERROR');
          setErrorMessage(declineMsg);
          throw new Error(declineMsg);

        default:
          const unknownMsg = `Unknown result: ${authResult}`;
          setFlowState('ERROR');
          setErrorMessage(unknownMsg);
          throw new Error(unknownMsg);
      }
    }
  }, [authorizePayment, logEvent, currentOrigin]);

  // ============================================================================
  // SDK EVENT HANDLERS
  // ============================================================================

  const attachSDKEventHandlers = useCallback((klarnaInstance: KlarnaSDK) => {
    // Handle payment completion
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    klarnaInstance.Payment.on('complete', async (paymentRequest: any) => {
      // Deduplicate: SDK may fire 'complete' twice
      if (finalAuthInProgressRef.current) {
        logEvent('Duplicate Complete Event (ignored)', 'warning', undefined, 'sdk');
        return true;
      }
      finalAuthInProgressRef.current = true;

      logEvent('Payment Complete Event', 'success', {
        paymentRequestId: paymentRequest.paymentRequestId,
        state: paymentRequest.state,
        stateContext: paymentRequest.stateContext,
      }, 'sdk');

      // Both modes: final authorization with session token
      const sessionToken = paymentRequest.stateContext?.klarna_network_session_token ||
                          paymentRequest.stateContext?.klarnaNetworkSessionToken;

      if (sessionToken) {
        // Save token to sessionStorage — final auth will happen after redirect
        // (Don't call authorize here: the page will redirect to returnUrl and the
        //  redirect-based useEffect will pick up the token and do final auth.
        //  Calling authorize in BOTH places caused a 409 RESOURCE_CONFLICT.)
        try { sessionStorage.setItem('pendingSessionToken', sessionToken); } catch {}
        setFlowState('COMPLETING');
        logEvent('Session Token Saved — Awaiting Redirect', 'info', undefined, 'flow');

        // Fallback: if no redirect occurs within 3s (e.g. popup mode), do final auth here
        setTimeout(async () => {
          const pending = sessionStorage.getItem('pendingSessionToken');
          if (!pending) return; // redirect handler already consumed it
          sessionStorage.removeItem('pendingSessionToken');

          const authPath = `POST /v2/accounts/${partnerAccountId}/payment/authorize`;
          try {
            const finalResult = await authorizePayment(undefined, pending);

            logEvent('Final Authorization Request', 'info', finalResult.rawKlarnaRequest, 'api', 'request', authPath);
            logEvent('Final Authorization Response', finalResult.success ? 'success' : 'error', finalResult.rawKlarnaResponse, 'api', 'response', authPath);

            if (finalResult.success && finalResult.data?.result === 'APPROVED') {
              setFlowState('SUCCESS');
              setPaymentTransaction(finalResult.data);
              logEvent('Payment Successfully Completed', 'success', finalResult.data.paymentTransaction, 'flow');
            } else {
              throw new Error(finalResult.error || 'Final authorization failed');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setFlowState('ERROR');
            setErrorMessage(message);
            logEvent('Final Authorization Error', 'error', { error: message }, 'api', 'response', authPath);
          }
        }, 3000);
      } else {
        setFlowState('SUCCESS');
        logEvent('Payment Completed (No Final Auth Needed)', 'success', undefined, 'flow');
      }

      // Return true to allow default redirect behavior
      return true;
    });

    // Handle abort
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    klarnaInstance.Payment.on('abort', (paymentRequest: any) => {
      logEvent('Payment Aborted', 'warning', {
        state: paymentRequest.state,
        stateReason: paymentRequest.stateReason,
      }, 'sdk');
      
      setFlowState('READY');
      setErrorMessage('Payment was cancelled');
      
      // Cancel the payment request if it's in SUBMITTED state
      if (paymentRequest.state === 'SUBMITTED' && paymentRequest.paymentRequestId) {
        klarnaInstance.Payment.cancel(paymentRequest.paymentRequestId);
      }
    });

    // Handle errors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    klarnaInstance.Payment.on('error', (error: any, paymentRequest: any) => {
      logEvent('Payment Error', 'error', { error, paymentRequest }, 'sdk');
      setFlowState('ERROR');
      setErrorMessage(error?.message || 'An error occurred');
    });
  }, [authorizePayment, logEvent]);

  // ============================================================================
  // GET PAYMENT PRESENTATION & MOUNT BUTTON
  // ============================================================================

  const getPresentation = useCallback(async (klarnaInstance: KlarnaSDK) => {
    try {
      logEvent('Getting Payment Presentation', 'info', {
        amount: DEFAULT_CONFIG.amount,
        currency: DEFAULT_CONFIG.currency,
        locale: DEFAULT_CONFIG.locale,
      }, 'sdk');

      const presentationResult = await klarnaInstance.Payment.presentation({
        amount: DEFAULT_CONFIG.amount,
        currency: DEFAULT_CONFIG.currency,
        locale: DEFAULT_CONFIG.locale,
        intents: ['PAY'],
      });

      logEvent('Payment Presentation Received', 'success', {
        instruction: String(presentationResult.instruction || 'N/A'),
        hasPaymentOption: !!presentationResult.paymentOption,
      }, 'sdk');

      // Store full presentation in ref (for button mounting)
      presentationRef.current = presentationResult;
      
      // Store only serializable data in state (for display)
      setPresentationInfo({
        instruction: String(presentationResult.instruction || 'N/A'),
        paymentOptionId: presentationResult.paymentOption?.paymentOptionId 
          ? String(presentationResult.paymentOption.paymentOptionId) 
          : null,
      });
      
      return presentationResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logEvent('Presentation Error', 'error', { error: message }, 'sdk');
      throw error;
    }
  }, [logEvent]);

  // Helper to safely clear the SDK mount point (outside React's control)
  const clearSdkMount = useCallback(() => {
    // Try to unmount the existing button if it has an unmount method
    if (mountedButtonRef.current) {
      try {
        if (typeof mountedButtonRef.current.unmount === 'function') {
          mountedButtonRef.current.unmount();
        }
      } catch (e) {
        // Ignore unmount errors
      }
      mountedButtonRef.current = null;
    }
    
    // Remove the SDK mount container from the DOM entirely
    const existingMount = document.getElementById(sdkMountIdRef.current);
    if (existingMount && existingMount.parentNode) {
      existingMount.parentNode.removeChild(existingMount);
    }
  }, []);

  const mountPaymentButton = useCallback((presentationResult: PaymentPresentation) => {
    if (!buttonWrapperRef.current || !presentationResult?.paymentOption) {
      return;
    }

    // Clear any existing SDK mount
    clearSdkMount();

    const paymentOption = presentationResult.paymentOption;

    logEvent('Mounting Payment Button', 'info', {
      paymentOptionId: paymentOption.paymentOptionId,
      instruction: String(presentationResult.instruction || 'N/A'),
    }, 'sdk');

    try {
      // Generate a new unique ID for this mount
      sdkMountIdRef.current = `klarna-sdk-mount-${Date.now()}`;
      
      // Create a completely new container element outside React's control
      const mountTarget = document.createElement('div');
      mountTarget.id = sdkMountIdRef.current;
      mountTarget.style.cssText = 'width: 100%;';
      
      // Append to the wrapper (React won't track this child)
      buttonWrapperRef.current.appendChild(mountTarget);

      // Mount the button from the presentation
      const buttonInstance = paymentOption.paymentButton
        .component({
          shape: 'pill',
          theme: 'default',
          locale: DEFAULT_CONFIG.locale,
          intents: ['PAY'],
          initiationMode: 'DEVICE_BEST',
          initiate: handleInitiate,
        })
        .mount(mountTarget);

      // Store reference to the mounted button
      mountedButtonRef.current = buttonInstance;

      logEvent('Payment Button Mounted', 'success', undefined, 'sdk');
      setFlowState('READY');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logEvent('Button Mount Error', 'error', { error: message }, 'sdk');
      setErrorMessage(`Failed to mount button: ${message}`);
      setFlowState('ERROR');
    }
  }, [handleInitiate, logEvent, clearSdkMount]);

  // ============================================================================
  // SDK INITIALIZATION
  // ============================================================================

  const initializeSDK = useCallback(async () => {
    if (!clientId.trim()) {
      setErrorMessage('Client ID is required');
      setFlowState('ERROR');
      return;
    }

    if (!partnerAccountId.trim()) {
      setErrorMessage('Partner Account ID is required');
      setFlowState('ERROR');
      return;
    }

    setFlowState('INITIALIZING');
    setErrorMessage(null);
    logEvent('Initializing Klarna SDK', 'info', { clientId: clientId.substring(0, 30) + '...' }, 'sdk');

    try {
      // Patch customElements.define for React Strict Mode
      if (typeof window !== 'undefined' && window.customElements) {
        const originalDefine = window.customElements.define.bind(window.customElements);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.customElements.define = function(name: string, constructor: any, options?: any) {
          if (!window.customElements.get(name)) {
            originalDefine(name, constructor, options);
          }
        };
      }

      // Import Klarna SDK
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const KlarnaModule = await (Function('return import("https://js.klarna.com/web-sdk/v2/klarna.mjs")')() as Promise<any>);
      const { KlarnaSDK } = KlarnaModule;

      // Initialize SDK
      const klarnaInstance = await KlarnaSDK({
        clientId: clientId.trim(),
        partnerAccountId: partnerAccountId.trim(),
        products: ['PAYMENT'],
      });

      logEvent('SDK Initialized Successfully', 'success', undefined, 'sdk');

      // Attach event handlers
      attachSDKEventHandlers(klarnaInstance);

      // Store SDK instance
      setKlarna(klarnaInstance);

      // Expose to window for debugging
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).klarna = klarnaInstance;
      }

      // Get presentation and mount button
      const presentationResult = await getPresentation(klarnaInstance);
      mountPaymentButton(presentationResult);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setFlowState('ERROR');
      setErrorMessage(`SDK initialization failed: ${message}`);
      logEvent('SDK Initialization Error', 'error', { error: message }, 'sdk');
    }
  }, [clientId, partnerAccountId, attachSDKEventHandlers, getPresentation, mountPaymentButton, logEvent]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Sync refs with state for use inside SDK callbacks
  useEffect(() => {
    usePaymentRequestDataRef.current = usePaymentRequestData;
  }, [usePaymentRequestData]);

  useEffect(() => {
    paymentRequestDataJsonRef.current = paymentRequestDataJson;
  }, [paymentRequestDataJson]);

  // Initialize client-side state after mount (hydration safety)
  useEffect(() => {
    setIsMounted(true);
    setCurrentOrigin(window.location.origin);
    // Generate unique mount ID on client only
    sdkMountIdRef.current = `klarna-sdk-mount-${Date.now()}`;
    // Initialize default payment request data JSON
    setPaymentRequestDataJson(buildDefaultPaymentRequestData(window.location.origin));
    // Load event log from localStorage
    const storedEvents = loadEventLogFromStorage();
    if (storedEvents.length > 0) {
      setEventLog(storedEvents);
    }
  }, []);

  // Handle URL parameters (for return from Klarna journey)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('status');
      
      if (status) {
        logEvent('Returned from Klarna Journey', 'info', { status }, 'flow');
        // Clear URL parameters
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [logEvent]);

  // Resume final authorization after page redirect (session token saved pre-redirect)
  useEffect(() => {
    if (!isMounted || !currentOrigin) return;

    const pendingToken = sessionStorage.getItem('pendingSessionToken');
    if (!pendingToken) return;

    sessionStorage.removeItem('pendingSessionToken');
    logEvent('Resuming Final Authorization After Redirect', 'info', undefined, 'flow');
    setFlowState('COMPLETING');

    const authPath = `POST /v2/accounts/${partnerAccountId}/payment/authorize`;
    authorizePayment(undefined, pendingToken)
      .then(finalResult => {
        logEvent('Final Authorization Request', 'info', finalResult.rawKlarnaRequest, 'api', 'request', authPath);
        logEvent('Final Authorization Response', finalResult.success ? 'success' : 'error', finalResult.rawKlarnaResponse, 'api', 'response', authPath);

        if (finalResult.success && finalResult.data?.result === 'APPROVED') {
          setFlowState('SUCCESS');
          setPaymentTransaction(finalResult.data);
          logEvent('Payment Successfully Completed', 'success', finalResult.data.paymentTransaction, 'flow');
        } else {
          throw new Error(finalResult.error || 'Final authorization failed');
        }
      })
      .catch(error => {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setFlowState('ERROR');
        setErrorMessage(message);
        logEvent('Final Authorization Error', 'error', { error: message }, 'api', 'response', authPath);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, currentOrigin]);

  // Save event log to localStorage whenever it changes
  useEffect(() => {
    saveEventLogToStorage(eventLog);
  }, [eventLog]);

  // Cleanup SDK mount on unmount
  useEffect(() => {
    return () => {
      // Clean up SDK mount when component unmounts
      if (mountedButtonRef.current) {
        try {
          if (typeof mountedButtonRef.current.unmount === 'function') {
            mountedButtonRef.current.unmount();
          }
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
      const existingMount = document.getElementById(sdkMountIdRef.current);
      if (existingMount && existingMount.parentNode) {
        existingMount.parentNode.removeChild(existingMount);
      }
    };
  }, []);

  // ============================================================================
  // RESET FLOW
  // ============================================================================

  const resetFlow = useCallback(() => {
    setFlowState('IDLE');
    setErrorMessage(null);
    setPaymentTransaction(null);
    setPresentationInfo(null);
    presentationRef.current = null;
    setKlarna(null);
    sdkInitializedRef.current = false;
    finalAuthInProgressRef.current = false;
    clearSdkMount();
    logEvent('Flow Reset', 'info', undefined, 'flow');
  }, [logEvent, clearSdkMount]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getFlowStateDisplay = () => {
    const states: Record<FlowState, { label: string; textClass: string; borderClass: string }> = {
      IDLE: { label: 'Ready to Initialize', textClass: 'text-gray-500', borderClass: 'border-gray-400' },
      INITIALIZING: { label: 'Initializing SDK...', textClass: 'text-blue-500', borderClass: 'border-blue-500' },
      READY: { label: 'Ready for Payment', textClass: 'text-green-600', borderClass: 'border-green-600' },
      AUTHORIZING: { label: 'Authorizing Payment...', textClass: 'text-amber-500', borderClass: 'border-amber-500' },
      STEP_UP: { label: 'Customer in Klarna Journey', textClass: 'text-purple-600', borderClass: 'border-purple-600' },
      COMPLETING: { label: 'Completing Authorization...', textClass: 'text-amber-500', borderClass: 'border-amber-500' },
      SUCCESS: { label: 'Payment Successful!', textClass: 'text-green-600', borderClass: 'border-green-600' },
      ERROR: { label: 'Error Occurred', textClass: 'text-red-500', borderClass: 'border-red-500' },
    };
    return states[flowState];
  };

  const stateDisplay = getFlowStateDisplay();

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-[calc(100vh-57px)] bg-gray-50 p-5 max-w-[1400px] mx-auto">
      {/* Main Layout */}
      <div className="flex flex-col md:flex-row gap-5 mb-5">
        {/* Configuration Panel */}
        <div className="flex-1 min-w-0 md:min-w-[300px]">
          <div className="bg-white border border-gray-200 rounded p-4">
            <h3 className="text-base font-bold text-gray-900 mt-0 mb-1.5">Configuration</h3>
            <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 mb-3 text-xs flex items-start gap-2 text-blue-700 leading-relaxed">
              <InformationCircleIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div>
                Enter your Partner Account ID and Client ID to test the hosted or embedded checkout flow.
                The origin <code className="bg-blue-100/70 px-1 py-0.5 rounded text-[11px] font-mono break-all whitespace-normal">{currentOrigin || 'loading...'}</code> must be registered in the store configuration.
              </div>
            </div>
            
            <div className="grid gap-1.5 mb-2.5">
              <label htmlFor="partner-account-id" className="text-xs font-medium text-gray-500">Partner Account ID *</label>
              <input
                id="partner-account-id"
                type="text"
                className={inputClasses}
                placeholder="krn:partner:global:account:live:XXXXXXXX"
                value={partnerAccountId}
                onChange={(e) => setPartnerAccountId(e.target.value)}
                disabled={flowState !== 'IDLE' && flowState !== 'ERROR'}
              />
            </div>

            <div className="grid gap-1.5 mb-2.5">
              <label htmlFor="client-id" className="text-xs font-medium text-gray-500">Acquiring Partner Client ID *</label>
              <input
                id="client-id"
                type="text"
                className={inputClasses}
                placeholder="klarna_test_client_..."
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={flowState !== 'IDLE' && flowState !== 'ERROR'}
              />
            </div>

            {/* Toggle */}
            <div className="flex items-center gap-3 mb-3">
              <label className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  checked={usePaymentRequestData}
                  onChange={(e) => setUsePaymentRequestData(e.target.checked)}
                  disabled={flowState !== 'IDLE' && flowState !== 'ERROR' && flowState !== 'READY'}
                />
                <span className={styles.toggleSlider} />
              </label>
              <span className="text-sm font-medium text-gray-700">
                {usePaymentRequestData ? 'Use Payment Request Data' : 'Use Payment Request ID'}
              </span>
            </div>
            <div className="text-xs text-gray-500 break-words -mt-1 mb-3">
              {usePaymentRequestData
                ? 'The initiate callback returns a paymentRequestData object containing the full payment details. The SDK creates the payment request client-side — no server call is needed during initiation. You can edit the JSON below to customize the payment request data that will be passed to the SDK.'
                : 'The initiate callback calls your server, which uses Klarna\'s Payment Authorize API to create a payment request server-side. The server returns a paymentRequestId to the SDK, which the SDK then uses to proceed with the payment flow.'}
            </div>

            {/* Payment Request Data section (toggle ON) */}
            {usePaymentRequestData && (
              <div className="grid gap-1.5 mb-2.5">
                <label className="text-xs font-medium text-gray-500">Payment Request Data (JSON)</label>
                <textarea
                  className={`${inputClasses} min-h-[200px] font-mono text-xs resize-y`}
                  value={paymentRequestDataJson}
                  onChange={(e) => setPaymentRequestDataJson(e.target.value)}
                  placeholder="Enter payment request data as JSON..."
                />
                <div className="text-xs text-gray-500 break-words">
                  Edit the JSON directly. References will be auto-generated on button click.
                </div>
              </div>
            )}



            <div className="flex gap-2.5 mt-4">
              {flowState === 'IDLE' || flowState === 'ERROR' ? (
                <button
                  onClick={initializeSDK}
                  className="bg-gray-900 text-white px-5 py-3 rounded text-sm font-bold hover:bg-gray-800 border-none cursor-pointer"
                >
                  Initialize & Show Button
                </button>
              ) : flowState === 'SUCCESS' ? (
                <button
                  onClick={resetFlow}
                  className="bg-gray-900 text-white px-5 py-3 rounded text-sm font-bold hover:bg-gray-800 border-none cursor-pointer"
                >
                  Start New Payment
                </button>
              ) : (
                <button
                  disabled
                  className="bg-gray-300 text-white px-5 py-3 rounded text-sm font-bold border-none cursor-not-allowed"
                >
                  {flowState === 'INITIALIZING' ? 'Initializing...' : 'Processing...'}
                </button>
              )}

              {flowState !== 'IDLE' && flowState !== 'INITIALIZING' && (
                <button
                  onClick={resetFlow}
                  className="bg-gray-500 text-white px-5 py-3 rounded text-sm font-bold hover:bg-gray-600 border-none cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Payment Button Panel */}
        <div className="flex-1 min-w-0 md:min-w-[300px]">
          <div className="bg-white border border-gray-200 rounded p-4">
            <h3 className="text-base font-bold text-gray-900 mt-0 mb-1.5">Payment Button</h3>

            {/* Flow State Indicator */}
            <div className={`p-3 bg-gray-50 rounded mb-4 border-2 ${stateDisplay.borderClass}`}>
              <div className={`font-bold mb-1 ${stateDisplay.textClass}`}>
                {stateDisplay.label}
              </div>
              {errorMessage && (
                <div className="text-red-500 text-[13px]">
                  {errorMessage}
                </div>
              )}
            </div>

            {/* Presentation Info */}
            {presentationInfo && (
              <div className="bg-gray-50 border border-gray-200 rounded p-2.5 text-xs text-gray-500 leading-relaxed mb-4">
                <div><strong className="text-gray-900">Instruction:</strong> {presentationInfo.instruction}</div>
                {presentationInfo.paymentOptionId && (
                  <div><strong className="text-gray-900">Payment Option ID:</strong> {presentationInfo.paymentOptionId}</div>
                )}
              </div>
            )}

            {/* Button Mount Container */}
            <div className="mt-5 min-h-[60px] flex items-center justify-center relative">
              {/* Status messages - shown when button is not mounted */}
              {(flowState === 'IDLE' || flowState === 'INITIALIZING') && (
                <span className={`text-sm ${flowState === 'IDLE' ? 'text-gray-500' : 'text-blue-500'}`}>
                  {flowState === 'IDLE'
                    ? 'Click "Initialize & Show Button" to start'
                    : 'Loading Klarna SDK...'}
                </span>
              )}

              {/* SDK Mount Target - React will NOT manage children of this div */}
              <div
                ref={buttonWrapperRef}
                style={{
                  width: '100%',
                  display: flowState === 'IDLE' || flowState === 'INITIALIZING' ? 'none' : 'block',
                }}
              />
            </div>

            {/* Success State */}
            {flowState === 'SUCCESS' && paymentTransaction?.paymentTransaction && (
              <div className="p-4 bg-green-50 rounded mt-4">
                <h4 className="m-0 mb-2 text-green-700">Payment Successful!</h4>
                <div className="text-[13px]">
                  <div><strong>Transaction ID:</strong></div>
                  <code className="text-[11px] break-all bg-gray-200 px-1 py-0.5 rounded font-mono">
                    {paymentTransaction.paymentTransaction.paymentTransactionId}
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Log */}
      <div className="bg-white border border-gray-200 rounded p-4 max-h-[800px] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-bold text-gray-900 m-0">Event Log</h3>
          <button
            onClick={clearLog}
            className="bg-gray-900 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-gray-800 border-none cursor-pointer"
          >
            Clear
          </button>
        </div>
        <div>
          {eventLog.length === 0 ? (
            <p className="text-gray-500 text-xs">Events will appear here...</p>
          ) : (
            eventLog.map((event) => (
              <div key={event.id} className="mb-4 border-b border-gray-200 pb-3 last:border-b-0">
                <div className={`font-bold mb-1 text-[13px] ${
                  event.type === 'error'
                    ? 'text-red-500'
                    : event.type === 'success'
                      ? 'text-green-600'
                      : event.type === 'warning'
                        ? 'text-amber-500'
                        : 'text-gray-900'
                }`}>
                  {event.source === 'sdk' && (
                    <span className="inline-block text-[9px] font-bold px-[5px] py-px rounded tracking-wide uppercase align-middle mr-1 bg-blue-100 text-blue-700">SDK</span>
                  )}
                  {event.source === 'api' && event.direction === 'request' && (
                    <span className="inline-block text-[9px] font-bold px-[5px] py-px rounded tracking-wide uppercase align-middle mr-1 bg-orange-100 text-orange-700">API REQ</span>
                  )}
                  {event.source === 'api' && event.direction === 'response' && (
                    <span className="inline-block text-[9px] font-bold px-[5px] py-px rounded tracking-wide uppercase align-middle mr-1 bg-purple-100 text-purple-700">API RES</span>
                  )}
                  {event.source === 'flow' && (
                    <span className="inline-block text-[9px] font-bold px-[5px] py-px rounded tracking-wide uppercase align-middle mr-1 bg-green-100 text-green-700">FLOW</span>
                  )}
                  {event.type === 'error' && '✗ '}
                  {event.type === 'success' && '✓ '}
                  {event.type === 'warning' && '⚠ '}
                  {event.title}
                </div>
                {event.path && (
                  <div className="text-[11px] font-mono text-gray-400 mb-0.5 break-all">
                    {event.path}
                  </div>
                )}
                <div className="text-[11px] text-gray-500 mb-1.5">
                  {event.timestamp.toLocaleTimeString()}
                </div>
                {event.data !== undefined && event.data !== null && (
                  <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-[11px] overflow-x-auto my-2 max-h-[300px] overflow-y-auto break-words">{JSON.stringify(event.data, null, 2)}</pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
