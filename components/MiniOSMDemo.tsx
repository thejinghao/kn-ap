'use client';

import React, { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface EventLogItem {
  id: string;
  title: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KlarnaSDKType = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlacementType = any;

type FlowState = 'IDLE' | 'INITIALIZING' | 'READY' | 'ERROR';

export interface MiniOSMDemoRef {
  initializeSDK: () => Promise<void>;
  pushEvent: (title: string, type: 'info' | 'success' | 'error' | 'warning') => void;
}

interface MiniOSMDemoProps {
  onEvent?: (event: EventLogItem) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CLIENT_ID = 'klarna_test_client_L0ZwWW55akg3MjUzcmgyP1RuP3A_KEdIJFBINUxzZXMsOGU5M2NmZGItNmFiOC00ZjQ3LWFhMGMtZDI4NTE1OGU0MTNmLDEsQ3VNRmtmdlpHd1VIRmdDT1Q0Zkh2ZkJ1YkxETy9ZTGFiYUZvYVJ4ZTAyYz0';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// ============================================================================
// COMPONENT
// ============================================================================

const MiniOSMDemo = forwardRef<MiniOSMDemoRef, MiniOSMDemoProps>(
  function MiniOSMDemo({ onEvent }, ref) {
    const [flowState, setFlowState] = useState<FlowState>('IDLE');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [events, setEvents] = useState<EventLogItem[]>([]);
    const [showConfig, setShowConfig] = useState(false);
    const [clientId, setClientId] = useState(DEFAULT_CLIENT_ID);
    const [placementKey, setPlacementKey] = useState('credit-promotion-badge');
    const [amount, setAmount] = useState(7999);
    const [theme, setTheme] = useState('default');

    const klarnaRef = useRef<KlarnaSDKType>(null);
    const activePlacementRef = useRef<PlacementType>(null);
    const mountIdRef = useRef<string>(`mini-osm-${Date.now()}`);

    useEffect(() => {
      mountIdRef.current = `mini-osm-${Date.now()}`;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (activePlacementRef.current) {
          try {
            activePlacementRef.current.unmount();
          } catch { /* ignore */ }
        }
      };
    }, []);

    const logEvent = useCallback((title: string, type: EventLogItem['type']) => {
      const event: EventLogItem = { id: generateId(), title, type };
      setEvents(prev => [event, ...prev].slice(0, 15));
      onEvent?.(event);
    }, [onEvent]);

    const clearPlacement = useCallback(() => {
      if (activePlacementRef.current) {
        try {
          activePlacementRef.current.unmount();
        } catch { /* ignore */ }
        activePlacementRef.current = null;
      }
      const container = document.getElementById(mountIdRef.current);
      if (container) container.innerHTML = '';
    }, []);

    const initializeSDK = useCallback(async () => {
      if (!clientId.trim()) {
        setErrorMessage('Client ID is required');
        setFlowState('ERROR');
        return;
      }

      setFlowState('INITIALIZING');
      setErrorMessage(null);
      logEvent('Initializing Klarna SDK...', 'info');

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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const KlarnaModule = await (Function('return import("https://js.klarna.com/web-sdk/v2/klarna.mjs")')() as Promise<any>);
        const { KlarnaSDK } = KlarnaModule;

        const klarnaInstance = await KlarnaSDK({
          clientId: clientId.trim(),
          products: ['MESSAGING'],
          locale: 'en-US',
        });

        klarnaRef.current = klarnaInstance;
        logEvent('SDK initialized', 'success');

        // Clear existing and mount placement
        clearPlacement();

        const config = {
          key: placementKey,
          amount,
          locale: 'en-US',
          theme,
          id: mountIdRef.current,
        };

        logEvent('Mounting messaging placement...', 'info');
        activePlacementRef.current = klarnaInstance.Messaging.placement(config);
        activePlacementRef.current.mount(`#${mountIdRef.current}`);

        logEvent('Messaging placement mounted', 'success');
        setFlowState('READY');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setFlowState('ERROR');
        setErrorMessage(`SDK init failed: ${message}`);
        logEvent(`Init error: ${message}`, 'error');
      }
    }, [clientId, placementKey, amount, theme, clearPlacement, logEvent]);

    // Expose initializeSDK and pushEvent for sequence diagram integration
    useImperativeHandle(ref, () => ({
      initializeSDK,
      pushEvent: (title: string, type: EventLogItem['type']) => {
        logEvent(title, type);
      },
    }), [initializeSDK, logEvent]);

    const resetFlow = useCallback(() => {
      setFlowState('IDLE');
      setErrorMessage(null);
      clearPlacement();
      klarnaRef.current = null;
      logEvent('Flow reset', 'info');
    }, [clearPlacement, logEvent]);

    const inputClasses = 'w-full border border-gray-300 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-gray-400';

    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Live Demo — On-Site Messaging
          </span>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showConfig ? 'Hide config' : 'Show config'}
          </button>
        </div>

        {/* Config (collapsed by default) */}
        {showConfig && (
          <div className="px-4 py-3 border-b border-gray-100 space-y-2">
            <div>
              <label className="text-[10px] font-medium text-gray-400 uppercase">Client ID</label>
              <input
                type="text"
                className={inputClasses}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={flowState !== 'IDLE' && flowState !== 'ERROR'}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-medium text-gray-400 uppercase">Placement Key</label>
                <select
                  className={inputClasses}
                  value={placementKey}
                  onChange={(e) => setPlacementKey(e.target.value)}
                  disabled={flowState !== 'IDLE' && flowState !== 'ERROR'}
                >
                  <option value="credit-promotion-badge">credit-promotion-badge</option>
                  <option value="credit-promotion-auto-size">credit-promotion-auto-size</option>
                  <option value="top-strip-promotion-badge">top-strip-promotion-badge</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-medium text-gray-400 uppercase">Theme</label>
                <select
                  className={inputClasses}
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  disabled={flowState !== 'IDLE' && flowState !== 'ERROR'}
                >
                  <option value="default">default</option>
                  <option value="dark">dark</option>
                  <option value="light">light</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-400 uppercase">Amount (cents)</label>
              <input
                type="number"
                className={inputClasses}
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
                disabled={flowState !== 'IDLE' && flowState !== 'ERROR'}
              />
            </div>
          </div>
        )}

        {/* Demo area */}
        <div className="px-4 py-4">
          {flowState === 'IDLE' || flowState === 'ERROR' ? (
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-2">Amount: ${(amount / 100).toFixed(2)}</div>
              <button
                onClick={initializeSDK}
                className="bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-gray-800 transition-colors w-full"
              >
                Initialize & Show Messaging
              </button>
            </div>
          ) : flowState === 'INITIALIZING' ? (
            <div className="text-xs text-gray-500 animate-pulse text-center py-4">Loading Klarna SDK...</div>
          ) : (
            <div>
              {/* Messaging placement mount target */}
              <div id={mountIdRef.current} style={{ width: '100%', minHeight: '60px' }} />
              <div className="text-center mt-3">
                <button onClick={resetFlow} className="text-[10px] text-gray-400 hover:text-gray-600 underline">
                  Reset
                </button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="text-xs text-red-500 text-center mt-2">{errorMessage}</div>
          )}
        </div>

        {/* Event log */}
        {events.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <div className="text-[10px] font-medium text-gray-400 uppercase mb-1">Events</div>
            <div className="space-y-0.5">
              {events.map((event) => (
                <div key={event.id} className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    event.type === 'success' ? 'bg-green-400' :
                    event.type === 'error' ? 'bg-red-400' :
                    event.type === 'warning' ? 'bg-amber-400' :
                    'bg-gray-300'
                  }`} />
                  <span className="text-[11px] text-gray-600 truncate">{event.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default MiniOSMDemo;
