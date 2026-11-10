import React, { useState, useEffect, useRef } from 'react';
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
  User,
  Laptop,
  Upload,
} from 'lucide-react';
import { SystemUserSession, dbService, APP_CURRENT_VERSION } from '../../services/dbService';
import { deviceBindingService } from '../../services/deviceBindingService';
import { TechnicianUser, AdminAccount, BoundDevice, DeviceLicense, DeviceAuthorizationToken } from '../../types';
import { PodoLoadDevicePaymentModal } from './PodoLoadDevicePaymentModal';

interface PodoLoadRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SystemUserSession;
  onSelectRole: (
    role: 'superadmin' | 'admin' | 'technician',
    customName?: string,
    technicianId?: string,
    hospitalId?: string,
    hospitalName?: string
  ) => void;
  onLogout?: () => void;
  isMandatoryActivation?: boolean;
  isSessionLocked?: boolean;
  activationReason?: 'unregistered' | 'new_device' | 'new_version' | 'revoked' | 'inactive_technician' | 'permit_expired';
  initialAdminMode?: boolean;
  initialSuperAdminMode?: boolean;
}

export const PodoLoadRoleModal: React.FC<PodoLoadRoleModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectRole,
  onLogout,
  isMandatoryActivation = false,
  isSessionLocked = false,
  activationReason,
  initialAdminMode = false,
  initialSuperAdminMode = false,
}) => {
  const isMobileDevice =
    Capacitor.isNativePlatform() ||
    (typeof navigator !== 'undefined' &&
      (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') ||
        (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent))));

  const isStationAdminAllowed = dbService.isStationAdminLoginAllowed();
  const allowAdminTabs = isStationAdminAllowed || initialAdminMode || initialSuperAdminMode;

  const technicians: TechnicianUser[] = dbService.getTechniciansSync();
  const [registeredAdmin, setRegisteredAdmin] = useState<AdminAccount>(() => dbService.getAdminAccountSync());
  const [isAdminContext, setIsAdminContext] = useState<boolean>(() => Boolean(initialAdminMode));
  const [selectedRole, setSelectedRole] = useState<'superadmin' | 'admin' | 'technician'>(
    initialSuperAdminMode
      ? 'superadmin'
      : initialAdminMode
      ? 'admin'
      : !allowAdminTabs
      ? 'technician'
      : currentUser.role === 'superadmin'
      ? 'superadmin'
      : isMobileDevice
      ? 'technician'
      : currentUser.role
  );
  const [selectedTechId, setSelectedTechId] = useState<string>(
    currentUser.technicianId || (technicians.length > 0 ? technicians[0].id : 'tech-user-01')
  );

  // Sync admin or superadmin mode when props change or modal opens
  useEffect(() => {
    if (initialSuperAdminMode) {
      setSelectedRole('superadmin');
    } else if (initialAdminMode) {
      setIsAdminContext(true);
      setSelectedRole('admin');
    } else if (allowAdminTabs && currentUser.role === 'superadmin') {
      setSelectedRole('superadmin');
    } else if (allowAdminTabs && currentUser.role === 'admin') {
      setSelectedRole('admin');
    } else {
      setIsAdminContext(false);
      setSelectedRole('technician');
    }
  }, [initialAdminMode, initialSuperAdminMode, currentUser.role, isOpen, allowAdminTabs]);

  // Discreet 5-tap header gesture tracking
  const [headerTapCount, setHeaderTapCount] = useState(0);
  const lastHeaderTapRef = useRef<number>(0);

  const handleHeaderTap = () => {
    const now = Date.now();
    if (now - lastHeaderTapRef.current < 700) {
      const next = headerTapCount + 1;
      if (next >= 5) {
        setIsAdminContext((prev) => {
          const toggled = !prev;
          setSelectedRole(toggled ? 'admin' : 'technician');
          setPinError(null);
          return toggled;
        });
        setHeaderTapCount(0);
      } else {
        setHeaderTapCount(next);
      }
    } else {
      setHeaderTapCount(1);
    }
    lastHeaderTapRef.current = now;
  };

  // Login Password states (starts empty, no default passwords exposed)
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [techPassword, setTechPassword] = useState<string>('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showTechPassword, setShowTechPassword] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Recovery views mode: 'none' | 'admin' | 'technician'
  const [recoveryMode, setRecoveryMode] = useState<'none' | 'admin' | 'technician'>('none');

  // Admin Recovery Form state
  const [adminRecoveryUser, setAdminRecoveryUser] = useState<string>(() => {
    return registeredAdmin?.username || dbService.getAdminAccountsListSync()[0]?.username || '';
  });
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
  const [actHospitalCode, setActHospitalCode] = useState(() => {
    return (
      dbService.getDeviceAuthorizationSync()?.hospitalCode ||
      dbService.getActiveHospitalSync()?.code ||
      dbService.getHospitalProfilesSync()[0]?.code ||
      ''
    );
  });
  const [actUsername, setActUsername] = useState(
    dbService.getDeviceAuthorizationSync()?.technicianUsername || ''
  );
  const [actActivationCode, setActActivationCode] = useState('');
  const [actPassword, setActPassword] = useState('');
  const [actPasswordConfirm, setActPasswordConfirm] = useState('');
  const [showActPassword, setShowActPassword] = useState(false);
  const [showActConfirmPassword, setShowActConfirmPassword] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [actSuccessMsg, setActSuccessMsg] = useState<string | null>(null);

  // Admin Login Credentials
  const [adminUsernameInput, setAdminUsernameInput] = useState<string>(() => {
    const acc = dbService.getAdminAccountSync();
    if (acc?.username) return acc.username;
    const list = dbService.getAdminAccountsListSync();
    return list[0]?.username || '';
  });

  // Super Admin Login Credentials (Global Vendor Authority)
  const [superAdminUsernameInput, setSuperAdminUsernameInput] = useState<string>(() => {
    const s = dbService.getSuperAdminAccountSync();
    return s?.username || 'superadmin@technomind.health';
  });
  const [superAdminPassword, setSuperAdminPassword] = useState<string>('');
  const [showSuperAdminPassword, setShowSuperAdminPassword] = useState<boolean>(false);

  // Technician Login User ID state (allows entering ANY assigned User ID)
  const [techUsernameInput, setTechUsernameInput] = useState<string>(() => {
    if (currentUser?.role === 'technician' && currentUser.name) {
      const t = dbService.getTechniciansSync().find((x) => x.name === currentUser.name);
      if (t) return t.username;
    }
    const bound = dbService.getDeviceAuthorizationSync();
    if (bound?.technicianUsername) {
      return bound.technicianUsername;
    }
    if (bound?.technicianId) {
      const t = dbService.getTechniciansSync().find((x) => x.id === bound.technicianId);
      if (t) return t.username;
    }
    const techs = dbService.getTechniciansSync();
    return techs[0]?.username || '';
  });

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

  // Prevent accidental Escape routing & support Ctrl+Shift+A for Admin Portal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        e.stopPropagation();
        setIsAdminContext((prev) => {
          const toggled = !prev;
          setSelectedRole(toggled ? 'admin' : 'technician');
          setPinError(null);
          return toggled;
        });
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        e.stopPropagation();
        setSelectedRole('superadmin');
        setPinError(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentActiveTech = technicians.find((t) => t.id === selectedTechId) || technicians[0];

  // Handle Account Authentication & Device Binding Check
  const handleSwitchAccount = () => {
    setPinError(null);
    setDeviceLockout(null);

    // 1. Super Administrator Master Authentication (Global Vendor Governance)
    if (selectedRole === 'superadmin') {
      if (!superAdminUsernameInput.trim()) {
        setPinError('Please enter Super Administrator Username or Email.');
        return;
      }
      if (!superAdminPassword.trim()) {
        setPinError('Please enter Super Administrator Master Password.');
        return;
      }
      const auth = dbService.authenticateSuperAdmin(superAdminUsernameInput.trim(), superAdminPassword);
      if (!auth.success || !auth.account) {
        setPinError(auth.error || 'Invalid Super Administrator credentials. Please verify your credentials and try again.');
        return;
      }
      onSelectRole('superadmin', auth.account.name);
      onClose();
      return;
    }

    if (selectedRole === 'admin') {
      if (!adminUsernameInput.trim()) {
        setPinError('Please enter your Administrator User ID / Username.');
        return;
      }
      if (!adminPassword.trim()) {
        setPinError('Please enter your Administrator Master Password.');
        return;
      }

      // 2. Validate Credentials strictly (both username and master password)
      const auth = dbService.authenticateAdmin(adminUsernameInput.trim(), adminPassword);
      if (!auth.success) {
        setPinError(auth.error || 'Incorrect Admin User ID or Master Password. Please check your credentials and try again.');
        return;
      }

      // 3. ENFORCE DEVICE BINDING & LICENSING (Single Device Restriction)
      const devCheck = dbService.checkDeviceAuthorization();

      if (devCheck.authorized) {
        // Current device is authorized!
        dbService.authorizeStationForAdmin(auth.account);
        onSelectRole('admin', auth.account?.name, undefined, auth.account?.hospitalId, auth.account?.hospitalName);
        onClose();
      } else if (devCheck.canAutoBind) {
        // Free seat available within quota! Automatically bind this station
        dbService.bindCurrentDevice();
        dbService.authorizeStationForAdmin(auth.account);
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
      // Technician authentication with User ID & Password
      const userToAuth = techUsernameInput.trim();
      const passToAuth = techPassword.trim();

      if (!userToAuth) {
        setPinError('Please enter your Technician User ID / Username (e.g. tech@technomind.health or kavita.rao).');
        return;
      }
      if (!passToAuth) {
        setPinError('Please enter your Technician Password / PIN.');
        return;
      }

      const authTech = dbService.authenticateTechnician(userToAuth, passToAuth);
      if (!authTech) {
        const allTechs = dbService.getTechniciansSync();
        const exists = allTechs.find(
          (t) =>
            t.username.toLowerCase() === userToAuth.toLowerCase() ||
            t.email?.toLowerCase() === userToAuth.toLowerCase()
        );
        if (!exists) {
          setPinError(`Technician User ID "${userToAuth}" not found. Please contact your Hospital Administrator.`);
        } else {
          setPinError(`Incorrect password for Technician User ID "${userToAuth}". Please try again or ask your Hospital Administrator to reset your password.`);
        }
        return;
      }

      setPinError(null);
      onSelectRole('technician', authTech.name, authTech.id, authTech.hospitalId, authTech.hospitalName);
      onClose();
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
      setPinError('Please enter your Station Activation Code (e.g. TMH-TECH-1001).');
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
      const currentHardware = deviceBindingService.getCurrentDeviceInfo();
      const res = await dbService.registerDeviceWithActivationCode({
        hospitalCode: actHospitalCode.trim(),
        username: actUsername.trim() || undefined,
        activationCode: actActivationCode.trim(),
        password: actPassword.trim() || undefined,
        macAddress: currentHardware.macAddress,
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
      <div
        className={isSessionLocked ? 'podoload-fullscreen-auth' : 'podoload-modal-backdrop'}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={
          isSessionLocked
            ? {
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              backgroundColor: '#09131f',
              backgroundImage:
                'radial-gradient(ellipse at 50% 15%, rgba(13, 148, 136, 0.22), transparent 60%), linear-gradient(180deg, #070e18 0%, #0c1827 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem 1rem',
              boxSizing: 'border-box',
              overflowY: 'auto',
            }
            : undefined
        }
      >
        {/* Brand Banner at Top of Login Screen (Only in Full-Screen Login) */}
        {isSessionLocked && (
          <div
            style={{
              maxWidth: '560px',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(13, 148, 136, 0.25)',
                  border: '1.5px solid #14b8a6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2dd4bf',
                }}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                  PodoPress
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span>Technomind Healthcare Systems</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>● 100% Offline Ready</span>
                </div>
              </div>
            </div>

            {typeof window !== 'undefined' && (window as any).electronAPI && (
              <button
                type="button"
                onClick={() => {
                  if ((window as any).electronAPI?.quitApp) {
                    (window as any).electronAPI.quitApp();
                  } else {
                    window.close();
                  }
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  borderRadius: '6px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
                title="Exit and completely quit PodoPress"
              >
                <span>⏻ Exit App</span>
              </button>
            )}
          </div>
        )}

        <div
          className="podoload-modal-box"
          style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: isSessionLocked
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.08)'
              : undefined,
            maxHeight: isSessionLocked ? '88vh' : '92vh',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="podoload-modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                onClick={handleHeaderTap}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                title="Clinical Station Security (Tap 5x for Master Administrator Portal)"
              >
                {isAdminContext ? (
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                ) : (
                  <KeyRound className="w-5 h-5 text-teal-600" />
                )}
              </div>
              <div>
                <h3
                  onClick={handleHeaderTap}
                  style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0c2328', cursor: 'pointer', userSelect: 'none' }}
                >
                  {recoveryMode === 'admin'
                    ? 'Hospital Administrator — Password Recovery'
                    : recoveryMode === 'technician'
                      ? 'Clinical Technician — Password Recovery (Admin Authorized)'
                      : deviceLockout
                        ? 'Device Binding Security Lockout'
                        : isMandatoryActivation
                          ? activationReason === 'new_device'
                            ? 'New Hardware Device Detected — Registration Required'
                            : 'Station Activation & Enrollment Required'
                          : isSessionLocked
                            ? 'Clinical Diagnostic Station Sign-In'
                            : isAdminContext
                              ? 'Hospital Administrator Portal'
                              : 'Clinical Technician Station Sign-In'}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                  {recoveryMode === 'admin'
                    ? 'Verify Security Recovery Key, Clinic Code, or registered phone/email to reset your Master Password'
                    : recoveryMode === 'technician'
                      ? 'Administrator authorization required to reset clinical technician credentials'
                      : deviceLockout
                        ? 'Single-device license policy active. Upgraded multi-device license required.'
                        : isMandatoryActivation
                          ? activationReason === 'new_device'
                            ? 'Security Policy: This physical hardware station is not yet registered. Enter your Clinic Code and Station Activation Voucher to authorize this terminal.'
                            : 'Security Policy: Enter your Clinic Code and Station Activation Voucher to authorize this station before proceeding with clinical examinations.'
                          : isSessionLocked
                            ? 'Select your role and authenticate with your assigned credentials to start a fresh clinical session.'
                            : isAdminContext
                              ? 'Authenticate with your Master Password for clinic administration, technician management, and system setup.'
                              : 'Sign in with your Technician User ID & Password assigned by your Hospital Administrator.'}
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
                    {activationReason === 'new_device'
                      ? 'New Hardware Device Detected — Station Authorization Required'
                      : 'Initial Device Registration Required'}
                  </strong>
                  <div style={{ marginTop: '2px', fontSize: '0.7rem', color: '#78350f', lineHeight: 1.4 }}>
                    {activationReason === 'new_device'
                      ? 'This physical device differs from the previously registered station. Enter your Clinic Code and Station Activation Code from your Hospital Administrator to bind this computer.'
                      : 'Please enter your Clinic Code and Station Activation Code provided by your Hospital Administrator to authorize this station.'}
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
            ) : (
              /* VIEW 3: THREE-TIER ROLE HIERARCHY (Super Admin -> Admin -> Technician) */
              <>
                {/* Role Tabs Switcher: Technician | Hospital Admin | Super Admin */}
                {!isMandatoryActivation && !deviceLockout && recoveryMode === 'none' && (
                  allowAdminTabs ? (
                    <div
                      style={{
                        display: 'flex',
                        gap: '0.35rem',
                        marginBottom: '0.65rem',
                        backgroundColor: '#f1f5f9',
                        padding: '4px',
                        borderRadius: '8px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRole('technician');
                          setIsAdminContext(false);
                          setPinError(null);
                        }}
                        style={{
                          flex: 1,
                          padding: '0.45rem 0.35rem',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: selectedRole === 'technician' ? '#ffffff' : 'transparent',
                          color: selectedRole === 'technician' ? '#0f766e' : '#64748b',
                          boxShadow: selectedRole === 'technician' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>🔬 Technician</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRole('admin');
                          setIsAdminContext(true);
                          setPinError(null);
                        }}
                        style={{
                          flex: 1,
                          padding: '0.45rem 0.35rem',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: selectedRole === 'admin' ? '#ffffff' : 'transparent',
                          color: selectedRole === 'admin' ? '#0f766e' : '#64748b',
                          boxShadow: selectedRole === 'admin' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>🏥 Clinic Admin</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRole('superadmin');
                          setIsAdminContext(false);
                          setPinError(null);
                        }}
                        style={{
                          flex: 1,
                          padding: '0.45rem 0.35rem',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          backgroundColor: selectedRole === 'superadmin' ? '#ffffff' : 'transparent',
                          color: selectedRole === 'superadmin' ? '#7e22ce' : '#64748b',
                          boxShadow: selectedRole === 'superadmin' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>🛡️ Super Admin</span>
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '0.65rem',
                        backgroundColor: '#f0fdfa',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #ccfbf1',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <UserCheck className="w-4 h-4 text-teal-600" />
                        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0f766e' }}>
                          Clinical Workstation · Technician Sign-In
                        </span>
                      </div>
                      <span className="podo-badge podo-badge-green" style={{ fontSize: '0.65rem' }}>
                        Station Kiosk
                      </span>
                    </div>
                  )
                )}

                {selectedRole === 'superadmin' ? (
                  /* Role 1: Super Administrator Governance (Master Vendor Authority) */
                  <div
                    style={{
                      padding: '0.95rem 1rem',
                      borderRadius: '8px',
                      border: '1.5px solid #a855f7',
                      backgroundColor: '#faf5ff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#f3e8ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#7e22ce',
                          }}
                        >
                          <ShieldAlert className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#581c87' }}>
                            Super Administrator Governance
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#6b21a8' }}>
                            Technomind Global Authority · Multi-Hospital Master Management
                          </div>
                        </div>
                      </div>
                      <span className="podo-badge" style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', fontWeight: 700, fontSize: '0.64rem' }}>
                        Master Vendor
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1fr',
                        gap: '0.65rem',
                        backgroundColor: '#ffffff',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid #e9d5ff',
                      }}
                    >
                      <div>
                        <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7e22ce', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '2px' }}>
                          <User className="w-3 h-3 text-purple-600" />
                          <span>Super Admin ID / Email *</span>
                        </label>
                        <input
                          type="text"
                          className="podoload-input"
                          placeholder="superadmin@technomind.health"
                          value={superAdminUsernameInput}
                          autoComplete="username"
                          onChange={(e) => {
                            setSuperAdminUsernameInput(e.target.value);
                            setPinError(null);
                          }}
                          style={{ fontSize: '0.76rem', padding: '0.25rem 0.5rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7e22ce', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '2px' }}>
                          <Lock className="w-3 h-3 text-purple-600" />
                          <span>Master Password *</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showSuperAdminPassword ? 'text' : 'password'}
                            className="podoload-input"
                            placeholder="••••••••"
                            value={superAdminPassword}
                            autoComplete="current-password"
                            onChange={(e) => {
                              setSuperAdminPassword(e.target.value);
                              setPinError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSwitchAccount();
                              }
                            }}
                            style={{ fontSize: '0.76rem', padding: '0.25rem 1.8rem 0.25rem 0.5rem' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowSuperAdminPassword(!showSuperAdminPassword)}
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
                            {showSuperAdminPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : selectedRole === 'admin' ? (
                  /* Account 1: Hospital Administrator (Clinic Admin Context) */
                  <div
                    style={{
                      padding: '0.95rem 1rem',
                      borderRadius: '8px',
                      border: '1.5px solid #0d9488',
                      backgroundColor: '#f0fdfa',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
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
                            Hospital Administrator Portal
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {registeredAdmin
                              ? `${registeredAdmin.username} · ${registeredAdmin.name}`
                              : 'Hospital Administrator Sign-In'}
                          </div>
                        </div>
                      </div>
                      <span className="podo-badge podo-badge-green" style={{ fontSize: '0.64rem' }}>
                        Master Access
                      </span>
                    </div>

                    {(!registeredAdmin && dbService.getAdminAccountsListSync().length === 0) && (
                      <div
                        style={{
                          backgroundColor: '#fefce8',
                          border: '1px solid #fef08a',
                          borderRadius: '6px',
                          padding: '0.45rem 0.65rem',
                          fontSize: '0.7rem',
                          color: '#854d0e',
                          lineHeight: 1.4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                        }}
                      >
                        <div>
                          <strong>First-Time Setup Notice:</strong> No local Clinic Administrator has been registered yet on this station. Please log in using the <strong>Super Admin</strong> tab (top right) or enter Super Admin Master Password (<code>superadmin@123</code>).
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRole('superadmin');
                            setPinError(null);
                          }}
                          style={{
                            flexShrink: 0,
                            backgroundColor: '#0f766e',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.25rem 0.55rem',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Super Admin →
                        </button>
                      </div>
                    )}

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1fr',
                        gap: '0.65rem',
                        backgroundColor: '#ffffff',
                        padding: '0.6rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid #ccfbf1',
                      }}
                    >
                      <div>
                        <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '2px' }}>
                          <User className="w-3 h-3 text-teal-600" />
                          <span>Admin User ID / Username *</span>
                        </label>
                        <input
                          type="text"
                          className="podoload-input"
                          placeholder="Enter Admin User ID"
                          value={adminUsernameInput}
                          autoComplete="username"
                          onChange={(e) => {
                            setAdminUsernameInput(e.target.value);
                            setPinError(null);
                          }}
                          style={{ fontSize: '0.76rem', padding: '0.25rem 0.5rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '2px' }}>
                          <Lock className="w-3 h-3 text-teal-600" />
                          <span>Master Password *</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type={showAdminPassword ? 'text' : 'password'}
                            className="podoload-input"
                            placeholder="••••••••"
                            value={adminPassword}
                            autoComplete="current-password"
                            onChange={(e) => {
                              setAdminPassword(e.target.value);
                              setPinError(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSwitchAccount();
                              }
                            }}
                            style={{ fontSize: '0.76rem', padding: '0.25rem 1.8rem 0.25rem 0.5rem' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminPassword(!showAdminPassword)}
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
                    </div>
                  </div>
                ) : (
                  /* Account 2: Clinical Technician (Default Normal Flow - Zero Admin Clutter) */
                  <div
                    onClick={() => {
                      setSelectedRole('technician');
                      setPinError(null);
                    }}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      border: '1.5px solid #0d9488',
                      backgroundColor: '#f0fdfa',
                      cursor: 'default',
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
                              <span>Device Registration &amp; Offline-First Authorization</span>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.4 }}>
                              Enter your Clinic Code, Username, and Station Activation Code. This binds this physical terminal (MAC address) to your account for <strong>100% offline clinical operation</strong>.
                            </div>

                            {/* Detected Hardware Identity Badge */}
                            {(() => {
                              const hw = deviceBindingService.getCurrentDeviceInfo();
                              return (
                                <div
                                  style={{
                                    backgroundColor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    padding: '0.35rem 0.6rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '0.35rem',
                                    fontSize: '0.66rem',
                                    color: '#334155',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <Laptop className="w-3.5 h-3.5 text-teal-600" />
                                    <span>Station ID:</span>
                                    <code style={{ fontWeight: 800, color: '#0f766e' }}>{hw.id}</code>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span>MAC:</span>
                                    <code style={{ fontWeight: 800, color: '#0f766e' }}>{hw.macAddress}</code>
                                    <span className="podo-badge podo-badge-gray" style={{ fontSize: '0.58rem' }}>{hw.platform.split(' ')[0]}</span>
                                  </div>
                                </div>
                              );
                            })()}

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
                                  Technician Username / User ID
                                </label>
                                <input
                                  type="text"
                                  className="podoload-input"
                                  style={{ fontSize: '0.76rem' }}
                                  placeholder="e.g. tech@technomind.health"
                                  value={actUsername}
                                  onChange={(e) => setActUsername(e.target.value)}
                                />
                              </div>
                            </div>

                            <div>
                              <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '2px' }}>
                                Station Activation Code *
                              </label>
                              <input
                                type="text"
                                className="podoload-input"
                                style={{ fontSize: '0.76rem', textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 800, color: '#0f766e' }}
                                placeholder="e.g. TMH-TECH-1001"
                                value={actActivationCode}
                                onChange={(e) => setActActivationCode(e.target.value.toUpperCase())}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleActivateDevice(e);
                                  }
                                }}
                                required
                              />
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
                                    autoComplete="new-password"
                                    onChange={(e) => setActPassword(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleActivateDevice(e);
                                      }
                                    }}
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
                                    autoComplete="new-password"
                                    onChange={(e) => setActPasswordConfirm(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleActivateDevice(e);
                                      }
                                    }}
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

                            {/* Offline Clinic Setup / License Backup Import */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.25rem', borderTop: '1px dashed #cbd5e1' }}>
                              <label
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  fontSize: '0.68rem',
                                  color: '#0f766e',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  textDecoration: 'underline',
                                }}
                              >
                                <Upload className="w-3.5 h-3.5 text-teal-600" />
                                <span>📂 Import Clinic Setup / License Backup (.json)</span>
                                <input
                                  type="file"
                                  accept=".json"
                                  style={{ display: 'none' }}
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                      const text = await file.text();
                                      const res = await dbService.importPlatformBackup(text);
                                      if (res.success && res.counts) {
                                        setActSuccessMsg(`✓ Successfully imported clinic setup! (${res.counts.hospitals} clinics, ${res.counts.technicians} technicians loaded).`);
                                        const hosps = dbService.getHospitalProfilesSync();
                                        if (hosps[0]) {
                                          setActHospitalCode(hosps[0].code);
                                        }
                                        const techs = dbService.getTechniciansSync();
                                        if (techs[0]) {
                                          setActUsername(techs[0].username);
                                          if (techs[0].activationCode) {
                                            setActActivationCode(techs[0].activationCode);
                                          }
                                        }
                                      } else {
                                        setPinError(res.error || 'Failed to import backup file.');
                                      }
                                    } catch (err) {
                                      setPinError('Error reading backup file: ' + (err as Error).message);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        ) : (
                          /* TAB 2: STATION QUICK LOGIN */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                            {deviceAuth && (
                              <div
                                style={{
                                  padding: '0.5rem 0.75rem',
                                  backgroundColor: '#f0fdfa',
                                  border: '1px solid #99f6e4',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  flexWrap: 'wrap',
                                  gap: '0.4rem',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0f766e' }}>
                                    🏥 {deviceAuth.hospitalName} ({deviceAuth.hospitalCode})
                                  </span>
                                  <span className="podo-badge podo-badge-green" style={{ fontSize: '0.6rem' }}>
                                    ● Authorized Diagnostic Station
                                  </span>
                                </div>
                                <span style={{ fontSize: '0.64rem', color: '#64748b' }}>
                                  100% Offline Clinical Scanning Ready
                                </span>
                              </div>
                            )}

                            {/* 2-Column Grid: Technician User ID & Password Input */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1.2fr 1fr',
                                gap: '0.65rem',
                                backgroundColor: '#ffffff',
                                padding: '0.6rem 0.75rem',
                                borderRadius: '6px',
                                border: '1px solid #ccfbf1',
                              }}
                            >
                              <div>
                                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '2px' }}>
                                  <User className="w-3 h-3 text-teal-600" />
                                  <span>Technician User ID / Username *</span>
                                </label>
                                <input
                                  type="text"
                                  className="podoload-input"
                                  placeholder="e.g. tech@technomind.health or kavita.rao"
                                  value={techUsernameInput}
                                  autoComplete="username"
                                  onChange={(e) => {
                                    setTechUsernameInput(e.target.value);
                                    setPinError(null);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{ fontSize: '0.76rem', padding: '0.25rem 0.5rem' }}
                                />
                              </div>

                              <div>
                                <label style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '2px' }}>
                                  <Lock className="w-3 h-3 text-teal-600" />
                                  <span>Password / PIN *</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                  <input
                                    type={showTechPassword ? 'text' : 'password'}
                                    className="podoload-input"
                                    placeholder="••••••••"
                                    value={techPassword}
                                    autoComplete="current-password"
                                    onChange={(e) => {
                                      setTechPassword(e.target.value);
                                      setPinError(null);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSwitchAccount();
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ fontSize: '0.76rem', padding: '0.25rem 1.8rem 0.25rem 0.5rem' }}
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
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRecoveryMode('technician');
                                  setPinError(null);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  fontSize: '0.68rem',
                                  color: '#0f766e',
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                              >
                                <KeyRound className="w-3 h-3 text-teal-600" />
                                <span>🔑 Forgot Password? Reset via Admin</span>
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
                                  color: '#64748b',
                                  textDecoration: 'underline',
                                  cursor: 'pointer',
                                }}
                              >
                                Switch / Re-pair Station
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {pinError && (
              <div
                style={{
                  padding: '0.55rem 0.75rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  color: '#b91c1c',
                  fontWeight: 600,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                <div>{pinError}</div>
                {pinError.includes('Incorrect password') && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '2px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecoveryMode('technician');
                        setPinError(null);
                      }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #f87171',
                        borderRadius: '4px',
                        padding: '0.25rem 0.55rem',
                        fontSize: '0.68rem',
                        color: '#b91c1c',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <KeyRound className="w-3 h-3 text-red-600" />
                      <span>🔑 Reset Password with Administrator Authorization</span>
                    </button>
                  </div>
                )}
                {(pinError.includes('locked') || pinError.includes('consecutive failed attempts')) && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dbService.clearAdminLockout();
                        setPinError(null);
                      }}
                      style={{
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.68rem',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <span>⚡ Instant Unlock / Reset Lockout</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        dbService.clearAdminLockout();
                        setSelectedRole('superadmin');
                        setPinError(null);
                      }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #dc2626',
                        borderRadius: '4px',
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.68rem',
                        color: '#dc2626',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <ShieldCheck className="w-3 h-3 text-red-600" />
                      <span>Switch to Super Admin Portal →</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecoveryMode('admin');
                        setPinError(null);
                      }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.68rem',
                        color: '#475569',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <KeyRound className="w-3 h-3 text-slate-600" />
                      <span>Use Recovery Key / Reset Password</span>
                    </button>
                  </div>
                )}
                {pinError.includes('Super Admin') && !pinError.includes('locked') && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '2px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRole('superadmin');
                        setPinError(null);
                      }}
                      style={{
                        background: '#0f766e',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.68rem',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <ShieldCheck className="w-3 h-3 text-white" />
                      <span>Switch to Super Admin Tab →</span>
                    </button>
                  </div>
                )}
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
          {!deviceLockout && recoveryMode === 'none' && (
            <div className="podoload-modal-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              {/* Modal Actions Footer: Close/Exit on Left, Primary Auth on Right */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                {!isMandatoryActivation && (
                  <button
                    type="button"
                    className="podoload-btn-secondary"
                    onClick={onClose}
                    style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    title="Close this window and enter Standby mode"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Close Window</span>
                  </button>
                )}

                {!isAdminContext && !isMandatoryActivation && allowAdminTabs && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminContext(true);
                      setSelectedRole('admin');
                      setPinError(null);
                    }}
                    style={{
                      background: 'none',
                      border: '1px solid #ccfbf1',
                      backgroundColor: '#f0fdfa',
                      color: '#0f766e',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                    }}
                    title="Switch to Hospital Administrator Login (Master Password)"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>Admin Portal</span>
                  </button>
                )}

                {isAdminContext && !isMandatoryActivation && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminContext(false);
                      setSelectedRole('technician');
                      setPinError(null);
                    }}
                    style={{
                      background: 'none',
                      border: '1px solid #e2e8f0',
                      color: '#64748b',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                    }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Technician Login</span>
                  </button>
                )}

                {typeof window !== 'undefined' && ((window as any).electronAPI || (window as any).__TAURI__ || window.navigator.userAgent.includes('Electron')) && (
                  <button
                    type="button"
                    onClick={() => {
                      if ((window as any).electronAPI?.quitApp) {
                        (window as any).electronAPI.quitApp();
                      } else {
                        window.close();
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '0.25rem 0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                    title="Exit and completely quit PodoPress application"
                  >
                    <span>⏻ Exit App</span>
                  </button>
                )}
              </div>

              {selectedRole === 'superadmin' ? (
                <button
                  type="button"
                  className="podoload-btn-primary"
                  onClick={handleSwitchAccount}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#7e22ce' }}
                >
                  <Check className="w-4 h-4" />
                  <span>Sign In as Super Administrator</span>
                </button>
              ) : selectedRole === 'admin' || isAdminContext ? (
                <button
                  type="button"
                  className="podoload-btn-primary"
                  onClick={handleSwitchAccount}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Check className="w-4 h-4" />
                  <span>Log In as Hospital Administrator</span>
                </button>
              ) : (
                mobileAuthTab === 'activate' ? (
                  <button
                    type="button"
                    className="podoload-btn-primary"
                    onClick={handleActivateDevice}
                    disabled={isActivating || Boolean(actSuccessMsg)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {isActivating
                        ? 'Registering Device...'
                        : actSuccessMsg
                          ? '✓ Registered! Logging in...'
                          : '🚀 Authorize & Register Device'}
                    </span>
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
                      {techUsernameInput.trim()
                        ? `Log In as ${techUsernameInput.trim()}`
                        : 'Log In as Clinical Technician'}
                    </span>
                  </button>
                )
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
