# Authentication Flow Documentation

## Overview

This document explains the authentication architecture for the Trust-First Census System frontend. The design prioritizes security over convenience, supporting the system's trust-first guarantees.

## Why Memory-Only Authentication

### The Design Decision

Auth tokens are stored **exclusively in memory** (JavaScript module scope). They are NEVER persisted to:

- ❌ localStorage
- ❌ sessionStorage
- ❌ Cookies
- ❌ IndexedDB
- ❌ Any other browser storage

### Why This Matters

#### 1. XSS Protection

If a Cross-Site Scripting (XSS) vulnerability were exploited:

| Storage Type | Risk |
|--------------|------|
| localStorage | Token can be stolen via `localStorage.getItem()` |
| sessionStorage | Token can be stolen via `sessionStorage.getItem()` |
| Cookies (non-HttpOnly) | Token can be stolen via `document.cookie` |
| **Memory** | Token is NOT accessible to injected scripts |

Memory-only storage means even if an attacker injects JavaScript, they cannot extract the token from storage APIs.

#### 2. Session Isolation

Each browser tab maintains its own JavaScript memory space. This means:

- Tab A's session is completely isolated from Tab B
- Closing a tab immediately ends that session
- No session state leaks between tabs

#### 3. Forced Re-authentication

Page refresh clears JavaScript memory, requiring re-authentication. This:

- Limits the window of exposure if a device is compromised
- Ensures users actively re-confirm their identity
- Prevents stale sessions from accumulating

#### 4. No Persistent Attack Surface

With no persistent storage:

- There's nothing for malware to scrape from disk
- Browser extensions cannot access stored tokens
- Shared computers don't retain session data

---

## Why No Refresh Tokens

### What Refresh Tokens Are

Typically, authentication systems use:
- **Access Token**: Short-lived (minutes to hours), used for API requests
- **Refresh Token**: Long-lived (days to weeks), used to get new access tokens

### Why We Don't Use Them

#### 1. Extended Exposure Window

Refresh tokens create a longer window where a stolen token remains valid:

```
Access Token Only:  [====] 24 hours max
With Refresh Token: [============================] days/weeks
```

#### 2. Silent Re-authentication

Refresh tokens enable silent re-authentication, which:
- Masks session hijacking (user doesn't notice)
- Extends compromised sessions indefinitely
- Contradicts "fail-closed" philosophy

#### 3. Storage Requirement

Refresh tokens must be stored somewhere to survive page refresh. This reintroduces all the storage risks we're avoiding.

#### 4. Complexity

Refresh token flows add:
- Token rotation logic
- Race condition handling
- Revocation infrastructure
- Additional attack surface

### The Trade-off

| Feature | With Refresh Tokens | Without (Our Approach) |
|---------|---------------------|------------------------|
| User convenience | High (stays logged in) | Lower (re-login on refresh) |
| Security | Lower | Higher |
| Complexity | Higher | Lower |
| Attack surface | Larger | Smaller |

For a government census system handling sensitive data, we choose security over convenience.

---

## How This Supports Trust-First Guarantees

### 1. No Persistent Credentials

Trust-first means minimizing stored sensitive data. By not persisting tokens:
- We store less sensitive data
- There's less to protect
- There's less to audit

### 2. Explicit User Intent

Every session requires explicit login, ensuring:
- The user consciously chooses to access the system
- There's a clear audit trail of login events
- No "background" access occurs

### 3. Fail-Closed Behavior

If anything goes wrong with authentication:
- The user is logged out
- They must re-authenticate
- No degraded or "partially authenticated" state exists

### 4. Auditability

Every login is a discrete, auditable event:
- Backend logs each authentication attempt
- No silent session extensions
- Clear timeline of access

---

## Authentication Flow

### Login Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │     │  Frontend   │     │  Backend    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ Enter credentials │                   │
       │──────────────────>│                   │
       │                   │                   │
       │                   │ POST /auth/login  │
       │                   │──────────────────>│
       │                   │                   │
       │                   │  { token, user }  │
       │                   │<──────────────────│
       │                   │                   │
       │                   │ Store token in    │
       │                   │ memory (module    │
       │                   │ scope variable)   │
       │                   │                   │
       │                   │ Store user info   │
       │                   │ in React context  │
       │                   │                   │
       │  Show logged-in   │                   │
       │<──────────────────│                   │
       │                   │                   │
```

### Authenticated Request Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │     │  Frontend   │     │  Backend    │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ Navigate to       │                   │
       │ protected page    │                   │
       │──────────────────>│                   │
       │                   │                   │
       │                   │ Get token from    │
       │                   │ memory            │
       │                   │                   │
       │                   │ GET /analytics    │
       │                   │ Authorization:    │
       │                   │ Bearer <token>    │
       │                   │──────────────────>│
       │                   │                   │
       │                   │  { data }         │
       │                   │<──────────────────│
       │                   │                   │
       │  Show data        │                   │
       │<──────────────────│                   │
       │                   │                   │
```

### Logout Flow

```
┌─────────────┐     ┌─────────────┐
│   User      │     │  Frontend   │
└──────┬──────┘     └──────┬──────┘
       │                   │
       │ Click "Sign Out"  │
       │──────────────────>│
       │                   │
       │                   │ Clear token from
       │                   │ memory
       │                   │
       │                   │ Clear user from
       │                   │ React context
       │                   │
       │  Show logged-out  │
       │<──────────────────│
       │                   │
```

### Page Refresh Flow

```
┌─────────────┐     ┌─────────────┐
│   User      │     │  Frontend   │
└──────┬──────┘     └──────┬──────┘
       │                   │
       │ Refresh page      │
       │──────────────────>│
       │                   │
       │                   │ JavaScript memory
       │                   │ is cleared
       │                   │
       │                   │ Token is lost
       │                   │
       │                   │ User state is null
       │                   │
       │  Show login page  │
       │<──────────────────│
       │                   │
```

---

## Implementation Details

### Token Storage (apiClient.ts)

```typescript
// Module-scope variable (memory only)
let authToken: string | null = null;

export function setAuthToken(token: string): void {
  authToken = token;
}

export function clearAuthToken(): void {
  authToken = null;
}
```

### User State (authContext.tsx)

```typescript
// React state (memory only)
const [user, setUser] = useState<User | null>(null);

// On login success
setUser(Object.freeze({
  id: response.user.id,
  username: response.user.username,
  role: response.user.role,
  geographicScope: Object.freeze({ ...response.user.geographicScope }),
}));

// On logout
setUser(null);
```

### Role and Scope Immutability

User role and geographic scope are frozen after login:

```typescript
const authenticatedUser: User = Object.freeze({
  id: response.user.id,
  username: response.user.username,
  role: response.user.role,
  geographicScope: response.user.geographicScope 
    ? Object.freeze({ ...response.user.geographicScope })
    : null,
});
```

This prevents:
- Accidental modification
- Intentional tampering
- Role escalation attempts

---

## Security Considerations

### What We Protect Against

| Threat | Mitigation |
|--------|------------|
| XSS token theft | Memory-only storage |
| Session fixation | No persistent sessions |
| CSRF | No cookies used for auth |
| Session hijacking | Short-lived, no refresh |
| Privilege escalation | Immutable role/scope |

### What Users Should Know

1. **Sessions are temporary** - Closing the browser or refreshing ends the session
2. **Re-login is required** - This is a security feature, not a bug
3. **No "remember me"** - Intentionally omitted for security
4. **All logins are logged** - Backend audit trail captures every authentication

---

## FAQ

### Q: Why do I have to log in again after refreshing?

**A:** This is intentional. Memory-only token storage means refreshing clears your session. This is a security feature that limits the exposure window if your device is compromised.

### Q: Can you add a "remember me" option?

**A:** No. This would require persistent storage, which contradicts our security model. For a government system handling sensitive census data, we prioritize security over convenience.

### Q: What if I'm in the middle of work and accidentally refresh?

**A:** You'll need to log in again. Any unsaved work in forms may be lost. We recommend completing submissions before navigating away.

### Q: Is this less secure than using HttpOnly cookies?

**A:** HttpOnly cookies protect against XSS reading the cookie value, but they're still sent automatically with requests (CSRF risk). Our approach requires explicit token attachment and doesn't use cookies at all.

### Q: Why not use a service worker to persist the session?

**A:** Service workers can persist data, but this would defeat the purpose of memory-only storage. We intentionally avoid all persistence mechanisms.

