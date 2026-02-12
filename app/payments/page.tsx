'use client';

import React, { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { InformationCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import SequenceDiagram, { type Party, type SequenceStep } from '@/components/SequenceDiagram';
import MiniPaymentDemo, { type MiniPaymentDemoRef } from '@/components/MiniPaymentDemo';
import MiniOSMDemo, { type MiniOSMDemoRef } from '@/components/MiniOSMDemo';

// ============================================================================
// SEQUENCE DIAGRAM DATA
// ============================================================================

// -- Parties (order: Customer, Frontend, Klarna SDK, Backend, Klarna API) --
const AP_HOSTED_PARTIES: Party[] = [
  { id: 'customer', label: 'Customer', color: 'green' },
  { id: 'ap-frontend', label: 'AP Frontend', color: 'blue' },
  { id: 'klarna-sdk', label: 'Klarna SDK', color: 'pink' },
  { id: 'ap-backend', label: 'AP Backend', color: 'blue' },
  { id: 'klarna-api', label: 'Klarna API', color: 'pink' },
];

const SERVER_SIDE_PARTIES: Party[] = [
  { id: 'customer', label: 'Customer', color: 'green' },
  { id: 'sub-partner', label: 'Sub-partner', color: 'amber' },
  { id: 'klarna-sdk', label: 'Klarna SDK', color: 'pink' },
  { id: 'ap-backend', label: 'AP Backend', color: 'blue' },
  { id: 'klarna-api', label: 'Klarna API', color: 'pink' },
];

const OSM_PARTIES: Party[] = [
  { id: 'customer', label: 'Customer', color: 'green' },
  { id: 'merchant', label: 'Merchant Site', color: 'amber' },
  { id: 'klarna-sdk', label: 'Klarna SDK', color: 'pink' },
  { id: 'klarna-cdn', label: 'Klarna CDN', color: 'pink' },
];

// -- Steps (updated to match paymentRequestId flow: authorize first) --
const AP_HOSTED_STEPS: SequenceStep[] = [
  { id: 'aph-1', from: 'ap-frontend', to: 'klarna-sdk', label: 'Initialize SDK (clientId + partnerAccountId)', type: 'call', isLive: true },
  { id: 'aph-2', from: 'klarna-sdk', to: 'ap-frontend', label: 'Return payment presentation + mount button', type: 'response', isLive: true },
  { id: 'aph-3', from: 'customer', to: 'klarna-sdk', label: 'Click Klarna payment button', type: 'event' },
  { id: 'aph-4', from: 'klarna-sdk', to: 'ap-frontend', label: 'Call initiate() callback', type: 'call' },
  { id: 'aph-5', from: 'ap-frontend', to: 'ap-backend', label: 'Request initial authorization', type: 'call' },
  { id: 'aph-6', from: 'ap-backend', to: 'klarna-api', label: 'Authorize payment (mTLS)', type: 'call' },
  { id: 'aph-7', from: 'klarna-api', to: 'ap-backend', label: 'STEP_UP_REQUIRED + paymentRequestId', type: 'response' },
  { id: 'aph-8', from: 'ap-backend', to: 'ap-frontend', label: 'Return paymentRequestId', type: 'response' },
  { id: 'aph-9', from: 'ap-frontend', to: 'klarna-sdk', label: 'Return { paymentRequestId } to SDK', type: 'response' },
  { id: 'aph-10', from: 'klarna-sdk', to: 'customer', label: 'Customer Klarna journey (step-up)', type: 'redirect' },
  { id: 'aph-11', from: 'customer', to: 'klarna-sdk', label: 'Complete journey \u2192 session token', type: 'event' },
  { id: 'aph-12', from: 'klarna-sdk', to: 'ap-backend', label: 'Payment complete event + token', type: 'event' },
  { id: 'aph-13', from: 'ap-backend', to: 'klarna-api', label: 'Final authorize (mTLS + session token)', type: 'call' },
  { id: 'aph-14', from: 'klarna-api', to: 'ap-backend', label: 'APPROVED', type: 'response' },
  { id: 'aph-15', from: 'ap-backend', to: 'ap-frontend', label: 'Payment success', type: 'response' },
];

const SERVER_SIDE_STEPS: SequenceStep[] = [
  { id: 'ss-1', from: 'sub-partner', to: 'klarna-sdk', label: 'Initialize SDK (clientId only, no partnerAccountId)', type: 'call', isLive: true },
  { id: 'ss-2', from: 'klarna-sdk', to: 'sub-partner', label: 'Return payment presentation + mount button', type: 'response', isLive: true },
  { id: 'ss-3', from: 'customer', to: 'klarna-sdk', label: 'Click Klarna payment button', type: 'event' },
  { id: 'ss-4', from: 'klarna-sdk', to: 'sub-partner', label: 'Call initiate() callback', type: 'call' },
  { id: 'ss-5', from: 'sub-partner', to: 'ap-backend', label: 'Request initial authorization', type: 'call' },
  { id: 'ss-6', from: 'ap-backend', to: 'klarna-api', label: 'Authorize payment (mTLS)', type: 'call' },
  { id: 'ss-7', from: 'klarna-api', to: 'ap-backend', label: 'STEP_UP_REQUIRED + paymentRequestId', type: 'response' },
  { id: 'ss-8', from: 'ap-backend', to: 'sub-partner', label: 'Return paymentRequestId', type: 'response' },
  { id: 'ss-9', from: 'sub-partner', to: 'klarna-sdk', label: 'Return { paymentRequestId } to SDK', type: 'response' },
  { id: 'ss-10', from: 'klarna-sdk', to: 'customer', label: 'Customer Klarna journey (step-up)', type: 'redirect' },
  { id: 'ss-11', from: 'customer', to: 'klarna-sdk', label: 'Complete journey \u2192 session token', type: 'event' },
  { id: 'ss-12', from: 'klarna-sdk', to: 'sub-partner', label: 'Payment complete event + token', type: 'event' },
  { id: 'ss-13', from: 'sub-partner', to: 'ap-backend', label: 'Forward session token', type: 'call' },
  { id: 'ss-14', from: 'ap-backend', to: 'klarna-api', label: 'Final authorize (mTLS + session token)', type: 'call' },
  { id: 'ss-15', from: 'klarna-api', to: 'ap-backend', label: 'APPROVED', type: 'response' },
  { id: 'ss-16', from: 'ap-backend', to: 'sub-partner', label: 'Payment success', type: 'response' },
];

const OSM_STEPS: SequenceStep[] = [
  { id: 'osm-1', from: 'merchant', to: 'klarna-sdk', label: "Initialize SDK (clientId, products: ['MESSAGING'])", type: 'call', isLive: true },
  { id: 'osm-2', from: 'klarna-sdk', to: 'klarna-cdn', label: 'Load messaging web component', type: 'call', isLive: true },
  { id: 'osm-3', from: 'merchant', to: 'klarna-sdk', label: 'Create placement (key, amount, locale, theme)', type: 'call', isLive: true },
  { id: 'osm-4', from: 'klarna-sdk', to: 'merchant', label: 'Mount messaging web component to DOM', type: 'response', isLive: true },
  { id: 'osm-5', from: 'customer', to: 'klarna-sdk', label: 'View financing message on page', type: 'event' },
  { id: 'osm-6', from: 'customer', to: 'klarna-sdk', label: 'Click for more details (optional)', type: 'event' },
];

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function PaymentsGuidePage() {
  const [isMounted, setIsMounted] = useState(false);
  const apHostedDemoRef = useRef<MiniPaymentDemoRef>(null);
  const serverSideDemoRef = useRef<MiniPaymentDemoRef>(null);
  const osmDemoRef = useRef<MiniOSMDemoRef>(null);

  useEffect(() => {
    setIsMounted(true);

    // Handle return URL from payment demo redirects
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Wire up live actions for AP Hosted sequence
  const apHostedStepsWithLive: SequenceStep[] = AP_HOSTED_STEPS.map((step) => {
    if (step.id === 'aph-1' || step.id === 'aph-2') {
      return {
        ...step,
        liveAction: async () => {
          if (step.id === 'aph-1') {
            await apHostedDemoRef.current?.initializeSDK();
          }
        },
      };
    }
    return step;
  });

  // Wire up live actions for Server-side sequence
  const serverSideStepsWithLive: SequenceStep[] = SERVER_SIDE_STEPS.map((step) => {
    if (step.id === 'ss-1' || step.id === 'ss-2') {
      return {
        ...step,
        liveAction: async () => {
          if (step.id === 'ss-1') {
            await serverSideDemoRef.current?.initializeSDK();
          }
        },
      };
    }
    return step;
  });

  // Wire up live actions for OSM sequence
  const osmStepsWithLive: SequenceStep[] = OSM_STEPS.map((step) => {
    if (step.id === 'osm-1') {
      return {
        ...step,
        liveAction: async () => {
          await osmDemoRef.current?.initializeSDK();
        },
      };
    }
    return step;
  });

  if (!isMounted) {
    return <div className="min-h-[calc(100vh-57px)] bg-gray-50" />;
  }

  return (
    <div className="min-h-[calc(100vh-57px)] bg-gray-50 p-5 max-w-[1200px] mx-auto">
      {/* ================================================================
          Section 1: Header + Intro
          ================================================================ */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payments Integration Guide</h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-start gap-2.5 text-sm text-blue-700 leading-relaxed mb-6">
          <InformationCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            Klarna Network supports multiple integration paths for payments and messaging.
            Each path serves a different use case depending on who owns the checkout experience
            and what information needs to be displayed. Click through the sequence diagrams below
            to understand the flow of events between all parties.
          </div>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/ap-hosted"
            className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <h3 className="text-sm font-bold text-gray-900">AP Hosted</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
              The Acquiring Partner owns the entire checkout experience. The AP initializes
              the SDK with their own credentials and handles the full payment lifecycle.
            </p>
            <span className="text-xs text-blue-600 font-medium group-hover:underline flex items-center gap-1">
              Go to full demo <ArrowRightIcon className="w-3 h-3" />
            </span>
          </Link>

          <Link
            href="/server-side"
            className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-amber-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <h3 className="text-sm font-bold text-gray-900">Server-side</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
              The Sub-partner initiates the payment from their own frontend, then forwards
              the session token to the AP for final authorization via mTLS.
            </p>
            <span className="text-xs text-blue-600 font-medium group-hover:underline flex items-center gap-1">
              Go to full demo <ArrowRightIcon className="w-3 h-3" />
            </span>
          </Link>

          <Link
            href="/on-site-messaging"
            className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-pink-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-pink-400" />
              <h3 className="text-sm font-bold text-gray-900">On-Site Messaging</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed mb-3">
              Display financing messages on merchant pages using the Klarna SDK.
              Informational only — not a payment flow.
            </p>
            <span className="text-xs text-blue-600 font-medium group-hover:underline flex items-center gap-1">
              Go to full demo <ArrowRightIcon className="w-3 h-3" />
            </span>
          </Link>
        </div>
      </div>

      {/* ================================================================
          Section 2: AP Hosted Flow
          ================================================================ */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-3 h-3 rounded-full bg-blue-400" />
          <h2 className="text-lg font-bold text-gray-900">AP Hosted Flow</h2>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mb-4 max-w-3xl">
          In the AP Hosted flow, the Acquiring Partner owns the entire checkout experience.
          The AP&apos;s frontend initializes the Klarna SDK with both a <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">clientId</code> and
          a <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">partnerAccountId</code>,
          then mounts the Klarna payment button. When the customer clicks the button, the SDK
          handles the Klarna journey. After the customer completes the journey, the AP&apos;s
          backend performs a final authorization call to Klarna using mTLS and the session token.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3">
          <SequenceDiagram
            title="Sequence Diagram"
            parties={AP_HOSTED_PARTIES}
            steps={apHostedStepsWithLive}
          />
          <MiniPaymentDemo ref={apHostedDemoRef} mode="ap-hosted" />
        </div>

        <Link
          href="/ap-hosted"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:underline"
        >
          Go to full AP Hosted demo <ArrowRightIcon className="w-3.5 h-3.5" />
        </Link>
      </section>

      {/* ================================================================
          Section 3: Server-side Flow
          ================================================================ */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <h2 className="text-lg font-bold text-gray-900">Server-side Flow</h2>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mb-4 max-w-3xl">
          In the Server-side flow, the Sub-partner operates their own checkout and initializes
          the Klarna SDK with only a <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">clientId</code> (no <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">partnerAccountId</code>).
          After the customer completes the Klarna journey, the Sub-partner forwards the session
          token to the Acquiring Partner&apos;s backend, which performs the final authorization
          using its own mTLS credentials and API key.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3">
          <SequenceDiagram
            title="Sequence Diagram"
            parties={SERVER_SIDE_PARTIES}
            steps={serverSideStepsWithLive}
          />
          <MiniPaymentDemo ref={serverSideDemoRef} mode="server-side" />
        </div>

        <Link
          href="/server-side"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:underline"
        >
          Go to full Server-side demo <ArrowRightIcon className="w-3.5 h-3.5" />
        </Link>
      </section>

      {/* ================================================================
          Section 4: On-Site Messaging Flow
          ================================================================ */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-3 h-3 rounded-full bg-pink-400" />
          <h2 className="text-lg font-bold text-gray-900">On-Site Messaging Flow</h2>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mb-4 max-w-3xl">
          On-Site Messaging is not a payment flow — it&apos;s informational. The merchant page
          loads the Klarna SDK with <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">products: [&apos;MESSAGING&apos;]</code> and
          creates a placement that displays financing options (e.g., &quot;Pay in 4 installments
          of $20.00&quot;). The customer can click the message to see more details, but no payment
          is initiated. This is typically used on product pages, cart pages, or promotional banners.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3">
          <SequenceDiagram
            title="Sequence Diagram"
            parties={OSM_PARTIES}
            steps={osmStepsWithLive}
          />
          <MiniOSMDemo ref={osmDemoRef} />
        </div>

        <Link
          href="/on-site-messaging"
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:underline"
        >
          Go to full On-Site Messaging demo <ArrowRightIcon className="w-3.5 h-3.5" />
        </Link>
      </section>

      {/* ================================================================
          Section 5: Comparison Table
          ================================================================ */}
      <section className="mb-10">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Comparison</h2>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[160px]" />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      AP Hosted
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      Server-side
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-pink-400" />
                      On-Site Messaging
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-3 text-xs font-medium text-gray-500">Purpose</td>
                  <td className="px-4 py-3 text-xs text-gray-700">Accept payments on AP&apos;s checkout</td>
                  <td className="px-4 py-3 text-xs text-gray-700">Accept payments on sub-partner&apos;s site</td>
                  <td className="px-4 py-3 text-xs text-gray-700">Display financing info on merchant pages</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-xs font-medium text-gray-500">SDK Product</td>
                  <td className="px-4 py-3"><code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-mono">PAYMENT</code></td>
                  <td className="px-4 py-3"><code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-mono">PAYMENT</code></td>
                  <td className="px-4 py-3"><code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-mono">MESSAGING</code></td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-xs font-medium text-gray-500">SDK Init Params</td>
                  <td className="px-4 py-3"><code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-mono">clientId + partnerAccountId</code></td>
                  <td className="px-4 py-3"><code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-mono">clientId only</code></td>
                  <td className="px-4 py-3"><code className="bg-gray-100 px-1.5 py-0.5 rounded text-[11px] font-mono">clientId + locale</code></td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-xs font-medium text-gray-500">Key Output</td>
                  <td className="px-4 py-3 text-xs text-gray-700">Payment transaction + token</td>
                  <td className="px-4 py-3 text-xs text-gray-700">Session token forwarded to AP</td>
                  <td className="px-4 py-3 text-xs text-gray-700">Rendered financing message</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-xs font-medium text-gray-500">User Interaction</td>
                  <td className="px-4 py-3 text-xs text-gray-700">Click button &rarr; Klarna journey &rarr; payment</td>
                  <td className="px-4 py-3 text-xs text-gray-700">Click button &rarr; Klarna journey &rarr; payment</td>
                  <td className="px-4 py-3 text-xs text-gray-700">View message (click for details)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-xs font-medium text-gray-500">Final Auth By</td>
                  <td className="px-4 py-3 text-xs text-gray-700">AP backend (mTLS)</td>
                  <td className="px-4 py-3 text-xs text-gray-700">AP backend (mTLS)</td>
                  <td className="px-4 py-3 text-xs text-gray-700">N/A</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-xs font-medium text-gray-500">Complexity</td>
                  <td className="px-4 py-3">
                    <span className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Medium</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Higher</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Low</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
