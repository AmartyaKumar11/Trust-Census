/**
 * Offline Storage for Pending Submissions
 * 
 * RESPONSIBILITY: IndexedDB storage for offline census submissions.
 * 
 * MUST:
 * - Store ONLY pending submissions (not yet synced)
 * - Store minimal data: consentReceiptId, submission payload, createdAt
 * - Provide explicit sync trigger (no background sync)
 * - Remove submissions after successful sync
 * - Show pending count accurately
 * 
 * MUST NEVER:
 * - Store auth tokens
 * - Store successfully submitted data
 * - Implement background sync
 * - Implement silent retry
 * - Store submission history
 * - Allow viewing of stored submission data
 * 
 * SECURITY NOTE: IndexedDB is ONLY permitted for pending offline submissions.
 * This is the ONLY exception to the memory-only storage rule.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface PendingSubmission {
  /** Unique ID for this pending submission (local only) */
  id: string;
  /** Consent receipt ID (required for submission) */
  consentReceiptId: string;
  /** Submission payload (matches API shape) */
  payload: {
    stateCode: string;
    districtCode: string;
    blockCode: string;
    villageCode: string;
    householdCount: number;
    populationCount: number;
    casteCategory: string;
  };
  /** When this pending submission was created locally */
  createdAt: string;
  /** Number of sync attempts (for display only, not retry logic) */
  syncAttempts: number;
  /** Last sync error message (if any) */
  lastError: string | null;
}

export interface SyncResult {
  /** Local ID of the pending submission */
  localId: string;
  /** Whether sync succeeded */
  success: boolean;
  /** Receipt ID from server (on success) */
  receiptId?: string;
  /** Timestamp from server (on success) */
  timestamp?: string;
  /** Error message (on failure) */
  error?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DB_NAME = 'trust-census-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-submissions';

// =============================================================================
// DATABASE INITIALIZATION
// =============================================================================

let dbInstance: IDBDatabase | null = null;

/**
 * Open or create the IndexedDB database.
 * Returns a promise that resolves to the database instance.
 */
async function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open offline storage database'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store for pending submissions
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

/**
 * Generate a unique ID for pending submissions.
 * Uses crypto.randomUUID if available, falls back to timestamp-based.
 */
function generateLocalId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `pending-${crypto.randomUUID()}`;
  }
  return `pending-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Save a submission for offline sync.
 * 
 * @param consentReceiptId - The consent receipt ID
 * @param payload - The submission data
 * @returns The local ID of the saved pending submission
 */
export async function savePendingSubmission(
  consentReceiptId: string,
  payload: PendingSubmission['payload']
): Promise<string> {
  const db = await openDatabase();
  
  const pendingSubmission: PendingSubmission = {
    id: generateLocalId(),
    consentReceiptId,
    payload: { ...payload }, // Shallow copy to avoid mutations
    createdAt: new Date().toISOString(),
    syncAttempts: 0,
    lastError: null,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(pendingSubmission);

    request.onerror = () => {
      reject(new Error('Failed to save pending submission'));
    };

    request.onsuccess = () => {
      resolve(pendingSubmission.id);
    };
  });
}

/**
 * Get count of pending submissions.
 * This is the ONLY way to know about pending submissions.
 * The actual data is NOT exposed.
 */
export async function getPendingCount(): Promise<number> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.count();

    request.onerror = () => {
      reject(new Error('Failed to count pending submissions'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

/**
 * Get all pending submissions for sync.
 * INTERNAL USE ONLY - called by syncPendingSubmissions.
 */
async function getAllPending(): Promise<PendingSubmission[]> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('createdAt');
    const request = index.getAll();

    request.onerror = () => {
      reject(new Error('Failed to retrieve pending submissions'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

/**
 * Remove a pending submission after successful sync.
 */
async function removePending(id: string): Promise<void> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => {
      reject(new Error('Failed to remove pending submission'));
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

/**
 * Update a pending submission with sync attempt info.
 */
async function updatePendingWithError(id: string, error: string): Promise<void> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onerror = () => {
      reject(new Error('Failed to get pending submission for update'));
    };

    getRequest.onsuccess = () => {
      const submission = getRequest.result as PendingSubmission;
      if (!submission) {
        resolve();
        return;
      }

      submission.syncAttempts += 1;
      submission.lastError = error;

      const putRequest = store.put(submission);
      putRequest.onerror = () => {
        reject(new Error('Failed to update pending submission'));
      };
      putRequest.onsuccess = () => {
        resolve();
      };
    };
  });
}

/**
 * Sync all pending submissions.
 * 
 * Submissions are synced SEQUENTIALLY (not in parallel).
 * Each submission is processed independently.
 * Partial success is allowed and reflected in results.
 * 
 * @param submitFn - The function to call for each submission (from apiClient)
 * @returns Array of sync results
 */
export async function syncPendingSubmissions(
  submitFn: (params: {
    consentReceiptId: string;
    stateCode: string;
    districtCode: string;
    blockCode: string;
    villageCode: string;
    householdCount: number;
    populationCount: number;
    casteCategory: string;
  }) => Promise<{ receiptId: string; timestamp: string }>
): Promise<SyncResult[]> {
  const pending = await getAllPending();
  const results: SyncResult[] = [];

  // Process SEQUENTIALLY (not in parallel)
  for (const submission of pending) {
    try {
      const response = await submitFn({
        consentReceiptId: submission.consentReceiptId,
        ...submission.payload,
      });

      // Success - remove from IndexedDB
      await removePending(submission.id);

      results.push({
        localId: submission.id,
        success: true,
        receiptId: response.receiptId,
        timestamp: response.timestamp,
      });
    } catch (error) {
      // Failure - keep in IndexedDB with error info
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      await updatePendingWithError(submission.id, errorMessage);

      results.push({
        localId: submission.id,
        success: false,
        error: errorMessage,
      });
    }
  }

  return results;
}

/**
 * Clear all pending submissions.
 * USE WITH CAUTION - this permanently deletes unsynced data.
 */
export async function clearAllPending(): Promise<void> {
  const db = await openDatabase();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => {
      reject(new Error('Failed to clear pending submissions'));
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

/**
 * Check if IndexedDB is available.
 */
export function isOfflineStorageAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

