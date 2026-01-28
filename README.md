# Klarna Network API Demo

An interactive demo application for testing Klarna Network APIs with mTLS authentication support.

## Features

- **WYSIWYG API Testing Interface**: Easily configure and send API requests
- **mTLS Support**: Secure communication with Klarna APIs using mutual TLS
- **Preset API Endpoints**: Quick access to common Klarna Network API endpoints
- **Request/Response Viewer**: Full visibility into request details and response data
- **JSON Editor**: Built-in JSON editor with validation and formatting

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Klarna API credentials:

```env
acquiring_partner_api_key=klarna_test_api_your_api_key_here
KLARNA_BASE_URL=https://api-global.test.klarna.com
KLARNA_CERT_PATH=./certs/client-cert.pem
KLARNA_KEY_PATH=./certs/client-key.pem
KLARNA_SKIP_MTLS=false
```

### 3. Add mTLS Certificates

Place your mTLS certificate files in the `certs/` directory:

- `certs/client-cert.pem` - Your client certificate
- `certs/client-key.pem` - Your client private key

> **Note**: If you don't have mTLS certificates yet, you can set `KLARNA_SKIP_MTLS=true` in your `.env.local` file to bypass mTLS for initial testing. However, mTLS may be required by Klarna for certain endpoints or environments.

### 4. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Select an API Endpoint**: Use the dropdown to choose from preset endpoints or select "Custom Request" for manual entry.

2. **Configure the Request**:
   - Choose the HTTP method (GET, POST, PATCH, DELETE)
   - Enter or modify the endpoint path
   - Add custom headers if needed
   - Enter a JSON body for POST/PATCH/PUT requests

3. **Send the Request**: Click "Send Request" to execute the API call.

4. **View the Response**: The response panel shows:
   - Status code and message
   - Response body with collapsible JSON viewer
   - Response headers
   - Request metadata (correlation ID, timestamps, etc.)

## Available Preset Endpoints

### API Credentials
- List All API Keys
- Create an API Key
- Read an API Key
- Update an API Key
- Disable an API Key
- List Client Identifiers
- List Client Certificates

### Partner Accounts
- Read Partner Account
- Update Partner Account
- List Business Entities

### Onboarding
- Onboard a Partner
- List Payment Profiles
- List Acquiring Accounts

### Webhooks
- List Webhooks
- Create Webhook
- List Signing Keys

### Stores & Brands
- List Stores
- List Store Groups
- List Brands

### Settlements
- List Settlements
- Get Settlement Details

## Project Structure

```
├── app/
│   ├── api/
│   │   └── klarna-proxy/
│   │       └── route.ts       # API proxy with mTLS
│   ├── layout.tsx             # Root layout with theme
│   └── page.tsx               # Main page
├── components/
│   ├── ApiTester.tsx          # Main controller component
│   ├── PresetSelector.tsx     # Endpoint preset dropdown
│   ├── RequestPanel.tsx       # Request configuration UI
│   ├── ResponsePanel.tsx      # Response display UI
│   └── ThemeRegistry.tsx      # MUI theme configuration
├── lib/
│   ├── klarna-endpoints.ts    # Preset endpoint definitions
│   └── types.ts               # TypeScript interfaces
├── certs/                     # mTLS certificates (gitignored)
├── .env.local                 # Environment variables (gitignored)
└── .env.local.example         # Environment template
```

## Security Notes

- **API keys are never exposed to the browser**: All requests are proxied through the Next.js backend
- **Certificates are stored server-side**: mTLS certificates are loaded only on the server
- **Sensitive files are gitignored**: `.env.local` and `certs/` are excluded from version control

## Troubleshooting

### 401 Unauthorized
- Verify your API key is correct in `.env.local`
- Ensure the API key format is `klarna_test_api_...` or `klarna_live_api_...`

### Certificate Errors
- Verify certificate files exist in `certs/` directory
- Check certificate format (should be PEM)
- Ensure the certificate and key match

### 403 Forbidden
- May indicate mTLS certificate issues
- Check if your IP is allowed in Klarna's IP restrictions
- Verify you're using the correct environment (test vs live)

### Network Errors
- Check your internet connection
- Verify the base URL is correct
- Ensure no firewall is blocking the connection

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## License

MIT
