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
at block and village level.

### Execution Rules
- **Trigger**: Scheduled cron job or manual admin task (NOT user-triggered)
- **Frequency**: Daily or as configured by system administrator
- **Time Window**: Processes submissions from a fixed, closed time window
- **Idempotency**: Each time window is processed exactly once

### Safety Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Minimum group size (k-anonymity) | k ≥ 5 | Prevents individual identification |
| Minimum submissions per aggregate | 5 | Statistical validity |
| Geographic suppression | Village < 5 submissions → suppress | Privacy protection |
| Caste category suppression | Category < 5 in area → suppress | Minority protection |

### Output
- `micro_aggregates` table entries
- Computation metadata (timestamp, hash)
- Suppression flags for small groups

### Invariants
- ❌ Cannot be triggered via HTTP
- ❌ Cannot accept user parameters
- ❌ Cannot output individual records
- ✅ Must suppress groups below threshold
- ✅ Must be append-only (no updates)

---

## Stage B: L2 → L3 (Macro-Aggregation)

### Purpose
Transform micro-aggregates into privacy-noised macro-aggregates
at district, state, and national level.

### Execution Rules
- **Trigger**: Scheduled cron job or manual admin task (NOT user-triggered)
- **Frequency**: Weekly or as configured by system administrator
- **Dependency**: Runs after Stage A completion
- **Time Window**: Processes L2 aggregates from a fixed time window

### Safety Constraints

| Constraint | Value | Rationale |
|------------|-------|-----------|
| Differential privacy epsilon | ε ≤ 1.0 | Strong privacy guarantee |
| Noise mechanism | Laplace or Gaussian | Standard DP mechanism |
| Minimum L2 inputs | 10 micro-aggregates | Statistical validity |
| Geographic threshold | State < 10 districts → noise increased | Privacy protection |

### Output
- `macro_aggregates` table entries
- Computation metadata (timestamp, hash, epsilon)
- Noise parameters (cannot be reversed)

### Invariants
- ❌ Cannot be triggered via HTTP
- ❌ Cannot accept user parameters
- ❌ Cannot remove or reduce noise
- ❌ Cannot access L1 directly
- ✅ Must add irreversible privacy noise
- ✅ Must be append-only (no updates)

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

## NOT Implemented Yet

The following components are placeholders and will be implemented in a future phase:

1. **Aggregation SQL queries** - Stage A and Stage B computation logic
2. **Threshold enforcement** - K-anonymity suppression
3. **Privacy noise** - Differential privacy implementation
4. **Scheduling** - Cron job configuration
5. **Monitoring** - Aggregation job status tracking

---

## Conclusion

The offline aggregation pipeline architecture ensures:

- ✅ Aggregation cannot be triggered via API
- ✅ Aggregation runs only offline (separate worker process)
- ✅ Aggregation pipeline is one-way and irreversible
- ✅ Privacy thresholds protect small groups
- ✅ Privacy noise prevents reverse engineering
- ✅ Database role separation enforces access control

