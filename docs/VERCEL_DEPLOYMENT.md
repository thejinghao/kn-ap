# Vercel Deployment Guide

This guide explains how to configure environment variables for deploying the Klarna Network AP application to Vercel.

## Environment Variable Setup

### Naming Convention

Use the **exact same variable names** in both local `.env.local` and Vercel. No prefixes or transformations needed.

### Variables to Configure

Add the following variables in the Vercel dashboard (use the exact names as shown):

| Variable Name | Description |
|---------------|-------------|
| `acquiring_partner_api_key` | Primary API key for acquiring partner |
| `subpartner_api_key` | API key for subpartner operations |
| `payment_profile` | Payment profile KRN |
| `payment_acquiring_account_id` | Payment acquiring account KRN |
| `credential_id` | Credential UUID |
| `partner_account_id` | Partner account KRN |
| `ap_partner_account_id` | AP partner account KRN |
| `payment_account_id_standard` | Standard payment account KRN |
| `payment_account_id_PiFnG` | PiFnG payment account KRN |
| `credential_group_owner_id` | Credential group owner KRN |
| `klarna_client_id` | Klarna OAuth client ID |
| `secret_key_jwt` | EC private key for JWT signing |
| `x5c_jwt` | X.509 certificate for JWT |
| `cpgw_username` | CPGW username |
| `cpgw_password` | CPGW password |
| `username` | Username |
| `password` | Password |
| `bank_account_preset_id` | Bank account preset ID |
| `legacy_price_plan_standard` | Legacy price plan (standard) |
| `legacy_price_plan_PiFnG` | Legacy price plan (PiFnG) |

### Secrets

The following variables should be marked as "Sensitive" in Vercel (they will be encrypted):

- `acquiring_partner_api_key`
- `subpartner_api_key`
- `klarna_client_id`
- `secret_key_jwt`
- `x5c_jwt`
- `cpgw_password`
- `password`

## Adding Variables to Vercel

### Via Dashboard (Manual)

1. Go to your project in the Vercel dashboard
2. Navigate to **Settings** > **Environment Variables**
3. For each variable:
   - Enter the variable name exactly as shown (e.g., `acquiring_partner_api_key`)
   - Enter the value from your `.env.local` file
   - Select environments (Production, Preview, Development)
   - Check "Sensitive" for secret variables
   - Click **Save**

### Via Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Link your project
vercel link

# Add a variable
vercel env add acquiring_partner_api_key

# Add a sensitive variable
vercel env add secret_key_jwt sensitive
```

## System Variables

In addition to API variables, you may also need these system-level variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `KLARNA_BASE_URL` | Klarna API base URL | `https://api-global.test.klarna.com` |
| `KLARNA_SKIP_MTLS` | Skip mTLS in Vercel (no cert files) | `true` |

**Note**: mTLS certificates are typically not available in serverless environments like Vercel. Set `KLARNA_SKIP_MTLS=true` and use API key authentication instead.

## How It Works

The application uses a hybrid environment loading strategy:

1. **Production (Vercel)**: Variables are loaded from `process.env` using exact variable names
2. **Local Development**: Variables are loaded from `.env.local` in the project root

The source of each variable is displayed in the Environment Variables panel in the UI:
- **Vercel**: Loaded from Vercel environment variables
- **EnvFile**: Loaded from local `.env.local` file
- **User**: Manually entered by user in the UI
- **Response**: Extracted from API responses

## Troubleshooting

### Variables Not Loading

1. Verify variables use the exact names listed above (case-sensitive)
2. Check that you've deployed after adding variables
3. Look at the server logs for "[Env Loader]" messages

### Case Sensitivity

Variable names are **case-sensitive**. Use the exact names as shown in the table above:
- `acquiring_partner_api_key` (correct)
- `ACQUIRING_PARTNER_API_KEY` (incorrect)

### Testing

To verify variables are loaded correctly:

1. Deploy to Vercel preview environment
2. Open the Environment Variables panel (gear icon in header)
3. Verify variables show source as "Vercel"
