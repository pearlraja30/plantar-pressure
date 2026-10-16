// Domain Event Bus (Observer Pattern) - Decouples Domain Events, Audit Trail & Cloud Sync

export type DomainEvent =
  | { type: 'SCAN_ACQUIRED'; payload: { caseId: string; scannerModel: string; dpi: number } }
  | { type: 'ANALYSIS_COMPLETED'; payload: { caseId: string; algorithmVersion: string; peakRegion: string } }
  | { type: 'LANDMARKS_UPDATED'; payload: { caseId: string; footLengthMm: number; forefootWidthMm: number } }
  | { type: 'CLINICAL_SIGN_OFF'; payload: { caseId: string; physicianName: string; signedAt: string } }
  | { type: 'CLOUD_SYNC_STATUS_CHANGED'; payload: { caseId: string; status: string } };

export type DomainEventListener<T extends DomainEvent = DomainEvent> = (event: T) => void;

export class DomainEventBus {
  private static instance: DomainEventBus;
  private listeners: Map<string, Set<DomainEventListener<any>>> = new Map();

  private constructor() {}

  public static getInstance(): DomainEventBus {
    if (!DomainEventBus.instance) {
      DomainEventBus.instance = new DomainEventBus();
    }
    return DomainEventBus.instance;
  }

  public subscribe<T extends DomainEvent>(
    eventType: T['type'],
    listener: DomainEventListener<T>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    // Return unsubscribe callback
    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }

  public publish(event: DomainEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (err) {
          console.error(`Error executing event listener for ${event.type}:`, err);
        }
      });
    }
  }
}

export const eventBus = DomainEventBus.getInstance();
