# Consent Implementation Verification

## Phase 3.1: Consent as First-Class Legal Artifact

This document verifies that consent is correctly implemented as an immutable legal artifact
in the Trust-First Caste Census Management System.

---

## Verification Checklist

### ✅ 1. Submissions Cannot Occur Without Consent

| Verification Point | Status | Implementation |
|-------------------|--------|----------------|
| Submission requires `consentReceiptId` | ✅ | `routes/submissions.js` - required field |
| Consent existence verified before submission | ✅ | `verifyConsentExists()` called first |
| Submission fails if consent not found | ✅ | Returns 400 with `CONSENT_REQUIRED` |
| Consent link created atomically with submission | ✅ | Transaction in submission handler |
| No bypass mechanism exists | ✅ | No alternative submission endpoint |

**Test Cases:**
- Submission without `consentReceiptId` → REJECTED (400)
- Submission with invalid `consentReceiptId` → REJECTED (400, CONSENT_NOT_FOUND)
- Submission with valid `consentReceiptId` → ACCEPTED (201)
- Submission transaction rollback on link failure → Both submission and link fail

---

### ✅ 2. Consent is Stored Independently of Raw Census Data

| Verification Point | Status | Implementation |
|-------------------|--------|----------------|
| Consent records in separate table | ✅ | `consent_records` table (L0) |
| No caste data in consent records | ✅ | Schema has no caste columns |
| No personal identifiers in consent | ✅ | No Aadhaar, phone, name, address columns |
| Link via `receipt_id` only | ✅ | `submission_consent_links` uses receipt_id |
| No foreign key to personal identity | ✅ | Only receipt_id reference |

**Schema Verification:**

```sql
-- consent_records contains:
- consent_id (UUID)
- receipt_id (UUID, non-identifying)
- consent_text_version (enum)
- consent_timestamp (server-generated)
- consent_given_by_role (CITIZEN/ENUMERATOR)
- geographic_scope_* (state, district, block, village)
- recorded_by_enumerator_id (if applicable)
- consent_hash (integrity)

-- consent_records does NOT contain:
- ❌ caste_category
- ❌ household_count
- ❌ population_count
- ❌ aadhaar
- ❌ phone
- ❌ name
- ❌ address
- ❌ biometrics
```

---

### ✅ 3. Consent Records Are Immutable and Auditable

| Verification Point | Status | Implementation |
|-------------------|--------|----------------|
| UPDATE trigger prevents modification | ✅ | `trigger_prevent_consent_update` |
| DELETE trigger prevents deletion | ✅ | `trigger_prevent_consent_delete` |
| `is_immutable` constraint always true | ✅ | CHECK constraint |
| Consent capture logged to audit | ✅ | `logAuditEvent()` in routes |
| Audit does NOT log consent content | ✅ | Only operation type logged |

**Database Triggers:**

```sql
-- Prevent UPDATE
CREATE TRIGGER trigger_prevent_consent_update
    BEFORE UPDATE ON consent_records
    EXECUTE FUNCTION prevent_consent_modification();

-- Prevent DELETE  
CREATE TRIGGER trigger_prevent_consent_delete
    BEFORE DELETE ON consent_records
    EXECUTE FUNCTION prevent_consent_deletion();
```

**Audit Log Content:**

```javascript
// What IS logged:
{
  operation: 'CONSENT_CAPTURED',
  givenByRole: 'CITIZEN' | 'ENUMERATOR',
  receiptIdGenerated: true,
  geographicScope: { state, district, block }
}

// What is NOT logged:
// - Consent text content
// - Personal identifiers
// - Caste data
```

---

### ✅ 4. Consent Can Be Proven Without Exposing Caste Information

| Verification Point | Status | Implementation |
|-------------------|--------|----------------|
| Receipt ID is non-identifying | ✅ | UUID with no personal data |
| Consent verification returns minimal data | ✅ | Only `exists: true/false` |
| Consent status shows aggregate counts | ✅ | `consent_status_aggregates` view |
| No endpoint returns caste data with consent | ✅ | Consent routes don't access L1 |
| Consent hash verifies integrity | ✅ | SHA-256 hash stored |

**Proof Flow:**

```
1. Citizen provides consent → receives receipt_id
2. Enumerator submits data with receipt_id
3. System verifies consent exists (receipt_id lookup)
4. Submission linked to consent via receipt_id
5. Auditor can verify:
   - Consent exists (receipt_id)
   - Consent timestamp
   - Consent geographic scope
   - Consent given by role
   - Consent hash (integrity)
6. Auditor CANNOT see:
   - Caste category (not in consent)
   - Personal identity (not stored)
   - Submission content (separate L1 layer)
```

---

## Implementation Details

### Consent Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONSENT CAPTURE FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Citizen/Enumerator → POST /consent/capture                  │
│     - Consent text version                                       │
│     - Geographic scope                                           │
│     - NO caste data, NO personal identifiers                    │
│                                                                  │
│  2. System creates consent record (L0)                          │
│     - Generates receipt_id (non-identifying)                    │
│     - Generates consent_hash (integrity)                        │
│     - Records timestamp (server-generated)                      │
│     - Triggers prevent UPDATE/DELETE                            │
│                                                                  │
│  3. System returns receipt_id                                   │
│     - Used in subsequent submission                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     SUBMISSION FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Enumerator → POST /submissions                              │
│     - Census data (caste, household, population)                │
│     - consent_receipt_id (REQUIRED)                             │
│                                                                  │
│  2. System verifies consent exists                              │
│     - Looks up receipt_id in consent_records                    │
│     - If not found → REJECT submission                          │
│                                                                  │
│  3. System creates submission (L1) + link atomically            │
│     - BEGIN TRANSACTION                                          │
│     - INSERT submission                                          │
│     - INSERT submission_consent_link                            │
│     - COMMIT (or ROLLBACK on failure)                           │
│                                                                  │
│  4. Submission contains caste data                              │
│     Consent record contains NO caste data                       │
│     Link is via receipt_id ONLY                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Layer Separation

```
┌─────────────────────────────────────────────────────────────────┐
│                         L0 (Consent/Audit)                       │
├─────────────────────────────────────────────────────────────────┤
│  consent_records                                                 │
│  ├─ consent_id                                                   │
│  ├─ receipt_id ←──────────────────────┐                         │
│  ├─ consent_text_version              │                         │
│  ├─ consent_timestamp                 │                         │
│  ├─ consent_given_by_role             │                         │
│  ├─ geographic_scope_*                │                         │
│  └─ consent_hash                      │                         │
│                                       │                         │
│  submission_consent_links             │                         │
│  ├─ submission_id ─────────────────┐  │                         │
│  └─ consent_receipt_id ────────────┼──┘                         │
│                                    │                            │
└────────────────────────────────────┼────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────┐
│                         L1 (Raw Submissions)                     │
├────────────────────────────────────┼────────────────────────────┤
│  census_submissions                │                            │
│  ├─ id ←───────────────────────────┘                            │
│  ├─ state_code                                                   │
│  ├─ district_code                                                │
│  ├─ block_code                                                   │
│  ├─ village_code                                                 │
│  ├─ household_count                                              │
│  ├─ population_count                                             │
│  ├─ caste_category  ← ONLY HERE, NOT IN CONSENT                 │
│  ├─ submitted_by                                                 │
│  └─ submission_hash                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Security Properties

| Property | Enforcement |
|----------|-------------|
| Consent required for submission | `verifyConsentExists()` before INSERT |
| Consent immutable | Database triggers prevent UPDATE/DELETE |
| No caste data in consent | Schema has no caste columns |
| No personal identifiers | Schema has no PII columns |
| Non-identifying link | Only receipt_id connects consent to submission |
| Audit without content exposure | Logs operation type, not content |
| Atomic consent-submission link | Database transaction |

---

## Cross-Reference

### Trust Boundaries (src/system/trust-boundaries.md)

| Requirement | Implementation |
|-------------|----------------|
| Consent in L0 | `consent_records` table, separate from L1 |
| Consent before submission | `verifyConsentExists()` check |
| Consent immutable | Database triggers |
| No personal identifiers | Schema constraints |

### API Surface (src/system/api-surface.md)

| Endpoint | Purpose | Implementation |
|----------|---------|----------------|
| `POST /citizen/consent` | Citizen provides consent | ✅ Implemented |
| `GET /citizen/consent` | View own consent status | ✅ Implemented |
| `POST /consent/capture` | Capture consent (any role) | ✅ Implemented |
| `GET /consent/verify/:receiptId` | Verify consent exists | ✅ Implemented |
| `GET /consent/status` | Supervisor aggregate view | ✅ Implemented |

---

## Verification Commands

```bash
# Verify consent table has no caste columns
grep -i "caste" src/db/migrations/004_consent_model.sql
# Expected: No matches in consent_records table definition

# Verify immutability triggers exist
grep -i "trigger_prevent_consent" src/db/migrations/004_consent_model.sql
# Expected: trigger_prevent_consent_update, trigger_prevent_consent_delete

# Verify submission requires consent
grep -i "consentReceiptId" src/routes/submissions.js
# Expected: Required field in schema

# Verify consent verification before submission
grep -i "verifyConsentExists" src/routes/submissions.js
# Expected: Called before INSERT

# Verify audit doesn't log consent content
grep -i "consent_text" src/routes/consent.js
# Expected: No matches in logAuditEvent calls
```

---

## Conclusion

Consent is implemented as a first-class, immutable legal artifact. The implementation ensures:

- ✅ Submissions cannot occur without consent
- ✅ Consent is stored independently of raw census data
- ✅ Consent records are immutable and auditable
- ✅ Consent can be proven without exposing caste information
- ✅ No caste data in consent records
- ✅ No personal identifiers in consent records
- ✅ Link via receipt_id only (non-identifying)
- ✅ Database-level immutability enforcement
- ✅ Atomic consent-submission linking
- ✅ Audit logging without content exposure

