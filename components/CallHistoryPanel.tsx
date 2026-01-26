'use client';

import React, { useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  ArrowRightIcon,
  ExclamationCircleIcon,
  CodeBracketIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { ApiCallEntry, HttpMethod, ResponseMetadata } from '@/lib/types';
import JsonViewer from './JsonViewer';
import { detectSaveableFields, suggestVariableName, formatValueForVariable } from '@/lib/json-path-extractor';

// Method badge styles
const METHOD_BADGE_STYLES: Record<HttpMethod, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-green-100 text-green-700',
  PATCH: 'bg-yellow-100 text-yellow-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
};

// Status badge styles
function getStatusBadgeStyle(status: number): string {
  if (status >= 200 && status < 300) return 'bg-green-100 text-green-700 border-green-300';
  if (status >= 300 && status < 400) return 'bg-blue-100 text-blue-700 border-blue-300';
  if (status >= 400 && status < 500) return 'bg-orange-100 text-orange-700 border-orange-300';
  return 'bg-red-100 text-red-700 border-red-300';
}

// Plus icon for save to variable button
function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

// Extraction dialog component
interface ExtractionDialogProps {
  open: boolean;
  onClose: () => void;
  fieldPath: string;
  fieldValue: string;
  suggestedName: string;
  onSave: (name: string, value: string, isSecret: boolean) => void;
}

function ExtractionDialog({ open, onClose, fieldPath, fieldValue, suggestedName, onSave }: ExtractionDialogProps) {
  const [name, setName] = React.useState(suggestedName);

  React.useEffect(() => {
    setName(suggestedName);
  }, [suggestedName]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Save as Environment Variable</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
            <XMarkIcon className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">JSON Path</label>
            <div className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-600">
              {fieldPath}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Variable Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="variable_name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
            <div className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-600 max-h-20 overflow-auto break-all">
              {fieldValue.length > 200 ? fieldValue.substring(0, 200) + '...' : fieldValue}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (name.trim()) {
                onSave(name.trim(), fieldValue, false);
                onClose();
              }
            }}
            disabled={!name.trim()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-black rounded transition-colors disabled:opacity-50"
          >
            Save Variable
          </button>
        </div>
      </div>
    </div>
  );
}

interface CallCardProps {
  call: ApiCallEntry;
  onSaveVariable?: (name: string, value: string, isSecret?: boolean, metadata?: ResponseMetadata) => void;
}

function CallCard({ call, onSaveVariable }: CallCardProps) {
  const [responseBodyExpanded, setResponseBodyExpanded] = useState(true);
  const [responseHeadersExpanded, setResponseHeadersExpanded] = useState(false);
  const [metadataExpanded, setMetadataExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showRawRequest, setShowRawRequest] = useState(false);
  const [rawRequestCopied, setRawRequestCopied] = useState(false);
  const [extractionDialog, setExtractionDialog] = useState<{
    open: boolean;
    path: string;
    value: string;
    suggestedName: string;
  }>({ open: false, path: '', value: '', suggestedName: '' });
  const [savedVariables, setSavedVariables] = useState<Set<string>>(new Set());

  // Get saveable fields from response
  const saveableFields = React.useMemo(() => {
    if (call.response?.data && typeof call.response.data === 'object') {
      return detectSaveableFields(call.response.data);
    }
    return [];
  }, [call.response?.data]);

  // Handle save variable from response
  const handleSaveFromResponse = (name: string, value: string, isSecret: boolean) => {
    if (onSaveVariable) {
      const metadata: ResponseMetadata = {
        endpoint: call.path,
        method: call.method,
        timestamp: call.response?.requestMetadata?.timestamp || new Date().toISOString(),
        responseStatus: call.response?.status || 0,
        jsonPath: extractionDialog.path,
      };
      onSaveVariable(name, value, isSecret, metadata);
      setSavedVariables(prev => new Set(prev).add(name));
    }
  };

  // Open extraction dialog for a specific field
  const openExtractionDialog = (path: string, value: unknown) => {
    const stringValue = formatValueForVariable(value);
    setExtractionDialog({
      open: true,
      path,
      value: stringValue,
      suggestedName: suggestVariableName(path),
    });
  };

  // Batch save all auto-suggested fields
  const handleBatchSave = () => {
    if (!onSaveVariable) return;
    
    saveableFields.forEach(field => {
      const stringValue = formatValueForVariable(field.value);
      const metadata: ResponseMetadata = {
        endpoint: call.path,
        method: call.method,
        timestamp: call.response?.requestMetadata?.timestamp || new Date().toISOString(),
        responseStatus: call.response?.status || 0,
        jsonPath: field.path,
      };
      onSaveVariable(field.suggestedName, stringValue, false, metadata);
      setSavedVariables(prev => new Set(prev).add(field.suggestedName));
    });
  };

  // Format timestamp to time only
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  // Copy response to clipboard
  const handleCopy = async () => {
    if (!call.response?.data) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(call.response.data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Download response as JSON
  const handleDownload = () => {
    if (!call.response?.data) return;
    const blob = new Blob([JSON.stringify(call.response.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response-${call.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy raw request to clipboard
  const handleCopyRawRequest = async () => {
    const rawRequest = {
      method: call.method,
      path: call.path,
      ...(call.response?.requestMetadata?.fullUrl && {
        fullUrl: call.response.requestMetadata.fullUrl,
      }),
      ...(call.response?.requestMetadata && {
        metadata: {
          correlationId: call.response.requestMetadata.correlationId,
          ...(call.response.requestMetadata.idempotencyKey && {
            idempotencyKey: call.response.requestMetadata.idempotencyKey,
          }),
          timestamp: call.response.requestMetadata.timestamp,
        },
      }),
      ...(call.requestBody !== undefined && call.requestBody !== null && {
        body: call.requestBody,
      }),
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(rawRequest, null, 2));
      setRawRequestCopied(true);
      setTimeout(() => setRawRequestCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy raw request:', err);
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded">
      {/* Card Header */}
      <div className="px-3 py-4 bg-gray-50 border-b border-gray-300">
        <div className="space-y-1">
          {/* Top Row: Method, Name (if exists), Timestamp */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded flex-shrink-0 ${METHOD_BADGE_STYLES[call.method]}`}
              >
                {call.method}
              </span>
              {call.name && (
                <span className="text-sm font-medium text-gray-900 truncate">
                  {call.name}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowRawRequest(true)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="View raw request"
              >
                <CodeBracketIcon className="w-3.5 h-3.5 text-gray-600" />
              </button>
              <ClockIcon className="w-3 h-3" />
              <span>{formatTime(call.timestamp)}</span>
            </div>
          </div>

          {/* Second Row: Path */}
          <div className="flex items-center gap-2 min-w-0 pl-[52px]">
            <span className="text-xs font-mono text-gray-700 truncate">
              {call.path}
            </span>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-3">
        {/* Pending State */}
        {call.status === 'pending' && (
          <div className="flex items-center gap-2 text-gray-600">
            <div className="w-3.5 h-3.5 spinner" />
            <span className="text-xs">Sending request...</span>
          </div>
        )}

        {/* Error State */}
        {call.status === 'error' && (
          <div className="flex items-center gap-2 text-red-600">
            <ExclamationCircleIcon className="w-4 h-4" />
            <span className="text-xs">Request failed</span>
          </div>
        )}

        {/* Success State - Response Viewer */}
        {call.status === 'success' && call.response && (
          <div className="space-y-2">
            {/* Status Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${getStatusBadgeStyle(call.response.status)}`}
                >
                  {call.response.status} {call.response.statusText}
                </span>
                {call.duration !== undefined && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <ClockIcon className="w-3.5 h-3.5" />
                    {call.duration}ms
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`p-1.5 rounded transition-colors ${
                    copied ? 'text-green-600' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={copied ? 'Copied!' : 'Copy'}
                >
                  {copied ? (
                    <CheckIcon className="w-3.5 h-3.5" />
                  ) : (
                    <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Download"
                >
                  <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Response Body Panel (Collapsible) */}
            <div className="border border-gray-300 rounded">
              <button
                type="button"
                onClick={() => setResponseBodyExpanded(!responseBodyExpanded)}
                className="w-full flex items-center justify-between px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <div className="flex items-center gap-1">
                  {responseBodyExpanded ? (
                    <ChevronDownIcon className="w-3.5 h-3.5 text-gray-600" />
                  ) : (
                    <ChevronRightIcon className="w-3.5 h-3.5 text-gray-600" />
                  )}
                  <span className="text-xs font-medium text-gray-700">Response Body</span>
                </div>
              </button>
              {responseBodyExpanded && (
                <div className="bg-white">
                  {/* Quick actions bar */}
                  {onSaveVariable && saveableFields.length > 0 && (
                    <div className="px-2 py-1.5 bg-green-50 border-b border-gray-200 flex items-center justify-between">
                      <span className="text-[10px] text-green-700">
                        {saveableFields.length} field(s) detected: {saveableFields.slice(0, 3).map(f => f.suggestedName).join(', ')}
                        {saveableFields.length > 3 && '...'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBatchSave();
                        }}
                        className="px-2 py-0.5 text-[10px] font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                      >
                        Save All
                      </button>
                    </div>
                  )}
                  <div className="p-2 max-h-[300px] overflow-auto custom-scrollbar">
                    <JsonViewer 
                      data={call.response.data} 
                      onSaveValue={onSaveVariable ? openExtractionDialog : undefined}
                      saveableFields={saveableFields}
                      savedVariables={savedVariables}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Response Headers Panel (Collapsible) */}
            <div className="border border-gray-300 rounded">
              <button
                type="button"
                onClick={() => setResponseHeadersExpanded(!responseHeadersExpanded)}
                className="w-full flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                {responseHeadersExpanded ? (
                  <ChevronDownIcon className="w-3.5 h-3.5 text-gray-600" />
                ) : (
                  <ChevronRightIcon className="w-3.5 h-3.5 text-gray-600" />
                )}
                <span className="text-xs font-medium text-gray-700">Response Headers</span>
              </button>
              {responseHeadersExpanded && (
                <div className="p-2 bg-white space-y-1">
                  {Object.entries(call.response.headers).map(([key, value]) => (
                    <div key={key} className="flex gap-2 text-xs">
                      <span className="font-medium text-gray-700 min-w-[120px]">{key}</span>
                      <span className="text-gray-600 font-mono break-all">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Request Metadata Panel (Collapsible) */}
            <div className="border border-gray-300 rounded">
              <button
                type="button"
                onClick={() => setMetadataExpanded(!metadataExpanded)}
                className="w-full flex items-center gap-1 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                {metadataExpanded ? (
                  <ChevronDownIcon className="w-3.5 h-3.5 text-gray-600" />
                ) : (
                  <ChevronRightIcon className="w-3.5 h-3.5 text-gray-600" />
                )}
                <span className="text-xs font-medium text-gray-700">Request Metadata</span>
              </button>
              {metadataExpanded && (
                <div className="p-2 bg-white space-y-2">
                  <div className="flex items-start gap-2">
                    <LinkIcon className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-gray-700">Correlation ID:</div>
                      <div className="text-xs text-gray-600 font-mono break-all mt-0.5">
                        {call.response.requestMetadata.correlationId}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <ClockIcon className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-medium text-gray-700">Timestamp:</div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {call.response.requestMetadata.timestamp}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Extraction Dialog */}
      <ExtractionDialog
        open={extractionDialog.open}
        onClose={() => setExtractionDialog(prev => ({ ...prev, open: false }))}
        fieldPath={extractionDialog.path}
        fieldValue={extractionDialog.value}
        suggestedName={extractionDialog.suggestedName}
        onSave={handleSaveFromResponse}
      />

      {/* Raw Request Modal */}
      {showRawRequest && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRawRequest(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Raw Request</h3>
              <button
                type="button"
                onClick={() => setShowRawRequest(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto p-3">
              <pre className="text-xs font-mono text-gray-800 leading-relaxed">
                {/* HTTP Request Line */}
                <span className="text-blue-600 font-semibold">{call.method}</span> {call.response?.requestMetadata?.fullUrl || call.path}
                {'\n\n'}
                {/* Headers Section */}
                <span className="text-gray-500"># Headers</span>
                {'\n'}
                X-Correlation-ID: {call.response?.requestMetadata?.correlationId || 'N/A'}
                {call.response?.requestMetadata?.idempotencyKey && (
                  <>
                    {'\n'}
                    Idempotency-Key: {call.response.requestMetadata.idempotencyKey}
                  </>
                )}
                {call.response?.requestMetadata?.timestamp && (
                  <>
                    {'\n'}
                    Timestamp: {call.response.requestMetadata.timestamp}
                  </>
                )}
                {/* Request Body */}
                {call.requestBody !== undefined && call.requestBody !== null && (
                  <>
                    {'\n\n'}
                    <span className="text-gray-500"># Body</span>
                    {'\n'}
                    <span className="text-purple-600">{JSON.stringify(call.requestBody, null, 2)}</span>
                  </>
                )}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={handleCopyRawRequest}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded transition-colors ${
                  rawRequestCopied
                    ? 'text-green-700 bg-green-50 border border-green-300'
                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {rawRequestCopied ? (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowRawRequest(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CallHistoryPanelProps {
  calls: ApiCallEntry[];
  onSaveVariable?: (name: string, value: string, isSecret?: boolean, metadata?: ResponseMetadata) => void;
}

export default function CallHistoryPanel({ calls, onSaveVariable }: CallHistoryPanelProps) {
  // Empty state
  if (calls.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded flex items-center justify-center">
            <ArrowRightIcon className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-1">No API calls yet</h3>
          <p className="text-xs text-gray-500 max-w-[384px]">
            Select an endpoint and send a request below. All API calls will be logged here in chronological order.
          </p>
        </div>
      </div>
    );
  }

  // With call history
  return (
    <div className="max-w-5xl mx-auto px-4 py-3 space-y-3">
      {calls.map((call) => (
        <CallCard key={call.id} call={call} onSaveVariable={onSaveVariable} />
      ))}
    </div>
  );
}
