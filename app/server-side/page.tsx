'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KlarnaSDKType = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PaymentPresentation = any;

// Serializable presentation info for display
interface PresentationInfo {
  instruction: string;
  paymentOptionId: string | null;
}

interface CatalogItem {
  id: string;
  name: string;
  unitPrice: number;
  description: string;
}

interface CartItem {
  catalogItem: CatalogItem;
  quantity: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Default configuration - US market
const DEFAULT_CONFIG = {
  locale: 'en-US',
  currency: 'USD',
  country: 'US',
};

// Default Client ID for testing
const DEFAULT_CLIENT_ID = 'klarna_test_client_L0ZwWW55akg3MjUzcmgyP1RuP3A_KEdIJFBINUxzZXMsOGU5M2NmZGItNmFiOC00ZjQ3LWFhMGMtZDI4NTE1OGU0MTNmLDEsQ3VNRmtmdlpHd1VIRmdDT1Q0Zkh2ZkJ1YkxETy9ZTGFiYUZvYVJ4ZTAyYz0';

// localStorage key for event log persistence (separate from ap-hosted)
const EVENT_LOG_STORAGE_KEY = 'klarna-sub-partner-payment-event-log';

const inputClasses = 'w-full border border-gray-300 rounded px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-400';

const PRODUCT_CATALOG: CatalogItem[] = [
  { id: 'tshirt', name: 'T-Shirt', unitPrice: 2999, description: 'Cotton crew neck' },
  { id: 'shoes', name: 'Running Shoes', unitPrice: 8999, description: 'Lightweight trainers' },
  { id: 'earbuds', name: 'Wireless Earbuds', unitPrice: 4999, description: 'Bluetooth 5.0' },
  { id: 'wallet', name: 'Leather Wallet', unitPrice: 3499, description: 'Genuine leather' },
  { id: 'bottle', name: 'Water Bottle', unitPrice: 1499, description: 'Insulated 32oz' },
];

const TAX_RATE = 0.08;

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

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

function buildDefaultPaymentRequestData(
  origin: string,
  totalAmount: number,
  lineItems: { name: string; quantity: number; totalAmount: number; unitPrice: number }[],
): string {
  return JSON.stringify({
    currency: DEFAULT_CONFIG.currency,
    amount: totalAmount,
    paymentRequestReference: 'Auto-generated on button click',
    supplementaryPurchaseData: {
      purchaseReference: 'Auto-generated on button click',
      lineItems,
    },
    customerInteractionConfig: {
      returnUrl: `${origin}/server-side?status=complete`,
    },
  }, null, 2);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ServerSidePaymentPage() {
  // Client-side mount tracking (for hydration safety)
  const [isMounted, setIsMounted] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState('');

  // Configuration State
  const [clientId, setClientId] = useState(DEFAULT_CLIENT_ID);
  const [sdkToken, setSdkToken] = useState('');
  const [sessionToken, setSessionToken] = useState('');

  // Flow State
  const [flowState, setFlowState] = useState<FlowState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // SDK State
  const [klarna, setKlarna] = useState<KlarnaSDKType | null>(null);
  const [presentationInfo, setPresentationInfo] = useState<PresentationInfo | null>(null);
  const [paymentTransaction, setPaymentTransaction] = useState<{ paymentTransaction?: { paymentTransactionId: string; paymentTransactionReference: string; amount: number; currency: string } } | null>(null);

  // Event Log
  const [eventLog, setEventLog] = useState<EventLogItem[]>([]);

  // Initiation mode toggle
  const [usePaymentRequestData, setUsePaymentRequestData] = useState(true);
  const usePaymentRequestDataRef = useRef(true);
  const [paymentRequestDataJson, setPaymentRequestDataJson] = useState('');
  const paymentRequestDataJsonRef = useRef('');

  // Payment Request ID manual input (for server-side mode)
  const [manualPaymentRequestId, setManualPaymentRequestId] = useState('');
  const manualPaymentRequestIdRef = useRef('');

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { catalogItem: PRODUCT_CATALOG[0], quantity: 2 },
    { catalogItem: PRODUCT_CATALOG[1], quantity: 1 },
  ]);

  // Cart derived values
  const cartSubtotal = useMemo(() =>
    cartItems.reduce((sum, item) => sum + item.catalogItem.unitPrice * item.quantity, 0), [cartItems]);
  const cartTax = useMemo(() => Math.round(cartSubtotal * TAX_RATE), [cartSubtotal]);
  const cartTotal = useMemo(() => cartSubtotal + cartTax, [cartSubtotal, cartTax]);
  const cartLineItems = useMemo(() => cartItems.map(item => ({
    name: item.catalogItem.name,
    quantity: item.quantity,
    totalAmount: item.catalogItem.unitPrice * item.quantity,
    unitPrice: item.catalogItem.unitPrice,
  })), [cartItems]);
  const allLineItems = useMemo(() => [
    ...cartLineItems,
    { name: 'Tax (8%)', quantity: 1, totalAmount: cartTax, unitPrice: cartTax },
  ], [cartLineItems, cartTax]);

  const cartLocked = flowState !== 'IDLE' && flowState !== 'ERROR';

  // Refs
  const buttonWrapperRef = useRef<HTMLDivElement>(null);
  const sdkInitializedRef = useRef(false);
  const presentationRef = useRef<PaymentPresentation | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mountedButtonRef = useRef<any>(null);
  const sdkMountIdRef = useRef<string>('klarna-sdk-mount');
  const cartTotalRef = useRef(cartTotal);
  const allLineItemsRef = useRef(allLineItems);

  // ============================================================================
  // CART MANIPULATION
  // ============================================================================

  const removeFromCart = useCallback((catalogItemId: string) => {
    setCartItems(prev => prev.filter(item => item.catalogItem.id !== catalogItemId));
  }, []);

  const updateQuantity = useCallback((catalogItemId: string, delta: number) => {
    setCartItems(prev => prev.map(item =>
      item.catalogItem.id === catalogItemId
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ));
  }, []);

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
      // === Payment Request ID mode (manual input) ===
      // Sub-partners create the payment request on their own backend.
      // Since we don't have the sub-partner backend, accept a manual ID.
      const requestId = manualPaymentRequestIdRef.current.trim();
      if (!requestId) {
        const msg = 'Payment Request ID is required. Enter the ID created by your backend.';
        setFlowState('ERROR');
        setErrorMessage(msg);
        logEvent('Missing Payment Request ID', 'error', { error: msg }, 'flow');
        throw new Error(msg);
      }

      logEvent('Using Manual Payment Request ID', 'info', { paymentRequestId: requestId }, 'flow');
      setFlowState('STEP_UP');
      return { paymentRequestId: requestId };
    }
  }, [logEvent]);

  // ============================================================================
  // SDK EVENT HANDLERS
  // ============================================================================

  const attachSDKEventHandlers = useCallback((klarnaInstance: KlarnaSDKType) => {
    // Handle payment completion
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    klarnaInstance.Payment.on('complete', async (paymentRequest: any) => {
      logEvent('Payment Complete Event', 'success', {
        paymentRequestId: paymentRequest.paymentRequestId,
        state: paymentRequest.state,
        stateContext: paymentRequest.stateContext,
      }, 'sdk');

      // Sub-partner flow: final authorization happens on the sub-partner's backend,
      // not through our AP proxy. We just show success.
      const tx = paymentRequest.stateContext?.paymentTransaction;
      if (tx) {
        setPaymentTransaction({ paymentTransaction: tx });
      }
      setFlowState('SUCCESS');
      logEvent('Payment Completed', 'success', {
        note: 'Final authorization should be performed by the sub-partner backend.',
        stateContext: paymentRequest.stateContext,
      }, 'flow');

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
  }, [logEvent]);

  // ============================================================================
  // GET PAYMENT PRESENTATION & MOUNT BUTTON
  // ============================================================================

  const getPresentation = useCallback(async (klarnaInstance: KlarnaSDKType) => {
    try {
      logEvent('Getting Payment Presentation', 'info', {
        amount: cartTotalRef.current,
        currency: DEFAULT_CONFIG.currency,
        locale: DEFAULT_CONFIG.locale,
      }, 'sdk');

      const presentationResult = await klarnaInstance.Payment.presentation({
        amount: cartTotalRef.current,
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
      setErrorMessage('Sub Partner Client ID is required');
      setFlowState('ERROR');
      return;
    }

    setFlowState('INITIALIZING');
    setErrorMessage(null);
    logEvent('Initializing Klarna SDK', 'info', {
      clientId: clientId.substring(0, 30) + '...',
      hasSdkToken: !!sdkToken.trim(),
      hasSessionToken: !!sessionToken.trim(),
    }, 'sdk');

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

      // Initialize SDK - sub-partner flow: no partnerAccountId
      const sdkConfig: Record<string, unknown> = {
        clientId: clientId.trim(),
        products: ['PAYMENT'],
      };
      if (sdkToken.trim()) {
        sdkConfig.sdkToken = sdkToken.trim();
      }
      if (sessionToken.trim()) {
        sdkConfig.klarnaNetworkSessionToken = sessionToken.trim();
      }

      const klarnaInstance = await KlarnaSDK(sdkConfig);

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
  }, [clientId, sdkToken, sessionToken, attachSDKEventHandlers, getPresentation, mountPaymentButton, logEvent]);

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

  useEffect(() => {
    manualPaymentRequestIdRef.current = manualPaymentRequestId;
  }, [manualPaymentRequestId]);

  // Sync cart refs
  useEffect(() => {
    cartTotalRef.current = cartTotal;
  }, [cartTotal]);

  useEffect(() => {
    allLineItemsRef.current = allLineItems;
  }, [allLineItems]);

  // Auto-regenerate paymentRequestDataJson when cart changes
  useEffect(() => {
    if (!currentOrigin) return;
    if (flowState !== 'IDLE' && flowState !== 'ERROR') return;
    setPaymentRequestDataJson(buildDefaultPaymentRequestData(currentOrigin, cartTotal, allLineItems));
  }, [cartTotal, allLineItems, currentOrigin, flowState]);

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
        logEvent('Returned from Klarna Journey', 'info', { status }, 'flow');
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
    clearSdkMount();
    setCartItems([
      { catalogItem: PRODUCT_CATALOG[0], quantity: 2 },
      { catalogItem: PRODUCT_CATALOG[1], quantity: 1 },
    ]);
    logEvent('Flow Reset', 'info', undefined, 'flow');
  }, [logEvent, clearSdkMount]);

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
                Enter the sub-partner&apos;s Client ID to test the server-side payment flow.
                The origin <code className="bg-blue-100/70 px-1 py-0.5 rounded text-[11px] font-mono break-all whitespace-normal">{currentOrigin || 'loading...'}</code> must be registered as an allowed origin in the Klarna Partner Portal (Settings &rarr; Client Identifier &rarr; Allowed Origins).
              </div>
            </div>

            <div className="grid gap-1.5 mb-2.5">
              <label htmlFor="client-id" className="text-xs font-medium text-gray-500">Sub Partner Client ID *</label>
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

            <div className="grid gap-1.5 mb-2.5">
              <label htmlFor="sdk-token" className="text-xs font-medium text-gray-500">SDK Token <span className="text-gray-400">(optional)</span></label>
              <input
                id="sdk-token"
                type="text"
                className={inputClasses}
                placeholder="Token generated by the AP for the sub-partner"
                value={sdkToken}
                onChange={(e) => setSdkToken(e.target.value)}
                disabled={flowState !== 'IDLE' && flowState !== 'ERROR'}
              />
            </div>

            <div className="grid gap-1.5 mb-2.5">
              <label htmlFor="session-token" className="text-xs font-medium text-gray-500">Klarna Network Session Token <span className="text-gray-400">(optional)</span></label>
              <input
                id="session-token"
                type="text"
                className={inputClasses}
                placeholder="Interoperability token provided by the AP"
                value={sessionToken}
                onChange={(e) => setSessionToken(e.target.value)}
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
                : 'The initiate callback returns a paymentRequestId that was created by the sub-partner\'s backend. Since this demo doesn\'t have the sub-partner backend, enter the payment request ID manually below.'}
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

            {/* Payment Request ID section (toggle OFF) */}
            {!usePaymentRequestData && (
              <div className="grid gap-1.5 mb-2.5">
                <label htmlFor="payment-request-id" className="text-xs font-medium text-gray-500">Payment Request ID</label>
                <input
                  id="payment-request-id"
                  type="text"
                  className={inputClasses}
                  placeholder="Enter the payment request ID from your backend..."
                  value={manualPaymentRequestId}
                  onChange={(e) => setManualPaymentRequestId(e.target.value)}
                />
                <div className="text-xs text-gray-500 break-words">
                  Create a payment request via your backend, then paste the ID here. When the Klarna button is clicked, this ID is returned to the SDK.
                </div>
              </div>
            )}

            <div className="flex gap-2.5 mt-4">
              {flowState === 'IDLE' || flowState === 'ERROR' ? (
                <button
                  onClick={initializeSDK}
                  disabled={cartItems.length === 0}
                  className="bg-gray-900 text-white px-5 py-3 rounded text-sm font-bold hover:bg-gray-800 border-none cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Initialize & Show Button
                </button>
              ) : (
                <button
                  disabled
                  className="bg-gray-300 text-white px-5 py-3 rounded text-sm font-bold border-none cursor-not-allowed"
                >
                  {flowState === 'INITIALIZING' ? 'Initializing...' : flowState === 'SUCCESS' ? 'Payment Complete' : 'Processing...'}
                </button>
              )}

              {flowState !== 'IDLE' && flowState !== 'INITIALIZING' && flowState !== 'SUCCESS' && (
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

        {/* Checkout Panel */}
        <div className="flex-1 min-w-0 md:min-w-[300px]">
          <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            {/* Browser Title Bar */}
            <div className="bg-gray-200 px-3 py-2 flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
            </div>
            {/* Browser URL Bar */}
            <div className="bg-gray-100 px-3 py-1.5 flex items-center gap-2 text-xs border-b border-gray-200">
              <svg className="w-3 h-3 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
              </svg>
              <span className="text-gray-500 font-mono text-xs">
                cool-sneakers.com{flowState === 'SUCCESS' && paymentTransaction?.paymentTransaction ? '/order-confirmation' : '/checkout'}
              </span>
            </div>
            {/* Browser Content Area */}
            <div className="bg-white p-4">
            <h3 className="text-base font-bold text-gray-900 mt-0 mb-3">Checkout</h3>

            {flowState === 'IDLE' ? (
              /* ---- Pre-initialization placeholder ---- */
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-gray-400 text-sm mb-1">Configure settings and click</div>
                <div className="text-gray-500 font-medium text-sm">&quot;Initialize &amp; Show Button&quot; to start</div>
              </div>
            ) : flowState === 'SUCCESS' && paymentTransaction?.paymentTransaction ? (
              /* ---- Order Confirmation ---- */
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">Order Confirmed</h4>

                <div className="bg-gray-50 rounded p-3 text-left text-sm mb-3 space-y-3">
                  <div>
                    <div className="text-xs text-gray-500">Transaction Reference</div>
                    <code className="text-xs break-all bg-gray-200 px-1 py-0.5 rounded font-mono">
                      {paymentTransaction.paymentTransaction.paymentTransactionReference}
                    </code>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Transaction ID <span className="text-gray-400 italic">— From Klarna</span></div>
                    <code className="text-xs break-all bg-gray-200 px-1 py-0.5 rounded font-mono">
                      {paymentTransaction.paymentTransaction.paymentTransactionId}
                    </code>
                  </div>
                </div>

                <div className="text-sm font-medium text-gray-700 mb-4">
                  Amount charged: <span className="font-bold">{formatCents(paymentTransaction.paymentTransaction.amount)}</span>
                </div>

                <button
                  onClick={resetFlow}
                  className="bg-gray-900 text-white px-5 py-3 rounded text-sm font-bold hover:bg-gray-800 border-none cursor-pointer w-full"
                >
                  New Order
                </button>
              </div>
            ) : flowState === 'SUCCESS' ? (
              /* ---- Success without transaction details ---- */
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">Payment Completed</h4>
                <p className="text-sm text-gray-600 mb-4">
                  The payment flow completed successfully. Final authorization should be performed by the sub-partner backend.
                </p>
                <button
                  onClick={resetFlow}
                  className="bg-gray-900 text-white px-5 py-3 rounded text-sm font-bold hover:bg-gray-800 border-none cursor-pointer w-full"
                >
                  New Order
                </button>
              </div>
            ) : (
              /* ---- Checkout Content ---- */
              <>
                {/* Cart Items */}
                <div className="space-y-2 mb-3">
                  {cartItems.length === 0 && (
                    <div className="text-sm text-gray-400 text-center py-4">Cart is empty</div>
                  )}
                  {cartItems.map(item => (
                    <div key={item.catalogItem.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{item.catalogItem.name}</div>
                        <div className="text-xs text-gray-500">{formatCents(item.catalogItem.unitPrice)} each</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(item.catalogItem.id, -1)}
                          disabled={cartLocked || item.quantity <= 1}
                          className="w-6 h-6 rounded bg-gray-200 text-gray-700 text-xs font-bold border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-300"
                        >
                          &minus;
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.catalogItem.id, 1)}
                          disabled={cartLocked}
                          className="w-6 h-6 rounded bg-gray-200 text-gray-700 text-xs font-bold border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-sm font-medium text-gray-900 w-16 text-right">
                        {formatCents(item.catalogItem.unitPrice * item.quantity)}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.catalogItem.id)}
                        disabled={cartLocked}
                        className="text-gray-400 hover:text-red-500 text-xs border-none bg-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed p-1"
                      >
                        &#x2715;
                      </button>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="border-t border-gray-200 pt-2 mb-4 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{formatCents(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (8%)</span>
                    <span>{formatCents(cartTax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                    <span>Total</span>
                    <span>{formatCents(cartTotal)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mb-2">
                  <div className="text-xs font-medium text-gray-500 mb-2">Payment Method</div>

                  {/* Credit Card - mock disabled */}
                  <div className="p-3 bg-gray-50 rounded border border-gray-200 mb-2 opacity-60">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                      <span className="text-sm text-gray-500">Credit Card</span>
                    </div>
                  </div>

                  {/* Klarna - selected */}
                  <div className="p-3 bg-pink-50 rounded border-2 border-pink-300">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-4 rounded-full border-2 border-pink-400 bg-pink-400 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">Pay with Klarna</span>
                    </div>

                    {/* Flow Status */}
                    {errorMessage && (
                      <div className="text-red-500 text-xs mb-2 ml-6">{errorMessage}</div>
                    )}
                    {(flowState === 'INITIALIZING' || flowState === 'AUTHORIZING' || flowState === 'COMPLETING') && (
                      <div className="text-xs text-blue-500 mb-2 ml-6">
                        {flowState === 'INITIALIZING' ? 'Loading Klarna SDK...' : flowState === 'AUTHORIZING' ? 'Initiating payment...' : 'Completing payment...'}
                      </div>
                    )}
                    {flowState === 'STEP_UP' && (
                      <div className="text-xs text-purple-600 mb-2 ml-6">Customer in Klarna journey...</div>
                    )}

                    {/* Button Mount Container */}
                    <div className="min-h-[48px] flex items-center justify-center relative">
                      {/* SDK Mount Target - React will NOT manage children of this div */}
                      <div
                        ref={buttonWrapperRef}
                        style={{
                          width: '100%',
                          display: flowState === 'INITIALIZING' ? 'none' : 'block',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
            </div>
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
