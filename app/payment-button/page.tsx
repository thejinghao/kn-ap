'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './page.module.css';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface CountryConfig {
  currency: string;
  locales: string[];
}

interface EventLogItem {
  id: string;
  title: string;
  timestamp: Date;
  data: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KlarnaSDKInstance = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KlarnaButton = any;

// ============================================================================
// CONSTANTS & MAPPINGS
// ============================================================================

const COUNTRY_MAPPING: Record<string, CountryConfig> = {
  AU: { currency: "AUD", locales: ["en-AU"] },
  AT: { currency: "EUR", locales: ["de-AT", "en-AT"] },
  BE: { currency: "EUR", locales: ["nl-BE", "fr-BE", "en-BE"] },
  CA: { currency: "CAD", locales: ["en-CA", "fr-CA"] },
  CZ: { currency: "CZK", locales: ["cs-CZ", "en-CZ"] },
  DK: { currency: "DKK", locales: ["da-DK", "en-DK"] },
  FI: { currency: "EUR", locales: ["fi-FI", "sv-FI", "en-FI"] },
  FR: { currency: "EUR", locales: ["fr-FR", "en-FR"] },
  DE: { currency: "EUR", locales: ["de-DE", "en-DE"] },
  GR: { currency: "EUR", locales: ["el-GR", "en-GR"] },
  HU: { currency: "HUF", locales: ["hu-HU", "en-HU"] },
  IE: { currency: "EUR", locales: ["en-IE"] },
  IT: { currency: "EUR", locales: ["it-IT", "en-IT"] },
  MX: { currency: "MXN", locales: ["en-MX", "es-MX"] },
  NL: { currency: "EUR", locales: ["nl-NL", "en-NL"] },
  NZ: { currency: "NZD", locales: ["en-NZ"] },
  NO: { currency: "NOK", locales: ["nb-NO", "en-NO"] },
  PL: { currency: "PLN", locales: ["pl-PL", "en-PL"] },
  PT: { currency: "EUR", locales: ["pt-PT", "en-PT"] },
  RO: { currency: "RON", locales: ["ro-RO", "en-RO"] },
  SK: { currency: "EUR", locales: ["sk-SK", "en-SK"] },
  ES: { currency: "EUR", locales: ["es-ES", "en-ES"] },
  SE: { currency: "SEK", locales: ["sv-SE", "en-SE"] },
  CH: { currency: "CHF", locales: ["de-CH", "fr-CH", "it-CH", "en-CH"] },
  GB: { currency: "GBP", locales: ["en-GB"] },
  US: { currency: "USD", locales: ["en-US", "es-US"] }
};

const VALID_INTENT_COMBINATIONS = [
  "PAY",
  "DONATE",
  "SUBSCRIBE",
  "SIGNUP",
  "SIGNIN",
  "ADD_TO_WALLET",
  "ADD_TO_WALLET,PAY",
  "PAY,SIGNIN",
  "PAY,SUBSCRIBE",
  "DONATE,SIGNIN"
];

const DEFAULT_CLIENT_ID = "klarna_test_client_d3RNYU5lcjVaTnloIzhMTEFDUldEWktWUi9ULz9YODcsNjA1M2EzMjgtNmY5MS00NjU3LWE1ODEtNGRiNmM0NzQ0NDNmLDEsOWh5YU9vcXU2dmpGaklGOU9wa3hpcitjY3Z5cnIxY0ZrY21XQUVFSHNKcz0";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateReference(prefix: string): string {
  return `${prefix}${new Date().toISOString()}`;
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function validateIntents(intents: string[] | undefined): boolean {
  if (!intents || intents.length === 0) return true;
  const sorted = [...intents].sort().join(",");
  return VALID_INTENT_COMBINATIONS.includes(sorted);
}

// ============================================================================
// COLLAPSIBLE SECTION COMPONENT
// ============================================================================

interface CollapsibleSectionProps {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  titleAs?: 'h3' | 'label';
}

function CollapsibleSection({ title, isCollapsed, onToggle, children, titleAs = 'h3' }: CollapsibleSectionProps) {
  const TitleElement = titleAs;
  return (
    <>
      <div className={styles.collapsibleHeader} onClick={onToggle}>
        <TitleElement style={{ margin: 0, cursor: 'pointer' }}>{title}</TitleElement>
        <span className={`${styles.collapseIcon} ${isCollapsed ? styles.collapsed : ''}`}>▼</span>
      </div>
      <div className={`${styles.collapsibleContent} ${isCollapsed ? styles.collapsed : ''}`}>
        {children}
      </div>
    </>
  );
}

// ============================================================================
// TOGGLE SWITCH COMPONENT
// ============================================================================

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  id: string;
}

function ToggleSwitch({ checked, onChange, label, id }: ToggleSwitchProps) {
  return (
    <div className={styles.toggleContainer}>
      <label className={styles.toggleSwitch}>
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className={styles.toggleSlider}></span>
      </label>
      <span style={{ fontSize: '14px', color: '#0b051d', fontWeight: 500 }}>{label}</span>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function KlarnaPaymentButtonDemo() {
  // SDK & Button State
  const [klarna, setKlarna] = useState<KlarnaSDKInstance | null>(null);
  const currentButtonRef = useRef<KlarnaButton | null>(null);
  const mountTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonMountRef = useRef<HTMLDivElement>(null);

  // SDK Configuration State
  const [partnerMode, setPartnerMode] = useState(false);
  const [partnerAccountId, setPartnerAccountId] = useState('');
  const [clientId, setClientId] = useState(DEFAULT_CLIENT_ID);
  const [sdkToken, setSdkToken] = useState('');
  const [sdkStatus, setSdkStatus] = useState({ text: 'Ready to initialize', color: '#6f6b7a' });

  // Button Parameters State
  const [buttonId, setButtonId] = useState('');
  const [country, setCountry] = useState('IT');
  const [locale, setLocale] = useState('it-IT');
  const [shape, setShape] = useState('pill');
  const [theme, setTheme] = useState('default');
  const [logoAlignment, setLogoAlignment] = useState('default');
  const [initiationMode, setInitiationMode] = useState('DEVICE_BEST');
  const [intents, setIntents] = useState<Record<string, boolean>>({
    PAY: true,
    SUBSCRIBE: false,
    SIGNUP: false,
    SIGNIN: false,
    DONATE: false,
    ADD_TO_WALLET: false
  });
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initiation Data State
  const [scenario, setScenario] = useState('STEP_UP_REQUIRED');
  const [usePaymentRequestData, setUsePaymentRequestData] = useState(true);
  const [paymentRequestDataJson, setPaymentRequestDataJson] = useState('');
  const [paymentRequestId, setPaymentRequestId] = useState('');
  const [returnUrl, setReturnUrl] = useState('https://partner.example/payment-complete');

  // UI State
  const [buttonStatus, setButtonStatus] = useState({ text: 'Button will auto-mount when SDK is ready', color: '#6f6b7a' });
  const [eventLog, setEventLog] = useState<EventLogItem[]>([]);
  const [currentOrigin, setCurrentOrigin] = useState('http://localhost:3000');
  
  // Collapsible States
  const [sdkConfigCollapsed, setSdkConfigCollapsed] = useState(true);
  const [buttonParamsCollapsed, setButtonParamsCollapsed] = useState(true);
  const [intentsCollapsed, setIntentsCollapsed] = useState(true);
  const [initiationDataCollapsed, setInitiationDataCollapsed] = useState(true);
  const [codeDisplayCollapsed, setCodeDisplayCollapsed] = useState(false);

  // ============================================================================
  // DERIVED VALUES
  // ============================================================================

  const currency = COUNTRY_MAPPING[country]?.currency || 'EUR';
  const locales = COUNTRY_MAPPING[country]?.locales || ['en-US'];

  const selectedIntents = Object.entries(intents)
    .filter(([, checked]) => checked)
    .map(([intent]) => intent);

  const isIntentValid = validateIntents(selectedIntents.length > 0 ? selectedIntents : undefined);

  // ============================================================================
  // EVENT LOGGING
  // ============================================================================

  const logEvent = useCallback((title: string, data: unknown) => {
    setEventLog((prev) => [{
      id: generateUUID(),
      title,
      timestamp: new Date(),
      data
    }, ...prev]);
  }, []);

  const clearEventLog = useCallback(() => {
    setEventLog([]);
  }, []);

  // ============================================================================
  // PAYMENT REQUEST DATA BUILDER
  // ============================================================================

  const buildPaymentRequestDataStructure = useCallback(() => {
    const selectedIntentsList = Object.entries(intents)
      .filter(([, checked]) => checked)
      .map(([intent]) => intent);
    
    const intentList = selectedIntentsList.length > 0 ? selectedIntentsList : ['PAY'];
    const currentCurrency = COUNTRY_MAPPING[country]?.currency || 'EUR';

    const isOnlyPay = intentList.length === 1 && intentList[0] === 'PAY';
    const isOnlyDonate = intentList.length === 1 && intentList[0] === 'DONATE';
    const isOnlySubscribe = intentList.length === 1 && intentList[0] === 'SUBSCRIBE';
    const isOnlyAddToWallet = intentList.length === 1 && intentList[0] === 'ADD_TO_WALLET';
    const isPayPlusSubscribe = intentList.length === 2 && intentList.includes('PAY') && intentList.includes('SUBSCRIBE');
    const isPayPlusAddToWallet = intentList.length === 2 && intentList.includes('PAY') && intentList.includes('ADD_TO_WALLET');

    const amount = 3000;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {
      currency: currentCurrency,
      paymentRequestReference: "Auto-generated on mount",
      supplementaryPurchaseData: {
        purchaseReference: "Auto-generated on mount"
      }
    };

    const subscriptionStartDate = new Date();
    subscriptionStartDate.setDate(subscriptionStartDate.getDate() + 1);
    const subscriptionStartDateStr = subscriptionStartDate.toISOString().split('T')[0];

    if (isOnlyAddToWallet) {
      data.supplementaryPurchaseData.ondemandService = {
        averageAmount: 2000,
        minimumAmount: 2000,
        maximumAmount: 6000,
        purchaseInterval: "MONTH",
        purchaseInterval_frequency: 1
      };
    } else if (isPayPlusAddToWallet) {
      data.amount = amount;
      data.supplementaryPurchaseData.lineItems = [
        { name: "Taxi ride", quantity: 1, totalAmount: amount, unitPrice: amount }
      ];
      data.supplementaryPurchaseData.ondemandService = {
        averageAmount: 2000,
        minimumAmount: 2000,
        maximumAmount: 6000,
        purchaseInterval: "MONTH",
        purchaseInterval_frequency: 1
      };
    } else if (isOnlySubscribe) {
      data.amount = amount;
      data.supplementaryPurchaseData.lineItems = [
        { name: "Game Pass", quantity: 1, totalAmount: amount, unitPrice: amount, subscriptionReference: "GAME_PASS_USER_XYZ" }
      ];
      data.supplementaryPurchaseData.subscriptions = [{
        subscriptionReference: "GAME_PASS_USER_XYZ",
        name: "Game Pass",
        freeTrial: "INACTIVE",
        billingPlans: [{
          billingAmount: amount,
          currency: currentCurrency,
          from: subscriptionStartDateStr,
          interval: "MONTH",
          intervalFrequency: 1
        }]
      }];
    } else if (isPayPlusSubscribe) {
      const goodsAmount = Math.floor(amount * 0.85);
      const subscriptionAmount = amount - goodsAmount;
      data.amount = amount;
      data.supplementaryPurchaseData.lineItems = [
        { name: "Video Game Console", quantity: 1, totalAmount: goodsAmount, unitPrice: goodsAmount, lineItemReference: "AWESOME_CONSOLE" },
        { name: "Game Pass", quantity: 1, totalAmount: subscriptionAmount, unitPrice: subscriptionAmount, subscriptionReference: "GAME_PASS_USER_XYZ" }
      ];
      data.supplementaryPurchaseData.subscriptions = [{
        subscriptionReference: "GAME_PASS_USER_XYZ",
        name: "Game Pass",
        freeTrial: "INACTIVE",
        billingPlans: [{
          billingAmount: subscriptionAmount,
          currency: currentCurrency,
          from: subscriptionStartDateStr,
          interval: "MONTH",
          intervalFrequency: 1
        }]
      }];
    } else if (isOnlyPay || isOnlyDonate) {
      data.amount = amount;
      data.supplementaryPurchaseData.lineItems = [
        { name: "Test Item", quantity: 1, totalAmount: amount, unitPrice: amount }
      ];
    }

    data.customerInteractionConfig = {
      returnUrl: partnerMode
        ? "https://acquiringpartner.example/klarna-redirect?payment_request_id={klarna.payment_request.id}&state={klarna.payment_request.state}&payment_token={klarna.payment_request.payment_token}&payment_request_reference={klarna.payment_request.payment_request_reference}"
        : "https://partner.example/klarna-redirect?payment_request_id={klarna.payment_request.id}&state={klarna.payment_request.state}&interoperability_token={klarna.payment_request.interoperability_token}&payment_request_reference={klarna.payment_request.payment_request_reference}"
    };

    data.shippingConfig = {
      mode: "EDITABLE",
      supportedCountries: [country]
    };

    if (isOnlySubscribe || isPayPlusSubscribe) {
      data.requestCustomerToken = {
        scopes: ["payment:customer_not_present"],
        customerTokenReference: "Auto-generated on mount"
      };
    } else if (isOnlyAddToWallet || isPayPlusAddToWallet) {
      data.requestCustomerToken = {
        scopes: ["payment:customer_present"],
        customerTokenReference: "Auto-generated on mount"
      };
    }

    return JSON.stringify(data, null, 2);
  }, [intents, country, partnerMode]);

  // ============================================================================
  // BUILD FINAL PAYMENT REQUEST DATA
  // ============================================================================

  const buildPaymentRequestData = useCallback(() => {
    try {
      const jsonText = paymentRequestDataJson.trim();
      if (!jsonText) throw new Error("Payment request data is required");

      const data = JSON.parse(jsonText);
      data.currency = currency;

      if (data.shippingConfig) {
        data.shippingConfig.supportedCountries = [country];
      }

      const needsCustomerToken = selectedIntents.includes('SUBSCRIBE') || selectedIntents.includes('ADD_TO_WALLET');

      if (needsCustomerToken) {
        const scope = selectedIntents.includes('SUBSCRIBE') ? 'payment:customer_not_present' : 'payment:customer_present';
        if (!data.requestCustomerToken) {
          data.requestCustomerToken = {
            scopes: [scope],
            customerTokenReference: `customer_token_${generateUUID()}`
          };
        } else {
          data.requestCustomerToken.scopes = [scope];
          if (!data.requestCustomerToken.customerTokenReference || data.requestCustomerToken.customerTokenReference.includes('Auto-generated')) {
            data.requestCustomerToken.customerTokenReference = `customer_token_${generateUUID()}`;
          }
        }
      } else {
        delete data.requestCustomerToken;
      }

      if (!data.paymentRequestReference || data.paymentRequestReference.includes('Auto-generated')) {
        data.paymentRequestReference = generateReference('pay_req_ref_WebSDK_');
      }

      if (data.supplementaryPurchaseData && (!data.supplementaryPurchaseData.purchaseReference || data.supplementaryPurchaseData.purchaseReference.includes('Auto-generated'))) {
        data.supplementaryPurchaseData.purchaseReference = generateReference('purchase_ref_WebSDK_');
      }

      return data;
    } catch (error) {
      throw new Error(`Invalid payment request data JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [paymentRequestDataJson, currency, country, selectedIntents]);

  // ============================================================================
  // SDK EVENT LISTENERS
  // ============================================================================

  const attachSDKEventListeners = useCallback((klarnaInstance: KlarnaSDKInstance) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    klarnaInstance.Payment.on('error', (error: any, paymentRequest: any) => {
      logEvent('Payment Error', { error, paymentRequest });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    klarnaInstance.Payment.on('abort', (paymentRequest: any) => {
      logEvent('Payment Aborted', {
        state: paymentRequest.state,
        stateReason: paymentRequest.stateReason
      });
      if (paymentRequest.state === 'SUBMITTED') {
        klarnaInstance.Payment.cancel(paymentRequest.paymentRequestId);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    klarnaInstance.Payment.on('complete', async (paymentRequest: any) => {
      logEvent('Payment Complete', paymentRequest);
      return scenario === 'APPROVED' || scenario === 'DECLINED';
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    klarnaInstance.Interoperability.on('tokenupdate', (interoperabilityToken: any) => {
      logEvent('Interoperability Token Update', { token: interoperabilityToken });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    klarnaInstance.Payment.on('shippingaddresschange', async (paymentRequest: any, shippingAddressChange: any) => {
      logEvent('Shipping Address Changed', shippingAddressChange);
      const originalLineItems = paymentRequest.supplementaryPurchaseData?.lineItems || [];
      const originalAmount = originalLineItems.reduce((sum: number, item: { totalAmount: number }) => sum + item.totalAmount, 0);
      const defaultShippingAmount = 1000;

      return {
        amount: originalAmount + defaultShippingAmount,
        lineItems: [
          ...originalLineItems,
          { name: "Express shipping", quantity: 1, totalAmount: defaultShippingAmount, totalTaxAmount: 10 }
        ],
        selectedShippingOptionReference: "shipping-option-2",
        shippingOptions: [
          { shippingOptionReference: "shipping-option-1", amount: 500, displayName: "Standard shipping", description: "1 - 3 working days", shippingType: "TO_DOOR" },
          { shippingOptionReference: "shipping-option-2", amount: 1000, displayName: "Express shipping", description: "1 working day", shippingType: "TO_DOOR" }
        ]
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    klarnaInstance.Payment.on('shippingoptionselect', async (paymentRequest: any, shippingOptionSelect: any) => {
      logEvent('Shipping Option Selected', shippingOptionSelect);
      const originalLineItems = paymentRequest.supplementaryPurchaseData?.lineItems || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const productLineItems = originalLineItems.filter((item: any) => !item.name.toLowerCase().includes('shipping'));
      const originalAmount = productLineItems.reduce((sum: number, item: { totalAmount: number }) => sum + item.totalAmount, 0);

      const shippingOptions: Record<string, { name: string; amount: number }> = {
        "shipping-option-1": { name: "Standard shipping", amount: 500 },
        "shipping-option-2": { name: "Express shipping", amount: 1000 }
      };

      const selected = shippingOptions[shippingOptionSelect.shippingOptionReference];
      if (selected) {
        return {
          amount: originalAmount + selected.amount,
          lineItems: [
            ...productLineItems,
            { name: selected.name, quantity: 1, totalAmount: selected.amount, totalTaxAmount: 10 }
          ]
        };
      }
    });
  }, [logEvent, scenario]);

  // ============================================================================
  // BUTTON MOUNTING
  // ============================================================================

  const mountButton = useCallback(() => {
    try {
      if (!klarna) throw new Error('SDK not initialized');

      if (currentButtonRef.current) {
        currentButtonRef.current.unmount();
        currentButtonRef.current = null;
      }

      if (buttonMountRef.current) {
        buttonMountRef.current.innerHTML = '';
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buttonConfig: any = {
        locale,
        shape,
        theme,
        logoAlignment,
        initiationMode
      };

      if (buttonId) buttonConfig.id = buttonId;
      if (selectedIntents.length > 0) buttonConfig.intents = selectedIntents;
      if (disabled) buttonConfig.disabled = true;
      if (loading) buttonConfig.loading = true;

      if (scenario === 'STEP_UP_REQUIRED') {
        if (usePaymentRequestData) {
          buttonConfig.initiate = () => buildPaymentRequestData();
        } else {
          buttonConfig.initiate = () => {
            const prId = paymentRequestId.trim();
            if (!prId) throw new Error('Payment Request ID is required');
            return { paymentRequestId: prId };
          };
        }
      } else {
        buttonConfig.initiate = () => ({
          returnUrl: returnUrl.trim() || undefined
        });
      }

      currentButtonRef.current = klarna.Payment.button(buttonConfig).mount('#button-mount');
      setButtonStatus({ text: `Button mounted successfully (${scenario})`, color: '#28a745' });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setButtonStatus({ text: `Error: ${errorMsg}`, color: '#dc3545' });
      console.error('Button mount error:', error);
      logEvent('Button Mount Error', { error: errorMsg });
    }
  }, [klarna, locale, shape, theme, logoAlignment, initiationMode, buttonId, selectedIntents, disabled, loading, scenario, usePaymentRequestData, buildPaymentRequestData, paymentRequestId, returnUrl, logEvent]);

  // ============================================================================
  // SDK INITIALIZATION
  // ============================================================================

  const initializeAndMountButton = useCallback(async () => {
    try {
      setSdkStatus({ text: 'Initializing SDK...', color: '#6f6b7a' });
      setButtonStatus({ text: 'Initializing...', color: '#6f6b7a' });

      const currentClientId = clientId.trim();
      const currentSdkToken = sdkToken.trim();
      const currentPartnerAccountId = partnerAccountId.trim();

      if (!currentClientId) {
        const errorMsg = 'Client ID is required';
        setSdkStatus({ text: errorMsg, color: '#dc3545' });
        setButtonStatus({ text: errorMsg, color: '#dc3545' });
        return;
      }

      // Dynamically import Klarna SDK using eval to avoid Next.js static analysis
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const KlarnaModule = await (Function('return import("https://js.klarna.com/web-sdk/v2/klarna.mjs")')() as Promise<any>);
      const { KlarnaSDK } = KlarnaModule;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sdkConfig: any = { clientId: currentClientId, products: ['PAYMENT'] };
      if (currentSdkToken) sdkConfig.sdkToken = currentSdkToken;
      if (partnerMode && currentPartnerAccountId) sdkConfig.partnerAccountId = currentPartnerAccountId;

      const klarnaInstance = await KlarnaSDK(sdkConfig);
      attachSDKEventListeners(klarnaInstance);
      setKlarna(klarnaInstance);

      setSdkStatus({ text: 'SDK initialized', color: '#28a745' });

      // Expose to window for debugging
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).klarna = klarnaInstance;
      }
    } catch (error) {
      const errorMsg = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setSdkStatus({ text: errorMsg, color: '#dc3545' });
      setButtonStatus({ text: errorMsg, color: '#dc3545' });
      console.error('SDK initialization error:', error);
      logEvent('SDK Initialization Error', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }, [clientId, sdkToken, partnerMode, partnerAccountId, attachSDKEventListeners, logEvent]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Track if SDK has been initialized
  const sdkInitializedRef = useRef(false);
  
  // Initialize SDK once on mount
  useEffect(() => {
    if (!sdkInitializedRef.current) {
      sdkInitializedRef.current = true;
      initializeAndMountButton();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize payment request data structure once on mount
  const dataInitializedRef = useRef(false);
  useEffect(() => {
    if (!dataInitializedRef.current) {
      dataInitializedRef.current = true;
      setPaymentRequestDataJson(buildPaymentRequestDataStructure());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set current origin on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  // Update locale when country changes
  useEffect(() => {
    const countryLocales = COUNTRY_MAPPING[country]?.locales || ['en-US'];
    if (!countryLocales.includes(locale)) {
      setLocale(countryLocales[0]);
    }
  }, [country, locale]);

  // Mount button when SDK becomes ready (only once)
  const buttonMountedRef = useRef(false);
  useEffect(() => {
    if (klarna && !buttonMountedRef.current) {
      buttonMountedRef.current = true;
      mountButton();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klarna]);

  // ============================================================================
  // REMOUNT BUTTON HANDLER
  // ============================================================================
  
  const remountButton = useCallback(() => {
    if (mountTimeoutRef.current) clearTimeout(mountTimeoutRef.current);
    mountTimeoutRef.current = setTimeout(() => {
      if (klarna) {
        mountButton();
      }
    }, 300);
  }, [klarna, mountButton]);

  // ============================================================================
  // INTENT HANDLERS
  // ============================================================================

  const handleIntentChange = (intent: string, checked: boolean) => {
    setIntents(prev => ({ ...prev, [intent]: checked }));
  };
  
  // Update payment request data and remount when intents change
  useEffect(() => {
    if (dataInitializedRef.current) {
      setPaymentRequestDataJson(buildPaymentRequestDataStructure());
      if (klarna) {
        remountButton();
      }
    }
    // Only depend on intents changes, not on the functions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intents]);

  // ============================================================================
  // GENERATED CODE DISPLAY
  // ============================================================================

  const getSDKInitCode = () => {
    const configLines = [
      `  clientId: "${clientId}"`,
      `  products: ["PAYMENT"]`
    ];
    if (sdkToken) {
      configLines.push(`  sdkToken: "${sdkToken}"`);
    }
    if (partnerMode && partnerAccountId) {
      configLines.push(`  partnerAccountId: "${partnerAccountId}"`);
    }
    
    return `// Import SDK
const { KlarnaSDK } = await import("https://js.klarna.com/web-sdk/v2/klarna.mjs");

// Initialize SDK
const klarna = await KlarnaSDK({
${configLines.join(',\n')}
});`;
  };

  const getButtonMountCode = () => {
    const configLines = [
      `  locale: "${locale}"`,
      `  shape: "${shape}"`,
      `  theme: "${theme}"`,
      `  logoAlignment: "${logoAlignment}"`,
      `  initiationMode: "${initiationMode}"`
    ];
    
    if (buttonId) {
      configLines.push(`  id: "${buttonId}"`);
    }
    
    if (selectedIntents.length > 0) {
      configLines.push(`  intents: [${selectedIntents.map(i => `"${i}"`).join(', ')}]`);
    }
    
    if (disabled) {
      configLines.push(`  disabled: true`);
    }
    
    if (loading) {
      configLines.push(`  loading: true`);
    }

    let initiateCode = '';
    if (scenario === 'STEP_UP_REQUIRED') {
      if (usePaymentRequestData) {
        let formattedJson = '{}';
        try {
          formattedJson = JSON.stringify(JSON.parse(paymentRequestDataJson || '{}'), null, 4)
            .split('\n')
            .map((line, i) => i === 0 ? line : '    ' + line)
            .join('\n');
        } catch {
          formattedJson = '// Invalid JSON - please fix the payment request data';
        }
        initiateCode = `  initiate: () => {
    // Return payment request data (client-side creation)
    return ${formattedJson};
  }`;
      } else {
        initiateCode = `  initiate: () => {
    // Return payment request ID (server-side creation)
    return { paymentRequestId: "${paymentRequestId}" };
  }`;
      }
    } else {
      initiateCode = `  initiate: () => {
    // Direct flow with return URL
    return { returnUrl: "${returnUrl}" };
  }`;
    }
    
    configLines.push(initiateCode);

    return `// Mount Payment Button
const button = klarna.Payment.button({
${configLines.join(',\n')}
}).mount("#button-mount");`;
  };

  // ============================================================================
  // INFO BANNER CONTENT
  // ============================================================================

  const getInfoBannerContent = () => {
    if (partnerMode) {
      return (
        <>
          <strong>Acquiring Partner:</strong> To use this demo, the partner account must be onboarded with{' '}
          <code>store_groups[].stores[].type = WEBSITE</code> and <code>store_groups[].stores[].url</code> set to{' '}
          <code>{currentOrigin}</code>
        </>
      );
    }
    return (
      <>
        <strong>Sub Partner:</strong> To use this demo, <code>{currentOrigin}</code>{' '}
        must be registered as an allowed origin in the Klarna Partner Portal. Navigate to Settings → Client Identifier → Allowed Origins.
      </>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className={styles.container}>
      {/* Info Banner */}
      <div className={styles.infoBanner}>
        <div className={styles.infoIcon}>ℹ️</div>
        <div className={styles.infoContent}>{getInfoBannerContent()}</div>
      </div>

      {/* Configuration Panels Row */}
      <div className={styles.configRow}>
        {/* SDK Configuration */}
        <div className={styles.configPanel}>
          <div className={styles.config}>
            <CollapsibleSection
              title="SDK Configuration"
              isCollapsed={sdkConfigCollapsed}
              onToggle={() => setSdkConfigCollapsed(!sdkConfigCollapsed)}
            >
              <div className={styles.field}>
                <ToggleSwitch
                  id="partner-mode-toggle"
                  checked={partnerMode}
                  onChange={(checked) => {
                    setPartnerMode(checked);
                    remountButton();
                  }}
                  label="Acquiring Partner Mode"
                />
              </div>

              {partnerMode && (
                <div className={styles.field}>
                  <label htmlFor="partner-account-id">Partner Account ID</label>
                  <input
                    id="partner-account-id"
                    type="text"
                    placeholder="krn:partner:global:account:..."
                    value={partnerAccountId}
                    onChange={(e) => {
                      setPartnerAccountId(e.target.value);
                      remountButton();
                    }}
                  />
                </div>
              )}

              <div className={styles.field}>
                <label htmlFor="client-id">Client ID *</label>
                <input
                  id="client-id"
                  type="text"
                  placeholder="Enter your Klarna client ID..."
                  value={clientId}
                  onChange={(e) => {
                    setClientId(e.target.value);
                    remountButton();
                  }}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="sdk-token">SDK Token (optional)</label>
                <input
                  id="sdk-token"
                  type="text"
                  placeholder="Enter SDK token or leave empty..."
                  value={sdkToken}
                  onChange={(e) => {
                    setSdkToken(e.target.value);
                    remountButton();
                  }}
                />
              </div>

              <div className={styles.status} style={{ marginTop: '8px', color: sdkStatus.color }}>
                {sdkStatus.text}
              </div>
            </CollapsibleSection>
          </div>
        </div>

        {/* Button Parameters */}
        <div className={styles.configPanel}>
          <div className={styles.config}>
            <CollapsibleSection
              title="Button Parameters"
              isCollapsed={buttonParamsCollapsed}
              onToggle={() => setButtonParamsCollapsed(!buttonParamsCollapsed)}
            >
              {/* Intents */}
              <div className={styles.field}>
                <CollapsibleSection
                  title="Intents (optional)"
                  titleAs="label"
                  isCollapsed={intentsCollapsed}
                  onToggle={() => setIntentsCollapsed(!intentsCollapsed)}
                >
                  <div className={styles.checkboxGroup}>
                    {[
                      { value: 'PAY', label: 'PAY', disabled: false },
                      { value: 'SUBSCRIBE', label: 'SUBSCRIBE', disabled: false },
                      { value: 'SIGNUP', label: 'SIGNUP (not supported)', disabled: true },
                      { value: 'SIGNIN', label: 'SIGNIN (not supported)', disabled: true },
                      { value: 'DONATE', label: 'DONATE', disabled: false },
                      { value: 'ADD_TO_WALLET', label: 'ADD_TO_WALLET', disabled: false }
                    ].map((intent) => (
                      <label
                        key={intent.value}
                        className={`${styles.checkboxItem} ${intent.disabled ? styles.disabled : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={intents[intent.value] || false}
                          disabled={intent.disabled}
                          onChange={(e) => handleIntentChange(intent.value, e.target.checked)}
                        />
                        <span>{intent.label}</span>
                      </label>
                    ))}
                  </div>
                  {!isIntentValid && (
                    <div className={`${styles.intentWarning} ${styles.show}`}>
                      ⚠️ Invalid intent combination. Valid: PAY, DONATE, SUBSCRIBE, SIGNUP, SIGNIN, ADD_TO_WALLET, PAY+ADD_TO_WALLET, PAY+SIGNIN, PAY+SUBSCRIBE, DONATE+SIGNIN.
                    </div>
                  )}
                </CollapsibleSection>
              </div>

              {/* Country */}
              <div className={styles.field}>
                <label htmlFor="country">Purchase Country</label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    remountButton();
                  }}
                >
                  {Object.keys(COUNTRY_MAPPING).map((cc) => (
                    <option key={cc} value={cc}>{cc}</option>
                  ))}
                </select>
              </div>

              {/* Locale */}
              <div className={styles.field}>
                <label htmlFor="locale">Locale</label>
                <select
                  id="locale"
                  value={locale}
                  onChange={(e) => {
                    setLocale(e.target.value);
                    remountButton();
                  }}
                >
                  {locales.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                <div className={styles.status}>
                  Currency: <span className={styles.pill}>{currency}</span>
                </div>
              </div>

              {/* Shape */}
              <div className={styles.field}>
                <label htmlFor="shape">Shape</label>
                <select
                  id="shape"
                  value={shape}
                  onChange={(e) => {
                    setShape(e.target.value);
                    remountButton();
                  }}
                >
                  <option value="default">default</option>
                  <option value="pill">pill</option>
                  <option value="rect">rect</option>
                </select>
              </div>

              {/* Theme */}
              <div className={styles.field}>
                <label htmlFor="theme">Theme</label>
                <select
                  id="theme"
                  value={theme}
                  onChange={(e) => {
                    setTheme(e.target.value);
                    remountButton();
                  }}
                >
                  <option value="default">default</option>
                  <option value="light">light</option>
                  <option value="dark">dark</option>
                  <option value="outlined">outlined</option>
                </select>
              </div>

              {/* Logo Alignment */}
              <div className={styles.field}>
                <label htmlFor="logo-alignment">Logo Alignment</label>
                <select
                  id="logo-alignment"
                  value={logoAlignment}
                  onChange={(e) => {
                    setLogoAlignment(e.target.value);
                    remountButton();
                  }}
                >
                  <option value="default">default</option>
                  <option value="left">left</option>
                  <option value="center">center</option>
                </select>
              </div>

              {/* Initiation Mode */}
              <div className={styles.field}>
                <label htmlFor="initiation-mode">Initiation Mode</label>
                <select
                  id="initiation-mode"
                  value={initiationMode}
                  onChange={(e) => {
                    setInitiationMode(e.target.value);
                    remountButton();
                  }}
                >
                  <option value="DEVICE_BEST">DEVICE_BEST</option>
                  <option value="REDIRECT">REDIRECT</option>
                  <option value="ON_PAGE">ON_PAGE</option>
                  <option value="POPUP">POPUP</option>
                </select>
                <div className={styles.status}>Recommended: &quot;DEVICE_BEST&quot;</div>
              </div>

              {/* Disabled Toggle */}
              <div className={styles.field}>
                <ToggleSwitch
                  id="disabled-toggle"
                  checked={disabled}
                  onChange={(checked) => {
                    setDisabled(checked);
                    remountButton();
                  }}
                  label="Disabled"
                />
                <div className={styles.status} style={{ marginTop: '4px' }}>Sets the initial disabled state</div>
              </div>

              {/* Loading Toggle */}
              <div className={styles.field}>
                <ToggleSwitch
                  id="loading-toggle"
                  checked={loading}
                  onChange={(checked) => {
                    setLoading(checked);
                    remountButton();
                  }}
                  label="Loading"
                />
                <div className={styles.status} style={{ marginTop: '4px' }}>Sets the initial loading state</div>
              </div>

              {/* Button ID */}
              <div className={styles.field}>
                <label htmlFor="button-id">ID (optional)</label>
                <input
                  id="button-id"
                  type="text"
                  placeholder="Unique identifier for the button"
                  value={buttonId}
                  onChange={(e) => {
                    setButtonId(e.target.value);
                    remountButton();
                  }}
                />
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>

      {/* Payment Button Initiation Data Configuration */}
      <div className={styles.configRow}>
        <div className={styles.configPanel} style={{ flex: 1 }}>
          <div className={styles.config}>
            <CollapsibleSection
              title="Payment Button Initiation Data"
              isCollapsed={initiationDataCollapsed}
              onToggle={() => setInitiationDataCollapsed(!initiationDataCollapsed)}
            >
              <div className={styles.infoBox}>
                <strong>ℹ️ About the initiate function:</strong><br />
                The <code>initiate</code> function is triggered when the user clicks the payment button. It returns a Promise that can resolve to:<br />
                • <strong>paymentRequestData</strong> - Client-side payment request creation<br />
                • <strong>paymentRequestId</strong> - Server-side payment request creation (created via Klarna Payment API when button is clicked)<br />
                • <strong>returnUrl</strong> - For direct success/failure flows (e.g., with payment/authorize)<br /><br />
                <a href="https://docs.klarna.com/websdk/v2/interfaces/payment.KlarnaPaymentButtonConfig.html#initiate" target="_blank" rel="noopener noreferrer" style={{ color: '#0b051d', textDecoration: 'underline' }}>
                  View official documentation →
                </a>
              </div>

              {/* Scenario Select */}
              <div className={styles.field}>
                <label htmlFor="scenario-select">Payment transaction response</label>
                <select
                  id="scenario-select"
                  value={scenario}
                  onChange={(e) => {
                    setScenario(e.target.value);
                    remountButton();
                  }}
                >
                  <option value="STEP_UP_REQUIRED">STEP_UP_REQUIRED (normal payment flow)</option>
                  <option value="APPROVED">APPROVED (direct success)</option>
                  <option value="DECLINED">DECLINED (direct failure)</option>
                </select>
                <div className={styles.status}>Select a scenario to test different payment flows</div>
              </div>

              {/* STEP_UP_REQUIRED Section */}
              {scenario === 'STEP_UP_REQUIRED' && (
                <div>
                  <ToggleSwitch
                    id="initiation-mode-toggle"
                    checked={usePaymentRequestData}
                    onChange={(checked) => {
                      setUsePaymentRequestData(checked);
                      remountButton();
                    }}
                    label="Use Payment Request Data (off = use Payment Request ID)"
                  />

                  {/* Payment Request Data Section */}
                  {usePaymentRequestData && (
                    <div className={styles.field}>
                      <label htmlFor="payment-request-data-json">Payment Request Data (JSON)</label>
                      <textarea
                        id="payment-request-data-json"
                        placeholder="Enter payment request data as JSON..."
                        value={paymentRequestDataJson}
                        onChange={(e) => {
                          setPaymentRequestDataJson(e.target.value);
                          remountButton();
                        }}
                      />
                      <div className={styles.status}>Edit the JSON directly. References will be auto-generated on mount.</div>
                    </div>
                  )}

                  {/* Payment Request ID Section */}
                  {!usePaymentRequestData && (
                    <div className={styles.field}>
                      <label htmlFor="payment-request-id">Payment Request ID</label>
                      <input
                        id="payment-request-id"
                        type="text"
                        placeholder="Enter payment request ID from server"
                        value={paymentRequestId}
                        onChange={(e) => {
                          setPaymentRequestId(e.target.value);
                          remountButton();
                        }}
                      />
                      <div className={styles.status} style={{ marginTop: '6px', lineHeight: 1.5 }}>
                        <strong>Note:</strong> The paymentRequestId should be created via the <strong>Klarna Payment API</strong> (server-side) when the user clicks the payment button.
                        The <code>initiate</code> function will be triggered on button click, and your backend should then create the payment request and return the ID.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* APPROVED/DECLINED Section */}
              {scenario !== 'STEP_UP_REQUIRED' && (
                <div className={styles.field}>
                  <label htmlFor="return-url-input">Return URL</label>
                  <input
                    id="return-url-input"
                    type="text"
                    value={returnUrl}
                    placeholder="URL to redirect after payment"
                    onChange={(e) => {
                      setReturnUrl(e.target.value);
                      remountButton();
                    }}
                  />
                  <div className={styles.status}>The customer will be redirected to this URL</div>
                </div>
              )}

              <div className={styles.status} style={{ marginTop: '8px', color: buttonStatus.color }}>
                {buttonStatus.text}
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>

      {/* Generated Code Display */}
      <div className={styles.configRow}>
        <div className={styles.configPanel} style={{ flex: 1 }}>
          <div className={styles.config}>
            <CollapsibleSection
              title="Generated SDK Code"
              isCollapsed={codeDisplayCollapsed}
              onToggle={() => setCodeDisplayCollapsed(!codeDisplayCollapsed)}
            >
              <div className={styles.field}>
                <label>SDK Initialization</label>
                <pre style={{ 
                  background: '#1e1e1e', 
                  color: '#d4d4d4', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '200px',
                  margin: 0
                }}>
                  {getSDKInitCode()}
                </pre>
              </div>
              <div className={styles.field}>
                <label>Button Mount</label>
                <pre style={{ 
                  background: '#1e1e1e', 
                  color: '#d4d4d4', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  fontSize: '12px',
                  overflow: 'auto',
                  maxHeight: '400px',
                  margin: 0
                }}>
                  {getButtonMountCode()}
                </pre>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>

      {/* Button Display and Event Log */}
      <div className={styles.mainRow}>
        <div className={styles.buttonContainer}>
          <div className={styles.config}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Payment Button</h3>
              <button 
                onClick={() => remountButton()} 
                className={styles.clearButton}
                disabled={!klarna}
              >
                Remount
              </button>
            </div>
            <div id="button-mount" ref={buttonMountRef} className={styles.buttonMount}></div>
          </div>
        </div>

        <div className={styles.eventLog}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0 }}>SDK Payment Events</h3>
            <button onClick={clearEventLog} className={styles.clearButton}>Clear Log</button>
          </div>
          <div className={styles.eventLogContent}>
            {eventLog.length === 0 ? (
              <p style={{ color: '#6f6b7a', fontSize: '12px' }}>Payment events will appear here...</p>
            ) : (
              eventLog.map((event) => (
                <div key={event.id} className={styles.eventItem}>
                  <div className={styles.eventTitle}>{event.title}</div>
                  <div className={styles.eventTime}>{event.timestamp.toLocaleTimeString()}</div>
                  <pre>{JSON.stringify(event.data, null, 2)}</pre>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
