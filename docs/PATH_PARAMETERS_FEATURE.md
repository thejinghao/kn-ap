# Path Parameters Feature

## Overview

The API Tester now automatically detects and provides editable UI fields for API endpoints that have path parameters. When you select an endpoint with path parameters (like `{credential_id}` or `{account_id}`), the UI dynamically adapts to show input fields for each parameter.

## What Was Implemented

### 1. **Type Definitions** (`lib/types.ts`)

Added new interfaces to support path parameters:

- `ParameterDefinition`: Defines metadata for a parameter (name, description, required, type, example)
- `PathParamEntry`: UI representation of a path parameter with id, name, value, required, and description fields
- Extended `EndpointPreset` to include:
  - `pathParams?: ParameterDefinition[]` - Path parameter definitions
  - `queryParams?: ParameterDefinition[]` - Query parameter definitions (for future use)
  - `requiredHeaders?: ParameterDefinition[]` - Required header definitions (for future use)

### 2. **Endpoint Metadata** (`lib/klarna-endpoints.ts`)

Updated endpoint presets to include path parameter definitions for all endpoints that have URL parameters:

**Examples:**
- API Keys: `credential_id`
- Partner Accounts: `account_id`
- Business Entities: `account_id`, `partner_business_entity_id`
- Payment Products: `account_id`, `payment_product_id`
- Stores: `account_id`, `store_id`
- Store Groups: `account_id`, `store_group_id`
- Brands: `account_id`, `brand_id`
- Settlements: `settlement_id`
- Price Plans: `price_plan_id`

Each parameter includes:
- `name`: The parameter name (e.g., "credential_id")
- `description`: What the parameter represents
- `required`: Whether it's required (typically true)
- `type`: Data type (string, number, boolean)
- `example`: Example value showing the expected format

### 3. **Request Panel UI** (`components/RequestPanel.tsx`)

Added a new "Path Parameters" accordion section that:
- Automatically appears when an endpoint has path parameters
- Shows a chip badge indicating the number of path parameters
- Displays a "Required" badge if any parameters are missing values
- Provides input fields for each path parameter with:
  - Parameter name as the label
  - Description as helper text
  - Monospace font for better readability of KRN values
  - Required field validation
- Shows an info alert explaining how path parameters work

### 4. **API Tester Logic** (`components/ApiTester.tsx`)

Enhanced the main API tester component to:
- Maintain path parameters state
- Populate path parameters when a preset is selected
- Validate that all required path parameters have values before submission
- Replace path parameters in the endpoint URL before making the API request
- Show error messages if required parameters are missing

## How It Works

### User Flow

1. **Select an Endpoint**: User selects an endpoint from the dropdown (e.g., "Read an API Key")
2. **Auto-populate Parameters**: The UI automatically detects that this endpoint requires `credential_id`
3. **Path Parameters Section Appears**: A new accordion section "Path Parameters" appears with:
   - A badge showing "1" parameter
   - An input field for `credential_id`
   - Helper text: "The unique identifier of the API key (KRN format)"
   - Example value pre-filled: `krn:partner:global:account:credential:api-key:...`
4. **User Edits**: User can edit the parameter value
5. **Validation**: If user tries to submit without filling required parameters, an error appears
6. **Substitution**: When submitted, the parameter values replace `{credential_id}` in the URL

### Technical Flow

```typescript
// 1. Preset Selection (ApiTester.tsx)
handleSelectPreset(preset: EndpointPreset) {
  // Convert parameter definitions to UI entries
  const paramEntries = preset.pathParams.map(param => ({
    id: `${preset.id}-${param.name}`,
    name: param.name,
    value: param.example || '',
    required: param.required,
    description: param.description,
  }));
  setPathParams(paramEntries);
}

// 2. Submission (ApiTester.tsx)
handleSubmit() {
  // Replace path parameters in endpoint
  let finalEndpoint = endpoint;
  pathParams.forEach(param => {
    finalEndpoint = finalEndpoint.replace(`{${param.name}}`, param.value);
  });
  
  // Validate required parameters
  const missingParams = pathParams.filter(p => p.required && !p.value);
  if (missingParams.length > 0) {
    setError(`Missing required path parameters: ...`);
    return;
  }
  
  // Make request with final endpoint
  axios.post('/api/klarna-proxy', {
    endpoint: finalEndpoint,
    ...
  });
}
```

## Bruno File Parser

A helper script (`scripts/parse-bruno-files.js`) was created to analyze all Bruno API collection files and extract:
- Endpoint names and URLs
- HTTP methods
- Path parameters (from `params:path` sections)
- Query parameters (from `params:query` sections)
- Custom headers
- Body templates

**Usage:**
```bash
node scripts/parse-bruno-files.js
```

**Output:**
- Console output showing all endpoints with path parameters
- JSON file (`scripts/parsed-endpoints.json`) with detailed endpoint information

## Statistics

Based on the Bruno collection analysis:
- **Total Endpoints**: 78
- **Endpoints with Path Parameters**: 55
- **Endpoints with Query Parameters**: 10
- **Endpoints with Custom Headers**: 1
- **Endpoints with Body**: 40

## Examples

### Example 1: Read an API Key
```typescript
{
  id: 'get-api-key',
  name: 'Read an API Key',
  method: 'GET',
  endpoint: '/v2/account/integration/credentials/api-key/{credential_id}',
  pathParams: [
    {
      name: 'credential_id',
      description: 'The unique identifier of the API key (KRN format)',
      required: true,
      type: 'string',
      example: 'krn:partner:global:account:credential:api-key:...',
    },
  ],
}
```

### Example 2: Read Business Entity (Multiple Parameters)
```typescript
{
  id: 'get-business-entity',
  name: 'Read Business Entity',
  method: 'GET',
  endpoint: '/v2/accounts/{account_id}/partner-business-entities/{partner_business_entity_id}',
  pathParams: [
    {
      name: 'account_id',
      description: 'The unique identifier of the partner account',
      required: true,
      type: 'string',
      example: 'krn:partner:global:account:...',
    },
    {
      name: 'partner_business_entity_id',
      description: 'The unique identifier of the partner business entity',
      required: true,
      type: 'string',
      example: 'krn:partner:global:account:partner-business-entity:...',
    },
  ],
}
```

## Future Enhancements

Potential improvements for the future:
1. **Query Parameters**: Add UI for query parameters (similar to path parameters)
2. **Required Headers**: Automatically add required headers based on endpoint
3. **Parameter Validation**: Validate parameter formats (e.g., KRN format validation)
4. **Auto-complete**: Suggest recent parameter values
5. **Parameter History**: Remember commonly used parameter values
6. **Bulk Update**: Parse all remaining endpoints from Bruno files automatically

## Testing

To test the feature:
1. Start the dev server: `npm run dev`
2. Open http://localhost:3000
3. Select an endpoint with path parameters (e.g., "Read an API Key")
4. Notice the "Path Parameters" section appears
5. Fill in the parameter value
6. Click "Send" to make the request
7. Try leaving a required parameter empty and observe the validation error

## Related Files

- `lib/types.ts` - Type definitions
- `lib/klarna-endpoints.ts` - Endpoint metadata with path parameters
- `components/ApiTester.tsx` - Main API tester logic
- `components/RequestPanel.tsx` - Request UI with path parameters section
- `scripts/parse-bruno-files.js` - Bruno file parser utility
- `scripts/parsed-endpoints.json` - Generated endpoint metadata
