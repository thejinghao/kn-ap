'use client';

import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  HttpMethod,
  HeaderEntry,
  ProxyResponse,
  EndpointPreset,
  PathParamEntry,
  ApiCallEntry,
  ResponseMetadata,
} from '@/lib/types';
import RequestForm from '@/components/RequestForm';
import CallHistoryPanel from '@/components/CallHistoryPanel';
import { useEnvironment } from '@/lib/env-context';
import { staticEndpointPresets } from '@/lib/endpoints';
import { useCallHistory } from '@/lib/hooks/useCallHistory';

// Inner component that uses environment context
function HomeContent() {
  // Environment context for variable substitution
  const { substituteVariables, findMissingVariables, saveFromResponse } = useEnvironment();

  // Request state
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointPreset | null>(null);
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [path, setPath] = useState('');
  const [headers, setHeaders] = useState<HeaderEntry[]>([]);
  const [body, setBody] = useState('');
  const [pathParams, setPathParams] = useState<PathParamEntry[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);

  // Call history state (persisted to DB with localStorage fallback)
  const { calls: callHistory, addCall, updateCall: updateCallEntry } = useCallHistory();

  // Handler for saving response values as environment variables
  const handleSaveVariable = useCallback((name: string, value: string, isSecret?: boolean, metadata?: ResponseMetadata) => {
    saveFromResponse(name, value, isSecret, metadata);
  }, [saveFromResponse]);

  // Handle endpoint selection
  const handleSelectEndpoint = useCallback((preset: EndpointPreset | null) => {
    setSelectedEndpoint(preset);
    if (preset) {
      setMethod(preset.method);
      setPath(preset.endpoint);
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
      const paramEntries: PathParamEntry[] = [];
      if (preset.pathParams && preset.pathParams.length > 0) {
        paramEntries.push(...preset.pathParams.map((param) => ({
          id: `${preset.id}-${param.name}`,
          name: param.name,
          value: '',
          required: param.required,
          description: param.description,
        })));
      }
      // Also add query string variables as parameters
      if (preset.queryParams && preset.queryParams.length > 0) {
        paramEntries.push(...preset.queryParams.map((param) => ({
          id: `${preset.id}-qp-${param.name}`,
          name: param.name,
          value: '',
          required: param.required,
          description: param.description,
          isQueryParam: true,
        })));
      }
      setPathParams(paramEntries);
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
    } else {
      setPath('');
      setBody('');
      setPathParams([]);
      setHeaders([]);
    }
  }, []);

  // Read endpoint from sessionStorage on component mount (for navigation from account structure pages)
  useEffect(() => {
    const endpointId = sessionStorage.getItem('selectedEndpointId');
    if (endpointId) {
      const endpoint = staticEndpointPresets.find(e => e.id === endpointId);
      if (endpoint) {
        handleSelectEndpoint(endpoint);
      }
      // Clear sessionStorage to prevent reapplication on refresh
      sessionStorage.removeItem('selectedEndpointId');
    }
  }, [handleSelectEndpoint]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    const callId = uuidv4();
    const startTime = Date.now();

    // Replace path and query parameters in the endpoint
    let finalPath = path;
    pathParams.forEach((param) => {
      if (param.value) {
        // Substitute environment variables in param values first
        const substitutedValue = substituteVariables(param.value);
        if (param.isQueryParam) {
          // Query params use {{name}} format in the URL
          finalPath = finalPath.replaceAll(`{{${param.name}}}`, substitutedValue);
        } else {
          // Path params use {name} format in the URL
          finalPath = finalPath.replace(`{${param.name}}`, substitutedValue);
        }
      }
    });

    // Also substitute any remaining {{variables}} in the path itself
    finalPath = substituteVariables(finalPath);

    // Check for missing environment variables in the path
    const missingEnvVars = findMissingVariables(finalPath);
    if (missingEnvVars.length > 0) {
      const errorEntry: ApiCallEntry = {
        id: callId,
        name: selectedEndpoint?.name,
        method,
        path: finalPath,
        timestamp: new Date(),
        status: 'error',
        requestBody: body ? JSON.parse(body) : undefined,
        error: `Missing environment variables: ${missingEnvVars.join(', ')}`,
      };
      addCall(errorEntry);
      return;
    }

    // Validate required path parameters
    const missingParams = pathParams.filter((p) => p.required && !p.value);
    if (missingParams.length > 0) {
      // Create error entry
      const errorEntry: ApiCallEntry = {
        id: callId,
        name: selectedEndpoint?.name,
        method,
        path: finalPath,
        timestamp: new Date(),
        status: 'error',
        requestBody: body ? JSON.parse(body) : undefined,
        error: `Missing required path parameters: ${missingParams.map((p) => p.name).join(', ')}`,
      };
      addCall(errorEntry);
      return;
    }

    // Create pending entry
    const pendingEntry: ApiCallEntry = {
      id: callId,
      name: selectedEndpoint?.name,
      method,
      path: finalPath,
      timestamp: new Date(),
      status: 'pending',
      requestBody: body && body.trim() ? JSON.parse(body) : undefined,
    };

    // Add to history (at the beginning for chronological order - newest first)
    addCall(pendingEntry);
    setIsLoading(true);
    setIsFormCollapsed(true);

    try {
      // Build headers from the headers array (both required and custom)
      // Also substitute environment variables in header values
      const requestHeaders: Record<string, string> = {};
      headers
        .filter((h) => h.key && h.value) // Include all headers with key and value
        .forEach((h) => {
          requestHeaders[h.key] = substituteVariables(h.value);
        });

      // Parse body if it exists
      let parsedBody: unknown = undefined;
      if (body && body.trim() !== '' && ['POST', 'PATCH', 'PUT'].includes(method)) {
        try {
          // Substitute environment variables in body before parsing
          const substitutedBody = substituteVariables(body);
          parsedBody = JSON.parse(substitutedBody);
        } catch {
          // Update entry with error
          const duration = Date.now() - startTime;
          updateCallEntry(callId, { status: 'error', error: 'Invalid JSON in request body', duration });
          setIsLoading(false);
          return;
        }
      }

      // Make request to our proxy endpoint
      const proxyResponse = await axios.post<ProxyResponse>('/api/klarna-proxy', {
        method,
        endpoint: finalPath,
        headers: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
        body: parsedBody,
      });

      const duration = Date.now() - startTime;

      // Update entry with response
      updateCallEntry(callId, {
        status: 'success',
        response: proxyResponse.data,
        duration,
      });
    } catch (err) {
      const duration = Date.now() - startTime;
      let errorMessage = 'An unexpected error occurred';
      let response: ProxyResponse | undefined;

      if (axios.isAxiosError(err)) {
        if (err.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.message) {
          errorMessage = err.message;
        }
        if (err.response?.data) {
          response = err.response.data;
        }
      }

      // Update entry with error
      updateCallEntry(callId, {
        status: response ? 'success' : 'error',
        error: response ? undefined : errorMessage,
        response,
        duration,
      });
    } finally {
      setIsLoading(false);
    }
  }, [method, path, headers, body, pathParams, selectedEndpoint?.name, substituteVariables, findMissingVariables, addCall, updateCallEntry]);

  // Calculate bottom padding for call history based on form state
  const formHeight = isFormCollapsed ? 65 : 420; // Approximate heights

  return (
    <div className="h-[calc(100vh-57px)] flex flex-col bg-gray-50">
      {/* Scrollable Call History Area */}
      <div
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar"
        style={{ paddingBottom: formHeight }}
      >
        <CallHistoryPanel calls={callHistory} onSaveVariable={handleSaveVariable} />
      </div>

      {/* Fixed Bottom Request Form */}
      <RequestForm
        method={method}
        path={path}
        headers={headers}
        body={body}
        isLoading={isLoading}
        isCollapsed={isFormCollapsed}
        pathParams={pathParams}
        selectedEndpoint={selectedEndpoint}
        onMethodChange={setMethod}
        onPathChange={setPath}
        onHeadersChange={setHeaders}
        onBodyChange={setBody}
        onPathParamsChange={setPathParams}
        onSubmit={handleSubmit}
        onToggleCollapse={() => setIsFormCollapsed(!isFormCollapsed)}
        onSelectEndpoint={handleSelectEndpoint}
      />
    </div>
  );
}

// Main component - EnvironmentProvider is now at the root layout level
export default function Home() {
  return <HomeContent />;
}
