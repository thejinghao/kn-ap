# Dynamic API Parameters Implementation

## Summary

The request form now dynamically shows customizable parameters (path params, headers, and body) based on API specifications from Bruno files in the `reference/` directory.

## What Was Implemented

### 1. Bruno File Parser (`lib/bruno-parser.ts`)
A server-side module that:
- Recursively scans the `reference/` directory for `.bru` files
- Parses Bruno API collection format
- Extracts:
  - HTTP method and endpoint URL
  - Path parameters (from `:param` or `{param}` syntax)
  - Required headers (from `headers` section)
  - JSON body templates (from `body:json` section)
- Converts to TypeScript `EndpointPreset` format

### 2. Server-Side Endpoint Loading
- **`lib/klarna-endpoints-server.ts`**: Server-only module that loads all endpoints
- **`lib/klarna-endpoints.ts`**: Client-safe exports (static presets only)
- **`app/api/endpoints/route.ts`**: API endpoint that serves presets to clients
- Total: **198 endpoints** loaded from **242 Bruno files**

### 3. Updated UI Components

#### RequestPanel (`components/RequestPanel.tsx`)
Enhanced to show:
- **Path Parameters Section**: Collapsible panel with all path params
  - Shows parameter name and required indicator
  - Individual input fields for each parameter
  - Validation for required params
- **Headers Section**: Separated into two groups
  - **Required Headers**: From API specs, pre-filled with examples
  - **Custom Headers**: User-added headers
- **Body Section**: Shows body editor for POST/PUT/PATCH requests

#### RequestForm (`components/RequestForm.tsx`)
Bottom-fixed request form with:
- Endpoint selector with search and filtering
- Path parameters (auto-detected from selected endpoint)
- Required headers (from API specs)
- Custom headers (user-defined)
- Body editor with JSON validation
- All sections are collapsible

#### PresetSelector & EndpointSelector
Updated to:
- Fetch endpoints from `/api/endpoints` API
- Show loading state while fetching
- Display all 198 endpoints organized by category
- Search and filter functionality

### 4. ApiTester Component Updates
- Sets path parameters when preset is selected
- Sets required headers with example values
- Includes both required and custom headers in API calls
- Validates required path parameters before sending

### 5. Page Component Updates (`app/page.tsx`)
- Handles preset selection with path params and headers
- Validates required parameters
- Sends all headers (required + custom) in requests
- Updates call history with proper error messages

## How It Works

### Data Flow

```
1. Server Startup
   └─> bruno-parser.ts scans reference/ directory
       └─> Parses all .bru files
           └─> Creates EndpointPreset objects
               └─> Cached in memory

2. Client Page Load
   └─> Component calls GET /api/endpoints
       └─> Server returns all presets with metadata
           └─> Client caches in state

3. User Selects Endpoint
   └─> Preset data contains:
       - pathParams: [{name, description, required}]
       - requiredHeaders: [{name, example, required}]
       - bodyTemplate: {JSON object}
   └─> UI dynamically renders input fields
   └─> User fills in values
   └─> Values are validated
   └─> Request is sent with all parameters

```

### Example: Payment Request Endpoint

**Bruno File**: `reference/.../Create a payment request - standard ecommerce.bru`

```
post {
  url: {{base_url}}/{{version}}/payment/requests
  body: json
  auth: inherit
}

headers {
  Content-Type: application/json
}

body:json {
  {
    "currency": "{{currency}}",
    "amount": 12336,
    ...
  }
}
```

**Parsed Result**:
```typescript
{
  id: "create-payment-request-standard-ecommerce",
  name: "Create a payment request - standard ecommerce",
  method: "POST",
  endpoint: "/payment/requests",
  category: "payments",
  requiredHeaders: [
    {
      name: "Content-Type",
      example: "application/json",
      required: true
    }
  ],
  bodyTemplate: {
    currency: "",
    amount: 12336,
    ...
  }
}
```

**UI Rendering**:
- Method dropdown: Shows "POST"
- Endpoint input: Pre-filled with "/payment/requests"
- Headers section: Shows "Content-Type" input with "application/json" pre-filled
- Body editor: Shows formatted JSON template

## Statistics

### Loaded Endpoints by Category
- **Credentials**: Multiple API key and certificate endpoints
- **Accounts**: Partner account management
- **Onboarding**: Partner onboarding flows
- **Payments**: Payment requests and products
- **Webhooks**: Webhook configuration
- **Settlements**: Settlement reports

### Parsing Results
- **Total Bruno Files**: 242
- **Successfully Parsed**: 198
- **With Path Parameters**: 85+
- **With Required Headers**: 119
- **With Body Templates**: 75+

## Key Features

### 1. Path Parameters
- ✅ Auto-detected from URL patterns
- ✅ Individual input fields
- ✅ Required validation
- ✅ Placeholder text with parameter name
- ✅ Error messages for missing required params

### 2. Headers
- ✅ Separated required vs custom headers
- ✅ Pre-filled with example values
- ✅ Add/remove custom headers
- ✅ All headers sent in API request

### 3. Body Templates
- ✅ Parsed from Bruno JSON
- ✅ Variables cleaned up
- ✅ JSON validation
- ✅ Format button
- ✅ Syntax highlighting (via textarea)

### 4. User Experience
- ✅ Loading states
- ✅ Error handling
- ✅ Collapsible sections
- ✅ Search and filter
- ✅ Badge counts (params, headers)
- ✅ Required field indicators (*)

## Testing

### Manual Testing Steps

1. **Start the application**:
   ```bash
   npm run dev
   ```

2. **Open browser**: http://localhost:3000

3. **Test Path Parameters**:
   - Select "List Payment Products" (GET)
   - Note the "Path Parameters (1)" section appears
   - Fill in `account_id` parameter
   - Send request

4. **Test Required Headers**:
   - Select "Create SFTP Credentials" (POST)
   - Note "Headers (1)" section with Content-Type
   - Verify header is pre-filled
   - Send request

5. **Test Body Templates**:
   - Select "Create an API Key" (POST)
   - Note body editor appears with template
   - Modify JSON
   - Send request

### API Testing

```bash
# Get all endpoints
curl http://localhost:3000/api/endpoints | jq '.totalEndpoints'
# Output: 198

# Check endpoint with path params
curl http://localhost:3000/api/endpoints | jq '.categories[] | .presets[] | select(.name=="List Payment Products") | .pathParams'

# Check endpoint with headers
curl http://localhost:3000/api/endpoints | jq '.categories[] | .presets[] | select(.name=="Create SFTP Credentials") | .requiredHeaders'
```

## Files Changed

### New Files
1. `lib/bruno-parser.ts` - Bruno file parser
2. `lib/klarna-endpoints-server.ts` - Server-side endpoint loader
3. `app/api/endpoints/route.ts` - API endpoint
4. `scripts/test-bruno-parser.js` - Testing script
5. `docs/BRUNO_INTEGRATION.md` - Documentation

### Modified Files
1. `lib/klarna-endpoints.ts` - Split client/server code
2. `lib/types.ts` - Added `requiredHeaders` to `EndpointPreset`
3. `components/RequestPanel.tsx` - Added path params and headers
4. `components/RequestForm.tsx` - Added dynamic params support
5. `components/PresetSelector.tsx` - Fetch from API
6. `components/EndpointSelector.tsx` - Fetch from API
7. `components/ApiTester.tsx` - Handle required headers
8. `app/page.tsx` - Handle required headers

## Benefits

1. **Zero Manual Maintenance**: API specs auto-loaded from Bruno files
2. **Type Safety**: Full TypeScript support
3. **Better UX**: Users see exactly what params are needed
4. **Validation**: Required params validated before sending
5. **Documentation**: Bruno files serve as both spec and test collection
6. **Developer Efficiency**: Easy to add new APIs (just add .bru file)

## Future Enhancements

Potential improvements:

1. **Query Parameters**: Add support for URL query params
2. **File Watching**: Auto-reload when .bru files change
3. **Parameter Types**: Validate by type (string, number, boolean)
4. **Conditional Fields**: Show/hide fields based on other values
5. **Response Schemas**: Parse expected response format
6. **Environment Variables**: Support Bruno environment variables
7. **Authentication**: Parse auth configuration from Bruno

## Troubleshooting

### Endpoints Not Loading
- Check dev server console for parsing errors
- Verify `reference/` directory exists
- Check Bruno file syntax

### Missing Parameters
- Verify Bruno file has `params:path` section
- Check URL has `{param}` or `:param` syntax

### Missing Headers
- Verify Bruno file has `headers` section
- Headers with `{{variables}}` are skipped

### Invalid Body
- Check `body:json` section in Bruno file
- Verify JSON is valid
- Variables like `{{$random}}` are cleaned up

## Related Documentation

- See `docs/BRUNO_INTEGRATION.md` for technical details
- See Bruno documentation: https://www.usebruno.com/
- See `reference/` directory for example API specs
