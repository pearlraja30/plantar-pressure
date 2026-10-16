// Cloud Synchronization & Remote Retrieval Service (FR-12, FR-13)
import { AnalysisCase } from '../types';
import { logAuditEvent } from './auditService';

export interface CloudSyncStatus {
  isOnline: boolean;
  pendingQueueCount: number;
  lastSyncTime: string | null;
  serverEndpoint: string;
}

const SYNC_QUEUE_KEY = 'ppa_sync_queue_v1';

// Simulated latency helper
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class CloudSyncService {
  private static instance: CloudSyncService;
  private isOnline: boolean = true;
  private serverEndpoint: string = 'https://cloud-api.technomind-health.com/v1/plantar-cases';

  private constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processQueue();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  public static getInstance(): CloudSyncService {
    if (!CloudSyncService.instance) {
      CloudSyncService.instance = new CloudSyncService();
    }
    return CloudSyncService.instance;
  }

  public getStatus(): CloudSyncStatus {
    const queue = this.getQueue();
    const lastSync = localStorage.getItem('ppa_last_sync_timestamp');
    return {
      isOnline: this.isOnline,
      pendingQueueCount: queue.length,
      lastSyncTime: lastSync,
      serverEndpoint: this.serverEndpoint,
    };
  }

  public setOnlineStatus(online: boolean) {
    this.isOnline = online;
    if (online) {
      this.processQueue();
    }
  }

  public getQueue(): string[] {
    try {
      const raw = localStorage.getItem(SYNC_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: string[]) {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }

  /**
   * Enqueue a case for cloud synchronization
   */
  public async syncCase(
    analysisCase: AnalysisCase,
    onProgress?: (status: 'pending' | 'uploading' | 'synced' | 'failed') => void
  ): Promise<{ success: boolean; cloudId?: string; error?: string }> {
    onProgress?.('uploading');

    if (!this.isOnline) {
      // Queue offline
      const queue = this.getQueue();
      if (!queue.includes(analysisCase.id)) {
        queue.push(analysisCase.id);
        this.saveQueue(queue);
      }
      onProgress?.('pending');
      logAuditEvent(
        'CLOUD_SYNC_QUEUED_OFFLINE',
        `Case ${analysisCase.caseNumber} queued for sync (Device offline).`,
        'system-sync',
        analysisCase.id
      );
      return { success: false, error: 'Device is offline. Case queued safely in local storage.' };
    }

    try {
      // Simulate TLS upload with checksum verification
      await delay(1200);

      // Deterministic cloud ID
      const cloudId = `CLOUD-SYNC-${analysisCase.caseNumber.replace(/[^a-zA-Z0-9]/g, '')}`;
      const syncTimestamp = new Date().toISOString();

      localStorage.setItem('ppa_last_sync_timestamp', syncTimestamp);

      // Remove from queue if present
      const queue = this.getQueue().filter((id) => id !== analysisCase.id);
      this.saveQueue(queue);

      onProgress?.('synced');
      logAuditEvent(
        'CLOUD_SYNC_SUCCESSFUL',
        `Report ${analysisCase.caseNumber} synced to cloud with ID: ${cloudId}`,
        'system-sync',
        analysisCase.id
      );

      return { success: true, cloudId };
    } catch (err) {
      onProgress?.('failed');
      logAuditEvent(
        'CLOUD_SYNC_FAILED',
        `Sync failed for case ${analysisCase.caseNumber}: ${(err as Error).message}`,
        'system-sync',
        analysisCase.id
      );
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Process all queued items when internet restores
   */
  public async processQueue(): Promise<void> {
    if (!this.isOnline) return;
    const queue = this.getQueue();
    if (queue.length === 0) return;

    for (const caseId of [...queue]) {
      // In production, would fetch case from IndexedDB and sync
      await delay(500);
      const remaining = this.getQueue().filter((id) => id !== caseId);
      this.saveQueue(remaining);
    }
  }
}

export const cloudSyncService = CloudSyncService.getInstance();
