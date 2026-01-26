'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { HttpMethod, HeaderEntry, RequestPanelProps, PathParamEntry } from '@/lib/types';
import { hasVariables } from '@/lib/env-substitution';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'];

// Environment variable indicator badge
function EnvVarBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded">
      ENV
    </span>
  );
}

const METHOD_TEXT_COLORS: Record<HttpMethod, string> = {
  GET: 'text-method-get',
  POST: 'text-method-post',
  PATCH: 'text-method-patch',
  PUT: 'text-method-put',
  DELETE: 'text-method-delete',
};

// Collapsible/Accordion component
function Collapsible({
  title,
  expanded,
  onToggle,
  badge,
  errorBadge,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  badge?: number;
  errorBadge?: string;
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
          {badge !== undefined && badge > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-klarna-black text-white rounded-full">
              {badge}
            </span>
          )}
          {errorBadge && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
              {errorBadge}
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

export default function RequestPanel({
  method,
  endpoint,
  headers,
  body,
  isLoading,
  pathParams,
  onMethodChange,
  onEndpointChange,
  onHeadersChange,
  onBodyChange,
  onPathParamsChange,
  onSubmit,
}: RequestPanelProps) {
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [pathParamsExpanded, setPathParamsExpanded] = useState(true);
  const [headersExpanded, setHeadersExpanded] = useState(false);
  const [bodyExpanded, setBodyExpanded] = useState(true);
  
  // Separate required and custom headers
  const requiredHeaders = headers.filter(h => h.isRequired);
  const customHeaders = headers.filter(h => !h.isRequired);

  // Validate JSON body when it changes
  useEffect(() => {
    if (!body || body.trim() === '') {
      setBodyError(null);
      return;
    }
    
    try {
      JSON.parse(body);
      setBodyError(null);
    } catch {
      setBodyError('Invalid JSON format');
    }
  }, [body]);

  // Add a new custom header
  const handleAddHeader = () => {
    const newHeader: HeaderEntry = {
      id: `custom-${Date.now()}`,
      key: '',
      value: '',
      isRequired: false,
    };
    onHeadersChange([...headers, newHeader]);
  };

  // Remove a custom header
  const handleRemoveHeader = (id: string) => {
    onHeadersChange(headers.filter((h) => h.id !== id));
  };

  // Update a header
  const handleUpdateHeader = (id: string, field: 'key' | 'value', newValue: string) => {
    onHeadersChange(
      headers.map((h) =>
        h.id === id ? { ...h, [field]: newValue } : h
      )
    );
  };

  // Update a path parameter
  const handleUpdatePathParam = (id: string, newValue: string) => {
    onPathParamsChange(
      pathParams.map((p) =>
        p.id === id ? { ...p, value: newValue } : p
      )
    );
  };

  // Format JSON body
  const handleFormatBody = () => {
    if (!body || body.trim() === '') return;
    
    try {
      const parsed = JSON.parse(body);
      onBodyChange(JSON.stringify(parsed, null, 2));
      setBodyError(null);
    } catch {
      setBodyError('Cannot format: Invalid JSON');
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bodyError) return;
    onSubmit();
  };

  const showBodyEditor = ['POST', 'PATCH', 'PUT'].includes(method);
  const hasRequiredMissingParams = pathParams.some((p) => p.required && !p.value);
  const customHeaderCount = customHeaders.filter((h) => h.key).length;
  const totalHeaderCount = requiredHeaders.length + customHeaderCount;

  return (
    <div className="bg-white rounded-lg shadow p-4 h-full">
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Request</h2>

      <form onSubmit={handleSubmit}>
        {/* Method and Endpoint */}
        <div className="flex gap-2 mb-4">
          <div className="relative">
            <select
              value={method}
              onChange={(e) => onMethodChange(e.target.value as HttpMethod)}
              disabled={isLoading}
              className={`appearance-none w-28 px-3 py-2.5 pr-8 border border-gray-300 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${METHOD_TEXT_COLORS[method]}`}
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m} className={METHOD_TEXT_COLORS[m]}>
                  {m}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          <input
            type="text"
            value={endpoint}
            onChange={(e) => onEndpointChange(e.target.value)}
            placeholder="/v2/account/integration/credentials/api-key"
            disabled={isLoading}
            className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed font-mono text-sm"
          />
        </div>

        {/* Path Parameters Collapsible */}
        {pathParams.length > 0 && (
          <Collapsible
            title="Path Parameters"
            expanded={pathParamsExpanded}
            onToggle={() => setPathParamsExpanded(!pathParamsExpanded)}
            badge={pathParams.length}
            errorBadge={hasRequiredMissingParams ? 'Required' : undefined}
          >
            <div className="space-y-3">
              {pathParams.map((param) => {
                const hasEnvVar = hasVariables(param.value);
                return (
                  <div key={param.id}>
                    <label className="flex items-center text-xs font-medium text-gray-600 mb-1">
                      {param.name}
                      {param.required && <span className="text-red-500 ml-1">*</span>}
                      <EnvVarBadge show={hasEnvVar} />
                    </label>
                    <input
                      type="text"
                      value={param.value}
                      onChange={(e) => handleUpdatePathParam(param.id, e.target.value)}
                      placeholder={`Enter ${param.name} or use {{variable}}`}
                      disabled={isLoading}
                      required={param.required}
                      className={`w-full px-3 py-2 text-sm font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                        hasEnvVar ? 'border-purple-300 bg-purple-50' : 'border-gray-300'
                      }`}
                    />
                    {hasEnvVar && (
                      <p className="mt-1 text-[10px] text-purple-600">
                        Contains environment variable reference
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Collapsible>
        )}

        {/* Headers Collapsible */}
        <Collapsible
          title="Headers"
          expanded={headersExpanded}
          onToggle={() => setHeadersExpanded(!headersExpanded)}
          badge={totalHeaderCount > 0 ? totalHeaderCount : undefined}
        >
          <div className="space-y-3">
            {/* Required Headers */}
            {requiredHeaders.length > 0 && (
              <>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Required Headers
                </div>
                {requiredHeaders.map((header) => {
                  const hasEnvVar = hasVariables(header.value);
                  return (
                    <div key={header.id}>
                      <label className="flex items-center text-xs font-medium text-gray-600 mb-1">
                        {header.key}
                        <span className="text-red-500 ml-1">*</span>
                        <EnvVarBadge show={hasEnvVar} />
                      </label>
                      <input
                        type="text"
                        value={header.value}
                        onChange={(e) => handleUpdateHeader(header.id, 'value', e.target.value)}
                        placeholder={`Enter ${header.key} or use {{variable}}`}
                        disabled={isLoading}
                        className={`w-full px-3 py-2 text-sm font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                          hasEnvVar ? 'border-purple-300 bg-purple-50' : 'border-gray-300'
                        }`}
                      />
                    </div>
                  );
                })}
              </>
            )}

            {/* Custom Headers */}
            {(requiredHeaders.length > 0 && customHeaders.length > 0) && (
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide pt-2 border-t border-gray-200">
                Custom Headers
              </div>
            )}
            
            {customHeaders.map((header) => {
              const hasEnvVar = hasVariables(header.value);
              return (
                <div key={header.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={header.key}
                    onChange={(e) => handleUpdateHeader(header.id, 'key', e.target.value)}
                    placeholder="X-Custom-Header"
                    disabled={isLoading}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent disabled:bg-gray-100"
                  />
                  <div className="flex-[2] relative">
                    <input
                      type="text"
                      value={header.value}
                      onChange={(e) => handleUpdateHeader(header.id, 'value', e.target.value)}
                      placeholder="value or {{variable}}"
                      disabled={isLoading}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent disabled:bg-gray-100 ${
                        hasEnvVar ? 'border-purple-300 bg-purple-50 pr-14' : 'border-gray-300'
                      }`}
                    />
                    {hasEnvVar && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded">
                        ENV
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveHeader(header.id)}
                    disabled={isLoading}
                    title="Remove header"
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleAddHeader}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusIcon className="h-4 w-4" />
              Add Custom Header
            </button>
          </div>
        </Collapsible>

        {/* Body Editor (for POST/PATCH/PUT) */}
        {showBodyEditor && (() => {
          const bodyHasEnvVars = hasVariables(body);
          return (
            <Collapsible
              title="Body"
              expanded={bodyExpanded}
              onToggle={() => setBodyExpanded(!bodyExpanded)}
              errorBadge={bodyError ? 'Invalid' : undefined}
            >
              <div className="space-y-3">
                {bodyHasEnvVars && (
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded">
                      ENV
                    </span>
                    <span className="text-xs text-purple-700">
                      Body contains environment variable references that will be substituted on send
                    </span>
                  </div>
                )}
                <div>
                  <textarea
                    value={body}
                    onChange={(e) => onBodyChange(e.target.value)}
                    placeholder={'{\n  "key": "value",\n  "id": "{{variable_name}}"\n}'}
                    disabled={isLoading}
                    rows={12}
                    className={`w-full px-3 py-2 text-sm font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-y ${
                      bodyError ? 'border-red-300 bg-red-50' : bodyHasEnvVars ? 'border-purple-300' : 'border-gray-300'
                    }`}
                  />
                  {bodyError && (
                    <p className="mt-1 text-xs text-red-600">{bodyError}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleFormatBody}
                  disabled={isLoading || !body}
                  className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Format JSON
                </button>
              </div>
            </Collapsible>
          );
        })()}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !!bodyError}
          className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-klarna-black rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Sending...
            </>
          ) : (
            <>
              <PaperAirplaneIcon className="h-4 w-4" />
              Send
            </>
          )}
        </button>
      </form>
    </div>
  );
}
