# Bruno API Integration

This document describes how the application dynamically loads API endpoint specifications from Bruno (.bru) files.

## Overview

The application now automatically parses all Bruno API collection files from the `reference/` directory and makes them available as API endpoint presets. This allows the request form to show customizable path parameters, headers, and body templates for each API call based on the specifications.

## Architecture

### 1. Bruno Parser (`lib/bruno-parser.ts`)
- **Server-side only module** that parses `.bru` files
- Extracts:
  - HTTP method (GET, POST, PATCH, PUT, DELETE)
  - URL with path parameters
  - Required headers
  - Request body templates (JSON)
- Converts Bruno format to `EndpointPreset` format

### 2. Endpoint Management
- **`lib/klarna-endpoints.ts`**: Client-safe exports (static presets only)
- **`lib/klarna-endpoints-server.ts`**: Server-side module that loads Bruno endpoints
- **`app/api/endpoints/route.ts`**: API endpoint that serves all presets to clients

### 3. Client Components
- **`components/PresetSelector.tsx`**: Fetches endpoints from API and displays them
- **`components/EndpointSelector.tsx`**: Similar selector for different UI layouts
- **`components/RequestPanel.tsx`**: Shows path params, headers, and body editors
- **`components/RequestForm.tsx`**: Bottom-fixed form with collapsible sections

## Features

### Dynamic Parameter Detection
For each API endpoint, the system automatically detects and displays:

1. **Path Parameters**
   - Extracted from URL patterns like `/v2/payment/requests/{payment_request_id}`
   - Marked as required
   - Editable input fields with validation

2. **Required Headers**
   - Parsed from the `headers` section in Bruno files
   - Pre-filled with example values if available
   - Separate from custom headers

3. **Body Templates**
   - JSON body templates from Bruno files
   - Variables like `{{$randomUUID}}` are cleaned up
   - Formatted and editable in the UI

4. **Custom Headers**
   - Users can add additional headers beyond required ones
   - Separate section in the UI

## Usage

### For Users

1. Select an endpoint from the dropdown
2. The form automatically shows:
   - All path parameters that need values
   - Required headers (if any)
   - Body template (for POST/PUT/PATCH)
3. Fill in the required values
4. Click "Send Request"

### For Developers

#### Adding New API Specs

Simply add `.bru` files to the `reference/` directory. The parser will:
1. Automatically discover them on server start
2. Parse the specifications
3. Make them available in the UI

#### Bruno File Format

```
meta {
  name: My API Endpoint
  type: http
}

post {
  url: {{base_url}}/{{version}}/resource/{resource_id}
  body: json
}

params:path {
  resource_id: {{resource_id}}
}

headers {
  Content-Type: application/json
  X-Custom-Header: value
}

body:json {
  {
    "field": "value"
  }
}
```

## API Endpoints

### GET /api/endpoints

Returns all available endpoint presets grouped by category.

**Response:**
```json
{
  "success": true,
  "categories": [
    {
      "id": "payments",
      "name": "Payments",
      "description": "Payment requests and transactions",
      "presets": [
        {
          "id": "create-payment",
          "name": "Create Payment Request",
          "method": "POST",
          "endpoint": "/v2/payment/requests",
          "pathParams": [...],
          "requiredHeaders": [...],
          "bodyTemplate": {...}
        }
      ]
    }
  ],
  "totalEndpoints": 198
}
```

## Statistics

- **Total Bruno Files**: 242
- **Loaded Endpoints**: 198
- **Categories**: 6 (Credentials, Accounts, Onboarding, Payments, Webhooks, Settlements)

## Benefits

1. **No Manual Maintenance**: API specs are automatically loaded from Bruno files
2. **Type Safety**: Full TypeScript support for all endpoint definitions
3. **Validation**: Required parameters are validated before sending requests
4. **Developer Experience**: Easy to test APIs with pre-filled templates
5. **Documentation**: Bruno files serve as both spec and test collection

## Technical Details

### Server-Side Only Loading

The Bruno parser uses Node.js `fs` module, which only works on the server. The architecture ensures:

1. Parser never runs in the browser (would fail due to missing `fs`)
2. Endpoints are loaded once on server startup
3. Client components fetch endpoints via API
4. Zero bundle size impact for client code

### Caching

Endpoints are loaded once when the server starts and cached in memory. To reload:

```bash
# Restart the development server
npm run dev
```

### Performance

- Initial load: ~200-300ms (parsing 242 files)
- Cached responses: <10ms
- Client-side fetch: One-time on page load

## Future Enhancements

Potential improvements:

1. Query parameter support
2. File watching and hot reload
3. Endpoint search and filtering
4. Export to OpenAPI/Swagger format
5. Custom variable replacement logic
6. Environment variable support from Bruno
