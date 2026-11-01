import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Check, X, Lock, KeyRound } from 'lucide-react';
import { SystemUserSession, SYSTEM_ACCOUNTS } from '../../services/dbService';

interface PodoLoadRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SystemUserSession;
  onSelectRole: (role: 'admin' | 'technician', customName?: string) => void;
}

export const PodoLoadRoleModal: React.FC<PodoLoadRoleModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectRole,
}) => {
  const [selectedRole, setSelectedRole] = useState<'admin' | 'technician'>(currentUser.role);
  const [adminPin, setAdminPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSwitchAccount = (role: 'admin' | 'technician') => {
    if (role === 'admin' && currentUser.role !== 'admin') {
      // Optional friendly PIN verification for switching to Admin
      if (adminPin.trim() && adminPin.trim() !== '1234' && adminPin.trim() !== 'admin') {
        setPinError('Incorrect Admin PIN. Default demo PIN is 1234');
        return;
      }
    }
    setPinError(null);
    onSelectRole(role);
    onClose();
  };

  return (
    <div className="podoload-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="podoload-modal-box"
        style={{ maxWidth: '640px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="podoload-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <KeyRound className="w-5 h-5 text-teal-600" />
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0c2328' }}>
                Account & Role Switcher
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                Select between Hospital Administrator (Full Access) or Clinical Technician (All Reports)
              </p>
            </div>
          </div>
          <button
            type="button"
            className="podoload-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1rem 0' }}>
          {/* Account 1: Hospital Administrator */}
          <div
            onClick={() => setSelectedRole('admin')}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              border: selectedRole === 'admin' ? '2px solid #0d9488' : '1px solid #cbd5e1',
              backgroundColor: selectedRole === 'admin' ? '#f0fdfa' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#ccfbf1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0f766e',
                  }}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0c2328' }}>
                    Hospital Administrator
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {SYSTEM_ACCOUNTS.admin.username} · {SYSTEM_ACCOUNTS.admin.name}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {currentUser.role === 'admin' && (
                  <span className="podo-badge podo-badge-green" style={{ fontSize: '0.64rem' }}>
                    Active
                  </span>
                )}
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: selectedRole === 'admin' ? '5px solid #0d9488' : '2px solid #cbd5e1',
                    backgroundColor: '#fff',
                  }}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.45, paddingLeft: '2.5rem' }}>
              <strong>Holds Everything:</strong> Hospital profile, custom clinic logo & branding, hospital accounts directory, system settings & data maintenance, patient ID format engine, doctor staff credentials, plus all clinical reports.
            </div>

            {selectedRole === 'admin' && currentUser.role !== 'admin' && (
              <div
                style={{
                  marginTop: '0.35rem',
                  paddingLeft: '2.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>Admin PIN:</span>
                  <input
                    type="password"
                    placeholder="1234"
                    value={adminPin}
                    onChange={(e) => {
                      setAdminPin(e.target.value);
                      setPinError(null);
                    }}
                    style={{
                      width: '80px',
                      padding: '0.2rem 0.4rem',
                      fontSize: '0.74rem',
                      border: '1px solid #94a3b8',
                      borderRadius: '4px',
                    }}
                  />
                  <span style={{ fontSize: '0.64rem', color: '#94a3b8' }}>(Default: 1234)</span>
                </div>
                {pinError && (
                  <span style={{ fontSize: '0.68rem', color: '#dc2626', fontWeight: 600 }}>{pinError}</span>
                )}
              </div>
            )}
          </div>

          {/* Account 2: Clinical Technician */}
          <div
            onClick={() => {
              setSelectedRole('technician');
              setPinError(null);
            }}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              border: selectedRole === 'technician' ? '2px solid #0d9488' : '1px solid #cbd5e1',
              backgroundColor: selectedRole === 'technician' ? '#f0fdfa' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#e0f2fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0284c7',
                  }}
                >
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0c2328' }}>
                    Clinical Technician
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {SYSTEM_ACCOUNTS.technician.username} · {SYSTEM_ACCOUNTS.technician.name}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {currentUser.role === 'technician' && (
                  <span className="podo-badge podo-badge-green" style={{ fontSize: '0.64rem' }}>
                    Active
                  </span>
                )}
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: selectedRole === 'technician' ? '5px solid #0d9488' : '2px solid #cbd5e1',
                    backgroundColor: '#fff',
                  }}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.45, paddingLeft: '2.5rem' }}>
              <strong>Clinical Reporting & Intake:</strong> Access to <strong>ALL historical reports</strong> (Patient Reports Hub, Patient Directory, Reports & Cloud archive), scanning, processing, report printing, PDF generation, and sharing. Safeguarded from modifying clinic legal settings or destructive data purge.
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="podoload-modal-footer" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="podoload-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="podoload-btn-primary"
            onClick={() => handleSwitchAccount(selectedRole)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Check className="w-4 h-4" />
            <span>Switch to {selectedRole === 'admin' ? 'Administrator' : 'Technician'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
