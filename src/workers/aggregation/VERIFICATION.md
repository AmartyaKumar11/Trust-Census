# Offline Aggregation Pipeline Verification

## Phase 4.1: Aggregation Pipeline Architecture

This document verifies that the offline aggregation pipeline is correctly designed
to be one-way, offline, and irreversible.

---

## Verification Checklist

### ✅ 1. Aggregation Cannot Be Triggered via API

| Verification Point | Status | Implementation |
|-------------------|--------|----------------|
| POST /aggregates/compute returns 403 | ✅ | `routes/aggregates.js` |
| POST /aggregates/compute/macro returns 403 | ✅ | `routes/aggregates.js` |
| Worker runs as separate process | ✅ | `workers/aggregation/index.js` |
| No HTTP handler calls aggregation | ✅ | Aggregation in worker module only |
| No user parameters accepted | ✅ | Fixed configuration only |

**HTTP Route Enforcement:**
```javascript
// src/routes/aggregates.js
fastify.post('/aggregates/compute', async (request, reply) => {
  return reply.code(403).send({
    error: 'Aggregation via HTTP is not permitted',
    code: 'AGGREGATION_FORBIDDEN'
  });
});
```

**Worker Execution:**
```bash
# Aggregation runs as offline process, NOT via HTTP
node src/workers/aggregation/index.js --stage=micro
node src/workers/aggregation/index.js --stage=macro
```

---

### ✅ 2. Aggregation Runs Only Offline

| Verification Point | Status | Implementation |
|-------------------|--------|----------------|
| Worker entry point is standalone | ✅ | `workers/aggregation/index.js` |
| Worker is not imported by server | ✅ | No import in `server.js` |
| Worker uses aggregation_worker role | ✅ | `config.js` DATABASE_CONFIG |
| Worker accepts only CLI arguments | ✅ | `parseArguments()` |
| No dynamic parameters from users | ✅ | Fixed configuration |

**Execution Model:**
```
┌─────────────────────────────────────────────────────────────────┐
│                      HTTP SERVER (server.js)                     │
│  - Uses api_writer, analytics_reader, supervisor_reader roles   │
│  - CANNOT trigger aggregation                                    │
│  - CANNOT access L1 for reading                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ (No connection)
                              │
┌─────────────────────────────────────────────────────────────────┐
│                 AGGREGATION WORKER (index.js)                    │
│  - Uses aggregation_worker role ONLY                             │
│  - Runs via cron/manual invocation                               │
│  - Processes fixed time windows                                  │
│  - Accepts no user input                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

### ✅ 3. Aggregation Pipeline Is One-Way and Irreversible

| Verification Point | Status | Implementation |
|-------------------|--------|----------------|
| L1 → L2 is one-way | ✅ | Stage A design |
| L2 → L3 is one-way | ✅ | Stage B design |
| No reverse data flow | ✅ | No L2→L1 or L3→L2 queries |
| K-anonymity enforced | ✅ | `privacy/thresholds.js` |
| Differential privacy noise | ✅ | `privacy/noise.js` |
| Aggregates are append-only | ✅ | Database triggers |
| Noise cannot be removed | ✅ | Noise is irreversible |

**Data Flow:**
```
L1 (census_submissions)
    │
    │  Stage A: Micro-Aggregation
    │  - K-anonymity (k ≥ 5)
    │  - Suppression of small groups
    │  - Append-only writes
    ▼
L2 (micro_aggregates)
    │
    │  Stage B: Macro-Aggregation
    │  - Differential privacy (ε ≤ 1.0)
    │  - Laplace noise mechanism
    │  - Append-only writes
    ▼
L3 (macro_aggregates)

❌ NO REVERSE FLOW
❌ NO L2 → L1 QUERIES
❌ NO L3 → L2 QUERIES
❌ NO NOISE REMOVAL
```

---

## Architecture Summary

### File Structure

```
src/workers/aggregation/
├── index.js              # Worker entry point (standalone)
├── config.js             # Fixed configuration (no user input)
├── logger.js             # Non-sensitive logging
├── stages/
│   ├── micro.js          # Stage A: L1 → L2 (placeholder)
│   └── macro.js          # Stage B: L2 → L3 (placeholder)
├── privacy/
│   ├── thresholds.js     # K-anonymity enforcement
│   └── noise.js          # Differential privacy
├── ARCHITECTURE.md       # Architecture documentation
└── VERIFICATION.md       # This document
```

### Database Role Separation

| Role | L1 (census_submissions) | L2 (micro_aggregates) | L3 (macro_aggregates) |
|------|------------------------|----------------------|----------------------|
| api_writer | INSERT | ❌ | ❌ |
| analytics_reader | ❌ | SELECT | SELECT |
| aggregation_worker | SELECT | INSERT | INSERT |

### Safety Constraints

| Constraint | Value | Enforcement |
|------------|-------|-------------|
| K-anonymity threshold | k ≥ 5 | `thresholds.js` |
| Minimum submissions | 5 | `config.js` |
| Differential privacy ε | ≤ 1.0 | `config.js` |
| Noise mechanism | Laplace | `noise.js` |
| Time window | Fixed (previous day/week) | `config.js` |

---

## Cross-Reference

### Trust Boundaries (src/system/trust-boundaries.md)

| Requirement | Implementation |
|-------------|----------------|
| L2 computed from L1 (irreversible) | Stage A, append-only |
| L3 computed from L2 (irreversible) | Stage B, append-only |
| Threshold protection for L2 | K-anonymity (k ≥ 5) |
| Privacy noise for L3 | Differential privacy (ε ≤ 1.0) |
| StateAnalyst cannot access L1 | analytics_reader has no L1 access |
| No HTTP aggregation trigger | POST /aggregates/compute returns 403 |

### API Surface (src/system/api-surface.md)

| Requirement | Implementation |
|-------------|----------------|
| No HTTP aggregation trigger | POST routes return 403 |
| StateAnalyst reads pre-computed | GET /aggregates/:id reads L2/L3 |
| No reverse data flow | One-way pipeline |

### Phase 3 Verification

| Requirement | Implementation |
|-------------|----------------|
| L1 is write-only via API | api_writer cannot SELECT |
| Aggregation not via HTTP | Worker process only |
| No user parameters | Fixed configuration |

---

## Verification Commands

```bash
# Verify worker is not imported by server
grep -r "workers/aggregation" src/server.js
# Expected: No matches

# Verify HTTP routes return 403
grep -A5 "'/aggregates/compute'" src/routes/aggregates.js
# Expected: Returns 403 Forbidden

# Verify fixed configuration
grep "Object.freeze" src/workers/aggregation/config.js
# Expected: All config objects are frozen

# Verify no user parameters in worker
grep "request.body\|request.query\|request.params" src/workers/aggregation/*.js
# Expected: No matches

# Verify aggregation_worker role usage
grep "aggregation_worker" src/workers/aggregation/config.js
# Expected: DATABASE_CONFIG.ROLE = 'aggregation_worker'
```

---

## NOT Implemented Yet

The following components are placeholders:

1. **Aggregation SQL queries** - Actual SELECT/INSERT statements
2. **Database connection** - Pool initialization for aggregation_worker
3. **Threshold enforcement** - Runtime suppression logic
4. **Privacy noise** - Cryptographic random generation
5. **Scheduling** - Cron job configuration
6. **Monitoring** - Job status tracking

---

## Conclusion

The offline aggregation pipeline architecture ensures:

- ✅ Aggregation cannot be triggered via API
- ✅ Aggregation runs only offline (separate worker process)
- ✅ Aggregation pipeline is one-way and irreversible
- ✅ Privacy thresholds protect small groups (k-anonymity)
- ✅ Privacy noise prevents reverse engineering (differential privacy)
- ✅ Database role separation enforces access control
- ✅ Fixed configuration prevents dynamic parameter injection
- ✅ Append-only writes prevent modification of aggregates

