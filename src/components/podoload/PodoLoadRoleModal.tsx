import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
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
  Smartphone,
  Sparkles,
  Building2,
} from 'lucide-react';
import { SystemUserSession, dbService, APP_CURRENT_VERSION } from '../../services/dbService';
import { TechnicianUser, AdminAccount, BoundDevice, DeviceLicense, DeviceAuthorizationToken } from '../../types';
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
  isMandatoryActivation?: boolean;
  activationReason?: 'unregistered' | 'new_device' | 'new_version' | 'revoked' | 'inactive_technician';
}

export const PodoLoadRoleModal: React.FC<PodoLoadRoleModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectRole,
  isMandatoryActivation = false,
  activationReason,
}) => {
  const isMobileDevice =
    Capacitor.isNativePlatform() ||
    (typeof navigator !== 'undefined' &&
      (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') ||
        (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent))));

  const technicians: TechnicianUser[] = dbService.getTechniciansSync();
  const [registeredAdmin, setRegisteredAdmin] = useState<AdminAccount>(() => dbService.getAdminAccountSync());
  const [selectedRole, setSelectedRole] = useState<'admin' | 'technician'>(isMobileDevice ? 'technician' : currentUser.role);
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

  // Code-based Device Authorization & Pairing State
  const [deviceAuth, setDeviceAuth] = useState<DeviceAuthorizationToken | null>(() =>
    dbService.getDeviceAuthorizationSync()
  );
  const [mobileAuthTab, setMobileAuthTab] = useState<'login' | 'activate'>(() => {
    if (isMandatoryActivation) return 'activate';
    return dbService.getDeviceAuthorizationSync() ? 'login' : 'activate';
  });

  // Code Activation Form State
  const [actHospitalCode, setActHospitalCode] = useState(
    dbService.getDeviceAuthorizationSync()?.hospitalCode || 'TMH-CENTRAL'
  );
  const [actActivationCode, setActActivationCode] = useState('');
  const [actPassword, setActPassword] = useState('');
  const [actPasswordConfirm, setActPasswordConfirm] = useState('');
  const [showActPassword, setShowActPassword] = useState(false);
  const [showActConfirmPassword, setShowActConfirmPassword] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [actSuccessMsg, setActSuccessMsg] = useState<string | null>(null);

  // Initial Master Password Setup State (for first-time station configuration only)
  const [isSettingInitialPassword, setIsSettingInitialPassword] = useState<boolean>(false);
  const [regAdminPassword, setRegAdminPassword] = useState('');
  const [regAdminPasswordConfirm, setRegAdminPasswordConfirm] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

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

  // Handle First-Time Administrator Master Password Setup
  const handleSetInitialPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regAdminPassword.trim()) {
      setPinError('Please enter a Master Password.');
      return;
    }
    if (regAdminPassword.trim().length < 4) {
      setPinError('Master Password must be at least 4 characters long.');
      return;
    }
    if (regAdminPassword !== regAdminPasswordConfirm) {
      setPinError('Master Password confirmation does not match. Please re-enter.');
      return;
    }

    const updated = dbService.setInitialAdminPassword(regAdminPassword.trim());
    setRegisteredAdmin(updated);
    setIsSettingInitialPassword(false);
    setPinError(null);

    // Automatically log in as Administrator
    onSelectRole('admin', updated.name, undefined, updated.hospitalId, updated.hospitalName);
    onClose();
  };

  // Handle Account Authentication & Device Binding Check
  const handleSwitchAccount = () => {
    setPinError(null);
    setDeviceLockout(null);

    if (selectedRole === 'admin') {
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
      let techToAuth = technicians.find((t) => t.id === selectedTechId);
      if (deviceAuth && (!techToAuth || isMobileDevice)) {
        const boundTech = technicians.find((t) => t.id === deviceAuth.technicianId);
        if (boundTech) techToAuth = boundTech;
      }
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

  // Handle Code-based Device Activation & Pairing
  const handleActivateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    setActSuccessMsg(null);

    if (!actHospitalCode.trim()) {
      setPinError('Please enter your Clinic or Hospital Code (e.g. TMH-CENTRAL).');
      return;
    }
    if (!actActivationCode.trim()) {
      setPinError('Please enter your Technician Activation Voucher Code (e.g. TMH-TECH-1001).');
      return;
    }
    if (actPassword && actPassword.trim().length < 4) {
      setPinError('Password must be at least 4 characters long.');
      return;
    }
    if (actPassword && actPassword !== actPasswordConfirm) {
      setPinError('Password confirmation does not match. Please re-enter.');
      return;
    }

    setIsActivating(true);
    try {
      const res = await dbService.registerDeviceWithActivationCode({
        hospitalCode: actHospitalCode.trim(),
        activationCode: actActivationCode.trim(),
        password: actPassword.trim() || undefined,
      });

      if (!res.success || !res.technician || !res.hospital) {
        setPinError(res.error || 'Activation failed. Please check your clinic and voucher codes.');
        setIsActivating(false);
        return;
      }

      const authTech = res.technician;
      const authHosp = res.hospital;
      setDeviceAuth(res.token || null);
      setActSuccessMsg(`✓ Device successfully registered & authorized! Bound to ${authTech.name} (${authHosp.name}).`);
      setIsActivating(false);

      setTimeout(() => {
        onSelectRole('technician', authTech.name, authTech.id, authHosp.id, authHosp.name);
        onClose();
      }, 1200);
    } catch (err) {
      setPinError('Device activation encountered an error: ' + (err as Error).message);
      setIsActivating(false);
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
      <div className="podoload-modal-backdrop" onClick={isMandatoryActivation ? undefined : onClose} role="dialog" aria-modal="true">
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
                    ? 'Clinical Technician — Password Recovery (Admin Authorized)'
                    : isSettingInitialPassword
                    ? 'Set Administrator Master Password (First-Time Setup)'
                    : deviceLockout
                    ? 'Device Binding Security Lockout'
                    : isMandatoryActivation
                    ? activationReason === 'new_version'
                      ? `PodoPress v${APP_CURRENT_VERSION} Update — Activation Required`
                      : activationReason === 'new_device'
                      ? 'New Hardware Device Detected — Registration Required'
                      : 'Station Activation & Enrollment Required'
                    : isMobileDevice
                    ? 'Clinical Technician Login'
                    : 'Account & Role Switcher'}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                  {recoveryMode === 'admin'
                    ? 'Verify Security Recovery Key, Clinic Code, or registered phone/email to reset your Master Password'
                    : recoveryMode === 'technician'
                    ? 'Administrator authorization required to reset clinical technician credentials'
                    : isSettingInitialPassword
                    ? 'Configure your confidential Master Password to secure and initialize this diagnostic station'
                    : deviceLockout
                    ? 'Single-device license policy active. Upgraded multi-device license required.'
                    : isMandatoryActivation
                    ? 'Security Policy: Enter your Clinic Code and Activation Voucher to authorize this station before proceeding with clinical examinations.'
                    : isMobileDevice
                    ? 'Sign in with your technician account created by the Administrator'
                    : 'Select between Hospital Administrator (Full System Control) or Clinical Technician'}
                </p>
              </div>
            </div>
            {!isMandatoryActivation && (
              <button
                type="button"
                className="podoload-modal-close-btn"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Modal Body */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1rem 0' }}>
            {/* MANDATORY ACTIVATION NOTICE */}
            {isMandatoryActivation && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  backgroundColor: '#fffbeb',
                  border: '1.5px solid #fcd34d',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  fontSize: '0.74rem',
                  color: '#92400e',
                }}
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <strong>
                    {activationReason === 'new_version'
                      ? 'Application Update / New Version Authorization Required'
                      : activationReason === 'new_device'
                      ? 'New Hardware Device Detected — Authorization Required'
                      : 'Initial Device Registration Required'}
                  </strong>
                  <div style={{ marginTop: '2px', fontSize: '0.7rem', color: '#78350f', lineHeight: 1.4 }}>
                    {activationReason === 'new_version'
                      ? `PodoPress was updated to build v${APP_CURRENT_VERSION}. Enter your Clinic Code and Activation Voucher to authorize this new release before clinical examinations.`
                      : activationReason === 'new_device'
                      ? 'This physical device is not yet registered. Enter your Clinic Code and Activation Voucher to bind this terminal for offline clinical scanning.'
                      : 'Please enter your Clinic Code and Technician Activation Voucher to authorize this device before proceeding with examinations.'}
                  </div>
                </div>
              </div>
            )}
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
            ) : isSettingInitialPassword ? (
              /* VIEW 3: INITIAL ADMIN MASTER PASSWORD SETUP */
              <form onSubmit={handleSetInitialPassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                  <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                  <span>
                    <strong>First-Time Security Setup:</strong> Set your Administrator Master Password to initialize and lock this diagnostic station. Once configured, administration access cannot be recreated by unauthorized users.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      Admin Account
                    </label>
                    <input
                      type="text"
                      className="podoload-input"
                      value={registeredAdmin ? `${registeredAdmin.name} (${registeredAdmin.username})` : 'Administrator (admin@technomind.health)'}
                      disabled
                      style={{ fontSize: '0.78rem', backgroundColor: '#f1f5f9', color: '#475569' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      Hospital / Clinic Facility
                    </label>
                    <input
                      type="text"
                      className="podoload-input"
                      value={registeredAdmin?.hospitalName || 'Technomind Healthcare Systems'}
                      disabled
                      style={{ fontSize: '0.78rem', backgroundColor: '#f1f5f9', color: '#475569' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                      Set Master Password *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        className="podoload-input"
                        value={regAdminPassword}
                        onChange={(e) => setRegAdminPassword(e.target.value)}
                        placeholder="Create Master Password (min. 4)"
                        style={{ fontSize: '0.78rem', paddingRight: '2rem' }}
                        required
                        autoFocus
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
                        placeholder="Re-enter Master Password"
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

                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    backgroundColor: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    color: '#475569',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong>Emergency Recovery Key:</strong> <code>{registeredAdmin?.recoveryKey || 'REC-TMH-9901'}</code>
                    <div style={{ fontSize: '0.64rem', color: '#64748b' }}>
                      You can also recover your Master Password using your Clinic Code: <strong>TMH-CENTRAL</strong>
                    </div>
                  </div>
                  <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem' }}>
                    Tamper Protected
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="podoload-btn-secondary"
                    onClick={() => {
                      setIsSettingInitialPassword(false);
                      setPinError(null);
                    }}
                    style={{ fontSize: '0.74rem' }}
                  >
                    Cancel / Back to Login
                  </button>

                  <button
                    type="submit"
                    className="podoload-btn-primary"
                    style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Check className="w-4 h-4" />
                    <span>Set Master Password &amp; Login</span>
                  </button>
                </div>
              </form>
            ) : (
              /* VIEW 4: STANDARD ROLE SWITCHER (Admin vs Technician) */
              <>
                {/* Account 1: Hospital Administrator (Desktop / Web only) */}
                {!isMobileDevice && (
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
                              : 'admin@technomind.health · Hospital Administrator'}
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

                          {!registeredAdmin?.isInitialSetupCompleted && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsSettingInitialPassword(true);
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
                              First-Time Password Setup
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
                        paddingLeft: isMobileDevice ? '0' : '2.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      {/* Tab Switcher: Station Quick Login vs Activate Station with Code */}
                      {!isMandatoryActivation && (
                        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.35rem', backgroundColor: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMobileAuthTab('login');
                              setPinError(null);
                            }}
                            style={{
                              flex: 1,
                              padding: '0.4rem',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              backgroundColor: mobileAuthTab === 'login' ? '#ffffff' : 'transparent',
                              color: mobileAuthTab === 'login' ? '#0f766e' : '#64748b',
                              boxShadow: mobileAuthTab === 'login' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Station Login</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMobileAuthTab('activate');
                              setPinError(null);
                            }}
                            style={{
                              flex: 1,
                              padding: '0.4rem',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              backgroundColor: mobileAuthTab === 'activate' ? '#ffffff' : 'transparent',
                              color: mobileAuthTab === 'activate' ? '#0f766e' : '#64748b',
                              boxShadow: mobileAuthTab === 'activate' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>📱 Activate Device with Code</span>
                          </button>
                        </div>
                      )}

                      {/* TAB 1: CODE-BASED ACTIVATION & HARDWARE PAIRING */}
                      {mobileAuthTab === 'activate' ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.65rem',
                            padding: '0.75rem',
                            backgroundColor: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#0f766e', fontSize: '0.74rem', fontWeight: 700 }}>
                            <Sparkles className="w-4 h-4 text-teal-600 flex-shrink-0" />
                            <span>Device Registration & Offline-First Authorization</span>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.4 }}>
                            Enter your Clinic Code and Activation Voucher Code from your Hospital Administrator. This cryptographically binds this station for <strong>100% offline clinical operation</strong>.
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                                Hospital / Clinic Code *
                              </label>
                              <input
                                type="text"
                                className="podoload-input"
                                style={{ fontSize: '0.76rem', textTransform: 'uppercase', fontFamily: 'monospace' }}
                                placeholder="e.g. TMH-CENTRAL"
                                value={actHospitalCode}
                                onChange={(e) => setActHospitalCode(e.target.value.toUpperCase())}
                                required
                              />
                            </div>

                            <div>
                              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                                Activation Voucher Code *
                              </label>
                              <input
                                type="text"
                                className="podoload-input"
                                style={{ fontSize: '0.76rem', textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 800, color: '#0f766e' }}
                                placeholder="e.g. TMH-TECH-1001"
                                value={actActivationCode}
                                onChange={(e) => setActActivationCode(e.target.value.toUpperCase())}
                                required
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                                Set Quick Password (Optional)
                              </label>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type={showActPassword ? 'text' : 'password'}
                                  className="podoload-input"
                                  style={{ fontSize: '0.76rem', paddingRight: '1.8rem' }}
                                  placeholder="Create or confirm PIN"
                                  value={actPassword}
                                  onChange={(e) => setActPassword(e.target.value)}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowActPassword(!showActPassword)}
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
                                  {showActPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>

                            <div>
                              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                                Confirm Quick Password
                              </label>
                              <div style={{ position: 'relative' }}>
                                <input
                                  type={showActConfirmPassword ? 'text' : 'password'}
                                  className="podoload-input"
                                  style={{ fontSize: '0.76rem', paddingRight: '1.8rem' }}
                                  placeholder="Re-enter password"
                                  value={actPasswordConfirm}
                                  onChange={(e) => setActPasswordConfirm(e.target.value)}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowActConfirmPassword(!showActConfirmPassword)}
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
                                  {showActConfirmPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="podoload-btn-primary"
                            disabled={isActivating}
                            onClick={handleActivateDevice}
                            style={{
                              marginTop: '0.25rem',
                              fontSize: '0.78rem',
                              padding: '0.45rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <Check className="w-4 h-4" />
                            <span>{isActivating ? 'Registering Device...' : '🚀 Authorize & Register Device'}</span>
                          </button>
                        </div>
                      ) : (
                        /* TAB 2: STATION QUICK LOGIN */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {deviceAuth ? (
                            <div
                              style={{
                                padding: '0.6rem 0.8rem',
                                backgroundColor: '#f0fdfa',
                                border: '1px solid #99f6e4',
                                borderRadius: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#0f766e' }}>
                                  🏥 {deviceAuth.hospitalName} ({deviceAuth.hospitalCode})
                                </span>
                                <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem' }}>
                                  ● Authorized Station
                                </span>
                              </div>
                              <div style={{ fontSize: '0.74rem', color: '#1e293b', fontWeight: 700 }}>
                                👨‍⚕️ Registered Operator: {deviceAuth.technicianName}
                              </div>
                              <div style={{ fontSize: '0.64rem', color: '#64748b' }}>
                                Station ID: {deviceAuth.deviceFingerprint} · 100% Offline Clinical Scanning Ready
                              </div>
                            </div>
                          ) : (
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
                          )}

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
                                  setTechRecoveryId(deviceAuth?.technicianId || selectedTechId);
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
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMobileAuthTab('activate');
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
                                Switch / Re-pair Station
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
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

            {actSuccessMsg && (
              <div
                style={{
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #99f6e4',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  color: '#0f766e',
                  fontWeight: 700,
                }}
              >
                {actSuccessMsg}
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
          {!deviceLockout && recoveryMode === 'none' && !isSettingInitialPassword && (
            <div className="podoload-modal-footer" style={{ justifyContent: isMandatoryActivation ? 'flex-end' : 'space-between' }}>
              {!isMandatoryActivation && (
                <button type="button" className="podoload-btn-secondary" onClick={onClose}>
                  Cancel
                </button>
              )}
              {selectedRole === 'technician' && mobileAuthTab === 'activate' ? (
                <button
                  type="button"
                  className="podoload-btn-primary"
                  onClick={handleSwitchAccount}
                  disabled={isActivating}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Check className="w-4 h-4" />
                  <span>{isActivating ? 'Registering Device...' : '🚀 Authorize & Register Device'}</span>
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
                      : deviceAuth
                      ? `Log In as ${deviceAuth.technicianName} (Offline Ready)`
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
