'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { HttpMethod, HeaderEntry, ProxyResponse, EndpointPreset, PathParamEntry } from '@/lib/types';
import PresetSelector from './PresetSelector';
import RequestPanel from './RequestPanel';
import ResponsePanel from './ResponsePanel';

// Toast severity styles
const TOAST_STYLES = {
  success: 'bg-green-50 text-green-800 border-green-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  info: 'bg-blue-50 text-blue-800 border-blue-200',
};

const TOAST_ICONS = {
  success: CheckCircleIcon,
  error: ExclamationCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

export default function ApiTester() {
  // Request state
  const [selectedPreset, setSelectedPreset] = useState<string | null>('list-api-keys');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [endpoint, setEndpoint] = useState('/v2/account/integration/credentials/api-key');
  const [headers, setHeaders] = useState<HeaderEntry[]>([]);
  const [body, setBody] = useState('');
  const [pathParams, setPathParams] = useState<PathParamEntry[]>([]);

  // Response state
  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Toast state
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Auto-hide toast after 4 seconds
  useEffect(() => {
    if (toast.open) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, open: false }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.open]);

  // Handle preset selection
  const handleSelectPreset = useCallback((preset: EndpointPreset) => {
    setSelectedPreset(preset.id);
    setMethod(preset.method);
    setEndpoint(preset.endpoint);
    
    // Set body template if available
    if (preset.bodyTemplate) {
      // If bodyTemplate is already a formatted string, use it directly
      // Otherwise, stringify it with formatting
      setBody(
        typeof preset.bodyTemplate === 'string' 
          ? preset.bodyTemplate 
          : JSON.stringify(preset.bodyTemplate, null, 2)
      );
    } else {
      setBody('');
    }

    // Set path parameters if available
    if (preset.pathParams && preset.pathParams.length > 0) {
      const paramEntries: PathParamEntry[] = preset.pathParams.map((param) => ({
        id: `${preset.id}-${param.name}`,
        name: param.name,
        value: '',
        required: param.required,
        description: param.description,
      }));
      setPathParams(paramEntries);
    } else {
      setPathParams([]);
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
    setHeaders(newHeaders);

    // Clear previous response when changing presets
    setResponse(null);
    setError(null);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Replace path parameters in the endpoint
      let finalEndpoint = endpoint;
      pathParams.forEach((param) => {
        if (param.value) {
          finalEndpoint = finalEndpoint.replace(`{${param.name}}`, param.value);
        }
      });

      // Validate that all required path parameters have values
      const missingParams = pathParams.filter((p) => p.required && !p.value);
      if (missingParams.length > 0) {
        setError(`Missing required path parameters: ${missingParams.map(p => p.name).join(', ')}`);
        setIsLoading(false);
        return;
      }

      // Build headers from the headers array (both required and custom)
      const requestHeaders: Record<string, string> = {};
      headers
        .filter((h) => h.key && h.value) // Include all headers with key and value
        .forEach((h) => {
          requestHeaders[h.key] = h.value;
        });

      // Parse body if it exists
      let parsedBody: unknown = undefined;
      if (body && body.trim() !== '' && ['POST', 'PATCH', 'PUT'].includes(method)) {
        try {
          parsedBody = JSON.parse(body);
        } catch {
          setError('Invalid JSON in request body');
          setIsLoading(false);
          return;
        }
      }

      // Make request to our proxy endpoint
      const proxyResponse = await axios.post<ProxyResponse>('/api/klarna-proxy', {
        method,
        endpoint: finalEndpoint,
        headers: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
        body: parsedBody,
      });

      setResponse(proxyResponse.data);

      // Show success/error toast
      if (proxyResponse.data.success) {
        setToast({
          open: true,
          message: `Request successful: ${proxyResponse.data.status} ${proxyResponse.data.statusText}`,
          severity: 'success',
        });
      } else {
        setToast({
          open: true,
          message: `Request failed: ${proxyResponse.data.status} ${proxyResponse.data.statusText}`,
          severity: 'warning',
        });
      }
    } catch (err) {
      console.error('Request error:', err);
      
      let errorMessage = 'An unexpected error occurred';
      if (axios.isAxiosError(err)) {
        if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        // If we got a response from our proxy, display it
        if (err.response?.data) {
          setResponse(err.response.data);
        }
      }
      
      setError(errorMessage);
      setToast({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [method, endpoint, headers, body, pathParams]);

  // Handle toast close
  const handleCloseToast = () => {
    setToast((prev) => ({ ...prev, open: false }));
  };

  const ToastIcon = TOAST_ICONS[toast.severity];

  return (
    <div>
      {/* Error Alert */}
      {error && (
        <div className="flex items-center justify-between gap-3 p-3 mb-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
          <div className="flex items-center gap-2">
            <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 rounded hover:bg-red-100 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Preset Selector */}
      <PresetSelector
        selectedPreset={selectedPreset}
        onSelectPreset={handleSelectPreset}
      />

      {/* Request and Response Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RequestPanel
          method={method}
          endpoint={endpoint}
          headers={headers}
          body={body}
          isLoading={isLoading}
          pathParams={pathParams}
          onMethodChange={setMethod}
          onEndpointChange={setEndpoint}
          onHeadersChange={setHeaders}
          onBodyChange={setBody}
          onPathParamsChange={setPathParams}
          onSubmit={handleSubmit}
        />
        <ResponsePanel
          response={response}
          isLoading={isLoading}
        />
      </div>

      {/* Toast notification */}
      {toast.open && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${TOAST_STYLES[toast.severity]}`}>
            <ToastIcon className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={handleCloseToast}
              className="p-1 rounded hover:bg-black/5 transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
