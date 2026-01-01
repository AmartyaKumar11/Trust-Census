# API Surface Declaration
## Trust-First Caste Census Management System

**Status**: FROZEN INTERFACE CONTRACT  
**Version**: 1.0  
**Effective Date**: System Inception  
**Authority**: This document defines the complete, immutable API surface

---

## Preamble

This declaration establishes the complete API surface for the Trust-First Caste Census Management System. All endpoints are grouped by actor type and explicitly declare their purpose, data layer access, and constraints.

**Fundamental Principle**: The API surface is frozen. No endpoint may be added, removed, or modified in a way that violates trust boundaries or data flow constraints.

**Mapping Note**: Current implementation uses role names (DATA_ENTRY, AUDITOR, ANALYST). These map to actors as follows:
- `DATA_ENTRY` → `Enumerator`
- `AUDITOR` → `Supervisor`
- `ANALYST` → `StateAnalyst`
- `CentralPolicyViewer` → (to be implemented)
- `Citizen` → (to be implemented)

---

## Common Endpoints

These endpoints are available to all authenticated actors for system operations.

### Authentication Endpoints

| Method | Path | Purpose | Data Layer | Actor |
|--------|------|---------|------------|-------|
| POST | `/auth/login` | Authenticate user and receive JWT token | L0 (audit) | All authenticated actors |
| GET | `/auth/verify` | Verify JWT token validity | L0 (audit) | All authenticated actors |

**Note**: User registration (`POST /auth/register`) is a bootstrap operation and should not be exposed in production. It is documented here for completeness but must be restricted to secure bootstrap processes only.

---

## Citizen Endpoints

**Actor**: Citizen  
**Definition**: The individual whose census data is being collected.

### Consent Management

| Method | Path | Purpose | Data Layer | Constraints |
|--------|------|---------|------------|-------------|
| POST | `/citizen/consent` | Provide consent for data collection | L0 (write) | Own consent only |
| DELETE | `/citizen/consent` | Revoke consent (with audit trail) | L0 (write) | Own consent only |
| GET | `/citizen/consent` | View own consent status | L0 (read) | Own consent only |

### Audit Access

| Method | Path | Purpose | Data Layer | Constraints |
|--------|------|---------|------------|-------------|
| GET | `/citizen/audit` | Request audit log of actions taken on own data (anonymized) | L0 (read) | Own data only, anonymized |

**Forbidden for Citizen**:
- ❌ Any endpoint that accesses L1, L2, or L3
- ❌ Any endpoint that accesses other citizens' data
- ❌ Any endpoint that exports data
- ❌ Any endpoint that submits census data directly

---

## Enumerator Endpoints

**Actor**: Enumerator  
**Definition**: Field data collection personnel authorized to submit census data.  
**Current Role**: `DATA_ENTRY`

### Data Submission

| Method | Path | Purpose | Data Layer | Constraints |
|--------|------|---------|------------|-------------|
| POST | `/submissions` | Submit census data for assigned geographic areas | L1 (write) | Assigned areas only, one-way write |
| GET | `/submissions/:id/verify` | Verify submission integrity (hash only, no raw data) | L1 (metadata read) | Own submissions or supervisor oversight |

### Submission History

| Method | Path | Purpose | Data Layer | Constraints |
|--------|------|---------|------------|-------------|
| GET | `/submissions/history` | View own submission history (metadata only, no raw data) | L1 (metadata read) | Own submissions only, metadata only |

**Forbidden for Enumerator**:
- ❌ `GET /submissions/:id` (raw data retrieval)
- ❌ `GET /submissions` (bulk retrieval)
- ❌ Any endpoint that accesses L0 (audit logs), L2, or L3
- ❌ Any endpoint that exports or downloads data
- ❌ Any endpoint that computes aggregates
- ❌ Any endpoint that accesses other enumerators' submissions

---

## Supervisor Endpoints

**Actor**: Supervisor  
**Definition**: Administrative personnel responsible for data quality and process oversight.  
**Current Role**: `AUDITOR`

### Audit Log Access

| Method | Path | Purpose | Data Layer | Constraints |
|--------|------|---------|------------|-------------|
| GET | `/audit/logs` | View audit logs (all actions, filtered by scope) | L0 (read) | Filtered by scope, paginated |
| GET | `/audit/logs/:id` | Get specific audit log entry | L0 (read) | Single entry only |

### Submission Metadata

| Method | Path | Purpose | Data Layer | Constraints |
|--------|------|---------|------------|-------------|
| GET | `/submissions/metadata` | View submission metadata (counts, timestamps, geographic codes) | L1 (metadata read) | Metadata only, no raw data |
| GET | `/submissions/:id/verify` | Verify data integrity (hash verification only) | L1 (metadata read) | Hash and metadata only |

### Consent Status

| Method | Path | Purpose | Data Layer | Constraints |
|--------|------|---------|------------|-------------|
| GET | `/consent/status` | View consent status (aggregate counts, not individual records) | L0 (read) | Aggregate counts only |

### System Monitoring

| Method | Path | Purpose | Data Layer | Constraints |
|--------|------|---------|------------|-------------|
| GET | `/system/health` | Monitor system health and performance metrics | L0 (read) | System metrics only |
| GET | `/system/alerts` | View error logs and system alerts | L0 (read) | Error logs only |

**Forbidden for Supervisor**:
- ❌ Any endpoint that accesses raw census data (L1 raw read)
- ❌ Any endpoint that accesses L2 or L3
- ❌ Any endpoint that modifies submitted data
- ❌ Any endpoint that submits census data
- ❌ Any endpoint that computes aggregates
- ❌ Any endpoint that exports data
- ❌ Any endpoint that accesses individual consent records (only aggregates)

---

## StateAnalyst Endpoints

**Actor**: StateAnalyst  
**Definition**: Authorized personnel who compute and access statistical aggregates for state-level analysis.  
**Current Role**: `ANALYST`

### Aggregate Computation

| Method | Path | Purpose | Data Layer | Constraints |
|--------|------|---------|------------|-------------|
| POST | `/aggregates/compute` | Compute micro-aggregates (L2) for assigned geographic areas | L1→L2 (compute) | Assigned areas only, threshold-protected |
| POST | `/aggregates/compute/macro` | Compute macro-aggregates (L3) for state-level analysis | L2→L3 (compute) | State level, privacy-noised |

### Aggregate Access

| Method | Path | Purpose | Data Layer | Constraints |
|--------|------|---------|------------|-------------|
| GET | `/aggregates/:id` | Access pre-computed aggregate (L2 or L3) | L2/L3 (read) | Assigned areas only |
| GET | `/aggregates` | List pre-computed aggregates with filters | L2/L3 (read) | Assigned areas only, filtered |

### Computation History

| Method | Path | Purpose | Data Layer | Constraints |
|--------|------|---------|------------|-------------|
| GET | `/aggregates/history` | View aggregate computation history | L2/L3 (metadata read) | Own computations only |

### Integrity Verification

| Method | Path | Purpose | Data Layer | Constraints |
|--------|------|---------|------------|-------------|
| GET | `/aggregates/:id/verify` | Verify aggregate integrity (computation hashes) | L2/L3 (metadata read) | Hash verification only |

**Forbidden for StateAnalyst**:
- ❌ Any endpoint that accesses raw census data (L1 read)
- ❌ Any endpoint that accesses L0 (consent records, audit logs except computation confirmations)
- ❌ Any endpoint that exports raw data
- ❌ Any endpoint that modifies submitted data
- ❌ Any endpoint that submits census data
- ❌ Any endpoint that accesses aggregates for unassigned areas
- ❌ Any endpoint that bypasses threshold protection on L2
- ❌ Any endpoint that removes privacy noise from L3

---

## CentralPolicyViewer Endpoints

**Actor**: CentralPolicyViewer  
**Definition**: Authorized personnel at central/national level who access high-level policy statistics.  
**Current Role**: (to be implemented)

### Macro-Aggregate Access

| Method | Path | Purpose | Data Layer | Constraints |
|--------|------|---------|------------|-------------|
| GET | `/policy/aggregates` | Access macro-aggregates (L3) at national/state level | L3 (read) | National/state level only, privacy-noised |
| GET | `/policy/aggregates/:id` | Get specific macro-aggregate computation | L3 (read) | National/state level only |

### Computation Metadata

| Method | Path | Purpose | Data Layer | Constraints |
|--------|------|---------|------------|-------------|
| GET | `/policy/computations` | View aggregate computation metadata | L3 (metadata read) | National/state level only |

### Integrity Verification

| Method | Path | Purpose | Data Layer | Constraints |
|--------|------|---------|------------|-------------|
| GET | `/policy/aggregates/:id/verify` | Verify aggregate integrity (computation hashes) | L3 (metadata read) | Hash verification only |

**Forbidden for CentralPolicyViewer**:
- ❌ Any endpoint that accesses raw census data (L1)
- ❌ Any endpoint that accesses micro-aggregates (L2)
- ❌ Any endpoint that accesses consent records (L0)
- ❌ Any endpoint that accesses audit logs
- ❌ Any endpoint that computes aggregates
- ❌ Any endpoint that submits census data
- ❌ Any endpoint that accesses state-level aggregates below national threshold
- ❌ Any endpoint that removes privacy noise from L3
- ❌ Any endpoint that exports raw data

---

## System Endpoints

These endpoints are available without authentication for system health monitoring.

| Method | Path | Purpose | Data Layer | Constraints |
|--------|------|---------|------------|-------------|
| GET | `/health` | Health check (no auth required, no data exposure) | None | System status only, no data |

---

## Explicitly Forbidden Endpoints

The following endpoint patterns are **structurally unsafe** and must **NEVER** exist in the system:

### Raw Data Retrieval

- ❌ `GET /submissions` - Bulk retrieval of raw submissions
- ❌ `GET /submissions/:id` - Individual raw submission retrieval
- ❌ `GET /submissions/export` - Export raw submissions
- ❌ `GET /submissions/download` - Download raw submissions
- ❌ `GET /data/raw` - Any raw data access endpoint
- ❌ `GET /census/raw` - Any raw census data endpoint

**Rationale**: Violates I4 (Raw Data Never Exposed After Submission). Once data enters L1, it must never be returned in raw form.

### Data Export

- ❌ `GET /submissions/export`
- ❌ `GET /aggregates/export`
- ❌ `GET /audit/export`
- ❌ `POST /export/*` - Any export endpoint
- ❌ `GET /*/download` - Any download endpoint
- ❌ `GET /*/bulk` - Any bulk retrieval endpoint

**Rationale**: Violates I9 (No Data Export). No actor can export, download, or bulk-retrieve data from any layer.

### Reverse Data Flow

- ❌ `POST /aggregates/decompose` - Decompose aggregates to raw data
- ❌ `POST /aggregates/reverse` - Reverse aggregate computation
- ❌ `GET /aggregates/:id/raw` - Get raw data from aggregate
- ❌ `POST /aggregates/denoise` - Remove privacy noise from L3

**Rationale**: Violates I2 (No Reverse Data Flow) and I3 (Aggregation is Irreversible). Data flows unidirectionally L1→L2→L3.

### Admin and Override Endpoints

- ❌ `POST /admin/*` - Any admin endpoint
- ❌ `POST /override/*` - Any override endpoint
- ❌ `POST /super-admin/*` - Any super-admin endpoint
- ❌ `POST /bypass/*` - Any bypass endpoint
- ❌ `PUT /users/:id/role` - Role modification
- ❌ `POST /users/:id/elevate` - Privilege elevation
- ❌ `DELETE /audit/logs` - Audit log deletion
- ❌ `PUT /audit/logs/:id` - Audit log modification

**Rationale**: Violates I1 (No Super-Admin Role) and I7 (Complete Auditability). No actor has all permissions, and audit logs are immutable.

### Scope and Purpose Violations

- ❌ `GET /submissions?enumeratorId=*` - Access other enumerators' submissions
- ❌ `GET /aggregates?geographicCode=*` - Access unassigned geographic areas
- ❌ `GET /aggregates?level=district` - CentralPolicyViewer accessing below national threshold
- ❌ `GET /consent/:citizenId` - Access individual consent records (Supervisor)
- ❌ `GET /audit/logs?userId=*` - Enumerator accessing full audit logs

**Rationale**: Violates I5 (Access is Scope-Bound) and I6 (Access is Purpose-Bound). All access must be limited to assigned scope and purpose.

### Personal Identifier Endpoints

- ❌ `POST /submissions?includeAadhaar=true` - Accept Aadhaar
- ❌ `GET /submissions?phone=*` - Search by phone
- ❌ `POST /submissions?includeBiometrics=true` - Accept biometrics
- ❌ `GET /citizens/search` - Search by personal identifiers

**Rationale**: Violates I8 (No Personal Identifiers). The system never stores, processes, or exposes personal identifiers.

### Inference and Prediction

- ❌ `POST /caste/infer` - Infer caste category
- ❌ `POST /caste/predict` - Predict caste category
- ❌ `POST /classification/*` - Any classification endpoint
- ❌ `POST /ml/*` - Any machine learning endpoint

**Rationale**: Violates I10 (No Inferred Classification). Caste categories are explicit only.

### Aggregation Triggers

- ❌ `POST /aggregates/trigger` - Trigger aggregation (StateAnalyst should compute, not trigger)
- ❌ `POST /aggregates/auto-compute` - Automatic aggregation
- ❌ `GET /aggregates/compute-async` - Async aggregation trigger

**Rationale**: Aggregation must be explicit and controlled by StateAnalyst. No automatic or triggered aggregation.

### Debug and Development

- ❌ `GET /debug/*` - Any debug endpoint
- ❌ `GET /dev/*` - Any development endpoint
- ❌ `GET /test/*` - Any test endpoint (in production)
- ❌ `GET /internal/*` - Any internal endpoint

**Rationale**: Debug endpoints may expose data or bypass security. No debug endpoints should exist in production.

---

## Endpoint Summary by Data Layer

### L0 (Consent Records and Audit Logs)

**Write**:
- `POST /citizen/consent` (Citizen)
- `DELETE /citizen/consent` (Citizen)
- System automatic logging (all endpoints)

**Read**:
- `GET /citizen/consent` (Citizen - own only)
- `GET /citizen/audit` (Citizen - own data, anonymized)
- `GET /audit/logs` (Supervisor)
- `GET /audit/logs/:id` (Supervisor)
- `GET /consent/status` (Supervisor - aggregates only)

### L1 (Raw Census Submissions)

**Write**:
- `POST /submissions` (Enumerator - one-way only)

**Read**:
- ❌ **NONE** - No actor may read raw data after submission

**Metadata Read**:
- `GET /submissions/:id/verify` (Enumerator, Supervisor - hash and metadata only)
- `GET /submissions/history` (Enumerator - own submissions, metadata only)
- `GET /submissions/metadata` (Supervisor - metadata only)

### L2 (Micro-Aggregates)

**Write**:
- `POST /aggregates/compute` (StateAnalyst - computation only)

**Read**:
- `GET /aggregates/:id` (StateAnalyst - assigned areas only)
- `GET /aggregates` (StateAnalyst - assigned areas only)
- `GET /aggregates/history` (StateAnalyst - own computations)

### L3 (Macro-Aggregates)

**Write**:
- `POST /aggregates/compute/macro` (StateAnalyst - computation only)

**Read**:
- `GET /aggregates/:id` (StateAnalyst - assigned areas, CentralPolicyViewer - national/state)
- `GET /aggregates` (StateAnalyst - assigned areas)
- `GET /policy/aggregates` (CentralPolicyViewer - national/state level only)
- `GET /policy/aggregates/:id` (CentralPolicyViewer - national/state level only)

---

## API Non-Goals and Forbidden Patterns

This section explains why certain endpoint patterns are structurally unsafe and must never exist.

### 1. Raw Data Retrieval Endpoints

**Pattern**: `GET /submissions/:id` or `GET /submissions`

**Why Forbidden**:
- Violates **I4: Raw Data Never Exposed After Submission**
- Once data enters L1, it becomes permanently inaccessible in raw form
- Allowing raw data retrieval would enable data misuse and violate one-way data flow
- Even with authentication, raw data must never be returned

**Structural Safety**: The system enforces this by not implementing such endpoints. If they existed, they would create a security vulnerability regardless of authentication or authorization.

---

### 2. Data Export Endpoints

**Pattern**: `GET /*/export`, `GET /*/download`, `GET /*/bulk`

**Why Forbidden**:
- Violates **I9: No Data Export**
- Bulk data extraction enables unauthorized data sharing
- Export functionality creates a single point of failure for data leakage
- Even with proper authorization, bulk exports violate privacy by design

**Structural Safety**: Export endpoints are structurally unsafe because they enable bulk data extraction, which cannot be safely controlled even with proper authentication and authorization.

---

### 3. Reverse Data Flow Endpoints

**Pattern**: `POST /aggregates/decompose`, `POST /aggregates/reverse`, `POST /aggregates/denoise`

**Why Forbidden**:
- Violates **I2: No Reverse Data Flow** and **I3: Aggregation is Irreversible**
- Mathematically impossible to safely reverse aggregation
- Attempts to reverse would either fail (if properly implemented) or create security vulnerabilities
- Privacy noise in L3 cannot be removed without compromising privacy

**Structural Safety**: These endpoints are structurally unsafe because they attempt to reverse mathematically one-way operations. Even if implemented, they would either fail or create vulnerabilities.

---

### 4. Admin and Override Endpoints

**Pattern**: `POST /admin/*`, `POST /override/*`, `PUT /users/:id/role`, `DELETE /audit/logs`

**Why Forbidden**:
- Violates **I1: No Super-Admin Role** and **I7: Complete Auditability**
- Creates single points of failure and abuse
- Allows privilege escalation and role modification
- Enables audit log tampering, destroying accountability

**Structural Safety**: Admin endpoints are structurally unsafe because they create bypass mechanisms that undermine the entire trust-first architecture. Even with proper authentication, they violate separation of powers.

---

### 5. Scope and Purpose Violation Endpoints

**Pattern**: `GET /submissions?enumeratorId=*`, `GET /aggregates?geographicCode=*` (unassigned)

**Why Forbidden**:
- Violates **I5: Access is Scope-Bound** and **I6: Access is Purpose-Bound**
- Enables unauthorized access to data outside assigned scope
- Allows function creep (actors performing operations outside their purpose)
- Creates accountability gaps

**Structural Safety**: These endpoints are structurally unsafe because they enable access beyond assigned scope. Even with proper filtering, the endpoint pattern itself creates a vulnerability.

---

### 6. Personal Identifier Endpoints

**Pattern**: `POST /submissions?includeAadhaar=true`, `GET /submissions?phone=*`

**Why Forbidden**:
- Violates **I8: No Personal Identifiers**
- Enables storage and processing of personal identifiers
- Creates privacy violations by design
- Cannot be safely controlled even with proper validation

**Structural Safety**: These endpoints are structurally unsafe because they enable personal identifier storage, which violates privacy by design. The system cannot safely handle personal identifiers even with proper validation.

---

### 7. Inference and Prediction Endpoints

**Pattern**: `POST /caste/infer`, `POST /caste/predict`, `POST /ml/*`

**Why Forbidden**:
- Violates **I10: No Inferred Classification**
- Enables algorithmic bias and discrimination
- Creates potential for misclassification
- Cannot be safely controlled even with proper validation

**Structural Safety**: These endpoints are structurally unsafe because they enable algorithmic inference, which violates the explicit-only principle. Even with proper validation, inference creates bias risks.

---

### 8. Aggregation Trigger Endpoints

**Pattern**: `POST /aggregates/trigger`, `POST /aggregates/auto-compute`

**Why Forbidden**:
- Violates **I6: Access is Purpose-Bound**
- Enables automatic or uncontrolled aggregation
- Creates potential for unauthorized aggregation
- Removes explicit control from StateAnalyst

**Structural Safety**: These endpoints are structurally unsafe because they enable uncontrolled aggregation. Aggregation must be explicit and controlled by StateAnalyst, not triggered automatically.

---

### 9. Debug and Development Endpoints

**Pattern**: `GET /debug/*`, `GET /dev/*`, `GET /test/*`

**Why Forbidden**:
- May expose data or bypass security
- Create vulnerabilities in production
- Enable unauthorized access through debug features
- Violate production security principles

**Structural Safety**: Debug endpoints are structurally unsafe because they may expose data or bypass security controls. Even in development, they create risks if accidentally deployed to production.

---

## Cross-Reference with Trust Boundaries

This API surface is designed to enforce all invariants declared in `src/system/trust-boundaries.md`:

| Invariant | API Enforcement |
|-----------|----------------|
| I1: No Super-Admin | No admin/override endpoints exist |
| I2: No Reverse Data Flow | No reverse/decompose endpoints exist |
| I3: Aggregation is Irreversible | No denoise/reverse endpoints exist |
| I4: Raw Data Never Exposed | No raw data retrieval endpoints exist |
| I5: Access is Scope-Bound | All endpoints enforce geographic/functional scope |
| I6: Access is Purpose-Bound | Endpoints are role-specific and purpose-limited |
| I7: Complete Auditability | All endpoints are automatically audited |
| I8: No Personal Identifiers | No endpoints accept or return personal identifiers |
| I9: No Data Export | No export/download endpoints exist |
| I10: No Inferred Classification | No inference/prediction endpoints exist |

---

## Implementation Status

### Currently Implemented

- ✅ Authentication endpoints (`/auth/login`, `/auth/verify`)
- ✅ Enumerator submission endpoints (`/submissions`, `/submissions/:id/verify`)
- ✅ Supervisor audit endpoints (`/audit/logs`, `/audit/logs/:id`)
- ✅ StateAnalyst aggregate endpoints (`/aggregates/compute`, `/aggregates/:id`)
- ✅ System health endpoint (`/health`)

### To Be Implemented

- ⏳ Citizen consent endpoints (`/citizen/consent`, `/citizen/audit`)
- ⏳ Enumerator submission history (`/submissions/history`)
- ⏳ Supervisor metadata endpoints (`/submissions/metadata`, `/consent/status`, `/system/health`, `/system/alerts`)
- ⏳ StateAnalyst macro-aggregate computation (`/aggregates/compute/macro`)
- ⏳ StateAnalyst aggregate listing (`/aggregates`)
- ⏳ StateAnalyst computation history (`/aggregates/history`)
- ⏳ CentralPolicyViewer endpoints (`/policy/aggregates/*`)

### Bootstrap Only (Not Production API)

- ⚠️ `POST /auth/register` - User registration (bootstrap only, must be restricted)

---

## Conclusion

This API surface declaration establishes the complete, frozen interface for the Trust-First Caste Census Management System. All endpoints are designed to enforce trust boundaries and data flow constraints.

**No endpoint may be added, removed, or modified in a way that violates these constraints. No exception, no bypass, no compromise.**

---

**Document Status**: FROZEN  
**Last Updated**: System Inception  
**Authority**: System Architecture  
**Enforcement**: API Layer (Endpoint-level permissions, no forbidden endpoints)

