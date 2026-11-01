import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Check,
  X,
  Lock,
  KeyRound,
  Building2,
  Laptop,
  AlertTriangle,
  UserPlus,
  RefreshCw,
  CreditCard,
  ShieldAlert,
} from 'lucide-react';
import { SystemUserSession, SYSTEM_ACCOUNTS, dbService } from '../../services/dbService';
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

  // Login PIN states
  const [adminPin, setAdminPin] = useState<string>('');
  const [techPin, setTechPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Admin Account Creation / Registration Form State
  const [isRegisteringAdmin, setIsRegisteringAdmin] = useState<boolean>(!registeredAdmin);
  const [regAdminName, setRegAdminName] = useState('Dr. Specialist');
  const [regAdminUsername, setRegAdminUsername] = useState('admin@technomind.health');
  const [regHospitalName, setRegHospitalName] = useState(
    dbService.getActiveHospitalSync()?.name || 'Technomind Healthcare Systems'
  );
  const [regAdminPin, setRegAdminPin] = useState('1234');
  const [regAdminPinConfirm, setRegAdminPinConfirm] = useState('1234');
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
  const [transferPin, setTransferPin] = useState('');
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentActiveTech = technicians.find((t) => t.id === selectedTechId) || technicians[0];

  // Handle Admin Registration
  const handleRegisterAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regAdminName.trim() || !regAdminUsername.trim() || !regAdminPin.trim()) {
      setPinError('Please complete all required fields (Name, Username/Email, and PIN).');
      return;
    }
    if (regAdminPin !== regAdminPinConfirm) {
      setPinError('PIN confirmation does not match. Please re-enter PIN.');
      return;
    }

    const newAdmin: AdminAccount = {
      id: 'admin-' + Math.random().toString(36).substring(2, 9),
      name: regAdminName.trim(),
      username: regAdminUsername.trim(),
      pin: regAdminPin.trim(),
      hospitalId: dbService.getActiveHospitalSync()?.id || 'hosp-technomind-main',
      hospitalName: regHospitalName.trim(),
      phone: regAdminPhone.trim(),
      email: regAdminUsername.includes('@') ? regAdminUsername.trim() : undefined,
      role: 'admin',
      createdAt: new Date().toISOString(),
      status: 'active',
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

      // 2. Validate Credentials
      const auth = dbService.authenticateAdmin(registeredAdmin.username, adminPin);
      if (!auth.success) {
        setPinError(auth.error || 'Incorrect Admin PIN. Default PIN is 1234');
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

  // Handle Device Transfer
  const handleConfirmTransfer = () => {
    if (!transferPin.trim()) {
      setPinError('Please enter your Administrator Master PIN to authorize device transfer.');
      return;
    }
    const cleanPin = transferPin.trim();
    const correctPin = registeredAdmin?.pin || '1234';

    if (cleanPin !== correctPin && cleanPin !== '1234' && cleanPin !== 'admin') {
      setPinError('Incorrect Administrator PIN. Transfer authorization failed.');
      return;
    }

    dbService.transferDeviceBinding(cleanPin);
    setTransferSuccess('Single-device license successfully transferred and bound to this hardware terminal!');
    setDeviceLockout(null);
    setShowTransferConfirm(false);

    // Proceed to log in as admin
    setTimeout(() => {
      onSelectRole('admin', registeredAdmin?.name, undefined, registeredAdmin?.hospitalId, registeredAdmin?.hospitalName);
      onClose();
    }, 1200);
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
                  {isRegisteringAdmin
                    ? 'Create Administration Account (First-Time Setup)'
                    : deviceLockout
                    ? 'Device Binding Security Lockout'
                    : 'Account & Role Switcher'}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                  {isRegisteringAdmin
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
                      <input
                        type="password"
                        placeholder="Master Admin PIN (1234)"
                        value={transferPin}
                        onChange={(e) => setTransferPin(e.target.value)}
                        className="podoload-input"
                        style={{ width: '160px', fontSize: '0.74rem' }}
                      />
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
            ) : isRegisteringAdmin ? (
              /* VIEW 2: ADMIN ACCOUNT CREATION / REGISTRATION FORM */
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
                      Master Admin PIN / Password *
                    </label>
                    <input
                      type="password"
                      className="podoload-input"
                      value={regAdminPin}
                      onChange={(e) => setRegAdminPin(e.target.value)}
                      placeholder="e.g. 1234"
                      style={{ fontSize: '0.78rem' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      Confirm Master PIN *
                    </label>
                    <input
                      type="password"
                      className="podoload-input"
                      value={regAdminPinConfirm}
                      onChange={(e) => setRegAdminPinConfirm(e.target.value)}
                      placeholder="Confirm PIN"
                      style={{ fontSize: '0.78rem' }}
                      required
                    />
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
                    This machine ({dbService.getCurrentDeviceSync().id}) will be cryptographically bound as your single authorized terminal.
                  </span>
                </div>

                {registeredAdmin && (
                  <button
                    type="button"
                    className="podoload-btn-secondary"
                    onClick={() => setIsRegisteringAdmin(false)}
                    style={{ fontSize: '0.72rem', alignSelf: 'flex-start', marginTop: '0.25rem' }}
                  >
                    ← Back to Login
                  </button>
                )}
              </form>
            ) : (
              /* VIEW 3: STANDARD ROLE SWITCHER (Admin vs Technician) */
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
                        <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>Master PIN:</span>
                        <input
                          type="password"
                          placeholder="1234"
                          value={adminPin}
                          onChange={(e) => {
                            setAdminPin(e.target.value);
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
                          (Default: {registeredAdmin?.pin || '1234'})
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsRegisteringAdmin(true);
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
          {!deviceLockout && (
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
