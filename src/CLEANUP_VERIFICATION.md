# Cleanup Verification

## Phase 3.3: Removal of Unsafe Provisional Logic

This document verifies that all unsafe provisional logic related to raw data access
and aggregation triggers has been removed or neutralized.

---

## Verification Checklist

### ✅ 1. No Code Path Reads from L1 (census_submissions)

| File | Status | Action Taken |
|------|--------|--------------|
| `routes/aggregates.js` | ✅ Neutralized | Replaced with 403 Forbidden for compute routes |
| `routes/submissions.js` | ✅ Clean | Only INSERT, no SELECT |
| `db/connections.js` | ✅ Updated | Verification queries are permission tests, expected to fail |
| `consent/service.js` | ✅ Clean | No census_submissions access |
| `audit/logger.js` | ✅ Clean | No census_submissions access |

**Verification Command:**
```bash
grep -r "SELECT.*FROM.*census_submissions" src --include="*.js"
# Expected: Only in connections.js (permission verification tests)
```

---

### ✅ 2. No HTTP Route Triggers Aggregation

| Endpoint | Previous Behavior | Current Behavior |
|----------|-------------------|------------------|
| `POST /aggregates/compute` | Executed SELECT on L1 | Returns 403 Forbidden |
| `POST /aggregates/compute/macro` | Executed SELECT on L1 | Returns 403 Forbidden |
| `GET /aggregates/:id` | N/A | Returns 501 Not Implemented |
| `GET /aggregates` | N/A | Returns 501 Not Implemented |

**Neutralized Routes:**
```javascript
// POST /aggregates/compute - FORBIDDEN
// Returns 403 with message: "Aggregation via HTTP is not permitted"

// POST /aggregates/compute/macro - FORBIDDEN
// Returns 403 with message: "Aggregation via HTTP is not permitted"
```

**Future Implementation Notes:**
- Aggregation will be implemented as offline batch jobs
- Jobs will run on a separate worker service
- Jobs will use the `aggregation_worker` database role
- StateAnalyst can READ pre-computed aggregates from L2/L3

---

### ✅ 3. No Placeholder Logic Violates Trust Invariants

| Component | Status | Notes |
|-----------|--------|-------|
| `aggregateComputationSchema` | ✅ Deprecated | Retained for future offline workers only |
| `aggregateRoutes` | ✅ Neutralized | Returns 403/501, no L1 access |
| `verifyRolePermissions` | ✅ Updated | Tests are permission checks, expected to fail |
| Bootstrap script | ✅ Clean | No L1 access |

---

## Changes Made

### 1. `src/routes/aggregates.js`

**Before:** Executed SELECT queries on census_submissions via HTTP
**After:** Returns 403 Forbidden for compute routes, 501 Not Implemented for read routes

```javascript
// FORBIDDEN - Returns 403
POST /aggregates/compute
POST /aggregates/compute/macro

// NOT IMPLEMENTED - Returns 501 (future: read from L2/L3)
GET /aggregates/:id
GET /aggregates
GET /aggregates/:id/verify
```

### 2. `src/scope/middleware.js`

**Before:** Mapped aggregate compute routes to AGGREGATE_COMPUTE purpose
**After:** Removed compute route mappings, only read routes remain

```javascript
// REMOVED:
// 'POST:/aggregates/compute': PurposeCategory.AGGREGATE_COMPUTE,
// 'POST:/aggregates/compute/macro': PurposeCategory.AGGREGATE_COMPUTE,

// RETAINED (for future L2/L3 read):
'GET:/aggregates': PurposeCategory.AGGREGATE_READ,
'GET:/aggregates/:id': PurposeCategory.AGGREGATE_READ,
'GET:/aggregates/:id/verify': PurposeCategory.AGGREGATE_READ,
```

### 3. `src/middleware/validation.js`

**Before:** `aggregateComputationSchema` used by HTTP routes
**After:** Schema retained but marked as deprecated for HTTP use

```javascript
/**
 * @deprecated for HTTP use - aggregation via HTTP is forbidden
 */
export const aggregateComputationSchema = z.object({...});
```

### 4. `src/db/connections.js`

**Before:** Verification queries could be misunderstood as legitimate L1 access
**After:** Clarified that queries are permission tests expected to FAIL

```javascript
// EXPECTED: api_writer.canReadSubmissions = false (GOOD - L1 is write-only)
// EXPECTED: analytics_reader.canReadSubmissions = false (GOOD - no L1 access)
```

---

## Trust Invariant Compliance

| Invariant | Status | Enforcement |
|-----------|--------|-------------|
| I4: Raw Data Never Exposed | ✅ | No SELECT on L1 via HTTP |
| I2: No Reverse Data Flow | ✅ | Aggregation forbidden via HTTP |
| I3: Aggregation is Irreversible | ✅ | No HTTP-triggered aggregation |
| L1 Write-Only | ✅ | Only INSERT, no SELECT |

---

## Cross-Reference

### Trust Boundaries (src/system/trust-boundaries.md)

- ✅ L1 is write-only (no raw data retrieval)
- ✅ Aggregation is not triggered via HTTP
- ✅ StateAnalyst cannot access L1 via API

### API Surface (src/system/api-surface.md)

- ✅ `POST /aggregates/compute` - Forbidden (was listed as permitted, now blocked)
- ✅ `GET /submissions/:id` - Not implemented (correctly)
- ✅ No raw data retrieval endpoints exist

### Phase 3.2 (Submission Write-Only)

- ✅ Submissions are write-only
- ✅ No endpoint returns census data
- ✅ Receipt-based confirmation only

---

## Verification Commands

```bash
# Verify no SELECT on census_submissions in route handlers
grep -r "SELECT.*census_submissions" src/routes --include="*.js"
# Expected: No matches

# Verify aggregate compute routes return 403
grep -A5 "'/aggregates/compute'" src/routes/aggregates.js
# Expected: Returns AGGREGATION_FORBIDDEN_RESPONSE

# Verify no L1 access in consent service
grep -r "census_submissions" src/consent --include="*.js"
# Expected: No matches

# Verify no L1 access in audit logger
grep -r "census_submissions" src/audit --include="*.js"
# Expected: No matches
```

---

## Conclusion

All unsafe provisional logic has been removed or neutralized:

- ✅ No code path reads from L1 (census_submissions) via HTTP
- ✅ No HTTP route triggers aggregation
- ✅ No placeholder logic violates trust invariants
- ✅ Aggregate compute routes return 403 Forbidden
- ✅ Aggregate read routes return 501 Not Implemented
- ✅ Schema marked as deprecated for HTTP use
- ✅ Verification tests clarified as permission checks

