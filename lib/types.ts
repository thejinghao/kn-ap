// HTTP Methods supported by Klarna API
export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

// Request configuration sent to the proxy
export interface ProxyRequest {
  method: HttpMethod;
  endpoint: string;
  headers?: Record<string, string>;
  body?: unknown;
}

// Response from the proxy
export interface ProxyResponse {
  success: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  requestMetadata: RequestMetadata;
  error?: string;
}

// Metadata about the request
export interface RequestMetadata {
  timestamp: string;
  fullUrl: string;
  method: string;
  correlationId: string;
  idempotencyKey?: string;
}

// Header key-value pair for the UI
export interface HeaderEntry {
  id: string;
  key: string;
  value: string;
  isRequired?: boolean;
}

// Parameter definition for path/query/header params
export interface ParameterDefinition {
  name: string;
  description?: string;
  required: boolean;
  type?: 'string' | 'number' | 'boolean';
  example?: string;
}

// Preset API endpoint configuration
export interface EndpointPreset {
  id: string;
  name: string;
  description: string;
  method: HttpMethod;
  endpoint: string;
  category: EndpointCategory;
  bodyTemplate?: unknown;
  headers?: Record<string, string>;
  pathParams?: ParameterDefinition[];
  queryParams?: ParameterDefinition[];
  requiredHeaders?: ParameterDefinition[];
}

// Path parameter entry for UI
export interface PathParamEntry {
  id: string;
  name: string;
  value: string;
  required: boolean;
  description?: string;
}

// Categories for grouping endpoints
export type EndpointCategory = 
  | 'credentials'
  | 'accounts'
  | 'onboarding'
  | 'payments'
  | 'webhooks'
  | 'settlements'
  | 'other';

// Category metadata for UI display
export interface CategoryInfo {
  id: EndpointCategory;
  name: string;
  description: string;
}

// Hierarchical category structure based on folder structure
export interface HierarchicalCategory {
  id: string;
  name: string;
  path: string; // Full folder path
  presets: EndpointPreset[];
  subcategories?: HierarchicalCategory[];
}

// State for the API tester component
export interface ApiTesterState {
  // Request configuration
  selectedPreset: string | null;
  method: HttpMethod;
  endpoint: string;
  headers: HeaderEntry[];
  body: string;
  
  // Response data
  response: ProxyResponse | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
}

// Props for RequestPanel component
export interface RequestPanelProps {
  method: HttpMethod;
  endpoint: string;
  headers: HeaderEntry[];
  body: string;
  isLoading: boolean;
  pathParams: PathParamEntry[];
  onMethodChange: (method: HttpMethod) => void;
  onEndpointChange: (endpoint: string) => void;
  onHeadersChange: (headers: HeaderEntry[]) => void;
  onBodyChange: (body: string) => void;
  onPathParamsChange: (pathParams: PathParamEntry[]) => void;
  onSubmit: () => void;
}

// Props for ResponsePanel component
export interface ResponsePanelProps {
  response: ProxyResponse | null;
  isLoading: boolean;
}

// Props for PresetSelector component
export interface PresetSelectorProps {
  selectedPreset: string | null;
  onSelectPreset: (preset: EndpointPreset) => void;
}

// Klarna API response types (partial, for common endpoints)

// Credentials API
export interface KlarnaCredential {
  credential_id: string;
  description?: string;
  state: 'ACTIVE' | 'DISABLED';
  created_at: string;
  updated_at?: string;
}

export interface KlarnaCredentialsResponse {
  credentials: KlarnaCredential[];
}

// Partner Account
export interface KlarnaPartnerAccount {
  partner_account_id: string;
  partner_account_reference?: string;
  partner_account_name: string;
  state: string;
  state_reason?: string;
}

// Generic Klarna error response
export interface KlarnaErrorResponse {
  error_code: string;
  error_messages?: string[];
  correlation_id?: string;
}

// API Call Entry for history tracking
export interface ApiCallEntry {
  id: string;
  name?: string; // Endpoint name (e.g., "List all API Keys")
  method: HttpMethod;
  path: string;
  timestamp: Date;
  status: 'pending' | 'success' | 'error';
  requestBody?: unknown;
  response?: ProxyResponse;
  error?: string;
  duration?: number;
}

// Props for CallHistory component
export interface CallHistoryProps {
  calls: ApiCallEntry[];
  onClearHistory?: () => void;
}

// Props for CallCard component
export interface CallCardProps {
  call: ApiCallEntry;
}

// Props for JsonViewer component
export interface JsonViewerProps {
  data: unknown;
  depth?: number;
  defaultExpanded?: number;
}

// Props for EndpointSelector component (updated)
export interface EndpointSelectorProps {
  selectedEndpoint: EndpointPreset | null;
  onSelectEndpoint: (preset: EndpointPreset | null) => void;
  onUseCustom: () => void;
}

// Props for RequestForm component
export interface RequestFormProps {
  method: HttpMethod;
  path: string;
  headers: HeaderEntry[];
  body: string;
  isLoading: boolean;
  isCollapsed: boolean;
  pathParams: PathParamEntry[];
  onMethodChange: (method: HttpMethod) => void;
  onPathChange: (path: string) => void;
  onHeadersChange: (headers: HeaderEntry[]) => void;
  onBodyChange: (body: string) => void;
  onPathParamsChange: (pathParams: PathParamEntry[]) => void;
  onSubmit: () => void;
  onToggleCollapse: () => void;
  onSelectEndpoint: (preset: EndpointPreset) => void;
  selectedEndpoint: EndpointPreset | null;
}

// ============================================
// Environment Variables Types
// ============================================

// Source of an environment variable
// - 'vercel': Loaded from process.env (Vercel deployment)
// - 'env_file': Loaded from .env.local file (local development)
// - 'user': Manually set by user in the UI
// - 'response': Extracted from API response
export type EnvironmentVariableSource = 'vercel' | 'env_file' | 'user' | 'response';

// Metadata about where a response-extracted variable came from
export interface ResponseMetadata {
  endpoint: string;
  method: HttpMethod;
  timestamp: string;
  responseStatus: number;
  jsonPath?: string;
}

// Environment variable definition
export interface EnvironmentVariable {
  name: string;
  value: string;
  source: EnvironmentVariableSource;
  description?: string;
  isSecret?: boolean;
  metadata?: ResponseMetadata;
  usageCount?: number;
  createdAt?: string;
  lastUsedAt?: string;
}

// Environment context interface for React context
export interface EnvironmentContextType {
  variables: Record<string, EnvironmentVariable>;
  isLoading: boolean;
  error: string | null;
  getVariable: (name: string) => string | undefined;
  setVariable: (name: string, value: string, options?: SetVariableOptions) => void;
  deleteVariable: (name: string) => void;
  resetVariable: (name: string) => void;
  getAllVariables: () => EnvironmentVariable[];
  substituteVariables: (text: string) => string;
  findMissingVariables: (text: string) => string[];
  saveFromResponse: (name: string, value: string, isSecret?: boolean, metadata?: ResponseMetadata) => void;
  importEnvFile: (content: string) => void;
  exportEnvFile: () => string;
}

// Options for setting a variable
export interface SetVariableOptions {
  source?: EnvironmentVariableSource;
  description?: string;
  isSecret?: boolean;
  metadata?: ResponseMetadata;
}

// For the extraction UI - saveable field detected in response
export interface SaveableField {
  path: string;
  suggestedName: string;
  value: unknown;
  valueType: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null';
  isAutoSuggested: boolean;
}

// Props for EnvironmentPanel component
export interface EnvironmentPanelProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Props for ExtractionDialog component
export interface ExtractionDialogProps {
  open: boolean;
  onClose: () => void;
  fieldPath: string;
  fieldValue: unknown;
  suggestedName: string;
  onSave: (name: string, value: string, isSecret: boolean) => void;
}

// Props for ResponsePanel with extraction support
export interface ResponsePanelPropsWithExtraction extends ResponsePanelProps {
  onSaveVariable?: (name: string, value: string, metadata?: ResponseMetadata) => void;
}

// Variable substitution result
export interface SubstitutionResult {
  result: string;
  substitutedVariables: string[];
  missingVariables: string[];
  hasErrors: boolean;
}

// Validation result for checking variables in text
export interface VariableValidationResult {
  isValid: boolean;
  missingVariables: string[];
  usedVariables: string[];
}
