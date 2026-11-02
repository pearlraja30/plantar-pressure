import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building2,
  Upload,
  Trash2,
  CheckCircle2,
  UserCheck,
  ShieldCheck,
  FileText,
  Plus,
  RefreshCw,
  LogOut,
  Hospital,
  Stethoscope,
  Users,
  KeyRound,
  Lock,
  ArrowRightLeft,
  Search,
  ExternalLink,
  Calendar,
  Check,
  AlertCircle,
  Laptop,
  CreditCard,
  Download,
  Key,
  ShieldAlert,
  X,
  Eye,
  EyeOff,
  Smartphone,
  Copy,
  RotateCw,
  QrCode,
  Share2,
  Send,
  Mail,
  MessageSquare,
  Printer,
  Cloud,
  Clock,
  Sliders,
} from 'lucide-react';
import { HospitalProfile, HospitalDoctor, HospitalTechnician, TechnicianUser, Patient, AnalysisCase, BoundDevice, DeviceLicense, AdminAccount, AuditEvent, VoucherExpiryPolicy, VoucherExpiryUnit } from '../../types';
import { dbService, DEFAULT_VOUCHER_EXPIRY_POLICY, formatVoucherPolicyLabel, formatRemainingTime } from '../../services/dbService';
import { deviceBindingService } from '../../services/deviceBindingService';
import { diagnosticsLogger, DiagnosticErrorLog } from '../../services/diagnosticsLogger';
import { PodoLoadDevicePaymentModal } from './PodoLoadDevicePaymentModal';

interface PodoLoadAdminProps {
  patients?: Patient[];
  cases?: AnalysisCase[];
  onHospitalChanged?: (hospital: HospitalProfile) => void;
  onNavigateToReport?: () => void;
  onNavigateToRegistration?: () => void;
  onSelectPatient?: (patient: Patient) => void;
  onSelectReport?: (caseId: string, viewStep?: 4 | 5) => void;
  onSwitchUser?: (
    role: 'admin' | 'technician',
    name?: string,
    techId?: string,
    hospId?: string,
    hospName?: string
  ) => void;
  onRefreshData?: () => void;
}

export const PodoLoadAdmin: React.FC<PodoLoadAdminProps> = ({
  patients = [],
  cases = [],
  onHospitalChanged,
  onNavigateToReport,
  onNavigateToRegistration,
  onSelectPatient,
  onSelectReport,
  onSwitchUser,
  onRefreshData,
}) => {
  const [localPatients, setLocalPatients] = useState<Patient[]>(patients);
  const [localCases, setLocalCases] = useState<AnalysisCase[]>(cases);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setLocalPatients(patients);
  }, [patients]);

  useEffect(() => {
    setLocalCases(cases);
  }, [cases]);

  const [hospitals, setHospitals] = useState<HospitalProfile[]>(() => dbService.getHospitalProfilesSync());
  const [activeHospital, setActiveHospital] = useState<HospitalProfile>(() => dbService.getActiveHospitalSync());
  const [activeTab, setActiveTab] = useState<
    'branding' | 'technicians' | 'hospital_patients' | 'devices' | 'hospitals' | 'staff' | 'security'
  >('branding');

  // Device Binding & Multi-Device License State
  const [boundDevices, setBoundDevices] = useState<BoundDevice[]>(() => dbService.getBoundDevicesSync());
  const [deviceLicense, setDeviceLicense] = useState<DeviceLicense>(() => dbService.getDeviceLicenseSync());
  const [currentDevice, setCurrentDevice] = useState<BoundDevice>(() => dbService.getCurrentDeviceSync());
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [showVoucherRedeem, setShowVoucherRedeem] = useState(false);
  const [voucherInput, setVoucherInput] = useState('');
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');

  // Diagnostics & Error Logs State (IEC 62304 / ISO 13485)
  const [diagnosticLogs, setDiagnosticLogs] = useState<DiagnosticErrorLog[]>(() => diagnosticsLogger.getErrorLogs());
  const [selectedDetailLog, setSelectedDetailLog] = useState<DiagnosticErrorLog | null>(null);

  // Admin Profile & User ID Configuration State
  const [adminAccount, setAdminAccount] = useState<AdminAccount>(() => dbService.getAdminAccountSync());
  const [desiredAdminUsername, setDesiredAdminUsername] = useState(adminAccount.username);
  const [desiredAdminName, setDesiredAdminName] = useState(adminAccount.name);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(() => dbService.getAuditLogsSync());

  // Form states for the currently selected hospital
  const [name, setName] = useState(activeHospital.name);
  const [code, setCode] = useState(activeHospital.code);
  const [department, setDepartment] = useState(activeHospital.department || '');
  const [registrationNo, setRegistrationNo] = useState(activeHospital.registrationNo || '');
  const [logoUrl, setLogoUrl] = useState<string>(activeHospital.logoUrl || '');
  const [logoPosition, setLogoPosition] = useState<'Left' | 'Centre' | 'Right'>(activeHospital.logoPosition || 'Left');
  const [address, setAddress] = useState(activeHospital.address || '');
  const [contact, setContact] = useState(activeHospital.contact || '');
  const [email, setEmail] = useState(activeHospital.email || '');
  const [website, setWebsite] = useState(activeHospital.website || '');
  const [defaultDoctor, setDefaultDoctor] = useState(activeHospital.defaultDoctor || 'Dr. Specialist');
  const [defaultTechnician, setDefaultTechnician] = useState(activeHospital.defaultTechnician || '');
  const [footerText, setFooterText] = useState(activeHospital.footerText || '');

  // Staff lists
  const [doctors, setDoctors] = useState<HospitalDoctor[]>(activeHospital.doctors || []);
  const [technicians, setTechnicians] = useState<HospitalTechnician[]>(activeHospital.technicians || []);

  // Technician Logins state
  const [techniciansList, setTechniciansList] = useState<TechnicianUser[]>(() => dbService.getTechniciansSync());
  const [showAddTech, setShowAddTech] = useState(false);
  const [newTechName, setNewTechName] = useState('');
  const [newTechUsername, setNewTechUsername] = useState('');
  const [newTechPin, setNewTechPin] = useState('');
  const [showNewTechPin, setShowNewTechPin] = useState(false);
  const [newTechHospitalId, setNewTechHospitalId] = useState(activeHospital.id);
  const [newTechPhone, setNewTechPhone] = useState('');
  const [newTechEmail, setNewTechEmail] = useState('');
  const [newTechNotes, setNewTechNotes] = useState('');

  // Admin Technician Password Maintenance State
  const [visibleTechPasswords, setVisibleTechPasswords] = useState<{ [id: string]: boolean }>({});
  const [editingTechPassword, setEditingTechPassword] = useState<TechnicianUser | null>(null);
  const [techEditPasswordVal, setTechEditPasswordVal] = useState('');
  const [showTechEditPasswordVal, setShowTechEditPasswordVal] = useState(false);
  const [techPasswordModalError, setTechPasswordModalError] = useState<string | null>(null);

  // Activation Voucher & Mobile Pairing State
  const [voucherTech, setVoucherTech] = useState<TechnicianUser | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [hubSelectedTechId, setHubSelectedTechId] = useState<string>(
    techniciansList.length > 0 ? techniciansList[0].id : 'tech-user-01'
  );

  // Configurable Voucher Expiry & Rotation Policy State (Hours / Days / Minutes / Custom)
  const [expiryPolicy, setExpiryPolicy] = useState<VoucherExpiryPolicy>(() => dbService.getVoucherExpiryPolicySync());
  const [policyDurationInput, setPolicyDurationInput] = useState<number>(expiryPolicy.duration);
  const [policyUnitInput, setPolicyUnitInput] = useState<VoucherExpiryUnit>(expiryPolicy.unit);
  const [policyAutoRotate, setPolicyAutoRotate] = useState<boolean>(expiryPolicy.autoRotateOnExpiry);
  const [policyFeedbackMsg, setPolicyFeedbackMsg] = useState<string | null>(null);
  const [showPolicyConfig, setShowPolicyConfig] = useState(false);
  const [applyToExisting, setApplyToExisting] = useState(true);

  // Hospital-wise Patient Details filtering state
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState<string>('ALL');
  const [patientFilterSearch, setPatientFilterSearch] = useState<string>('');
  const [reassigningPatient, setReassigningPatient] = useState<Patient | null>(null);
  const [targetReassignHospitalId, setTargetReassignHospitalId] = useState<string>(activeHospital.id);

  // New staff modal inputs
  const [newDocName, setNewDocName] = useState('');
  const [newDocSpec, setNewDocSpec] = useState('Consultant Podiatrist');
  const [newDocLic, setNewDocLic] = useState('');
  const [showAddDoc, setShowAddDoc] = useState(false);

  // New hospital modal inputs
  const [showAddHosp, setShowAddHosp] = useState(false);
  const [newHospName, setNewHospName] = useState('');
  const [newHospCode, setNewHospCode] = useState('');

  // Status feedback
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Reload form values when activeHospital changes
  useEffect(() => {
    setName(activeHospital.name);
    setCode(activeHospital.code);
    setDepartment(activeHospital.department || '');
    setRegistrationNo(activeHospital.registrationNo || '');
    setLogoUrl(activeHospital.logoUrl || '');
    setLogoPosition(activeHospital.logoPosition || 'Left');
    setAddress(activeHospital.address || '');
    setContact(activeHospital.contact || '');
    setEmail(activeHospital.email || '');
    setWebsite(activeHospital.website || '');
    setDefaultDoctor(activeHospital.defaultDoctor || 'Dr. Specialist');
    setDefaultTechnician(activeHospital.defaultTechnician || '');
    setFooterText(activeHospital.footerText || '');
    setDoctors(activeHospital.doctors || []);
    setTechnicians(activeHospital.technicians || []);
  }, [activeHospital]);

  // Handle Logo Upload from local machine
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setLogoUrl(reader.result);
          setSaveSuccess('✓ Logo image loaded. Click "Save Configurations" to persist.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove logo
  const handleRemoveLogo = () => {
    setLogoUrl('');
    if (logoInputRef.current) logoInputRef.current.value = '';
    setSaveSuccess('Logo removed. Click "Save Configurations" to persist.');
  };

  // Save hospital profile and branding updates
  const handleSaveHospital = async () => {
    const updated: HospitalProfile = {
      ...activeHospital,
      name: name.trim() || 'Technomind Healthcare Systems',
      code: code.trim().toUpperCase() || 'TMH-MAIN',
      department: department.trim(),
      registrationNo: registrationNo.trim(),
      logoUrl,
      logoPosition,
      address: address.trim(),
      contact: contact.trim(),
      email: email.trim(),
      website: website.trim(),
      defaultDoctor,
      defaultTechnician,
      footerText: footerText.trim(),
      doctors,
      technicians,
    };

    await dbService.saveHospitalProfile(updated);
    setActiveHospital(updated);
    setHospitals(dbService.getHospitalProfilesSync());

    if (onHospitalChanged) {
      onHospitalChanged(updated);
    }

    setSaveSuccess('✓ Hospital branding & profile persisted in Inbuilt Database!');
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  // Switch between hospitals
  const handleSwitchHospital = (hospId: string) => {
    const target = dbService.setActiveHospitalIdSync(hospId);
    setActiveHospital(target);
    setHospitals(dbService.getHospitalProfilesSync());

    if (onHospitalChanged) {
      onHospitalChanged(target);
    }

    setSaveSuccess(`✓ Switched active clinical facility to: ${target.name}`);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  // Add new hospital profile
  const handleRegisterHospital = async () => {
    if (!newHospName.trim() || !newHospCode.trim()) {
      alert('Please enter both hospital name and hospital code');
      return;
    }

    const newHosp: HospitalProfile = {
      id: `hosp-${Date.now()}`,
      name: newHospName.trim(),
      code: newHospCode.trim().toUpperCase(),
      logoPosition: 'Left',
      address: '',
      contact: '',
      email: '',
      registrationNo: 'NABH-ACCREDITED',
      department: 'Department of Podiatry & Orthotics',
      defaultDoctor: 'Dr. Specialist',
      defaultTechnician: 'Tech. Specialist',
      footerText: `Affiliated with ${newHospName.trim()} · Plantar Pressure Analysis System`,
      doctors: [{ id: 'doc-01', name: 'Dr. Specialist', specialization: 'Podiatrist', licenseNo: 'MED-9021' }],
      technicians: [{ id: 'tech-01', name: 'Tech. Specialist', staffId: 'TECH-001' }],
    };

    await dbService.saveHospitalProfile(newHosp);
    dbService.setActiveHospitalIdSync(newHosp.id);
    setActiveHospital(newHosp);
    setHospitals(dbService.getHospitalProfilesSync());
    setShowAddHosp(false);
    setNewHospName('');
    setNewHospCode('');

    if (onHospitalChanged) {
      onHospitalChanged(newHosp);
    }

    setSaveSuccess(`✓ Registered and logged into: ${newHosp.name}`);
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  // Add Doctor to Staff
  const handleAddDoctor = () => {
    if (!newDocName.trim()) return;
    const newDoc: HospitalDoctor = {
      id: `doc-${Date.now()}`,
      name: newDocName.trim(),
      specialization: newDocSpec.trim(),
      licenseNo: newDocLic.trim() || 'REG-PENDING',
    };
    const updated = [...doctors, newDoc];
    setDoctors(updated);
    setNewDocName('');
    setNewDocLic('');
    setShowAddDoc(false);
  };

  // =========================================================================
  // TECHNICIAN LOGIN MANAGEMENT (ADMIN CREATION & ROLE ASSIGNMENT)
  // =========================================================================

  const handleAddTechnician = async () => {
    if (!newTechName.trim() || !newTechUsername.trim()) {
      alert('Please provide technician full name and desired User ID / username');
      return;
    }

    const assignedHosp = hospitals.find((h) => h.id === newTechHospitalId) || activeHospital;
    const generatedPass = 'Tech' + Math.floor(1000 + Math.random() * 9000);
    const timedVoucher = dbService.generateTimedActivationCode(assignedHosp.code || 'TMH');

    const newTech: TechnicianUser = {
      id: `tech-${Date.now()}`,
      name: newTechName.trim(),
      username: newTechUsername.trim().toLowerCase(),
      pin: newTechPin.trim() || generatedPass,
      hospitalId: assignedHosp.id,
      hospitalName: assignedHosp.name,
      role: 'technician',
      status: 'active',
      createdAt: new Date().toISOString(),
      phone: newTechPhone.trim(),
      email: newTechEmail.trim(),
      notes: newTechNotes.trim(),
      recoveryKey: 'REC-TECH-' + Math.floor(1000 + Math.random() * 9000),
      activationCode: timedVoucher.code,
      activationCodeGeneratedAt: timedVoucher.generatedAt,
      activationCodeExpiresAt: timedVoucher.expiresAt,
      isRegisteredOnDevice: false,
    };

    await dbService.saveTechnician(newTech);
    const updatedList = dbService.getTechniciansSync();
    setTechniciansList(updatedList);
    setAuditLogs(dbService.getAuditLogsSync());
    setHubSelectedTechId(newTech.id);
    setShowAddTech(false);
    setNewTechName('');
    setNewTechUsername('');
    setNewTechPin('');
    setShowNewTechPin(false);
    setNewTechPhone('');
    setNewTechEmail('');
    setNewTechNotes('');

    setSaveSuccess(`✓ Technician login created for "${newTech.name}". User ID: ${newTech.username} | Voucher: ${timedVoucher.code} (Valid for ${timedVoucher.policyLabel})`);
    setTimeout(() => setSaveSuccess(null), 5000);
  };

  const handleCopyText = (text: string, label: string) => {
    try {
      navigator.clipboard?.writeText(text);
      setCopiedLabel(label);
      setTimeout(() => setCopiedLabel(null), 2200);
    } catch {
      // Fallback
    }
  };

  const handleSaveExpiryPolicy = async (customDuration?: number, customUnit?: VoucherExpiryUnit) => {
    const dur = Math.max(1, Number(customDuration !== undefined ? customDuration : policyDurationInput));
    const unit = customUnit || policyUnitInput;
    const updated = await dbService.saveVoucherExpiryPolicy({
      duration: dur,
      unit,
      autoRotateOnExpiry: policyAutoRotate,
    });
    setExpiryPolicy(updated);
    setPolicyDurationInput(updated.duration);
    setPolicyUnitInput(updated.unit);

    if (applyToExisting) {
      const refreshedTechs = dbService.applyExpiryPolicyToAllTechnicians(updated);
      setTechniciansList(refreshedTechs);
    } else {
      setTechniciansList(dbService.getTechniciansSync());
    }

    setAuditLogs(dbService.getAuditLogsSync());
    setPolicyFeedbackMsg(`✓ Expiry policy saved! Vouchers will now expire after ${formatVoucherPolicyLabel(updated)}.`);
    setTimeout(() => setPolicyFeedbackMsg(null), 5000);
  };

  const handleApplyPresetPolicy = async (duration: number, unit: VoucherExpiryUnit) => {
    setPolicyDurationInput(duration);
    setPolicyUnitInput(unit);
    await handleSaveExpiryPolicy(duration, unit);
  };

  const handleSaveTechPassword = async () => {
    if (!editingTechPassword) return;
    if (!techEditPasswordVal.trim() || techEditPasswordVal.trim().length < 4) {
      setTechPasswordModalError('Technician password must be at least 4 characters long.');
      return;
    }

    await dbService.updateTechnicianPassword(editingTechPassword.id, techEditPasswordVal.trim());
    setTechniciansList(dbService.getTechniciansSync());
    setSaveSuccess(`✓ Password successfully updated for technician "${editingTechPassword.name}".`);
    setEditingTechPassword(null);
    setTechEditPasswordVal('');
    setTechPasswordModalError(null);
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  const handleToggleTechStatus = async (tech: TechnicianUser) => {
    const updated: TechnicianUser = {
      ...tech,
      status: tech.status === 'active' ? 'inactive' : 'active',
    };
    await dbService.saveTechnician(updated);
    setTechniciansList(dbService.getTechniciansSync());
    setSaveSuccess(`✓ Technician ${tech.name} status updated to: ${updated.status}`);
    setTimeout(() => setSaveSuccess(null), 2500);
  };

  const handleCopyActivationCode = (code: string, id: string) => {
    try {
      navigator.clipboard?.writeText(code);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2200);
    } catch {
      // Fallback
    }
  };

  const handleRegenerateActivationCode = async (tech: TechnicianUser) => {
    const updated = dbService.rotateTechnicianActivationCode(tech.id);
    if (updated) {
      setTechniciansList(dbService.getTechniciansSync());
      setAuditLogs(dbService.getAuditLogsSync());
      setSaveSuccess(`✓ Activation code rotated for "${tech.name}": ${updated.activationCode}. Valid for ${formatVoucherPolicyLabel(expiryPolicy)}.`);
      setTimeout(() => setSaveSuccess(null), 3500);
    }
  };

  const handleSaveAdminProfile = () => {
    if (!desiredAdminUsername.trim()) {
      alert('Admin User ID cannot be empty');
      return;
    }
    const updated = dbService.updateAdminUsername(desiredAdminUsername.trim(), desiredAdminName.trim());
    setAdminAccount(updated);
    setAuditLogs(dbService.getAuditLogsSync());
    setSaveSuccess(`✓ Admin User ID updated to "${updated.username}". Future logins require this User ID.`);
    setTimeout(() => setSaveSuccess(null), 4000);
  };

  const getShareableVoucherText = (tech: TechnicianUser) => {
    const hosp = hospitals.find((h) => h.id === tech.hospitalId) || activeHospital;
    return `🏥 PodoPress Diagnostic Station — Technician App Login Credentials
Facility: ${hosp.name}
Authorized Technician: ${tech.name}

==================================================
STEP 1: DEVICE ENROLLMENT (First-Time / New Install)
1. Open PodoPress on your Android (.apk), iOS, or Windows (.exe) terminal.
2. Select "Activate Device with Code".
3. Hospital / Clinic Code: ${hosp.code}
4. Activation Voucher Code: ${tech.activationCode || 'TMH-TECH-1001'}
5. Set Quick Access Password: ${tech.pin || '1234'}

STEP 2: RETURNING STATION SESSIONS
- Login ID / Username: ${tech.username}
- Password / PIN: ${tech.pin || '1234'}
==================================================
✓ 100% Offline Diagnostic Scanning Enabled.
✓ Examinations automatically sync when connected to Clinic Wi-Fi.`;
  };

  const handleShareVoucherWhatsApp = (tech: TechnicianUser) => {
    const text = getShareableVoucherText(tech);
    try {
      navigator.clipboard?.writeText(text);
      setSaveSuccess(`✓ Activation voucher copied to clipboard! Opening WhatsApp...`);
      setTimeout(() => setSaveSuccess(null), 3500);
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // Safe fallback
    }
  };

  const handleShareVoucherEmail = (tech: TechnicianUser) => {
    const text = getShareableVoucherText(tech);
    try {
      navigator.clipboard?.writeText(text);
      setSaveSuccess(`✓ Activation voucher copied to clipboard! Opening Email...`);
      setTimeout(() => setSaveSuccess(null), 3500);
      const subject = `PodoPress Diagnostic Station — App Login Voucher for ${tech.name}`;
      const url = `mailto:${tech.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // Safe fallback
    }
  };

  const handleShareNative = async (tech: TechnicianUser) => {
    const text = getShareableVoucherText(tech);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `PodoPress App Login Code for ${tech.name}`,
          text,
        });
        return;
      } catch {
        // Fallback
      }
    }
    navigator.clipboard?.writeText(text);
    setSaveSuccess(`✓ Activation voucher for "${tech.name}" copied to clipboard! Ready to share.`);
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  const handleDeleteTechnician = async (tech: TechnicianUser) => {
    if (confirm(`Are you sure you want to delete technician login "${tech.name}"?`)) {
      await dbService.deleteTechnician(tech.id);
      setTechniciansList(dbService.getTechniciansSync());
      setSaveSuccess(`Technician account "${tech.name}" removed.`);
      setTimeout(() => setSaveSuccess(null), 2500);
    }
  };

  const handleSwitchToTechnician = (tech: TechnicianUser) => {
    if (onSwitchUser) {
      onSwitchUser('technician', tech.name, tech.id, tech.hospitalId, tech.hospitalName);
    } else {
      dbService.setActiveUser('technician', tech.name, tech.id, tech.hospitalId, tech.hospitalName);
    }
    if (onNavigateToRegistration) {
      onNavigateToRegistration();
    }
  };

  // =========================================================================
  // HOSPITAL-WISE PATIENT DETAILS FILTERING & REASSIGNMENT
  // =========================================================================

  const effectivePatients = localPatients && localPatients.length > 0 ? localPatients : (patients || []);
  const effectiveCases = localCases && localCases.length > 0 ? localCases : (cases || []);

  const hospitalFilteredPatients = useMemo(() => {
    return effectivePatients.filter((p) => {
      const matchHospital =
        selectedHospitalFilter === 'ALL' ||
        (p.hospitalId ? p.hospitalId === selectedHospitalFilter : selectedHospitalFilter === activeHospital.id);
      if (!matchHospital) return false;
      if (!patientFilterSearch.trim()) return true;
      const q = patientFilterSearch.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.mrn.toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q) ||
        (p.hospitalName || '').toLowerCase().includes(q)
      );
    });
  }, [effectivePatients, selectedHospitalFilter, patientFilterSearch, activeHospital.id]);

  const handleConfirmReassignHospital = async () => {
    if (!reassigningPatient) return;
    const targetHosp = hospitals.find((h) => h.id === targetReassignHospitalId) || activeHospital;
    await dbService.reassignPatientHospital(reassigningPatient.id, targetHosp.id, targetHosp.name);
    setSaveSuccess(`✓ Patient ${reassigningPatient.name} reassigned to ${targetHosp.name}`);
    setReassigningPatient(null);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const handleSyncCloudReports = async () => {
    setIsSyncingCloud(true);
    setSyncStatusMessage(null);
    try {
      const res = await dbService.syncAllPendingCases();
      const updatedPatients = await dbService.getAllPatients();
      const updatedCases = await dbService.getAllCases();
      if (updatedPatients && updatedPatients.length > 0) {
        setLocalPatients(updatedPatients);
      }
      if (updatedCases && updatedCases.length > 0) {
        setLocalCases(updatedCases);
      }
      onRefreshData?.();
      setSyncStatusMessage({
        type: 'success',
        text: `✓ Cloud Sync Complete: Synced ${res.syncedCount} cases. Central database up to date (${(updatedCases || []).length} total exams).`,
      });
    } catch (err) {
      setSyncStatusMessage({
        type: 'error',
        text: `Sync Error: ${(err as Error).message || 'Unable to connect to central server.'}`,
      });
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setSyncStatusMessage(null), 6000);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setSyncStatusMessage(null);
    try {
      const text = await file.text();
      const success = await dbService.importDatabaseBackup(text);
      if (success) {
        const updatedPatients = await dbService.getAllPatients();
        const updatedCases = await dbService.getAllCases();
        if (updatedPatients) setLocalPatients(updatedPatients);
        if (updatedCases) setLocalCases(updatedCases);
        onRefreshData?.();
        setSyncStatusMessage({
          type: 'success',
          text: `✓ Remote data successfully imported! (${(updatedPatients || []).length} Patients, ${(updatedCases || []).length} Exams).`,
        });
      } else {
        setSyncStatusMessage({
          type: 'error',
          text: 'Invalid file format. Please upload a valid PodoPress clinical backup JSON file.',
        });
      }
    } catch (err) {
      setSyncStatusMessage({
        type: 'error',
        text: `Import failed: ${(err as Error).message}`,
      });
    } finally {
      setIsImporting(false);
      e.target.value = '';
      setTimeout(() => setSyncStatusMessage(null), 6000);
    }
  };

  const handleExportCentralRepository = async () => {
    try {
      const jsonBackup = await dbService.exportDatabaseBackup();
      const blob = new Blob([jsonBackup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `podopress_central_database_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSyncStatusMessage({
        type: 'success',
        text: '✓ Central hospital database backup downloaded successfully.',
      });
      setTimeout(() => setSyncStatusMessage(null), 4000);
    } catch (err) {
      setSyncStatusMessage({
        type: 'error',
        text: `Export failed: ${(err as Error).message}`,
      });
      setTimeout(() => setSyncStatusMessage(null), 5000);
    }
  };

  // =========================================================================
  // DEVICE BINDING & LICENSING ACTIONS
  // =========================================================================

  const handleUnbindDevice = (id: string) => {
    if (confirm(`Revoke device binding for station ${id}? This will free up 1 license seat.`)) {
      dbService.unbindDevice(id);
      setBoundDevices(dbService.getBoundDevicesSync());
      setDeviceLicense(dbService.getDeviceLicenseSync());
      setSaveSuccess('✓ Device binding revoked. License seat freed.');
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  const handleSaveDeviceName = () => {
    if (editedName.trim() && editingDeviceId) {
      deviceBindingService.setCustomDeviceName(editedName.trim());
      setBoundDevices(dbService.getBoundDevicesSync());
      setCurrentDevice(dbService.getCurrentDeviceSync());
      setEditingDeviceId(null);
      setEditedName('');
      setSaveSuccess('✓ Station name updated.');
      setTimeout(() => setSaveSuccess(null), 2500);
    }
  };

  const handleRedeemKey = () => {
    if (!voucherInput.trim()) return;
    const res = dbService.redeemLicenseKey(voucherInput.trim());
    if (res.success) {
      setDeviceLicense(dbService.getDeviceLicenseSync());
      setBoundDevices(dbService.getBoundDevicesSync());
      setShowVoucherRedeem(false);
      setVoucherInput('');
      setSaveSuccess(res.message);
      setTimeout(() => setSaveSuccess(null), 3500);
    } else {
      alert(res.message);
    }
  };

  // Get active hospital object for metrics
  const currentViewedHospital =
    selectedHospitalFilter === 'ALL'
      ? null
      : hospitals.find((h) => h.id === selectedHospitalFilter) || activeHospital;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0.85rem', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}>
      {/* Top Banner */}
      <div className="podoload-card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#ccfbf1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f766e',
            }}
          >
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0c2328' }}>
              Hospital Administration & Multi-Clinic Management
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
              Active Facility: <strong style={{ color: '#0f766e' }}>{activeHospital.name}</strong> ({activeHospital.code})
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {saveSuccess && (
            <span style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 700 }}>
              {saveSuccess}
            </span>
          )}
          <button
            type="button"
            className="podoload-btn-secondary podoload-btn-sm"
            onClick={() => {
              if (onNavigateToReport) onNavigateToReport();
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View Current Report</span>
          </button>
        </div>
      </div>

      {/* 2-Column Settings Layout */}
      <div className="podoload-settings-layout" style={{ flex: 1, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
        {/* Left Sidebar Menu */}
        <div className="podoload-settings-sidebar">
          <div className="podoload-settings-menu">
            <button
              type="button"
              className={`podoload-settings-menu-item ${activeTab === 'branding' ? 'active' : ''}`}
              onClick={() => setActiveTab('branding')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Hospital branding</span>
            </button>

            <button
              type="button"
              className={`podoload-settings-menu-item ${activeTab === 'technicians' ? 'active' : ''}`}
              onClick={() => setActiveTab('technicians')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <KeyRound className="w-3.5 h-3.5 text-teal-600" />
                <span>Technician logins</span>
              </div>
              <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem' }}>
                {techniciansList.length}
              </span>
            </button>

            <button
              type="button"
              className={`podoload-settings-menu-item ${activeTab === 'hospital_patients' ? 'active' : ''}`}
              onClick={() => setActiveTab('hospital_patients')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Users className="w-3.5 h-3.5 text-cyan-600" />
                <span>Hospital patients</span>
              </div>
              <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem' }}>
                {patients.length}
              </span>
            </button>

            <button
              type="button"
              className={`podoload-settings-menu-item ${activeTab === 'devices' ? 'active' : ''}`}
              onClick={() => setActiveTab('devices')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Laptop className="w-3.5 h-3.5 text-teal-600" />
                <span>Device binding & license</span>
              </div>
              <span
                className={`podo-badge ${
                  boundDevices.length >= deviceLicense.maxAllowedDevices ? 'podo-badge-amber' : 'podo-badge-green'
                }`}
                style={{ fontSize: '0.62rem' }}
              >
                {boundDevices.length}/{deviceLicense.maxAllowedDevices}
              </span>
            </button>

            <button
              type="button"
              className={`podoload-settings-menu-item ${activeTab === 'hospitals' ? 'active' : ''}`}
              onClick={() => setActiveTab('hospitals')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Hospital className="w-3.5 h-3.5" />
                <span>All hospitals</span>
              </div>
              <span className="podo-badge podo-badge-gray" style={{ fontSize: '0.62rem' }}>
                {hospitals.length}
              </span>
            </button>

            <button
              type="button"
              className={`podoload-settings-menu-item ${activeTab === 'staff' ? 'active' : ''}`}
              onClick={() => setActiveTab('staff')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Doctors & clinicians</span>
            </button>

            <button
              type="button"
              className={`podoload-settings-menu-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin security</span>
            </button>
          </div>
        </div>

        {/* Right Active Configuration Panel */}
        <div className="podoload-settings-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          {/* TAB 1: HOSPITAL BRANDING & LOGO */}
          {activeTab === 'branding' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
              {/* Left Column: Branding Details */}
              <div className="podoload-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <h4 className="podoload-card-title" style={{ margin: 0 }}>
                  HOSPITAL & CLINIC DETAILS
                </h4>

                <div className="podoload-form-group">
                  <label className="podoload-label">Hospital / Clinic Name</label>
                  <input
                    type="text"
                    className="podoload-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Technomind Healthcare Systems"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="podoload-form-group">
                    <label className="podoload-label">Hospital Code / Branch</label>
                    <input
                      type="text"
                      className="podoload-input"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g. TMH-CENTRAL"
                    />
                  </div>

                  <div className="podoload-form-group">
                    <label className="podoload-label">Registration / Accreditation</label>
                    <input
                      type="text"
                      className="podoload-input"
                      value={registrationNo}
                      onChange={(e) => setRegistrationNo(e.target.value)}
                      placeholder="e.g. NABH-2026-MED"
                    />
                  </div>
                </div>

                <div className="podoload-form-group">
                  <label className="podoload-label">Department / Specialty</label>
                  <input
                    type="text"
                    className="podoload-input"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Department of Podiatry & Lower Limb Biomechanics"
                  />
                </div>

                <div className="podoload-form-group">
                  <label className="podoload-label">Address</label>
                  <input
                    type="text"
                    className="podoload-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="100 Medical Center Blvd, Suite 400"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div className="podoload-form-group">
                    <label className="podoload-label">Phone & Contact</label>
                    <input
                      type="text"
                      className="podoload-input"
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="+1 (800) 555-PODO"
                    />
                  </div>

                  <div className="podoload-form-group">
                    <label className="podoload-label">Email</label>
                    <input
                      type="text"
                      className="podoload-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@technomind.health"
                    />
                  </div>
                </div>

                <div className="podoload-form-group">
                  <label className="podoload-label">Report Default Footer Text</label>
                  <input
                    type="text"
                    className="podoload-input"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Affiliated with National Institute of Podiatry · ISO 13485 Certified"
                  />
                </div>
              </div>

              {/* Right Column: Logo & Live Report Header Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div className="podoload-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <h4 className="podoload-card-title" style={{ margin: 0 }}>
                    HOSPITAL LOGO BRANDING
                  </h4>

                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    style={{ display: 'none' }}
                    onChange={handleLogoUpload}
                  />

                  <div
                    style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f8fafc',
                      gap: '0.5rem',
                      cursor: 'pointer',
                    }}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {logoUrl ? (
                      <img src={logoUrl} alt="Hospital Logo" style={{ maxHeight: '60px', maxWidth: '140px', objectFit: 'contain' }} />
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-400" />
                        <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 600 }}>Click to upload hospital logo</span>
                      </>
                    )}
                  </div>

                  {logoUrl && (
                    <button
                      type="button"
                      className="podoload-btn-secondary podoload-btn-sm"
                      onClick={handleRemoveLogo}
                      style={{ color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Logo</span>
                    </button>
                  )}

                  <div className="podoload-form-group">
                    <label className="podoload-label">Logo Position in Generated Reports</label>
                    <div className="podoload-segmented-buttons">
                      {(['Left', 'Centre', 'Right'] as const).map((pos) => (
                        <button
                          key={pos}
                          type="button"
                          className={`podoload-seg-btn ${logoPosition === pos ? 'active' : ''}`}
                          onClick={() => setLogoPosition(pos)}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Report Header Preview */}
                <div className="podoload-card" style={{ padding: '0.85rem' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Live Report Header Preview
                  </span>

                  <div
                    style={{
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      padding: '0.65rem',
                      backgroundColor: '#ffffff',
                      marginTop: '0.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      justifyContent: logoPosition === 'Centre' ? 'center' : logoPosition === 'Right' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        color: '#94a3b8',
                        overflow: 'hidden',
                      }}
                    >
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                      ) : (
                        'Logo'
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0c2328' }}>
                        [{name || 'Hospital Name'}]
                      </div>
                      <div style={{ fontSize: '0.62rem', color: '#64748b' }}>
                        {contact || 'Contact Details'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TECHNICIAN LOGINS & CLINICAL STAFF ACCESS */}
          {activeTab === 'technicians' && (
            <div className="podoload-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 className="podoload-card-title" style={{ margin: 0 }}>
                    TECHNICIAN LOGINS & CLINICAL OPERATORS
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                    Create technician accounts who can conduct examinations, process footprints, and generate clinical reports for their assigned hospitals.
                  </p>
                </div>
                <button
                  type="button"
                  className="podoload-btn-primary podoload-btn-sm"
                  onClick={() => setShowAddTech(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Create Technician Login</span>
                </button>
              </div>

              {/* APP LOGIN & DEVICE ACTIVATION CODE GENERATION & SHARING HUB */}
              {(() => {
                const currentHubTech =
                  techniciansList.find((t) => t.id === hubSelectedTechId) || techniciansList[0];
                if (!currentHubTech) return null;
                const techHosp = hospitals.find((h) => h.id === currentHubTech.hospitalId) || activeHospital;

                return (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #f0fdfa 0%, #f8fafc 100%)',
                      border: '1.5px solid #5eead4',
                      borderRadius: '10px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                      boxShadow: '0 2px 8px rgba(13, 148, 136, 0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            backgroundColor: '#0d9488',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                          }}
                        >
                          <Key className="w-5 h-5" />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f766e' }}>
                              Technician App Login Credentials &amp; Device Activation Hub
                            </h5>
                            <span className="podo-badge podo-badge-green" style={{ fontSize: '0.6rem' }}>
                              Multi-Platform
                            </span>
                          </div>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                            All details aligned with the technician login &amp; device enrollment screen for <strong>Android (.apk)</strong>, <strong>iOS (.ipa)</strong>, and <strong>Windows (.exe)</strong>.
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <span className="podo-badge podo-badge-gray" style={{ fontSize: '0.62rem' }}>🤖 Android</span>
                        <span className="podo-badge podo-badge-gray" style={{ fontSize: '0.62rem' }}>🍎 iOS</span>
                        <span className="podo-badge podo-badge-gray" style={{ fontSize: '0.62rem' }}>🪟 Windows</span>
                      </div>
                    </div>

                    {/* Technician Selector & Status Banner */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.6rem',
                        padding: '0.6rem 0.85rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid #ccfbf1',
                        borderRadius: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
                        <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
                          Select Technician:
                        </label>
                        <select
                          className="podoload-input"
                          value={currentHubTech.id}
                          onChange={(e) => setHubSelectedTechId(e.target.value)}
                          style={{ fontSize: '0.78rem', fontWeight: 700, padding: '0.35rem 0.6rem', flex: 1, minWidth: '160px', maxWidth: '100%' }}
                        >
                          {techniciansList.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.username}) — {t.hospitalName || 'Clinic'}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="podoload-btn-primary"
                          onClick={() => setShowAddTech(true)}
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.35rem 0.65rem',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            flexShrink: 0,
                          }}
                          title="Create another technician login for Android, iOS, or Windows"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Technician</span>
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span
                          className={`podo-badge ${currentHubTech.isRegisteredOnDevice ? 'podo-badge-green' : 'podo-badge-gray'}`}
                          style={{ fontSize: '0.64rem' }}
                        >
                          {currentHubTech.isRegisteredOnDevice
                            ? `📱 Bound: ${currentHubTech.registeredDeviceId || 'Station'}`
                            : '⚡ Ready for Enrollment'}
                        </span>
                        <span className="podo-badge podo-badge-green" style={{ fontSize: '0.64rem' }}>
                          ✓ 100% Offline Ready
                        </span>
                      </div>
                    </div>

                    {/* 4-GRID: EXACT LOGIN REQUIREMENTS ALIGNED WITH LOGIN MODAL */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '0.65rem',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Box 1: Hospital / Clinic Code */}
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1.5px solid #bbf7d0',
                          borderRadius: '8px',
                          padding: '0.65rem 0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                          minWidth: 0,
                          overflow: 'hidden',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                            1. Hospital / Clinic Code
                          </span>
                          <span className="podo-badge podo-badge-green" style={{ fontSize: '0.58rem' }}>Required</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem', minWidth: 0 }}>
                          <code style={{ fontSize: '0.92rem', fontWeight: 900, color: '#166534', fontFamily: 'monospace', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={techHosp.code}>
                            {techHosp.code}
                          </code>
                          <button
                            type="button"
                            className="podoload-btn-secondary podoload-btn-sm"
                            style={{ fontSize: '0.64rem', padding: '0.2rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}
                            onClick={() => handleCopyText(techHosp.code, 'hospCode')}
                          >
                            <Copy className="w-3 h-3 text-emerald-600" />
                            <span>{copiedLabel === 'hospCode' ? '✓ Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <div style={{ fontSize: '0.62rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={techHosp.name}>
                          Facility: {techHosp.name}
                        </div>
                      </div>

                      {/* Box 2: Activation Voucher Code (Configurable Timed Policy) */}
                      {(() => {
                        const timed = dbService.getOrRotateTechnicianActivationCode(currentHubTech.id);
                        return (
                          <div
                            style={{
                              backgroundColor: '#ffffff',
                              border: '1.5px solid #99f6e4',
                              borderRadius: '8px',
                              padding: '0.65rem 0.75rem',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.35rem',
                              minWidth: 0,
                              overflow: 'hidden',
                              boxSizing: 'border-box',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.2rem' }}>
                              <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' }}>
                                2. Activation Voucher Code
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span className="podo-badge podo-badge-green" style={{ fontSize: '0.58rem' }}>
                                  ⏱️ {timed.remainingText} ({timed.policyLabel})
                                </span>
                                <button
                                  type="button"
                                  className="podoload-btn-secondary podoload-btn-sm"
                                  style={{ fontSize: '0.58rem', padding: '1px 5px', color: '#0f766e' }}
                                  onClick={() => setShowPolicyConfig(!showPolicyConfig)}
                                  title="Configure activation voucher expiration & rotation duration (hours / days / custom)"
                                >
                                  ⚙️ Configure
                                </button>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem', minWidth: 0 }}>
                              <code style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f766e', fontFamily: 'monospace', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={timed.code}>
                                {timed.code}
                              </code>
                              <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  className="podoload-btn-secondary podoload-btn-sm"
                                  style={{ fontSize: '0.64rem', padding: '0.2rem 0.35rem' }}
                                  onClick={() => handleRegenerateActivationCode(currentHubTech)}
                                  title={`Rotate activation voucher code now (starts fresh ${timed.policyLabel} expiry)`}
                                >
                                  <RotateCw className="w-3 h-3 text-teal-600" />
                                </button>
                                <button
                                  type="button"
                                  className="podoload-btn-primary podoload-btn-sm"
                                  style={{ fontSize: '0.64rem', padding: '0.2rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                                  onClick={() => handleCopyText(timed.code, 'actCode')}
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>{copiedLabel === 'actCode' ? '✓ Copied' : 'Copy'}</span>
                                </button>
                              </div>
                            </div>
                            <div style={{ fontSize: '0.62rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              Enter in "Activation Voucher Code" on app · Policy: <strong>{timed.policyLabel}</strong>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Box 3: Desired User ID / Username */}
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '0.65rem 0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                          minWidth: 0,
                          overflow: 'hidden',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                            3. Login ID / Username
                          </span>
                          <span className="podo-badge podo-badge-gray" style={{ fontSize: '0.58rem' }}>Desired User ID</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem', minWidth: 0 }}>
                          <code style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentHubTech.username}>
                            {currentHubTech.username}
                          </code>
                          <button
                            type="button"
                            className="podoload-btn-secondary podoload-btn-sm"
                            style={{ fontSize: '0.64rem', padding: '0.2rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}
                            onClick={() => handleCopyText(currentHubTech.username, 'username')}
                          >
                            <Copy className="w-3 h-3 text-slate-600" />
                            <span>{copiedLabel === 'username' ? '✓ Copied' : 'Copy'}</span>
                          </button>
                        </div>
                        <div style={{ fontSize: '0.62rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={currentHubTech.name}>
                          Technician: {currentHubTech.name}
                        </div>
                      </div>

                      {/* Box 4: Password / PIN */}
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '0.65rem 0.75rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                          minWidth: 0,
                          overflow: 'hidden',
                          boxSizing: 'border-box',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase' }}>
                            4. Password / PIN
                          </span>
                          <span className="podo-badge podo-badge-gray" style={{ fontSize: '0.58rem' }}>Admin Managed</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem', minWidth: 0 }}>
                          <code style={{ fontSize: '0.82rem', fontWeight: 800, color: visibleTechPasswords[currentHubTech.id] ? '#0f766e' : '#64748b', fontFamily: 'monospace', letterSpacing: visibleTechPasswords[currentHubTech.id] ? 'normal' : '0.12em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {visibleTechPasswords[currentHubTech.id] ? (currentHubTech.pin || '1234') : '••••••••'}
                          </code>
                          <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                            <button
                              type="button"
                              className="podoload-btn-secondary podoload-btn-sm"
                              style={{ padding: '0.2rem 0.35rem' }}
                              onClick={() => setVisibleTechPasswords((prev) => ({ ...prev, [currentHubTech.id]: !prev[currentHubTech.id] }))}
                              title="Toggle password view"
                            >
                              {visibleTechPasswords[currentHubTech.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button
                              type="button"
                              className="podoload-btn-secondary podoload-btn-sm"
                              style={{ fontSize: '0.64rem', padding: '0.2rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                              onClick={() => handleCopyText(currentHubTech.pin || '1234', 'password')}
                            >
                              <Copy className="w-3 h-3 text-slate-600" />
                              <span>{copiedLabel === 'password' ? '✓ Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.62rem', color: '#64748b' }}>Used for station sign-in</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTechPassword(currentHubTech);
                              setTechEditPasswordVal(currentHubTech.pin || '');
                              setShowTechEditPasswordVal(false);
                              setTechPasswordModalError(null);
                            }}
                            style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.62rem', color: '#0d9488', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            Reset Password
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Direct Sharing Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.35rem', borderTop: '1px solid #ccfbf1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="podoload-btn-primary podoload-btn-sm"
                          onClick={() => handleCopyText(getShareableVoucherText(currentHubTech), 'all')}
                          title="Copy full instructions card with all credentials"
                          style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700 }}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>{copiedLabel === 'all' ? '✓ All Credentials Copied!' : '📋 Copy All Login Credentials'}</span>
                        </button>

                        <button
                          type="button"
                          className="podoload-btn-secondary podoload-btn-sm"
                          onClick={() => handleShareVoucherWhatsApp(currentHubTech)}
                          title="Share activation instructions directly via WhatsApp"
                          style={{
                            fontSize: '0.7rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            color: '#15803d',
                            borderColor: '#86efac',
                            backgroundColor: '#f0fdf4',
                            fontWeight: 700,
                          }}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Share WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          className="podoload-btn-secondary podoload-btn-sm"
                          onClick={() => handleShareVoucherEmail(currentHubTech)}
                          title="Send activation voucher via Email"
                          style={{
                            fontSize: '0.7rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            color: '#0369a1',
                            borderColor: '#7dd3fc',
                            backgroundColor: '#f0f9ff',
                            fontWeight: 700,
                          }}
                        >
                          <Mail className="w-3.5 h-3.5 text-sky-600" />
                          <span>Share Email</span>
                        </button>

                        <button
                          type="button"
                          className="podoload-btn-secondary podoload-btn-sm"
                          onClick={() => handleShareNative(currentHubTech)}
                          title="Share via native device sharing sheet"
                          style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Share2 className="w-3.5 h-3.5 text-teal-600" />
                          <span>Native Share</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        className="podoload-btn-secondary podoload-btn-sm"
                        onClick={() => setVoucherTech(currentHubTech)}
                        title="View / Print Pairing Card"
                        style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 700 }}
                      >
                        <Smartphone className="w-3.5 h-3.5 text-teal-600" />
                        <span>📱 View / Print Pairing Card</span>
                      </button>
                    </div>

                    {/* EXPIRY & ROTATION POLICY CONFIGURATION CARD */}
                    <div
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1.5px solid #99f6e4',
                        borderRadius: '8px',
                        padding: '0.75rem 0.9rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.55rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Clock className="w-4 h-4 text-teal-600" />
                          <h6 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: '#0f766e' }}>
                            Voucher Validity &amp; Rotation Policy Configuration
                          </h6>
                          <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem' }}>
                            Active: {formatVoucherPolicyLabel(expiryPolicy)}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.64rem', color: '#64748b' }}>
                          Configurable validity duration in <strong>Hours</strong> or <strong>Days</strong> before technician vouchers rotate
                        </span>
                      </div>

                      {/* Quick Presets */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', marginRight: '0.2rem' }}>
                          Quick Presets:
                        </span>
                        {[
                          { label: '1 Hour', duration: 1, unit: 'hours' as const },
                          { label: '2 Hours', duration: 2, unit: 'hours' as const },
                          { label: '8 Hours', duration: 8, unit: 'hours' as const },
                          { label: '24 Hours (1 Day)', duration: 24, unit: 'hours' as const },
                          { label: '3 Days', duration: 3, unit: 'days' as const },
                          { label: '7 Days (1 Wk)', duration: 7, unit: 'days' as const },
                          { label: '30 Days (1 Mo)', duration: 30, unit: 'days' as const },
                        ].map((preset) => {
                          const isSelected = expiryPolicy.duration === preset.duration && expiryPolicy.unit === preset.unit;
                          return (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => handleApplyPresetPolicy(preset.duration, preset.unit)}
                              style={{
                                fontSize: '0.68rem',
                                padding: '0.25rem 0.55rem',
                                borderRadius: '4px',
                                border: isSelected ? '1.5px solid #0d9488' : '1px solid #cbd5e1',
                                backgroundColor: isSelected ? '#ccfbf1' : '#f8fafc',
                                color: isSelected ? '#0f766e' : '#334155',
                                fontWeight: isSelected ? 800 : 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {preset.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Input & Controls */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          flexWrap: 'wrap',
                          padding: '0.5rem 0.75rem',
                          backgroundColor: '#f8fafc',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
                            Custom Duration:
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            className="podoload-input"
                            value={policyDurationInput}
                            onChange={(e) => setPolicyDurationInput(Math.max(1, parseInt(e.target.value) || 1))}
                            style={{ width: '65px', padding: '0.25rem 0.4rem', fontSize: '0.75rem', fontWeight: 700 }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
                            Unit:
                          </label>
                          <select
                            className="podoload-input"
                            value={policyUnitInput}
                            onChange={(e) => setPolicyUnitInput(e.target.value as VoucherExpiryUnit)}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 700 }}
                          >
                            <option value="hours">Hours</option>
                            <option value="days">Days</option>
                            <option value="minutes">Minutes</option>
                          </select>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: '#334155', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={policyAutoRotate}
                            onChange={(e) => setPolicyAutoRotate(e.target.checked)}
                          />
                          <span>Auto-rotate on expiration</span>
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: '#334155', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={applyToExisting}
                            onChange={(e) => setApplyToExisting(e.target.checked)}
                          />
                          <span>Apply to all existing technicians</span>
                        </label>

                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            className="podoload-btn-primary"
                            onClick={() => handleSaveExpiryPolicy()}
                            style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem', fontWeight: 700 }}
                          >
                            Save &amp; Apply Policy
                          </button>
                        </div>
                      </div>

                      {policyFeedbackMsg && (
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: '#15803d',
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            padding: '0.35rem 0.6rem',
                            borderRadius: '4px',
                            fontWeight: 700,
                          }}
                        >
                          {policyFeedbackMsg}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Create Technician Sub-Form */}
              {showAddTech && (
                <div style={{ backgroundColor: '#f0fdfa', padding: '0.85rem', borderRadius: '8px', border: '1.5px solid #5eead4', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h5 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 800, color: '#0f766e' }}>
                      Create New Clinical Technician Account &amp; App Login
                    </h5>
                    <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem' }}>
                      Generates Android, iOS &amp; Windows Activation Voucher
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 1.2fr', gap: '0.5rem' }}>
                    <div className="podoload-form-group">
                      <label className="podoload-label">Full Name *</label>
                      <input
                        type="text"
                        className="podoload-input"
                        placeholder="e.g. Sarah Jenkins, B.Sc."
                        value={newTechName}
                        onChange={(e) => setNewTechName(e.target.value)}
                      />
                    </div>
                    <div className="podoload-form-group">
                      <label className="podoload-label">Desired User ID / Username *</label>
                      <input
                        type="text"
                        className="podoload-input"
                        placeholder="e.g. sarah.tech or sarah@hospital.com"
                        value={newTechUsername}
                        onChange={(e) => setNewTechUsername(e.target.value)}
                      />
                    </div>
                    <div className="podoload-form-group">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label className="podoload-label">Password *</label>
                        <button
                          type="button"
                          onClick={() => {
                            const gen = 'Tech' + Math.floor(1000 + Math.random() * 9000);
                            setNewTechPin(gen);
                            setShowNewTechPin(true);
                          }}
                          style={{ background: 'none', border: 'none', fontSize: '0.62rem', color: '#0d9488', cursor: 'pointer', padding: 0 }}
                        >
                          ⚡ Auto-Gen
                        </button>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showNewTechPin ? 'text' : 'password'}
                          className="podoload-input"
                          placeholder="Enter password"
                          value={newTechPin}
                          onChange={(e) => setNewTechPin(e.target.value)}
                          style={{ paddingRight: '1.8rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewTechPin(!showNewTechPin)}
                          style={{
                            position: 'absolute',
                            right: '6px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#64748b',
                            padding: '1px',
                          }}
                        >
                          {showNewTechPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="podoload-form-group">
                      <label className="podoload-label">Assigned Facility *</label>
                      <select
                        className="podoload-input"
                        value={newTechHospitalId}
                        onChange={(e) => setNewTechHospitalId(e.target.value)}
                      >
                        {hospitals.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name} (Code: {h.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr auto', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div className="podoload-form-group">
                      <label className="podoload-label">Phone (Optional)</label>
                      <input
                        type="text"
                        className="podoload-input"
                        placeholder="+1 555-0192"
                        value={newTechPhone}
                        onChange={(e) => setNewTechPhone(e.target.value)}
                      />
                    </div>
                    <div className="podoload-form-group">
                      <label className="podoload-label">Email (Optional)</label>
                      <input
                        type="email"
                        className="podoload-input"
                        placeholder="sarah@hospital.com"
                        value={newTechEmail}
                        onChange={(e) => setNewTechEmail(e.target.value)}
                      />
                    </div>
                    <div className="podoload-form-group">
                      <label className="podoload-label">Notes / Specialty</label>
                      <input
                        type="text"
                        className="podoload-input"
                        placeholder="Lead Harris Mat Scanner Operator"
                        value={newTechNotes}
                        onChange={(e) => setNewTechNotes(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button type="button" className="podoload-btn-primary podoload-btn-sm" onClick={handleAddTechnician}>
                        Save Login
                      </button>
                      <button type="button" className="podoload-btn-secondary podoload-btn-sm" onClick={() => setShowAddTech(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Technicians Table Header Bar with Add Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '0.6rem',
                  marginBottom: '0.35rem',
                  flexWrap: 'wrap',
                  gap: '0.4rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f766e' }}>
                    REGISTERED TECHNICIANS ({techniciansList.length})
                  </span>
                  <span className="podo-badge podo-badge-gray" style={{ fontSize: '0.62rem' }}>
                    Support for multiple technicians across hospitals &amp; clinics
                  </span>
                </div>
                {!showAddTech && (
                  <button
                    type="button"
                    className="podoload-btn-primary podoload-btn-sm"
                    onClick={() => setShowAddTech(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem' }}
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Add New Technician</span>
                  </button>
                )}
              </div>

              {/* Technicians Table */}
              <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '6px' }}>
                <table className="podoload-device-table" style={{ width: '100%', minWidth: '680px', fontSize: '0.74rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>TECHNICIAN NAME</th>
                    <th style={{ textAlign: 'left' }}>LOGIN USERNAME</th>
                    <th style={{ textAlign: 'left' }}>ASSIGNED HOSPITAL</th>
                    <th style={{ textAlign: 'left' }}>APP ACTIVATION CODE</th>
                    <th style={{ textAlign: 'left' }}>PASSWORD & CREDENTIALS</th>
                    <th style={{ textAlign: 'center' }}>STATUS</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {techniciansList.map((tech) => (
                    <tr key={tech.id}>
                      <td style={{ fontWeight: 700, color: '#0c2328' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                          <span>{tech.name}</span>
                        </div>
                      </td>
                      <td>
                        <code style={{ backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '3px', fontSize: '0.7rem' }}>
                          {tech.username}
                        </code>
                      </td>
                      <td>
                        <span className="podo-badge podo-badge-gray" style={{ fontSize: '0.64rem' }}>
                          {tech.hospitalName || 'Technomind Healthcare Systems'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <code style={{ fontSize: '0.74rem', fontWeight: 800, backgroundColor: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4', padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.04em' }}>
                            {tech.activationCode || 'TMH-TECH-1001'}
                          </code>
                          <button
                            type="button"
                            className="podoload-btn-secondary"
                            style={{ fontSize: '0.62rem', padding: '0.15rem 0.4rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            onClick={() => handleCopyActivationCode(tech.activationCode || 'TMH-TECH-1001', tech.id)}
                            title="Copy activation code for technician mobile app"
                          >
                            <Copy className="w-3 h-3 text-teal-600" />
                            <span>{copiedCodeId === tech.id ? '✓ Copied' : 'Copy'}</span>
                          </button>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#0d9488' }}
                            onClick={() => handleRegenerateActivationCode(tech)}
                            title={`Rotate activation code now (starts fresh ${formatVoucherPolicyLabel(expiryPolicy)} validity)`}
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '2px', fontSize: '0.62rem', color: '#64748b' }}>
                          <span className="podo-badge podo-badge-gray" style={{ fontSize: '0.56rem' }}>
                            ⏱️ {formatVoucherPolicyLabel(expiryPolicy)} Auto-Rotate
                          </span>
                          {tech.isRegisteredOnDevice ? (
                            <span style={{ color: '#16a34a' }}>📱 Bound: {tech.registeredDeviceId || 'DEV-STATION'}</span>
                          ) : (
                            <span>📱 Ready for Device Activation</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <code style={{ fontSize: '0.72rem', backgroundColor: '#f8fafc', padding: '2px 5px', borderRadius: '3px', letterSpacing: visibleTechPasswords[tech.id] ? 'normal' : '0.12em', color: visibleTechPasswords[tech.id] ? '#0f766e' : '#64748b' }}>
                            {visibleTechPasswords[tech.id] ? (tech.pin || '••••••••') : '••••••••'}
                          </code>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748b' }}
                            onClick={() => setVisibleTechPasswords((prev) => ({ ...prev, [tech.id]: !prev[tech.id] }))}
                            title={visibleTechPasswords[tech.id] ? 'Hide password' : 'View technician password'}
                          >
                            {visibleTechPasswords[tech.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            className="podoload-btn-secondary"
                            style={{ fontSize: '0.62rem', padding: '0.15rem 0.4rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            onClick={() => {
                              setEditingTechPassword(tech);
                              setTechEditPasswordVal(tech.pin || '');
                              setShowTechEditPasswordVal(false);
                              setTechPasswordModalError(null);
                            }}
                            title="Admin Maintenance: Reset or update password for this technician"
                          >
                            <Key className="w-3 h-3 text-teal-600" />
                            <span>Reset Password</span>
                          </button>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className={`podo-badge ${tech.status === 'active' ? 'podo-badge-green' : 'podo-badge-gray'}`}
                          style={{ border: 'none', cursor: 'pointer', fontSize: '0.62rem' }}
                          onClick={() => handleToggleTechStatus(tech)}
                          title="Click to toggle status"
                        >
                          {tech.status === 'active' ? '✓ Active' : 'Disabled'}
                        </button>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="podoload-btn-secondary podoload-btn-sm"
                            style={{ fontSize: '0.66rem', padding: '0.2rem 0.45rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            onClick={() => setVoucherTech(tech)}
                            title="View / Print Mobile Device Activation Voucher"
                          >
                            <Smartphone className="w-3 h-3 text-teal-600" />
                            <span>Voucher</span>
                          </button>
                          <button
                            type="button"
                            className="podoload-btn-primary podoload-btn-sm"
                            style={{ fontSize: '0.66rem', padding: '0.2rem 0.45rem' }}
                            onClick={() => handleSwitchToTechnician(tech)}
                            title="Log in as this technician to generate reports"
                          >
                            Log In & Run Exams
                          </button>
                          <button
                            type="button"
                            className="podo-link-btn"
                            style={{ color: '#ef4444', fontSize: '0.66rem', padding: '0.2rem 0.35rem' }}
                            onClick={() => handleDeleteTechnician(tech)}
                            title="Delete technician login"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* TAB 3: HOSPITAL-WISE PATIENT DETAILS & RECORDS */}
          {activeTab === 'hospital_patients' && (
            <div className="podoload-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 className="podoload-card-title" style={{ margin: 0 }}>
                    HOSPITAL-WISE PATIENT &amp; MEDICAL REPORT REPOSITORY
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                    Structured multi-facility patient database with centralized cloud synchronization and remote technician data ingestion.
                  </p>
                </div>

                {/* Hospital Selection Tabs / Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Building2 className="w-4 h-4 text-teal-600" />
                  <select
                    className="podoload-input"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.74rem', fontWeight: 700 }}
                    value={selectedHospitalFilter}
                    onChange={(e) => setSelectedHospitalFilter(e.target.value)}
                  >
                    <option value="ALL">All Hospitals &amp; Facilities ({effectivePatients.length} Patients)</option>
                    {hospitals.map((h) => {
                      const count = effectivePatients.filter((p) => (p.hospitalId ? p.hospitalId === h.id : h.id === activeHospital.id)).length;
                      return (
                        <option key={h.id} value={h.id}>
                          {h.name} ({count} Patients)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* REMOTE TECHNICIAN DATA INGESTION & CLOUD SYNCHRONIZATION BAR */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%)',
                  border: '1.5px solid #99f6e4',
                  borderRadius: '8px',
                  padding: '0.75rem 0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  boxShadow: '0 2px 6px rgba(13, 148, 136, 0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: '#0d9488',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                      }}
                    >
                      <Cloud className="w-4 h-4" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>Remote Technician Data Ingestion &amp; Central Cloud Synchronization</span>
                        <span className="podo-badge podo-badge-green" style={{ fontSize: '0.6rem' }}>
                          Cross-Device Sync
                        </span>
                      </div>
                      <div style={{ fontSize: '0.66rem', color: '#64748b' }}>
                        Pull examinations from remote Android, iOS &amp; Windows technician apps, or ingest offline clinic packages (.json / USB).
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem' }}>
                      🟢 Cloud API: Ready
                    </span>
                    <span className="podo-badge podo-badge-gray" style={{ fontSize: '0.62rem' }}>
                      📁 {effectivePatients.length} Patients
                    </span>
                    <span className="podo-badge podo-badge-gray" style={{ fontSize: '0.62rem' }}>
                      📊 {effectiveCases.length} Total Exams
                    </span>
                  </div>
                </div>

                {/* Actions Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    {/* Button 1: Cloud Sync */}
                    <button
                      type="button"
                      className="podoload-btn-primary podoload-btn-sm"
                      onClick={handleSyncCloudReports}
                      disabled={isSyncingCloud}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                      <span>{isSyncingCloud ? 'Syncing Cloud...' : '🔄 Sync Remote Cloud Cases'}</span>
                    </button>

                    {/* Button 2: Import Remote Data (.json / USB / WhatsApp) */}
                    <label
                      className="podoload-btn-secondary podoload-btn-sm"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.72rem',
                        cursor: isImporting ? 'not-allowed' : 'pointer',
                        margin: 0,
                      }}
                    >
                      <Upload className="w-3.5 h-3.5 text-teal-600" />
                      <span>{isImporting ? 'Importing Data...' : '📥 Import Remote Data (.json / USB)'}</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        style={{ display: 'none' }}
                        onChange={handleFileImport}
                        disabled={isImporting}
                      />
                    </label>

                    {/* Button 3: Export Central Backup */}
                    <button
                      type="button"
                      className="podoload-btn-secondary podoload-btn-sm"
                      onClick={handleExportCentralRepository}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem' }}
                    >
                      <Download className="w-3.5 h-3.5 text-teal-600" />
                      <span>📤 Export Central Backup</span>
                    </button>
                  </div>

                  {syncStatusMessage && (
                    <div
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: syncStatusMessage.type === 'error' ? '#b91c1c' : '#0f766e',
                        backgroundColor: syncStatusMessage.type === 'error' ? '#fef2f2' : '#f0fdfa',
                        padding: '0.25rem 0.55rem',
                        borderRadius: '4px',
                        border: `1px solid ${syncStatusMessage.type === 'error' ? '#fca5a5' : '#99f6e4'}`,
                      }}
                    >
                      {syncStatusMessage.text}
                    </div>
                  )}
                </div>
              </div>

              {/* Hospital Overview Card (When filtered to specific hospital) */}
              {currentViewedHospital && (
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.65rem 0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#166534' }}>
                      {currentViewedHospital.name} ({currentViewedHospital.code})
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#15803d' }}>
                      {currentViewedHospital.department || 'Podiatry & Biomechanics'} · Primary Doctor: {currentViewedHospital.defaultDoctor}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.72rem', color: '#166534', fontWeight: 700 }}>
                    <div>
                      Patients: <strong>{hospitalFilteredPatients.length}</strong>
                    </div>
                    <div>
                      Reports: <strong>{effectiveCases.filter((c) => (c.hospitalId ? c.hospitalId === currentViewedHospital.id : true)).length}</strong>
                    </div>
                    <div>
                      Technicians: <strong>{techniciansList.filter((t) => t.hospitalId === currentViewedHospital.id).length}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Patients within Hospital */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search className="w-3.5 h-3.5 text-slate-400" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    className="podoload-input"
                    placeholder="Search patients by name, ID, mobile, or hospital..."
                    style={{ paddingLeft: '1.75rem', fontSize: '0.74rem' }}
                    value={patientFilterSearch}
                    onChange={(e) => setPatientFilterSearch(e.target.value)}
                  />
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  Showing {hospitalFilteredPatients.length} of {effectivePatients.length} patients
                </span>
              </div>

              {/* Patients Table */}
              <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '6px' }}>
                <table className="podoload-device-table" style={{ width: '100%', minWidth: '600px', fontSize: '0.74rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>PATIENT NAME & MRN</th>
                    <th style={{ textAlign: 'left' }}>DEMOGRAPHICS</th>
                    <th style={{ textAlign: 'left' }}>CONTACT & DOCTOR</th>
                    <th style={{ textAlign: 'left' }}>ASSIGNED HOSPITAL</th>
                    <th style={{ textAlign: 'center' }}>EXAMS</th>
                    <th style={{ textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {hospitalFilteredPatients.length > 0 ? (
                    hospitalFilteredPatients.map((p) => {
                      const patientExams = effectiveCases.filter((c) => c.patientId === p.id);
                      const latestExam = patientExams[0];
                      const currentPatientHosp =
                        hospitals.find((h) => h.id === p.hospitalId) || activeHospital;

                      return (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 700, color: '#0c2328' }}>
                            <div>{p.name}</div>
                            <code style={{ fontSize: '0.64rem', color: '#64748b' }}>{p.mrn}</code>
                          </td>
                          <td>
                            {p.dateOfBirth ? `${new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear()}y` : '42y'} · {p.gender}
                          </td>
                          <td>
                            <div>{p.phone || 'No phone'}</div>
                            <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{p.referringDoctor || 'Dr. Specialist'}</div>
                          </td>
                          <td>
                            <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem' }}>
                              {p.hospitalName || currentPatientHosp.name}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="podo-badge podo-badge-gray" style={{ fontSize: '0.64rem' }}>
                              {patientExams.length} {patientExams.length === 1 ? 'Report' : 'Reports'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
                              {patientExams.length > 0 && onSelectReport && (
                                <button
                                  type="button"
                                  className="podoload-btn-secondary podoload-btn-sm"
                                  style={{ fontSize: '0.66rem', padding: '0.2rem 0.45rem' }}
                                  onClick={() => onSelectReport(latestExam.id, 5)}
                                  title="Open latest exam report"
                                >
                                  View Report
                                </button>
                              )}
                              <button
                                type="button"
                                className="podoload-btn-primary podoload-btn-sm"
                                style={{ fontSize: '0.66rem', padding: '0.2rem 0.45rem' }}
                                onClick={() => {
                                  if (onSelectPatient) onSelectPatient(p);
                                  if (onNavigateToRegistration) onNavigateToRegistration();
                                }}
                                title="Run new scan and report for this patient"
                              >
                                + New Exam
                              </button>
                              <button
                                type="button"
                                className="podo-link-btn"
                                style={{ fontSize: '0.64rem' }}
                                onClick={() => {
                                  setReassigningPatient(p);
                                  setTargetReassignHospitalId(p.hospitalId || activeHospital.id);
                                }}
                                title="Transfer / Reassign patient to another hospital facility"
                              >
                                Reassign
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8' }}>
                        No patients found for the selected facility. Register a patient to see them in this hospital repository.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>

              {/* Reassign Hospital Modal */}
              {reassigningPatient && (
                <div className="podoload-modal-backdrop" onClick={() => setReassigningPatient(null)}>
                  <div className="podoload-modal-box" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
                    <div className="podoload-modal-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <ArrowRightLeft className="w-4 h-4 text-teal-600" />
                        <h4 style={{ margin: 0, fontSize: '0.86rem', fontWeight: 800 }}>Reassign Patient Facility</h4>
                      </div>
                    </div>
                    <div style={{ padding: '0.85rem 0', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      <p style={{ margin: 0, fontSize: '0.74rem', color: '#475569' }}>
                        Transfer <strong>{reassigningPatient.name}</strong> ({reassigningPatient.mrn}) and their historical exam reports to:
                      </p>
                      <select
                        className="podoload-input"
                        value={targetReassignHospitalId}
                        onChange={(e) => setTargetReassignHospitalId(e.target.value)}
                      >
                        {hospitals.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name} ({h.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="podoload-modal-footer">
                      <button type="button" className="podoload-btn-secondary podoload-btn-sm" onClick={() => setReassigningPatient(null)}>
                        Cancel
                      </button>
                      <button type="button" className="podoload-btn-primary podoload-btn-sm" onClick={handleConfirmReassignHospital}>
                        Confirm Transfer
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: DEVICE BINDING & MULTI-DEVICE LICENSING */}
          {activeTab === 'devices' && (
            <div className="podoload-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Header Title */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 className="podoload-card-title" style={{ margin: 0 }}>
                    DEVICE HARDWARE BINDING & MULTI-STATION LICENSES
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                    IEC 62304 / ISO 13485 cryptographic hardware binding. Single-device restriction with payment expansion provisions.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="podoload-btn-secondary podoload-btn-sm"
                    onClick={() => setShowVoucherRedeem(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Key className="w-3.5 h-3.5 text-teal-600" />
                    <span>Redeem Activation Key</span>
                  </button>

                  <button
                    type="button"
                    className="podoload-btn-primary podoload-btn-sm"
                    onClick={() => setIsPaymentModalOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>+ Expand Device Seats (Payment)</span>
                  </button>
                </div>
              </div>

              {/* Redeem Voucher Key Sub-Form */}
              {showVoucherRedeem && (
                <div style={{ backgroundColor: '#f0fdfa', padding: '0.85rem', borderRadius: '8px', border: '1px solid #99f6e4', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0f766e' }}>
                      Redeem Offline Cryptographic License Key
                    </span>
                    <button type="button" onClick={() => setShowVoucherRedeem(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="podoload-input"
                      placeholder="e.g. PODO-DEV2-MULTI-2026"
                      value={voucherInput}
                      onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                      style={{ fontSize: '0.78rem', fontFamily: 'monospace' }}
                    />
                    <button type="button" className="podoload-btn-primary podoload-btn-sm" onClick={handleRedeemKey}>
                      Activate Key
                    </button>
                  </div>
                  <span style={{ fontSize: '0.66rem', color: '#64748b' }}>
                    Demo keys: <code>PODO-DEV2-MULTI-2026</code> (+1 Seat), <code>PODO-HOSPITAL-5DEV-2026</code> (5 Seats), <code>PODO-ENTERPRISE-UNLIMITED-2026</code> (Unlimited).
                  </span>
                </div>
              )}

              {/* Current Station Hardware Identity Banner */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: '#ccfbf1',
                      color: '#0f766e',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0c2328' }}>
                        {currentDevice.name}
                      </span>
                      <span className="podo-badge podo-badge-green" style={{ fontSize: '0.64rem' }}>
                        This Machine
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                      Terminal ID: <code>{currentDevice.id}</code> · {currentDevice.platform}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {editingDeviceId === currentDevice.id ? (
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="podoload-input"
                        placeholder="New station name"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        style={{ fontSize: '0.74rem', padding: '0.2rem 0.5rem' }}
                      />
                      <button type="button" className="podoload-btn-primary podoload-btn-sm" onClick={handleSaveDeviceName}>
                        Save
                      </button>
                      <button type="button" className="podoload-btn-secondary podoload-btn-sm" onClick={() => setEditingDeviceId(null)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="podoload-btn-secondary podoload-btn-sm"
                      onClick={() => {
                        setEditingDeviceId(currentDevice.id);
                        setEditedName(currentDevice.name);
                      }}
                      style={{ fontSize: '0.72rem' }}
                    >
                      Rename Station
                    </button>
                  )}
                </div>
              </div>

              {/* Multi-Device License Quota Overview */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                <div style={{ padding: '0.85rem', backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#0f766e', fontWeight: 700 }}>ACTIVE CLINICAL TIER</span>
                    <span className="podo-badge podo-badge-green">{deviceLicense.status.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0c2328' }}>
                    {deviceLicense.tierName}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    License Key: <code>{deviceLicense.licenseKey}</code> · Billing: {deviceLicense.billingCycle}
                  </div>
                </div>

                <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>HARDWARE TERMINAL SEATS</span>
                    <span style={{ fontSize: '0.76rem', fontWeight: 800, color: boundDevices.length >= deviceLicense.maxAllowedDevices ? '#d97706' : '#16a34a' }}>
                      {boundDevices.length} of {deviceLicense.maxAllowedDevices} Seats Used
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, (boundDevices.length / deviceLicense.maxAllowedDevices) * 100)}%`,
                        height: '100%',
                        backgroundColor: boundDevices.length >= deviceLicense.maxAllowedDevices ? '#f59e0b' : '#0d9488',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    {boundDevices.length >= deviceLicense.maxAllowedDevices
                      ? 'Single-device license limit reached. Upgrade to add more stations.'
                      : `${deviceLicense.maxAllowedDevices - boundDevices.length} available terminal seat(s) remaining.`}
                  </div>
                </div>
              </div>

              {/* Fleet Table */}
              <div>
                <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', fontWeight: 800, color: '#0c2328' }}>
                  AUTHORIZED HARDWARE TERMINALS FLEET
                </h5>
                <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '6px' }}>
                  <table className="podoload-device-table" style={{ width: '100%', minWidth: '550px', fontSize: '0.74rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>STATION NAME</th>
                      <th style={{ textAlign: 'left' }}>HARDWARE ID</th>
                      <th style={{ textAlign: 'left' }}>PLATFORM / OS</th>
                      <th style={{ textAlign: 'left' }}>BOUND DATE</th>
                      <th style={{ textAlign: 'center' }}>STATUS</th>
                      <th style={{ textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boundDevices.length > 0 ? (
                      boundDevices.map((d) => (
                        <tr key={d.id}>
                          <td style={{ fontWeight: 700, color: '#0c2328' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span>{d.name}</span>
                              {d.isCurrentDevice && (
                                <span className="podo-badge podo-badge-green" style={{ fontSize: '0.6rem' }}>
                                  Active Here
                                </span>
                              )}
                            </div>
                          </td>
                          <td><code>{d.id}</code></td>
                          <td>{d.platform}</td>
                          <td>{d.boundAt?.slice(0, 10) || 'Today'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="podo-badge podo-badge-green">
                              {d.status === 'active' ? 'Authorized' : 'Revoked'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="podoload-btn-secondary podoload-btn-sm"
                              onClick={() => handleUnbindDevice(d.id)}
                              style={{ color: '#dc2626', borderColor: '#fecaca', fontSize: '0.7rem' }}
                              title="Unbind/Revoke device to free seat"
                            >
                              Revoke Seat
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8' }}>
                          No bound devices found. Create an Administrator account to bind this station.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>

              {/* Invoices & License Billing History */}
              {deviceLicense.invoices && deviceLicense.invoices.length > 0 && (
                <div>
                  <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', fontWeight: 800, color: '#0c2328' }}>
                    LICENSE INVOICES & PAYMENT RECEIPTS
                  </h5>
                  <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '6px' }}>
                    <table className="podoload-device-table" style={{ width: '100%', minWidth: '550px', fontSize: '0.74rem' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>INVOICE ID</th>
                        <th style={{ textAlign: 'left' }}>DATE</th>
                        <th style={{ textAlign: 'left' }}>LICENSE DESCRIPTION</th>
                        <th style={{ textAlign: 'left' }}>PAYMENT METHOD</th>
                        <th style={{ textAlign: 'center' }}>AMOUNT</th>
                        <th style={{ textAlign: 'right' }}>RECEIPT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deviceLicense.invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td><strong>{inv.id}</strong></td>
                          <td>{inv.date}</td>
                          <td>{inv.description}</td>
                          <td>{inv.paymentMethod}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>
                            ${inv.amount}.00 USD
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="podoload-btn-secondary podoload-btn-sm"
                              onClick={() => alert(`Receipt #${inv.id} for $${inv.amount}.00 ready for printing.`)}
                              style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <Download className="w-3 h-3" />
                              <span>Receipt</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ALL REGISTERED HOSPITALS & MULTI-TENANCY */}
          {activeTab === 'hospitals' && (
            <div className="podoload-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h4 className="podoload-card-title" style={{ margin: 0 }}>
                    HOSPITAL DIRECTORY & CLINIC ACCOUNTS
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                    Switch between hospitals or register new clinical branches in the Inbuilt Database.
                  </p>
                </div>
                <button
                  type="button"
                  className="podoload-btn-primary podoload-btn-sm"
                  onClick={() => setShowAddHosp(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Register New Hospital</span>
                </button>
              </div>

              {/* Add Hospital Modal */}
              {showAddHosp && (
                <div style={{ backgroundColor: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', fontWeight: 700 }}>Register New Clinical Facility</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div className="podoload-form-group">
                      <label className="podoload-label">Hospital Name</label>
                      <input
                        type="text"
                        className="podoload-input"
                        placeholder="e.g. City Foot Care & Podiatry Center"
                        value={newHospName}
                        onChange={(e) => setNewHospName(e.target.value)}
                      />
                    </div>
                    <div className="podoload-form-group">
                      <label className="podoload-label">Hospital Code</label>
                      <input
                        type="text"
                        className="podoload-input"
                        placeholder="e.g. CITY-FOOT"
                        value={newHospCode}
                        onChange={(e) => setNewHospCode(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button type="button" className="podoload-btn-primary podoload-btn-sm" onClick={handleRegisterHospital}>
                        Register & Login
                      </button>
                      <button type="button" className="podoload-btn-secondary podoload-btn-sm" onClick={() => setShowAddHosp(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Hospitals Table */}
              <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '6px' }}>
                <table className="podoload-device-table" style={{ width: '100%', minWidth: '550px', fontSize: '0.74rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>HOSPITAL / CLINIC</th>
                    <th style={{ textAlign: 'left' }}>CODE</th>
                    <th style={{ textAlign: 'left' }}>REGISTRATION</th>
                    <th style={{ textAlign: 'left' }}>DEFAULT DOCTOR</th>
                    <th style={{ textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {hospitals.map((hosp) => {
                    const isActive = hosp.id === activeHospital.id;
                    return (
                      <tr key={hosp.id} style={{ backgroundColor: isActive ? '#f0fdf4' : undefined }}>
                        <td style={{ fontWeight: 700, color: '#0c2328' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Building2 className="w-4 h-4 text-teal-600" />
                            <span>{hosp.name}</span>
                          </div>
                        </td>
                        <td>{hosp.code}</td>
                        <td>{hosp.registrationNo || 'Accredited'}</td>
                        <td>{hosp.defaultDoctor}</td>
                        <td style={{ textAlign: 'right' }}>
                          {isActive ? (
                            <span className="podo-badge podo-badge-green">Current Active</span>
                          ) : (
                            <button
                              type="button"
                              className="podoload-btn-secondary podoload-btn-sm"
                              onClick={() => handleSwitchHospital(hosp.id)}
                            >
                              Log In
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* TAB 5: DOCTORS & STAFF DIRECTORY */}
          {activeTab === 'staff' && (
            <div className="podoload-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h4 className="podoload-card-title" style={{ margin: 0 }}>
                    ATTENDING CLINICIANS & PHYSICIANS
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                    Manage doctors and staff authorized to conduct examinations and sign off reports.
                  </p>
                </div>
                <button
                  type="button"
                  className="podoload-btn-secondary podoload-btn-sm"
                  onClick={() => setShowAddDoc(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Doctor</span>
                </button>
              </div>

              {/* Add Doctor Sub-Form */}
              {showAddDoc && (
                <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: 700 }}>Add New Attending Clinician</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr auto', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div className="podoload-form-group">
                      <label className="podoload-label">Doctor Name</label>
                      <input
                        type="text"
                        className="podoload-input"
                        placeholder="e.g. Dr. Emily Hayes"
                        value={newDocName}
                        onChange={(e) => setNewDocName(e.target.value)}
                      />
                    </div>
                    <div className="podoload-form-group">
                      <label className="podoload-label">Specialization</label>
                      <input
                        type="text"
                        className="podoload-input"
                        placeholder="Podiatric Surgeon"
                        value={newDocSpec}
                        onChange={(e) => setNewDocSpec(e.target.value)}
                      />
                    </div>
                    <div className="podoload-form-group">
                      <label className="podoload-label">License #</label>
                      <input
                        type="text"
                        className="podoload-input"
                        placeholder="MED-REG-XXXX"
                        value={newDocLic}
                        onChange={(e) => setNewDocLic(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button type="button" className="podoload-btn-primary podoload-btn-sm" onClick={handleAddDoctor}>
                        Save
                      </button>
                      <button type="button" className="podoload-btn-secondary podoload-btn-sm" onClick={() => setShowAddDoc(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Doctors Table */}
              <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '6px' }}>
                <table className="podoload-device-table" style={{ width: '100%', minWidth: '550px', fontSize: '0.74rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>DOCTOR NAME</th>
                    <th style={{ textAlign: 'left' }}>SPECIALTY</th>
                    <th style={{ textAlign: 'left' }}>LICENSE NO</th>
                    <th style={{ textAlign: 'right' }}>REPORT DEFAULT</th>
                  </tr>
                </thead>
                <tbody>
                  {doctors.map((doc) => (
                    <tr key={doc.id}>
                      <td style={{ fontWeight: 700, color: '#0c2328' }}>{doc.name}</td>
                      <td>{doc.specialization}</td>
                      <td>{doc.licenseNo}</td>
                      <td style={{ textAlign: 'right' }}>
                        {defaultDoctor === doc.name ? (
                          <span className="podo-badge podo-badge-green">Primary Signatory</span>
                        ) : (
                          <button
                            type="button"
                            className="podo-link-btn"
                            onClick={() => setDefaultDoctor(doc.name)}
                          >
                            Set as Default
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* TAB 6: SECURITY & USER ACCESS */}
          {activeTab === 'security' && (
            <div className="podoload-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h4 className="podoload-card-title" style={{ margin: 0 }}>
                HOSPITAL LOGIN & ROLE ACCESS CONTROL
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
                <div style={{ padding: '0.65rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.74rem' }}>
                  <div style={{ fontWeight: 700, color: '#0c2328', marginBottom: '0.35rem' }}>Active Session</div>
                  <div>User ID: <strong>{adminAccount.username}</strong></div>
                  <div>Administrator: <strong>{adminAccount.name}</strong></div>
                  <div>Authentication: <strong>PIN &amp; Device Bound (Session Active)</strong></div>
                </div>

                <div style={{ padding: '0.65rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.74rem' }}>
                  <div style={{ fontWeight: 700, color: '#0c2328', marginBottom: '0.35rem' }}>Central Cloud Deployment</div>
                  <div style={{ color: '#475569', marginBottom: '0.2rem' }}>
                    Multi-hospital tenancy, technician logins, and patient records are structured for immediate sync with centralized cloud databases.
                  </div>
                  <span className="podo-badge podo-badge-green">ISO 13485 / IEC 62304 Compliant</span>
                </div>
              </div>

              {/* Administrator Identity & Desired User ID Setting */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #ccfbf1',
                  borderRadius: '8px',
                  padding: '0.75rem 0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f766e' }}>
                      Administrator Identity &amp; Desired User ID Configuration
                    </span>
                  </div>
                  <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem' }}>
                    Login Credentials Bound
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  Configure your desired Administrator User ID. This User ID is required alongside your Master Password at login time.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr auto', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <div className="podoload-form-group">
                    <label className="podoload-label">Desired Admin User ID / Username *</label>
                    <input
                      type="text"
                      className="podoload-input"
                      placeholder="e.g. dr.specialist or admin@hospital.com"
                      value={desiredAdminUsername}
                      onChange={(e) => setDesiredAdminUsername(e.target.value)}
                    />
                  </div>
                  <div className="podoload-form-group">
                    <label className="podoload-label">Administrator Full Name</label>
                    <input
                      type="text"
                      className="podoload-input"
                      placeholder="e.g. Dr. Specialist / Hospital Admin"
                      value={desiredAdminName}
                      onChange={(e) => setDesiredAdminName(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="podoload-btn-primary podoload-btn-sm"
                    onClick={handleSaveAdminProfile}
                    style={{ whiteSpace: 'nowrap', height: '32px' }}
                  >
                    Save User ID
                  </button>
                </div>
              </div>

              {/* Technician Activation Voucher Expiry & Rotation Security Policy */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #ccfbf1',
                  borderRadius: '8px',
                  padding: '0.75rem 0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f766e' }}>
                      Technician Activation Voucher Expiration &amp; Rotation Policy
                    </span>
                  </div>
                  <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem' }}>
                    Active: {formatVoucherPolicyLabel(expiryPolicy)}
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  Define how long activation codes remain valid before automatically rotating (Hours, Days, or Minutes). Prevents stale credentials and enforces periodic rotation across diagnostic terminals.
                </div>

                {/* Quick Presets */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#475569', marginRight: '0.2rem' }}>
                    Quick Presets:
                  </span>
                  {[
                    { label: '1 Hour', duration: 1, unit: 'hours' as const },
                    { label: '2 Hours', duration: 2, unit: 'hours' as const },
                    { label: '8 Hours', duration: 8, unit: 'hours' as const },
                    { label: '24 Hours (1 Day)', duration: 24, unit: 'hours' as const },
                    { label: '3 Days', duration: 3, unit: 'days' as const },
                    { label: '7 Days (1 Wk)', duration: 7, unit: 'days' as const },
                    { label: '30 Days (1 Mo)', duration: 30, unit: 'days' as const },
                  ].map((preset) => {
                    const isSelected = expiryPolicy.duration === preset.duration && expiryPolicy.unit === preset.unit;
                    return (
                      <button
                        key={`sec-${preset.label}`}
                        type="button"
                        onClick={() => handleApplyPresetPolicy(preset.duration, preset.unit)}
                        style={{
                          fontSize: '0.68rem',
                          padding: '0.25rem 0.55rem',
                          borderRadius: '4px',
                          border: isSelected ? '1.5px solid #0d9488' : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? '#ccfbf1' : '#f8fafc',
                          color: isSelected ? '#0f766e' : '#334155',
                          fontWeight: isSelected ? 800 : 600,
                          cursor: 'pointer',
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Configuration */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    flexWrap: 'wrap',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
                      Custom Duration:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      className="podoload-input"
                      value={policyDurationInput}
                      onChange={(e) => setPolicyDurationInput(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ width: '65px', padding: '0.25rem 0.4rem', fontSize: '0.75rem', fontWeight: 700 }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap' }}>
                      Unit:
                    </label>
                    <select
                      className="podoload-input"
                      value={policyUnitInput}
                      onChange={(e) => setPolicyUnitInput(e.target.value as VoucherExpiryUnit)}
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 700 }}
                    >
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="minutes">Minutes</option>
                    </select>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={policyAutoRotate}
                      onChange={(e) => setPolicyAutoRotate(e.target.checked)}
                    />
                    <span>Auto-rotate voucher on expiration</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={applyToExisting}
                      onChange={(e) => setApplyToExisting(e.target.checked)}
                    />
                    <span>Apply to all existing technicians</span>
                  </label>

                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      className="podoload-btn-primary"
                      onClick={() => handleSaveExpiryPolicy()}
                      style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem', fontWeight: 700 }}
                    >
                      Save &amp; Apply Policy
                    </button>
                  </div>
                </div>

                {policyFeedbackMsg && (
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: '#15803d',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      padding: '0.35rem 0.6rem',
                      borderRadius: '4px',
                      fontWeight: 700,
                    }}
                  >
                    {policyFeedbackMsg}
                  </div>
                )}
              </div>

              {/* System Diagnostics & Clinical Error Logs Audit Table */}
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: '#0c2328' }}>
                      SYSTEM DIAGNOSTICS & CLINICAL ERROR LOGS (IEC 62304 / ISO 13485)
                    </h5>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                      Detailed runtime anomaly tracking with root-cause reasons, station parameters, and exportable logs.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <button
                      type="button"
                      className="podoload-btn-secondary podoload-btn-sm"
                      onClick={() => {
                        const json = diagnosticsLogger.exportLogsJson();
                        const blob = new Blob([json], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `PodoPress-Audit-Logs-${new Date().toISOString().slice(0, 10)}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export All Logs (.json)</span>
                    </button>

                    {diagnosticLogs.length > 0 && (
                      <button
                        type="button"
                        className="podoload-btn-secondary podoload-btn-sm"
                        onClick={() => {
                          if (confirm('Clear all captured diagnostic error logs?')) {
                            diagnosticsLogger.clearLogs();
                            setDiagnosticLogs([]);
                            setSaveSuccess('✓ Diagnostic logs cleared.');
                            setTimeout(() => setSaveSuccess(null), 2500);
                          }
                        }}
                        style={{ fontSize: '0.7rem', color: '#dc2626', borderColor: '#fecaca' }}
                      >
                        Clear Logs
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '6px' }}>
                  <table className="podoload-device-table" style={{ width: '100%', minWidth: '550px', fontSize: '0.74rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>LOG ID & TIME</th>
                      <th style={{ textAlign: 'left' }}>CATEGORY</th>
                      <th style={{ textAlign: 'left' }}>ERROR MESSAGE</th>
                      <th style={{ textAlign: 'left' }}>DIAGNOSTIC REASON & REMEDY</th>
                      <th style={{ textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnosticLogs.length > 0 ? (
                      diagnosticLogs.map((log) => (
                        <tr key={log.id}>
                          <td style={{ fontWeight: 700, color: '#0c2328' }}>
                            <div>{log.id}</div>
                            <span style={{ fontSize: '0.64rem', color: '#64748b' }}>
                              {log.timestamp.slice(0, 16).replace('T', ' ')}
                            </span>
                          </td>
                          <td>
                            <span
                              className="podo-badge"
                              style={{
                                fontSize: '0.62rem',
                                backgroundColor:
                                  log.category === 'METRICS_HYDRATION'
                                    ? '#e0f2fe'
                                    : log.category === 'STORAGE_QUOTA'
                                    ? '#fef3c7'
                                    : '#fee2e2',
                                color:
                                  log.category === 'METRICS_HYDRATION'
                                    ? '#0369a1'
                                    : log.category === 'STORAGE_QUOTA'
                                    ? '#b45309'
                                    : '#b91c1c',
                              }}
                            >
                              {log.categoryLabel}
                            </span>
                          </td>
                          <td>
                            <code style={{ fontSize: '0.68rem', color: '#b91c1c' }}>
                              {log.errorMessage}
                            </code>
                          </td>
                          <td style={{ maxWidth: '280px' }}>
                            <div style={{ fontSize: '0.7rem', color: '#334155', lineHeight: 1.35 }}>
                              {log.reasonExplanation}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="podoload-btn-secondary podoload-btn-sm"
                              onClick={() => setSelectedDetailLog(log)}
                              style={{ fontSize: '0.68rem' }}
                            >
                              View Trace
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '1rem', color: '#16a34a', fontWeight: 600 }}>
                          ✓ Zero system anomalies recorded. All clinical pipelines operating within normative limits.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>

              {/* Security & System Audit Trail Table */}
              <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800, color: '#0c2328' }}>
                      SECURITY &amp; SYSTEM AUDIT LOG (USAGE &amp; ACCESS TRAIL — 21 CFR PART 11)
                    </h5>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                      Audit log capturing user logins, 1-hour code rotations, device activations, and administrative actions.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="podoload-btn-secondary podoload-btn-sm"
                    onClick={() => {
                      const json = JSON.stringify(auditLogs, null, 2);
                      const blob = new Blob([json], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `PodoPress-Audit-Trail-${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Audit Trail (.json)</span>
                  </button>
                </div>

                <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '6px' }}>
                  <table className="podoload-device-table" style={{ width: '100%', minWidth: '550px', fontSize: '0.74rem' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>TIMESTAMP</th>
                      <th style={{ textAlign: 'left' }}>ACTOR / USER ID</th>
                      <th style={{ textAlign: 'left' }}>EVENT / ACTION</th>
                      <th style={{ textAlign: 'left' }}>AUDIT DETAILS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.slice(0, 25).map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {log.timestamp.slice(0, 19).replace('T', ' ')}
                        </td>
                        <td>
                          <code style={{ fontSize: '0.7rem', backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '3px', fontWeight: 700, color: '#0f766e' }}>
                            {log.userId}
                          </code>
                        </td>
                        <td>
                          <span
                            className="podo-badge"
                            style={{
                              fontSize: '0.6rem',
                              backgroundColor: log.action.includes('FAILED') ? '#fee2e2' : log.action.includes('ROTATE') ? '#fef3c7' : '#ecfdf5',
                              color: log.action.includes('FAILED') ? '#b91c1c' : log.action.includes('ROTATE') ? '#b45309' : '#047857',
                            }}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.7rem', color: '#334155' }}>
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>

              {/* Selected Detail Trace Modal */}
              {selectedDetailLog && (
                <div className="podoload-modal-backdrop" onClick={() => setSelectedDetailLog(null)}>
                  <div
                    className="podoload-modal-box"
                    style={{ maxWidth: '640px', width: '92%', maxHeight: '85vh', overflowY: 'auto' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="podoload-modal-header">
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>
                        Diagnostic Error Trace ({selectedDetailLog.id})
                      </h4>
                      <button type="button" className="podoload-modal-close-btn" onClick={() => setSelectedDetailLog(null)}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.76rem' }}>
                      <div>
                        <strong>Error Classification:</strong> {selectedDetailLog.categoryLabel}
                      </div>
                      <div>
                        <strong>Diagnostic Reason:</strong> {selectedDetailLog.reasonExplanation}
                      </div>
                      <div>
                        <strong>Remedy / Action:</strong> {selectedDetailLog.suggestedRemedy}
                      </div>
                      <div>
                        <strong>Station:</strong> {selectedDetailLog.deviceInfo.name} ({selectedDetailLog.deviceInfo.id})
                      </div>
                      <div>
                        <strong>JavaScript Stack Trace:</strong>
                        <pre
                          style={{
                            backgroundColor: '#0f172a',
                            color: '#f87171',
                            padding: '0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.68rem',
                            overflowX: 'auto',
                            whiteSpace: 'pre-wrap',
                            marginTop: '4px',
                          }}
                        >
                          {selectedDetailLog.errorStack || 'No stack trace captured.'}
                        </pre>
                      </div>
                      {selectedDetailLog.componentStack && (
                        <div>
                          <strong>React Component Tree:</strong>
                          <pre
                            style={{
                              backgroundColor: '#0f172a',
                              color: '#cbd5e1',
                              padding: '0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              overflowX: 'auto',
                              whiteSpace: 'pre-wrap',
                              marginTop: '4px',
                            }}
                          >
                            {selectedDetailLog.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                    <div className="podoload-modal-footer">
                      <button
                        type="button"
                        className="podoload-btn-secondary podoload-btn-sm"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(selectedDetailLog, null, 2));
                          alert('Diagnostic trace copied to clipboard.');
                        }}
                      >
                        Copy Trace
                      </button>
                      <button type="button" className="podoload-btn-primary podoload-btn-sm" onClick={() => setSelectedDetailLog(null)}>
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
            <button
              type="button"
              className="podoload-btn-primary"
              onClick={handleSaveHospital}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.25rem' }}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Configurations</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Technician Password Maintenance Modal */}
      {editingTechPassword && (
        <div
          className="podoload-modal-backdrop"
          onClick={() => setEditingTechPassword(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="podoload-modal-box"
            style={{ maxWidth: '440px', width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="podoload-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 700, color: '#0c2328' }}>
                    Reset Technician Password (Admin Authorization)
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                    Admin-controlled credential reset &amp; password generation for {editingTechPassword.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="podoload-modal-close-btn"
                onClick={() => setEditingTechPassword(null)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div
                style={{
                  backgroundColor: '#f0fdfa',
                  border: '1px solid #99f6e4',
                  borderRadius: '6px',
                  padding: '0.6rem 0.75rem',
                  fontSize: '0.72rem',
                  color: '#0f766e',
                  lineHeight: 1.45,
                }}
              >
                <div><strong>Login Username:</strong> <code>{editingTechPassword.username}</code></div>
                <div><strong>Assigned Clinic:</strong> {editingTechPassword.hospitalName || 'Clinic'}</div>
                {editingTechPassword.recoveryKey && (
                  <div><strong>Security Recovery Key:</strong> <code>{editingTechPassword.recoveryKey}</code></div>
                )}
              </div>

              <div className="podoload-form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label className="podoload-label">New Technician Password *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const gen = 'Tech' + Math.floor(1000 + Math.random() * 9000) + '!';
                      setTechEditPasswordVal(gen);
                      setShowTechEditPasswordVal(true);
                      setTechPasswordModalError(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '0.66rem',
                      color: '#0d9488',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    ⚡ Generate Password
                  </button>
                </div>

                <div style={{ position: 'relative' }}>
                  <input
                    type={showTechEditPasswordVal ? 'text' : 'password'}
                    className="podoload-input"
                    value={techEditPasswordVal}
                    onChange={(e) => {
                      setTechEditPasswordVal(e.target.value);
                      setTechPasswordModalError(null);
                    }}
                    placeholder="Enter new password (min. 4 characters)"
                    style={{ fontSize: '0.76rem', paddingRight: '2rem' }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowTechEditPasswordVal(!showTechEditPasswordVal)}
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
                    {showTechEditPasswordVal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {techPasswordModalError && (
                <div
                  style={{
                    color: '#b91c1c',
                    fontSize: '0.72rem',
                    backgroundColor: '#fef2f2',
                    padding: '0.4rem 0.6rem',
                    borderRadius: '4px',
                    border: '1px solid #fecaca',
                  }}
                >
                  {techPasswordModalError}
                </div>
              )}
            </div>

            <div className="podoload-modal-footer">
              <button
                type="button"
                className="podoload-btn-secondary"
                onClick={() => setEditingTechPassword(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="podoload-btn-primary"
                onClick={handleSaveTechPassword}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Check className="w-4 h-4" />
                <span>Save New Password</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Technician Mobile App Activation Voucher Modal */}
      {voucherTech && (
        <div className="podoload-modal-overlay">
          <div className="podoload-modal-card" style={{ maxWidth: '480px', width: '92%' }}>
            <div className="podoload-modal-header" style={{ borderBottom: '1px solid #e2e8f0' }}>
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
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="podoload-modal-title" style={{ margin: 0, fontSize: '0.92rem' }}>
                    Clinical Device Activation Voucher
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: '#64748b' }}>
                    Share these credentials with the technician for mobile app or station enrollment
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="podoload-modal-close-btn"
                onClick={() => setVoucherTech(null)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Voucher Card Details */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1.5px dashed #0d9488',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.66rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                      Facility & Hospital
                    </div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0c2328' }}>
                      {voucherTech.hospitalName || 'Technomind Healthcare Systems'}
                    </div>
                  </div>
                  <span className="podo-badge podo-badge-green" style={{ fontSize: '0.64rem' }}>
                    Authorized Operator
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ backgroundColor: '#ffffff', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.64rem', color: '#64748b' }}>Clinic / Hospital Code:</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0f766e', fontFamily: 'monospace' }}>
                      {hospitals.find((h) => h.id === voucherTech.hospitalId)?.code || 'TMH-CENTRAL'}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.64rem', color: '#64748b' }}>Technician Full Name:</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b' }}>
                      {voucherTech.name}
                    </div>
                  </div>
                </div>

                {/* Primary Activation Voucher Code */}
                <div
                  style={{
                    backgroundColor: '#f0fdfa',
                    border: '1.5px solid #99f6e4',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Technician Activation Voucher Code
                  </div>
                  <div
                    style={{
                      fontSize: '1.35rem',
                      fontWeight: 900,
                      letterSpacing: '0.08em',
                      fontFamily: 'monospace',
                      color: '#115e59',
                    }}
                  >
                    {voucherTech.activationCode || 'TMH-TECH-1001'}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '4px' }}>
                    One-time enrollment voucher to bind device for 100% offline scanning
                  </div>
                </div>

                {/* Platform Compatibility Badges */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem' }}>🤖 Android APK</span>
                  <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem' }}>🍎 iOS App</span>
                  <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem' }}>🪟 Windows Desktop .EXE</span>
                  <span className="podo-badge podo-badge-gray" style={{ fontSize: '0.62rem' }}>⚡ 100% Offline Capable</span>
                </div>

                {/* Step-by-Step Instructions */}
                <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 700, color: '#0c2328', marginBottom: '2px' }}>
                    Instructions for Android App, iOS App &amp; Windows Desktop (.exe):
                  </div>
                  <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
                    <li>Launch <strong>PodoPress</strong> application on your mobile device, tablet, or Windows computer.</li>
                    <li>Select <strong>"Activate Device with Code"</strong> on the enrollment screen.</li>
                    <li>Enter Clinic Code: <strong>{hospitals.find((h) => h.id === voucherTech.hospitalId)?.code || 'TMH-CENTRAL'}</strong>.</li>
                    <li>Enter Activation Code: <strong>{voucherTech.activationCode || 'TMH-TECH-1001'}</strong>.</li>
                    <li>Confirm your quick-access PIN/Password. Device is bound and fully authorized for 100% offline scanning!</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="podoload-modal-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                type="button"
                className="podoload-btn-secondary"
                onClick={() => setVoucherTech(null)}
              >
                Close
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="podoload-btn-secondary"
                  onClick={() => handleShareVoucherWhatsApp(voucherTech)}
                  style={{
                    fontSize: '0.72rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    color: '#15803d',
                    borderColor: '#86efac',
                    backgroundColor: '#f0fdf4',
                    fontWeight: 700,
                  }}
                  title="Dispatch activation voucher directly via WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  className="podoload-btn-secondary"
                  onClick={() => handleShareVoucherEmail(voucherTech)}
                  style={{
                    fontSize: '0.72rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    color: '#0369a1',
                    borderColor: '#7dd3fc',
                    backgroundColor: '#f0f9ff',
                    fontWeight: 700,
                  }}
                  title="Email activation voucher to technician"
                >
                  <Mail className="w-3.5 h-3.5 text-sky-600" />
                  <span>Email</span>
                </button>

                <button
                  type="button"
                  className="podoload-btn-secondary"
                  onClick={() => window.print()}
                  style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                  title="Print activation voucher card"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600" />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  className="podoload-btn-primary"
                  onClick={() => handleShareNative(voucherTech)}
                  style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Instructions</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multi-Device Payment & License Expansion Modal */}
      <PodoLoadDevicePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={(updatedLicense) => {
          setDeviceLicense(updatedLicense);
          setBoundDevices(dbService.getBoundDevicesSync());
          setIsPaymentModalOpen(false);
          setSaveSuccess('✓ Multi-device license expanded successfully! Hardware station seat allocated.');
          setTimeout(() => setSaveSuccess(null), 3500);
        }}
      />
    </div>
  );
};
