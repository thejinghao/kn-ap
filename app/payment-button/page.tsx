'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
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

  const logEvent = useCallback((title: string, type: EventLogItem['type'], data?: unknown) => {
    setEventLog(prev => [{
      id: generateId(),
      title,
      timestamp: new Date(),
      type,
      data,
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
        returnUrl: `${currentOrigin}/payment-button?status=complete`,
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

  const handleInitiate = useCallback(async (): Promise<
    | { paymentRequestId: string }
    | { returnUrl?: string }
  > => {
    // Get paymentOptionId from the stored presentation
    const paymentOptionId = presentationRef.current?.paymentOption?.paymentOptionId;
    
    logEvent('Button Clicked - Initiating Payment', 'info', { paymentOptionId });
    setFlowState('AUTHORIZING');
    setErrorMessage(null);

    // Call authorize API
    const result = await authorizePayment(paymentOptionId);
    
    logEvent('Authorization Response', result.success ? 'success' : 'error', result);

    if (!result.success || !result.data) {
      const errorMsg = result.error || 'Authorization failed';
      setFlowState('ERROR');
      setErrorMessage(errorMsg);
      logEvent('Authorization Error', 'error', { error: errorMsg });
      // Throw with clear message - SDK will catch this
      throw new Error(errorMsg);
    }

    const { result: authResult, paymentRequest, paymentTransaction: tx } = result.data;

    switch (authResult) {
      case 'APPROVED':
        // Direct approval (rare for hosted checkout)
        setFlowState('SUCCESS');
        setPaymentTransaction(result.data);
        logEvent('Payment Approved', 'success', tx);
        return { returnUrl: `${currentOrigin}/payment-button?status=approved` };

      case 'STEP_UP_REQUIRED':
        // Customer needs to complete Klarna journey
        if (!paymentRequest?.paymentRequestId) {
          const errorMsg = 'No payment request ID returned';
          setFlowState('ERROR');
          setErrorMessage(errorMsg);
          throw new Error(errorMsg);
        }
        setFlowState('STEP_UP');
        logEvent('Step-up Required - Launching Klarna Journey', 'info', paymentRequest);
        // Return paymentRequestId to SDK - it will handle the Klarna journey
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
        logEvent('Duplicate Complete Event (ignored)', 'warning');
        return true;
      }
      finalAuthInProgressRef.current = true;

      logEvent('Payment Complete Event', 'success', {
        paymentRequestId: paymentRequest.paymentRequestId,
        state: paymentRequest.state,
        stateContext: paymentRequest.stateContext,
      });

      // Get the klarna_network_session_token from stateContext
      const sessionToken = paymentRequest.stateContext?.klarna_network_session_token ||
                          paymentRequest.stateContext?.klarnaNetworkSessionToken;

      if (sessionToken) {
        setFlowState('COMPLETING');
        logEvent('Performing Final Authorization', 'info', { hasSessionToken: true });

        try {
          // Final authorization with the session token
          const finalResult = await authorizePayment(undefined, sessionToken);
          
          logEvent('Final Authorization Response', finalResult.success ? 'success' : 'error', finalResult);

          if (finalResult.success && finalResult.data?.result === 'APPROVED') {
            setFlowState('SUCCESS');
            setPaymentTransaction(finalResult.data);
            logEvent('Payment Successfully Completed', 'success', finalResult.data.paymentTransaction);
          } else {
            throw new Error(finalResult.error || 'Final authorization failed');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          setFlowState('ERROR');
          setErrorMessage(message);
          logEvent('Final Authorization Error', 'error', { error: message });
        }
      } else {
        // If no session token, the payment is complete
        setFlowState('SUCCESS');
        logEvent('Payment Completed (No Final Auth Needed)', 'success');
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
      });
      
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
      logEvent('Payment Error', 'error', { error, paymentRequest });
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
      });

      const presentationResult = await klarnaInstance.Payment.presentation({
        amount: DEFAULT_CONFIG.amount,
        currency: DEFAULT_CONFIG.currency,
        locale: DEFAULT_CONFIG.locale,
        intents: ['PAY'],
      });

      logEvent('Payment Presentation Received', 'success', {
        instruction: String(presentationResult.instruction || 'N/A'),
        hasPaymentOption: !!presentationResult.paymentOption,
      });

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
      logEvent('Presentation Error', 'error', { error: message });
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
    });

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

      logEvent('Payment Button Mounted', 'success');
      setFlowState('READY');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logEvent('Button Mount Error', 'error', { error: message });
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
    logEvent('Initializing Klarna SDK', 'info', { clientId: clientId.substring(0, 30) + '...' });

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

      logEvent('SDK Initialized Successfully', 'success');

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
      logEvent('SDK Initialization Error', 'error', { error: message });
    }
  }, [clientId, partnerAccountId, attachSDKEventHandlers, getPresentation, mountPaymentButton, logEvent]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initialize client-side state after mount (hydration safety)
  useEffect(() => {
    setIsMounted(true);
    setCurrentOrigin(window.location.origin);
    // Generate unique mount ID on client only
    sdkMountIdRef.current = `klarna-sdk-mount-${Date.now()}`;
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
        logEvent('Returned from Klarna Journey', 'info', { status });
        // Clear URL parameters
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [logEvent]);

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
    logEvent('Flow Reset', 'info');
  }, [logEvent, clearSdkMount]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getFlowStateDisplay = () => {
    const states: Record<FlowState, { label: string; color: string }> = {
      IDLE: { label: 'Ready to Initialize', color: '#6f6b7a' },
      INITIALIZING: { label: 'Initializing SDK...', color: '#2196f3' },
      READY: { label: 'Ready for Payment', color: '#4caf50' },
      AUTHORIZING: { label: 'Authorizing Payment...', color: '#ff9800' },
      STEP_UP: { label: 'Customer in Klarna Journey', color: '#9c27b0' },
      COMPLETING: { label: 'Completing Authorization...', color: '#ff9800' },
      SUCCESS: { label: 'Payment Successful!', color: '#4caf50' },
      ERROR: { label: 'Error Occurred', color: '#f44336' },
    };
    return states[flowState];
  };

  const stateDisplay = getFlowStateDisplay();

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={styles.container}>
      {/* Info Banner */}
      <div className={styles.infoBanner}>
        <div className={styles.infoIcon}>ℹ️</div>
        <div className={styles.infoContent}>
          <strong>Acquiring Partner Mode:</strong> Enter your Partner Account ID and Client ID to test the payment flow.
          The origin <code>{currentOrigin || 'loading...'}</code> must be registered in the store configuration.
        </div>
      </div>

      {/* Main Layout */}
      <div className={styles.configRow}>
        {/* Configuration Panel */}
        <div className={styles.configPanel}>
          <div className={styles.config}>
            <h3 style={{ marginTop: 0 }}>Configuration</h3>
            
            <div className={styles.field}>
              <label htmlFor="partner-account-id">Partner Account ID *</label>
              <input
                id="partner-account-id"
                type="text"
                placeholder="krn:partner:global:account:live:XXXXXXXX"
                value={partnerAccountId}
                onChange={(e) => setPartnerAccountId(e.target.value)}
                disabled={flowState !== 'IDLE' && flowState !== 'ERROR'}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="client-id">Acquiring Partner Client ID *</label>
              <input
                id="client-id"
                type="text"
                placeholder="klarna_test_client_..."
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={flowState !== 'IDLE' && flowState !== 'ERROR'}
              />
            </div>

            <div className={styles.field}>
              <label>Payment Details (Hardcoded)</label>
              <div className={styles.infoBox}>
                <div><strong>Amount:</strong> {formatAmount(DEFAULT_CONFIG.amount)}</div>
                <div><strong>Currency:</strong> {DEFAULT_CONFIG.currency}</div>
                <div><strong>Locale:</strong> {DEFAULT_CONFIG.locale}</div>
                <div><strong>Country:</strong> {DEFAULT_CONFIG.country}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              {flowState === 'IDLE' || flowState === 'ERROR' ? (
                <button onClick={initializeSDK}>
                  Initialize & Show Button
                </button>
              ) : flowState === 'SUCCESS' ? (
                <button onClick={resetFlow}>
                  Start New Payment
                </button>
              ) : (
                <button disabled>
                  {flowState === 'INITIALIZING' ? 'Initializing...' : 'Processing...'}
                </button>
              )}
              
              {flowState !== 'IDLE' && flowState !== 'INITIALIZING' && (
                <button 
                  onClick={resetFlow}
                  style={{ background: '#6f6b7a' }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Payment Button Panel */}
        <div className={styles.configPanel}>
          <div className={styles.config}>
            <h3 style={{ marginTop: 0 }}>Payment Button</h3>
            
            {/* Flow State Indicator */}
            <div style={{ 
              padding: '12px', 
              background: '#fcfbf8', 
              borderRadius: '8px', 
              marginBottom: '16px',
              border: `2px solid ${stateDisplay.color}`,
            }}>
              <div style={{ 
                fontWeight: 700, 
                color: stateDisplay.color,
                marginBottom: '4px',
              }}>
                {stateDisplay.label}
              </div>
              {errorMessage && (
                <div style={{ color: '#f44336', fontSize: '13px' }}>
                  {errorMessage}
                </div>
              )}
            </div>

            {/* Presentation Info */}
            {presentationInfo && (
              <div className={styles.infoBox} style={{ marginBottom: '16px' }}>
                <div><strong>Instruction:</strong> {presentationInfo.instruction}</div>
                {presentationInfo.paymentOptionId && (
                  <div><strong>Payment Option ID:</strong> {presentationInfo.paymentOptionId}</div>
                )}
              </div>
            )}

            {/* Button Mount Container */}
            <div 
              className={styles.buttonMount}
              style={{ 
                minHeight: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {/* Status messages - shown when button is not mounted */}
              {(flowState === 'IDLE' || flowState === 'INITIALIZING') && (
                <span style={{ color: flowState === 'IDLE' ? '#6f6b7a' : '#2196f3', fontSize: '14px' }}>
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
              <div style={{ 
                padding: '16px', 
                background: '#e8f5e9', 
                borderRadius: '8px',
                marginTop: '16px',
              }}>
                <h4 style={{ margin: '0 0 8px', color: '#2e7d32' }}>Payment Successful!</h4>
                <div style={{ fontSize: '13px' }}>
                  <div><strong>Transaction ID:</strong></div>
                  <code style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                    {paymentTransaction.paymentTransaction.paymentTransactionId}
                  </code>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Log */}
      <div className={styles.eventLog}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ margin: 0 }}>Event Log</h3>
          <button onClick={clearLog} className={styles.clearButton}>Clear</button>
        </div>
        <div className={styles.eventLogContent}>
          {eventLog.length === 0 ? (
            <p style={{ color: '#6f6b7a', fontSize: '12px' }}>Events will appear here...</p>
          ) : (
            eventLog.map((event) => (
              <div key={event.id} className={styles.eventItem}>
                <div className={styles.eventTitle} style={{
                  color: event.type === 'error' ? '#f44336' 
                       : event.type === 'success' ? '#4caf50'
                       : event.type === 'warning' ? '#ff9800'
                       : '#0b051d'
                }}>
                  {event.type === 'error' && '✗ '}
                  {event.type === 'success' && '✓ '}
                  {event.type === 'warning' && '⚠ '}
                  {event.title}
                </div>
                <div className={styles.eventTime}>
                  {event.timestamp.toLocaleTimeString()}
                </div>
                {event.data !== undefined && event.data !== null && (
                  <pre>{JSON.stringify(event.data, null, 2)}</pre>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
