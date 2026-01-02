# API Guardrails Documentation

## Overview

This document explains the frontend API access layer guardrails implemented in `apiClient.ts`. These guardrails are **security-critical** and must not be bypassed.

## Why the Allowlist Exists

The Trust-First Census System is designed with **deny-by-default** security. The frontend API client enforces an explicit endpoint allowlist for the following reasons:

### 1. Prevent Accidental Access to Forbidden Endpoints

The backend has many internal endpoints that should never be called from the frontend:
- Raw submission data endpoints (L1 layer)
- Aggregation trigger endpoints
- Admin/bootstrap endpoints
- Debug endpoints

Without an allowlist, a developer could accidentally call these endpoints, potentially:
- Exposing sensitive data
- Triggering unauthorized operations
- Bypassing privacy protections

### 2. Enforce Trust Boundaries

The frontend is considered an **untrusted client**. Even though the backend enforces access control, the frontend should not attempt to access resources it has no business accessing. The allowlist makes the trust boundary explicit.

### 3. Audit Trail

With a centralized allowlist, security auditors can easily verify:
- What endpoints the frontend can access
- What parameters each endpoint accepts
- What the expected behavior is

### 4. Defense in Depth

The allowlist is a **second layer of defense** after backend authorization. If a backend bug accidentally exposes an endpoint, the frontend guardrails prevent exploitation.

---

## Why Direct fetch() is Forbidden

Components and pages **MUST NOT** call `fetch()` directly. All API requests must go through `apiClient.ts`. Here's why:

### 1. Bypass Prevention

Direct `fetch()` calls could:
- Access endpoints not in the allowlist
- Send parameters that should be rejected
- Skip authentication checks
- Handle errors inconsistently

### 2. Consistent Error Handling

The API client provides:
- Safe error messages (no backend details exposed)
- No silent retries (fail-closed behavior)
- Proper authentication header injection

### 3. Type Safety

The API client provides TypeScript types for:
- Request parameters
- Response shapes
- Error types

Direct `fetch()` loses all type safety.

### 4. Centralized Logging (Future)

When audit logging is added, the API client is the single point where all requests can be logged.

---

## Allowed Endpoints

The following endpoints are permitted from the frontend:

| Endpoint Key | Path | Intent | Description |
|--------------|------|--------|-------------|
| `auth.login` | `/auth/login` | WRITE | User authentication |
| `consent.create` | `/consent/capture` | WRITE | Create consent record |
| `submissions.create` | `/submissions` | WRITE | Submit census data |
| `submissions.verifyReceipt` | `/submissions/verify` | READ | Verify receipt exists |
| `analytics.stateAggregates` | `/analytics/aggregates/state` | READ | State-level data |
| `analytics.nationalAggregates` | `/analytics/aggregates/national` | READ | National-level data |
| `analytics.windows` | `/analytics/windows` | READ | List time windows |

---

## Forbidden Operations

The following operations are **explicitly forbidden** and will throw `GuardrailViolationError`:

| Operation | Why Forbidden |
|-----------|---------------|
| `getRawSubmissions()` | Individual records are never accessible |
| `exportData()` | Bulk data export is not permitted |
| `getDistrictAggregates()` | Too granular for frontend access |
| `getVillageData()` | Privacy risk - small group identification |

These functions exist in the codebase to make the denial explicit and documented.

---

## Request Intent Enforcement

Each endpoint is tagged with an **intent**:

- **READ** → Must use `GET` method
- **WRITE** → Must use `POST` method

This prevents:
- Accidental data modification via GET requests
- Caching of sensitive POST responses
- CSRF vulnerabilities

---

## Parameter Validation

Each endpoint defines an `allowedParams` array. The API client:

1. **Rejects unknown parameters** - Extra params are not silently ignored
2. **Validates presence** - Required params must be provided
3. **Prevents injection** - No dynamic query construction

Example:
```typescript
// This will throw GuardrailViolationError
apiRequest('auth.login', { 
  username: 'test', 
  password: 'pass',
  role: 'SUPER_ADMIN'  // ❌ Not in allowedParams
});
```

---

## Auth Token Handling

### Memory-Only Storage

Auth tokens are stored **in memory only** (module scope variable). They are NEVER stored in:
- ❌ localStorage
- ❌ sessionStorage
- ❌ Cookies
- ❌ IndexedDB

### Why Memory-Only?

1. **XSS Protection** - Tokens can't be stolen by malicious scripts accessing storage
2. **Session Isolation** - Each browser tab has its own session
3. **Forced Re-authentication** - Page refresh requires re-login
4. **No Persistent Sessions** - Reduces risk of session hijacking

### Implications

- Users must re-login after page refresh
- Tokens are lost when the browser tab is closed
- This is intentional for a high-security system

---

## Error Handling

### Fail-Closed Behavior

All errors result in request failure:
- No silent retries
- No fallback endpoints
- No degraded functionality

### Safe Error Messages

Error messages shown to users are generic and safe:
- ✅ "Authentication required. Please sign in."
- ❌ "JWT token expired at 2024-01-01T00:00:00Z for user admin"

Backend error details are never exposed to the UI.

### Error Types

| Error Type | When Thrown |
|------------|-------------|
| `ApiError` | Network or server errors |
| `GuardrailViolationError` | Security rule violations |

---

## Guarantees Provided

By using this API client, the frontend guarantees:

1. **No unauthorized endpoint access** - Only allowlisted endpoints can be called
2. **No parameter injection** - Only defined parameters are accepted
3. **No token leakage** - Tokens stay in memory
4. **No silent failures** - All errors are surfaced
5. **No data export** - Export functionality doesn't exist
6. **No raw data access** - Individual records are inaccessible
7. **Consistent authentication** - All requests include auth headers

---

## Developer Guidelines

### ✅ DO

```typescript
// Use the API client
import { login, createConsent, getStateAggregates } from '@/lib/apiClient';

// Call convenience methods
const response = await login(username, password);

// Or use apiRequest for explicit endpoint access
const data = await apiRequest('analytics.stateAggregates', { stateCode: 'MH' });
```

### ❌ DON'T

```typescript
// NEVER call fetch directly
const response = await fetch('/api/submissions'); // ❌ FORBIDDEN

// NEVER construct dynamic endpoints
const endpoint = `/api/${userInput}`; // ❌ FORBIDDEN

// NEVER store tokens in storage
localStorage.setItem('token', token); // ❌ FORBIDDEN

// NEVER suppress errors
try {
  await apiRequest('...');
} catch {
  // silently ignore // ❌ FORBIDDEN
}
```

---

## Security Review Checklist

When reviewing frontend code, verify:

- [ ] No direct `fetch()` calls outside `apiClient.ts`
- [ ] No `localStorage`/`sessionStorage` token storage
- [ ] No dynamic endpoint construction
- [ ] All API calls use `apiRequest()` or convenience methods
- [ ] Errors are properly surfaced to users
- [ ] No export/download functionality added

---

## Modification Policy

Changes to `apiClient.ts` require:

1. Security review
2. Documentation update
3. Explicit justification for new endpoints
4. No removal of existing guardrails

Adding new endpoints requires updating:
1. `ALLOWED_ENDPOINTS` constant
2. TypeScript types
3. This documentation

