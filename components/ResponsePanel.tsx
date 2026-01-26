'use client';

import React, { useState } from 'react';
import {
  ChevronDownIcon,
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';
import JsonView from '@uiw/react-json-view';
import { ResponsePanelProps } from '@/lib/types';

// Status code categorization
function getStatusCategory(status: number): 'success' | 'redirect' | 'client-error' | 'server-error' {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'redirect';
  if (status >= 400 && status < 500) return 'client-error';
  return 'server-error';
}

// Status styles
const STATUS_STYLES: Record<string, string> = {
  'success': 'bg-green-100 text-green-800 border-green-200',
  'redirect': 'bg-blue-100 text-blue-800 border-blue-200',
  'client-error': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'server-error': 'bg-red-100 text-red-800 border-red-200',
};

// Status icons
const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'success': CheckCircleIcon,
  'redirect': InformationCircleIcon,
  'client-error': ExclamationTriangleIcon,
  'server-error': ExclamationCircleIcon,
};

// Collapsible component
function Collapsible({
  title,
  expanded,
  onToggle,
  badge,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-lg mb-2">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-t-lg transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-700">{title}</span>
          {badge !== undefined && (
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
              {badge}
            </span>
          )}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="p-3 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}

// Skeleton loader component
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export default function ResponsePanel({ response, isLoading }: ResponsePanelProps) {
  const [bodyExpanded, setBodyExpanded] = useState(true);
  const [headersExpanded, setHeadersExpanded] = useState(false);
  const [metadataExpanded, setMetadataExpanded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Copy response to clipboard
  const handleCopy = async () => {
    if (!response) return;
    
    try {
      const text = JSON.stringify(response.data, null, 2);
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Download response as JSON file
  const handleDownload = () => {
    if (!response) return;
    
    const blob = new Blob([JSON.stringify(response.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `klarna-response-${response.requestMetadata.correlationId || Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 h-full">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Response</h2>
        <div className="space-y-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-48" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  // No response yet
  if (!response) {
    return (
      <div className="bg-white rounded-lg shadow p-4 h-full">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Response</h2>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
          <InformationCircleIcon className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">Send a request to see the response.</span>
        </div>
      </div>
    );
  }

  const statusCategory = getStatusCategory(response.status);
  const StatusIcon = STATUS_ICONS[statusCategory];

  return (
    <div className="bg-white rounded-lg shadow p-4 h-full overflow-auto">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Response</h2>

      {/* Error Alert */}
      {response.error && (
        <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
          <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{response.error}</span>
        </div>
      )}

      {/* Status Badge and Actions */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-semibold rounded-full border ${STATUS_STYLES[statusCategory]}`}>
          <StatusIcon className="h-4 w-4" />
          {response.status} {response.statusText}
        </span>
        <button
          onClick={handleCopy}
          title={copySuccess ? 'Copied!' : 'Copy'}
          className={`p-1.5 rounded-lg transition-colors ${
            copySuccess 
              ? 'text-green-600 bg-green-50' 
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          {copySuccess ? (
            <CheckCircleSolidIcon className="h-5 w-5" />
          ) : (
            <ClipboardDocumentIcon className="h-5 w-5" />
          )}
        </button>
        <button
          onClick={handleDownload}
          title="Download"
          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
        </button>
      </div>

      <hr className="border-gray-200 mb-3" />

      {/* Response Body */}
      <Collapsible
        title="Body"
        expanded={bodyExpanded}
        onToggle={() => setBodyExpanded(!bodyExpanded)}
      >
        <div className="max-h-96 overflow-auto">
          {typeof response.data === 'object' && response.data !== null ? (
            <JsonView
              value={response.data as object}
              displayDataTypes={false}
              displayObjectSize={true}
              enableClipboard={true}
              collapsed={2}
              style={{
                fontSize: '0.875rem',
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                backgroundColor: 'transparent',
              }}
            />
          ) : (
            <pre className="font-mono text-sm whitespace-pre-wrap break-words m-0">
              {String(response.data)}
            </pre>
          )}
        </div>
      </Collapsible>

      {/* Response Headers */}
      <Collapsible
        title="Headers"
        expanded={headersExpanded}
        onToggle={() => setHeadersExpanded(!headersExpanded)}
        badge={Object.keys(response.headers).length}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 font-semibold text-gray-700">Header</th>
                <th className="text-left py-2 font-semibold text-gray-700">Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(response.headers).map(([key, value]) => (
                <tr key={key} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-4 font-mono text-xs text-gray-600">{key}</td>
                  <td className="py-2 font-mono text-xs text-gray-600 break-all">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Collapsible>

      {/* Request Metadata */}
      <Collapsible
        title="Metadata"
        expanded={metadataExpanded}
        onToggle={() => setMetadataExpanded(!metadataExpanded)}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-semibold text-gray-700 whitespace-nowrap">Full URL</td>
                <td className="py-2 font-mono text-xs text-gray-600 break-all">
                  {response.requestMetadata.fullUrl}
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-semibold text-gray-700 whitespace-nowrap">Method</td>
                <td className="py-2 font-mono text-xs text-gray-600">
                  {response.requestMetadata.method}
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 pr-4 font-semibold text-gray-700 whitespace-nowrap">Correlation ID</td>
                <td className="py-2 font-mono text-xs text-gray-600">
                  {response.requestMetadata.correlationId}
                </td>
              </tr>
              {response.requestMetadata.idempotencyKey && (
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-semibold text-gray-700 whitespace-nowrap">Idempotency Key</td>
                  <td className="py-2 font-mono text-xs text-gray-600">
                    {response.requestMetadata.idempotencyKey}
                  </td>
                </tr>
              )}
              <tr>
                <td className="py-2 pr-4 font-semibold text-gray-700 whitespace-nowrap">Timestamp</td>
                <td className="py-2 font-mono text-xs text-gray-600">
                  {response.requestMetadata.timestamp}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Collapsible>
    </div>
  );
}
