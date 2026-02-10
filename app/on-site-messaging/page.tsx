'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styles from './page.module.css';

// ============================================================================
// TYPES
// ============================================================================

interface EventLogItem {
  id: string;
  title: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
  data?: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KlarnaSDK = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Placement = any;

interface CSSInput {
  id: string;
  part: string;
  prop: string;
  label: string;
  placeholder: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COUNTRY_MAPPING: Record<string, { currency: string; locales: string[] }> = {
  AU: { currency: 'AUD', locales: ['en-AU'] },
  AT: { currency: 'EUR', locales: ['de-AT', 'en-AT'] },
  BE: { currency: 'EUR', locales: ['nl-BE', 'fr-BE', 'en-BE'] },
  CA: { currency: 'CAD', locales: ['en-CA', 'fr-CA'] },
  CZ: { currency: 'CZK', locales: ['cs-CZ', 'en-CZ'] },
  DK: { currency: 'DKK', locales: ['da-DK', 'en-DK'] },
  FI: { currency: 'EUR', locales: ['fi-FI', 'sv-FI', 'en-FI'] },
  FR: { currency: 'EUR', locales: ['fr-FR', 'en-FR'] },
  DE: { currency: 'EUR', locales: ['de-DE', 'en-DE'] },
  GR: { currency: 'EUR', locales: ['el-GR', 'en-GR'] },
  HU: { currency: 'HUF', locales: ['hu-HU', 'en-HU'] },
  IE: { currency: 'EUR', locales: ['en-IE'] },
  IT: { currency: 'EUR', locales: ['it-IT', 'en-IT'] },
  MX: { currency: 'MXN', locales: ['en-MX', 'es-MX'] },
  NL: { currency: 'EUR', locales: ['nl-NL', 'en-NL'] },
  NZ: { currency: 'NZD', locales: ['en-NZ'] },
  NO: { currency: 'NOK', locales: ['nb-NO', 'en-NO'] },
  PL: { currency: 'PLN', locales: ['pl-PL', 'en-PL'] },
  PT: { currency: 'EUR', locales: ['pt-PT', 'en-PT'] },
  RO: { currency: 'RON', locales: ['ro-RO', 'en-RO'] },
  SK: { currency: 'EUR', locales: ['sk-SK', 'en-SK'] },
  ES: { currency: 'EUR', locales: ['es-ES', 'en-ES'] },
  SE: { currency: 'SEK', locales: ['sv-SE', 'en-SE'] },
  CH: { currency: 'CHF', locales: ['de-CH', 'fr-CH', 'it-CH', 'en-CH'] },
  GB: { currency: 'GBP', locales: ['en-GB'] },
  US: { currency: 'USD', locales: ['en-US', 'es-US'] },
};

const PLACEMENT_KEYS = [
  'credit-promotion-auto-size',
  'credit-promotion-badge',
  'top-strip-promotion-auto-size',
  'top-strip-promotion-badge',
  'homepage-promotion-tall',
  'homepage-promotion-wide',
  'homepage-promotion-box',
  'sidebar-promotion-auto-size',
  'footer-promotion-auto-size',
  'info-page',
];

const PLACEMENT_PARTS: Record<string, string[]> = {
  'credit-promotion-auto-size': ['container', 'message', 'legal', 'cta'],
  'credit-promotion-badge': ['container', 'message', 'legal', 'cta', 'badge'],
  'top-strip-promotion-auto-size': ['container', 'message', 'legal', 'cta'],
  'top-strip-promotion-badge': ['container', 'message', 'legal', 'cta', 'badge'],
  'homepage-promotion-tall': [],
  'homepage-promotion-wide': [],
  'homepage-promotion-box': [],
  'sidebar-promotion-auto-size': [],
  'footer-promotion-auto-size': ['container', 'badge'],
  'info-page': ['container', 'link', 'heading'],
};

const CSS_INPUTS: CSSInput[] = [
  // osm-container
  { id: 'css-container-bg', part: 'osm-container', prop: 'background-color', label: 'Background', placeholder: 'e.g. #ffffff' },
  { id: 'css-container-border', part: 'osm-container', prop: 'border', label: 'Border', placeholder: 'e.g. 1px solid #ccc' },
  { id: 'css-container-radius', part: 'osm-container', prop: 'border-radius', label: 'Border Radius', placeholder: 'e.g. 8px' },
  { id: 'css-container-padding', part: 'osm-container', prop: 'padding', label: 'Padding', placeholder: 'e.g. 16px' },
  { id: 'css-container-font', part: 'osm-container', prop: 'font-family', label: 'Font Family', placeholder: 'e.g. Arial, sans-serif' },
  { id: 'css-container-size', part: 'osm-container', prop: 'font-size', label: 'Font Size', placeholder: 'e.g. 14px' },
  // osm-message
  { id: 'css-message-color', part: 'osm-message', prop: 'color', label: 'Color', placeholder: 'e.g. #333333' },
  { id: 'css-message-font', part: 'osm-message', prop: 'font-family', label: 'Font Family', placeholder: 'e.g. Arial, sans-serif' },
  { id: 'css-message-size', part: 'osm-message', prop: 'font-size', label: 'Font Size', placeholder: 'e.g. 14px' },
  { id: 'css-message-weight', part: 'osm-message', prop: 'font-weight', label: 'Font Weight', placeholder: 'e.g. 700' },
  // osm-cta
  { id: 'css-cta-color', part: 'osm-cta', prop: 'color', label: 'Color', placeholder: 'e.g. #0b051d' },
  { id: 'css-cta-bg', part: 'osm-cta', prop: 'background-color', label: 'Background', placeholder: 'e.g. transparent' },
  { id: 'css-cta-font', part: 'osm-cta', prop: 'font-family', label: 'Font Family', placeholder: 'e.g. Arial, sans-serif' },
  { id: 'css-cta-size', part: 'osm-cta', prop: 'font-size', label: 'Font Size', placeholder: 'e.g. 14px' },
  // osm-legal
  { id: 'css-legal-color', part: 'osm-legal', prop: 'color', label: 'Color', placeholder: 'e.g. #999999' },
  { id: 'css-legal-size', part: 'osm-legal', prop: 'font-size', label: 'Font Size', placeholder: 'e.g. 11px' },
  { id: 'css-legal-style', part: 'osm-legal', prop: 'font-style', label: 'Font Style', placeholder: 'e.g. italic' },
  // osm-badge
  { id: 'css-badge-transform', part: 'osm-badge', prop: 'transform', label: 'Transform', placeholder: 'e.g. scale(1.2)' },
  { id: 'css-badge-margin', part: 'osm-badge', prop: 'margin', label: 'Margin', placeholder: 'e.g. 0 8px' },
  // osm-link
  { id: 'css-link-color', part: 'osm-link', prop: 'color', label: 'Color', placeholder: 'e.g. #0b051d' },
  { id: 'css-link-decoration', part: 'osm-link', prop: 'text-decoration', label: 'Text Decoration', placeholder: 'e.g. underline' },
  // osm-heading
  { id: 'css-heading-color', part: 'osm-heading', prop: 'color', label: 'Color', placeholder: 'e.g. #0b051d' },
  { id: 'css-heading-font', part: 'osm-heading', prop: 'font-family', label: 'Font Family', placeholder: 'e.g. Arial, sans-serif' },
  { id: 'css-heading-size', part: 'osm-heading', prop: 'font-size', label: 'Font Size', placeholder: 'e.g. 24px' },
];

const DEFAULT_SUB_PARTNER_CLIENT_ID = 'klarna_test_client_L0ZwWW55akg3MjUzcmgyP1RuP3A_KEdIJFBINUxzZXMsOGU5M2NmZGItNmFiOC00ZjQ3LWFhMGMtZDI4NTE1OGU0MTNmLDEsQ3VNRmtmdlpHd1VIRmdDT1Q0Zkh2ZkJ1YkxETy9ZTGFiYUZvYVJ4ZTAyYz0';

const EVENT_LOG_STORAGE_KEY = 'klarna-osm-event-log';

// Map short part names to their full osm- prefixed names
const PART_SHORT_TO_FULL: Record<string, string> = {
  container: 'osm-container',
  message: 'osm-message',
  cta: 'osm-cta',
  legal: 'osm-legal',
  badge: 'osm-badge',
  link: 'osm-link',
  heading: 'osm-heading',
};

// Group CSS_INPUTS by part for rendering
const CSS_INPUTS_BY_PART: Record<string, CSSInput[]> = {};
CSS_INPUTS.forEach((input) => {
  if (!CSS_INPUTS_BY_PART[input.part]) {
    CSS_INPUTS_BY_PART[input.part] = [];
  }
  CSS_INPUTS_BY_PART[input.part].push(input);
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

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
  } catch {
    return [];
  }
}

function saveEventLogToStorage(eventLog: EventLogItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = eventLog.map((item) => ({
      ...item,
      timestamp: item.timestamp.toISOString(),
    }));
    localStorage.setItem(EVENT_LOG_STORAGE_KEY, JSON.stringify(serialized));
  } catch {
    // ignore
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OnSiteMessagingPage() {
  // Client-side mount tracking
  const [isMounted, setIsMounted] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState('');

  // Panel collapse state
  const [sdkPanelOpen, setSdkPanelOpen] = useState(true);
  const [paymentPanelOpen, setPaymentPanelOpen] = useState(true);
  const [messagingPanelOpen, setMessagingPanelOpen] = useState(true);
  const [cssPanelOpen, setCssPanelOpen] = useState(true);

  // SDK config
  const [partnerMode, setPartnerMode] = useState(false);
  const [partnerAccountId, setPartnerAccountId] = useState('');
  const [clientId, setClientId] = useState(DEFAULT_SUB_PARTNER_CLIENT_ID);
  const [sdkToken, setSdkToken] = useState('');

  // Payment config
  const [country, setCountry] = useState('US');
  const [locale, setLocale] = useState('en-US');
  const [amount, setAmount] = useState(7999);

  // Messaging config
  const [placementKey, setPlacementKey] = useState('credit-promotion-auto-size');
  const [theme, setTheme] = useState('default');
  const [messagePrefix, setMessagePrefix] = useState('');

  // CSS customization
  const [partStyles, setPartStyles] = useState<Record<string, Record<string, string>>>({});
  const [badgeAlignment, setBadgeAlignment] = useState('');

  // Event log
  const [eventLog, setEventLog] = useState<EventLogItem[]>([]);

  // Refs
  const klarnaRef = useRef<KlarnaSDK>(null);
  const activePlacementRef = useRef<Placement>(null);
  const lastSdkConfigRef = useRef<string>('');
  const dynamicStyleRef = useRef<HTMLStyleElement | null>(null);
  const sdkInitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived values
  const currency = useMemo(() => COUNTRY_MAPPING[country]?.currency || 'USD', [country]);
  const availableLocales = useMemo(() => COUNTRY_MAPPING[country]?.locales || ['en-US'], [country]);
  const activeParts = useMemo(() => PLACEMENT_PARTS[placementKey] || [], [placementKey]);

  // Observer code blocks (live preview of SDK integration code)
  const observerCode = useMemo(() => {
    const trimmedClientId = clientId.trim() || 'klarna_test_client_...';
    const trimmedToken = sdkToken.trim();
    const trimmedPartnerAccountId = partnerAccountId.trim();

    // SDK Initialization
    let sdkLines = `import { KlarnaSDK } from "https://js.klarna.com/web-sdk/v2/klarna.mjs";\n\nconst klarna = await KlarnaSDK({\n  clientId: "${trimmedClientId}",\n  products: ["MESSAGING"],\n  locale: "${locale}",`;
    if (partnerMode && trimmedPartnerAccountId) {
      sdkLines += `\n  partnerAccountId: "${trimmedPartnerAccountId}",`;
    }
    if (trimmedToken) {
      sdkLines += `\n  sdkToken: "${trimmedToken}",`;
    }
    sdkLines += '\n});';

    // Placement
    let placementLines = `const placement = klarna.Messaging.placement({\n  key: "${placementKey}",\n  amount: ${amount},\n  locale: "${locale}",\n  theme: "${theme}",\n  id: "messaging-placement",`;
    if (messagePrefix.trim()) {
      placementLines += `\n  messagePrefix: "${messagePrefix.trim()}",`;
    }
    placementLines += '\n});\n\nplacement.mount("#messaging-placement");';

    // HTML
    const htmlCode = '<div id="messaging-placement"></div>';

    // CSS (only if partStyles has values)
    let cssCode = '';
    const styleEntries: string[] = [];
    Object.entries(partStyles).forEach(([part, properties]) => {
      const declarations = Object.entries(properties)
        .filter(([, value]) => value.trim())
        .map(([prop, value]) => `  ${prop}: ${value.trim()};`);
      if (declarations.length > 0) {
        styleEntries.push(`#messaging-placement::part(${part}) {\n${declarations.join('\n')}\n}`);
      }
    });
    if (styleEntries.length > 0) {
      cssCode = styleEntries.join('\n\n');
    }

    return { sdkCode: sdkLines, placementCode: placementLines, htmlCode, cssCode };
  }, [clientId, sdkToken, partnerAccountId, partnerMode, locale, placementKey, amount, theme, messagePrefix, partStyles]);

  // ============================================================================
  // EVENT LOGGING
  // ============================================================================

  const logEvent = useCallback((title: string, type: EventLogItem['type'], data?: unknown) => {
    setEventLog((prev) => [
      {
        id: generateId(),
        title,
        timestamp: new Date(),
        type,
        data,
      },
      ...prev,
    ]);
  }, []);

  const clearLog = useCallback(() => {
    setEventLog([]);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(EVENT_LOG_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  // ============================================================================
  // PLACEMENT MANAGEMENT
  // ============================================================================

  const clearPlacement = useCallback(() => {
    if (activePlacementRef.current) {
      try {
        activePlacementRef.current.unmount();
      } catch {
        // ignore
      }
      activePlacementRef.current = null;
    }
    const container = document.getElementById('messaging-placement');
    if (container) {
      container.innerHTML = '';
    }
  }, []);

  const renderPlacement = useCallback(async () => {
    if (!klarnaRef.current) return;

    try {
      clearPlacement();

      const config: Record<string, unknown> = {
        key: placementKey,
        amount: amount,
        locale: locale,
        theme: theme,
        id: 'messaging-placement',
      };

      if (messagePrefix.trim()) {
        config.messagePrefix = messagePrefix.trim();
      }

      logEvent('Rendering Placement', 'info', config);

      activePlacementRef.current = klarnaRef.current.Messaging.placement(config);
      activePlacementRef.current.mount('#messaging-placement');

      logEvent('Placement Mounted', 'success', { key: placementKey });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logEvent('Placement Error', 'error', { error: message });
    }
  }, [placementKey, amount, locale, theme, messagePrefix, clearPlacement, logEvent]);

  // ============================================================================
  // SDK INITIALIZATION
  // ============================================================================

  const initializeSDK = useCallback(async () => {
    const trimmedClientId = clientId.trim();
    if (!trimmedClientId) return;

    const currentConfig = JSON.stringify({
      clientId: trimmedClientId,
      sdkToken: sdkToken.trim(),
      partnerAccountId: partnerMode ? partnerAccountId.trim() : '',
    });

    // Skip if config unchanged
    if (klarnaRef.current && lastSdkConfigRef.current === currentConfig) {
      return;
    }

    // Config changed - clear existing SDK
    if (klarnaRef.current && lastSdkConfigRef.current !== currentConfig) {
      clearPlacement();
      klarnaRef.current = null;
    }

    lastSdkConfigRef.current = currentConfig;

    try {
      logEvent('Initializing Klarna SDK', 'info', { clientId: trimmedClientId.substring(0, 30) + '...' });

      // Patch customElements.define for React Strict Mode
      if (typeof window !== 'undefined' && window.customElements) {
        const originalDefine = window.customElements.define.bind(window.customElements);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.customElements.define = function (name: string, constructor: any, options?: any) {
          if (!window.customElements.get(name)) {
            originalDefine(name, constructor, options);
          }
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const KlarnaModule = await (Function('return import("https://js.klarna.com/web-sdk/v2/klarna.mjs")')() as Promise<any>);
      const { KlarnaSDK: KlarnaSDKConstructor } = KlarnaModule;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sdkConfig: Record<string, any> = {
        clientId: trimmedClientId,
        products: ['MESSAGING'],
        locale: locale,
      };

      const trimmedToken = sdkToken.trim();
      const trimmedPartnerAccountId = partnerAccountId.trim();

      if (trimmedToken) sdkConfig.sdkToken = trimmedToken;
      if (partnerMode && trimmedPartnerAccountId) {
        sdkConfig.partnerAccountId = trimmedPartnerAccountId;
      }

      const klarnaInstance = await KlarnaSDKConstructor(sdkConfig);

      logEvent('SDK Initialized', 'success');

      // Listen for token updates
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        klarnaInstance.Network.Session.on('tokenupdate', (token: any) => {
          logEvent('Network Session Token Updated', 'info', { klarnaNetworkSessionToken: token });
        });
      } catch {
        // Network.Session may not be available
      }

      klarnaRef.current = klarnaInstance;

      // Expose for debugging
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).klarna = klarnaInstance;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logEvent('SDK Initialization Error', 'error', { error: message });
    }
  }, [clientId, sdkToken, partnerAccountId, partnerMode, locale, clearPlacement, logEvent]);

  // ============================================================================
  // CSS STYLE INJECTION
  // ============================================================================

  const updateDynamicStyles = useCallback(() => {
    if (!dynamicStyleRef.current) return;

    const stylesByPart: Record<string, string[]> = {};

    // Collect from partStyles state
    Object.entries(partStyles).forEach(([part, properties]) => {
      Object.entries(properties).forEach(([prop, value]) => {
        if (value.trim()) {
          if (!stylesByPart[part]) stylesByPart[part] = [];
          stylesByPart[part].push(`${prop}: ${value.trim()};`);
        }
      });
    });

    // Apply badge alignment special case
    if (badgeAlignment) {
      const isLeft = badgeAlignment === 'left';
      if (!stylesByPart['osm-container']) stylesByPart['osm-container'] = [];
      if (!stylesByPart['osm-message']) stylesByPart['osm-message'] = [];
      stylesByPart['osm-container'].push(`flex-direction: ${isLeft ? 'row' : 'row-reverse'};`);
      stylesByPart['osm-message'].push(`margin-left: ${isLeft ? '14px' : '0px'};`);
      stylesByPart['osm-message'].push(`margin-right: ${isLeft ? '0px' : '14px'};`);
    }

    // Generate CSS string
    let css = '';
    Object.entries(stylesByPart).forEach(([part, declarations]) => {
      css += `#messaging-placement::part(${part}) {\n  ${declarations.join('\n  ')}\n}\n\n`;
    });

    dynamicStyleRef.current.textContent = css;
  }, [partStyles, badgeAlignment]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initialize client-side state
  useEffect(() => {
    setIsMounted(true);
    setCurrentOrigin(window.location.origin);
    const storedEvents = loadEventLogFromStorage();
    if (storedEvents.length > 0) {
      setEventLog(storedEvents);
    }

    // Create dynamic style element
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-osm-dynamic', 'true');
    document.head.appendChild(styleEl);
    dynamicStyleRef.current = styleEl;

    return () => {
      if (dynamicStyleRef.current && dynamicStyleRef.current.parentNode) {
        dynamicStyleRef.current.parentNode.removeChild(dynamicStyleRef.current);
      }
    };
  }, []);

  // Save event log to localStorage
  useEffect(() => {
    saveEventLogToStorage(eventLog);
  }, [eventLog]);

  // Auto-reset locale when country changes
  useEffect(() => {
    const locales = COUNTRY_MAPPING[country]?.locales || ['en-US'];
    if (!locales.includes(locale)) {
      setLocale(locales[0]);
    }
  }, [country, locale]);

  // SDK initialization (debounced)
  useEffect(() => {
    if (!isMounted) return;
    if (!clientId.trim()) return;

    if (sdkInitTimerRef.current) {
      clearTimeout(sdkInitTimerRef.current);
    }

    sdkInitTimerRef.current = setTimeout(async () => {
      await initializeSDK();
      // After SDK init, render placement
      // Small delay to ensure SDK is ready
      setTimeout(() => {
        renderPlacement();
      }, 100);
    }, 500);

    return () => {
      if (sdkInitTimerRef.current) {
        clearTimeout(sdkInitTimerRef.current);
      }
    };
  }, [isMounted, clientId, sdkToken, partnerAccountId, partnerMode, initializeSDK, renderPlacement]);

  // Re-render placement when config changes (not SDK config)
  useEffect(() => {
    if (!isMounted || !klarnaRef.current) return;
    renderPlacement();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placementKey, amount, locale, theme, messagePrefix]);

  // Update dynamic CSS
  useEffect(() => {
    updateDynamicStyles();
  }, [updateDynamicStyles]);

  // Cleanup
  useEffect(() => {
    return () => {
      clearPlacement();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handlePartnerModeToggle = (checked: boolean) => {
    setPartnerMode(checked);
    if (!checked) {
      // Switching to sub-partner mode: set default client ID if empty
      if (!clientId.trim()) {
        setClientId(DEFAULT_SUB_PARTNER_CLIENT_ID);
      }
    } else {
      // Switching to acquiring partner mode: clear default sub-partner client ID
      if (clientId === DEFAULT_SUB_PARTNER_CLIENT_ID) {
        setClientId('');
      }
    }
  };

  const handlePartStyleChange = (part: string, prop: string, value: string) => {
    setPartStyles((prev) => ({
      ...prev,
      [part]: {
        ...(prev[part] || {}),
        [prop]: value,
      },
    }));
  };

  const resetAllStyles = () => {
    setPartStyles({});
    setBadgeAlignment('');
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Suppress hydration warnings for dynamic content
  if (!isMounted) {
    return <div className={styles.container} />;
  }

  return (
    <div className={styles.container}>
      {/* Main Row - Placement + Observer */}
      <div className={styles.mainRow} style={{ marginBottom: 20 }}>
        {/* Placement Display */}
        <div className={styles.placementContainer}>
          <h3 style={{ marginTop: 0 }}>
            Placement: <span style={{ fontWeight: 400, color: '#6f6b7a' }}>{placementKey}</span>
          </h3>
          <div className={styles.placementContent}>
            <div id="messaging-placement" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Observer Panel */}
        <div className={styles.observerPanel}>
          <h3 style={{ marginTop: 0 }}>Observer</h3>

          <div className={styles.codeBlock}>
            <div className={styles.codeLabel}>SDK Initialization</div>
            <pre className={styles.codeContent}>{observerCode.sdkCode}</pre>
          </div>

          <div className={styles.codeBlock}>
            <div className={styles.codeLabel}>Placement</div>
            <pre className={styles.codeContent}>{observerCode.placementCode}</pre>
          </div>

          <div className={styles.codeBlock}>
            <div className={styles.codeLabel}>HTML</div>
            <pre className={styles.codeContent}>{observerCode.htmlCode}</pre>
          </div>

          {observerCode.cssCode && (
            <div className={styles.codeBlock}>
              <div className={styles.codeLabel}>CSS</div>
              <pre className={styles.codeContent}>{observerCode.cssCode}</pre>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Row - 3 panels */}
      <div className={styles.configRow}>
        {/* SDK Configuration Panel */}
        <div className={styles.configPanel}>
          <div className={styles.config}>
            <div
              className={styles.collapsibleHeader}
              onClick={() => setSdkPanelOpen(!sdkPanelOpen)}
            >
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>SDK Configuration</h3>
              <span className={`${styles.collapseIcon} ${!sdkPanelOpen ? styles.collapsed : ''}`}>▼</span>
            </div>
            <div className={`${styles.collapsibleContent} ${!sdkPanelOpen ? styles.collapsed : ''}`}>
              <div className={styles.toggleContainer} style={{ marginTop: 12 }}>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={partnerMode}
                    onChange={(e) => handlePartnerModeToggle(e.target.checked)}
                  />
                  <span className={styles.toggleSlider} />
                </label>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{partnerMode ? 'Acquiring Partner Mode' : 'Sub-Partner Mode'}</span>
              </div>

              {partnerMode && (
                <div className={styles.field}>
                  <label htmlFor="osm-partner-account-id">Partner Account ID</label>
                  <input
                    id="osm-partner-account-id"
                    type="text"
                    placeholder="krn:partner:global:account:live:XXXXXXXX"
                    value={partnerAccountId}
                    onChange={(e) => setPartnerAccountId(e.target.value)}
                  />
                </div>
              )}

              <div className={styles.field}>
                <label htmlFor="osm-client-id">Client ID *</label>
                <input
                  id="osm-client-id"
                  type="text"
                  placeholder="klarna_test_client_..."
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="osm-sdk-token">SDK Token</label>
                <input
                  id="osm-sdk-token"
                  type="text"
                  placeholder="Optional SDK token"
                  value={sdkToken}
                  onChange={(e) => setSdkToken(e.target.value)}
                />
              </div>

              <div className={styles.infoBanner} style={{ marginTop: 8, marginBottom: 0 }}>
                <div className={styles.infoIcon}>ℹ️</div>
                <div className={styles.infoContent}>
                  {partnerMode ? (
                    <>
                      The partner account must be onboarded with{' '}
                      <code>store_groups[].stores[].type = WEBSITE</code> and <code>store_groups[].stores[].url</code> set to{' '}
                      <code>{currentOrigin || 'this origin'}</code>
                    </>
                  ) : (
                    <>
                      <code>{currentOrigin || 'this origin'}</code> must be registered as an allowed origin in the
                      Klarna Partner Portal. Navigate to Settings → Client Identifier → Allowed Origins.
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Configuration Panel */}
        <div className={styles.configPanel}>
          <div className={styles.config}>
            <div
              className={styles.collapsibleHeader}
              onClick={() => setPaymentPanelOpen(!paymentPanelOpen)}
            >
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>
                Payment Configuration
                <span className={styles.pill}>{currency}</span>
              </h3>
              <span className={`${styles.collapseIcon} ${!paymentPanelOpen ? styles.collapsed : ''}`}>▼</span>
            </div>
            <div className={`${styles.collapsibleContent} ${!paymentPanelOpen ? styles.collapsed : ''}`}>
              <div className={styles.field} style={{ marginTop: 12 }}>
                <label htmlFor="osm-country">Country</label>
                <select
                  id="osm-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  {Object.keys(COUNTRY_MAPPING).map((code) => (
                    <option key={code} value={code}>
                      {code} ({COUNTRY_MAPPING[code].currency})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="osm-locale">Locale</label>
                <select
                  id="osm-locale"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                >
                  {availableLocales.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="osm-amount">Amount (minor units)</label>
                <input
                  id="osm-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Messaging Configuration Panel */}
        <div className={styles.configPanel}>
          <div className={styles.config}>
            <div
              className={styles.collapsibleHeader}
              onClick={() => setMessagingPanelOpen(!messagingPanelOpen)}
            >
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>Messaging Configuration</h3>
              <span className={`${styles.collapseIcon} ${!messagingPanelOpen ? styles.collapsed : ''}`}>▼</span>
            </div>
            <div className={`${styles.collapsibleContent} ${!messagingPanelOpen ? styles.collapsed : ''}`}>
              <div className={styles.field} style={{ marginTop: 12 }}>
                <label htmlFor="osm-placement-key">Placement Key</label>
                <select
                  id="osm-placement-key"
                  value={placementKey}
                  onChange={(e) => setPlacementKey(e.target.value)}
                >
                  {PLACEMENT_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="osm-theme">Theme</label>
                <select
                  id="osm-theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                >
                  <option value="default">default</option>
                  <option value="dark">dark</option>
                  <option value="light">light</option>
                </select>
              </div>

              <div className={styles.field}>
                <label htmlFor="osm-message-prefix">Message Prefix</label>
                <input
                  id="osm-message-prefix"
                  type="text"
                  placeholder="Optional prefix text"
                  value={messagePrefix}
                  onChange={(e) => setMessagePrefix(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Customization Panel - Full Width */}
      <div className={styles.configRow}>
        <div className={styles.fullWidthPanel}>
          <div className={styles.config}>
            <div
              className={styles.collapsibleHeader}
              onClick={() => setCssPanelOpen(!cssPanelOpen)}
            >
              <h3 style={{ marginTop: 0, marginBottom: 0 }}>CSS Customization (::part API)</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {activeParts.length > 0 && (
                  <button className={styles.resetButton} onClick={(e) => { e.stopPropagation(); resetAllStyles(); }}>
                    Reset All Styles
                  </button>
                )}
                <span className={`${styles.collapseIcon} ${!cssPanelOpen ? styles.collapsed : ''}`}>▼</span>
              </div>
            </div>
            <div className={`${styles.collapsibleContent} ${!cssPanelOpen ? styles.collapsed : ''}`}>
              {activeParts.length === 0 ? (
                <div className={styles.noCustomization}>
                  This placement type does not expose CSS parts for customization.
                </div>
              ) : (
                <div className={styles.partsGrid}>
                  {activeParts.map((shortName) => {
                    const fullName = PART_SHORT_TO_FULL[shortName];
                    if (!fullName) return null;
                    const inputs = CSS_INPUTS_BY_PART[fullName];
                    if (!inputs) return null;

                    return (
                      <div key={shortName} className={styles.partSection}>
                        <div className={styles.partHeader}>::part({fullName})</div>
                        {inputs.map((input) => (
                          <div key={input.id} className={styles.field}>
                            <label htmlFor={input.id}>{input.label}</label>
                            <input
                              id={input.id}
                              type="text"
                              placeholder={input.placeholder}
                              value={partStyles[input.part]?.[input.prop] || ''}
                              onChange={(e) => handlePartStyleChange(input.part, input.prop, e.target.value)}
                            />
                          </div>
                        ))}
                        {/* Badge alignment special case */}
                        {shortName === 'badge' && (
                          <div className={styles.field}>
                            <label htmlFor="css-badge-align">Badge Alignment</label>
                            <select
                              id="css-badge-align"
                              value={badgeAlignment}
                              onChange={(e) => setBadgeAlignment(e.target.value)}
                            >
                              <option value="">Default</option>
                              <option value="left">Left</option>
                              <option value="right">Right</option>
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className={styles.cssInfo}>
                Styles are applied via the CSS <code>::part()</code> API on the web component shadow DOM.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Log - Full Width */}
      <div className={styles.eventLog}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Event Log</h3>
          <button onClick={clearLog} className={styles.clearButton}>
            Clear
          </button>
        </div>
        <div className={styles.eventLogContent}>
          {eventLog.length === 0 ? (
            <p style={{ color: '#6f6b7a', fontSize: 12 }}>Events will appear here...</p>
          ) : (
            eventLog.map((event) => (
              <div key={event.id} className={styles.eventItem}>
                <div
                  className={styles.eventTitle}
                  style={{
                    color:
                      event.type === 'error'
                        ? '#f44336'
                        : event.type === 'success'
                          ? '#4caf50'
                          : event.type === 'warning'
                            ? '#ff9800'
                            : '#0b051d',
                  }}
                >
                  {event.type === 'error' && '✗ '}
                  {event.type === 'success' && '✓ '}
                  {event.type === 'warning' && '⚠ '}
                  {event.title}
                </div>
                <div className={styles.eventTime}>{event.timestamp.toLocaleTimeString()}</div>
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
