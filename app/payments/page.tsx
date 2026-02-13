'use client';

import React from 'react';
import Link from 'next/link';
import { InformationCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export default function PaymentsGuidePage() {
  return (
    <div className="min-h-[calc(100vh-57px)] bg-gray-50 p-5 max-w-[1200px] mx-auto">
      {/* Header + Intro */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payments Integration Guide</h1>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-start gap-2.5 text-sm text-blue-700 leading-relaxed mb-6">
          <InformationCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            Klarna Network supports multiple integration paths for payments and messaging.
            Each path serves a different use case depending on who owns the checkout experience
            and what information needs to be displayed. Click into each flow to see a live
            sequence diagram with real API data.
          </div>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/payments/ap-hosted"
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
              View flow &amp; live demo <ArrowRightIcon className="w-3 h-3" />
            </span>
          </Link>

          <Link
            href="/payments/server-side"
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
              View flow &amp; live demo <ArrowRightIcon className="w-3 h-3" />
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
              Informational only &mdash; not a payment flow.
            </p>
            <span className="text-xs text-blue-600 font-medium group-hover:underline flex items-center gap-1">
              Go to full demo <ArrowRightIcon className="w-3 h-3" />
            </span>
          </Link>
        </div>
      </div>

      {/* Comparison Table */}
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
