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
type PaymentPresentation = any;

type FlowState = 'IDLE' | 'INITIALIZING' | 'READY' | 'AUTHORIZING' | 'STEP_UP' | 'COMPLETING' | 'SUCCESS' | 'ERROR';

export interface MiniPaymentDemoRef {
  initializeSDK: () => Promise<void>;
  pushEvent: (title: string, type: 'info' | 'success' | 'error' | 'warning') => void;
  markCompleted: () => void;
}

interface MiniPaymentDemoProps {
  mode: 'ap-hosted' | 'server-side';
  onEvent?: (event: EventLogItem) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const AP_CLIENT_ID = 'klarna_test_client_SyVDdUcvcTQhQjUkVEhyRFgzWFhxRU4xRHdjZVE4UTUsMmVkZGVlNzMtNGIyMy00MzQyLTgxZmItYWEzMzFkYWM1OTU2LDEsVXhrQ3N5UzNQbVJ5UkdJS1VKeHV0MDg5RDUyOUVCTE94ck8yaVpjVXRPWT0';
const SP_CLIENT_ID = 'klarna_test_client_L0ZwWW55akg3MjUzcmgyP1RuP3A_KEdIJFBINUxzZXMsOGU5M2NmZGItNmFiOC00ZjQ3LWFhMGMtZDI4NTE1OGU0MTNmLDEsQ3VNRmtmdlpHd1VIRmdDT1Q0Zkh2ZkJ1YkxETy9ZTGFiYUZvYVJ4ZTAyYz0';
const DEFAULT_PARTNER_ACCOUNT_ID = 'krn:partner:global:account:test:MKPMV6MS';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// ============================================================================
// COMPONENT
// ============================================================================

const MiniPaymentDemo = forwardRef<MiniPaymentDemoRef, MiniPaymentDemoProps>(
  function MiniPaymentDemo({ mode, onEvent }, ref) {
    const [flowState, setFlowState] = useState<FlowState>('IDLE');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [events, setEvents] = useState<EventLogItem[]>([]);
    const [showConfig, setShowConfig] = useState(false);
    const [clientId, setClientId] = useState(mode === 'ap-hosted' ? AP_CLIENT_ID : SP_CLIENT_ID);
    const [partnerAccountId] = useState(DEFAULT_PARTNER_ACCOUNT_ID);
    const [currentOrigin, setCurrentOrigin] = useState('');

    const buttonWrapperRef = useRef<HTMLDivElement>(null);
    const mountedButtonRef = useRef<PaymentPresentation>(null);
    const sdkMountIdRef = useRef<string>(`mini-payment-${mode}-${Date.now()}`);
    const presentationRef = useRef<PaymentPresentation>(null);
    const finalAuthInProgressRef = useRef(false);

    useEffect(() => {
      setCurrentOrigin(window.location.origin);
      sdkMountIdRef.current = `mini-payment-${mode}-${Date.now()}`;
    }, [mode]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (mountedButtonRef.current) {
          try {
            if (typeof mountedButtonRef.current.unmount === 'function') {
              mountedButtonRef.current.unmount();
            }
          } catch { /* ignore */ }
        }
        const el = document.getElementById(sdkMountIdRef.current);
        if (el?.parentNode) el.parentNode.removeChild(el);
      };
    }, []);

    const logEvent = useCallback((title: string, type: EventLogItem['type']) => {
      const event: EventLogItem = { id: generateId(), title, type };
      setEvents(prev => [event, ...prev].slice(0, 15));
      onEvent?.(event);
    }, [onEvent]);

    const clearSdkMount = useCallback(() => {
      if (mountedButtonRef.current) {
        try {
          if (typeof mountedButtonRef.current.unmount === 'function') {
            mountedButtonRef.current.unmount();
          }
        } catch { /* ignore */ }
        mountedButtonRef.current = null;
      }
      const el = document.getElementById(sdkMountIdRef.current);
      if (el?.parentNode) el.parentNode.removeChild(el);
    }, []);

    const authorizePayment = useCallback(async (
      paymentOptionId?: string,
      klarnaNetworkSessionToken?: string,
    ) => {
      const response = await fetch('/api/payment/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerAccountId,
          currency: 'USD',
          amount: 10000,
          paymentOptionId,
          paymentTransactionReference: `tx_${Date.now()}_${generateId()}`,
          paymentRequestReference: `pr_${Date.now()}_${generateId()}`,
          returnUrl: `${currentOrigin}/payments?status=complete&flow=${mode}`,
          klarnaNetworkSessionToken,
          supplementaryPurchaseData: {
            purchaseReference: `purchase_${Date.now()}`,
            lineItems: [{ name: 'Demo Item', quantity: 1, totalAmount: 10000, unitPrice: 10000 }],
          },
        }),
      });
      return response.json();
    }, [partnerAccountId, currentOrigin, mode]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleInitiate = useCallback(async (): Promise<any> => {
      const paymentOptionId = presentationRef.current?.paymentOption?.paymentOptionId;

      logEvent('Button clicked - calling authorize API', 'info');
      setFlowState('AUTHORIZING');
      setErrorMessage(null);

      // Call /api/payment/authorize (initial auth, no session token)
      const result = await authorizePayment(paymentOptionId);

      if (!result.success || !result.data) {
        const errorMsg = result.error || 'Authorization failed';
        setFlowState('ERROR');
        setErrorMessage(errorMsg);
        logEvent(`Authorization error: ${errorMsg}`, 'error');
        throw new Error(errorMsg);
      }

      logEvent(`Authorize result: ${result.data.result}`, result.data.result === 'DECLINED' ? 'error' : 'info');

      switch (result.data.result) {
        case 'APPROVED':
          setFlowState('SUCCESS');
          logEvent('Payment approved (no step-up needed)', 'success');
          return { returnUrl: `${currentOrigin}/payments?status=approved&flow=${mode}` };

        case 'STEP_UP_REQUIRED': {
          const paymentRequestId = result.data.paymentRequest?.paymentRequestId;
          if (!paymentRequestId) {
            const msg = 'No paymentRequestId returned';
            setFlowState('ERROR');
            setErrorMessage(msg);
            throw new Error(msg);
          }
          setFlowState('STEP_UP');
          logEvent('Step-up required - launching Klarna journey', 'info');
          return { paymentRequestId };
        }

        case 'DECLINED': {
          const msg = result.data.resultReason || 'Payment declined';
          setFlowState('ERROR');
          setErrorMessage(msg);
          throw new Error(msg);
        }

        default: {
          const msg = `Unknown result: ${result.data.result}`;
          setFlowState('ERROR');
          setErrorMessage(msg);
          throw new Error(msg);
        }
      }
    }, [authorizePayment, currentOrigin, mode, logEvent]);

    const attachEventHandlers = useCallback((klarnaInstance: KlarnaSDKType) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      klarnaInstance.Payment.on('complete', async (paymentRequest: any) => {
        if (finalAuthInProgressRef.current) return true;
        finalAuthInProgressRef.current = true;

        const sessionToken = paymentRequest.stateContext?.klarna_network_session_token ||
                            paymentRequest.stateContext?.klarnaNetworkSessionToken;

        if (sessionToken) {
          logEvent('Journey complete - session token received', 'success');
          setFlowState('COMPLETING');

          // Final authorization with session token
          try {
            const result = await authorizePayment(undefined, sessionToken);
            if (result.success && result.data?.result === 'APPROVED') {
              setFlowState('SUCCESS');
              logEvent('Final authorization approved!', 'success');
            } else {
              throw new Error(result.error || 'Final authorization failed');
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            setFlowState('ERROR');
            setErrorMessage(msg);
            logEvent(`Final auth failed: ${msg}`, 'error');
          }
        } else {
          setFlowState('SUCCESS');
          logEvent('Payment completed', 'success');
        }
        return true;
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      klarnaInstance.Payment.on('abort', (_paymentRequest: any) => {
        logEvent('Payment cancelled', 'warning');
        setFlowState('READY');
        setErrorMessage('Payment was cancelled');
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      klarnaInstance.Payment.on('error', (error: any) => {
        logEvent(`SDK error: ${error?.message || 'Unknown'}`, 'error');
        setFlowState('ERROR');
        setErrorMessage(error?.message || 'An error occurred');
      });
    }, [authorizePayment, logEvent]);

    const initializeSDK = useCallback(async () => {
      if (!clientId.trim()) {
        setErrorMessage('Client ID is required');
        setFlowState('ERROR');
        return;
      }

      setFlowState('INITIALIZING');
      setErrorMessage(null);
      finalAuthInProgressRef.current = false;
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

        // Build config - key difference: AP Hosted includes partnerAccountId
        const sdkConfig: Record<string, unknown> = {
          clientId: clientId.trim(),
          products: ['PAYMENT'],
        };
        if (mode === 'ap-hosted') {
          sdkConfig.partnerAccountId = partnerAccountId.trim();
        }

        const klarnaInstance = await KlarnaSDK(sdkConfig);
        logEvent('SDK initialized', 'success');

        attachEventHandlers(klarnaInstance);

        // Get presentation
        const presentationResult = await klarnaInstance.Payment.presentation({
          amount: 10000,
          currency: 'USD',
          locale: 'en-US',
          intents: ['PAY'],
        });
        presentationRef.current = presentationResult;
        logEvent('Payment presentation received', 'success');

        // Mount button
        if (buttonWrapperRef.current && presentationResult?.paymentOption) {
          clearSdkMount();
          sdkMountIdRef.current = `mini-payment-${mode}-${Date.now()}`;
          const mountTarget = document.createElement('div');
          mountTarget.id = sdkMountIdRef.current;
          mountTarget.style.cssText = 'width: 100%;';
          buttonWrapperRef.current.appendChild(mountTarget);

          const buttonInstance = presentationResult.paymentOption.paymentButton
            .component({
              shape: 'pill',
              theme: 'default',
              locale: 'en-US',
              intents: ['PAY'],
              initiationMode: 'DEVICE_BEST',
              initiate: handleInitiate,
            })
            .mount(mountTarget);

          mountedButtonRef.current = buttonInstance;
          logEvent('Payment button mounted', 'success');
          setFlowState('READY');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setFlowState('ERROR');
        setErrorMessage(`SDK init failed: ${message}`);
        logEvent(`Init error: ${message}`, 'error');
      }
    }, [clientId, partnerAccountId, mode, attachEventHandlers, handleInitiate, clearSdkMount, logEvent]);

    // Expose initializeSDK, pushEvent, and markCompleted for sequence diagram integration
    useImperativeHandle(ref, () => ({
      initializeSDK,
      pushEvent: (title: string, type: EventLogItem['type']) => {
        logEvent(title, type);
      },
      markCompleted: () => {
        setFlowState('SUCCESS');
        logEvent('Payment completed (returned from Klarna journey)', 'success');
      },
    }), [initializeSDK, logEvent]);

    const resetFlow = useCallback(() => {
      setFlowState('IDLE');
      setErrorMessage(null);
      presentationRef.current = null;
      finalAuthInProgressRef.current = false;
      clearSdkMount();
      logEvent('Flow reset', 'info');
    }, [clearSdkMount, logEvent]);

    const inputClasses = 'w-full border border-gray-300 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-gray-400';

    return (
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Live Demo — {mode === 'ap-hosted' ? 'AP Hosted' : 'Server-side'}
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
            {mode === 'ap-hosted' && (
              <div>
                <label className="text-[10px] font-medium text-gray-400 uppercase">Partner Account ID</label>
                <input
                  type="text"
                  className={inputClasses}
                  value={partnerAccountId}
                  disabled
                />
              </div>
            )}
          </div>
        )}

        {/* Demo area */}
        <div className="px-4 py-4">
          {/* Amount display */}
          <div className="text-center mb-3">
            <div className="text-xs text-gray-500">Demo amount</div>
            <div className="text-lg font-bold text-gray-900">$100.00</div>
          </div>

          {/* Button area */}
          <div className="min-h-[48px] flex items-center justify-center mb-3 relative">
            {(flowState === 'IDLE' || flowState === 'ERROR') && (
              <button
                onClick={initializeSDK}
                className="bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-gray-800 transition-colors w-full"
              >
                Initialize SDK
              </button>
            )}
            {flowState === 'INITIALIZING' && (
              <div className="text-xs text-gray-500 animate-pulse">Loading Klarna SDK...</div>
            )}
            {flowState === 'SUCCESS' && (
              <div className="text-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-sm font-medium text-green-700">Payment Approved</div>
                <button onClick={resetFlow} className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline">
                  Try again
                </button>
              </div>
            )}
            {/* SDK Mount Target - always in DOM so SDK can mount during INITIALIZING */}
            <div
              ref={buttonWrapperRef}
              style={{
                width: '100%',
                display: flowState === 'READY' || flowState === 'AUTHORIZING' || flowState === 'STEP_UP' || flowState === 'COMPLETING' ? 'block' : 'none',
              }}
            />
          </div>

          {/* Status */}
          {errorMessage && (
            <div className="text-xs text-red-500 text-center mb-2">{errorMessage}</div>
          )}
          {(flowState === 'AUTHORIZING' || flowState === 'STEP_UP' || flowState === 'COMPLETING') && (
            <div className="text-xs text-blue-500 text-center mb-2 animate-pulse">
              {flowState === 'AUTHORIZING' ? 'Authorizing...' : flowState === 'STEP_UP' ? 'Customer in Klarna journey...' : 'Final authorization...'}
            </div>
          )}

          {flowState !== 'IDLE' && flowState !== 'SUCCESS' && flowState !== 'INITIALIZING' && (
            <div className="text-center">
              <button onClick={resetFlow} className="text-[10px] text-gray-400 hover:text-gray-600 underline">
                Reset
              </button>
            </div>
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

export default MiniPaymentDemo;
