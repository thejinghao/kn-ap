'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import SequenceDiagram, { StepInspector } from '@/components/SequenceDiagram';
import type { SequenceDiagramRef, StepDetail } from '@/lib/types/payment-flow';
import { SERVER_SIDE_PARTIES, SERVER_SIDE_STEPS } from '@/lib/payment-flow-steps';
import { usePaymentFlowDemo } from '@/lib/hooks/usePaymentFlowDemo';

// ============================================================================
// SESSION STORAGE KEY
// ============================================================================

const SESSION_KEY = 'server-side-flow-diagram-state';

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function ServerSideFlowPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [inspectorStepId, setInspectorStepId] = useState<string | null>(null);
  const [inspectorDetail, setInspectorDetail] = useState<StepDetail | null>(null);
  const [inspectorLabel, setInspectorLabel] = useState<string | null>(null);

  const diagramRef = useRef<SequenceDiagramRef>(null);

  // Redirect params ref (captured in effect 1, consumed in effect 2)
  const redirectParamsRef = useRef<{ status: string; pendingToken: string | null } | null>(null);

  const handleStepSelect = useCallback((stepId: string | null, detail: StepDetail | null, label: string | null) => {
    setInspectorStepId(stepId);
    setInspectorDetail(detail);
    setInspectorLabel(label);
  }, []);

  const { flowState, errorMessage, buttonContainerRef, start, reset, resumeAfterRedirect } = usePaymentFlowDemo({
    mode: 'server-side',
    clientId: '',
    returnUrl: undefined,
    onFlowEvent: useCallback((event) => {
      diagramRef.current?.activateStep(event.stepId, event.detail);
    }, []),
  });

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

  const handleReset = useCallback(() => {
    reset();
    diagramRef.current?.reset();
    setInspectorStepId(null);
    setInspectorDetail(null);
    setInspectorLabel(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, [reset]);

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
          <Link href="/server-side" className="inline-flex items-center gap-1.5 text-sm text-amber-600 font-medium hover:underline">
            Deep Dive: Full Configuration Explorer <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Server-side Payment Flow</h1>
        <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">
          The Sub-partner initiates the payment from their own frontend using only a{' '}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">clientId</code> (no{' '}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">partnerAccountId</code>).
          After the customer completes the Klarna journey, the Sub-partner forwards the session token to
          the Acquiring Partner&apos;s backend for final authorization via mTLS.
          Click &quot;Start Flow&quot; to see each step light up with real data.
        </p>
      </div>

      {/* Main content: Diagram (2/3) + Demo Panel (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-4">
        {/* Sequence Diagram */}
        <SequenceDiagram
          ref={diagramRef}
          title="Server-side Sequence"
          parties={SERVER_SIDE_PARTIES}
          steps={SERVER_SIDE_STEPS}
          onStepSelect={handleStepSelect}
        />

        {/* Demo Panel */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Live Demo</span>
          </div>

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
                  onClick={start}
                  className="bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-gray-800 transition-colors w-full"
                >
                  Start Flow
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
                </div>
              )}
              {/* SDK Mount Target */}
              <div
                ref={buttonContainerRef}
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

            {/* Reset button */}
            {flowState !== 'IDLE' && (
              <div className="text-center">
                <button onClick={handleReset} className="text-[10px] text-gray-400 hover:text-gray-600 underline">
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step Inspector — full width below */}
      <StepInspector stepId={inspectorStepId} label={inspectorLabel} detail={inspectorDetail} />
    </div>
  );
}
