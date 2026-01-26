# Bruno Dynamic Variables Support

This application now supports **Bruno-style dynamic variables** powered by Faker.js, enabling automatic generation of realistic test data in API requests.

## Usage

Dynamic variables use the syntax `{{$variableName}}` and can be used in:
- Request bodies
- Headers
- Path parameters
- URL paths

### Example Request Body

```json
{
  "partner_account_reference": "{{$randomUUID}}",
  "partner_account_name": "{{$randomCompanyName}}",
  "partner_account_contact": {
    "given_name": "{{$randomFirstName}}",
    "family_name": "{{$randomLastName}}",
    "email": "{{$randomEmail}}",
    "phone": "{{$randomPhoneNumber}}"
  },
  "products": [
    {
      "type": "PAYMENT",
      "payment_profile_id": "{{payment_profile}}",
      "payment_accounts": [
        {
          "payment_acquiring_account_id": "{{payment_acquiring_account_id}}",
          "default_merchant_category_code": "0744",
          "payment_account_reference": "{{$randomUUID}}",
          "default_store_group_reference": "my-store-group-reference-ABC",
          "partner_business_entity_reference": "LE_KJDHGFKEHGFLLSKJD"
        }
      ]
    }
  ],
  "brands": [
    {
      "brand_reference": "klarna_standard_offering",
      "display_name": "Klarna Standard Offering"
    }
  ],
  "store_groups": [
    {
      "store_group_reference": "my-store-group-reference-ABC",
      "brand_reference": "klarna_standard_offering",
      "stores": [
        {
          "store_reference": "codepen",
          "type": "WEBSITE",
          "url": "https://cdpn.io"
        }
      ]
    }
  ],
  "partner_business_entities": [
    {
      "partner_business_entity_reference": "LE_KJDHGFKEHGFLLSKJD",
      "legal_registered_entity_name": "Legal Entity LLC",
      "legal_registration_country": "DE"
    }
  ],
  "created_at": "{{$isoTimestamp}}"
}
```

In this example:
- Variables prefixed with `$` (like `{{$randomUUID}}`) are **dynamic variables** that generate fresh values on each request
- Variables without `$` (like `{{payment_profile}}`) are **environment variables** looked up from your environment configuration

## How It Works

1. **Dynamic Variables** (`{{$randomUUID}}`):
   - Prefixed with `$`
   - Generated fresh on each API request using Faker.js
   - No configuration needed
   - ~100+ variables available

2. **Environment Variables** (`{{myVariable}}`):
   - No `$` prefix
   - Loaded from your Bruno environment files or custom environment configuration
   - Consistent across requests
   - Can be saved from API responses

## Available Dynamic Variables

### Basic Data Types
- `{{$randomUUID}}` - UUID (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- `{{$randomNanoId}}` - Nano ID
- `{{$randomBoolean}}` - true/false
- `{{$randomInt}}` - Integer 0-1000
- `{{$randomColor}}` - Color name
- `{{$randomHexColor}}` - Hex color code
- `{{$timestamp}}` - Unix timestamp
- `{{$isoTimestamp}}` - ISO 8601 timestamp

### Person Information
- `{{$randomFirstName}}` - First name
- `{{$randomLastName}}` - Last name
- `{{$randomFullName}}` - Full name
- `{{$randomPhoneNumber}}` - Phone number
- `{{$randomJobTitle}}` - Job title

### Internet & Network
- `{{$randomEmail}}` - Email address
- `{{$randomUserName}}` - Username
- `{{$randomUrl}}` - URL
- `{{$randomIP}}` - IPv4 address
- `{{$randomIPV6}}` - IPv6 address
- `{{$randomPassword}}` - 15-character password

### Business
- `{{$randomCompanyName}}` - Company name
- `{{$randomCatchPhrase}}` - Company catch phrase
- `{{$randomDepartment}}` - Department name
- `{{$randomBs}}` - Business buzz phrase

### Location
- `{{$randomCity}}` - City name
- `{{$randomCountry}}` - Country name
- `{{$randomStreetAddress}}` - Street address
- `{{$randomLatitude}}` - Latitude coordinate
- `{{$randomLongitude}}` - Longitude coordinate

### Finance
- `{{$randomBankAccount}}` - Bank account number
- `{{$randomBankAccountIban}}` - IBAN
- `{{$randomCurrencyCode}}` - Currency code (USD, EUR, etc.)
- `{{$randomPrice}}` - Price value
- `{{$randomBitcoin}}` - Bitcoin address

### Dates
- `{{$randomDateFuture}}` - Future date (ISO format)
- `{{$randomDatePast}}` - Past date (ISO format)
- `{{$randomDateRecent}}` - Recent date (ISO format)
- `{{$randomWeekday}}` - Weekday name
- `{{$randomMonth}}` - Month name

### Files & System
- `{{$randomFileName}}` - File name
- `{{$randomFileExt}}` - File extension
- `{{$randomMimeType}}` - MIME type
- `{{$randomFilePath}}` - File path
- `{{$randomDirectoryPath}}` - Directory path

### Commerce
- `{{$randomProduct}}` - Product name
- `{{$randomProductName}}` - Full product name with adjective
- `{{$randomProductMaterial}}` - Product material
- `{{$randomDepartment}}` - Store department

### Lorem & Hacker
- `{{$randomLoremWord}}` - Lorem ipsum word
- `{{$randomLoremSentence}}` - Lorem ipsum sentence
- `{{$randomLoremParagraph}}` - Lorem ipsum paragraph
- `{{$randomPhrase}}` - Hacker phrase
- `{{$randomNoun}}` - Technical noun
- `{{$randomVerb}}` - Technical verb

### Images
- `{{$randomAvatarImage}}` - Avatar image URL
- `{{$randomImageUrl}}` - Random image URL
- `{{$randomCatsImage}}` - Cat image
- `{{$randomFoodImage}}` - Food image
- `{{$randomNatureImage}}` - Nature image

**And many more!** See the [full Bruno documentation](https://docs.usebruno.com/testing/script/dynamic-variables) for the complete list of ~100+ variables.

## Technical Details

- **Generator**: Faker.js v9.3.0
- **Fresh values**: Each request generates new random values
- **No conflicts**: Dynamic variables (`$` prefix) and environment variables work together seamlessly
- **Bruno compatible**: Follows the exact same syntax and behavior as Bruno API Client

## Examples in Different Contexts

### In Headers
```
Authorization: Bearer {{$randomUUID}}
X-Request-ID: {{$randomUUID}}
X-User-Agent: {{$randomUserAgent}}
```

### In Path Parameters
```
/users/{{$randomUUID}}/profile
/api/v1/accounts/{{$randomNanoId}}
```

### Mixed with Environment Variables
```json
{
  "api_key": "{{klarna_api_key}}",
  "merchant_id": "{{merchant_id}}",
  "test_user": {
    "id": "{{$randomUUID}}",
    "name": "{{$randomFullName}}",
    "email": "{{$randomEmail}}"
  }
}
```

## Benefits

1. **No Manual Data Entry**: Generate realistic test data automatically
2. **Fresh Data Every Time**: Each request uses new values
3. **Bruno Compatible**: Same syntax as Bruno API Client
4. **Type-Safe**: Full TypeScript support
5. **Comprehensive**: 100+ variables covering all common use cases
6. **Zero Configuration**: Works out of the box

## References

- [Bruno Dynamic Variables Documentation](https://docs.usebruno.com/testing/script/dynamic-variables)
- [Faker.js Documentation](https://fakerjs.dev/)
