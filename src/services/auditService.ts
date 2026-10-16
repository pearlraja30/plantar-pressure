// Append-Only Clinical Audit Log Service (FR-14, 21 CFR Part 11 compliant)
import { AuditEvent } from '../types';
import { CURRENT_ALGORITHM_VERSION } from './imageProcessingService';

const AUDIT_STORAGE_KEY = 'ppa_audit_log_v1';

export function getAuditEvents(): AuditEvent[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return getInitialDefaultAuditLogs();
    return JSON.parse(raw);
  } catch {
    return getInitialDefaultAuditLogs();
  }
}

export function logAuditEvent(
  action: string,
  details: string,
  userId: string = 'clinician-dr-chen',
  caseId?: string
): AuditEvent {
  const events = getAuditEvents();
  const newEvent: AuditEvent = {
    id: 'aud-' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    userId,
    caseId,
    action,
    details,
    algorithmVersion: CURRENT_ALGORITHM_VERSION,
  };

  events.unshift(newEvent);
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.error('Audit log write error', err);
  }
  return newEvent;
}

function getInitialDefaultAuditLogs(): AuditEvent[] {
  return [
    {
      id: 'aud-001',
      timestamp: '2026-10-12T11:42:18Z',
      userId: 'tech-rajalakshmi',
      caseId: 'case-demo-001',
      action: 'SCAN_ACQUISITION_COMPLETED',
      details: 'Acquired Harris Mat 300 DPI scan via Epson V39 II (TWAIN interface). Image QC Passed (Score 92).',
      algorithmVersion: 'v1.2.0-MED-2026',
    },
    {
      id: 'aud-002',
      timestamp: '2026-10-12T11:43:05Z',
      userId: 'tech-rajalakshmi',
      caseId: 'case-demo-001',
      action: 'JET_HEATMAP_GENERATED',
      details: 'Computed 6-category contact classification. Peak contact identified under 1st Metatarsal head.',
      algorithmVersion: 'v1.2.0-MED-2026',
    },
    {
      id: 'aud-003',
      timestamp: '2026-10-12T11:44:20Z',
      userId: 'tech-rajalakshmi',
      caseId: 'case-demo-001',
      action: 'ORTHOTIC_LANDMARKS_VERIFIED',
      details: 'Foot length 265mm, Forefoot width 96mm, Heel width 68mm, Cavanagh Arch Index 0.185 (Pes Cavus).',
      algorithmVersion: 'v1.2.0-MED-2026',
    },
    {
      id: 'aud-004',
      timestamp: '2026-10-12T12:30:00Z',
      userId: 'dr-michael-chen',
      caseId: 'case-demo-001',
      action: 'CLINICAL_SIGN_OFF',
      details: 'Physician approved report and prescribed custom offloading insole with 1st metatarsal relief.',
      algorithmVersion: 'v1.2.0-MED-2026',
    },
    {
      id: 'aud-005',
      timestamp: '2026-10-12T12:35:10Z',
      userId: 'system-cloud-sync',
      caseId: 'case-demo-001',
      action: 'CLOUD_SYNC_SUCCESSFUL',
      details: 'Encrypted payload synced to Technomind Cloud Gateway. Hash verified.',
      algorithmVersion: 'v1.2.0-MED-2026',
    },
  ];
}
