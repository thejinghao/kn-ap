'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

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
  | 'AWAITING_AUTHORIZATION'
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
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestMetadata: {
    correlationId: string;
  };
}

interface CreatePaymentRequestResponse {
  success: boolean;
  paymentRequestId?: string;
  error?: string;
  rawKlarnaRequest?: unknown;
  rawKlarnaResponse?: unknown;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestMetadata: {
    correlationId: string;
  };
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

// Default Partner Account ID for final authorization (AP's account)
const DEFAULT_PARTNER_ACCOUNT_ID = 'krn:partner:global:account:test:MKPMV6MS';

// localStorage key for event log persistence (separate from ap-hosted)
const EVENT_LOG_STORAGE_KEY = 'klarna-sub-partner-payment-event-log';

const OSM_CLIENT_ID = 'klarna_test_client_L0ZwWW55akg3MjUzcmgyP1RuP3A_KEdIJFBINUxzZXMsOGU5M2NmZGItNmFiOC00ZjQ3LWFhMGMtZDI4NTE1OGU0MTNmLDEsQ3VNRmtmdlpHd1VIRmdDT1Q0Zkh2ZkJ1YkxETy9ZTGFiYUZvYVJ4ZTAyYz0';
const OSM_PLACEMENT_KEY = 'credit-promotion-auto-size';

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
// MAIN COMPONENT
// ============================================================================

export default function ServerSidePaymentPage() {
  // Client-side mount tracking (for hydration safety)
  const [isMounted, setIsMounted] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState('');

  // Configuration State
  const [clientId, setClientId] = useState(DEFAULT_CLIENT_ID);
  const [partnerAccountId, setPartnerAccountId] = useState(DEFAULT_PARTNER_ACCOUNT_ID);
  const [sdkToken, setSdkToken] = useState('');
  const [sessionToken, setSessionToken] = useState('');

  // Flow State
  const [flowState, setFlowState] = useState<FlowState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // SDK State
  const [klarna, setKlarna] = useState<KlarnaSDKType | null>(null);
  const [presentationInfo, setPresentationInfo] = useState<PresentationInfo | null>(null);
  const [paymentTransaction, setPaymentTransaction] = useState<{ paymentTransaction?: { paymentTransactionId: string; paymentTransactionReference: string; amount: number; currency: string } } | null>(null);

  // Pending session token (shown on interim page before manual final auth)
  const [pendingSessionToken, setPendingSessionToken] = useState<string | null>(null);

  // Payment method selection
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'credit_card' | 'klarna' | null>(null);

  // Event Log
  const [eventLog, setEventLog] = useState<EventLogItem[]>([]);

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

  const cartLocked = flowState !== 'IDLE' && flowState !== 'ERROR' && flowState !== 'AWAITING_AUTHORIZATION';

  // Refs
  const bottomButtonWrapperRef = useRef<HTMLDivElement>(null);
  const sdkInitializedRef = useRef(false);
  const presentationRef = useRef<PaymentPresentation | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mountedButtonRef = useRef<any>(null);
  const sdkMountIdRef = useRef<string>('klarna-sdk-mount');
  const finalAuthInProgressRef = useRef(false);
  const cartTotalRef = useRef(cartTotal);
  const allLineItemsRef = useRef(allLineItems);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const osmKlarnaRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const osmPlacementRef = useRef<any>(null);
  const currentOriginRef = useRef('');

  // SDK sub-component mount targets (DOM elements)
  const iconMountRef = useRef<HTMLDivElement>(null);
  const headerMountRef = useRef<HTMLDivElement>(null);
  const subheaderMountRef = useRef<HTMLDivElement>(null);
  const messageMountRef = useRef<HTMLDivElement>(null);

  // SDK sub-component mounted instances (for cleanup)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mountedIconRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mountedHeaderRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mountedSubheaderRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mountedMessageRef = useRef<any>(null);

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
        amount: cartTotalRef.current,
        paymentOptionId,
        paymentTransactionReference: `tx_${Date.now()}_${generateId()}`,
        paymentRequestReference: `pr_${Date.now()}_${generateId()}`,
        returnUrl: `${currentOriginRef.current}/server-side?payment_request_id={klarna.payment_request.id}&state={klarna.payment_request.state}&klarna_network_session_token={klarna.payment_request.klarna_network_session_token}&payment_request_reference={klarna.payment_request.payment_request_reference}`,
        klarnaNetworkSessionToken,
        supplementaryPurchaseData: {
          purchaseReference: `purchase_${Date.now()}`,
          lineItems: allLineItemsRef.current,
        },
      }),
    });

    return response.json();
  }, [partnerAccountId]);

  // ============================================================================
  // CREATE PAYMENT REQUEST (sub-partner credentials)
  // ============================================================================

  const createPaymentRequest = useCallback(async (): Promise<CreatePaymentRequestResponse> => {
    const response = await fetch('/api/payment/create-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currency: DEFAULT_CONFIG.currency,
        amount: cartTotalRef.current,
        lineItems: allLineItemsRef.current,
        returnUrl: `${currentOriginRef.current}/server-side?payment_request_id={klarna.payment_request.id}&state={klarna.payment_request.state}&klarna_network_session_token={klarna.payment_request.klarna_network_session_token}&payment_request_reference={klarna.payment_request.payment_request_reference}`,
        shippingCountries: [DEFAULT_CONFIG.country],
      }),
    });

    return response.json();
  }, []);

  // ============================================================================
  // MANUAL FINAL AUTHORIZATION (triggered from interim page)
  // ============================================================================

  const handleFinalAuthorize = useCallback(async () => {
    if (!pendingSessionToken) return;

    setFlowState('COMPLETING');
    logEvent('Manual Final Authorization Triggered', 'info', undefined, 'flow');

    const authPath = `POST /v2/accounts/${partnerAccountId}/payment/authorize`;
    try {
      const finalResult = await authorizePayment(undefined, pendingSessionToken);

      logEvent('Final Authorization Request (AP Credentials)', 'info', { body: finalResult.rawKlarnaRequest, headers: finalResult.requestHeaders }, 'api', 'request', authPath);
      logEvent('Final Authorization Response', finalResult.success ? 'success' : 'error', { body: finalResult.rawKlarnaResponse, headers: finalResult.responseHeaders }, 'api', 'response', authPath);

      if (finalResult.success && finalResult.data?.result === 'APPROVED') {
        setFlowState('SUCCESS');
        setPaymentTransaction(finalResult.data);
        setPendingSessionToken(null);
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
  }, [pendingSessionToken, partnerAccountId, authorizePayment, logEvent]);

  // ============================================================================
  // INITIATE CALLBACK (called when button is clicked)
  // ============================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInitiate = useCallback(async (): Promise<any> => {
    logEvent('Button Clicked - Creating Payment Request (Sub-partner Credentials)', 'info', undefined, 'flow');
    setFlowState('AUTHORIZING');
    setErrorMessage(null);

    const apiPath = 'POST /v2/payment/requests';

    try {
      const result = await createPaymentRequest();

      logEvent('Create Payment Request', 'info', { body: result.rawKlarnaRequest, headers: result.requestHeaders }, 'api', 'request', apiPath);
      logEvent('Create Payment Request Response', result.success ? 'success' : 'error', { body: result.rawKlarnaResponse, headers: result.responseHeaders }, 'api', 'response', apiPath);

      if (!result.success || !result.paymentRequestId) {
        const msg = result.error || 'Failed to create payment request';
        setFlowState('ERROR');
        setErrorMessage(msg);
        throw new Error(msg);
      }

      logEvent('Payment Request Created', 'success', { paymentRequestId: result.paymentRequestId }, 'flow');
      setFlowState('STEP_UP');
      return { paymentRequestId: result.paymentRequestId };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (flowState !== 'ERROR') {
        setFlowState('ERROR');
        setErrorMessage(msg);
      }
      throw error;
    }
  }, [logEvent, createPaymentRequest, flowState]);

  // ============================================================================
  // SDK EVENT HANDLERS
  // ============================================================================

  const attachSDKEventHandlers = useCallback((klarnaInstance: KlarnaSDKType) => {
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

      // Extract session token for final authorization
      const completionToken = paymentRequest.stateContext?.klarna_network_session_token ||
                          paymentRequest.stateContext?.klarnaNetworkSessionToken ||
                          paymentRequest.stateContext?.interoperabilityToken;

      if (completionToken) {
        // Save token to sessionStorage for persistence across redirect
        try { sessionStorage.setItem('pendingSessionToken', completionToken); } catch {}
        setFlowState('COMPLETING');
        logEvent('Session Token Saved — Awaiting Redirect', 'info', undefined, 'flow');

        // Fallback: if no redirect occurs within 3s (e.g. popup mode), show interim page
        setTimeout(() => {
          const pending = sessionStorage.getItem('pendingSessionToken');
          if (!pending) return; // redirect handler already consumed it
          sessionStorage.removeItem('pendingSessionToken');

          setPendingSessionToken(pending);
          setFlowState('AWAITING_AUTHORIZATION');
          logEvent('Session Token Available — Manual Authorization Required', 'info', {
            token: pending.substring(0, 40) + '...',
          }, 'flow');
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

  // Helper to unmount all SDK presentation sub-components
  const clearSdkSubComponents = useCallback(() => {
    for (const ref of [mountedIconRef, mountedHeaderRef, mountedSubheaderRef, mountedMessageRef]) {
      if (ref.current) {
        try {
          if (typeof ref.current.unmount === 'function') ref.current.unmount();
        } catch {}
        ref.current = null;
      }
    }
    // Clear the inner content of mount targets
    for (const ref of [iconMountRef, headerMountRef, subheaderMountRef, messageMountRef]) {
      if (ref.current) ref.current.innerHTML = '';
    }
  }, []);

  // Mount icon, header, and subheader.short from presentation
  const mountPresentationComponents = useCallback((presentation: PaymentPresentation) => {
    if (!presentation) return;

    try {
      // Mount icon (badge shape)
      if (iconMountRef.current && presentation.icon) {
        const iconInstance = presentation.icon.component({ shape: 'badge' }).mount(iconMountRef.current);
        mountedIconRef.current = iconInstance;
      }

      // Mount header
      if (headerMountRef.current && presentation.header) {
        const headerInstance = presentation.header.component().mount(headerMountRef.current);
        mountedHeaderRef.current = headerInstance;
      }

      // Mount subheader.short
      if (subheaderMountRef.current && presentation.subheader?.short) {
        const subheaderInstance = presentation.subheader.short.component().mount(subheaderMountRef.current);
        mountedSubheaderRef.current = subheaderInstance;
      }

      logEvent('Presentation Components Mounted', 'success', undefined, 'sdk');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logEvent('Presentation Component Mount Error', 'error', { error: message }, 'sdk');
    }
  }, [logEvent]);

  // Mount enriched subheader (message) — shown when Klarna is selected
  const mountMessageComponent = useCallback(() => {
    const presentation = presentationRef.current;
    if (!presentation?.subheader?.enriched || !messageMountRef.current) return;

    // Already mounted
    if (mountedMessageRef.current) return;

    try {
      const messageInstance = presentation.subheader.enriched.component().mount(messageMountRef.current);
      mountedMessageRef.current = messageInstance;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logEvent('Message Component Mount Error', 'error', { error: message }, 'sdk');
    }
  }, [logEvent]);

  // Unmount just the enriched subheader/message
  const unmountMessageComponent = useCallback(() => {
    if (mountedMessageRef.current) {
      try {
        if (typeof mountedMessageRef.current.unmount === 'function') mountedMessageRef.current.unmount();
      } catch {}
      mountedMessageRef.current = null;
    }
    if (messageMountRef.current) messageMountRef.current.innerHTML = '';
  }, []);

  const mountPaymentButton = useCallback((presentationResult: PaymentPresentation) => {
    if (!bottomButtonWrapperRef.current || !presentationResult?.paymentOption) {
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
      bottomButtonWrapperRef.current.appendChild(mountTarget);

      // Mount the button from the presentation
      const buttonInstance = paymentOption.paymentButton
        .component({
          shape: 'rect',
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logEvent('Button Mount Error', 'error', { error: message }, 'sdk');
      setErrorMessage(`Failed to mount button: ${message}`);
      setFlowState('ERROR');
    }
  }, [handleInitiate, logEvent, clearSdkMount]);

  // Handle payment method selection
  const handlePaymentMethodSelect = useCallback((method: 'credit_card' | 'klarna') => {
    setSelectedPaymentMethod(method);

    if (method === 'klarna') {
      // Mount enriched message + payment button
      mountMessageComponent();
      if (presentationRef.current) {
        mountPaymentButton(presentationRef.current);
      }
    } else {
      // Unmount message and button
      unmountMessageComponent();
      clearSdkMount();
    }
  }, [mountMessageComponent, unmountMessageComponent, mountPaymentButton, clearSdkMount]);

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

      // Get presentation and mount sub-components (icon, header, subheader)
      const presentationResult = await getPresentation(klarnaInstance);
      mountPresentationComponents(presentationResult);

      // Respect instruction field
      const instruction = presentationResult.instruction;
      if (instruction === 'PRESELECT_KLARNA' || instruction === 'SHOW_ONLY_KLARNA') {
        setSelectedPaymentMethod('klarna');
        // Mount message + button for pre-selected state
        mountMessageComponent();
        mountPaymentButton(presentationResult);
      }

      setFlowState('READY');

      // Initialize On-Site Messaging (separate SDK instance)
      try {
        const osmKlarna = await KlarnaSDK({
          clientId: OSM_CLIENT_ID,
          products: ['MESSAGING'],
        });
        osmKlarnaRef.current = osmKlarna;

        const placement = osmKlarna.Messaging.placement({
          key: OSM_PLACEMENT_KEY,
          amount: cartTotalRef.current,
          locale: DEFAULT_CONFIG.locale,
          theme: 'default',
          id: 'klarna-osm-placement',
        });
        osmPlacementRef.current = placement;
        placement.mount('#klarna-osm-placement');
      } catch (osmError) {
        console.error('OSM initialization failed:', osmError);
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setFlowState('ERROR');
      setErrorMessage(`SDK initialization failed: ${message}`);
      logEvent('SDK Initialization Error', 'error', { error: message }, 'sdk');
    }
  }, [clientId, sdkToken, sessionToken, attachSDKEventHandlers, getPresentation, mountPresentationComponents, mountMessageComponent, mountPaymentButton, logEvent]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Sync cart refs
  useEffect(() => {
    cartTotalRef.current = cartTotal;
  }, [cartTotal]);

  useEffect(() => {
    allLineItemsRef.current = allLineItems;
  }, [allLineItems]);

  useEffect(() => {
    currentOriginRef.current = currentOrigin;
  }, [currentOrigin]);

  // Update OSM placement when cart total changes
  useEffect(() => {
    if (!osmKlarnaRef.current || !osmPlacementRef.current) return;

    try {
      osmPlacementRef.current.unmount();
    } catch {}

    try {
      const placement = osmKlarnaRef.current.Messaging.placement({
        key: OSM_PLACEMENT_KEY,
        amount: cartTotal,
        locale: DEFAULT_CONFIG.locale,
        theme: 'default',
        id: 'klarna-osm-placement',
      });
      osmPlacementRef.current = placement;
      placement.mount('#klarna-osm-placement');
    } catch (error) {
      console.error('OSM update failed:', error);
    }
  }, [cartTotal]);

  // Initialize client-side state after mount (hydration safety)
  useEffect(() => {
    setIsMounted(true);
    setCurrentOrigin(window.location.origin);
    currentOriginRef.current = window.location.origin;
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
      const state = params.get('state');
      const urlSessionToken = params.get('klarna_network_session_token');
      const paymentRequestId = params.get('payment_request_id');

      if (status || state || urlSessionToken) {
        logEvent('Returned from Klarna Journey', 'info', {
          status,
          state,
          paymentRequestId,
          hasToken: !!urlSessionToken,
        }, 'flow');

        // Save klarna_network_session_token to sessionStorage for the resume handler.
        if (urlSessionToken) {
          try { sessionStorage.setItem('pendingSessionToken', urlSessionToken); } catch {}
        }

        // Clear URL parameters
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [logEvent]);

  // After redirect: show interim page with session token instead of auto-authorizing
  useEffect(() => {
    if (!isMounted || !currentOrigin) return;

    const token = sessionStorage.getItem('pendingSessionToken');
    if (!token) return;

    sessionStorage.removeItem('pendingSessionToken');
    setPendingSessionToken(token);
    setFlowState('AWAITING_AUTHORIZATION');
    logEvent('Returned with Session Token — Manual Authorization Required', 'info', {
      token: token.substring(0, 40) + '...',
    }, 'flow');
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
      // Clean up SDK sub-components
      for (const ref of [mountedIconRef, mountedHeaderRef, mountedSubheaderRef, mountedMessageRef]) {
        if (ref.current) {
          try { if (typeof ref.current.unmount === 'function') ref.current.unmount(); } catch {}
        }
      }
      // Clean up OSM placement
      if (osmPlacementRef.current) {
        try { osmPlacementRef.current.unmount(); } catch {}
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
    setPendingSessionToken(null);
    presentationRef.current = null;
    setKlarna(null);
    sdkInitializedRef.current = false;
    finalAuthInProgressRef.current = false;
    setSelectedPaymentMethod(null);
    clearSdkMount();
    clearSdkSubComponents();
    // Clean up OSM
    if (osmPlacementRef.current) {
      try { osmPlacementRef.current.unmount(); } catch {}
      osmPlacementRef.current = null;
    }
    osmKlarnaRef.current = null;
    setCartItems([
      { catalogItem: PRODUCT_CATALOG[0], quantity: 2 },
      { catalogItem: PRODUCT_CATALOG[1], quantity: 1 },
    ]);
    logEvent('Flow Reset', 'info', undefined, 'flow');
  }, [logEvent, clearSdkMount, clearSdkSubComponents]);

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
                placeholder="Enter SDK token..."
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
                placeholder="Enter session token..."
                value={sessionToken}
                onChange={(e) => setSessionToken(e.target.value)}
                disabled={flowState !== 'IDLE' && flowState !== 'ERROR'}
              />
            </div>

            <div className="grid gap-1.5 mb-2.5">
              <label htmlFor="partner-account-id" className="text-xs font-medium text-gray-500">Partner Account ID <span className="text-gray-400">(for final authorization)</span></label>
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
                  {flowState === 'INITIALIZING' ? 'Initializing...' : flowState === 'SUCCESS' ? 'Payment Complete' : flowState === 'AWAITING_AUTHORIZATION' ? 'Awaiting Authorization' : 'Processing...'}
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
              <span className="text-gray-500 font-mono text-xs truncate">
                {flowState === 'AWAITING_AUTHORIZATION' && pendingSessionToken
                  ? `cool-sneakers.com/checkout/return?klarna_network_session_token=${pendingSessionToken.substring(0, 24)}...`
                  : `cool-sneakers.com${flowState === 'SUCCESS' && paymentTransaction?.paymentTransaction ? '/order-confirmation' : '/checkout'}`}
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
            ) : flowState === 'AWAITING_AUTHORIZATION' && pendingSessionToken ? (
              /* ---- Interim: Customer Returned from Klarna ---- */
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 m-0">Customer Returned from Klarna</h4>
                    <p className="text-xs text-gray-500 m-0">The Klarna journey is complete. A session token is available for final authorization.</p>
                  </div>
                </div>

                {/* Architecture Flow Diagram */}
                <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Authorization Flow</div>
                  <div className="flex items-center justify-between gap-1">
                    {/* Sub-partner */}
                    <div className="flex-1 text-center">
                      <div className="bg-blue-100 border border-blue-300 rounded px-2 py-1.5 mb-1">
                        <div className="text-[10px] font-bold text-blue-800">Sub-partner</div>
                        <div className="text-[9px] text-blue-600">Has session token</div>
                      </div>
                      <div className="text-[9px] text-gray-400 font-mono">subpartner_api_key</div>
                    </div>
                    {/* Arrow */}
                    <div className="flex flex-col items-center px-1">
                      <div className="text-[9px] text-gray-400 mb-0.5">forwards token</div>
                      <svg className="w-6 h-3 text-gray-400" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M0 6h20M16 2l4 4-4 4" />
                      </svg>
                    </div>
                    {/* AP Backend */}
                    <div className="flex-1 text-center">
                      <div className="bg-amber-100 border border-amber-300 rounded px-2 py-1.5 mb-1">
                        <div className="text-[10px] font-bold text-amber-800">AP Backend</div>
                        <div className="text-[9px] text-amber-600">Calls authorize</div>
                      </div>
                      <div className="text-[9px] text-gray-400 font-mono">acquiring_partner_api_key</div>
                    </div>
                    {/* Arrow */}
                    <div className="flex flex-col items-center px-1">
                      <div className="text-[9px] text-gray-400 mb-0.5">mTLS + token</div>
                      <svg className="w-6 h-3 text-gray-400" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M0 6h20M16 2l4 4-4 4" />
                      </svg>
                    </div>
                    {/* Klarna API */}
                    <div className="flex-1 text-center">
                      <div className="bg-pink-100 border border-pink-300 rounded px-2 py-1.5 mb-1">
                        <div className="text-[10px] font-bold text-pink-800">Klarna API</div>
                        <div className="text-[9px] text-pink-600">Final authorization</div>
                      </div>
                      <div className="text-[9px] text-gray-400 font-mono">APPROVED / DECLINED</div>
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 mb-4 text-xs text-blue-800 leading-relaxed">
                  <strong>What happened:</strong> The customer completed the Klarna checkout experience. The SDK&apos;s <code className="bg-blue-100/70 px-1 py-0.5 rounded text-[11px] font-mono">complete</code> event returned a <code className="bg-blue-100/70 px-1 py-0.5 rounded text-[11px] font-mono">klarna_network_session_token</code>. The sub-partner now forwards this token to the Acquiring Partner, who performs the final authorization using their own API key and mTLS credentials.
                </div>

                {/* Token Display */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 mb-1.5">Network Session Token</div>
                  <div className="bg-gray-900 rounded p-3 overflow-x-auto">
                    <code className="text-[11px] font-mono text-green-400 break-all leading-relaxed">
                      {pendingSessionToken}
                    </code>
                  </div>
                </div>

                {/* Return URL Display */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 mb-1.5">Return URL (with token)</div>
                  <div className="bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto">
                    <code className="text-[11px] font-mono text-gray-600 break-all leading-relaxed">
                      {currentOrigin}/server-side?status=complete&klarna_network_session_token=<span className="text-amber-600">{pendingSessionToken.substring(0, 20)}...</span>
                    </code>
                  </div>
                </div>

                {/* Next Step */}
                <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-4 text-xs text-amber-800 leading-relaxed">
                  <strong>Next step:</strong> The Acquiring Partner calls <code className="bg-amber-100/70 px-1 py-0.5 rounded text-[11px] font-mono">POST /payment/authorize</code> with their <code className="bg-amber-100/70 px-1 py-0.5 rounded text-[11px] font-mono">acquiring_partner_api_key</code> and the <code className="bg-amber-100/70 px-1 py-0.5 rounded text-[11px] font-mono">Klarna-Network-Session-Token</code> header. This final authorization returns the <code className="bg-amber-100/70 px-1 py-0.5 rounded text-[11px] font-mono">paymentTransactionId</code> needed to confirm the order.
                </div>

                {/* Authorize Button */}
                <button
                  onClick={handleFinalAuthorize}
                  className="w-full bg-gray-900 text-white px-5 py-3 rounded text-sm font-bold hover:bg-gray-800 border-none cursor-pointer"
                >
                  Call Final Authorization (AP Credentials)
                </button>
                <div className="text-[11px] text-gray-400 text-center mt-1.5">
                  POST /v2/accounts/{'{'}partnerAccountId{'}'}/payment/authorize with session token header
                </div>
              </div>
            ) : flowState === 'COMPLETING' && !pendingSessionToken ? (
              /* ---- Completing: Final auth in progress ---- */
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-4" />
                <div className="text-sm font-medium text-gray-700">Completing Authorization...</div>
                <div className="text-xs text-gray-500 mt-1">Calling final authorization endpoint</div>
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

                {/* On-Site Messaging — above payment methods */}
                <div
                  id="klarna-osm-placement"
                  style={{ width: '100%', marginBottom: '12px' }}
                />

                {/* Payment Method */}
                <div className="mb-2">
                  <div className="text-xs font-medium text-gray-500 mb-2">Payment Method</div>

                  {/* Credit Card option */}
                  <div
                    className={`p-3 rounded border-2 mb-2 cursor-pointer transition-colors ${
                      selectedPaymentMethod === 'credit_card'
                        ? 'bg-gray-50 border-gray-400'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => flowState === 'READY' && handlePaymentMethodSelect('credit_card')}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedPaymentMethod === 'credit_card' ? 'border-gray-600 bg-gray-600' : 'border-gray-300'
                      }`}>
                        {selectedPaymentMethod === 'credit_card' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <span className={`text-sm ${selectedPaymentMethod === 'credit_card' ? 'font-medium text-gray-900' : 'text-gray-500'}`}>Credit Card</span>
                      <div className="ml-auto flex gap-1">
                        <div className="bg-[#1A1F71] text-white text-[8px] font-bold px-1.5 py-0.5 rounded">VISA</div>
                        <div className="bg-[#EB001B] text-white text-[8px] font-bold px-1.5 py-0.5 rounded">MC</div>
                      </div>
                    </div>
                  </div>

                  {/* Klarna option — uses SDK sub-components */}
                  {presentationInfo?.instruction !== 'HIDE_KLARNA' && (
                    <div
                      className={`p-3 rounded border-2 cursor-pointer transition-colors ${
                        selectedPaymentMethod === 'klarna'
                          ? 'bg-pink-50 border-pink-300'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => flowState === 'READY' && handlePaymentMethodSelect('klarna')}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selectedPaymentMethod === 'klarna' ? 'border-pink-400 bg-pink-400' : 'border-gray-300'
                        }`}>
                          {selectedPaymentMethod === 'klarna' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* SDK header — bold, primary */}
                          <div ref={headerMountRef} className="text-sm font-semibold text-gray-900" />
                          {/* SDK subheader.short — dimmed, smaller */}
                          <div ref={subheaderMountRef} className="text-xs text-gray-500 leading-snug" />
                        </div>
                        {/* SDK icon — right-aligned, sized to match VISA+MC badges above */}
                        <div ref={iconMountRef} className="shrink-0 ml-auto" style={{ width: 56, height: 22 }} />
                      </div>
                      {/* SDK subheader.enriched (message) — body text, only when selected */}
                      <div
                        ref={messageMountRef}
                        style={{ display: selectedPaymentMethod === 'klarna' ? 'block' : 'none' }}
                        className="mt-2 ml-6 text-sm text-gray-700 leading-relaxed"
                      />
                    </div>
                  )}
                </div>

                {/* Flow Status */}
                {errorMessage && (
                  <div className="text-red-500 text-xs mb-2">{errorMessage}</div>
                )}
                {(flowState === 'INITIALIZING' || flowState === 'AUTHORIZING' || flowState === 'COMPLETING') && (
                  <div className="text-xs text-blue-500 mb-2">
                    {flowState === 'INITIALIZING' ? 'Loading Klarna SDK...' : flowState === 'AUTHORIZING' ? 'Creating payment request...' : 'Completing payment...'}
                  </div>
                )}
                {flowState === 'STEP_UP' && (
                  <div className="text-xs text-purple-600 mb-2">Customer in Klarna journey...</div>
                )}

                {/* Bottom Button Area */}
                <div className="mt-4 flex justify-center">
                  {/* SDK payment button mount target — right-aligned, hidden when inactive */}
                  <div
                    ref={bottomButtonWrapperRef}
                    style={{
                      display: selectedPaymentMethod === 'klarna' ? 'block' : 'none',
                    }}
                  />
                  {/* Fallback buttons when Klarna button is not shown */}
                  {selectedPaymentMethod === 'credit_card' && (
                    <button
                      disabled
                      className="w-full bg-gray-300 text-gray-500 px-5 py-3 rounded text-sm font-bold border-none cursor-not-allowed"
                    >
                      Pay with Credit Card
                    </button>
                  )}
                  {!selectedPaymentMethod && flowState === 'READY' && (
                    <button
                      disabled
                      className="w-full bg-gray-200 text-gray-400 px-5 py-3 rounded text-sm font-bold border-none cursor-not-allowed"
                    >
                      Select a payment method
                    </button>
                  )}
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
                {event.data !== undefined && event.data !== null && (() => {
                  const d = event.data as { body?: unknown; headers?: Record<string, string> };
                  const isApiEvent = event.source === 'api' && d && typeof d === 'object' && 'body' in d;
                  return isApiEvent ? (
                    <>
                      {d.headers && Object.keys(d.headers).length > 0 && (
                        <details className="my-2">
                          <summary className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700">
                            Headers ({Object.keys(d.headers).length})
                          </summary>
                          <div className="bg-gray-50 border border-gray-200 rounded p-2 mt-1 font-mono text-[11px] leading-relaxed overflow-x-auto">
                            {Object.entries(d.headers).map(([k, v]) => (
                              <div key={k} className="flex gap-2">
                                <span className="text-gray-500 shrink-0">{k}:</span>
                                <span className="text-gray-800 break-all">{v}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                      {d.body !== undefined && d.body !== null && (
                        <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-[11px] overflow-x-auto my-2 max-h-[300px] overflow-y-auto break-words">{JSON.stringify(d.body, null, 2)}</pre>
                      )}
                    </>
                  ) : (
                    <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-[11px] overflow-x-auto my-2 max-h-[300px] overflow-y-auto break-words">{JSON.stringify(event.data, null, 2)}</pre>
                  );
                })()}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
