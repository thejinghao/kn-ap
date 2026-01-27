#!/bin/bash
#
# =============================================================================
# Klarna Partner Portal JWT Generator
# =============================================================================
#
# This script generates ES256-signed JWTs for Klarna Partner Portal deep linking.
# The JWT follows Klarna's specification for signed deep links, which allows
# partners to access the Klarna Portal without requiring password setup.
#
# Documentation:
#   https://docs.klarna.com/klarna-network-distribution/interoperability-distribution/grant-access-to-klarna-portal/
#
# =============================================================================
# PREREQUISITES
# =============================================================================
#
# Before using this script, you need:
#
# 1. EC Private Key (prime256v1 curve)
#    Generate with: openssl ecparam -genkey -name prime256v1 -out private-key.pem
#
# 2. X.509 Certificate from Klarna
#    - Create a CSR: openssl req -new -key private-key.pem -out csr.pem -subj "/CN=<LAST_SEGMENT_OF_ACCOUNT_ID>"
#    - Submit CSR via Klarna's Create Client Certificate API with usage="JWT_SIGNING"
#    - Extract Base64 content (remove BEGIN/END headers and newlines)
#
# 3. Account IDs
#    - Your credential group owner ID (issuer)
#    - The partner account ID to grant access to
#
# =============================================================================
# USAGE
# =============================================================================
#
#   1. Fill in the CONFIGURATION section below with your values
#   2. Make the script executable: chmod +x generate_klarna_jwt.sh
#   3. Run: ./generate_klarna_jwt.sh
#
# The JWT token will be output to stdout. Use it in the deep link API:
#   POST /v2/accounts/{partner_account_id}/portal/deep-links
#   Body: {"jwt": "<token>"}
#
# =============================================================================
# REQUIREMENTS
# =============================================================================
#
#   - openssl (for ES256 signing)
#   - jq (for JSON manipulation)
#   - base64 (for encoding)
#   - xxd (for hex conversion, usually included with vim)
#   - uuidgen or /proc/sys/kernel/random/uuid (for UUID generation)
#

set -e

# =============================================================================
# CONFIGURATION - Fill in these values
# =============================================================================

# -----------------------------------------------------------------------------
# PRIVATE_KEY_PATH
# -----------------------------------------------------------------------------
# Path to your EC private key file (PEM format, prime256v1/secp256r1 curve)
#
# To generate a new key:
#   openssl ecparam -genkey -name prime256v1 -out private-key.pem
#
# Keep this file secure - it should never be shared or committed to version control!
# -----------------------------------------------------------------------------
PRIVATE_KEY_PATH="my-key-file.pem"

# -----------------------------------------------------------------------------
# CERTIFICATE_BASE64
# -----------------------------------------------------------------------------
# Your X.509 certificate in Base64 format, placed in the JWT x5c header.
# 
# How to obtain:
#   1. Create CSR: openssl req -new -key private-key.pem -out csr.pem -subj "/CN=<ACCOUNT_SUFFIX>"
#      (where ACCOUNT_SUFFIX is the last segment of your account ID, e.g., "LYABCDEI")
#   2. Submit CSR to Klarna's Create Client Certificate API with usage="JWT_SIGNING"
#   3. From the response, extract the certificate and remove:
#      - The "-----BEGIN CERTIFICATE-----" header
#      - The "-----END CERTIFICATE-----" footer
#      - All newline characters
#
# Example format: "MIICFTCCAb..."  (one continuous Base64 string)
# -----------------------------------------------------------------------------
CERTIFICATE_BASE64="MIICFTCCAbugAwIBAgIRAK0+uReRAi2lgtg1zajrcAQwCgYIKoZIzj0EAwIwVDELMAkGA1UEBhMCU0UxFzAVBgNVBAoMDktsYXJuYSBCYW5rIEFCMSwwKgYDVQQDDCNLbGFybmEtTmV0d29yay1DbGllbnRzLVRlc3QtQ0EtMjAyNDAeFw0yNjAxMjIxNjAwMjVaFw0yOTAxMjExNzAwMjVaMBMxETAPBgNVBAMMCE00OEpXWkY4MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAENybnkEH3qR7cWaG6Et22CcsLUYZotcZMETxhq3buzSDpVfXX+mer1tOVqcrHUkAHuWTarJR8+RwnT966JGpVf6OBrjCBqzAMBgNVHRMBAf8EAjAAMB8GA1UdIwQYMBaAFLSzPdm3IWzm4fWXyzNcSoAda140MB0GA1UdDgQWBBThdBmuz5DvrazzRNdfLTPN3Q9kKTAPBgNVHQ8BAf8EBQMDB4AAMDMGA1UdEQQsMCqGKGtybjpwYXJ0bmVyOmdsb2JhbDphY2NvdW50OnRlc3Q6TTQ4SldaRjgwFQYLKwYBBAGCgyoBAQIBAf8EAwIBATAKBggqhkjOPQQDAgNIADBFAiEA8n/xYFed39Wb8hJGWW3srqA9l+zmm2mDEMW5i3qcHgUCICBa7gWXUU4vz1EbaaBQiREuLNl+h7NeemfwFEjIAbxQ"

# -----------------------------------------------------------------------------
# ISSUER (iss claim)
# -----------------------------------------------------------------------------
# Your credential group owner ID - the account that owns the API credentials
# used to sign this JWT. This identifies who is vouching for the user's identity.
#
# Format: krn:partner:global:account:{env}:{id}
#   - env: "live" for production, "test" for sandbox
#   - id: 8-character identifier
#
# Example: krn:partner:global:account:live:LYABCDEI
# -----------------------------------------------------------------------------
ISSUER="krn:partner:global:account:test:M48JWZF8"

# -----------------------------------------------------------------------------
# SUBJECT (sub claim)
# -----------------------------------------------------------------------------
# Email address of the user who will access the Klarna Portal.
# This email will be associated with the portal session.
#
# Example: john.doe@merchant.com
# -----------------------------------------------------------------------------
SUBJECT="john.doe@example.com"

# -----------------------------------------------------------------------------
# ACCOUNT_ID (account_id claim)
# -----------------------------------------------------------------------------
# The partner account ID that the user will access in the portal.
# This determines which merchant's data and settings the user can view.
#
# Format: krn:partner:global:account:{env}:{id}
#
# Example: krn:partner:global:account:test:MB6KIE1P
# -----------------------------------------------------------------------------
ACCOUNT_ID="krn:partner:global:account:test:MKPMV6MS"

# -----------------------------------------------------------------------------
# ON_BEHALF_OF (on_behalf_of claim) - OPTIONAL
# -----------------------------------------------------------------------------
# Specifies who the user represents when accessing the portal.
#
# Scenarios:
#   - Leave EMPTY: Defaults to ACCOUNT_ID (user represents the merchant)
#   - Set to ISSUER: User is acting on behalf of the Acquiring Partner
#     (e.g., support staff accessing a sub-merchant's account - read-only in some apps)
#   - Set to ACCOUNT_ID: Same as leaving empty (user represents the merchant)
#
# Example: krn:partner:global:account:live:LYABCDEI
# -----------------------------------------------------------------------------
ON_BEHALF_OF=""

# -----------------------------------------------------------------------------
# ROLES (roles claim)
# -----------------------------------------------------------------------------
# Space-separated list of roles to grant the user. Determines what features
# they can access in the Klarna Portal.
#
# Available roles:
#   merchant:admin     - Full access to all apps defined in the agreement
#   merchant:developer - Developer tools only (client-side tokens, Boost features)
#   merchant:agent     - Agent/support tools only
#
# You can assign multiple roles: "merchant:admin merchant:developer"
# -----------------------------------------------------------------------------
ROLES="merchant:admin"

# -----------------------------------------------------------------------------
# TOKEN_LIFETIME_SECONDS
# -----------------------------------------------------------------------------
# How long the JWT is valid, in seconds. After this time, the JWT expires
# and cannot be used to create a deep link.
#
# Default: 3600 (1 hour)
# Note: The deep link itself is only valid for 60 seconds and one-time use.
#       The portal session created by the deep link lasts 8 hours.
# -----------------------------------------------------------------------------
TOKEN_LIFETIME_SECONDS=3600

# =============================================================================
# DEPENDENCY CHECKS
# =============================================================================

check_dependencies() {
    local missing=()
    
    if ! command -v openssl &> /dev/null; then
        missing+=("openssl")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing+=("jq")
    fi
    
    if ! command -v base64 &> /dev/null; then
        missing+=("base64")
    fi
    
    if ! command -v xxd &> /dev/null; then
        missing+=("xxd (usually included with vim)")
    fi
    
    if [ ${#missing[@]} -gt 0 ]; then
        echo "ERROR: Missing required dependencies: ${missing[*]}" >&2
        echo "" >&2
        echo "Installation hints:" >&2
        echo "  macOS:  brew install jq vim" >&2
        echo "  Ubuntu: sudo apt-get install jq xxd" >&2
        echo "  CentOS: sudo yum install jq vim-common" >&2
        exit 1
    fi
}

# =============================================================================
# VALIDATION
# =============================================================================

validate_config() {
    local errors=()
    
    if [[ ! -f "$PRIVATE_KEY_PATH" ]]; then
        errors+=("Private key file not found: $PRIVATE_KEY_PATH")
    fi
    
    if [[ "$CERTIFICATE_BASE64" == "<YOUR_CERTIFICATE_BASE64_HERE>" ]] || [[ -z "$CERTIFICATE_BASE64" ]]; then
        errors+=("CERTIFICATE_BASE64 is not configured")
    fi
    
    if [[ "$ISSUER" == "<YOUR_CREDENTIAL_GROUP_OWNER_ID>" ]] || [[ -z "$ISSUER" ]]; then
        errors+=("ISSUER is not configured")
    fi
    
    if [[ "$SUBJECT" == "<USER_EMAIL_ADDRESS>" ]] || [[ -z "$SUBJECT" ]]; then
        errors+=("SUBJECT (user email) is not configured")
    fi
    
    if [[ "$ACCOUNT_ID" == "<PARTNER_ACCOUNT_ID>" ]] || [[ -z "$ACCOUNT_ID" ]]; then
        errors+=("ACCOUNT_ID is not configured")
    fi
    
    if [ ${#errors[@]} -gt 0 ]; then
        echo "ERROR: Configuration validation failed:" >&2
        for err in "${errors[@]}"; do
            echo "  - $err" >&2
        done
        exit 1
    fi
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

# Base64url encode (URL-safe Base64 without padding)
base64url_encode() {
    # Read from stdin, base64 encode, then make URL-safe
    base64 | tr -d '\n' | tr '+/' '-_' | tr -d '='
}

# Format Unix timestamp to human-readable date (cross-platform)
format_timestamp() {
    local ts="$1"
    # Try macOS format first, then Linux format
    date -r "$ts" "+%Y-%m-%d %H:%M:%S %Z" 2>/dev/null || \
    date -d "@$ts" "+%Y-%m-%d %H:%M:%S %Z" 2>/dev/null || \
    echo "N/A"
}

# Generate UUID v4
generate_uuid() {
    if [[ -f /proc/sys/kernel/random/uuid ]]; then
        cat /proc/sys/kernel/random/uuid
    elif command -v uuidgen &> /dev/null; then
        uuidgen | tr '[:upper:]' '[:lower:]'
    else
        # Fallback: generate pseudo-UUID using openssl
        openssl rand -hex 16 | sed 's/\(..\)\(..\)\(..\)\(..\)\(..\)\(..\)\(..\)\(..\)/\1\2\3\4-\5\6-4\7-\8/'
    fi
}

# Convert DER-encoded ECDSA signature to raw R||S format
# DER format: 0x30 [total-len] 0x02 [r-len] [r-bytes] 0x02 [s-len] [s-bytes]
# Raw format: 32 bytes of R + 32 bytes of S (for ES256/P-256)
der_to_raw_signature() {
    local der_file="$1"
    local raw_file="$2"
    
    # Read DER file as hex
    local der_hex=$(xxd -p < "$der_file" | tr -d '\n')
    
    # Parse DER structure
    # Skip first 2 bytes (0x30 + length)
    local pos=4
    
    # Read R integer
    # Skip 0x02 marker
    pos=$((pos + 2))
    # Get R length (in hex, so multiply by 2 for string position)
    local r_len=$((16#${der_hex:$pos:2}))
    pos=$((pos + 2))
    # Extract R value
    local r_hex="${der_hex:$pos:$((r_len * 2))}"
    pos=$((pos + r_len * 2))
    
    # Read S integer
    # Skip 0x02 marker
    pos=$((pos + 2))
    # Get S length
    local s_len=$((16#${der_hex:$pos:2}))
    pos=$((pos + 2))
    # Extract S value
    local s_hex="${der_hex:$pos:$((s_len * 2))}"
    
    # Remove leading zero padding if present (DER uses signed integers)
    if [[ ${#r_hex} -gt 64 ]] && [[ "${r_hex:0:2}" == "00" ]]; then
        r_hex="${r_hex:2}"
    fi
    if [[ ${#s_hex} -gt 64 ]] && [[ "${s_hex:0:2}" == "00" ]]; then
        s_hex="${s_hex:2}"
    fi
    
    # Pad to 32 bytes (64 hex chars) each
    while [[ ${#r_hex} -lt 64 ]]; do
        r_hex="00${r_hex}"
    done
    while [[ ${#s_hex} -lt 64 ]]; do
        s_hex="00${s_hex}"
    done
    
    # Combine R and S and write as binary
    echo -n "${r_hex}${s_hex}" | xxd -r -p > "$raw_file"
}

# =============================================================================
# JWT GENERATION
# =============================================================================
#
# JWT Structure for Klarna Deep Linking:
#
# HEADER (Base64url encoded):
#   {
#     "alg": "ES256",           // Algorithm: ECDSA with P-256 and SHA-256
#     "typ": "JWT",             // Token type
#     "x5c": ["<cert>"]         // X.509 certificate chain (Base64 encoded)
#   }
#
# PAYLOAD (Base64url encoded):
#   {
#     "iss": "<issuer>",        // Who issued this token (your credential group)
#     "sub": "<email>",         // User's email address
#     "jti": "<uuid>",          // Unique token identifier
#     "iat": <timestamp>,       // When the token was issued
#     "exp": <timestamp>,       // When the token expires
#     "account_id": "<krn>",    // Partner account to access
#     "on_behalf_of": "<krn>",  // Who the user represents
#     "roles": ["<role>"],      // Access roles
#     "amr": ["pwd"]            // Authentication method reference (required for deep links)
#   }
#
# SIGNATURE (Base64url encoded):
#   ES256 signature of "header.payload" using the EC private key
#
# =============================================================================

generate_jwt() {
    # Set ON_BEHALF_OF to ACCOUNT_ID if not specified (user represents the merchant directly)
    local on_behalf_of="${ON_BEHALF_OF:-$ACCOUNT_ID}"
    
    # Get current Unix timestamp for iat (issued at) and calculate exp (expiration)
    local iat=$(date +%s)
    local exp=$((iat + TOKEN_LIFETIME_SECONDS))
    
    # Generate unique JWT ID (jti) to prevent token replay
    local jti=$(generate_uuid)
    
    # Convert space-separated roles to JSON array format
    local roles_json=$(echo "$ROLES" | tr ' ' '\n' | jq -R . | jq -s .)
    
    # Build JWT Header with algorithm, type, and certificate chain
    local header=$(jq -n -c \
        --arg x5c "$CERTIFICATE_BASE64" \
        '{
            "alg": "ES256",
            "typ": "JWT",
            "x5c": [$x5c]
        }')
    
    # Build JWT Payload with all required claims
    # Note: "amr": ["pwd"] indicates the Acquiring Partner has verified the user via password
    local payload=$(jq -n -c \
        --arg iss "$ISSUER" \
        --arg sub "$SUBJECT" \
        --arg jti "$jti" \
        --argjson iat "$iat" \
        --argjson exp "$exp" \
        --arg account_id "$ACCOUNT_ID" \
        --arg on_behalf_of "$on_behalf_of" \
        --argjson roles "$roles_json" \
        '{
            "iss": $iss,
            "sub": $sub,
            "jti": $jti,
            "iat": $iat,
            "exp": $exp,
            "account_id": $account_id,
            "on_behalf_of": $on_behalf_of,
            "roles": $roles,
            "amr": ["pwd"]
        }')
    
    # Base64url encode header and payload
    local header_b64=$(echo -n "$header" | base64url_encode)
    local payload_b64=$(echo -n "$payload" | base64url_encode)
    
    # Create signing input
    local signing_input="${header_b64}.${payload_b64}"
    
    # Sign with ES256 (ECDSA with SHA-256)
    # OpenSSL outputs DER-encoded signature, we need to convert to raw R||S format for JWT
    local der_sig_file=$(mktemp)
    local raw_sig_file=$(mktemp)
    trap "rm -f '$der_sig_file' '$raw_sig_file'" EXIT
    
    echo -n "$signing_input" | openssl dgst -sha256 -sign "$PRIVATE_KEY_PATH" -out "$der_sig_file"
    
    # Convert DER signature to raw R||S format (64 bytes for ES256)
    # DER format: 0x30 [total-len] 0x02 [r-len] [r] 0x02 [s-len] [s]
    der_to_raw_signature "$der_sig_file" "$raw_sig_file"
    
    local signature_b64=$(base64url_encode < "$raw_sig_file")
    
    # Assemble final JWT
    local jwt="${signing_input}.${signature_b64}"
    
    # Output summary
    echo "=============================================" >&2
    echo "JWT Generated Successfully" >&2
    echo "=============================================" >&2
    echo "Issuer (iss):      $ISSUER" >&2
    echo "Subject (sub):     $SUBJECT" >&2
    echo "Account ID:        $ACCOUNT_ID" >&2
    echo "On Behalf Of:      $on_behalf_of" >&2
    echo "Roles:             $ROLES" >&2
    echo "JWT ID (jti):      $jti" >&2
    echo "Issued At (iat):   $iat ($(format_timestamp $iat))" >&2
    echo "Expires (exp):     $exp ($(format_timestamp $exp))" >&2
    echo "AMR:               pwd" >&2
    echo "=============================================" >&2
    echo "" >&2
    echo "JWT Token:" >&2
    echo "" >&2
    
    # Output the JWT to stdout
    echo "$jwt"
}

# =============================================================================
# MAIN
# =============================================================================

main() {
    echo "Klarna Partner Portal JWT Generator" >&2
    echo "====================================" >&2
    echo "" >&2
    
    # Check dependencies
    check_dependencies
    
    # Validate configuration
    validate_config
    
    # Generate and output JWT
    generate_jwt
    
    echo "" >&2
    echo "=============================================" >&2
    echo "Usage:" >&2
    echo "  Use this JWT in the request body to create a deep link:" >&2
    echo '  {"jwt": "<token>"}' >&2
    echo "" >&2
    echo "  POST /v2/accounts/{partner_account_id}/portal/deep-links" >&2
    echo "=============================================" >&2
}

main "$@"
