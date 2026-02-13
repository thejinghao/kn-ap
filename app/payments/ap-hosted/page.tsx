'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import SequenceDiagram, { StepInspector } from '@/components/SequenceDiagram';
import type { SequenceDiagramRef, StepDetail } from '@/lib/types/payment-flow';
import { AP_HOSTED_PARTIES, AP_HOSTED_STEPS } from '@/lib/payment-flow-steps';
import { usePaymentFlowDemo } from '@/lib/hooks/usePaymentFlowDemo';

// ============================================================================
// SESSION STORAGE KEY
// ============================================================================

const SESSION_KEY = 'ap-hosted-flow-diagram-state';

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function APHostedFlowPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [inspectorStepId, setInspectorStepId] = useState<string | null>(null);
  const [inspectorDetail, setInspectorDetail] = useState<StepDetail | null>(null);
  const [inspectorLabel, setInspectorLabel] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'credit_card' | 'klarna' | null>(null);

  const diagramRef = useRef<SequenceDiagramRef>(null);

  // SDK sub-component mount targets
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

  // Redirect params ref (captured in effect 1, consumed in effect 2)
  const redirectParamsRef = useRef<{ status: string; pendingToken: string | null } | null>(null);

  const handleStepSelect = useCallback((stepId: string | null, detail: StepDetail | null, label: string | null) => {
    setInspectorStepId(stepId);
    setInspectorDetail(detail);
    setInspectorLabel(label);
  }, []);

  const { flowState, errorMessage, buttonContainerRef, presentationRef, start, reset, resumeAfterRedirect } = usePaymentFlowDemo({
    mode: 'ap-hosted',
    clientId: '',
    returnUrl: undefined,
    onFlowEvent: useCallback((event) => {
      diagramRef.current?.activateStep(event.stepId, event.detail);
    }, []),
  });

  // ============================================================================
  // SDK SUB-COMPONENT HELPERS
  // ============================================================================

  const mountPresentationComponents = useCallback(() => {
    const presentation = presentationRef.current;
    if (!presentation) return;

    try {
      if (iconMountRef.current && presentation.icon) {
        const iconInstance = presentation.icon.component({ shape: 'badge' }).mount(iconMountRef.current);
        mountedIconRef.current = iconInstance;
      }
      if (headerMountRef.current && presentation.header) {
        const headerInstance = presentation.header.component().mount(headerMountRef.current);
        mountedHeaderRef.current = headerInstance;
      }
      if (subheaderMountRef.current && presentation.subheader?.short) {
        const subheaderInstance = presentation.subheader.short.component().mount(subheaderMountRef.current);
        mountedSubheaderRef.current = subheaderInstance;
      }
    } catch { /* ignore */ }
  }, [presentationRef]);

  const mountMessageComponent = useCallback(() => {
    const presentation = presentationRef.current;
    if (!presentation?.subheader?.enriched || !messageMountRef.current) return;
    if (mountedMessageRef.current) return;
    try {
      const messageInstance = presentation.subheader.enriched.component().mount(messageMountRef.current);
      mountedMessageRef.current = messageInstance;
    } catch { /* ignore */ }
  }, [presentationRef]);

  const unmountMessageComponent = useCallback(() => {
    if (mountedMessageRef.current) {
      try {
        if (typeof mountedMessageRef.current.unmount === 'function') mountedMessageRef.current.unmount();
      } catch { /* ignore */ }
      mountedMessageRef.current = null;
    }
    if (messageMountRef.current) messageMountRef.current.innerHTML = '';
  }, []);

  const clearSubComponents = useCallback(() => {
    for (const ref of [mountedIconRef, mountedHeaderRef, mountedSubheaderRef, mountedMessageRef]) {
      if (ref.current) {
        try {
          if (typeof ref.current.unmount === 'function') ref.current.unmount();
        } catch { /* ignore */ }
        ref.current = null;
      }
    }
    for (const ref of [iconMountRef, headerMountRef, subheaderMountRef, messageMountRef]) {
      if (ref.current) ref.current.innerHTML = '';
    }
  }, []);

  const handlePaymentMethodSelect = useCallback((method: 'credit_card' | 'klarna') => {
    setSelectedPaymentMethod(method);
    if (method === 'klarna') {
      mountMessageComponent();
    } else {
      unmountMessageComponent();
    }
  }, [mountMessageComponent, unmountMessageComponent]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Mount presentation sub-components when READY
  useEffect(() => {
    if (flowState === 'READY') {
      mountPresentationComponents();
      // Respect instruction field for auto-preselect
      const instruction = presentationRef.current?.instruction;
      if (instruction === 'PRESELECT_KLARNA' || instruction === 'SHOW_ONLY_KLARNA') {
        setSelectedPaymentMethod('klarna');
        mountMessageComponent();
      }
    }
  }, [flowState, mountPresentationComponents, mountMessageComponent, presentationRef]);

  // Cleanup sub-components on unmount
  useEffect(() => {
    return () => {
      clearSubComponents();
    };
  }, [clearSubComponents]);

  // Save diagram state when entering STEP_UP or COMPLETING
  useEffect(() => {
    if ((flowState === 'STEP_UP' || flowState === 'COMPLETING') && diagramRef.current) {
      try {
        const state = diagramRef.current.getState();
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
      } catch { /* ignore */ }
    }
  }, [flowState]);

  // Effect 1: Detect redirect params, clean up URL, set mounted
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');

    if (status) {
      const pendingToken = sessionStorage.getItem('pendingSessionToken');
      redirectParamsRef.current = { status, pendingToken };
      // Clean up URL immediately
      window.history.replaceState({}, '', window.location.pathname);
    }

    setIsMounted(true);
  }, []);

  // Effect 2: After mount, restore diagram state and resume redirect flow
  useEffect(() => {
    if (!isMounted) return;
    const redirect = redirectParamsRef.current;
    if (!redirect) return;
    redirectParamsRef.current = null;

    // Restore diagram state (diagramRef.current is now available)
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved && diagramRef.current) {
        diagramRef.current.restoreState(JSON.parse(saved));
      }
    } catch { /* ignore */ }

    // Resume flow with pending token
    if (redirect.pendingToken) {
      sessionStorage.removeItem('pendingSessionToken');
      sessionStorage.removeItem(SESSION_KEY);
      resumeAfterRedirect(redirect.pendingToken);
    }
  }, [isMounted, resumeAfterRedirect]);

  // ============================================================================
  // RESET
  // ============================================================================

  const handleReset = useCallback(() => {
    reset();
    diagramRef.current?.reset();
    setInspectorStepId(null);
    setInspectorDetail(null);
    setInspectorLabel(null);
    setSelectedPaymentMethod(null);
    clearSubComponents();
    sessionStorage.removeItem(SESSION_KEY);
  }, [reset, clearSubComponents]);

  if (!isMounted) {
    return <div className="min-h-[calc(100vh-57px)] bg-gray-50" />;
  }

  return (
    <div className="min-h-[calc(100vh-57px)] bg-gray-50 p-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <Link href="/payments" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeftIcon className="w-3.5 h-3.5" />
            Integration Guide
          </Link>
          <Link href="/ap-hosted" className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:underline">
            Deep Dive: Full Configuration Explorer <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">AP Hosted Payment Flow</h1>
        <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">
          The Acquiring Partner owns the checkout experience. The AP initializes the Klarna SDK with{' '}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">clientId</code> +{' '}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">partnerAccountId</code>,
          mounts the payment button, handles authorization via mTLS, and manages the complete payment lifecycle.
          Click &quot;Start Flow&quot; to see each step light up with real data.
        </p>
      </div>

      {/* Main content: Diagram (2/3) + Demo Panel (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-4">
        {/* Sequence Diagram */}
        <SequenceDiagram
          ref={diagramRef}
          title="AP Hosted Sequence"
          parties={AP_HOSTED_PARTIES}
          steps={AP_HOSTED_STEPS}
          onStepSelect={handleStepSelect}
        />

        {/* Mock Checkout Panel */}
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
              checkout.acquiring-partner.com{flowState === 'SUCCESS' ? '/order-confirmation' : '/checkout'}
            </span>
          </div>
          {/* Browser Content Area */}
          <div className="bg-white p-4">
            {flowState === 'SUCCESS' ? (
              /* ---- Success Confirmation ---- */
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-lg font-bold text-gray-900 mb-1">Order Confirmed</div>
                <div className="text-sm text-gray-500 mb-4">Payment of $100.00 approved</div>
                <button
                  onClick={handleReset}
                  className="bg-gray-900 text-white px-5 py-2.5 rounded text-sm font-bold hover:bg-gray-800 border-none cursor-pointer w-full"
                >
                  New Order
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-base font-bold text-gray-900 mt-0 mb-3">Checkout</h3>

                {/* Order Summary */}
                <div className="space-y-1 mb-3 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Demo Item</span>
                    <span>$100.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200">
                    <span>Total</span>
                    <span>$100.00</span>
                  </div>
                </div>

                {/* Payment Method Selector — visible when READY, AUTHORIZING, or STEP_UP */}
                {(flowState === 'READY' || flowState === 'AUTHORIZING' || flowState === 'STEP_UP' || flowState === 'COMPLETING') && (
                  <div className="mb-3">
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
                          <div ref={headerMountRef} className="text-sm font-semibold text-gray-900" />
                          <div ref={subheaderMountRef} className="text-xs text-gray-500 leading-snug" />
                        </div>
                        <div ref={iconMountRef} className="shrink-0 ml-auto" style={{ width: 56, height: 22 }} />
                      </div>
                      <div
                        ref={messageMountRef}
                        style={{ display: selectedPaymentMethod === 'klarna' ? 'block' : 'none' }}
                        className="mt-2 ml-6 text-sm text-gray-700 leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {/* Button area */}
                <div className="mt-4">
                  {(flowState === 'IDLE' || flowState === 'ERROR') && (
                    <button
                      onClick={start}
                      className="bg-gray-900 text-white px-5 py-2.5 rounded text-sm font-bold hover:bg-gray-800 transition-colors w-full border-none cursor-pointer"
                    >
                      Start Flow
                    </button>
                  )}
                  {flowState === 'INITIALIZING' && (
                    <div className="text-xs text-gray-500 text-center animate-pulse py-2">Loading Klarna SDK...</div>
                  )}
                  {/* SDK payment button — shown when Klarna is selected */}
                  <div
                    ref={buttonContainerRef}
                    style={{
                      width: '100%',
                      display: selectedPaymentMethod === 'klarna' ? 'block' : 'none',
                    }}
                  />
                  {/* Fallback buttons */}
                  {selectedPaymentMethod === 'credit_card' && (flowState === 'READY' || flowState === 'AUTHORIZING') && (
                    <button
                      disabled
                      className="w-full bg-gray-300 text-gray-500 px-5 py-2.5 rounded text-sm font-bold border-none cursor-not-allowed"
                    >
                      Pay with Credit Card
                    </button>
                  )}
                  {!selectedPaymentMethod && flowState === 'READY' && (
                    <button
                      disabled
                      className="w-full bg-gray-200 text-gray-400 px-5 py-2.5 rounded text-sm font-bold border-none cursor-not-allowed"
                    >
                      Select a payment method
                    </button>
                  )}
                </div>

                {/* Status messages */}
                {errorMessage && (
                  <div className="text-xs text-red-500 text-center mt-2">{errorMessage}</div>
                )}
                {(flowState === 'AUTHORIZING' || flowState === 'STEP_UP' || flowState === 'COMPLETING') && (
                  <div className="text-xs text-blue-500 text-center mt-2 animate-pulse">
                    {flowState === 'AUTHORIZING' ? 'Authorizing...' : flowState === 'STEP_UP' ? 'Customer in Klarna journey...' : 'Final authorization...'}
                  </div>
                )}

                {/* Reset link */}
                {flowState !== 'IDLE' && (
                  <div className="text-center mt-2">
                    <button onClick={handleReset} className="text-[10px] text-gray-400 hover:text-gray-600 underline bg-transparent border-none cursor-pointer">
                      Reset
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Step Inspector — full width below */}
      <StepInspector stepId={inspectorStepId} label={inspectorLabel} detail={inspectorDetail} />
    </div>
  );
}
