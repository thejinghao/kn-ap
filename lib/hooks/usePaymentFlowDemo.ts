'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import type {
  FlowState,
  FlowEvent,
  FlowEventName,
  StepDetail,
  UsePaymentFlowOptions,
  UsePaymentFlowReturn,
  AuthorizeResponse,
} from '@/lib/types/payment-flow';
import { STEP_ID_MAP } from '@/lib/payment-flow-steps';

// ============================================================================
// CONSTANTS
// ============================================================================

const AP_CLIENT_ID = 'klarna_test_client_SyVDdUcvcTQhQjUkVEhyRFgzWFhxRU4xRHdjZVE4UTUsMmVkZGVlNzMtNGIyMy00MzQyLTgxZmItYWEzMzFkYWM1OTU2LDEsVXhrQ3N5UzNQbVJ5UkdJS1VKeHV0MDg5RDUyOUVCTE94ck8yaVpjVXRPWT0';
const SP_CLIENT_ID = 'klarna_test_client_L0ZwWW55akg3MjUzcmgyP1RuP3A_KEdIJFBINUxzZXMsOGU5M2NmZGItNmFiOC00ZjQ3LWFhMGMtZDI4NTE1OGU0MTNmLDEsQ3VNRmtmdlpHd1VIRmdDT1Q0Zkh2ZkJ1YkxETy9ZTGFiYUZvYVJ4ZTAyYz0';
const DEFAULT_PARTNER_ACCOUNT_ID = 'krn:partner:global:account:test:MKPMV6MS';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KlarnaSDKType = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PaymentPresentation = any;

// ============================================================================
// HOOK
// ============================================================================

export function usePaymentFlowDemo(options: UsePaymentFlowOptions): UsePaymentFlowReturn {
  const {
    mode,
    clientId: clientIdProp,
    partnerAccountId: partnerAccountIdProp,
    amount = 10000,
    returnUrl: returnUrlProp,
    onFlowEvent,
  } = options;

  const clientId = clientIdProp || (mode === 'ap-hosted' ? AP_CLIENT_ID : SP_CLIENT_ID);
  const partnerAccountId = partnerAccountIdProp || DEFAULT_PARTNER_ACCOUNT_ID;

  const [flowState, setFlowState] = useState<FlowState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentOrigin, setCurrentOrigin] = useState('');

  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const mountedButtonRef = useRef<PaymentPresentation>(null);
  const sdkMountIdRef = useRef<string>(`flow-${mode}-${Date.now()}`);
  const presentationRef = useRef<PaymentPresentation>(null);
  const finalAuthInProgressRef = useRef(false);
  const onFlowEventRef = useRef(onFlowEvent);

  // Keep the callback ref up to date
  useEffect(() => {
    onFlowEventRef.current = onFlowEvent;
  }, [onFlowEvent]);

  useEffect(() => {
    setCurrentOrigin(window.location.origin);
    sdkMountIdRef.current = `flow-${mode}-${Date.now()}`;
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

  const stepMap = STEP_ID_MAP[mode];

  const emit = useCallback((name: FlowEventName, detail: StepDetail) => {
    const stepId = stepMap[name];
    if (!stepId) return;
    onFlowEventRef.current({ name, stepId, detail });
  }, [stepMap]);

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

  const returnUrl = returnUrlProp || `${currentOrigin}/payments/${mode === 'ap-hosted' ? 'ap-hosted' : 'server-side'}?status=complete`;

  // ============================================================================
  // AUTHORIZE PAYMENT
  // ============================================================================

  const authorizePayment = useCallback(async (
    paymentOptionId?: string,
    klarnaNetworkSessionToken?: string,
  ): Promise<AuthorizeResponse> => {
    const response = await fetch('/api/payment/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerAccountId,
        currency: 'USD',
        amount,
        paymentOptionId,
        paymentTransactionReference: `tx_${Date.now()}_${generateId()}`,
        paymentRequestReference: `pr_${Date.now()}_${generateId()}`,
        returnUrl,
        klarnaNetworkSessionToken,
        supplementaryPurchaseData: {
          purchaseReference: `purchase_${Date.now()}`,
          lineItems: [{ name: 'Demo Item', quantity: 1, totalAmount: amount, unitPrice: amount }],
        },
      }),
    });
    return response.json();
  }, [partnerAccountId, amount, returnUrl]);

  // ============================================================================
  // INITIATE CALLBACK (when customer clicks the payment button)
  // ============================================================================

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInitiate = useCallback(async (): Promise<any> => {
    const paymentOptionId = presentationRef.current?.paymentOption?.paymentOptionId;

    // Step: Button clicked
    emit('button-clicked', { type: 'info', message: 'Customer clicked the Klarna payment button' });

    // Small delay for visual effect
    await new Promise(r => setTimeout(r, 200));

    // Step: SDK calls initiate
    emit('initiate-called', {
      type: 'event',
      name: 'initiate',
      data: { paymentOptionId },
    });

    setFlowState('AUTHORIZING');
    setErrorMessage(null);

    // Step: Authorize request
    const authBody = {
      currency: 'USD',
      amount,
      paymentOptionId,
      paymentTransactionReference: `tx_${Date.now()}`,
      returnUrl,
      supplementaryPurchaseData: {
        purchaseReference: `purchase_${Date.now()}`,
        lineItems: [{ name: 'Demo Item', quantity: 1, totalAmount: amount, unitPrice: amount }],
      },
    };

    emit('authorize-request', {
      type: 'api-request',
      method: 'POST',
      path: `/v2/accounts/${partnerAccountId}/payment/authorize`,
      body: authBody,
    });

    // Call the API
    const result = await authorizePayment(paymentOptionId);

    // Re-emit authorize-request with actual headers from the API response
    if (result.requestHeaders) {
      emit('authorize-request', {
        type: 'api-request',
        method: 'POST',
        path: `/v2/accounts/${partnerAccountId}/payment/authorize`,
        body: authBody,
        headers: result.requestHeaders,
      });
    }

    if (!result.success || !result.data) {
      const errorMsg = result.error || 'Authorization failed';
      emit('authorize-response', {
        type: 'api-response',
        status: 400,
        body: result.rawKlarnaResponse || { error: errorMsg },
        headers: result.responseHeaders,
      });
      setFlowState('ERROR');
      setErrorMessage(errorMsg);
      throw new Error(errorMsg);
    }

    // Step: Authorize response
    emit('authorize-response', {
      type: 'api-response',
      status: 200,
      body: result.rawKlarnaResponse || result.data,
      headers: result.responseHeaders,
    });

    switch (result.data.result) {
      case 'APPROVED':
        setFlowState('SUCCESS');
        emit('return-to-sdk', {
          type: 'code',
          language: 'javascript',
          code: `return { returnUrl: "${returnUrl.replace(/\?.*$/, '')}?status=approved" }`,
        });
        return { returnUrl: `${currentOrigin}${returnUrl.replace(/\?.*$/, '')}?status=approved` };

      case 'STEP_UP_REQUIRED': {
        const paymentRequestId = result.data.paymentRequest?.paymentRequestId;
        if (!paymentRequestId) {
          const msg = 'No paymentRequestId returned';
          setFlowState('ERROR');
          setErrorMessage(msg);
          throw new Error(msg);
        }
        setFlowState('STEP_UP');

        // Step: Return paymentRequestId to SDK
        emit('return-to-sdk', {
          type: 'code',
          language: 'javascript',
          code: `return { paymentRequestId: "${paymentRequestId}" }`,
        });

        // Step: Klarna journey
        await new Promise(r => setTimeout(r, 300));
        emit('klarna-journey', {
          type: 'info',
          message: 'Customer is redirected to Klarna to complete the step-up journey',
        });

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
  }, [authorizePayment, currentOrigin, amount, partnerAccountId, returnUrl, emit]);

  // ============================================================================
  // SDK EVENT HANDLERS
  // ============================================================================

  const attachEventHandlers = useCallback((klarnaInstance: KlarnaSDKType) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    klarnaInstance.Payment.on('complete', async (paymentRequest: any) => {
      if (finalAuthInProgressRef.current) return true;
      finalAuthInProgressRef.current = true;

      const sessionToken = paymentRequest.stateContext?.klarna_network_session_token ||
                          paymentRequest.stateContext?.klarnaNetworkSessionToken;

      if (sessionToken) {
        // Save token for redirect persistence
        try { sessionStorage.setItem('pendingSessionToken', sessionToken); } catch { /* ignore */ }

        // Step: Journey complete
        emit('journey-complete', {
          type: 'event',
          name: 'payment.complete',
          data: { klarna_network_session_token: sessionToken.substring(0, 20) + '...' },
        });

        setFlowState('COMPLETING');

        // For server-side mode, emit forward-token step
        if (mode === 'server-side') {
          await new Promise(r => setTimeout(r, 300));
          emit('forward-token', {
            type: 'info',
            message: 'Sub-partner forwards session token to Acquiring Partner backend',
          });
          await new Promise(r => setTimeout(r, 300));
        }

        // Fallback: if no redirect occurs within 3s (popup mode), do final auth here
        setTimeout(async () => {
          const pending = sessionStorage.getItem('pendingSessionToken');
          if (!pending) return; // redirect handler already consumed it
          sessionStorage.removeItem('pendingSessionToken');

          // Step: Final authorize request
          emit('final-authorize-request', {
            type: 'api-request',
            method: 'POST',
            path: `/v2/accounts/${partnerAccountId}/payment/authorize`,
            body: { klarnaNetworkSessionToken: pending.substring(0, 20) + '...', currency: 'USD', amount },
          });

          try {
            const finalResult = await authorizePayment(undefined, pending);

            if (finalResult.requestHeaders) {
              emit('final-authorize-request', {
                type: 'api-request',
                method: 'POST',
                path: `/v2/accounts/${partnerAccountId}/payment/authorize`,
                body: { klarnaNetworkSessionToken: pending.substring(0, 20) + '...', currency: 'USD', amount },
                headers: finalResult.requestHeaders,
              });
            }

            emit('final-authorize-response', {
              type: 'api-response',
              status: finalResult.success ? 200 : 400,
              body: finalResult.rawKlarnaResponse || finalResult.data,
              headers: finalResult.responseHeaders,
            });

            if (finalResult.success && finalResult.data?.result === 'APPROVED') {
              setFlowState('SUCCESS');
              if (mode === 'server-side') {
                emit('payment-success', {
                  type: 'info',
                  message: 'Payment approved! Transaction complete.',
                });
              }
            } else {
              throw new Error(finalResult.error || 'Final authorization failed');
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            setFlowState('ERROR');
            setErrorMessage(message);
          }
        }, 3000);
      } else {
        setFlowState('SUCCESS');
      }

      return true;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    klarnaInstance.Payment.on('abort', (_paymentRequest: any) => {
      setFlowState('READY');
      setErrorMessage('Payment was cancelled');
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    klarnaInstance.Payment.on('error', (error: any) => {
      setFlowState('ERROR');
      setErrorMessage(error?.message || 'An error occurred');
    });
  }, [authorizePayment, partnerAccountId, amount, mode, emit]);

  // ============================================================================
  // START: Initialize SDK and set up the full flow
  // ============================================================================

  const start = useCallback(async () => {
    setFlowState('INITIALIZING');
    setErrorMessage(null);
    finalAuthInProgressRef.current = false;

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

      // Build SDK config
      const sdkConfig: Record<string, unknown> = {
        clientId: clientId.trim(),
        products: ['PAYMENT'],
      };
      if (mode === 'ap-hosted') {
        sdkConfig.partnerAccountId = partnerAccountId.trim();
      }

      // Step 1: SDK Init
      emit('sdk-init', {
        type: 'code',
        language: 'javascript',
        code: `const klarna = await KlarnaSDK(${JSON.stringify(sdkConfig, null, 2)})`,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const KlarnaModule = await (Function('return import("https://js.klarna.com/web-sdk/v2/klarna.mjs")')() as Promise<any>);
      const { KlarnaSDK } = KlarnaModule;
      const klarnaInstance = await KlarnaSDK(sdkConfig);

      attachEventHandlers(klarnaInstance);

      // Step 2: Get presentation
      const presentationCall = { amount, currency: 'USD', locale: 'en-US', intents: ['PAY'] };
      const presentationResult = await klarnaInstance.Payment.presentation(presentationCall);
      presentationRef.current = presentationResult;

      emit('presentation-received', {
        type: 'code',
        language: 'javascript',
        code: `const presentation = await klarna.Payment.presentation(${JSON.stringify(presentationCall, null, 2)})

// Mount heading — the payment method name (e.g. "Pay with Klarna")
presentation.header
  .component()
  .mount(headerContainer)

// Mount subheading — short description (e.g. "Pay in 4 interest-free payments")
presentation.subheader.short
  .component()
  .mount(subheaderContainer)

// Mount icon badge — the Klarna logo
presentation.icon
  .component({ shape: 'badge' })
  .mount(iconContainer)

// Mount enriched messaging — shown when Klarna is selected
presentation.subheader.enriched
  .component()
  .mount(messageContainer)`,
      });

      // Step 3: Mount button
      if (buttonContainerRef.current && presentationResult?.paymentOption) {
        clearSdkMount();
        sdkMountIdRef.current = `flow-${mode}-${Date.now()}`;
        const mountTarget = document.createElement('div');
        mountTarget.id = sdkMountIdRef.current;
        mountTarget.style.cssText = 'width: 100%;';
        buttonContainerRef.current.appendChild(mountTarget);

        const buttonInstance = presentationResult.paymentOption.paymentButton
          .component({
            shape: 'rect',
            theme: 'default',
            locale: 'en-US',
            intents: ['PAY'],
            initiationMode: 'DEVICE_BEST',
            initiate: handleInitiate,
          })
          .mount(mountTarget);

        mountedButtonRef.current = buttonInstance;

        emit('button-mounted', {
          type: 'code',
          language: 'javascript',
          code: `presentation.paymentOption.paymentButton
  .component({ shape: 'rect', theme: 'default', initiationMode: 'DEVICE_BEST', initiate: handleInitiate })
  .mount(container)`,
        });

        setFlowState('READY');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setFlowState('ERROR');
      setErrorMessage(`SDK init failed: ${message}`);
    }
  }, [clientId, partnerAccountId, mode, amount, attachEventHandlers, handleInitiate, clearSdkMount, emit]);

  // ============================================================================
  // RESET
  // ============================================================================

  const reset = useCallback(() => {
    setFlowState('IDLE');
    setErrorMessage(null);
    presentationRef.current = null;
    finalAuthInProgressRef.current = false;
    clearSdkMount();
  }, [clearSdkMount]);

  // ============================================================================
  // RESUME AFTER REDIRECT
  // ============================================================================

  const resumeAfterRedirect = useCallback(async (sessionToken: string) => {
    setFlowState('COMPLETING');
    finalAuthInProgressRef.current = true;

    // Step: Journey complete
    emit('journey-complete', {
      type: 'event',
      name: 'payment.complete',
      data: { klarna_network_session_token: sessionToken.substring(0, 20) + '...' },
    });

    await new Promise(r => setTimeout(r, 400));

    // For server-side mode, emit forward-token step
    if (mode === 'server-side') {
      emit('forward-token', {
        type: 'info',
        message: 'Sub-partner forwards session token to Acquiring Partner backend',
      });
      await new Promise(r => setTimeout(r, 400));
    }

    // Step: Final authorize request
    emit('final-authorize-request', {
      type: 'api-request',
      method: 'POST',
      path: `/v2/accounts/${partnerAccountId}/payment/authorize`,
      body: { klarnaNetworkSessionToken: sessionToken.substring(0, 20) + '...', currency: 'USD', amount },
    });

    try {
      const finalResult = await authorizePayment(undefined, sessionToken);

      if (finalResult.requestHeaders) {
        emit('final-authorize-request', {
          type: 'api-request',
          method: 'POST',
          path: `/v2/accounts/${partnerAccountId}/payment/authorize`,
          body: { klarnaNetworkSessionToken: sessionToken.substring(0, 20) + '...', currency: 'USD', amount },
          headers: finalResult.requestHeaders,
        });
      }

      emit('final-authorize-response', {
        type: 'api-response',
        status: finalResult.success ? 200 : 400,
        body: finalResult.rawKlarnaResponse || finalResult.data,
        headers: finalResult.responseHeaders,
      });

      if (finalResult.success && finalResult.data?.result === 'APPROVED') {
        setFlowState('SUCCESS');
        if (mode === 'server-side') {
          emit('payment-success', {
            type: 'info',
            message: 'Payment approved! Transaction complete.',
          });
        }
      } else {
        throw new Error(finalResult.error || 'Final authorization failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setFlowState('ERROR');
      setErrorMessage(message);
    }
  }, [authorizePayment, partnerAccountId, amount, mode, emit]);

  return {
    flowState,
    errorMessage,
    buttonContainerRef: buttonContainerRef as React.RefObject<HTMLDivElement>,
    presentationRef,
    start,
    reset,
    resumeAfterRedirect,
  };
}
