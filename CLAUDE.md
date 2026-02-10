# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Klarna Network API Demo - A Next.js application for testing Klarna Network APIs with mTLS authentication support. Provides an interactive interface for making API requests, viewing responses, and managing environment variables.

## Development Commands

```bash
# Start development server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint

# Database commands (Turso + Drizzle)
npm run db:generate   # Generate migration files from schema changes
npm run db:migrate    # Run pending migrations
npm run db:push       # Push schema directly to database (dev)
npm run db:studio     # Open Drizzle Studio GUI

# Claude Code Skills
/done                 # Commit all changes with auto-generated message and push to main
```

## Environment Setup

1. Copy `.env.local.example` to `.env.local`
2. Configure required variables:
   - `acquiring_partner_api_key` - Klarna API key (format: `klarna_test_api_...` or `klarna_live_api_...`)
   - `KLARNA_BASE_URL` - API base URL (test: `https://api-global.test.klarna.com`)
   - `KLARNA_CERT_PATH` / `KLARNA_KEY_PATH` - mTLS certificate paths (relative to project root)
   - `KLARNA_SKIP_MTLS` - Set to `true` to bypass mTLS for testing
   - `TURSO_DATABASE_URL` - Turso database URL (format: `libsql://your-db.turso.io`)
   - `TURSO_AUTH_TOKEN` - Turso authentication token
3. Place mTLS certificates in `certs/` directory (gitignored)
4. Set up Turso database (optional — app degrades gracefully without it):
   - `turso db create kn-ap` → `turso db show kn-ap --url` for URL
   - `turso db tokens create kn-ap` for auth token
   - `npm run db:push` to create tables

## Architecture Overview

### Request Flow
1. **Frontend** (React/Next.js) → User selects endpoint preset or custom request
2. **API Proxy** (`app/api/klarna-proxy/route.ts`) → Server-side proxy that:
   - Loads mTLS certificates from filesystem
   - Injects API key from environment (never exposed to browser)
   - Generates required Klarna headers (correlation ID, idempotency key, integration metadata)
   - Makes HTTPS request with mTLS to Klarna API
   - Returns sanitized response to frontend
3. **Response Display** → JSON viewer with variable extraction support

### Key Design Patterns

**Security by Design:**
- API keys never exposed to browser (proxied through Next.js API route)
- mTLS certificates loaded server-side only
- Sensitive files (`.env.local`, `certs/`) are gitignored

**mTLS Authentication:**
- Certificates loaded from filesystem in `app/api/klarna-proxy/route.ts`
- Uses Node.js native `https` module (not axios) for proper mTLS support
- Can be disabled with `KLARNA_SKIP_MTLS=true` for testing

**Endpoint Presets System:**
- Static presets split across `lib/endpoints/` (per-category files: credentials, accounts, onboarding, payments, webhooks, settlements)
- Barrel export from `lib/endpoints/index.ts` — import `staticEndpointPresets` from there
- Legacy `lib/klarna-endpoints.ts` re-exports from `lib/endpoints/` for backwards compatibility
- Includes path parameters, body templates, and descriptions
- Supports variable substitution with `{variable_name}` syntax

**Database Layer (Turso + Drizzle):**
- Turso (libSQL) database for persistent storage, configured via `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
- Drizzle ORM for type-safe queries; schema in `lib/db/schema.ts`
- Tables: `api_call_history`, `environment_variables`, `saved_requests`, `user_preferences`
- Query helpers in `lib/db/queries/` (call-history, env-variables, saved-requests, preferences)
- API routes in `app/api/db/` (history, variables, saved-requests, preferences)
- **Graceful degradation**: If Turso is not configured, app falls back to in-memory/localStorage behavior

**Environment Variable Management:**
- DB-first with localStorage fallback (`lib/env-context.tsx`)
- On mount: fetches from DB → if empty, migrates localStorage data to DB
- Writes go to both DB (primary) and localStorage (backup)
- Server-sourced vars (`vercel`, `env_file`) stay in `/api/env` — only `user` and `response` vars in DB
- Supports extraction from API responses (e.g., save credential_id from response)
- Variable substitution in request bodies and paths using `{variable_name}` format

**Call History Persistence:**
- `useCallHistory` hook (`lib/hooks/useCallHistory.ts`) provides optimistic local state with background DB sync
- Loads last 100 calls from DB on mount
- `addCall()` / `updateCall()` update state immediately, write to DB async
- Degrades to ephemeral (in-memory) if DB unavailable

### Component Structure

**Pages:**
- `app/page.tsx` - API Tester interface (main page)
- `app/account_structure/page.tsx` - Account structure visualization with network diagram
- `app/payment-button/page.tsx` - Payment button demo
- `app/on-site-messaging/page.tsx` - On-Site Messaging demo with placement configuration

**Core Components:**
- `components/RequestForm.tsx` - Request configuration (method, path, headers, body)
- `components/ResponsePanel.tsx` - Response display with JSON viewer
- `components/EnvironmentPanel.tsx` - Environment variable management
- `components/KlarnaNetworkDiagram.tsx` - Visual network structure using ReactFlow

**API Integration:**
- `lib/endpoints/` - Endpoint preset definitions split by category (credentials, accounts, onboarding, payments, webhooks, settlements)
- `lib/types.ts` - TypeScript interfaces for requests, responses, and UI state

**Database Layer:**
- `lib/db/schema.ts` - Drizzle table definitions
- `lib/db/client.ts` - Turso client singleton
- `lib/db/index.ts` - Drizzle ORM instance
- `lib/db/queries/` - CRUD query helpers (call-history, env-variables, saved-requests, preferences)
- `lib/hooks/useCallHistory.ts` - Call history hook with optimistic updates + DB sync
- `lib/api-helpers.ts` - Standardized error handling wrapper for API routes

## Important Patterns

### Klarna API Headers (auto-generated by proxy)
- `Authorization: Basic {acquiring_partner_api_key}`
- `Partner-Correlation-Id` - UUID v4 for request tracking
- `Klarna-Idempotency-Key` - UUID v5 (for POST/PATCH/PUT only)
- `Klarna-Integration-Metadata` - JSON with integrator info

### Path Parameter Substitution
Endpoints with `{parameter_name}` or `:parameter_name` in path require values:
```
/v2/accounts/{account_id}/stores/{store_id}
```
UI extracts these and prompts for values, substitutes before sending request.

### KRN Format
Klarna Resource Names follow pattern:
```
krn:partner:global:account:test:uuid
krn:partner:global:account:payment-product:uuid
```

## Package Installation Rules

**CRITICAL:** Developed on Klarna machine but deployed externally. Always use public npm registry:

```bash
# ✅ CORRECT - Use public registry
npm install <package> --registry=https://registry.npmjs.org/

# ❌ WRONG - Will fail in production
npm install <package>
```

Set in `.npmrc`:
```
registry=https://registry.npmjs.org/
```

## Claude Code Skills

This project includes custom Claude Code skills for common workflows:

### `/done` - Auto Commit and Push
Commits all changes with an auto-generated descriptive commit message and pushes to main branch.

**Usage:**
```
/done
```

**What it does:**
1. Reviews all modified and untracked files
2. Reads key files to understand changes
3. Generates a clear, descriptive commit message (max 72 chars, present tense, action-oriented)
4. Stages all changes with `git add .`
5. Commits with the generated message
6. Pushes to main branch
7. Confirms success with git log

**When to use:**
- Feature work is complete and ready to push
- Working solo or on personal projects
- Quick iterations where code review isn't required

**Important notes:**
- Pushes directly to main (no code review)
- Only suitable for solo projects or personal work
- Handles errors gracefully (no changes, push failures)
- Commit messages follow project conventions (see examples in skill file)

**Skill location:** `.claude/skills/done/SKILL.md`

## Clarification Pattern

When requirements are ambiguous or multiple approaches exist, ask for clarification rather than making assumptions. This applies to:
- Technical decisions (architecture, library choices)
- Missing context (which files/features to modify)
- Trade-offs between approaches
- User intent with multiple interpretations

## Documentation Maintenance

**IMPORTANT:** When making significant changes to the codebase, update relevant documentation to keep it in sync. This ensures users and future developers can understand the system accurately.

### When to Update Documentation

Update documentation when you:
- **Add new pages/routes** - New files in `app/` directory that create user-accessible pages
- **Modify existing routes** - Change page functionality, URL structure, or navigation
- **Add major features** - New capabilities, UI components, or API integrations
- **Change architecture** - Modify request flow, data patterns, or system design
- **Update environment variables** - Add/remove/rename variables in `.env.local.example`
- **Add/remove dependencies** - New packages that affect usage or setup

### What to Update

**For new pages/routes:**
- Update README.md "Usage" section with new route and its purpose
- Update CLAUDE.md "Component Structure" > "Pages" section with new page path and description
- Create feature documentation in `docs/` if the page introduces significant new functionality

**For major features:**
- Update README.md "Features" section with bullet point for new capability
- Add implementation details to CLAUDE.md "Architecture Overview" if it involves new patterns
- Create detailed documentation in `docs/` folder (e.g., `docs/FEATURE_NAME.md`) for complex features
- Update relevant sections in existing docs if the feature extends existing functionality

**For functionality changes:**
- Update affected sections in README.md (Features, Usage, Troubleshooting)
- Update CLAUDE.md if architectural patterns or workflows change
- Update existing docs in `docs/` folder if they reference the changed functionality

**For environment/configuration changes:**
- Update `.env.local.example` with new variables and comments
- Update README.md "Environment Setup" section
- Update CLAUDE.md "Environment Setup" section

### Documentation Standards

- Keep README.md user-focused (setup, usage, troubleshooting)
- Keep CLAUDE.md developer-focused (architecture, patterns, workflows)
- Use `docs/` folder for detailed feature documentation and implementation notes
- Include examples and command snippets where helpful
- Update the "Project Structure" tree in README.md if directory structure changes

## Testing Workflow

1. Start dev server: `npm run dev`
2. Configure `.env.local` with test credentials
3. Test API endpoints through UI at `http://localhost:3000`
4. Check proxy logs in terminal for debugging (correlation IDs, mTLS status)
5. Common errors:
   - 401: Check `acquiring_partner_api_key` format and validity
   - 403: mTLS certificate issues or IP restrictions
   - Certificate errors: Verify cert/key files in `certs/` directory

## Technology Stack

- **Framework:** Next.js 14 (App Router)
- **UI:** React 18, Material-UI (MUI), Tailwind CSS
- **Database:** Turso (libSQL) + Drizzle ORM
- **HTTP Client:** Native Node.js `https` module (for mTLS)
- **Visualization:** ReactFlow (network diagrams), dagre (graph layout)
- **JSON Handling:** @uiw/react-json-view
- **TypeScript:** Strict mode enabled

## Key Files Reference

- `app/api/klarna-proxy/route.ts:67-82` - mTLS certificate loading
- `app/api/klarna-proxy/route.ts:84-130` - Klarna header generation
- `app/api/klarna-proxy/route.ts:133-218` - HTTPS request with mTLS
- `lib/endpoints/` - All endpoint preset definitions (split by category)
- `lib/db/schema.ts` - Database table definitions (Drizzle)
- `lib/db/queries/` - Database CRUD operations
- `lib/hooks/useCallHistory.ts` - Call history persistence hook
- `lib/env-context.tsx` - Environment variable context (DB-first + localStorage fallback)
- `lib/types.ts:1-336` - Complete TypeScript type system
- `drizzle.config.ts` - Drizzle Kit configuration for Turso
