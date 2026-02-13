'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

type FlowState = 'IDLE' | 'INITIALIZING' | 'READY' | 'PROCESSING' | 'COMPLETING' | 'SUCCESS' | 'ERROR';

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

const COUNTRY_MAPPING: Record<string, { name: string; currency: string; locales: string[] }> = {
  AT: { name: 'Austria', currency: 'EUR', locales: ['de-AT', 'en-AT'] },
  AU: { name: 'Australia', currency: 'AUD', locales: ['en-AU'] },
  BE: { name: 'Belgium', currency: 'EUR', locales: ['fr-BE', 'nl-BE', 'en-BE'] },
  CA: { name: 'Canada', currency: 'CAD', locales: ['en-CA', 'fr-CA'] },
  CH: { name: 'Switzerland', currency: 'CHF', locales: ['de-CH', 'fr-CH', 'it-CH', 'en-CH'] },
  CZ: { name: 'Czech Republic', currency: 'CZK', locales: ['cs-CZ', 'en-CZ'] },
  DE: { name: 'Germany', currency: 'EUR', locales: ['de-DE', 'en-DE'] },
  DK: { name: 'Denmark', currency: 'DKK', locales: ['da-DK', 'en-DK'] },
  ES: { name: 'Spain', currency: 'EUR', locales: ['es-ES', 'en-ES'] },
  FI: { name: 'Finland', currency: 'EUR', locales: ['fi-FI', 'en-FI'] },
  FR: { name: 'France', currency: 'EUR', locales: ['fr-FR', 'en-FR'] },
  GB: { name: 'United Kingdom', currency: 'GBP', locales: ['en-GB'] },
  GR: { name: 'Greece', currency: 'EUR', locales: ['el-GR', 'en-GR'] },
  HU: { name: 'Hungary', currency: 'HUF', locales: ['hu-HU', 'en-HU'] },
  IE: { name: 'Ireland', currency: 'EUR', locales: ['en-IE'] },
  IT: { name: 'Italy', currency: 'EUR', locales: ['it-IT', 'en-IT'] },
  MX: { name: 'Mexico', currency: 'MXN', locales: ['es-MX', 'en-MX'] },
  NL: { name: 'Netherlands', currency: 'EUR', locales: ['nl-NL', 'en-NL'] },
  NO: { name: 'Norway', currency: 'NOK', locales: ['nb-NO', 'en-NO'] },
  NZ: { name: 'New Zealand', currency: 'NZD', locales: ['en-NZ'] },
  PL: { name: 'Poland', currency: 'PLN', locales: ['pl-PL', 'en-PL'] },
  PT: { name: 'Portugal', currency: 'EUR', locales: ['pt-PT', 'en-PT'] },
  RO: { name: 'Romania', currency: 'RON', locales: ['ro-RO', 'en-RO'] },
  SE: { name: 'Sweden', currency: 'SEK', locales: ['sv-SE', 'en-SE'] },
  SK: { name: 'Slovakia', currency: 'EUR', locales: ['sk-SK', 'en-SK'] },
  US: { name: 'United States', currency: 'USD', locales: ['en-US'] },
};

const COUNTRY_CODES = Object.keys(COUNTRY_MAPPING).sort();

// Default Client ID for testing (same as ap-hosted)
const DEFAULT_CLIENT_ID = 'klarna_test_client_SyVDdUcvcTQhQjUkVEhyRFgzWFhxRU4xRHdjZVE4UTUsMmVkZGVlNzMtNGIyMy00MzQyLTgxZmItYWEzMzFkYWM1OTU2LDEsVXhrQ3N5UzNQbVJ5UkdJS1VKeHV0MDg5RDUyOUVCTE94ck8yaVpjVXRPWT0';

// Default Partner Account ID for testing
const DEFAULT_PARTNER_ACCOUNT_ID = 'krn:partner:global:account:test:MKPMV6MS';

// localStorage key for event log persistence
const EVENT_LOG_STORAGE_KEY = 'klarna-express-checkout-event-log';

const inputClasses = 'w-full border border-gray-300 rounded px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-400';

const PRODUCT_CATALOG: CatalogItem[] = [
  { id: 'tshirt', name: 'T-Shirt', unitPrice: 2999, description: 'Cotton crew neck' },
  { id: 'shoes', name: 'Running Shoes', unitPrice: 8999, description: 'Lightweight trainers' },
  { id: 'earbuds', name: 'Wireless Earbuds', unitPrice: 4999, description: 'Bluetooth 5.0' },
  { id: 'wallet', name: 'Leather Wallet', unitPrice: 3499, description: 'Genuine leather' },
  { id: 'bottle', name: 'Water Bottle', unitPrice: 1499, description: 'Insulated 32oz' },
];

const TAX_RATE = 0.08;

const SHIPPING_OPTIONS = [
  { shippingOptionReference: 'standard', displayName: 'Standard Shipping', amount: 499, description: '5-7 business days', shippingType: 'TO_DOOR' as const },
  { shippingOptionReference: 'express', displayName: 'Express Shipping', amount: 999, description: '2-3 business days', shippingType: 'TO_DOOR' as const },
  { shippingOptionReference: 'next-day', displayName: 'Next Day Delivery', amount: 1499, description: 'Next business day', shippingType: 'TO_DOOR' as const },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function formatAmount(amountInMinorUnits: number, currency: string): string {
  const zeroDPCurrencies = ['JPY', 'KRW', 'VND', 'CLP', 'ISK'];
  const divisor = zeroDPCurrencies.includes(currency) ? 1 : 100;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(amountInMinorUnits / divisor);
}

// Load event log from localStorage
function loadEventLogFromStorage(): EventLogItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(EVENT_LOG_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
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
  if (typeof window === 'undefined') return;
  try {
    const serialized = eventLog.map(item => ({
      ...item,
      timestamp: item.timestamp.toISOString(),
    }));
    localStorage.setItem(EVENT_LOG_STORAGE_KEY, JSON.stringify(serialized));
  } catch (error) {
    console.error('Failed to save event log to localStorage:', error);
  }
}

// Build default payment request data JSON
function buildDefaultPaymentRequestData(
  currency: string,
  totalAmount: number,
  lineItems: { name: string; quantity: number; totalAmount: number; unitPrice: number }[],
  country: string,
): string {
  return JSON.stringify({
    currency,
    amount: totalAmount,
    paymentRequestReference: 'Auto-generated on button click',
    supplementaryPurchaseData: {
      purchaseReference: 'Auto-generated on button click',
      lineItems,
    },
    shippingConfig: {
      mode: 'EDITABLE',
      supportedCountries: [country],
    },
    customerInteractionConfig: {
      returnUrl: 'https://klarna.com/example-redirect?payref={klarna.payment_request.payment_reference}',
    },
  }, null, 2);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ExpressCheckoutPage() {
  // Client-side mount tracking (for hydration safety)
  const [isMounted, setIsMounted] = useState(false);

  // Configuration State
  const [clientId, setClientId] = useState(DEFAULT_CLIENT_ID);
  const [partnerAccountId, setPartnerAccountId] = useState(DEFAULT_PARTNER_ACCOUNT_ID);
  const [sdkToken, setSdkToken] = useState('');
  const [country, setCountry] = useState('US');
  const [locale, setLocale] = useState('en-US');

  // Flow State
  const [flowState, setFlowState] = useState<FlowState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentTransaction, setPaymentTransaction] = useState<AuthorizeResponse['data'] | null>(null);

  // Event Log
  const [eventLog, setEventLog] = useState<EventLogItem[]>([]);

  // Payment Request Data (JSON editor)
  const [paymentRequestDataJson, setPaymentRequestDataJson] = useState('');
  const paymentRequestDataJsonRef = useRef('');

  // Cart State
  const [cartItems, setCartItems] = useState<CartItem[]>([
    { catalogItem: PRODUCT_CATALOG[0], quantity: 2 },
    { catalogItem: PRODUCT_CATALOG[1], quantity: 1 },
  ]);

  // Derived values
  const countryConfig = COUNTRY_MAPPING[country];
  const currency = countryConfig.currency;
  const availableLocales = countryConfig.locales;

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

  const availableCatalogItems = useMemo(() =>
    PRODUCT_CATALOG.filter(item => !cartItems.some(ci => ci.catalogItem.id === item.id)), [cartItems]);

  // Refs
  const buttonMountRef = useRef<HTMLDivElement>(null);
  const sdkInitializedRef = useRef(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mountedButtonRef = useRef<any>(null);
  const sdkMountIdRef = useRef<string>('klarna-express-mount');
  const finalAuthInProgressRef = useRef(false);
  const cartTotalRef = useRef(cartTotal);
  const allLineItemsRef = useRef(allLineItems);

  // ============================================================================
  // CART MANIPULATION
  // ============================================================================

  const addToCart = useCallback((catalogItem: CatalogItem) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.catalogItem.id === catalogItem.id);
      if (existing) {
        return prev.map(item =>
          item.catalogItem.id === catalogItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { catalogItem, quantity: 1 }];
    });
  }, []);

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
    klarnaNetworkSessionToken: string,
  ): Promise<AuthorizeResponse> => {
    const response = await fetch('/api/payment/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerAccountId,
        currency: COUNTRY_MAPPING[country].currency,
        amount: cartTotalRef.current,
        paymentTransactionReference: `tx_${Date.now()}_${generateId()}`,
        paymentRequestReference: `pr_${Date.now()}_${generateId()}`,
        returnUrl: `${window.location.origin}/express-checkout`,
        klarnaNetworkSessionToken,
        supplementaryPurchaseData: {
          purchaseReference: `purchase_${Date.now()}`,
          lineItems: allLineItemsRef.current,
        },
      }),
    });

    return response.json();
  }, [partnerAccountId, country]);

  // ============================================================================
  // INITIATE CALLBACK (called when Klarna button is clicked)
  // ============================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInitiate = useCallback(async (): Promise<any> => {
    logEvent('Button Clicked - Initiating Payment', 'info', undefined, 'flow');
    setFlowState('PROCESSING');
    setErrorMessage(null);

    try {
      const data = JSON.parse(paymentRequestDataJsonRef.current);

      // Auto-generate references
      if (!data.paymentRequestReference || data.paymentRequestReference.includes('Auto-generated')) {
        data.paymentRequestReference = `pr_${Date.now()}_${generateId()}`;
      }
      if (data.supplementaryPurchaseData?.purchaseReference?.includes('Auto-generated')) {
        data.supplementaryPurchaseData.purchaseReference = `purchase_${Date.now()}`;
      }

      logEvent('Payment Request Data', 'info', data, 'flow');
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Invalid JSON';
      setFlowState('ERROR');
      setErrorMessage(msg);
      logEvent('Invalid Payment Request Data', 'error', { error: msg }, 'flow');
      throw new Error(msg);
    }
  }, [logEvent]);

  // ============================================================================
  // SDK MOUNT HELPERS
  // ============================================================================

  const clearSdkMount = useCallback(() => {
    if (mountedButtonRef.current) {
      try {
        if (typeof mountedButtonRef.current.unmount === 'function') {
          mountedButtonRef.current.unmount();
        }
      } catch {
        // Ignore unmount errors
      }
      mountedButtonRef.current = null;
    }
    const existingMount = document.getElementById(sdkMountIdRef.current);
    if (existingMount && existingMount.parentNode) {
      existingMount.parentNode.removeChild(existingMount);
    }
  }, []);

  // ============================================================================
  // SDK INITIALIZATION
  // ============================================================================

  const initializeSDK = useCallback(async () => {
    if (!clientId.trim()) {
      setErrorMessage('Client ID is required');
      setFlowState('ERROR');
      return;
    }

    setFlowState('INITIALIZING');
    setErrorMessage(null);
    logEvent('Initializing Klarna SDK', 'info', {
      clientId: clientId.substring(0, 30) + '...',
      country,
      locale,
      hasPartnerAccountId: !!partnerAccountId.trim(),
      hasSdkToken: !!sdkToken.trim(),
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

      // Initialize SDK
      const sdkConfig: Record<string, unknown> = {
        clientId: clientId.trim(),
        products: ['PAYMENT'],
      };
      if (partnerAccountId.trim()) {
        sdkConfig.partnerAccountId = partnerAccountId.trim();
      }
      if (sdkToken.trim()) {
        sdkConfig.sdkToken = sdkToken.trim();
      }

      const klarnaInstance: KlarnaSDKType = await KlarnaSDK(sdkConfig);
      logEvent('SDK Initialized Successfully', 'success', undefined, 'sdk');

      // Expose to window for debugging
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).klarna = klarnaInstance;
      }

      // ------------------------------------------------------------------
      // Attach event handlers
      // ------------------------------------------------------------------

      // Complete
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      klarnaInstance.Payment.on('complete', async (paymentRequest: any) => {
        // Deduplicate: SDK may fire 'complete' twice
        if (finalAuthInProgressRef.current) {
          logEvent('Duplicate Complete Event (ignored)', 'warning', undefined, 'sdk');
          return false;
        }
        finalAuthInProgressRef.current = true;

        logEvent('Payment Complete Event', 'success', {
          paymentRequestId: paymentRequest.paymentRequestId,
          state: paymentRequest.state,
          stateContext: paymentRequest.stateContext,
        }, 'sdk');

        // Extract session token for final authorization
        const sessionToken = paymentRequest.stateContext?.klarnaNetworkSessionToken ||
                            paymentRequest.stateContext?.klarna_network_session_token;

        if (sessionToken) {
          setFlowState('COMPLETING');
          const authPath = `POST /v2/accounts/${partnerAccountId}/payment/authorize`;

          try {
            const finalResult = await authorizePayment(sessionToken);

            logEvent('Final Authorization Request', 'info', { body: finalResult.rawKlarnaRequest, headers: finalResult.requestHeaders }, 'api', 'request', authPath);
            logEvent('Final Authorization Response', finalResult.success ? 'success' : 'error', { body: finalResult.rawKlarnaResponse, headers: finalResult.responseHeaders }, 'api', 'response', authPath);

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
        } else {
          setFlowState('ERROR');
          setErrorMessage('No session token received from Klarna');
          logEvent('Missing Session Token', 'error', { stateContext: paymentRequest.stateContext }, 'flow');
        }

        return false;
      });

      // Abort
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      klarnaInstance.Payment.on('abort', (paymentRequest: any) => {
        logEvent('Payment Aborted', 'warning', {
          state: paymentRequest.state,
          stateReason: paymentRequest.stateReason,
        }, 'sdk');
        setFlowState('READY');
        setErrorMessage('Payment was cancelled');

        if (paymentRequest.state === 'SUBMITTED' && paymentRequest.paymentRequestId) {
          klarnaInstance.Payment.cancel(paymentRequest.paymentRequestId);
        }
      });

      // Error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      klarnaInstance.Payment.on('error', (error: any, paymentRequest: any) => {
        logEvent('Payment Error', 'error', { error, paymentRequest }, 'sdk');
        setFlowState('ERROR');
        setErrorMessage(error?.message || 'An error occurred');
      });

      // Shipping address change
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      klarnaInstance.Payment.on('shippingaddresschange', (_paymentRequest: any, _shippingAddressChange: any) => {
        const baseAmount = cartTotalRef.current;
        const defaultShipping = SHIPPING_OPTIONS[0];

        logEvent('Shipping Address Changed', 'info', {
          shippingOptions: SHIPPING_OPTIONS.map(o => o.displayName),
          selectedDefault: defaultShipping.displayName,
        }, 'sdk');

        return {
          amount: baseAmount + defaultShipping.amount,
          selectedShippingOptionReference: defaultShipping.shippingOptionReference,
          shippingOptions: SHIPPING_OPTIONS.map(opt => ({
            shippingOptionReference: opt.shippingOptionReference,
            amount: opt.amount,
            displayName: opt.displayName,
            description: opt.description,
            shippingType: opt.shippingType,
          })),
        };
      });

      // Shipping option selected
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      klarnaInstance.Payment.on('shippingoptionselect', (_paymentRequest: any, shippingOptionSelect: any) => {
        const selectedOption = SHIPPING_OPTIONS.find(
          opt => opt.shippingOptionReference === shippingOptionSelect.shippingOptionReference
        );
        const shippingCost = selectedOption?.amount || SHIPPING_OPTIONS[0].amount;

        logEvent('Shipping Option Selected', 'info', {
          selected: selectedOption?.displayName || 'Unknown',
          shippingCost,
          totalAmount: cartTotalRef.current + shippingCost,
        }, 'sdk');

        return {
          amount: cartTotalRef.current + shippingCost,
        };
      });

      // ------------------------------------------------------------------
      // Mount button directly via Payment.button()
      // ------------------------------------------------------------------

      if (!buttonMountRef.current) {
        throw new Error('Button mount target not found');
      }

      clearSdkMount();

      sdkMountIdRef.current = `klarna-express-mount-${Date.now()}`;
      const mountTarget = document.createElement('div');
      mountTarget.id = sdkMountIdRef.current;
      mountTarget.style.cssText = 'width: 100%;';
      buttonMountRef.current.appendChild(mountTarget);

      const buttonInstance = klarnaInstance.Payment.button({
        shape: 'rect',
        theme: 'default',
        locale,
        initiationMode: 'DEVICE_BEST',
        initiate: handleInitiate,
      }).mount(mountTarget);

      mountedButtonRef.current = buttonInstance;
      sdkInitializedRef.current = true;

      logEvent('Express Button Mounted', 'success', { locale, country }, 'sdk');
      setFlowState('READY');

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setFlowState('ERROR');
      setErrorMessage(`SDK initialization failed: ${message}`);
      logEvent('SDK Initialization Error', 'error', { error: message }, 'sdk');
    }
  }, [clientId, partnerAccountId, sdkToken, country, locale, handleInitiate, authorizePayment, logEvent, clearSdkMount]);

  // ============================================================================
  // RESET FLOW
  // ============================================================================

  const resetFlow = useCallback(() => {
    setFlowState('IDLE');
    setErrorMessage(null);
    setPaymentTransaction(null);
    sdkInitializedRef.current = false;
    finalAuthInProgressRef.current = false;
    clearSdkMount();
    setCartItems([
      { catalogItem: PRODUCT_CATALOG[0], quantity: 2 },
      { catalogItem: PRODUCT_CATALOG[1], quantity: 1 },
    ]);
    logEvent('Flow Reset', 'info', undefined, 'flow');
  }, [logEvent, clearSdkMount]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Sync refs with state
  useEffect(() => {
    paymentRequestDataJsonRef.current = paymentRequestDataJson;
  }, [paymentRequestDataJson]);

  useEffect(() => {
    cartTotalRef.current = cartTotal;
  }, [cartTotal]);

  useEffect(() => {
    allLineItemsRef.current = allLineItems;
  }, [allLineItems]);

  // Auto-select first locale when country changes
  useEffect(() => {
    const config = COUNTRY_MAPPING[country];
    if (config && !config.locales.includes(locale)) {
      setLocale(config.locales[0]);
    }
  }, [country, locale]);

  // Auto-regenerate paymentRequestDataJson when cart/country changes (while idle/error)
  useEffect(() => {
    if (flowState !== 'IDLE' && flowState !== 'ERROR') return;
    setPaymentRequestDataJson(
      buildDefaultPaymentRequestData(currency, cartTotal, allLineItems, country)
    );
  }, [cartTotal, allLineItems, currency, country, flowState]);

  // Initialize client-side state after mount
  useEffect(() => {
    setIsMounted(true);
    sdkMountIdRef.current = `klarna-express-mount-${Date.now()}`;
    const storedEvents = loadEventLogFromStorage();
    if (storedEvents.length > 0) {
      setEventLog(storedEvents);
    }
  }, []);

  // Save event log to localStorage whenever it changes
  useEffect(() => {
    saveEventLogToStorage(eventLog);
  }, [eventLog]);

  // Cleanup SDK mount on unmount
  useEffect(() => {
    return () => {
      if (mountedButtonRef.current) {
        try {
          if (typeof mountedButtonRef.current.unmount === 'function') {
            mountedButtonRef.current.unmount();
          }
        } catch {
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
  // RENDER
  // ============================================================================

  if (!isMounted) {
    return <div className="min-h-[calc(100vh-57px)] bg-gray-50" />;
  }

  return (
    <div className="min-h-[calc(100vh-57px)] bg-gray-50 p-5 max-w-[1400px] mx-auto">
      {/* Main Layout */}
      <div className="flex flex-col md:flex-row gap-5 mb-5">
        {/* ================================================================
            LEFT PANEL - Configuration
            ================================================================ */}
        <div className="flex-1 min-w-0 md:min-w-[300px]">
          <div className="bg-white border border-gray-200 rounded p-4">
            <h3 className="text-base font-bold text-gray-900 mt-0 mb-1.5">Configuration</h3>
            <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 mb-3 text-xs flex items-start gap-2 text-blue-700 leading-relaxed">
              <InformationCircleIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div>
                Express Checkout uses <code className="bg-blue-100/70 px-1 py-0.5 rounded text-[11px] font-mono">Payment.button()</code> to
                mount a Klarna payment button directly — no presentation step or payment method selector needed.
              </div>
            </div>

            {/* ---- SDK Configuration ---- */}
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">SDK Configuration</div>

            <div className="grid gap-1.5 mb-2.5">
              <label htmlFor="partner-account-id" className="text-xs font-medium text-gray-500">
                Partner Account ID <span className="text-gray-400">(optional)</span>
              </label>
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
              <label htmlFor="client-id" className="text-xs font-medium text-gray-500">Client ID *</label>
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
              <label htmlFor="sdk-token" className="text-xs font-medium text-gray-500">
                SDK Token <span className="text-gray-400">(optional)</span>
              </label>
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

            <div className="border-t border-gray-200 my-3" />

            {/* ---- Purchase Configuration ---- */}
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Purchase Configuration</div>

            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
              <div className="grid gap-1.5">
                <label htmlFor="country" className="text-xs font-medium text-gray-500">Country</label>
                <select
                  id="country"
                  className={inputClasses}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={flowState !== 'IDLE' && flowState !== 'ERROR'}
                >
                  {COUNTRY_CODES.map(code => (
                    <option key={code} value={code}>
                      {code} — {COUNTRY_MAPPING[code].name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1.5">
                <label htmlFor="locale" className="text-xs font-medium text-gray-500">Locale</label>
                <select
                  id="locale"
                  className={inputClasses}
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  disabled={flowState !== 'IDLE' && flowState !== 'ERROR'}
                >
                  {availableLocales.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs text-gray-500">Cart Total:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-800">
                {formatAmount(cartTotal, currency)}
                <span className="text-[10px] text-gray-500">{currency}</span>
              </span>
            </div>

            <div className="border-t border-gray-200 my-3" />

            {/* ---- Payment Request Data ---- */}
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Payment Request Data</div>

            <div className="grid gap-1.5 mb-2.5">
              <textarea
                className={`${inputClasses} min-h-[200px] font-mono text-xs resize-y`}
                value={paymentRequestDataJson}
                onChange={(e) => setPaymentRequestDataJson(e.target.value)}
                placeholder="Enter payment request data as JSON..."
              />
              <div className="text-xs text-gray-500 break-words">
                Auto-generated from cart and country. Edit directly — references are auto-generated on button click.
              </div>
            </div>

            {/* ---- Actions ---- */}
            <div className="flex gap-2.5 mt-4">
              {flowState === 'IDLE' || flowState === 'ERROR' ? (
                <button
                  onClick={initializeSDK}
                  disabled={cartItems.length === 0}
                  className="bg-gray-900 text-white px-5 py-3 rounded text-sm font-bold hover:bg-gray-800 border-none cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Initialize &amp; Show Button
                </button>
              ) : (
                <button
                  disabled
                  className="bg-gray-300 text-white px-5 py-3 rounded text-sm font-bold border-none cursor-not-allowed"
                >
                  {flowState === 'INITIALIZING' ? 'Initializing...' : flowState === 'SUCCESS' ? 'Payment Complete' : flowState === 'COMPLETING' ? 'Authorizing...' : 'Processing...'}
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

        {/* ================================================================
            RIGHT PANEL - Mock Checkout
            ================================================================ */}
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
                      <div className="text-xs text-gray-500">Transaction Reference <span className="text-gray-400 italic">— Provided by the partner</span></div>
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
                    Amount charged: <span className="font-bold">{formatAmount(paymentTransaction.paymentTransaction.amount, paymentTransaction.paymentTransaction.currency)}</span>
                  </div>

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
                          <div className="text-xs text-gray-500">{formatAmount(item.catalogItem.unitPrice, currency)} each</div>
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
                        <div className="text-sm font-medium text-gray-900 w-20 text-right">
                          {formatAmount(item.catalogItem.unitPrice * item.quantity, currency)}
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

                  {/* Add Products */}
                  {!cartLocked && availableCatalogItems.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {availableCatalogItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => addToCart(item)}
                          className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 bg-white cursor-pointer"
                        >
                          + {item.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className="border-t border-gray-200 pt-2 mb-4 space-y-1 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatAmount(cartSubtotal, currency)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Tax (8%)</span>
                      <span>{formatAmount(cartTax, currency)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                      <span>Total</span>
                      <span>{formatAmount(cartTotal, currency)}</span>
                    </div>
                  </div>

                  {/* Flow Status */}
                  {errorMessage && (
                    <div className="text-red-500 text-xs mb-2">{errorMessage}</div>
                  )}
                  {(flowState === 'INITIALIZING' || flowState === 'PROCESSING' || flowState === 'COMPLETING') && (
                    <div className="text-xs text-blue-500 mb-2">
                      {flowState === 'INITIALIZING' ? 'Loading Klarna SDK...' : flowState === 'COMPLETING' ? 'Completing authorization...' : 'Processing payment...'}
                    </div>
                  )}

                  {/* Express Button Mount Area */}
                  <div className="mt-4">
                    <div ref={buttonMountRef} style={{ width: '100%' }} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================
          BOTTOM - Event Log
          ================================================================ */}
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
                  {event.type === 'error' && '\u2717 '}
                  {event.type === 'success' && '\u2713 '}
                  {event.type === 'warning' && '\u26A0 '}
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
                    <pre className="bg-gray-50 border border-gray-200 rounded p-3 text-[11px] overflow-x-auto my-2 max-h-[300px] overflow-y-auto break-words">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
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
