# Phase 5.3: Deployment Model and Threat Narrative
## Trust-First Caste Census Management System

**Document Type:** Security Architecture & Deployment Guide  
**Audience:** Reviewers, Judges, Policymakers, Auditors  
**Date:** January 2, 2026  
**Version:** 1.0

---

## Executive Summary

The Trust-First Caste Census Management System is designed to collect, aggregate, and report caste census data while making misuse **architecturally impossible**—not merely discouraged by policy.

This document explains:
- How the system is deployed
- How it behaves when things go wrong
- Why it resists misuse by any actor, including administrators
- What the system deliberately refuses to do

**Core Principle:** The system is designed so that even a fully compromised administrator cannot extract individual caste records or target specific communities.

---

## 1. Deployment Model

### 1.1 Minimal Deployment Architecture

The system requires minimal infrastructure:

```
┌─────────────────────────────────────────────────────────────┐
│                     DEPLOYMENT BOUNDARY                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐         ┌─────────────────────────┐      │
│   │  API Server │         │      PostgreSQL         │      │
│   │  (Node.js)  │◄───────►│  (Role-Separated DB)    │      │
│   │             │         │                         │      │
│   │  - Auth     │         │  Roles:                 │      │
│   │  - Consent  │         │  - api_writer           │      │
│   │  - Submit   │         │  - audit_writer         │      │
│   │  - Analytics│         │  - aggregation_worker   │      │
│   └─────────────┘         │  - analytics_reader     │      │
│         ▲                 └─────────────────────────┘      │
│         │                           ▲                       │
│         │                           │                       │
│   ┌─────┴─────┐           ┌─────────┴─────────┐            │
│   │  Users    │           │ Aggregation Worker │            │
│   │ (HTTPS)   │           │ (Scheduled/Cron)   │            │
│   └───────────┘           └───────────────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Components

| Component | Purpose | Runs |
|-----------|---------|------|
| **API Server** | Handles authentication, consent, submissions, analytics queries | Continuously |
| **PostgreSQL** | Stores all data with role-based access control | Continuously |
| **Aggregation Worker** | Transforms raw data into privacy-protected aggregates | Scheduled (daily/weekly) |

### 1.3 What Runs Continuously

- **API Server**: Accepts consent records, census submissions, and analytics queries
- **PostgreSQL**: Maintains data integrity and enforces role separation
- **Audit Logging**: Records all actions (cannot be disabled)

### 1.4 What Runs on Schedule

- **Micro-Aggregation (L1 → L2)**: Daily batch job, processes previous day's submissions
- **Macro-Aggregation (L2 → L3)**: Weekly batch job, applies differential privacy noise

### 1.5 What is NOT Required

The system explicitly does **not** require:

| Technology | Why It's Not Needed |
|------------|---------------------|
| **Blockchain** | Immutability is enforced via database triggers and append-only tables. Blockchain adds complexity without security benefit. |
| **Aadhaar Integration** | No personal identifiers are collected or stored. Consent is anonymous. |
| **Biometric Verification** | Identity verification is out of scope. The system collects aggregate community data, not individual records. |
| **Real-time Analytics** | Delayed aggregation is a security feature, not a limitation. It prevents probing attacks. |
| **Complex Cloud Infrastructure** | A single VM with PostgreSQL is sufficient. No distributed systems required. |
| **Machine Learning** | No inference or prediction. All classifications are explicit and provided by the data subject. |
| **Surveillance Integration** | No location tracking, no device fingerprinting, no behavioral analysis. |

---

## 2. Failure Modes and Behavior

The system follows a strict **fail-closed** design: when something goes wrong, the system stops rather than continuing in a degraded or insecure state.

### 2.1 Database Unavailable

**What happens:** API server cannot connect to PostgreSQL.

**System behavior:**
- All requests are rejected with error responses
- No data is accepted or returned
- Server logs the failure and waits for recovery

**Why this is correct:** Accepting data without being able to store it or audit it would create data loss or unaudited operations. Failing closed ensures no silent data corruption.

### 2.2 Audit Logging Unavailable

**What happens:** The audit_writer database role fails or audit table is inaccessible.

**System behavior:**
- All requests are rejected immediately
- No consent, submission, or query proceeds without audit
- The system refuses to operate in an unaudited state

**Why this is correct:** Audit logs are a legal requirement for government census operations. Operating without audit would violate accountability guarantees.

### 2.3 Aggregation Worker Failure

**What happens:** The offline aggregation job fails mid-execution.

**System behavior:**
- Transaction is rolled back
- No partial aggregates are published to L2 or L3
- Job can be safely re-run
- Raw data (L1) remains intact and unaffected

**Why this is correct:** Partial aggregates could violate k-anonymity thresholds or differential privacy guarantees. Only complete, validated aggregates are published.

### 2.4 Misconfigured Scope or Role

**What happens:** A user's scope assignment is missing, invalid, or wildcarded.

**System behavior:**
- Access is denied (403 Forbidden)
- No fallback to broader access
- No "default" scope is applied

**Why this is correct:** Deny-by-default ensures that misconfiguration results in no access, not excessive access.

### 2.5 Why Silent Failure is Impossible

The system is designed so that failures are **loud and visible**:

1. **Mandatory audit logging**: Every action is logged. If logging fails, the action fails.
2. **No fallback paths**: There is no "degraded mode" that bypasses security checks.
3. **Transaction integrity**: Database operations are atomic. Partial writes are impossible.
4. **Explicit error responses**: The API returns clear error codes, not silent success.

---

## 3. Threat Model

### 3.1 External Attacker

**Profile:** An unauthorized party attempting to access the system from outside.

**What they might try:**
- Exploit API vulnerabilities to extract data
- Brute-force authentication
- SQL injection or other injection attacks
- Probe endpoints to discover data patterns

**Why the system prevents this:**
- **No raw data endpoints**: Even if an attacker gains access, there is no API to retrieve individual records
- **Rate limiting**: Prevents brute-force attacks
- **Input validation**: All inputs are validated against strict schemas
- **Role-based access**: Even authenticated access requires explicit role assignment
- **Offline aggregation**: Aggregates are computed in batch, not on-demand, preventing probing attacks

### 3.2 Malicious Enumerator

**Profile:** A field worker with legitimate DATA_ENTRY access who attempts to misuse their position.

**What they might try:**
- Submit false data to skew results
- Extract data about communities they've entered
- Identify specific individuals from submissions

**Why the system prevents this:**
- **Write-only submissions**: Enumerators can submit but cannot read back what they or others submitted
- **No personal identifiers**: Submissions contain aggregate counts, not individual names or identifiers
- **Consent separation**: Consent records are separate from census data and contain no caste information
- **Audit trail**: All submissions are logged with enumerator ID, enabling accountability
- **Geographic scope**: Enumerators can only submit for their assigned area

### 3.3 Malicious Analyst

**Profile:** A StateAnalyst or CentralPolicyViewer who attempts to extract sensitive information.

**What they might try:**
- Query for small communities to identify individuals
- Use differencing attacks (compare aggregates before/after a submission)
- Export data for unauthorized use
- Access data outside their geographic scope

**Why the system prevents this:**
- **K-anonymity (L2)**: Groups smaller than k=5 are completely dropped, not masked
- **Differential privacy (L3)**: Noise is added to all values, making differencing attacks ineffective
- **No export/download**: These endpoints return 403 Forbidden, always
- **Geographic scope enforcement**: StateAnalyst can only see their assigned state
- **Fixed query shapes**: No arbitrary WHERE clauses or custom filters
- **Privacy disclaimer**: All responses remind users that values are estimates, not exact counts

### 3.4 Insider Administrator

**Profile:** A system administrator with database or server access.

**What they might try:**
- Query raw data directly from the database
- Modify or delete records
- Create a super-admin account
- Disable audit logging

**Why the system prevents this:**
- **Database role separation**: No single role can access all data layers
  - `api_writer` can write L1 but cannot read it
  - `audit_writer` can only append to audit logs
  - `aggregation_worker` can read L1 but only for aggregation
  - `analytics_reader` can only read L3
- **Append-only tables**: Database triggers prevent UPDATE and DELETE on critical tables
- **No super-admin role**: The role `SUPER_ADMIN`, `ROOT`, `GOD`, etc. are explicitly forbidden and rejected at creation
- **Audit immutability**: Audit logs cannot be modified or deleted
- **Structural enforcement**: Even with full database access, the data model prevents linking submissions to individuals

### 3.5 Curious Policymaker

**Profile:** A legitimate user who attempts to learn more than they should.

**What they might try:**
- Request data at finer granularity than permitted
- Access other states' data
- Attempt to identify specific villages or households

**Why the system prevents this:**
- **Fixed aggregation levels**: L3 contains only state and national level data
- **No village/household aggregates**: These are structurally forbidden
- **Scope enforcement**: Users can only access data within their assigned scope
- **No raw data access**: Policymakers see only noised aggregates, never raw submissions

---

## 4. Trust Guarantees Mapping

Each design decision eliminates a specific risk:

| Design Decision | Risk Eliminated |
|-----------------|-----------------|
| **No raw data endpoints** | Prevents targeted caste profiling of individuals or small communities |
| **Write-only submissions** | Prevents enumerators from extracting data they or others entered |
| **Consent as separate artifact** | Prevents linking consent to caste data; consent contains no sensitive information |
| **Offline aggregation** | Prevents real-time probing attacks; attackers cannot observe system responses to specific inputs |
| **K-anonymity (k=5)** | Prevents identification of small groups; communities with fewer than 5 submissions are completely hidden |
| **Differential privacy (ε=1.0)** | Prevents differencing attacks; comparing aggregates before/after a submission reveals nothing |
| **Database role separation** | Prevents any single compromised credential from accessing all data |
| **Append-only tables** | Prevents tampering with historical records; data cannot be modified after submission |
| **No super-admin role** | Prevents privilege escalation; no single entity can override all controls |
| **Geographic scope enforcement** | Prevents cross-state data access; analysts see only their jurisdiction |
| **Mandatory audit logging** | Ensures accountability; every action is recorded and cannot be disabled |
| **No export/download** | Prevents bulk data exfiltration; data must be viewed in-system |
| **Fixed query shapes** | Prevents arbitrary data exploration; users cannot construct custom queries |

---

## 5. Explicit Non-Goals

The system deliberately does **not** do the following:

### 5.1 Individual Identification

**What it doesn't do:** The system cannot identify or track individual citizens.

**Why:** Census data is collected as aggregate counts (households, population by category), not individual records. No names, addresses, phone numbers, or biometric data are stored.

### 5.2 Real-Time Analytics

**What it doesn't do:** The system does not provide instant query results on fresh data.

**Why:** Real-time analytics would enable probing attacks where an attacker submits data and immediately observes changes in aggregates. Delayed batch processing prevents this.

### 5.3 Caste Inference or Prediction

**What it doesn't do:** The system does not infer, predict, or classify caste based on any data.

**Why:** All caste classifications are explicitly provided by the data subject. Machine learning or inference would violate the principle of explicit consent.

### 5.4 Cross-Referencing with Other Databases

**What it doesn't do:** The system does not link to Aadhaar, voter rolls, ration cards, or any other identity database.

**Why:** Cross-referencing would enable re-identification of individuals. The system is deliberately isolated.

### 5.5 Location Tracking

**What it doesn't do:** The system does not track where submissions are made from or where users access the system.

**Why:** Location data could be used to identify enumerators or correlate submissions with specific households.

### 5.6 Behavioral Analytics

**What it doesn't do:** The system does not analyze user behavior patterns, access times, or query patterns.

**Why:** Behavioral analysis could reveal information about data subjects or enable profiling of system users.

### 5.7 Data Export or Download

**What it doesn't do:** The system does not allow bulk export, CSV download, or API-based data extraction.

**Why:** Export functionality would enable unauthorized data distribution and loss of control over sensitive information.

### 5.8 Reversing Aggregation

**What it doesn't do:** The system cannot reconstruct raw data from aggregates.

**Why:** Aggregation is mathematically one-way. The k-anonymity suppression and differential privacy noise are irreversible transformations.

---

## 6. Summary for Reviewers

### What Makes This System Different

| Traditional Approach | Trust-First Approach |
|---------------------|---------------------|
| Security by policy | Security by architecture |
| Admin can override | No override possible |
| Audit logs can be disabled | Audit is mandatory |
| Raw data accessible to admins | Raw data accessible to no one |
| Trust the operator | Trust no one |

### Key Architectural Guarantees

1. **No single point of compromise**: Even full database access cannot extract individual records
2. **Fail-closed design**: System stops rather than operating insecurely
3. **Structural privacy**: Privacy is enforced by data model, not access control
4. **Separation of powers**: No role can perform all operations
5. **Irreversible aggregation**: Raw data cannot be reconstructed from outputs

### Questions This System Answers

- **"Can an administrator extract caste data for a specific village?"** No. Village-level data is never aggregated, and raw submissions cannot be queried.

- **"Can a hacker who compromises the database identify individuals?"** No. Submissions contain no personal identifiers, and the data model prevents linking.

- **"Can a corrupt official modify historical records?"** No. All critical tables are append-only with database triggers preventing modification.

- **"Can someone disable audit logging to hide their actions?"** No. Audit logging is mandatory; if it fails, all operations fail.

- **"Can a policymaker see which specific communities have low population?"** No. Groups below the k-anonymity threshold are completely suppressed, not reported.

---

## 7. Conclusion

The Trust-First Caste Census Management System is designed for a threat environment where:

- External attackers will attempt to breach the system
- Insiders may be curious, careless, or malicious
- Administrators cannot be fully trusted
- Policy compliance cannot be assumed

The system responds to this environment by making misuse **structurally impossible**:

- There are no endpoints to extract raw data
- There are no roles that can access everything
- There are no configurations that bypass security
- There are no silent failures that hide problems

This is not security through obscurity or security through policy. It is security through architecture—a system where the correct behavior is the only possible behavior.

---

**Document Status:** Final  
**Prepared for:** Phase 5.3 Submission  
**Classification:** Public

---

*"The best security is not making the wrong thing hard to do—it's making the wrong thing impossible to do."*

