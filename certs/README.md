# Klarna mTLS Certificates

Place your mTLS certificate files in this directory:

1. `client-cert.pem` - Your client certificate (public)
2. `client-key.pem` - Your client private key (keep secret!)

## Important Security Notes

- **NEVER** commit these files to version control
- These files are gitignored by default
- Keep your private key secure and do not share it

## How to obtain certificates

Contact your Klarna account representative to obtain mTLS credentials, or use the Klarna Management API to create client certificates:

```
POST /v2/account/integration/credentials/client-certificate
```

## Certificate Format

Certificates should be in PEM format:

```
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----
```

Keys should also be in PEM format:

```
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
```

or

```
-----BEGIN EC PRIVATE KEY-----
...
-----END EC PRIVATE KEY-----
```
