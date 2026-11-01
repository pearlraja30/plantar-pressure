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
} from 'lucide-react';
import { HospitalProfile, HospitalDoctor, HospitalTechnician, TechnicianUser, Patient, AnalysisCase, BoundDevice, DeviceLicense } from '../../types';
import { dbService } from '../../services/dbService';
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
}) => {
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
  const [newTechPin, setNewTechPin] = useState('1234');
  const [newTechHospitalId, setNewTechHospitalId] = useState(activeHospital.id);
  const [newTechPhone, setNewTechPhone] = useState('');
  const [newTechEmail, setNewTechEmail] = useState('');
  const [newTechNotes, setNewTechNotes] = useState('');

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
      alert('Please provide technician full name and username / login ID');
      return;
    }

    const assignedHosp = hospitals.find((h) => h.id === newTechHospitalId) || activeHospital;

    const newTech: TechnicianUser = {
      id: `tech-${Date.now()}`,
      name: newTechName.trim(),
      username: newTechUsername.trim().toLowerCase(),
      pin: newTechPin.trim() || '1234',
      hospitalId: assignedHosp.id,
      hospitalName: assignedHosp.name,
      role: 'technician',
      status: 'active',
      createdAt: new Date().toISOString(),
      phone: newTechPhone.trim(),
      email: newTechEmail.trim(),
      notes: newTechNotes.trim(),
    };

    await dbService.saveTechnician(newTech);
    setTechniciansList(dbService.getTechniciansSync());
    setShowAddTech(false);
    setNewTechName('');
    setNewTechUsername('');
    setNewTechPin('1234');
    setNewTechPhone('');
    setNewTechEmail('');
    setNewTechNotes('');

    setSaveSuccess(`✓ Technician login created: ${newTech.name} (${assignedHosp.name})`);
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

  const hospitalFilteredPatients = useMemo(() => {
    return (patients || []).filter((p) => {
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
  }, [patients, selectedHospitalFilter, patientFilterSearch, activeHospital.id]);

  const handleConfirmReassignHospital = async () => {
    if (!reassigningPatient) return;
    const targetHosp = hospitals.find((h) => h.id === targetReassignHospitalId) || activeHospital;
    await dbService.reassignPatientHospital(reassigningPatient.id, targetHosp.id, targetHosp.name);
    setSaveSuccess(`✓ Patient ${reassigningPatient.name} reassigned to ${targetHosp.name}`);
    setReassigningPatient(null);
    setTimeout(() => setSaveSuccess(null), 3000);
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
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0.85rem' }}>
      {/* Top Banner */}
      <div className="podoload-card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
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
      <div className="podoload-settings-layout" style={{ flex: 1 }}>
        {/* Left Sidebar Menu */}
        <div className="podoload-settings-sidebar" style={{ minWidth: '215px' }}>
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
        <div className="podoload-settings-content" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* TAB 1: HOSPITAL BRANDING & LOGO */}
          {activeTab === 'branding' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '0.85rem' }}>
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

              {/* Create Technician Sub-Form */}
              {showAddTech && (
                <div style={{ backgroundColor: '#f0fdfa', padding: '0.85rem', borderRadius: '8px', border: '1px solid #99f6e4' }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', fontWeight: 800, color: '#0f766e' }}>
                    Create New Clinical Technician Account
                  </h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 1.2fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div className="podoload-form-group">
                      <label className="podoload-label">Full Name</label>
                      <input
                        type="text"
                        className="podoload-input"
                        placeholder="e.g. Sarah Jenkins, B.Sc."
                        value={newTechName}
                        onChange={(e) => setNewTechName(e.target.value)}
                      />
                    </div>
                    <div className="podoload-form-group">
                      <label className="podoload-label">Username / Login ID</label>
                      <input
                        type="text"
                        className="podoload-input"
                        placeholder="e.g. sarah.tech"
                        value={newTechUsername}
                        onChange={(e) => setNewTechUsername(e.target.value)}
                      />
                    </div>
                    <div className="podoload-form-group">
                      <label className="podoload-label">Login PIN</label>
                      <input
                        type="password"
                        className="podoload-input"
                        placeholder="1234"
                        value={newTechPin}
                        onChange={(e) => setNewTechPin(e.target.value)}
                      />
                    </div>
                    <div className="podoload-form-group">
                      <label className="podoload-label">Assigned Hospital Facility</label>
                      <select
                        className="podoload-input"
                        value={newTechHospitalId}
                        onChange={(e) => setNewTechHospitalId(e.target.value)}
                      >
                        {hospitals.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name} ({h.code})
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

              {/* Technicians Table */}
              <table className="podoload-device-table" style={{ width: '100%', fontSize: '0.74rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>TECHNICIAN NAME</th>
                    <th style={{ textAlign: 'left' }}>LOGIN USERNAME</th>
                    <th style={{ textAlign: 'left' }}>ASSIGNED HOSPITAL</th>
                    <th style={{ textAlign: 'left' }}>PIN</th>
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
                        <span style={{ letterSpacing: '0.1em', color: '#64748b' }}>••••</span>
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
          )}

          {/* TAB 3: HOSPITAL-WISE PATIENT DETAILS & RECORDS */}
          {activeTab === 'hospital_patients' && (
            <div className="podoload-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h4 className="podoload-card-title" style={{ margin: 0 }}>
                    HOSPITAL-WISE PATIENT & MEDICAL REPORT REPOSITORY
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.68rem', color: '#64748b' }}>
                    Structured multi-facility patient database ready for centralized hospital cloud management.
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
                    <option value="ALL">All Hospitals & Facilities ({patients.length} Patients)</option>
                    {hospitals.map((h) => {
                      const count = patients.filter((p) => (p.hospitalId ? p.hospitalId === h.id : h.id === activeHospital.id)).length;
                      return (
                        <option key={h.id} value={h.id}>
                          {h.name} ({count} Patients)
                        </option>
                      );
                    })}
                  </select>
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
                      Reports: <strong>{cases.filter((c) => (c.hospitalId ? c.hospitalId === currentViewedHospital.id : true)).length}</strong>
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
                  Showing {hospitalFilteredPatients.length} of {patients.length} patients
                </span>
              </div>

              {/* Patients Table */}
              <table className="podoload-device-table" style={{ width: '100%', fontSize: '0.74rem' }}>
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
                      const patientExams = cases.filter((c) => c.patientId === p.id);
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
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
                <table className="podoload-device-table" style={{ width: '100%', fontSize: '0.74rem' }}>
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

              {/* Invoices & License Billing History */}
              {deviceLicense.invoices && deviceLicense.invoices.length > 0 && (
                <div>
                  <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.78rem', fontWeight: 800, color: '#0c2328' }}>
                    LICENSE INVOICES & PAYMENT RECEIPTS
                  </h5>
                  <table className="podoload-device-table" style={{ width: '100%', fontSize: '0.74rem' }}>
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
              <table className="podoload-device-table" style={{ width: '100%', fontSize: '0.74rem' }}>
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
              <table className="podoload-device-table" style={{ width: '100%', fontSize: '0.74rem' }}>
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
          )}

          {/* TAB 6: SECURITY & USER ACCESS */}
          {activeTab === 'security' && (
            <div className="podoload-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h4 className="podoload-card-title" style={{ margin: 0 }}>
                HOSPITAL LOGIN & ROLE ACCESS CONTROL
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ padding: '0.65rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.74rem' }}>
                  <div style={{ fontWeight: 700, color: '#0c2328', marginBottom: '0.35rem' }}>Active Session</div>
                  <div>Account: <strong>admin@{activeHospital.code.toLowerCase()}.health</strong></div>
                  <div>Role: <strong>Hospital Administrator</strong></div>
                  <div>Authentication: <strong>PIN Verified (Session Active)</strong></div>
                </div>

                <div style={{ padding: '0.65rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.74rem' }}>
                  <div style={{ fontWeight: 700, color: '#0c2328', marginBottom: '0.35rem' }}>Central Cloud Deployment</div>
                  <div style={{ color: '#475569', marginBottom: '0.2rem' }}>
                    Multi-hospital tenancy, technician logins, and patient records are structured for immediate sync with centralized cloud databases.
                  </div>
                  <span className="podo-badge podo-badge-green">ISO 13485 / IEC 62304 Compliant</span>
                </div>
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

                <table className="podoload-device-table" style={{ width: '100%', fontSize: '0.74rem' }}>
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
