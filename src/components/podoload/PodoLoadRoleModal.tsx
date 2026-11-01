import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Check,
  X,
  Lock,
  KeyRound,
  AlertTriangle,
  UserPlus,
  RefreshCw,
  CreditCard,
  ShieldAlert,
  Eye,
  EyeOff,
  Key,
  ArrowLeft,
  HelpCircle,
} from 'lucide-react';
import { SystemUserSession, dbService } from '../../services/dbService';
import { TechnicianUser, AdminAccount, BoundDevice, DeviceLicense } from '../../types';
import { PodoLoadDevicePaymentModal } from './PodoLoadDevicePaymentModal';

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
  const [registeredAdmin, setRegisteredAdmin] = useState<AdminAccount | null>(() => dbService.getAdminAccountSync());
  const [selectedRole, setSelectedRole] = useState<'admin' | 'technician'>(currentUser.role);
  const [selectedTechId, setSelectedTechId] = useState<string>(
    currentUser.technicianId || (technicians.length > 0 ? technicians[0].id : 'tech-user-01')
  );

  // Login Password states (starts empty, no default passwords exposed)
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [techPassword, setTechPassword] = useState<string>('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showTechPassword, setShowTechPassword] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Recovery views mode: 'none' | 'admin' | 'technician'
  const [recoveryMode, setRecoveryMode] = useState<'none' | 'admin' | 'technician'>('none');

  // Admin Recovery Form state
  const [adminRecoveryUser, setAdminRecoveryUser] = useState(registeredAdmin?.username || 'admin@technomind.health');
  const [adminRecoveryVerify, setAdminRecoveryVerify] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminNewPasswordConfirm, setAdminNewPasswordConfirm] = useState('');
  const [showAdminNewPassword, setShowAdminNewPassword] = useState(false);
  const [adminRecoverySuccess, setAdminRecoverySuccess] = useState<string | null>(null);

  // Technician Recovery Form state
  const [techRecoveryId, setTechRecoveryId] = useState<string>(
    technicians.length > 0 ? technicians[0].id : ''
  );
  const [techRecoveryVerify, setTechRecoveryVerify] = useState('');
  const [techNewPassword, setTechNewPassword] = useState('');
  const [techNewPasswordConfirm, setTechNewPasswordConfirm] = useState('');
  const [showTechNewPassword, setShowTechNewPassword] = useState(false);
  const [techRecoverySuccess, setTechRecoverySuccess] = useState<string | null>(null);

  // Admin Account Creation / Registration Form State
  const [isRegisteringAdmin, setIsRegisteringAdmin] = useState<boolean>(!registeredAdmin);
  const [regAdminName, setRegAdminName] = useState('Dr. Specialist');
  const [regAdminUsername, setRegAdminUsername] = useState('admin@technomind.health');
  const [regHospitalName, setRegHospitalName] = useState(
    dbService.getActiveHospitalSync()?.name || 'Technomind Healthcare Systems'
  );
  const [regAdminPassword, setRegAdminPassword] = useState('');
  const [regAdminPasswordConfirm, setRegAdminPasswordConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regAdminPhone, setRegAdminPhone] = useState('+1 (800) 555-PODO');
  const [regDeviceName, setRegDeviceName] = useState(dbService.getCurrentDeviceSync()?.name || 'Main Diagnostic Workstation');

  // Device Binding Lockout State
  const [deviceLockout, setDeviceLockout] = useState<{
    currentDevice: BoundDevice;
    boundDevices: BoundDevice[];
    license: DeviceLicense;
  } | null>(null);

  // Multi-Device Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Transfer device binding state
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [transferPassword, setTransferPassword] = useState('');
  const [showTransferPassword, setShowTransferPassword] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentActiveTech = technicians.find((t) => t.id === selectedTechId) || technicians[0];

  // Handle Admin Registration
  const handleRegisterAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regAdminName.trim() || !regAdminUsername.trim() || !regAdminPassword.trim()) {
      setPinError('Please complete all required fields (Name, Username/Email, and Master Password).');
      return;
    }
    if (regAdminPassword !== regAdminPasswordConfirm) {
      setPinError('Master Password confirmation does not match. Please re-enter.');
      return;
    }
    if (regAdminPassword.trim().length < 4) {
      setPinError('Master Password must be at least 4 characters long.');
      return;
    }

    const generatedKey = 'REC-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const newAdmin: AdminAccount = {
      id: 'admin-' + Math.random().toString(36).substring(2, 9),
      name: regAdminName.trim(),
      username: regAdminUsername.trim(),
      pin: regAdminPassword.trim(),
      hospitalId: dbService.getActiveHospitalSync()?.id || 'hosp-technomind-main',
      hospitalName: regHospitalName.trim(),
      phone: regAdminPhone.trim(),
      email: regAdminUsername.includes('@') ? regAdminUsername.trim() : undefined,
      role: 'admin',
      createdAt: new Date().toISOString(),
      status: 'active',
      recoveryKey: generatedKey,
    };

    // Save admin account, register active station, and bind device
    const saved = dbService.registerAdminAccount(newAdmin);
    dbService.bindCurrentDevice(regDeviceName.trim() || 'Primary Diagnostic Terminal');
    setRegisteredAdmin(saved);
    setIsRegisteringAdmin(false);
    setPinError(null);

    // Automatically log in as the newly created Admin
    onSelectRole('admin', saved.name, undefined, saved.hospitalId, saved.hospitalName);
    onClose();
  };

  // Handle Account Authentication & Device Binding Check
  const handleSwitchAccount = () => {
    setPinError(null);
    setDeviceLockout(null);

    if (selectedRole === 'admin') {
      // 1. If no admin registered yet, guide user to create account
      if (!registeredAdmin) {
        setIsRegisteringAdmin(true);
        return;
      }

      if (!adminPassword.trim()) {
        setPinError('Please enter your Administrator Master Password.');
        return;
      }

      // 2. Validate Credentials strictly
      const auth = dbService.authenticateAdmin(registeredAdmin.username, adminPassword);
      if (!auth.success) {
        setPinError(auth.error || 'Incorrect Master Password. Please try again or use "Forgot Master Password" to recover your account.');
        return;
      }

      // 3. ENFORCE DEVICE BINDING & LICENSING (Single Device Restriction)
      const devCheck = dbService.checkDeviceAuthorization();

      if (devCheck.authorized) {
        // Current device is authorized!
        onSelectRole('admin', auth.account?.name, undefined, auth.account?.hospitalId, auth.account?.hospitalName);
        onClose();
      } else if (devCheck.canAutoBind) {
        // Free seat available within quota! Automatically bind this station
        dbService.bindCurrentDevice();
        onSelectRole('admin', auth.account?.name, undefined, auth.account?.hospitalId, auth.account?.hospitalName);
        onClose();
      } else {
        // DEVICE LIMIT EXCEEDED (Single-Device Violation)
        setDeviceLockout({
          currentDevice: devCheck.currentDevice,
          boundDevices: devCheck.boundDevices,
          license: devCheck.license,
        });
      }
    } else {
      // Technician authentication
      const techToAuth = technicians.find((t) => t.id === selectedTechId);
      if (techToAuth) {
        if (techToAuth.pin && techPassword.trim() !== techToAuth.pin) {
          setPinError(`Incorrect password for technician ${techToAuth.name}. Please try again or use "Forgot Password".`);
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

  // Handle Device Transfer
  const handleConfirmTransfer = () => {
    if (!transferPassword.trim()) {
      setPinError('Please enter your Administrator Master Password to authorize device transfer.');
      return;
    }
    const cleanPassword = transferPassword.trim();
    const correctPassword = registeredAdmin?.pin || '1234';

    if (cleanPassword !== correctPassword) {
      setPinError('Incorrect Administrator Master Password. Transfer authorization failed.');
      return;
    }

    dbService.transferDeviceBinding(cleanPassword);
    setTransferSuccess('Single-device license successfully transferred and bound to this hardware terminal!');
    setDeviceLockout(null);
    setShowTransferConfirm(false);

    // Proceed to log in as admin
    setTimeout(() => {
      onSelectRole('admin', registeredAdmin?.name, undefined, registeredAdmin?.hospitalId, registeredAdmin?.hospitalName);
      onClose();
    }, 1200);
  };

  // Handle Administrator Password Recovery
  const handleRecoverAdminPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setAdminRecoverySuccess(null);

    if (!adminRecoveryUser.trim()) {
      setPinError('Please enter your Administrator username or registered email.');
      return;
    }
    if (!adminRecoveryVerify.trim()) {
      setPinError('Please provide your Security Recovery Key or registered phone number.');
      return;
    }
    if (!adminNewPassword.trim() || adminNewPassword.trim().length < 4) {
      setPinError('New Master Password must be at least 4 characters long.');
      return;
    }
    if (adminNewPassword !== adminNewPasswordConfirm) {
      setPinError('Password confirmation does not match.');
      return;
    }

    const res = dbService.recoverAdminPassword(adminRecoveryUser, adminRecoveryVerify, adminNewPassword);
    if (!res.success) {
      setPinError(res.error || 'Password recovery failed. Please verify your credentials.');
      return;
    }

    const updated = dbService.getAdminAccountSync();
    setRegisteredAdmin(updated);
    setAdminPassword(adminNewPassword);
    setAdminRecoverySuccess('✓ Master Password successfully updated! You can now log in.');

    setTimeout(() => {
      setRecoveryMode('none');
      setAdminRecoverySuccess(null);
      setPinError(null);
    }, 1600);
  };

  // Handle Technician Password Recovery
  const handleRecoverTechPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setTechRecoverySuccess(null);

    if (!techRecoveryId) {
      setPinError('Please select a technician account.');
      return;
    }
    if (!techRecoveryVerify.trim()) {
      setPinError('Please enter technician registered email, phone, recovery key, or Administrator Master Password.');
      return;
    }
    if (!techNewPassword.trim() || techNewPassword.trim().length < 4) {
      setPinError('New technician password must be at least 4 characters long.');
      return;
    }
    if (techNewPassword !== techNewPasswordConfirm) {
      setPinError('Password confirmation does not match.');
      return;
    }

    const res = dbService.recoverTechnicianPassword(techRecoveryId, techRecoveryVerify, techNewPassword);
    if (!res.success) {
      setPinError(res.error || 'Technician password recovery failed.');
      return;
    }

    setTechPassword(techNewPassword);
    setTechRecoverySuccess('✓ Technician password successfully reset! You can now log in.');

    setTimeout(() => {
      setRecoveryMode('none');
      setTechRecoverySuccess(null);
      setPinError(null);
    }, 1600);
  };

  return (
    <>
      <div className="podoload-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
        <div
          className="podoload-modal-box"
          style={{ maxWidth: '640px', width: '92%', maxHeight: '92vh', overflowY: 'auto' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="podoload-modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <KeyRound className="w-5 h-5 text-teal-600" />
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0c2328' }}>
                  {recoveryMode === 'admin'
                    ? 'Hospital Administrator — Password Recovery'
                    : recoveryMode === 'technician'
                    ? 'Clinical Technician — Password Recovery'
                    : isRegisteringAdmin
                    ? 'Create Administration Account (First-Time Setup)'
                    : deviceLockout
                    ? 'Device Binding Security Lockout'
                    : 'Account & Role Switcher'}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                  {recoveryMode === 'admin'
                    ? 'Verify registered clinic credentials or Security Recovery Key to reset your Master Password'
                    : recoveryMode === 'technician'
                    ? 'Reset technician login credentials via registered email/phone or Administrator Master Password'
                    : isRegisteringAdmin
                    ? 'Initialize medical facility administration and bind this primary diagnostic station'
                    : deviceLockout
                    ? 'Single-device license policy active. Upgraded multi-device license required.'
                    : 'Select between Hospital Administrator (Full System Control) or Clinical Technician'}
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
            {/* VIEW 1: DEVICE LOCKOUT WARNING (Single Device Enforcement) */}
            {deviceLockout ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.5rem 0' }}>
                <div
                  style={{
                    padding: '1rem',
                    backgroundColor: '#fffbeb',
                    border: '1.5px solid #fcd34d',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#b45309' }}>
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                    <strong style={{ fontSize: '0.86rem' }}>
                      Device Binding Restriction: Single-Device License Enforced
                    </strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: '#78350f', lineHeight: 1.45 }}>
                    This administrator account is bound to another hardware terminal. Under your current{' '}
                    <strong>{deviceLockout.license.tierName}</strong> ({deviceLockout.license.maxAllowedDevices} Device Seat), simultaneous access from a second device is restricted to protect medical data integrity.
                  </p>
                </div>

                {/* Device Comparison Card */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.72rem',
                    }}
                  >
                    <div style={{ color: '#0f766e', fontWeight: 800, marginBottom: '4px' }}>
                      ✓ Authorized Bound Station:
                    </div>
                    <div><strong>Name:</strong> {deviceLockout.boundDevices[0]?.name || 'Primary Workstation'}</div>
                    <div><strong>ID:</strong> {deviceLockout.boundDevices[0]?.id}</div>
                    <div><strong>Platform:</strong> {deviceLockout.boundDevices[0]?.platform}</div>
                    <div style={{ color: '#16a34a', fontWeight: 700, marginTop: '4px' }}>● Status: Active</div>
                  </div>

                  <div
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      fontSize: '0.72rem',
                    }}
                  >
                    <div style={{ color: '#b91c1c', fontWeight: 800, marginBottom: '4px' }}>
                      ✗ Current Terminal (Locked):
                    </div>
                    <div><strong>Name:</strong> {deviceLockout.currentDevice.name}</div>
                    <div><strong>ID:</strong> {deviceLockout.currentDevice.id}</div>
                    <div><strong>Platform:</strong> {deviceLockout.currentDevice.platform}</div>
                    <div style={{ color: '#dc2626', fontWeight: 700, marginTop: '4px' }}>● Status: Unbound (Seat Required)</div>
                  </div>
                </div>

                {/* Action Choices */}
                {showTransferConfirm ? (
                  <div
                    style={{
                      padding: '0.85rem',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0f172a' }}>
                      Confirm Single-Device License Transfer to this Machine:
                    </span>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b' }}>
                      This will revoke access on the previous station and register this machine as your single authorized terminal.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <div style={{ position: 'relative', width: '200px' }}>
                        <input
                          type={showTransferPassword ? 'text' : 'password'}
                          placeholder="Administrator Master Password"
                          value={transferPassword}
                          onChange={(e) => setTransferPassword(e.target.value)}
                          className="podoload-input"
                          style={{ width: '100%', fontSize: '0.74rem', paddingRight: '2rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowTransferPassword(!showTransferPassword)}
                          style={{
                            position: 'absolute',
                            right: '6px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#64748b',
                            padding: '2px',
                          }}
                        >
                          {showTransferPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        className="podoload-btn-primary"
                        onClick={handleConfirmTransfer}
                        style={{ fontSize: '0.74rem' }}
                      >
                        Authorize Transfer
                      </button>
                      <button
                        type="button"
                        className="podoload-btn-secondary"
                        onClick={() => setShowTransferConfirm(false)}
                        style={{ fontSize: '0.74rem' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="podoload-btn-primary"
                      onClick={() => setIsPaymentModalOpen(true)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        fontSize: '0.78rem',
                        padding: '0.65rem 1rem',
                        backgroundColor: '#0d9488',
                      }}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Upgrade to Multi-Device License (Payment Provision)</span>
                    </button>

                    <button
                      type="button"
                      className="podoload-btn-secondary"
                      onClick={() => setShowTransferConfirm(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.74rem',
                        padding: '0.65rem 0.85rem',
                      }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Transfer Single Seat to this Device</span>
                    </button>
                  </div>
                )}
              </div>
            ) : recoveryMode === 'admin' ? (
              /* VIEW 2A: ADMINISTRATOR PASSWORD RECOVERY */
              <form onSubmit={handleRecoverAdminPassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#f0fdfa',
                    border: '1px solid #99f6e4',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    fontSize: '0.74rem',
                    color: '#0f766e',
                  }}
                >
                  <Key className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Reset Administrator Master Password:</strong> Verify identity using your registered administrator username/email and either your Security Recovery Key or registered phone number.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      Administrator Username / Email *
                    </label>
                    <input
                      type="text"
                      className="podoload-input"
                      value={adminRecoveryUser}
                      onChange={(e) => setAdminRecoveryUser(e.target.value)}
                      placeholder="admin@technomind.health"
                      style={{ fontSize: '0.78rem' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      Security Recovery Key OR Registered Phone *
                    </label>
                    <input
                      type="text"
                      className="podoload-input"
                      value={adminRecoveryVerify}
                      onChange={(e) => setAdminRecoveryVerify(e.target.value)}
                      placeholder="e.g. REC-TMH-9901 or phone digits"
                      style={{ fontSize: '0.78rem' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      New Master Password *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showAdminNewPassword ? 'text' : 'password'}
                        className="podoload-input"
                        value={adminNewPassword}
                        onChange={(e) => setAdminNewPassword(e.target.value)}
                        placeholder="Min. 4 characters"
                        style={{ fontSize: '0.78rem', paddingRight: '2rem' }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminNewPassword(!showAdminNewPassword)}
                        style={{
                          position: 'absolute',
                          right: '6px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          padding: '2px',
                        }}
                      >
                        {showAdminNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      Confirm New Master Password *
                    </label>
                    <input
                      type={showAdminNewPassword ? 'text' : 'password'}
                      className="podoload-input"
                      value={adminNewPasswordConfirm}
                      onChange={(e) => setAdminNewPasswordConfirm(e.target.value)}
                      placeholder="Re-enter password"
                      style={{ fontSize: '0.78rem' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="podoload-btn-secondary"
                    onClick={() => {
                      setRecoveryMode('none');
                      setPinError(null);
                    }}
                    style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Login</span>
                  </button>

                  <button
                    type="submit"
                    className="podoload-btn-primary"
                    style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Check className="w-4 h-4" />
                    <span>Reset Master Password</span>
                  </button>
                </div>
              </form>
            ) : recoveryMode === 'technician' ? (
              /* VIEW 2B: TECHNICIAN PASSWORD RECOVERY */
              <form onSubmit={handleRecoverTechPassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                    fontSize: '0.74rem',
                    color: '#0369a1',
                  }}
                >
                  <KeyRound className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Reset Clinical Technician Password:</strong> Enter the technician registered contact details or have your Hospital Administrator authorize with their Master Password.
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      Select Technician Account *
                    </label>
                    <select
                      className="podoload-input"
                      value={techRecoveryId}
                      onChange={(e) => setTechRecoveryId(e.target.value)}
                      style={{ fontSize: '0.76rem' }}
                      required
                    >
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.username}) · {t.hospitalName || 'Clinic'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      Verification (Email / Phone / Master Password) *
                    </label>
                    <input
                      type="text"
                      className="podoload-input"
                      value={techRecoveryVerify}
                      onChange={(e) => setTechRecoveryVerify(e.target.value)}
                      placeholder="Technician email / phone / Master Password"
                      style={{ fontSize: '0.78rem' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      New Technician Password *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showTechNewPassword ? 'text' : 'password'}
                        className="podoload-input"
                        value={techNewPassword}
                        onChange={(e) => setTechNewPassword(e.target.value)}
                        placeholder="Min. 4 characters"
                        style={{ fontSize: '0.78rem', paddingRight: '2rem' }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowTechNewPassword(!showTechNewPassword)}
                        style={{
                          position: 'absolute',
                          right: '6px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          padding: '2px',
                        }}
                      >
                        {showTechNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      Confirm New Password *
                    </label>
                    <input
                      type={showTechNewPassword ? 'text' : 'password'}
                      className="podoload-input"
                      value={techNewPasswordConfirm}
                      onChange={(e) => setTechNewPasswordConfirm(e.target.value)}
                      placeholder="Re-enter password"
                      style={{ fontSize: '0.78rem' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="podoload-btn-secondary"
                    onClick={() => {
                      setRecoveryMode('none');
                      setPinError(null);
                    }}
                    style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Login</span>
                  </button>

                  <button
                    type="submit"
                    className="podoload-btn-primary"
                    style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Check className="w-4 h-4" />
                    <span>Reset Technician Password</span>
                  </button>
                </div>
              </form>
            ) : isRegisteringAdmin ? (
              /* VIEW 3: ADMIN ACCOUNT CREATION / REGISTRATION FORM */
              <form onSubmit={handleRegisterAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    backgroundColor: '#f0fdfa',
                    border: '1px solid #99f6e4',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.74rem',
                    color: '#0f766e',
                  }}
                >
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>First-Time Setup:</strong> Create the administration account to unlock clinical reporting and bind this machine as your primary authorized terminal.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      Administrator Full Name *
                    </label>
                    <input
                      type="text"
                      className="podoload-input"
                      value={regAdminName}
                      onChange={(e) => setRegAdminName(e.target.value)}
                      placeholder="e.g. Dr. Specialist / Director"
                      style={{ fontSize: '0.78rem' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      Admin Username / Login Email *
                    </label>
                    <input
                      type="text"
                      className="podoload-input"
                      value={regAdminUsername}
                      onChange={(e) => setRegAdminUsername(e.target.value)}
                      placeholder="admin@technomind.health"
                      style={{ fontSize: '0.78rem' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      Hospital / Clinic Facility Name *
                    </label>
                    <input
                      type="text"
                      className="podoload-input"
                      value={regHospitalName}
                      onChange={(e) => setRegHospitalName(e.target.value)}
                      placeholder="Technomind Healthcare Systems"
                      style={{ fontSize: '0.78rem' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      Contact Mobile / Phone
                    </label>
                    <input
                      type="text"
                      className="podoload-input"
                      value={regAdminPhone}
                      onChange={(e) => setRegAdminPhone(e.target.value)}
                      placeholder="+1 (800) 555-PODO"
                      style={{ fontSize: '0.78rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      Master Password *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        className="podoload-input"
                        value={regAdminPassword}
                        onChange={(e) => setRegAdminPassword(e.target.value)}
                        placeholder="Create strong Master Password"
                        style={{ fontSize: '0.78rem', paddingRight: '2rem' }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        style={{
                          position: 'absolute',
                          right: '6px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          padding: '2px',
                        }}
                      >
                        {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      Confirm Master Password *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showRegConfirmPassword ? 'text' : 'password'}
                        className="podoload-input"
                        value={regAdminPasswordConfirm}
                        onChange={(e) => setRegAdminPasswordConfirm(e.target.value)}
                        placeholder="Confirm Master Password"
                        style={{ fontSize: '0.78rem', paddingRight: '2rem' }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: '6px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          padding: '2px',
                        }}
                      >
                        {showRegConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                    Primary Device Hardware Station Name
                  </label>
                  <input
                    type="text"
                    className="podoload-input"
                    value={regDeviceName}
                    onChange={(e) => setRegDeviceName(e.target.value)}
                    placeholder="e.g. Main Diagnostic Station (iMac / Windows)"
                    style={{ fontSize: '0.78rem' }}
                  />
                  <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
                    This machine ({dbService.getCurrentDeviceSync().id}) will be cryptographically bound as your single authorized terminal. A Security Recovery Key will be generated upon creation.
                  </span>
                </div>

                {registeredAdmin && (
                  <button
                    type="button"
                    className="podoload-btn-secondary"
                    onClick={() => {
                      setIsRegisteringAdmin(false);
                      setPinError(null);
                    }}
                    style={{ fontSize: '0.72rem', alignSelf: 'flex-start', marginTop: '0.25rem' }}
                  >
                    ← Back to Login
                  </button>
                )}
              </form>
            ) : (
              /* VIEW 4: STANDARD ROLE SWITCHER (Admin vs Technician) */
              <>
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
                          {registeredAdmin
                            ? `${registeredAdmin.username} · ${registeredAdmin.name}`
                            : 'No Admin Registered — Click to Create Account'}
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
                    <strong>Full Management Access:</strong> Hospital profiles & branding, create technician logins, manage hospital-wise patient records, device binding licenses, and all clinical reports.
                  </div>

                  {selectedRole === 'admin' && (
                    <div
                      style={{
                        marginTop: '0.35rem',
                        paddingLeft: '2.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>Master Password:</span>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <input
                            type={showAdminPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={adminPassword}
                            onChange={(e) => {
                              setAdminPassword(e.target.value);
                              setPinError(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: '130px',
                              padding: '0.2rem 1.6rem 0.2rem 0.4rem',
                              fontSize: '0.74rem',
                              border: '1px solid #94a3b8',
                              borderRadius: '4px',
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAdminPassword(!showAdminPassword);
                            }}
                            style={{
                              position: 'absolute',
                              right: '4px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#64748b',
                              padding: '1px',
                            }}
                          >
                            {showAdminPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecoveryMode('admin');
                            setPinError(null);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '0.68rem',
                            color: '#0f766e',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                          }}
                        >
                          Forgot Master Password?
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsRegisteringAdmin(true);
                            setPinError(null);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '0.68rem',
                            color: '#0f766e',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                          }}
                        >
                          + Register New Admin Account
                        </button>
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
                          {currentActiveTech
                            ? `${currentActiveTech.name} (${currentActiveTech.hospitalName || 'Clinic'})`
                            : 'Clinical Operator'}
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

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                          <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>Password:</span>
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <input
                              type={showTechPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              value={techPassword}
                              onChange={(e) => {
                                setTechPassword(e.target.value);
                                setPinError(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: '130px',
                                padding: '0.2rem 1.6rem 0.2rem 0.4rem',
                                fontSize: '0.74rem',
                                border: '1px solid #94a3b8',
                                borderRadius: '4px',
                              }}
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowTechPassword(!showTechPassword);
                              }}
                              style={{
                                position: 'absolute',
                                right: '4px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#64748b',
                                padding: '1px',
                              }}
                            >
                              {showTechPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRecoveryMode('technician');
                              setTechRecoveryId(selectedTechId);
                              setPinError(null);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              fontSize: '0.68rem',
                              color: '#0284c7',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                            }}
                          >
                            Forgot Password?
                          </button>
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                            (Admin can also view/reset in Admin Panel)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {pinError && (
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  color: '#b91c1c',
                  fontWeight: 600,
                }}
              >
                {pinError}
              </div>
            )}

            {adminRecoverySuccess && (
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  color: '#166534',
                  fontWeight: 600,
                }}
              >
                {adminRecoverySuccess}
              </div>
            )}

            {techRecoverySuccess && (
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  color: '#166534',
                  fontWeight: 600,
                }}
              >
                {techRecoverySuccess}
              </div>
            )}

            {transferSuccess && (
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  color: '#166534',
                  fontWeight: 600,
                }}
              >
                {transferSuccess}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          {!deviceLockout && recoveryMode === 'none' && (
            <div className="podoload-modal-footer" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="podoload-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              {isRegisteringAdmin ? (
                <button
                  type="button"
                  className="podoload-btn-primary"
                  onClick={handleRegisterAdmin}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Admin Account & Bind Station</span>
                </button>
              ) : (
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
              )}
            </div>
          )}
        </div>
      </div>

      {/* Multi-Device Payment Modal */}
      <PodoLoadDevicePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={(license) => {
          setIsPaymentModalOpen(false);
          setDeviceLockout(null);
          // Now device is authorized! Log in as admin
          onSelectRole('admin', registeredAdmin?.name, undefined, registeredAdmin?.hospitalId, registeredAdmin?.hospitalName);
          onClose();
        }}
      />
    </>
  );
};
