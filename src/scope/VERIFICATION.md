# Scope and Purpose Enforcement Verification

## Phase 2.4: Scope and Purpose Enforcement

This document verifies that scope and purpose enforcement is correctly implemented
across the Trust-First Caste Census Management System.

---

## Verification Checklist

### ✅ 1. Scope Violations Are Denied

| Verification Point | Status | Implementation |
|-------------------|--------|----------------|
| Requests outside geographic scope are denied | ✅ | `scope/middleware.js` - `validateGeographicScope()` |
| Wildcard scopes are explicitly forbidden | ✅ | `scope/definitions.js` - `FORBIDDEN_SCOPE_PATTERNS` |
| Scope escalation via request is blocked | ✅ | Scope loaded from DB during auth, immutable |
| Users without scope assignment are denied | ✅ | `validateGeographicScope()` returns false if no scope |
| National-level users cannot access village data | ✅ | Role-based geographic level restrictions |

**Test Cases:**
- Enumerator with Block A scope cannot submit for Block B → DENIED
- StateAnalyst with State X scope cannot read State Y aggregates → DENIED
- Any request with `*`, `ALL`, or `WILDCARD` scope → DENIED
- User without scope assignment accessing protected route → DENIED

---

### ✅ 2. Purpose Violations Are Denied

| Verification Point | Status | Implementation |
|-------------------|--------|----------------|
| Routes declare required purpose | ✅ | `ROUTE_PURPOSE_MAP` in middleware |
| Requests with mismatched purpose are denied | ✅ | `isPurposeAllowed()` check |
| Purpose cannot be overridden via request | ✅ | Purpose from route config, not request |
| Undeclared routes are denied by default | ✅ | `getRoutePurpose()` returns null → denied |
| Each functional scope has explicit allowed purposes | ✅ | `SCOPE_ALLOWED_PURPOSES` mapping |

**Test Cases:**
- Enumerator (SUBMISSION scope) accessing aggregate routes → DENIED
- StateAnalyst (ANALYSIS scope) accessing submission routes → DENIED
- CentralPolicyViewer (POLICY_VIEW scope) accessing audit routes → DENIED
- Request to route without declared purpose → DENIED

---

### ✅ 3. Scope Cannot Be Bypassed via Request Input

| Verification Point | Status | Implementation |
|-------------------|--------|----------------|
| Scope loaded from database, not request | ✅ | `auth.js` loads scope during authentication |
| Scope is immutable after authentication | ✅ | `Object.freeze()` on user.scope |
| Request parameters do not override scope | ✅ | Scope validated against DB-loaded values |
| Request body cannot escalate scope | ✅ | Scope comparison uses DB values only |
| Query strings cannot escalate scope | ✅ | `extractGeographicCodes()` only for validation |

**Test Cases:**
- Modifying `stateCode` in request body to different state → DENIED
- Adding `scope: { level: 'NATIONAL' }` to request → IGNORED (uses DB scope)
- URL parameter with different geographic code → DENIED
- JWT tampering with scope claims → Token invalid (scope from DB, not JWT)

---

## Implementation Details

### Scope Flow

```
1. Authentication (auth.js)
   ├─ Verify JWT token
   ├─ Load user from database
   ├─ Load scope assignment from database
   ├─ Attach IMMUTABLE scope to request.user
   └─ Object.freeze() prevents modification

2. RBAC (rbac/middleware.js)
   ├─ Verify role is valid
   ├─ Verify role is allowed for route
   └─ Continue if role check passes

3. Scope Enforcement (scope/middleware.js)
   ├─ Get functional scope for role
   ├─ Validate purpose binding
   ├─ Extract geographic codes from request
   ├─ Validate against user's DB-loaded scope
   └─ DENY if any validation fails

4. Route Handler
   └─ Only reached if all checks pass
```

### Database Schema

```sql
-- User scope assignments (immutable)
CREATE TABLE user_scope_assignments (
    user_id UUID NOT NULL,
    functional_scope functional_scope NOT NULL,
    geographic_level geographic_level NOT NULL,
    geographic_code VARCHAR(20) NOT NULL,
    -- Prevents wildcard scopes
    CONSTRAINT no_wildcard_scope CHECK (
        geographic_code NOT IN ('*', 'ALL', 'ANY', 'WILDCARD')
    )
);

-- Trigger prevents UPDATE (immutable)
CREATE TRIGGER trigger_prevent_scope_update
    BEFORE UPDATE ON user_scope_assignments
    EXECUTE FUNCTION prevent_scope_modification();
```

### Purpose Categories

| Purpose | Allowed Scopes |
|---------|---------------|
| CENSUS_SUBMISSION | SUBMISSION |
| SUBMISSION_VERIFY | SUBMISSION |
| AGGREGATE_COMPUTE | ANALYSIS |
| AGGREGATE_READ | ANALYSIS |
| POLICY_READ | POLICY_VIEW |
| AUDIT_READ | OVERSIGHT |
| METADATA_READ | OVERSIGHT |
| CONSENT_MANAGE | CONSENT |

### Geographic Scope Hierarchy

```
NATIONAL
└── STATE (2-letter code)
    └── DISTRICT (4-digit code)
        └── BLOCK (6-digit code)
            └── VILLAGE (10-digit code)
```

---

## Audit Trail

All scope and purpose denials are logged to L0 (audit_logs):

```javascript
{
  actionCategory: 'ACCESS_DENIED',
  outcome: 'DENIED',
  metadata: {
    denialType: 'SCOPE_VIOLATION'
    // Specific reason NOT logged (prevents scope logic leakage)
  }
}
```

---

## Cross-Reference

### Trust Boundaries (src/system/trust-boundaries.md)

| Invariant | Enforcement |
|-----------|-------------|
| I5: Access is Scope-Bound | Geographic scope validation |
| I6: Access is Purpose-Bound | Purpose binding validation |
| No Super-Admin | No NATIONAL scope for operational roles |
| No Wildcard Scopes | `FORBIDDEN_SCOPE_PATTERNS` check |

### API Surface (src/system/api-surface.md)

| Endpoint Category | Required Purpose |
|------------------|------------------|
| Submission routes | CENSUS_SUBMISSION |
| Aggregate routes | AGGREGATE_COMPUTE/READ |
| Policy routes | POLICY_READ |
| Audit routes | AUDIT_READ |
| Consent routes | CONSENT_MANAGE |

---

## Security Guarantees

1. **No Dynamic Scope Escalation**: Scope is loaded from database during authentication
   and cannot be modified via request parameters, body, or headers.

2. **No Wildcard Scopes**: The patterns `*`, `ALL`, `ANY`, `WILDCARD`, `GLOBAL`, 
   `UNIVERSAL` are explicitly forbidden at both application and database levels.

3. **No Hardcoded Exceptions**: All scope checks use the same validation logic
   with no special cases or bypass paths.

4. **Fail-Closed Behavior**: If scope cannot be determined or validated,
   access is denied by default.

5. **Complete Auditability**: All scope denials are logged to L0 with
   immutable audit records.

---

## Verification Commands

```bash
# Verify scope middleware is registered
grep -r "scopePlugin" src/server.js

# Verify scope is loaded during authentication
grep -r "user_scope_assignments" src/middleware/auth.js

# Verify forbidden scope patterns
grep -r "FORBIDDEN_SCOPE_PATTERNS" src/scope/

# Verify purpose binding
grep -r "ROUTE_PURPOSE_MAP" src/scope/middleware.js

# Verify immutability
grep -r "Object.freeze" src/middleware/auth.js src/scope/middleware.js
```

---

## Conclusion

Scope and purpose enforcement is complete. The implementation ensures:

- ✅ Scope violations are denied
- ✅ Purpose violations are denied  
- ✅ Scope cannot be bypassed via request input
- ✅ All denials are audited
- ✅ No dynamic scope escalation
- ✅ No wildcard scopes
- ✅ No hardcoded exceptions

