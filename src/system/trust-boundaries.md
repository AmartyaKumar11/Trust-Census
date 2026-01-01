# Trust-Boundary Declaration
## Trust-First Caste Census Management System

**Status**: IMMUTABLE SYSTEM CONTRACT  
**Version**: 1.0  
**Effective Date**: System Inception  
**Authority**: This document defines non-negotiable system invariants

---

## Preamble

This declaration establishes the trust boundaries, data flow constraints, and access control invariants for the Trust-First Caste Census Management System. These boundaries are architectural constants that must be enforced at all layers of the system.

**Fundamental Principle**: The system is designed with privacy by architecture, not privacy by policy. Trust boundaries are enforced by system design, not by operational procedures.

---

## System Actors

The system recognizes five distinct actor types. Each actor has fixed, immutable permissions that cannot be escalated, combined, or bypassed.

### 1. Citizen

**Definition**: The individual whose census data is being collected.

**Allowed Actions**:
- Provide consent for data collection
- Revoke consent (with audit trail)
- View their own consent status
- Request audit log of actions taken on their data (anonymized)

**Forbidden Actions**:
- Access any census data (their own or others')
- Modify submitted census data
- Access aggregate statistics
- Access audit logs of other actors
- Submit census data directly (must be done by Enumerator)
- View raw submissions
- Export any data

**Trust Boundary**: Citizen data is collected with explicit consent. Citizens have no access to the data collection or analysis systems.

---

### 2. Enumerator

**Definition**: Field data collection personnel authorized to submit census data.

**Allowed Actions**:
- Submit census data for assigned geographic areas
- View submission confirmation (ID and integrity hash only)
- Verify submission integrity (hash verification)
- View their own submission history (metadata only, no raw data)

**Forbidden Actions**:
- Retrieve raw census data after submission
- Access aggregate statistics
- Access audit logs (except their own submission confirmations)
- Modify submitted data
- Submit data for unassigned geographic areas
- Export or download data
- Access consent records
- View data submitted by other enumerators
- Compute aggregates
- Access macro-level statistics

**Trust Boundary**: Enumerators operate in a write-only mode for raw data. Once submitted, data becomes inaccessible to enumerators in raw form.

---

### 3. Supervisor

**Definition**: Administrative personnel responsible for data quality and process oversight.

**Allowed Actions**:
- View audit logs (all actions, filtered by scope)
- View submission metadata (counts, timestamps, geographic codes)
- Verify data integrity (hash verification only)
- View consent status (aggregate counts, not individual records)
- Monitor system health and performance metrics
- View error logs and system alerts

**Forbidden Actions**:
- Access raw census data (L1 layer)
- Access micro-aggregates (L2 layer)
- Access macro-aggregates (L3 layer)
- Modify submitted data
- Submit census data
- Compute aggregates
- Export data
- Access individual consent records (only aggregate counts)
- Bypass audit logging
- Modify audit logs

**Trust Boundary**: Supervisors have read-only access to audit and metadata layers. They cannot access actual census data or aggregates.

---

### 4. StateAnalyst

**Definition**: Authorized personnel who compute and access statistical aggregates for state-level analysis.

**Allowed Actions**:
- Compute micro-aggregates (L2) for assigned geographic areas
- Compute macro-aggregates (L3) for state-level analysis
- Access pre-computed aggregates (L2 and L3)
- View aggregate computation history
- Verify aggregate integrity (computation hashes)

**Forbidden Actions**:
- Access raw census data (L1 layer)
- Access consent records (L0 layer)
- Access audit logs (except aggregate computation confirmations)
- Reverse-engineer raw data from aggregates
- Export raw data
- Modify submitted data
- Submit census data
- Access aggregates for unassigned geographic areas
- Bypass threshold protection on micro-aggregates
- Remove privacy noise from macro-aggregates

**Trust Boundary**: StateAnalysts operate on aggregated data only. The system mathematically prevents reverse engineering of raw data from aggregates.

---

### 5. CentralPolicyViewer

**Definition**: Authorized personnel at central/national level who access high-level policy statistics.

**Allowed Actions**:
- Access macro-aggregates (L3) at national/state level
- View aggregate computation metadata
- Verify aggregate integrity (computation hashes)
- Access policy-level statistics (privacy-noised)

**Forbidden Actions**:
- Access raw census data (L1 layer)
- Access micro-aggregates (L2 layer)
- Access consent records (L0 layer)
- Access audit logs
- Compute aggregates
- Submit census data
- Reverse-engineer raw data from aggregates
- Remove privacy noise from macro-aggregates
- Access state-level aggregates below national threshold
- Export raw data

**Trust Boundary**: CentralPolicyViewers have read-only access to the highest level of aggregation (L3) with privacy noise. They cannot access any lower layers.

---

## Data Layers

The system organizes data into four distinct layers with strict access controls and data flow rules.

### L0: Consent Records and Audit Logs

**Contents**:
- Citizen consent records (consent status, timestamps, revocation records)
- Complete audit trail (all system actions, immutable)
- System metadata (health, performance, errors)

**Characteristics**:
- Immutable (append-only)
- Complete audit trail
- No raw census data
- No aggregate data

**Data Flow Rules**:
- WRITE: System (automatic logging), Citizens (consent operations)
- READ: Supervisors (audit logs), Citizens (own consent status)
- NEVER: Enumerators, StateAnalysts, CentralPolicyViewers

---

### L1: Raw Census Submissions

**Contents**:
- Individual census submissions (geographic codes, household count, population count, caste category)
- Submission metadata (timestamp, enumerator ID, integrity hash)
- No personal identifiers (no Aadhaar, phone, biometrics, names, addresses)

**Characteristics**:
- One-way write (submission only)
- No retrieval after submission
- Encrypted/anonymized at storage
- Integrity-protected (SHA-256 hashes)

**Data Flow Rules**:
- WRITE: Enumerators (submission only)
- READ: NONE (no actor may read raw data after submission)
- NEVER: All actors (raw data is inaccessible after submission)

**Critical Invariant**: Once data enters L1, it becomes permanently inaccessible in raw form. Only aggregate computation can access L1 data, and only for computation purposes (not retrieval).

---

### L2: Micro-Aggregates (Threshold-Protected)

**Contents**:
- Aggregated statistics at block/village level
- Threshold-protected (suppressed if below privacy threshold)
- Computation metadata (timestamp, analyst ID, integrity hash)

**Characteristics**:
- Computed from L1 (irreversible)
- Threshold-protected (k-anonymity or differential privacy)
- Geographic scope: block/village level
- Cannot reverse to L1

**Data Flow Rules**:
- WRITE: StateAnalysts (computation only)
- READ: StateAnalysts (for assigned geographic areas)
- NEVER: Enumerators, Supervisors, CentralPolicyViewers, Citizens

**Critical Invariant**: L2 aggregates cannot be used to infer individual records. Threshold protection ensures privacy.

---

### L3: Macro-Aggregates (State/National, Privacy-Noised)

**Contents**:
- Aggregated statistics at district/state/national level
- Privacy-noised (differential privacy or similar)
- Computation metadata (timestamp, analyst ID, integrity hash)

**Characteristics**:
- Computed from L2 or L1 (irreversible)
- Privacy noise added (cannot be removed)
- Geographic scope: district/state/national level
- Cannot reverse to L2 or L1

**Data Flow Rules**:
- WRITE: StateAnalysts (computation only)
- READ: StateAnalysts (for assigned geographic areas), CentralPolicyViewers (national/state level)
- NEVER: Enumerators, Supervisors, Citizens

**Critical Invariant**: L3 aggregates have privacy noise that cannot be removed. Reverse engineering to lower layers is mathematically impossible.

---

## Interaction Rules

### Write Permissions Matrix

| Actor | L0 (Consent/Audit) | L1 (Raw Submissions) | L2 (Micro-Aggregates) | L3 (Macro-Aggregates) |
|-------|---------------------|----------------------|----------------------|----------------------|
| Citizen | Consent operations | ❌ NEVER | ❌ NEVER | ❌ NEVER |
| Enumerator | ❌ NEVER | ✅ Submit only | ❌ NEVER | ❌ NEVER |
| Supervisor | ❌ NEVER | ❌ NEVER | ❌ NEVER | ❌ NEVER |
| StateAnalyst | ❌ NEVER | ❌ NEVER | ✅ Compute only | ✅ Compute only |
| CentralPolicyViewer | ❌ NEVER | ❌ NEVER | ❌ NEVER | ❌ NEVER |

### Read Permissions Matrix

| Actor | L0 (Consent/Audit) | L1 (Raw Submissions) | L2 (Micro-Aggregates) | L3 (Macro-Aggregates) |
|-------|---------------------|----------------------|----------------------|----------------------|
| Citizen | Own consent status | ❌ NEVER | ❌ NEVER | ❌ NEVER |
| Enumerator | Submission confirmations | ❌ NEVER | ❌ NEVER | ❌ NEVER |
| Supervisor | Audit logs, metadata | ❌ NEVER | ❌ NEVER | ❌ NEVER |
| StateAnalyst | Computation confirmations | ❌ NEVER | ✅ Assigned areas | ✅ Assigned areas |
| CentralPolicyViewer | ❌ NEVER | ❌ NEVER | ❌ NEVER | ✅ National/state level |

### Never-Interact Rules

**Citizen**:
- Must NEVER interact with L1, L2, L3
- Must NEVER access other citizens' consent records

**Enumerator**:
- Must NEVER read L1 after submission (write-only)
- Must NEVER interact with L0, L2, L3
- Must NEVER access other enumerators' submissions

**Supervisor**:
- Must NEVER interact with L1, L2, L3
- Must NEVER access individual consent records (only aggregates)

**StateAnalyst**:
- Must NEVER interact with L0, L1
- Must NEVER access aggregates for unassigned areas
- Must NEVER reverse-engineer L1 from L2/L3

**CentralPolicyViewer**:
- Must NEVER interact with L0, L1, L2
- Must NEVER access state-level aggregates below national threshold
- Must NEVER remove privacy noise from L3

---

## Global Invariants

These invariants apply across all actors, layers, and operations. They are non-negotiable and must be enforced at all system layers.

### I1: No Super-Admin Role
**Statement**: No actor type, role, or permission set grants access to all layers or all operations.

**Enforcement**: 
- Database constraints prevent super-admin role creation
- Application code explicitly rejects super-admin
- No single credential grants multi-layer access

**Rationale**: Prevents single point of failure and abuse.

---

### I2: No Reverse Data Flow
**Statement**: Data flows unidirectionally: L1 → L2 → L3. Reverse flow (L3 → L2 → L1) is mathematically impossible.

**Enforcement**:
- Aggregation functions are one-way (sums cannot be decomposed)
- No retrieval endpoints for L1 after submission
- L2 and L3 computations are stored separately from L1

**Rationale**: Prevents inference of individual records from aggregates.

---

### I3: Aggregation is Irreversible
**Statement**: Once data is aggregated (L1 → L2 or L2 → L3), the original data cannot be recovered.

**Enforcement**:
- Aggregation uses mathematical operations that are not invertible
- Privacy noise in L3 cannot be removed
- Threshold protection in L2 prevents small-group inference

**Rationale**: Ensures privacy protection even if aggregates are compromised.

---

### I4: Raw Data is Never Exposed After Submission
**Statement**: Once data enters L1, it is never returned in raw form to any actor.

**Enforcement**:
- No read endpoints for L1 after submission
- Only aggregate computation can access L1 (for computation, not retrieval)
- Submission confirmations return only ID and hash

**Rationale**: Prevents data misuse and ensures one-way data flow.

---

### I5: Access is Scope-Bound
**Statement**: All actor access is limited to assigned geographic or functional scope.

**Enforcement**:
- Enumerators can only submit for assigned areas
- StateAnalysts can only compute/access aggregates for assigned areas
- CentralPolicyViewers can only access national/state level (not district/block)

**Rationale**: Prevents unauthorized access and ensures accountability.

---

### I6: Access is Purpose-Bound
**Statement**: All actor access is limited to operations necessary for their role.

**Enforcement**:
- Enumerators: submission only (no analysis)
- StateAnalysts: aggregate computation only (no raw data)
- Supervisors: oversight only (no data access)
- CentralPolicyViewers: policy statistics only (no operational data)

**Rationale**: Principle of least privilege, prevents function creep.

---

### I7: Complete Auditability
**Statement**: All system actions are logged immutably in L0, regardless of actor or operation.

**Enforcement**:
- Audit logging cannot be bypassed
- Audit logs are append-only (immutable)
- All actors' actions are logged (including system operations)

**Rationale**: Ensures accountability and legal defensibility.

---

### I8: No Personal Identifiers
**Statement**: The system never stores, processes, or exposes personal identifiers (Aadhaar, phone, biometrics, names, addresses).

**Enforcement**:
- Input validation explicitly rejects personal identifiers
- Database schema prohibits personal identifier columns
- All data is anonymized at submission

**Rationale**: Privacy by design - cannot leak what is not stored.

---

### I9: No Data Export
**Statement**: No actor can export, download, or bulk-retrieve data from any layer.

**Enforcement**:
- No export endpoints exist
- No bulk retrieval APIs
- No download functionality

**Rationale**: Prevents bulk data extraction and unauthorized data sharing.

---

### I10: No Inferred Classification
**Statement**: Caste categories are explicit only. No algorithmic inference or prediction of caste is permitted.

**Enforcement**:
- Only explicit categories accepted (SC, ST, OBC, GENERAL, OTHER)
- No ML models for classification
- No predictive algorithms

**Rationale**: Prevents algorithmic bias and discrimination.

---

## Scope and Purpose Limitations

### Geographic Scope
- Enumerators: Assigned block/village codes only
- StateAnalysts: Assigned state/district codes only
- CentralPolicyViewers: National/state level only (no district/block)

### Temporal Scope
- All access is logged with timestamps
- Historical data access follows same rules as current data
- No actor can access future-dated data

### Functional Scope
- Each actor type has fixed, immutable permissions
- No role escalation or permission combination
- No temporary privilege elevation

---

## Trust Boundary Enforcement

### Architectural Enforcement
Trust boundaries are enforced at multiple architectural layers:

1. **Database Layer**: Schema constraints, CHECK constraints, no super-admin role type
2. **Application Layer**: Role-based access control, input validation, one-way data flow
3. **API Layer**: Endpoint-level permissions, no raw data retrieval endpoints
4. **Audit Layer**: Immutable logging, independent of operations

### Mathematical Enforcement
- Aggregation functions are mathematically one-way (sums cannot be decomposed)
- Privacy noise cannot be removed (differential privacy)
- Threshold protection prevents small-group inference

### Operational Enforcement
- All actions require authentication
- All actions are audited
- All data access is scope-bound and purpose-bound

---

## Enforcement Philosophy

This section explains how these trust boundaries will be enforced in system implementation, without prescribing specific implementation details.

### Multi-Layer Defense

Trust boundaries are enforced at multiple system layers to ensure defense in depth:

1. **Database Schema Layer**: 
   - Schema constraints enforce data structure (no personal identifiers, no super-admin role)
   - CHECK constraints prevent invalid data states
   - Foreign key constraints ensure referential integrity
   - Row-level security (if implemented) enforces scope boundaries

2. **Application Logic Layer**:
   - Role-based access control (RBAC) enforces actor permissions
   - Input validation prevents invalid data entry
   - Business logic enforces one-way data flow
   - Explicit checks prevent super-admin role creation

3. **API Endpoint Layer**:
   - Endpoint-level authentication and authorization
   - No endpoints exist for forbidden operations (e.g., raw data retrieval)
   - Response filtering ensures only permitted data is returned
   - Rate limiting prevents abuse

4. **Audit Layer**:
   - Independent audit system logs all actions
   - Audit logs are immutable (append-only)
   - Audit system cannot be bypassed

### Mathematical Guarantees

Certain trust boundaries are enforced through mathematical properties:

- **Irreversible Aggregation**: Aggregation functions (sum, count) are mathematically one-way. Given an aggregate, it is impossible to determine the individual values that contributed to it.
- **Privacy Noise**: Differential privacy or similar techniques add mathematical noise that cannot be removed, preventing reverse engineering.
- **Threshold Protection**: k-anonymity or similar techniques ensure that aggregates below a threshold are suppressed, preventing small-group inference.

### Code-Level Enforcement

Implementation will enforce trust boundaries through:

1. **Explicit Checks**: Code explicitly checks actor permissions before allowing operations
2. **Type Safety**: Type systems (if used) prevent invalid data structures
3. **Validation Layers**: Multiple validation layers ensure data integrity
4. **Error Handling**: Errors in trust boundary enforcement fail securely (deny by default)

### Operational Enforcement

Operational procedures support trust boundary enforcement:

1. **Credential Management**: Separate credentials for each actor type, no shared credentials
2. **Access Reviews**: Periodic review of actor access and permissions
3. **Audit Monitoring**: Regular review of audit logs for boundary violations
4. **Incident Response**: Procedures for handling trust boundary violations

### Testing and Verification

Trust boundaries will be verified through:

1. **Unit Tests**: Test that forbidden operations are rejected
2. **Integration Tests**: Test that data flow is one-way
3. **Security Tests**: Test that boundaries cannot be bypassed
4. **Mathematical Verification**: Verify that aggregation is irreversible
5. **Audit Verification**: Verify that all actions are logged

### Evolution and Maintenance

While this declaration is immutable, system evolution must:

1. **Preserve Invariants**: Any system changes must preserve all declared invariants
2. **Explicit Approval**: Changes that might affect trust boundaries require explicit approval
3. **Documentation**: All changes must be documented with impact analysis on trust boundaries
4. **Testing**: All changes must be tested for trust boundary compliance

### Failure Modes

The system is designed to fail securely:

1. **Default Deny**: If trust boundary enforcement fails, access is denied by default
2. **Audit on Failure**: All trust boundary violations are logged
3. **Alert on Violation**: Trust boundary violations trigger alerts
4. **No Silent Failures**: Trust boundary enforcement failures are never silent

---

## Conclusion

This trust-boundary declaration establishes the non-negotiable constraints for the Trust-First Caste Census Management System. These boundaries are architectural constants that ensure privacy by design, prevent misuse, and maintain system integrity.

**All system implementation must conform to these boundaries. No exception, no bypass, no compromise.**

---

**Document Status**: IMMUTABLE  
**Last Updated**: System Inception  
**Authority**: System Architecture  
**Enforcement**: Multi-layer (Database, Application, API, Audit)

