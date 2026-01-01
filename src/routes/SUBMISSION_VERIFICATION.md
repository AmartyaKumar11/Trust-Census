# Submission Write-Only Verification

## Phase 3.2: Irreversible Write-Only Semantics for L1

This document verifies that raw census submissions (L1) behave as an irreversible data sink,
not a queryable dataset.

---

## Verification Checklist

### ✅ 1. Raw Submissions Cannot Be Read via API

| Verification Point | Status | Implementation |
|-------------------|--------|----------------|
| No `GET /submissions` endpoint | ✅ | Not implemented |
| No `GET /submissions/:id` endpoint | ✅ | Not implemented |
| No `GET /submissions/:id/verify` with data | ✅ | Removed (was reading L1) |
| No `GET /submissions/export` endpoint | ✅ | Not implemented |
| No `GET /submissions/download` endpoint | ✅ | Not implemented |
| No `GET /submissions/search` endpoint | ✅ | Not implemented |
| Receipt verification returns NO data | ✅ | Only exists/timestamp/consentLinked |
| Metadata endpoint returns aggregates only | ✅ | Counts only, no records |

**Explicitly Forbidden Endpoints:**

```
❌ GET /submissions - Bulk retrieval
❌ GET /submissions/:id - Individual retrieval
❌ PUT /submissions/:id - Update
❌ PATCH /submissions/:id - Partial update
❌ DELETE /submissions/:id - Delete
❌ GET /submissions/:id/verify - Verify by reading stored data
❌ GET /submissions/history - History with data
❌ GET /submissions/export - Export
❌ GET /submissions/download - Download
❌ GET /submissions/search - Search
❌ GET /submissions/filter - Filter
```

---

### ✅ 2. Submissions Are Irreversible Once Written

| Verification Point | Status | Implementation |
|-------------------|--------|----------------|
| Database triggers prevent UPDATE | ✅ | `trigger_prevent_submission_update` |
| Database triggers prevent DELETE | ✅ | `trigger_prevent_submission_delete` |
| No UPDATE endpoint exists | ✅ | Not implemented |
| No DELETE endpoint exists | ✅ | Not implemented |
| Transaction ensures atomic write | ✅ | BEGIN/COMMIT/ROLLBACK |
| Consent link is also immutable | ✅ | Triggers on `submission_consent_links` |

**Database Enforcement:**

```sql
-- Prevent UPDATE
CREATE TRIGGER trigger_prevent_submission_update
    BEFORE UPDATE ON census_submissions
    EXECUTE FUNCTION prevent_submission_modification();

-- Prevent DELETE
CREATE TRIGGER trigger_prevent_submission_delete
    BEFORE DELETE ON census_submissions
    EXECUTE FUNCTION prevent_submission_modification();
```

---

### ✅ 3. Receipt_id Is the Only Post-Submission Reference

| Verification Point | Status | Implementation |
|-------------------|--------|----------------|
| POST response returns `receiptId` | ✅ | `created.id` as `receiptId` |
| POST response returns `timestamp` | ✅ | `created.submitted_at` |
| POST response returns `consentReceiptId` | ✅ | Proves consent existed |
| POST response does NOT return census data | ✅ | No caste, household, population |
| POST response does NOT return geographic codes | ✅ | No state, district, block |
| POST response does NOT return submission hash | ✅ | Hash stored but not returned |
| Receipt verification returns existence only | ✅ | `exists`, `timestamp`, `consentLinked` |

**Response Schema:**

```javascript
// POST /submissions response (201)
{
  receiptId: "uuid",           // ✅ Returned
  timestamp: "ISO timestamp",  // ✅ Returned
  consentReceiptId: "uuid",    // ✅ Returned
  message: "string"            // ✅ Returned
  
  // NOT RETURNED:
  // ❌ stateCode
  // ❌ districtCode
  // ❌ blockCode
  // ❌ villageCode
  // ❌ householdCount
  // ❌ populationCount
  // ❌ casteCategory
  // ❌ submissionHash
}

// GET /submissions/receipt/:receiptId response (200)
{
  exists: true,                // ✅ Returned
  timestamp: "ISO timestamp",  // ✅ Returned
  consentLinked: true          // ✅ Returned
  
  // NOT RETURNED:
  // ❌ Any census data
  // ❌ Any geographic codes
  // ❌ Any submission content
}
```

---

## Implementation Details

### Write-Only Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    WRITE-ONLY SUBMISSION FLOW                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Enumerator → POST /submissions                              │
│     - Census data (caste, household, population)                │
│     - Geographic codes (state, district, block)                 │
│     - consent_receipt_id (REQUIRED)                             │
│                                                                  │
│  2. System verifies consent exists                              │
│     - Looks up receipt_id in consent_records                    │
│     - If not found → REJECT submission                          │
│                                                                  │
│  3. System validates no personal data                           │
│     - Checks for PII patterns                                   │
│     - If found → REJECT submission                              │
│                                                                  │
│  4. System writes to L1 (IRREVERSIBLE)                         │
│     - BEGIN TRANSACTION                                          │
│     - INSERT census_submissions                                  │
│     - INSERT submission_consent_links                           │
│     - COMMIT                                                     │
│                                                                  │
│  5. System returns RECEIPT ONLY                                 │
│     - receiptId (submission ID)                                 │
│     - timestamp (server-generated)                              │
│     - consentReceiptId (proves consent)                         │
│     - NO census data echoed                                     │
│     - NO geographic codes returned                              │
│                                                                  │
│  6. DATA IS NOW IRREVERSIBLE                                    │
│     - Cannot be read via API                                    │
│     - Cannot be updated                                         │
│     - Cannot be deleted                                         │
│     - Only aggregation_worker can read (for L2/L3 computation)  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Audit Logging (Without Raw Content)

```javascript
// What IS logged:
{
  actionCategory: 'SUBMISSION',
  outcome: 'ALLOWED' | 'DENIED' | 'ERROR',
  statusCode: 201 | 400 | 500,
  metadata: {
    submissionRecorded: true,
    consentVerified: true,
    // NO census data
    // NO geographic codes
  }
}

// What is NOT logged:
// ❌ casteCategory
// ❌ householdCount
// ❌ populationCount
// ❌ stateCode
// ❌ districtCode
// ❌ blockCode
// ❌ villageCode
// ❌ submissionHash
// ❌ Any raw submission content
```

### Database Role Enforcement

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE ROLE PERMISSIONS                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  api_writer:                                                     │
│  ├─ INSERT on census_submissions ✅                             │
│  ├─ SELECT on census_submissions ❌ (DENIED)                    │
│  └─ UPDATE/DELETE on census_submissions ❌ (DENIED by trigger)  │
│                                                                  │
│  audit_writer:                                                   │
│  └─ NO access to census_submissions                             │
│                                                                  │
│  aggregation_worker:                                             │
│  ├─ SELECT on census_submissions ✅ (for L2/L3 computation)     │
│  └─ UPDATE/DELETE on census_submissions ❌ (DENIED by trigger)  │
│                                                                  │
│  analytics_reader:                                               │
│  └─ NO access to census_submissions                             │
│                                                                  │
│  supervisor_reader:                                              │
│  └─ NO access to census_submissions                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cross-Reference

### Trust Boundaries (src/system/trust-boundaries.md)

| Invariant | Implementation |
|-----------|----------------|
| I4: Raw Data Never Exposed After Submission | No read endpoints for L1 |
| I2: No Reverse Data Flow | Data flows L1→L2→L3 only |
| I3: Aggregation is Irreversible | L1 is write-only sink |
| One-way write for Enumerator | POST only, no GET/PUT/DELETE |

### API Surface (src/system/api-surface.md)

| Endpoint | Status | Notes |
|----------|--------|-------|
| `POST /submissions` | ✅ Implemented | Write-only |
| `GET /submissions/:id/verify` | ❌ Removed | Was reading L1 data |
| `GET /submissions/receipt/:receiptId` | ✅ New | Existence check only |
| `GET /submissions/metadata` | ✅ Implemented | Aggregates only |
| `GET /submissions` | ❌ Forbidden | Bulk retrieval |
| `GET /submissions/:id` | ❌ Forbidden | Individual retrieval |

---

## Security Properties

| Property | Enforcement |
|----------|-------------|
| Write-only semantics | No GET endpoints for raw data |
| Irreversible writes | Database triggers prevent UPDATE/DELETE |
| Receipt-based confirmation | Only receiptId returned |
| No data echo | Response contains no census data |
| No audit content leakage | Raw data not logged |
| Consent required | verifyConsentExists() before write |
| Atomic transactions | BEGIN/COMMIT/ROLLBACK |

---

## Verification Commands

```bash
# Verify no GET endpoints return raw data
grep -E "GET.*submissions.*id" src/routes/submissions.js
# Expected: Only receipt verification (no data)

# Verify response does not include census data
grep -E "casteCategory|householdCount|populationCount" src/routes/submissions.js
# Expected: Only in INSERT query, not in response

# Verify audit does not log raw content
grep -E "caste|household|population" src/routes/submissions.js
# Expected: Not in logAuditEvent metadata

# Verify database triggers exist
grep -i "trigger_prevent_submission" src/db/migrations/002_database_roles.sql
# Expected: UPDATE and DELETE triggers

# Verify api_writer has no SELECT on submissions
grep -i "GRANT SELECT ON census_submissions TO api_writer" src/db/migrations/
# Expected: No matches
```

---

## Conclusion

Raw census submissions (L1) now behave as an irreversible data sink:

- ✅ Raw submissions cannot be read via API
- ✅ Submissions are irreversible once written
- ✅ Receipt_id is the only post-submission reference
- ✅ No census data echoed in responses
- ✅ No raw content logged to audit
- ✅ Database triggers prevent modification
- ✅ Consent required before write
- ✅ Atomic consent-submission linkage

