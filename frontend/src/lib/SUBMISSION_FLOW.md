# Submission Flow Documentation

## Overview

This document explains the consent and census submission flow in the Trust-First Census System. The design prioritizes data privacy, irreversibility, and offline capability while maintaining strict trust guarantees.

## Why Submissions Are Irreversible

### Architectural Decision

Census submissions are **write-only** by design. Once data is submitted:

1. **No Read-Back**: The API returns only a receipt ID and timestamp, never the submitted data
2. **No Edit**: There is no update endpoint
3. **No Delete**: There is no delete endpoint
4. **No History**: There is no submission history UI

### Rationale

1. **Privacy Protection**: If data could be read back, it could be leaked, exported, or misused
2. **Misuse Prevention**: Without read access, there's no way to target individuals based on caste data
3. **Trust Guarantee**: Citizens can trust that their data cannot be retrieved or displayed
4. **Audit Integrity**: Immutable data ensures audit logs remain accurate

### What This Means for Users

- **Verify before submitting**: Data cannot be corrected after submission
- **Receipt is proof**: The receipt ID is the only proof of submission
- **No submission history**: You cannot view past submissions

## Consent Flow

### Step 1: Capture Consent

Before any census data can be submitted, consent must be captured:

```
User Action: Fill consent form
API Call: POST /consent/capture
Response: { receiptId, timestamp }
```

**Consent data includes:**
- Geographic scope (state, district, block)
- Consent text version
- Timestamp

**Consent data does NOT include:**
- Caste category
- Household count
- Population count
- Personal identifiers

### Step 2: Store Consent Receipt

The consent receipt ID is stored **in memory only** for use in the submission step. It is:
- Never persisted to localStorage
- Never persisted to IndexedDB
- Lost on page refresh (intentional)

## Submission Flow

### Online Submission

When online, submissions are sent immediately:

```
1. User fills census form
2. Frontend calls POST /submissions with:
   - consentReceiptId (from Step 1)
   - Geographic codes (from user's scope)
   - Census data (caste, household, population)
3. Backend validates consent exists
4. Backend writes to L1 (raw submissions)
5. Backend returns { receiptId, timestamp }
6. Frontend DISCARDS all form data
7. Frontend displays ONLY receiptId and timestamp
```

### Offline Submission

When offline, submissions are queued in IndexedDB:

```
1. User fills census form
2. Frontend detects offline status
3. Frontend saves to IndexedDB:
   - consentReceiptId
   - Submission payload
   - createdAt timestamp
4. Frontend shows "Pending: 1" indicator
5. User sees "Submission saved for sync"
```

**Important**: IndexedDB is the ONLY exception to the memory-only storage rule. It stores:
- Pending submissions only
- Minimal data (consent ID, payload, timestamp)
- No submission history
- Data is deleted after successful sync

## How Offline Queuing Works

### Storage Structure

```typescript
interface PendingSubmission {
  id: string;              // Local ID (not server ID)
  consentReceiptId: string;
  payload: {
    stateCode: string;
    districtCode: string;
    blockCode: string;
    villageCode: string;
    householdCount: number;
    populationCount: number;
    casteCategory: string;
  };
  createdAt: string;
  syncAttempts: number;
  lastError: string | null;
}
```

### Sync Process

1. User clicks "Sync Now" button (explicit action required)
2. Submissions are synced **sequentially** (not in parallel)
3. For each pending submission:
   - Attempt to POST to /submissions
   - On success: Remove from IndexedDB, show receipt ID
   - On failure: Keep in IndexedDB, show error
4. Partial success is allowed and reflected accurately

### No Background Sync

The system **intentionally** does not implement:
- Service worker background sync
- Automatic retry on reconnection
- Silent sync attempts

This is because:
- User should be aware of when data is transmitted
- Explicit sync provides clear feedback
- Avoids confusion about submission status

## Why There Is No Submission History UI

### Security Reasons

1. **Attack Surface**: A history UI could be exploited to enumerate submissions
2. **Data Leakage**: Even metadata (timestamps, counts) could reveal patterns
3. **Scope Creep**: History features tend to expand to include more data

### Trust Reasons

1. **Promise to Citizens**: We promise data cannot be retrieved
2. **Consistency**: If we can show history, we can show data
3. **Simplicity**: One-way data flow is easier to audit

### What Users Can Do

- **Verify receipt**: Use the receipt ID to confirm submission exists
- **Check pending count**: See how many submissions are waiting to sync
- **View receipts**: Keep a local record of receipt IDs (user responsibility)

## Error Handling

### Consent Errors

| Error | Meaning | User Action |
|-------|---------|-------------|
| Consent not found | Receipt ID invalid | Re-capture consent |
| Consent expired | Time limit exceeded | Re-capture consent |
| Network error | Cannot reach server | Wait and retry |

### Submission Errors

| Error | Meaning | User Action |
|-------|---------|-------------|
| Consent required | Missing consent ID | Complete consent step first |
| Validation failed | Invalid data | Check and correct input |
| Network error | Cannot reach server | Submission saved offline |
| Server error | Backend issue | Wait and retry |

## Security Considerations

### Memory-Only Tokens

Auth tokens are stored only in JavaScript memory:
- Lost on page refresh
- Lost on tab close
- Cannot be stolen from storage

### IndexedDB Exception

IndexedDB is used ONLY for pending offline submissions because:
- Offline capability is essential for field work
- Data is temporary (deleted after sync)
- No sensitive data beyond what user just entered
- User explicitly initiated the save

### No Data Echo

The API never returns submitted census data:
- POST /submissions returns only receipt ID
- GET /submissions does not exist
- No endpoint returns caste, household, or population data

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CONSENT FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│  [User] ──► [Consent Form] ──► [POST /consent/capture]          │
│                                        │                         │
│                                        ▼                         │
│                              { receiptId, timestamp }            │
│                                        │                         │
│                                        ▼                         │
│                         [Store in Memory ONLY]                   │
└─────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUBMISSION FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│  [User] ──► [Census Form] ──► [Online?]                         │
│                                   │                              │
│                    ┌──────────────┴──────────────┐               │
│                    │                             │               │
│                    ▼ YES                         ▼ NO            │
│           [POST /submissions]           [Save to IndexedDB]      │
│                    │                             │               │
│                    ▼                             ▼               │
│           { receiptId }              [Show Pending Count]        │
│                    │                             │               │
│                    ▼                             │               │
│         [DISCARD Form Data]                      │               │
│                    │                             │               │
│                    ▼                             ▼               │
│         [Show Receipt ONLY]          [User clicks "Sync Now"]    │
│                                                  │               │
│                                                  ▼               │
│                                        [Sequential Sync]         │
│                                                  │               │
│                                    ┌─────────────┴─────────────┐ │
│                                    │                           │ │
│                                    ▼ Success                   ▼ │
│                           [Remove from IDB]            [Keep in  │
│                           [Show Receipt]                IDB]     │
│                                                    [Show Error]  │
└─────────────────────────────────────────────────────────────────┘
```

## Summary

The submission flow is designed around these principles:

1. **Consent First**: No submission without valid consent
2. **Write-Only**: Data goes in but never comes out
3. **Offline-Capable**: Field work continues without connectivity
4. **Explicit Sync**: User controls when data is transmitted
5. **Receipt-Only**: Only proof of submission, never the data
6. **No History**: Past submissions cannot be viewed

These constraints exist to protect citizens' privacy and maintain trust in the census system.

