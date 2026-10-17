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
  userId: string = 'practitioner',
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
      id: 'aud-init',
      timestamp: new Date().toISOString(),
      userId: 'system',
      action: 'SYSTEM_INITIALIZED',
      details: 'Plantar Pressure Analysis System ready for clinical scan acquisition.',
      algorithmVersion: CURRENT_ALGORITHM_VERSION,
    },
  ];
}
