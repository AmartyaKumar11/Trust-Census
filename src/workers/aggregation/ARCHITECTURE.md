# Offline Aggregation Pipeline Architecture

## Trust-First Caste Census Management System

**Status**: ARCHITECTURAL SPECIFICATION  
**Version**: 1.0  
**Authority**: This document defines the one-way, offline aggregation pipeline

---

## Overview

The aggregation pipeline transforms raw census submissions (L1) into privacy-protected
aggregates (L2, L3) through a strictly offline, one-way process that cannot be
triggered or influenced by users.

### Key Principles

1. **Offline Execution**: Aggregation runs outside the HTTP request lifecycle
2. **One-Way Flow**: Data flows L1 → L2 → L3, never in reverse
3. **No User Trigger**: Aggregation cannot be invoked via API routes
4. **No User Input**: Aggregation accepts no dynamic parameters
5. **Append-Only**: Aggregation results are immutable once written
6. **Separation of Powers**: Uses `aggregation_worker` database role exclusively

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OFFLINE AGGREGATION PIPELINE                          │
│                     (Runs outside HTTP request lifecycle)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐                                                             │
│  │     L1      │  Raw Census Submissions                                     │
│  │  (Write-    │  - Unreadable via API                                       │
│  │   Only)     │  - Contains individual records                              │
│  └──────┬──────┘                                                             │
│         │                                                                    │
│         │  STAGE A: Micro-Aggregation                                        │
│         │  - Scheduled batch job (cron/manual)                               │
│         │  - Uses aggregation_worker role                                    │
│         │  - Applies k-anonymity thresholds                                  │
│         │  - Suppresses small groups                                         │
│         ▼                                                                    │
│  ┌─────────────┐                                                             │
│  │     L2      │  Micro-Aggregates (Block/Village)                           │
│  │  (Threshold │  - Threshold-protected                                      │
│  │  Protected) │  - Cannot reverse to L1                                     │
│  └──────┬──────┘                                                             │
│         │                                                                    │
│         │  STAGE B: Macro-Aggregation                                        │
│         │  - Scheduled batch job (cron/manual)                               │
│         │  - Uses aggregation_worker role                                    │
│         │  - Applies differential privacy noise                              │
│         │  - Noise cannot be removed                                         │
│         ▼                                                                    │
│  ┌─────────────┐                                                             │
│  │     L3      │  Macro-Aggregates (District/State/National)                 │
│  │  (Privacy   │  - Privacy-noised                                           │
│  │   Noised)   │  - Cannot reverse to L2 or L1                               │
│  └─────────────┘                                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage A: L1 → L2 (Micro-Aggregation)

### Purpose
Transform raw census submissions into threshold-protected micro-aggregates
at district and state level ONLY.

**IMPORTANT**: Village and block level aggregation is FORBIDDEN to prevent
identification of small communities. Only district level and above is permitted.

### Execution Rules
- **Trigger**: Scheduled cron job or manual admin task (NOT user-triggered)
- **Frequency**: Daily or as configured by system administrator
- **Time Window**: Processes submissions from a fixed, closed time window
- **Idempotency**: Each time window is processed exactly once

### Geographic Level Constraints

| Level | Permitted | Rationale |
|-------|-----------|-----------|
| District | ✅ YES | Sufficient population for anonymity |
| State | ✅ YES | Large population ensures privacy |
| Block | ❌ FORBIDDEN | Too granular, risks identification |
| Village | ❌ FORBIDDEN | Too granular, risks identification |
| Household | ❌ FORBIDDEN | Individual-level, strictly forbidden |

### Safety Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Minimum group size (k-anonymity) | k ≥ 5 | Prevents individual identification |
| Minimum submissions per aggregate | 5 | Statistical validity |
| Groups below k | DROPPED entirely | No masking, rounding, or partial emission |
| Dropped group logging | FORBIDDEN | Cannot log details of dropped groups |

### Output
- `micro_aggregates` table entries (district and state level only)
- Computation metadata (timestamp, hash, aggregation_window_id)
- NO suppressed groups are written (they are dropped entirely)

### L2 Table Fields
| Field | Description |
|-------|-------------|
| geographic_level | 'district' or 'state' only |
| geographic_code | District or state code |
| caste_category | SC, ST, OBC, GENERAL, OTHER |
| submission_count | Number of submissions in group |
| population_count | Total population in group |
| aggregation_window_id | Identifies the time window |
| created_at | Timestamp of aggregate creation |

### Invariants
- ❌ Cannot be triggered via HTTP
- ❌ Cannot accept user parameters
- ❌ Cannot output individual records
- ❌ Cannot aggregate at village, block, or household level
- ❌ Cannot mask, round, or partially emit suppressed groups
- ❌ Cannot log dropped group details or raw census values
- ✅ Must DROP groups below k-anonymity threshold entirely
- ✅ Must be append-only (INSERT only, no UPDATE or DELETE)
- ✅ Must have no foreign keys or identifiers linking back to L1

---

## Stage B: L2 → L3 (Macro-Aggregation)

### Purpose
Transform micro-aggregates into privacy-noised macro-aggregates
at state and national level ONLY.

**IMPORTANT**: District level is handled in L2 (micro-aggregates).
L3 contains only state and national level for policy use.

### Execution Rules
- **Trigger**: Scheduled cron job or manual admin task (NOT user-triggered)
- **Frequency**: Weekly or as configured by system administrator
- **Dependency**: Runs after Stage A completion
- **Time Window**: Processes L2 aggregates from a fixed time window

### Geographic Level Constraints

| Level | Permitted | Rationale |
|-------|-----------|-----------|
| State | ✅ YES | Policy-level aggregation |
| National | ✅ YES | Highest level aggregation |
| District | ❌ FORBIDDEN | Already in L2 |
| Block | ❌ FORBIDDEN | Too granular for L3 |
| Village | ❌ FORBIDDEN | Too granular for L3 |

### Safety Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Differential privacy epsilon | ε ≤ 1.0 | Strong privacy guarantee |
| Noise mechanism | Laplace | Standard DP mechanism |
| Minimum L2 inputs | 10 micro-aggregates | Statistical validity |
| Noise logging | FORBIDDEN | Cannot log epsilon, noise values |
| Pre-noise values | NEVER stored | Only noised values in L3 |

### Output
- `macro_aggregates` table entries (state and national level only)
- Computation metadata (timestamp, hash, aggregation_window_id)
- Values are NOISED - original values are unrecoverable

### L3 Table Fields
| Field | Description |
|-------|-------------|
| geographic_level | 'state' or 'national' only |
| geographic_code | State code or 'NATIONAL' |
| caste_category | SC, ST, OBC, GENERAL, OTHER |
| noisy_population | Population WITH differential privacy noise |
| noisy_submission_count | Submission count WITH differential privacy noise |
| aggregation_window_id | Identifies the time window |
| created_at | Timestamp of aggregate creation |

### Invariants
- ❌ Cannot be triggered via HTTP
- ❌ Cannot accept user parameters
- ❌ Cannot remove or reduce noise
- ❌ Cannot access L1 directly (only L2)
- ❌ Cannot aggregate at district level (that's L2)
- ❌ Cannot log epsilon, noise values, or distributions
- ❌ Cannot store pre-noise values
- ❌ Cannot emit negative values after noise
- ✅ Must add irreversible Laplace privacy noise
- ✅ Must be append-only (INSERT only, no UPDATE or DELETE)
- ✅ Must have no foreign keys or identifiers linking back to L2 or L1

---

## Execution Architecture

### Worker Process

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGGREGATION WORKER PROCESS                    │
│               (Separate from HTTP server process)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Entry Point: src/workers/aggregation/index.js                  │
│  Execution: node src/workers/aggregation/index.js               │
│  Scheduling: cron, systemd timer, or manual invocation          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Configuration (src/workers/aggregation/config.js)      │    │
│  │  - Time window settings                                  │    │
│  │  - Threshold values                                      │    │
│  │  - Privacy parameters                                    │    │
│  │  - NO user-configurable parameters                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Database Connection                                     │    │
│  │  - Uses aggregation_worker role ONLY                    │    │
│  │  - Can SELECT from census_submissions (L1)              │    │
│  │  - Can INSERT to micro_aggregates (L2)                  │    │
│  │  - Can INSERT to macro_aggregates (L3)                  │    │
│  │  - CANNOT access audit_logs, users, consent_records     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Logging (src/workers/aggregation/logger.js)            │    │
│  │  - Logs aggregation events                              │    │
│  │  - NO raw data in logs                                  │    │
│  │  - NO individual counts in logs                         │    │
│  │  - Only metadata: timestamp, status, duration           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Scheduling

```bash
# Example cron configuration (NOT implemented yet)
# Stage A: Daily at 2 AM
0 2 * * * /usr/bin/node /app/src/workers/aggregation/index.js --stage=micro

# Stage B: Weekly on Sunday at 4 AM
0 4 * * 0 /usr/bin/node /app/src/workers/aggregation/index.js --stage=macro
```

### Execution Modes

| Mode | Description | Trigger |
|------|-------------|---------|
| `micro` | Run Stage A only (L1 → L2) | Cron or manual |
| `macro` | Run Stage B only (L2 → L3) | Cron or manual |
| `full` | Run Stage A then Stage B | Manual only |

---

## Database Role: aggregation_worker

### Permissions

```sql
-- Can SELECT from L1 (for aggregation computation)
GRANT SELECT ON census_submissions TO aggregation_worker;

-- Can INSERT to L2
GRANT INSERT ON micro_aggregates TO aggregation_worker;

-- Can INSERT to L3
GRANT INSERT ON macro_aggregates TO aggregation_worker;

-- CANNOT access L0
-- No access to audit_logs, consent_records, users

-- CANNOT UPDATE or DELETE any table
-- Aggregation is append-only
```

### Separation from API Layer

| Layer | Database Role | L1 Access | L2/L3 Write |
|-------|---------------|-----------|-------------|
| API (HTTP) | api_writer | INSERT only | ❌ NEVER |
| API (HTTP) | analytics_reader | ❌ NEVER | SELECT only |
| Worker (Offline) | aggregation_worker | SELECT | INSERT |

---

## Safety Mechanisms

### 1. No HTTP Trigger

```javascript
// FORBIDDEN: Aggregation via HTTP
// src/routes/aggregates.js returns 403 for compute routes

// CORRECT: Aggregation via offline worker
// src/workers/aggregation/index.js (separate process)
```

### 2. No User Parameters

```javascript
// FORBIDDEN: User-provided parameters
app.post('/aggregates/compute', { body: { geographicCode: '...' } })

// CORRECT: Fixed configuration
const config = {
  timeWindow: 'PREVIOUS_DAY',  // Fixed, not user-provided
  thresholds: { k: 5 },         // Fixed, not user-provided
};
```

### 3. Append-Only Results

```sql
-- Database triggers prevent UPDATE/DELETE on aggregate tables
CREATE TRIGGER prevent_aggregate_modification
    BEFORE UPDATE OR DELETE ON micro_aggregates
    EXECUTE FUNCTION prevent_modification();
```

### 4. Threshold Enforcement

```javascript
// Suppress groups below k-anonymity threshold
if (groupSize < config.thresholds.k) {
  result.suppressed = true;
  result.value = null;  // Do not store actual value
}
```

### 5. Privacy Noise (Stage B)

```javascript
// Add irreversible Laplace noise
const noise = laplace(0, sensitivity / epsilon);
const noisedValue = trueValue + noise;
// Original value cannot be recovered
```

---

## File Structure

```
src/workers/aggregation/
├── index.js              # Worker entry point
├── config.js             # Fixed configuration (no user input)
├── logger.js             # Non-sensitive logging
├── stages/
│   ├── micro.js          # Stage A: L1 → L2 (placeholder)
│   └── macro.js          # Stage B: L2 → L3 (placeholder)
├── privacy/
│   ├── thresholds.js     # K-anonymity enforcement (placeholder)
│   └── noise.js          # Differential privacy (placeholder)
└── ARCHITECTURE.md       # This document
```

---

## Cross-Reference

### Trust Boundaries (src/system/trust-boundaries.md)

| Requirement | Implementation |
|-------------|----------------|
| L2 computed from L1 (irreversible) | Stage A, append-only |
| L3 computed from L2 (irreversible) | Stage B, append-only |
| Threshold protection for L2 | k-anonymity enforcement |
| Privacy noise for L3 | Differential privacy |
| StateAnalyst cannot access L1 | analytics_reader role has no L1 access |

### API Surface (src/system/api-surface.md)

| Requirement | Implementation |
|-------------|----------------|
| No HTTP aggregation trigger | POST /aggregates/compute returns 403 |
| StateAnalyst reads pre-computed aggregates | GET /aggregates/:id reads L2/L3 |
| No reverse data flow | Aggregation is one-way |

### Phase 3 Verification

| Requirement | Implementation |
|-------------|----------------|
| L1 is write-only via API | api_writer cannot SELECT |
| Aggregation not via HTTP | Worker process, not route handler |
| No user parameters | Fixed configuration |

---

## Implementation Status

### Implemented

1. **Stage A: Micro-Aggregation** (`src/workers/aggregation/stages/micro.js`)
   - SQL queries for district and state level aggregation
   - K-anonymity threshold enforcement (DROP, not mask)
   - INSERT-only writes to L2
   - Non-sensitive logging (counts only, no raw data)
   - Aggregation window ID generation

2. **Stage B: Macro-Aggregation** (`src/workers/aggregation/stages/macro.js`)
   - SQL queries for state and national level aggregation
   - Reads from L2 (micro_aggregates) only, never L1
   - Differential privacy via Laplace mechanism (ε ≤ 1.0)
   - Noise applied to population and submission counts
   - INSERT-only writes to L3 with noised values
   - Non-sensitive logging (counts only, no noise values or epsilon)
   - Aggregation window ID generation

3. **Privacy Noise** (`src/workers/aggregation/privacy/noise.js`)
   - Laplace noise generation for differential privacy
   - Gaussian noise generation (alternative mechanism)
   - Privacy parameter validation

### NOT Implemented Yet

The following components are placeholders and will be implemented in a future phase:

1. **Scheduling** - Cron job configuration
2. **Monitoring** - Aggregation job status tracking

---

## Conclusion

The offline aggregation pipeline architecture ensures:

- ✅ Aggregation cannot be triggered via API
- ✅ Aggregation runs only offline (separate worker process)
- ✅ Aggregation pipeline is one-way and irreversible
- ✅ Privacy thresholds protect small groups
- ✅ Privacy noise prevents reverse engineering
- ✅ Database role separation enforces access control

