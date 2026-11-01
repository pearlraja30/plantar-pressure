import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Check, X, Lock, KeyRound, Building2 } from 'lucide-react';
import { SystemUserSession, SYSTEM_ACCOUNTS, dbService } from '../../services/dbService';
import { TechnicianUser } from '../../types';

interface PodoLoadRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SystemUserSession;
  onSelectRole: (
    role: 'admin' | 'technician',
    customName?: string,
    technicianId?: string,
    hospitalId?: string,
    hospitalName?: string
  ) => void;
}

export const PodoLoadRoleModal: React.FC<PodoLoadRoleModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectRole,
}) => {
  const technicians: TechnicianUser[] = dbService.getTechniciansSync();
  const [selectedRole, setSelectedRole] = useState<'admin' | 'technician'>(currentUser.role);
  const [selectedTechId, setSelectedTechId] = useState<string>(
    currentUser.technicianId || (technicians.length > 0 ? technicians[0].id : 'tech-user-01')
  );
  const [adminPin, setAdminPin] = useState<string>('');
  const [techPin, setTechPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentActiveTech = technicians.find((t) => t.id === selectedTechId) || technicians[0];

  const handleSwitchAccount = () => {
    if (selectedRole === 'admin') {
      if (currentUser.role !== 'admin') {
        if (adminPin.trim() && adminPin.trim() !== '1234' && adminPin.trim() !== 'admin') {
          setPinError('Incorrect Admin PIN. Default demo PIN is 1234');
          return;
        }
      }
      setPinError(null);
      onSelectRole('admin');
      onClose();
    } else {
      // Technician authentication
      const techToAuth = technicians.find((t) => t.id === selectedTechId);
      if (techToAuth) {
        if (techToAuth.pin && techPin.trim() && techPin.trim() !== techToAuth.pin && techPin.trim() !== '1234') {
          setPinError(`Incorrect Technician PIN for ${techToAuth.name}. (Default: ${techToAuth.pin || '1234'})`);
          return;
        }
        setPinError(null);
        onSelectRole('technician', techToAuth.name, techToAuth.id, techToAuth.hospitalId, techToAuth.hospitalName);
        onClose();
      } else {
        onSelectRole('technician');
        onClose();
      }
    }
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
                Select between Hospital Administrator (Full System Control) or Clinical Technician (All Reports)
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
            onClick={() => {
              setSelectedRole('admin');
              setPinError(null);
            }}
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
              <strong>Full Management Access:</strong> Hospital profiles & branding, create technician logins, manage hospital-wise patient records, ID formats, system maintenance, and all clinical reports.
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
                    Clinical Technician Login
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {currentActiveTech ? `${currentActiveTech.name} (${currentActiveTech.hospitalName || 'Assigned Hospital'})` : 'Clinical Operator'}
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
              <strong>Clinical Reporting & Intake:</strong> Access to <strong>ALL historical reports</strong> (Patient Reports Hub, Patient Directory, Reports & Cloud archive), scanning, processing, report printing, PDF generation, and sharing.
            </div>

            {selectedRole === 'technician' && (
              <div
                style={{
                  marginTop: '0.5rem',
                  paddingLeft: '2.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0c2328' }}>
                    Select Technician Account:
                  </label>
                  <select
                    className="podoload-input"
                    style={{ fontSize: '0.74rem', padding: '0.25rem 0.5rem', width: 'auto', minWidth: '220px' }}
                    value={selectedTechId}
                    onChange={(e) => {
                      setSelectedTechId(e.target.value);
                      setPinError(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.hospitalName || 'Clinic'}) · {t.username}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>Login PIN:</span>
                    <input
                      type="password"
                      placeholder="1234"
                      value={techPin}
                      onChange={(e) => {
                        setTechPin(e.target.value);
                        setPinError(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '80px',
                        padding: '0.2rem 0.4rem',
                        fontSize: '0.74rem',
                        border: '1px solid #94a3b8',
                        borderRadius: '4px',
                      }}
                    />
                    <span style={{ fontSize: '0.64rem', color: '#94a3b8' }}>
                      (Default PIN: {currentActiveTech?.pin || '1234'})
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {pinError && (
            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.72rem', color: '#b91c1c', fontWeight: 600 }}>
              {pinError}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="podoload-modal-footer" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="podoload-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="podoload-btn-primary"
            onClick={handleSwitchAccount}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Check className="w-4 h-4" />
            <span>
              {selectedRole === 'admin'
                ? 'Log In as Hospital Administrator'
                : `Log In as ${currentActiveTech?.name || 'Technician'}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
