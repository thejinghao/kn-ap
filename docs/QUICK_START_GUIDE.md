# Path Parameters - Quick Start Guide

## Overview

Your Klarna API Tester now automatically detects endpoints with path parameters and provides editable input fields for them. No more manual URL editing!

## Visual Example

### Before (Manual URL Editing)

```
┌─────────────────────────────────────────────────────────────┐
│ Endpoint Selector                                           │
│ Selected: "Read an API Key"                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Request                                                     │
├─────────────────────────────────────────────────────────────┤
│ Method: GET                                                 │
│ Endpoint: /v2/account/.../api-key/{credential_id}          │
│           ❌ User must manually replace {credential_id}     │
└─────────────────────────────────────────────────────────────┘
```

### After (Automatic Parameter Fields)

```
┌─────────────────────────────────────────────────────────────┐
│ Endpoint Selector                                           │
│ Selected: "Read an API Key"                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Request                                                     │
├─────────────────────────────────────────────────────────────┤
│ Method: GET                                                 │
│ Endpoint: /v2/account/.../api-key/{credential_id}          │
├─────────────────────────────────────────────────────────────┤
│ ▼ Path Parameters [1] [Required]                           │
│   ┌───────────────────────────────────────────────────────┐ │
│   │ credential_id *                                       │ │
│   │ ┌───────────────────────────────────────────────────┐ │ │
│   │ │ krn:partner:global:account:credential:api-key:... │ │ │
│   │ └───────────────────────────────────────────────────┘ │ │
│   │ ℹ The unique identifier of the API key (KRN format)  │ │
│   └───────────────────────────────────────────────────────┘ │
│                                                             │
│   ℹ Path parameters will be substituted in the endpoint   │
└─────────────────────────────────────────────────────────────┘
```

## How to Use

### Step 1: Select an Endpoint
Choose any endpoint from the dropdown menu that has path parameters.

**Endpoints with path parameters include:**
- Read an API Key
- Update an API Key
- Disable an API Key
- Read Partner Account
- Update Partner Account
- Read Business Entity
- List Stores
- List Store Groups
- Get Settlement Details
- Read a Price Plan
- And 45+ more!

### Step 2: Path Parameters Section Appears
The "Path Parameters" accordion section automatically appears when you select an endpoint with parameters.

**What you'll see:**
- 📌 A badge showing the count of parameters (e.g., `[1]`, `[2]`)
- ⚠️ A "Required" badge if parameters need values
- 📝 Input fields for each parameter with:
  - Parameter name as the label
  - Pre-filled example value
  - Helper text explaining what the parameter is
  - Monospace font for KRN values

### Step 3: Edit Parameter Values
Click on any parameter field and edit the value:

```
Before:
  credential_id: krn:partner:global:account:credential:api-key:...

After (your actual ID):
  credential_id: krn:partner:global:account:credential:api-key:abc123xyz
```

### Step 4: Submit the Request
Click the "Send" button. The app will:
1. ✅ Validate that all required parameters have values
2. 🔄 Replace `{credential_id}` in the URL with your actual value
3. 📤 Send the request to the Klarna API
4. 📥 Display the response

## Examples

### Example 1: Single Parameter

**Endpoint:** Read an API Key  
**URL:** `/v2/account/integration/credentials/api-key/{credential_id}`  
**Parameters:**
- `credential_id` (required) - The unique identifier of the API key

**UI Fields:**
```
credential_id *
┌────────────────────────────────────────────────────────┐
│ krn:partner:global:account:credential:api-key:abc123   │
└────────────────────────────────────────────────────────┘
ℹ The unique identifier of the API key (KRN format)
```

**Result:** Request sent to `/v2/account/integration/credentials/api-key/krn:partner:global:account:credential:api-key:abc123`

---

### Example 2: Multiple Parameters

**Endpoint:** Read Business Entity  
**URL:** `/v2/accounts/{account_id}/partner-business-entities/{partner_business_entity_id}`  
**Parameters:**
- `account_id` (required) - The unique identifier of the partner account
- `partner_business_entity_id` (required) - The unique identifier of the business entity

**UI Fields:**
```
account_id *
┌────────────────────────────────────────────────────────┐
│ krn:partner:global:account:test123                     │
└────────────────────────────────────────────────────────┘
ℹ The unique identifier of the partner account

partner_business_entity_id *
┌────────────────────────────────────────────────────────┐
│ krn:partner:global:account:partner-business-entity:xyz │
└────────────────────────────────────────────────────────┘
ℹ The unique identifier of the partner business entity
```

**Result:** Request sent to `/v2/accounts/krn:partner:global:account:test123/partner-business-entities/krn:partner:global:account:partner-business-entity:xyz`

---

### Example 3: Parameter Validation

**Scenario:** User tries to submit without filling required parameters

**What happens:**
```
❌ Error Alert:
┌────────────────────────────────────────────────────────┐
│ ⚠ Missing required path parameters: credential_id      │
└────────────────────────────────────────────────────────┘
```

**Action Required:** Fill in the missing parameter value before submitting

## Tips & Best Practices

### 💡 Tip 1: Use Example Values
Each parameter comes pre-filled with an example value in the correct format. You can use these as templates.

### 💡 Tip 2: Copy from Previous Responses
If you list resources first (e.g., "List All API Keys"), you can copy the IDs from the response and use them in subsequent requests.

**Example workflow:**
1. Call "List All API Keys"
2. Copy a `credential_id` from the response
3. Select "Read an API Key"
4. Paste the copied ID into the `credential_id` field
5. Click Send

### 💡 Tip 3: Keep the Accordion Expanded
The Path Parameters section is expanded by default. Keep it open while working with multiple requests to the same endpoint.

### 💡 Tip 4: Check Required Badges
Look for the red "Required" badge to quickly identify which endpoints need parameter values.

## Supported Endpoints

The feature currently supports 15+ endpoints with path parameters, including:

**API Credentials:**
- Read/Update/Disable API Key
- Read/Update/Disable Client Identifier
- Read/Update/Revoke Client Certificate
- Read/Disable SFTP Credential

**Partner Accounts:**
- Read/Update Partner Account
- List/Read/Create/Update Business Entities

**Payment Products:**
- List Payment Products
- List/Read/Create/Update Payment Accounts

**Stores & Brands:**
- List/Read/Create/Update Stores
- List/Read/Create/Update Store Groups
- List/Read/Create/Update Brands

**Settlements:**
- Get Settlement Details
- List Settlement Transactions
- Get/Set Payout Status

**And more!** See `scripts/parsed-endpoints.json` for the complete list of 55 endpoints with path parameters.

## Troubleshooting

### Issue: Path Parameters section not appearing
**Solution:** Make sure you've selected an endpoint that has path parameters. Try selecting "Read an API Key" to test.

### Issue: "Missing required path parameters" error
**Solution:** Fill in all parameter fields before clicking Send. Look for the red "Required" badge.

### Issue: Invalid KRN format
**Solution:** Make sure your KRN values follow the format: `krn:partner:global:account:...`

### Issue: 404 Not Found error
**Solution:** Verify that the parameter values you entered are correct and exist in your Klarna account.

## Advanced: Adding More Endpoints

Want to add path parameters to more endpoints? Edit `lib/klarna-endpoints.ts`:

```typescript
{
  id: 'your-endpoint-id',
  name: 'Your Endpoint Name',
  method: 'GET',
  endpoint: '/v2/your/path/{param_name}',
  category: 'your-category',
  pathParams: [
    {
      name: 'param_name',
      description: 'What this parameter represents',
      required: true,
      type: 'string',
      example: 'example-value',
    },
  ],
}
```

## Need Help?

- 📖 See `docs/PATH_PARAMETERS_FEATURE.md` for technical details
- 📝 See `IMPLEMENTATION_SUMMARY.md` for implementation overview
- 🔍 Check `scripts/parsed-endpoints.json` for all available endpoints
- 🛠️ Run `node scripts/parse-bruno-files.js` to analyze Bruno files

---

**Happy Testing! 🚀**
