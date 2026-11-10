import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  Laptop,
  FileText,
  KeyRound,
  Download,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  LogOut,
  ChevronRight,
  Clock,
  Check,
  Trash2,
  ShieldAlert,
  Server,
  Lock,
  Edit3,
  Phone,
  Mail,
  MapPin,
  Activity,
  Globe,
  Stethoscope,
} from 'lucide-react';
import { dbService } from '../../services/dbService';
import { deviceBindingService } from '../../services/deviceBindingService';
import { getAuditEvents } from '../../services/auditService';
import { AdminAccount, AnalysisCase, AuditEvent, HospitalProfile, TechnicianUser } from '../../types';

interface PodoLoadSuperAdminProps {
  onLogout: () => void;
  onSwitchRole: (role: 'admin' | 'technician') => void;
  onOpenCase?: (caseItem: AnalysisCase) => void;
}

export const PodoLoadSuperAdmin: React.FC<PodoLoadSuperAdminProps> = ({
  onLogout,
  onSwitchRole,
  onOpenCase,
}) => {
  const [activeTab, setActiveTab] = useState<'hospitals' | 'admins' | 'activations' | 'reports' | 'audit' | 'export'>('hospitals');
  const [hospitalsList, setHospitalsList] = useState<HospitalProfile[]>(() => dbService.getHospitalProfilesSync());
  const [adminsList, setAdminsList] = useState<AdminAccount[]>(() => dbService.getAdminAccountsListSync());
  const [telemetryList, setTelemetryList] = useState(() => dbService.getAllActivationsTelemetry());
  const [casesList, setCasesList] = useState<AnalysisCase[]>(() => dbService.getCasesSync());
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(() => getAuditEvents());
  const [metrics, setMetrics] = useState(() => dbService.getSuperAdminGlobalMetrics());

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [hospSearchQuery, setHospSearchQuery] = useState('');
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState('all');

  // Register Hospital Modal state
  const [isRegisterHospModalOpen, setIsRegisterHospModalOpen] = useState(false);
  const [hospNameInput, setHospNameInput] = useState('');
  const [hospCodeInput, setHospCodeInput] = useState('');
  const [hospRegNoInput, setHospRegNoInput] = useState('');
  const [hospDeptInput, setHospDeptInput] = useState('Department of Podiatry & Plantar Biomechanics');
  const [hospAddressInput, setHospAddressInput] = useState('');
  const [hospContactInput, setHospContactInput] = useState('');
  const [hospEmailInput, setHospEmailInput] = useState('');
  const [hospWebsiteInput, setHospWebsiteInput] = useState('');
  const [hospDoctorInput, setHospDoctorInput] = useState('');
  const [hospTechInput, setHospTechInput] = useState('');
  const [hospQuotaInput, setHospQuotaInput] = useState('10');
  const [hospAlsoCreateAdmin, setHospAlsoCreateAdmin] = useState(true);
  const [hospAdminNameInput, setHospAdminNameInput] = useState('');
  const [hospAdminUsernameInput, setHospAdminUsernameInput] = useState('');
  const [hospAdminPinInput, setHospAdminPinInput] = useState('');
  const [showHospAdminPin, setShowHospAdminPin] = useState(false);
  const [registerHospError, setRegisterHospError] = useState<string | null>(null);
  const [registerHospSuccess, setRegisterHospSuccess] = useState<string | null>(null);

  // Edit Hospital Modal state
  const [editingHospital, setEditingHospital] = useState<HospitalProfile | null>(null);
  const [editHospName, setEditHospName] = useState('');
  const [editHospCode, setEditHospCode] = useState('');
  const [editHospRegNo, setEditHospRegNo] = useState('');
  const [editHospDept, setEditHospDept] = useState('');
  const [editHospAddress, setEditHospAddress] = useState('');
  const [editHospContact, setEditHospContact] = useState('');
  const [editHospEmail, setEditHospEmail] = useState('');
  const [editHospWebsite, setEditHospWebsite] = useState('');
  const [editHospDoctor, setEditHospDoctor] = useState('');
  const [editHospTech, setEditHospTech] = useState('');
  const [editHospFooter, setEditHospFooter] = useState('');
  const [editHospError, setEditHospError] = useState<string | null>(null);
  const [editHospSuccess, setEditHospSuccess] = useState<string | null>(null);

  // Create Admin Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPin, setNewAdminPin] = useState('');
  const [newAdminHospitalName, setNewAdminHospitalName] = useState('');
  const [newAdminHospitalCode, setNewAdminHospitalCode] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminStationsQuota, setNewAdminStationsQuota] = useState('5');
  const [createAdminError, setCreateAdminError] = useState<string | null>(null);
  const [createAdminSuccess, setCreateAdminSuccess] = useState<string | null>(null);
  const [showNewPin, setShowNewPin] = useState(false);

  // Edit / Reset Password Modal state
  const [selectedAdminForAction, setSelectedAdminForAction] = useState<AdminAccount | null>(null);
  const [resetPinInput, setResetPinInput] = useState('');
  const [resetPinSuccess, setResetPinSuccess] = useState<string | null>(null);

  const refreshAllData = () => {
    setHospitalsList(dbService.getHospitalProfilesSync());
    setAdminsList(dbService.getAdminAccountsListSync());
    setTelemetryList(dbService.getAllActivationsTelemetry());
    setCasesList(dbService.getCasesSync());
    setAuditLogs(getAuditEvents());
    setMetrics(dbService.getSuperAdminGlobalMetrics());
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const handleRegisterHospitalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterHospError(null);
    setRegisterHospSuccess(null);

    if (!hospNameInput.trim()) {
      setRegisterHospError('Hospital name is required.');
      return;
    }

    const result = dbService.registerHospital({
      name: hospNameInput.trim(),
      code: hospCodeInput.trim(),
      registrationNo: hospRegNoInput.trim(),
      department: hospDeptInput.trim(),
      address: hospAddressInput.trim(),
      contact: hospContactInput.trim(),
      email: hospEmailInput.trim(),
      website: hospWebsiteInput.trim(),
      defaultDoctor: hospDoctorInput.trim() || undefined,
      defaultTechnician: hospTechInput.trim() || undefined,
      maxStationsAllowed: Number(hospQuotaInput) || 10,
    });

    if (!result.success || !result.hospital) {
      setRegisterHospError(result.error || 'Failed to register hospital.');
      return;
    }

    // Optional: automatically provision primary admin for this hospital
    if (hospAlsoCreateAdmin && hospAdminUsernameInput.trim() && hospAdminPinInput.trim()) {
      dbService.createHospitalAdmin({
        name: hospAdminNameInput.trim() || `Admin (${result.hospital.name})`,
        username: hospAdminUsernameInput.trim(),
        pin: hospAdminPinInput.trim(),
        hospitalName: result.hospital.name,
        hospitalCode: result.hospital.code,
        phone: hospContactInput.trim(),
        email: hospEmailInput.trim() || hospAdminUsernameInput.trim(),
        maxStationsAllowed: Number(hospQuotaInput) || 10,
      });
    }

    setRegisterHospSuccess(`Hospital "${result.hospital.name}" (${result.hospital.code}) registered successfully!`);
    setTimeout(() => {
      setIsRegisterHospModalOpen(false);
      setHospNameInput('');
      setHospCodeInput('');
      setHospRegNoInput('');
      setHospAddressInput('');
      setHospContactInput('');
      setHospEmailInput('');
      setHospWebsiteInput('');
      setHospDoctorInput('');
      setHospTechInput('');
      setHospAdminNameInput('');
      setHospAdminUsernameInput('');
      setHospAdminPinInput('');
      setRegisterHospSuccess(null);
      refreshAllData();
    }, 1200);
  };

  const handleEditHospitalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHospital) return;
    setEditHospError(null);
    setEditHospSuccess(null);

    const res = dbService.updateHospital(editingHospital.id, {
      name: editHospName.trim(),
      code: editHospCode.trim().toUpperCase(),
      registrationNo: editHospRegNo.trim(),
      department: editHospDept.trim(),
      address: editHospAddress.trim(),
      contact: editHospContact.trim(),
      email: editHospEmail.trim(),
      website: editHospWebsite.trim(),
      defaultDoctor: editHospDoctor.trim() || undefined,
      defaultTechnician: editHospTech.trim() || undefined,
      footerText: editHospFooter.trim() || undefined,
    });

    if (!res.success) {
      setEditHospError(res.error || 'Failed to update hospital.');
      return;
    }

    setEditHospSuccess(`Hospital "${editHospName}" updated successfully.`);
    setTimeout(() => {
      setEditingHospital(null);
      setEditHospSuccess(null);
      refreshAllData();
    }, 1000);
  };

  const handleDeleteHospital = (hosp: HospitalProfile) => {
    const conf = confirm(
      `Are you sure you want to delete / archive hospital "${hosp.name}" (${hosp.code})? This will unbind related records.`
    );
    if (!conf) return;
    const res = dbService.deleteHospital(hosp.id);
    if (!res.success) {
      alert(res.error || 'Failed to delete hospital.');
      return;
    }
    refreshAllData();
  };

  const openEditHospitalModal = (hosp: HospitalProfile) => {
    setEditingHospital(hosp);
    setEditHospName(hosp.name);
    setEditHospCode(hosp.code);
    setEditHospRegNo(hosp.registrationNo || '');
    setEditHospDept(hosp.department || '');
    setEditHospAddress(hosp.address || '');
    setEditHospContact(hosp.contact || '');
    setEditHospEmail(hosp.email || '');
    setEditHospWebsite(hosp.website || '');
    setEditHospDoctor(hosp.defaultDoctor || '');
    setEditHospTech(hosp.defaultTechnician || '');
    setEditHospFooter(hosp.footerText || '');
    setEditHospError(null);
    setEditHospSuccess(null);
  };

  const handleCreateAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateAdminError(null);
    setCreateAdminSuccess(null);

    const result = dbService.createHospitalAdmin({
      name: newAdminName,
      username: newAdminUsername,
      pin: newAdminPin,
      hospitalName: newAdminHospitalName,
      hospitalCode: newAdminHospitalCode,
      phone: newAdminPhone,
      email: newAdminEmail,
      maxStationsAllowed: Number(newAdminStationsQuota) || 5,
    });

    if (!result.success) {
      setCreateAdminError(result.error || 'Failed to create Administrator.');
      return;
    }

    setCreateAdminSuccess(`Hospital Administrator "${result.account?.name}" created successfully for ${result.account?.hospitalName}!`);
    setTimeout(() => {
      setIsCreateModalOpen(false);
      setNewAdminName('');
      setNewAdminUsername('');
      setNewAdminPin('');
      setNewAdminHospitalName('');
      setNewAdminHospitalCode('');
      setNewAdminPhone('');
      setNewAdminEmail('');
      setCreateAdminSuccess(null);
      refreshAllData();
    }, 1500);
  };

  const handleToggleAdminStatus = (admin: AdminAccount) => {
    const nextStatus = admin.status === 'active' ? 'suspended' : 'active';
    const conf = confirm(
      `Are you sure you want to ${nextStatus === 'suspended' ? 'SUSPEND' : 'ACTIVATE'} Administrator "${admin.name}" (${admin.username})?`
    );
    if (!conf) return;

    dbService.updateHospitalAdmin(admin.id, { status: nextStatus });
    refreshAllData();
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdminForAction) return;
    if (!resetPinInput || resetPinInput.trim().length < 4) {
      alert('Password must be at least 4 characters.');
      return;
    }

    dbService.updateHospitalAdmin(selectedAdminForAction.id, { pin: resetPinInput.trim() });
    setResetPinSuccess(`Password for ${selectedAdminForAction.name} successfully updated to "${resetPinInput.trim()}".`);
    setTimeout(() => {
      setSelectedAdminForAction(null);
      setResetPinInput('');
      setResetPinSuccess(null);
      refreshAllData();
    }, 1400);
  };

  const handleRevokeDevice = async (deviceId: string, techName: string) => {
    const conf = confirm(
      `SECURITY KILL-SWITCH: Are you sure you want to REVOKE workstation "${deviceId}" bound to technician "${techName}"? The station will be instantly locked out.`
    );
    if (!conf) return;

    await dbService.revokeDeviceAuthorization(`Revoked by Super Administrator for station ${deviceId} (Tech: ${techName})`);
    refreshAllData();
  };

  const handleExportSystemBackup = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      exportAuthority: 'SUPER_ADMINISTRATOR',
      metrics: dbService.getSuperAdminGlobalMetrics(),
      hospitals: dbService.getHospitalProfilesSync(),
      administrators: dbService.getAdminAccountsListSync(),
      technicians: dbService.getTechniciansSync(),
      workstationActivations: dbService.getAllActivationsTelemetry(),
      casesCount: casesList.length,
      cases: casesList,
      auditLogsCount: auditLogs.length,
      auditLogs,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PODOPRESS_GLOBAL_SYSTEM_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="podoload-superadmin-root" style={{ padding: '1.25rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Super Admin Identity Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #091e28 0%, #0d3b43 60%, #064e3b 100%)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          color: '#ffffff',
          marginBottom: '1.25rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
            }}
          >
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Super Administrator Master Console
              </h2>
              <span
                style={{
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Tier-1 Governance
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#cbd5e1' }}>
              Multi-tenant clinical hierarchy: Super Admin provisions Hospital Admins → Admins provision Technicians → Technicians activate stations & scan.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="podoload-btn-secondary podoload-btn-sm"
            onClick={refreshAllData}
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)' }}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1 inline" />
            Refresh Telemetry
          </button>

          <button
            type="button"
            className="podoload-btn-secondary podoload-btn-sm"
            onClick={() => onSwitchRole('admin')}
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)' }}
          >
            <Building2 className="w-3.5 h-3.5 mr-1 inline" />
            Hospital Admin Portal
          </button>

          <button
            type="button"
            className="podoload-btn-secondary podoload-btn-sm"
            onClick={() => onSwitchRole('technician')}
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)' }}
          >
            <Users className="w-3.5 h-3.5 mr-1 inline" />
            Technician View
          </button>

          <button
            type="button"
            className="podoload-btn-danger podoload-btn-sm"
            onClick={onLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Global Telemetry KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.25rem',
        }}
      >
        <div className="podoload-card" style={{ padding: '0.9rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Hospitals & Admins
            </span>
            <Building2 className="w-4 h-4 text-teal-600" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0c2328', marginTop: '0.25rem' }}>
            {metrics.totalAdmins}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: '0.2rem' }}>
            ✓ {metrics.totalHospitals} Distinct Hospital Profiles
          </div>
        </div>

        <div className="podoload-card" style={{ padding: '0.9rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Clinical Technicians
            </span>
            <Users className="w-4 h-4 text-cyan-600" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0c2328', marginTop: '0.25rem' }}>
            {metrics.totalTechnicians}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
            Admin-assigned examination operators
          </div>
        </div>

        <div className="podoload-card" style={{ padding: '0.9rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Active Workstations
            </span>
            <Laptop className="w-4 h-4 text-emerald-600" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0c2328', marginTop: '0.25rem' }}>
            {metrics.totalActiveStations}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#16a34a', marginTop: '0.2rem' }}>
            ✓ Bound with Hardware Fingerprint & MAC
          </div>
        </div>

        <div className="podoload-card" style={{ padding: '0.9rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Total Clinical Cases
            </span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0c2328', marginTop: '0.25rem' }}>
            {metrics.totalCases}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
            Plantar pressure scans & reports logged
          </div>
        </div>

        <div className="podoload-card" style={{ padding: '0.9rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Voucher Burn Rate
            </span>
            <KeyRound className="w-4 h-4 text-amber-600" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0c2328', marginTop: '0.25rem' }}>
            {metrics.totalBurnedCodes}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#b45309', marginTop: '0.2rem' }}>
            Single-use activation codes consumed
          </div>
        </div>
      </div>

      {/* Main Console Navigation Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('hospitals')}
          style={{
            padding: '0.65rem 1rem',
            border: 'none',
            borderBottom: activeTab === 'hospitals' ? '3px solid #0f766e' : '3px solid transparent',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'hospitals' ? 700 : 500,
            color: activeTab === 'hospitals' ? '#0f766e' : '#64748b',
            cursor: 'pointer',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Building2 className="w-4 h-4" />
          <span>Registered Hospitals & Clinics ({hospitalsList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('admins')}
          style={{
            padding: '0.65rem 1rem',
            border: 'none',
            borderBottom: activeTab === 'admins' ? '3px solid #0f766e' : '3px solid transparent',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'admins' ? 700 : 500,
            color: activeTab === 'admins' ? '#0f766e' : '#64748b',
            cursor: 'pointer',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Users className="w-4 h-4" />
          <span>Hospital Administrators ({adminsList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('activations')}
          style={{
            padding: '0.65rem 1rem',
            border: 'none',
            borderBottom: activeTab === 'activations' ? '3px solid #0f766e' : '3px solid transparent',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'activations' ? 700 : 500,
            color: activeTab === 'activations' ? '#0f766e' : '#64748b',
            cursor: 'pointer',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Laptop className="w-4 h-4" />
          <span>Workstation Activations & Hardware Binding ({telemetryList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '0.65rem 1rem',
            border: 'none',
            borderBottom: activeTab === 'reports' ? '3px solid #0f766e' : '3px solid transparent',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'reports' ? 700 : 500,
            color: activeTab === 'reports' ? '#0f766e' : '#64748b',
            cursor: 'pointer',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <FileText className="w-4 h-4" />
          <span>Global Clinical Reports ({casesList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '0.65rem 1rem',
            border: 'none',
            borderBottom: activeTab === 'audit' ? '3px solid #0f766e' : '3px solid transparent',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'audit' ? 700 : 500,
            color: activeTab === 'audit' ? '#0f766e' : '#64748b',
            cursor: 'pointer',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Master Audit Trail (21 CFR Part 11)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('export')}
          style={{
            padding: '0.65rem 1rem',
            border: 'none',
            borderBottom: activeTab === 'export' ? '3px solid #0f766e' : '3px solid transparent',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'export' ? 700 : 500,
            color: activeTab === 'export' ? '#0f766e' : '#64748b',
            cursor: 'pointer',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Download className="w-4 h-4" />
          <span>System Backup & Export</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: REGISTERED HOSPITALS & CLINICS                                     */}
      {/* ========================================================================= */}
      {activeTab === 'hospitals' && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0c2328' }}>
                Registered Hospitals & Clinical Facilities ({hospitalsList.length})
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Overall managed by Super Administrator. Each Hospital Administrator manages their assigned hospital domain, technicians, and workstations.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <Search className="w-4 h-4 text-gray-400" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="podoload-input"
                  placeholder="Search hospital, code, city..."
                  value={hospSearchQuery}
                  onChange={(e) => setHospSearchQuery(e.target.value)}
                  style={{ paddingLeft: '32px', width: '230px', fontSize: '0.8rem' }}
                />
              </div>

              <button
                type="button"
                className="podoload-btn-primary"
                onClick={() => {
                  setHospNameInput('');
                  setHospCodeInput('');
                  setHospRegNoInput('');
                  setHospAddressInput('');
                  setHospContactInput('');
                  setHospEmailInput('');
                  setHospWebsiteInput('');
                  setHospDoctorInput('');
                  setHospTechInput('');
                  setHospAdminNameInput('');
                  setHospAdminUsernameInput('');
                  setHospAdminPinInput('');
                  setRegisterHospError(null);
                  setRegisterHospSuccess(null);
                  setIsRegisterHospModalOpen(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Plus className="w-4 h-4" />
                <span>Register New Hospital</span>
              </button>
            </div>
          </div>

          {/* Hospitals Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1rem' }}>
            {hospitalsList
              .filter((h) => {
                if (!hospSearchQuery.trim()) return true;
                const q = hospSearchQuery.toLowerCase();
                return (
                  h.name.toLowerCase().includes(q) ||
                  h.code.toLowerCase().includes(q) ||
                  (h.registrationNo && h.registrationNo.toLowerCase().includes(q)) ||
                  (h.department && h.department.toLowerCase().includes(q)) ||
                  (h.address && h.address.toLowerCase().includes(q))
                );
              })
              .map((hosp) => {
                const tel = dbService.getHospitalTelemetry(hosp.id);
                return (
                  <div
                    key={hosp.id}
                    className="podoload-card"
                    style={{
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.65rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '8px',
                              backgroundColor: '#f0fdfa',
                              border: '1px solid #99f6e4',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#0f766e',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                            }}
                          >
                            {hosp.code.slice(0, 3)}
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                              {hosp.name}
                            </h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
                              <span className="podo-badge podo-badge-green" style={{ fontSize: '0.65rem' }}>
                                {hosp.code}
                              </span>
                              {hosp.registrationNo && (
                                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                  Reg: {hosp.registrationNo}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button
                            type="button"
                            className="podoload-btn-secondary podoload-btn-xs"
                            onClick={() => openEditHospitalModal(hosp)}
                            title="Edit Hospital Profile"
                          >
                            <Edit3 className="w-3 h-3 mr-1 inline" />
                            Edit
                          </button>
                          {hospitalsList.length > 1 && (
                            <button
                              type="button"
                              className="podoload-btn-xs"
                              onClick={() => handleDeleteHospital(hosp)}
                              title="Delete or Archive Hospital"
                              style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Department & Address */}
                      {hosp.department && (
                        <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#0891b2', marginBottom: '0.35rem' }}>
                          {hosp.department}
                        </div>
                      )}

                      <div style={{ fontSize: '0.74rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '0.85rem' }}>
                        {hosp.address && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hosp.address}</span>
                          </div>
                        )}
                        {hosp.contact && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span>{hosp.contact}</span>
                          </div>
                        )}
                        {hosp.email && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span>{hosp.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Administrators list */}
                      <div style={{ padding: '0.55rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', marginBottom: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                            Assigned Administrators ({tel.adminsCount})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setNewAdminHospitalName(hosp.name);
                              setNewAdminHospitalCode(hosp.code);
                              setNewAdminName('');
                              setNewAdminUsername('');
                              setNewAdminPin('');
                              setCreateAdminError(null);
                              setCreateAdminSuccess(null);
                              setIsCreateModalOpen(true);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#0f766e',
                              cursor: 'pointer',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Admin</span>
                          </button>
                        </div>

                        {tel.admins.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                            {tel.admins.map((adm) => (
                              <span
                                key={adm.id}
                                className="podo-badge podo-badge-neutral"
                                style={{ fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                <ShieldCheck className="w-3 h-3 text-teal-600" />
                                <strong>{adm.name}</strong> ({adm.username})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.72rem', color: '#f59e0b', fontStyle: 'italic' }}>
                            No administrator assigned yet. Click "Add Admin" to provision.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Telemetry KPI Strip + Quick Action */}
                    <div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: '0.5rem',
                          padding: '0.55rem 0.4rem',
                          backgroundColor: '#f1f5f9',
                          borderRadius: '6px',
                          textAlign: 'center',
                          marginBottom: '0.75rem',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Technicians</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{tel.techniciansCount}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Active Stations</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f766e' }}>{tel.activeWorkstationsCount}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Cases Logged</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0891b2' }}>{tel.casesCount}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className="podoload-btn-secondary podoload-btn-xs"
                          onClick={() => {
                            setSelectedHospitalFilter(hosp.name);
                            setActiveTab('reports');
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <FileText className="w-3 h-3" />
                          <span>Inspect Reports</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: HOSPITAL ADMINISTRATORS & CLINICS                                  */}
      {/* ========================================================================= */}
      {activeTab === 'admins' && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0c2328' }}>
                Hospital Administrators (Tier-2 Multi-Tenant Hierarchy)
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Super Admin creates each Hospital Administrator. Admins then log in to provision technicians for their specific hospital.
              </p>
            </div>

            <button
              type="button"
              className="podoload-btn-primary"
              onClick={() => setIsCreateModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus className="w-4 h-4" />
              <span>Create Hospital Administrator</span>
            </button>
          </div>

          {/* Admins Table */}
          <div className="podoload-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="podoload-device-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>ADMINISTRATOR</th>
                  <th>HOSPITAL / CLINIC</th>
                  <th>LOGIN USERNAME</th>
                  <th>STATUS</th>
                  <th>STATION QUOTA</th>
                  <th>CREATED AT</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {adminsList.map((adm) => (
                  <tr key={adm.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{adm.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        {adm.email || adm.username} {adm.phone ? `· ${adm.phone}` : ''}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0c2328' }}>{adm.hospitalName}</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Code: {adm.hospitalId}</div>
                    </td>
                    <td>
                      <code style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.76rem', color: '#0f766e' }}>
                        {adm.username}
                      </code>
                    </td>
                    <td>
                      <span
                        className={`podo-badge ${adm.status === 'active' ? 'podo-badge-green' : 'podo-badge-neutral'}`}
                        style={{ fontSize: '0.68rem' }}
                      >
                        {adm.status === 'active' ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#0c2328' }}>
                        {adm.maxStationsAllowed || 5} Stations
                      </span>
                    </td>
                    <td style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : 'Initial'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                        <button
                          type="button"
                          className="podoload-btn-secondary podoload-btn-xs"
                          onClick={() => {
                            setSelectedAdminForAction(adm);
                            setResetPinInput('');
                          }}
                          title="Reset Administrator Master Password"
                        >
                          <KeyRound className="w-3 h-3 mr-1 inline" />
                          Password
                        </button>

                        <button
                          type="button"
                          className={`podoload-btn-xs ${adm.status === 'active' ? 'podoload-btn-secondary' : 'podoload-btn-primary'}`}
                          onClick={() => handleToggleAdminStatus(adm)}
                          title={adm.status === 'active' ? 'Suspend admin access' : 'Activate admin access'}
                        >
                          {adm.status === 'active' ? 'Suspend' : 'Activate'}
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

      {/* ========================================================================= */}
      {/* TAB 2: WORKSTATION ACTIVATIONS & HARDWARE BINDING (TELEMETRY)             */}
      {/* ========================================================================= */}
      {activeTab === 'activations' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0c2328' }}>
              Workstation Hardware Binding & License Telemetry
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Real-time audit trace of every workstation activated across all hospitals, showing MAC address, single-use burn status, and permit expiration.
            </p>
          </div>

          <div className="podoload-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="podoload-device-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>DEVICE ID & MAC</th>
                  <th>HOSPITAL</th>
                  <th>BOUND TECHNICIAN</th>
                  <th>VOUCHER CODE</th>
                  <th>PERMIT DURATION / EXPIRY</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>KILL-SWITCH</th>
                </tr>
              </thead>
              <tbody>
                {telemetryList.map((item, idx) => (
                  <tr key={`${item.deviceId}-${idx}`}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.deviceId}</div>
                      <div style={{ fontSize: '0.7rem', color: '#0891b2', fontFamily: 'monospace' }}>
                        MAC: {item.macAddress}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0c2328' }}>{item.hospitalName}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.technicianName}</div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>User ID: {item.technicianUsername}</div>
                    </td>
                    <td>
                      <code style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontSize: '0.76rem' }}>
                        {item.activationCodeUsed}
                      </code>
                      <div style={{ fontSize: '0.65rem', color: item.isBurned ? '#b91c1c' : '#16a34a', marginTop: '2px' }}>
                        {item.isBurned ? '🔴 Consumed (Burned)' : '🟢 Ready'}
                      </div>
                    </td>
                    <td>
                      {item.permitExpiresAt ? (
                        <div>
                          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: item.isExpired ? '#dc2626' : '#16a34a' }}>
                            {item.isExpired ? 'Permit Expired' : 'Active Permit'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            Expires: {new Date(item.permitExpiresAt).toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>Standard Term</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`podo-badge ${
                          item.status === 'active'
                            ? 'podo-badge-green'
                            : item.status === 'revoked'
                            ? 'podo-badge-neutral'
                            : 'podo-badge-neutral'
                        }`}
                        style={{ fontSize: '0.68rem' }}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {item.status !== 'revoked' ? (
                        <button
                          type="button"
                          className="podoload-btn-danger podoload-btn-xs"
                          onClick={() => handleRevokeDevice(item.deviceId, item.technicianName)}
                        >
                          Revoke Station
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600 }}>
                          Revoked
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GLOBAL CLINICAL REPORTS REGISTRY                                   */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0c2328' }}>
                Global Clinical Reports & Plantar Examinations
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Complete global oversight of every examination conducted across all hospital clinics.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search case, patient ID..."
                className="podoload-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '220px', fontSize: '0.78rem' }}
              />
            </div>
          </div>

          <div className="podoload-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="podoload-device-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>CASE NUMBER</th>
                  <th>PATIENT</th>
                  <th>HOSPITAL</th>
                  <th>EXAM DATE</th>
                  <th>FOOT SIDE</th>
                  <th>ARCH INDEX</th>
                  <th>PEAK PRESSURE</th>
                  <th style={{ textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {casesList
                  .filter((c) => {
                    if (!searchQuery) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      c.caseNumber.toLowerCase().includes(q) ||
                      c.patientId.toLowerCase().includes(q) ||
                      (c.clinicName && c.clinicName.toLowerCase().includes(q))
                    );
                  })
                  .map((c) => (
                    <tr key={c.id}>
                      <td>
                        <span style={{ fontWeight: 700, color: '#0f766e' }}>{c.caseNumber}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{c.patientId}</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          ID: {c.patientId}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.clinicName || 'Technomind Healthcare'}</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Op: {c.operatorName || 'Clinical Tech'}</div>
                      </td>
                      <td style={{ fontSize: '0.74rem', color: '#334155' }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <span className="podo-badge podo-badge-green" style={{ fontSize: '0.68rem' }}>
                          {c.footSide} Foot
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.78rem' }}>
                          {c.regionalAnalysis?.cavanaghArchIndex
                            ? Number(c.regionalAnalysis.cavanaghArchIndex).toFixed(3)
                            : '0.210'}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          {c.regionalAnalysis?.archClassification || 'Normal Arch'}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.78rem', color: '#b91c1c' }}>
                          {c.regionalAnalysis?.peakContactCategory || 'Normative'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {onOpenCase && (
                          <button
                            type="button"
                            className="podoload-btn-secondary podoload-btn-xs"
                            onClick={() => onOpenCase(c)}
                          >
                            Inspect Report
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

      {/* ========================================================================= */}
      {/* TAB 4: MASTER AUDIT TRAIL                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0c2328' }}>
              Master Multi-Tenant Audit Trail (21 CFR Part 11)
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              Tamper-evident system log tracking Administrator creations, technician enrollments, voucher burns, and workstation binding.
            </p>
          </div>

          <div className="podoload-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="podoload-device-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>TIMESTAMP</th>
                  <th>ACTION</th>
                  <th>INITIATED BY</th>
                  <th>DETAILS</th>
                  <th>ROLE</th>
                  <th>SEVERITY</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.slice(0, 100).map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <code style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0f766e' }}>
                        {log.action}
                      </code>
                    </td>
                    <td style={{ fontSize: '0.74rem', fontWeight: 600 }}>{log.userId}</td>
                    <td style={{ fontSize: '0.72rem', color: '#334155', maxWidth: '400px' }}>
                      {log.details}
                    </td>
                    <td>
                      <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem' }}>
                        {log.role || 'system'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`podo-badge ${
                          log.severity === 'security'
                            ? 'podo-badge-neutral'
                            : log.severity === 'warning'
                            ? 'podo-badge-neutral'
                            : 'podo-badge-green'
                        }`}
                        style={{ fontSize: '0.62rem' }}
                      >
                        {log.severity || 'info'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SYSTEM BACKUP & EXPORT                                             */}
      {/* ========================================================================= */}
      {activeTab === 'export' && (
        <div style={{ maxWidth: '720px' }}>
          <div className="podoload-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  backgroundColor: '#ccfbf1',
                  color: '#0f766e',
                  padding: '0.75rem',
                  borderRadius: '10px',
                }}
              >
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0c2328' }}>
                  Global Platform Data Export & Regulatory Archive
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                  Complete cryptographic snapshot for ISO 13485 / IEC 62304 inspection audits.
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Exporting the platform snapshot produces a structured JSON archive containing all registered hospital profiles, hospital administrators, clinical technicians, bound hardware workstation identifiers (with MAC addresses), single-use voucher records, complete clinical case records, and the append-only 21 CFR Part 11 audit log.
            </p>

            <button
              type="button"
              className="podoload-btn-primary"
              onClick={handleExportSystemBackup}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
            >
              <Download className="w-4 h-4" />
              <span>Download Full System Archive (JSON)</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE HOSPITAL ADMINISTRATOR                                      */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="podoload-modal-container"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '560px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 className="w-5 h-5 text-teal-600" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Create Hospital Administrator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {createAdminError && (
              <div style={{ padding: '0.65rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '0.78rem', marginBottom: '1rem' }}>
                {createAdminError}
              </div>
            )}

            {createAdminSuccess && (
              <div style={{ padding: '0.65rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#166534', fontSize: '0.78rem', marginBottom: '1rem' }}>
                {createAdminSuccess}
              </div>
            )}

            <form onSubmit={handleCreateAdminSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="podoload-label">Assigned Hospital Domain *</label>
                  <select
                    className="podoload-select"
                    value={newAdminHospitalName}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '__NEW__') {
                        setIsCreateModalOpen(false);
                        setIsRegisterHospModalOpen(true);
                      } else {
                        const found = hospitalsList.find((h) => h.name === val);
                        setNewAdminHospitalName(val);
                        if (found) setNewAdminHospitalCode(found.code);
                      }
                    }}
                    required
                  >
                    <option value="" disabled>Select registered hospital domain...</option>
                    {hospitalsList.map((h) => (
                      <option key={h.id} value={h.name}>
                        {h.name} ({h.code})
                      </option>
                    ))}
                    <option value="__NEW__">+ Register a New Hospital...</option>
                  </select>
                </div>
                <div>
                  <label className="podoload-label">Hospital Code Prefix</label>
                  <input
                    type="text"
                    className="podoload-input"
                    placeholder="e.g. APL-01"
                    value={newAdminHospitalCode}
                    onChange={(e) => setNewAdminHospitalCode(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="podoload-label">Administrator Full Name *</label>
                  <input
                    type="text"
                    required
                    className="podoload-input"
                    placeholder="e.g. Dr. Rajesh Kumar"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="podoload-label">Station License Quota</label>
                  <select
                    className="podoload-select"
                    value={newAdminStationsQuota}
                    onChange={(e) => setNewAdminStationsQuota(e.target.value)}
                  >
                    <option value="1">1 Station (Single)</option>
                    <option value="3">3 Stations (Clinic)</option>
                    <option value="5">5 Stations (Hospital)</option>
                    <option value="10">10 Stations (Enterprise)</option>
                    <option value="25">25 Stations (Campus)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="podoload-label">Admin Username / Login ID *</label>
                  <input
                    type="text"
                    required
                    className="podoload-input"
                    placeholder="e.g. admin@apollo.health or admin_apollo"
                    value={newAdminUsername}
                    onChange={(e) => setNewAdminUsername(e.target.value)}
                  />
                </div>
                <div>
                  <label className="podoload-label">Master Password / PIN *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPin ? 'text' : 'password'}
                      required
                      minLength={4}
                      className="podoload-input"
                      placeholder="Min 4 characters"
                      value={newAdminPin}
                      onChange={(e) => setNewAdminPin(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPin(!showNewPin)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748b',
                      }}
                    >
                      {showNewPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="podoload-label">Contact Phone</label>
                  <input
                    type="text"
                    className="podoload-input"
                    placeholder="+91 (800) 555-PODO"
                    value={newAdminPhone}
                    onChange={(e) => setNewAdminPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="podoload-label">Contact Email</label>
                  <input
                    type="email"
                    className="podoload-input"
                    placeholder="admin@apollo.health"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="podoload-btn-secondary podoload-btn-sm"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="podoload-btn-primary podoload-btn-sm">
                  Create Administrator Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTER NEW HOSPITAL                                              */}
      {/* ========================================================================= */}
      {isRegisterHospModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="podoload-modal-container"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '620px',
              width: '100%',
              padding: '1.5rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 className="w-5 h-5 text-teal-600" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Register New Hospital or Healthcare System
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterHospModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {registerHospError && (
              <div style={{ padding: '0.65rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '0.78rem', marginBottom: '1rem' }}>
                {registerHospError}
              </div>
            )}

            {registerHospSuccess && (
              <div style={{ padding: '0.65rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#166534', fontSize: '0.78rem', marginBottom: '1rem' }}>
                {registerHospSuccess}
              </div>
            )}

            <form onSubmit={handleRegisterHospitalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="podoload-label">Hospital / Clinic Full Name *</label>
                  <input
                    type="text"
                    required
                    className="podoload-input"
                    placeholder="e.g. Manipal Institute of Podiatry"
                    value={hospNameInput}
                    onChange={(e) => {
                      setHospNameInput(e.target.value);
                      if (!hospCodeInput) {
                        const code = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
                        setHospCodeInput(code);
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="podoload-label">Hospital Code Prefix</label>
                  <input
                    type="text"
                    className="podoload-input"
                    placeholder="e.g. MANIPAL"
                    value={hospCodeInput}
                    onChange={(e) => setHospCodeInput(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="podoload-label">NABH / Accreditation Reg No</label>
                  <input
                    type="text"
                    className="podoload-input"
                    placeholder="e.g. NABH-2026-MED-49"
                    value={hospRegNoInput}
                    onChange={(e) => setHospRegNoInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className="podoload-label">Station License Quota</label>
                  <select
                    className="podoload-select"
                    value={hospQuotaInput}
                    onChange={(e) => setHospQuotaInput(e.target.value)}
                  >
                    <option value="3">3 Stations (Clinic)</option>
                    <option value="5">5 Stations (Hospital)</option>
                    <option value="10">10 Stations (Center)</option>
                    <option value="25">25 Stations (Enterprise)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="podoload-label">Medical Department / Center</label>
                <input
                  type="text"
                  className="podoload-input"
                  placeholder="e.g. Department of Diabetic Foot Surgery & Plantar Biomechanics"
                  value={hospDeptInput}
                  onChange={(e) => setHospDeptInput(e.target.value)}
                />
              </div>

              <div>
                <label className="podoload-label">Physical Facility Address</label>
                <input
                  type="text"
                  className="podoload-input"
                  placeholder="e.g. 98/2 Health City Expressway, Sector 4"
                  value={hospAddressInput}
                  onChange={(e) => setHospAddressInput(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="podoload-label">Contact Phone</label>
                  <input
                    type="text"
                    className="podoload-input"
                    placeholder="+91 (80) 4920-1000"
                    value={hospContactInput}
                    onChange={(e) => setHospContactInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className="podoload-label">Official Email</label>
                  <input
                    type="email"
                    className="podoload-input"
                    placeholder="podiatry@manipal.health"
                    value={hospEmailInput}
                    onChange={(e) => setHospEmailInput(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="podoload-label">Head Podiatrist / Doctor</label>
                  <input
                    type="text"
                    className="podoload-input"
                    placeholder="e.g. Dr. Ramesh Gupta"
                    value={hospDoctorInput}
                    onChange={(e) => setHospDoctorInput(e.target.value)}
                  />
                </div>
                <div>
                  <label className="podoload-label">Lead Clinical Technician</label>
                  <input
                    type="text"
                    className="podoload-input"
                    placeholder="e.g. Priya Sharma"
                    value={hospTechInput}
                    onChange={(e) => setHospTechInput(e.target.value)}
                  />
                </div>
              </div>

              {/* Inline Admin Provisioning Box */}
              <div
                style={{
                  padding: '0.85rem',
                  backgroundColor: '#f0fdfa',
                  border: '1px solid #99f6e4',
                  borderRadius: '8px',
                  marginTop: '0.35rem',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700, color: '#0f766e', fontSize: '0.82rem' }}>
                  <input
                    type="checkbox"
                    checked={hospAlsoCreateAdmin}
                    onChange={(e) => setHospAlsoCreateAdmin(e.target.checked)}
                    style={{ accentColor: '#0f766e' }}
                  />
                  <span>Provision Primary Hospital Administrator for this Hospital</span>
                </label>

                {hospAlsoCreateAdmin && (
                  <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                      <div>
                        <label className="podoload-label">Admin Full Name</label>
                        <input
                          type="text"
                          className="podoload-input"
                          placeholder="e.g. Dr. Director"
                          value={hospAdminNameInput}
                          onChange={(e) => setHospAdminNameInput(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="podoload-label">Admin Username / Login ID *</label>
                        <input
                          type="text"
                          className="podoload-input"
                          placeholder="e.g. admin@manipal.health"
                          value={hospAdminUsernameInput}
                          onChange={(e) => setHospAdminUsernameInput(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="podoload-label">Master Password / PIN (Min 4 chars) *</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showHospAdminPin ? 'text' : 'password'}
                          minLength={4}
                          className="podoload-input"
                          placeholder="Set administrator PIN"
                          value={hospAdminPinInput}
                          onChange={(e) => setHospAdminPinInput(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowHospAdminPin(!showHospAdminPin)}
                          style={{
                            position: 'absolute',
                            right: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#64748b',
                          }}
                        >
                          {showHospAdminPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="podoload-btn-secondary podoload-btn-sm"
                  onClick={() => setIsRegisterHospModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="podoload-btn-primary podoload-btn-sm">
                  Register Hospital
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT HOSPITAL PROFILE                                              */}
      {/* ========================================================================= */}
      {editingHospital && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="podoload-modal-container"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              padding: '1.5rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 className="w-5 h-5 text-teal-600" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Edit Hospital Profile: {editingHospital.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingHospital(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {editHospError && (
              <div style={{ padding: '0.65rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '0.78rem', marginBottom: '1rem' }}>
                {editHospError}
              </div>
            )}

            {editHospSuccess && (
              <div style={{ padding: '0.65rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#166534', fontSize: '0.78rem', marginBottom: '1rem' }}>
                {editHospSuccess}
              </div>
            )}

            <form onSubmit={handleEditHospitalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="podoload-label">Hospital Full Name *</label>
                  <input
                    type="text"
                    required
                    className="podoload-input"
                    value={editHospName}
                    onChange={(e) => setEditHospName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="podoload-label">Hospital Code Prefix *</label>
                  <input
                    type="text"
                    required
                    className="podoload-input"
                    value={editHospCode}
                    onChange={(e) => setEditHospCode(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="podoload-label">Registration / NABH Number</label>
                  <input
                    type="text"
                    className="podoload-input"
                    value={editHospRegNo}
                    onChange={(e) => setEditHospRegNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="podoload-label">Medical Department</label>
                  <input
                    type="text"
                    className="podoload-input"
                    value={editHospDept}
                    onChange={(e) => setEditHospDept(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="podoload-label">Address</label>
                <input
                  type="text"
                  className="podoload-input"
                  value={editHospAddress}
                  onChange={(e) => setEditHospAddress(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="podoload-label">Contact Phone</label>
                  <input
                    type="text"
                    className="podoload-input"
                    value={editHospContact}
                    onChange={(e) => setEditHospContact(e.target.value)}
                  />
                </div>
                <div>
                  <label className="podoload-label">Official Email</label>
                  <input
                    type="email"
                    className="podoload-input"
                    value={editHospEmail}
                    onChange={(e) => setEditHospEmail(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="podoload-label">Default Doctor</label>
                  <input
                    type="text"
                    className="podoload-input"
                    value={editHospDoctor}
                    onChange={(e) => setEditHospDoctor(e.target.value)}
                  />
                </div>
                <div>
                  <label className="podoload-label">Default Technician</label>
                  <input
                    type="text"
                    className="podoload-input"
                    value={editHospTech}
                    onChange={(e) => setEditHospTech(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="podoload-label">Clinical Report Footer Banner</label>
                <input
                  type="text"
                  className="podoload-input"
                  placeholder="e.g. NABH Accredited Comprehensive Podiatry & Plantar Pressure Centre"
                  value={editHospFooter}
                  onChange={(e) => setEditHospFooter(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="podoload-btn-secondary podoload-btn-sm"
                  onClick={() => setEditingHospital(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="podoload-btn-primary podoload-btn-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESET ADMIN PASSWORD                                               */}
      {/* ========================================================================= */}
      {selectedAdminForAction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="podoload-modal-container"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '440px',
              width: '100%',
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound className="w-5 h-5 text-teal-600" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                  Reset Admin Password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAdminForAction(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>
              Enter a new Master Password for Administrator <strong>{selectedAdminForAction.name}</strong> ({selectedAdminForAction.username}).
            </p>

            {resetPinSuccess && (
              <div style={{ padding: '0.65rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#166534', fontSize: '0.78rem', marginBottom: '1rem' }}>
                {resetPinSuccess}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label className="podoload-label">New Master Password *</label>
                <input
                  type="text"
                  required
                  minLength={4}
                  className="podoload-input"
                  placeholder="Enter new password"
                  value={resetPinInput}
                  onChange={(e) => setResetPinInput(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="podoload-btn-secondary podoload-btn-sm"
                  onClick={() => setSelectedAdminForAction(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="podoload-btn-primary podoload-btn-sm">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
