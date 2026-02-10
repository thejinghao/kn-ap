'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { HttpMethod, HeaderEntry, PathParamEntry, EndpointPreset } from '@/lib/types';
import EndpointSelector from './EndpointSelector';
import { useEnvironment } from '@/lib/env-context';
import { AutocompleteInput, AutocompleteTextarea } from './AutocompleteInput';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'];

interface RequestFormProps {
  method: HttpMethod;
  path: string;
  headers: HeaderEntry[];
  body: string;
  isLoading: boolean;
  isCollapsed: boolean;
  pathParams: PathParamEntry[];
  selectedEndpoint: EndpointPreset | null;
  onMethodChange: (method: HttpMethod) => void;
  onPathChange: (path: string) => void;
  onHeadersChange: (headers: HeaderEntry[]) => void;
  onBodyChange: (body: string) => void;
  onPathParamsChange?: (pathParams: PathParamEntry[]) => void;
  onSubmit: () => void;
  onToggleCollapse: () => void;
  onSelectEndpoint: (preset: EndpointPreset | null) => void;
}

export default function RequestForm({
  method,
  path,
  headers,
  body,
  isLoading,
  isCollapsed,
  selectedEndpoint,
  pathParams,
  onMethodChange,
  onPathChange,
  onHeadersChange,
  onBodyChange,
  onSubmit,
  onToggleCollapse,
  onSelectEndpoint,
  onPathParamsChange,
}: RequestFormProps) {
  const [headersExpanded, setHeadersExpanded] = useState(false);
  const [pathParamsExpanded, setPathParamsExpanded] = useState(true);
  const [bodyError, setBodyError] = useState<string | null>(null);

  // Get environment variables for autocomplete
  const { getAllVariables } = useEnvironment();
  const allVariables = getAllVariables();

  // Separate required and custom headers
  const requiredHeaders = headers.filter(h => h.isRequired);
  const customHeaders = headers.filter(h => !h.isRequired);

  // Validate JSON body
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

  // Remove a header
  const handleRemoveHeader = (id: string) => {
    onHeadersChange(headers.filter((h) => h.id !== id));
  };

  // Update a header
  const handleUpdateHeader = (id: string, field: 'key' | 'value', newValue: string) => {
    onHeadersChange(
      headers.map((h) => (h.id === id ? { ...h, [field]: newValue } : h))
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
    if (bodyError || !path.trim()) return;
    onSubmit();
  };

  // Handle endpoint selection from dropdown
  const handleSelectEndpoint = (preset: EndpointPreset) => {
    onSelectEndpoint(preset);
    onMethodChange(preset.method);
    onPathChange(preset.endpoint);
    
    // Set body template
    if (preset.bodyTemplate) {
      // If bodyTemplate is already a formatted string, use it directly
      // Otherwise, stringify it with formatting
      onBodyChange(
        typeof preset.bodyTemplate === 'string' 
          ? preset.bodyTemplate 
          : JSON.stringify(preset.bodyTemplate, null, 2)
      );
    } else {
      onBodyChange('');
    }
    
    // Set required headers if available
    const newHeaders: HeaderEntry[] = [];
    if (preset.requiredHeaders && preset.requiredHeaders.length > 0) {
      preset.requiredHeaders.forEach((header) => {
        newHeaders.push({
          id: `${preset.id}-header-${header.name}`,
          key: header.name,
          value: header.example || '',
          isRequired: true,
        });
      });
    }
    onHeadersChange(newHeaders);
  };

  // Handle "Use Custom Endpoint" selection
  const handleUseCustom = () => {
    onSelectEndpoint(null);
    onPathChange('');
    onBodyChange('');
  };

  // Update a path parameter
  const handleUpdatePathParam = (id: string, newValue: string) => {
    if (onPathParamsChange) {
      onPathParamsChange(
        pathParams.map((p) =>
          p.id === id ? { ...p, value: newValue } : p
        )
      );
    }
  };

  const showBodyEditor = ['POST', 'PATCH', 'PUT'].includes(method);
  const customHeaderCount = customHeaders.filter((h) => h.key).length;
  const totalHeaderCount = requiredHeaders.length + customHeaderCount;
  const hasRequiredMissingParams = pathParams.some((p) => p.required && !p.value);

  // Collapsed state
  if (isCollapsed) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-300">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <button
            type="button"
            onClick={onToggleCollapse}
            className="w-full py-2 px-3 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors"
          >
            + New Request
          </button>
        </div>
      </div>
    );
  }

  // Expanded state
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-300">
      <div className="max-w-5xl mx-auto px-4 py-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">New Request</span>
            <button
              type="button"
              onClick={onToggleCollapse}
              className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
            >
              Collapse
            </button>
          </div>

          {/* Endpoint Selector */}
          <EndpointSelector
            selectedEndpoint={selectedEndpoint}
            onSelectEndpoint={handleSelectEndpoint}
            onUseCustom={handleUseCustom}
          />

          {/* Method + Path Row */}
          <div className="flex gap-2">
            <div className="relative">
              <select
                value={method}
                onChange={(e) => onMethodChange(e.target.value as HttpMethod)}
                disabled={isLoading}
                className="appearance-none w-24 px-2 py-1.5 pr-7 text-sm border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
            </div>

            <AutocompleteInput
              value={path}
              onChange={onPathChange}
              variables={allVariables}
              placeholder="/api/v1/..."
              disabled={isLoading}
              wrapperClassName="relative flex-1"
              className="w-full px-2 py-1.5 text-sm font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Path Parameters Collapsible */}
          {pathParams.length > 0 && (
            <div className="border border-gray-300 rounded">
              <button
                type="button"
                onClick={() => setPathParamsExpanded(!pathParamsExpanded)}
                className="w-full flex items-center justify-between px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="flex items-center gap-1">
                  {pathParamsExpanded ? (
                    <ChevronDownIcon className="w-3.5 h-3.5 text-gray-600" />
                  ) : (
                    <ChevronRightIcon className="w-3.5 h-3.5 text-gray-600" />
                  )}
                  <span className="text-xs font-medium text-gray-700">
                    Parameters ({pathParams.length})
                    {hasRequiredMissingParams && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </span>
                </span>
              </button>

              {pathParamsExpanded && (
                <div className="p-2 bg-white space-y-2">
                  {pathParams.map((param) => (
                    <div key={param.id}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {param.name}
                        {param.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <AutocompleteInput
                        value={param.value}
                        onChange={(newValue) => handleUpdatePathParam(param.id, newValue)}
                        variables={allVariables}
                        placeholder={`Enter ${param.name}`}
                        disabled={isLoading}
                        required={param.required}
                        className="w-full px-2 py-1 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Headers Collapsible */}
          <div className="border border-gray-300 rounded">
            <button
              type="button"
              onClick={() => setHeadersExpanded(!headersExpanded)}
              className="w-full flex items-center justify-between px-3 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="flex items-center gap-1">
                {headersExpanded ? (
                  <ChevronDownIcon className="w-3.5 h-3.5 text-gray-600" />
                ) : (
                  <ChevronRightIcon className="w-3.5 h-3.5 text-gray-600" />
                )}
                <span className="text-xs font-medium text-gray-700">
                  Headers ({totalHeaderCount})
                </span>
              </span>
            </button>

            {headersExpanded && (
              <div className="p-2 bg-white space-y-2">
                {/* Required Headers */}
                {requiredHeaders.length > 0 && (
                  <>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Required Headers
                    </div>
                    {requiredHeaders.map((header) => (
                      <div key={header.id}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {header.key}
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <AutocompleteInput
                          value={header.value}
                          onChange={(newValue) => handleUpdateHeader(header.id, 'value', newValue)}
                          variables={allVariables}
                          placeholder={`Enter ${header.key}`}
                          disabled={isLoading}
                          className="w-full px-2 py-1 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                    ))}
                  </>
                )}

                {/* Custom Headers */}
                {(requiredHeaders.length > 0 && customHeaders.length > 0) && (
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide pt-1 border-t border-gray-200">
                    Custom Headers
                  </div>
                )}
                
                {customHeaders.map((header) => (
                  <div key={header.id} className="flex items-center gap-1">
                    <AutocompleteInput
                      value={header.key}
                      onChange={(newValue) => handleUpdateHeader(header.id, 'key', newValue)}
                      variables={allVariables}
                      placeholder="Header name"
                      disabled={isLoading}
                      className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100"
                    />
                    <AutocompleteInput
                      value={header.value}
                      onChange={(newValue) => handleUpdateHeader(header.id, 'value', newValue)}
                      variables={allVariables}
                      placeholder="Header value"
                      disabled={isLoading}
                      className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-100"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveHeader(header.id)}
                      disabled={isLoading}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddHeader}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Add Custom Header
                </button>
              </div>
            )}
          </div>

          {/* Request Body (POST/PATCH/PUT only) */}
          {showBodyEditor && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">
                  Request Body
                </label>
                <button
                  type="button"
                  onClick={handleFormatBody}
                  disabled={isLoading || !body}
                  className="text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
                >
                  Format JSON
                </button>
              </div>
              <AutocompleteTextarea
                value={body}
                onChange={onBodyChange}
                variables={allVariables}
                placeholder={'{\n  "key": "value"\n}'}
                disabled={isLoading}
                rows={8}
                className={`w-full px-2 py-1.5 text-xs font-mono border rounded focus:outline-none focus:ring-1 resize-y disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  bodyError
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-gray-400'
                }`}
              />
              {bodyError && (
                <p className="text-xs text-red-600">{bodyError}</p>
              )}
            </div>
          )}

          {/* Send Button */}
          <button
            type="submit"
            disabled={isLoading || !!bodyError || !path.trim()}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 spinner" />
                Sending...
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="w-4 h-4" />
                Send Request
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
