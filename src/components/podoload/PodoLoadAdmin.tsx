import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { HospitalProfile, HospitalDoctor, HospitalTechnician } from '../../types';
import { dbService } from '../../services/dbService';

interface PodoLoadAdminProps {
  onHospitalChanged?: (hospital: HospitalProfile) => void;
  onNavigateToReport?: () => void;
  onNavigateToRegistration?: () => void;
}

export const PodoLoadAdmin: React.FC<PodoLoadAdminProps> = ({
  onHospitalChanged,
  onNavigateToReport,
  onNavigateToRegistration,
}) => {
  const [hospitals, setHospitals] = useState<HospitalProfile[]>(() => dbService.getHospitalProfilesSync());
  const [activeHospital, setActiveHospital] = useState<HospitalProfile>(() => dbService.getActiveHospitalSync());
  const [activeTab, setActiveTab] = useState<'branding' | 'staff' | 'hospitals' | 'security'>('branding');

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

  // Switch active hospital / clinic account
  const handleSwitchHospital = async (targetId: string) => {
    const switched = await dbService.setActiveHospital(targetId, 'admin');
    setActiveHospital(switched);
    setHospitals(dbService.getHospitalProfilesSync());
    if (onHospitalChanged) onHospitalChanged(switched);
    setSaveSuccess(`✓ Switched to active hospital: ${switched.name}`);
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  // Save current hospital settings to Inbuilt Database
  const handleSaveHospital = async () => {
    const updated: HospitalProfile = {
      ...activeHospital,
      name,
      code,
      department,
      registrationNo,
      logoUrl,
      logoPosition,
      address,
      contact,
      email,
      website,
      defaultDoctor,
      defaultTechnician,
      footerText,
      doctors,
      technicians,
      activeUser: {
        username: `admin@${code.toLowerCase()}.health`,
        name: `${defaultDoctor} (Administrator)`,
        role: 'admin',
        loginTime: new Date().toISOString(),
      },
    };

    await dbService.saveHospitalProfile(updated);
    setActiveHospital(updated);
    setHospitals(dbService.getHospitalProfilesSync());
    if (onHospitalChanged) onHospitalChanged(updated);

    setSaveSuccess('✓ Hospital branding & configurations saved to Inbuilt Database!');
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  // Add new doctor
  const handleAddDoctor = () => {
    if (!newDocName.trim()) return;
    const newDoc: HospitalDoctor = {
      id: `doc-${Date.now()}`,
      name: newDocName.trim(),
      specialization: newDocSpec.trim(),
      licenseNo: newDocLic.trim() || `LIC-${Math.floor(1000 + Math.random() * 9000)}`,
    };
    const updatedDocs = [...doctors, newDoc];
    setDoctors(updatedDocs);
    setNewDocName('');
    setNewDocLic('');
    setShowAddDoc(false);
  };

  // Register a new hospital
  const handleRegisterHospital = async () => {
    if (!newHospName.trim()) return;
    const newId = `hosp-${Date.now()}`;
    const newCode = (newHospCode.trim() || newHospName.trim().slice(0, 4).toUpperCase()) + '-01';
    const newProfile: HospitalProfile = {
      id: newId,
      name: newHospName.trim(),
      code: newCode,
      logoUrl: '',
      logoPosition: 'Left',
      address: 'Clinical Facility Address',
      contact: '+1 (800) 555-0199',
      email: `admin@${newCode.toLowerCase()}.health`,
      registrationNo: `REG-${newCode}-2026`,
      department: 'Department of Podiatry & Orthotics',
      defaultDoctor: 'Dr. Specialist',
      defaultTechnician: 'Tech. Specialist',
      footerText: 'Licensed Podiatric Examination Center',
      doctors: [
        { id: `doc-${Date.now()}`, name: 'Dr. Specialist', specialization: 'Podiatrist', licenseNo: 'MED-REG-01' }
      ],
      technicians: [
        { id: `tech-${Date.now()}`, name: 'Tech. Specialist', staffId: 'TECH-01' }
      ],
    };

    await dbService.saveHospitalProfile(newProfile);
    const switched = await dbService.setActiveHospital(newId, 'admin');
    setActiveHospital(switched);
    setHospitals(dbService.getHospitalProfilesSync());
    if (onHospitalChanged) onHospitalChanged(switched);
    setShowAddHosp(false);
    setNewHospName('');
    setNewHospCode('');
    setSaveSuccess(`✓ New hospital registered and activated: ${switched.name}`);
    setTimeout(() => setSaveSuccess(null), 3500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '0.85rem' }}>
      {/* Top Banner: Active Hospital Login Status */}
      <div
        className="podoload-card"
        style={{
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          borderLeft: '4px solid var(--podo-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: '#e0f2f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--podo-primary)',
            }}
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Hospital Logo" style={{ maxHeight: '36px', maxWidth: '36px', objectFit: 'contain' }} />
            ) : (
              <Building2 className="w-5 h-5" />
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0c2328' }}>
                {activeHospital.name}
              </h3>
              <span className="podo-badge podo-badge-green" style={{ fontSize: '0.62rem' }}>
                Active Hospital
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
              Code: <strong>{activeHospital.code}</strong> · Reg: <strong>{activeHospital.registrationNo || 'Accredited'}</strong> · Logged in as: <strong>{activeHospital.defaultDoctor} (Admin)</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="podoload-btn-secondary podoload-btn-sm"
            onClick={() => setActiveTab('hospitals')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Switch Hospital</span>
          </button>

          {onNavigateToReport && (
            <button
              type="button"
              className="podoload-btn-primary podoload-btn-sm"
              onClick={onNavigateToReport}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Preview in Report</span>
            </button>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div
          style={{
            padding: '0.6rem 0.85rem',
            backgroundColor: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: '6px',
            color: '#166534',
            fontSize: '0.75rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Main Content: Tab Navigation & Configuration Panels */}
      <div className="podoload-settings-layout" style={{ flex: 1 }}>
        {/* Left Vertical Sub-menu */}
        <div className="podoload-settings-sidebar" style={{ minWidth: '190px' }}>
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
              className={`podoload-settings-menu-item ${activeTab === 'staff' ? 'active' : ''}`}
              onClick={() => setActiveTab('staff')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Doctors & staff</span>
            </button>

            <button
              type="button"
              className={`podoload-settings-menu-item ${activeTab === 'hospitals' ? 'active' : ''}`}
              onClick={() => setActiveTab('hospitals')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
            >
              <Hospital className="w-3.5 h-3.5" />
              <span>All hospitals ({hospitals.length})</span>
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
                {/* Logo Upload Box */}
                <div className="podoload-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <h4 className="podoload-card-title" style={{ margin: 0 }}>
                    HOSPITAL LOGO
                  </h4>

                  <div
                    style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: '6px',
                      padding: '1.25rem',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                    }}
                    onClick={() => logoInputRef.current?.click()}
                    title="Click to select image file from computer"
                  >
                    {logoUrl ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                        <img
                          src={logoUrl}
                          alt="Hospital Logo"
                          style={{ maxHeight: '60px', maxWidth: '140px', objectFit: 'contain' }}
                        />
                        <span style={{ fontSize: '0.68rem', color: '#0d9488', fontWeight: 600 }}>
                          Click to change logo image
                        </span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-slate-400" />
                        <span style={{ fontSize: '0.74rem', fontWeight: 600, color: '#334155' }}>
                          Upload Hospital / Clinic Logo
                        </span>
                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                          PNG, JPEG, WEBP or SVG (Recommended: 300x120px)
                        </span>
                      </>
                    )}
                  </div>

                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleLogoUpload}
                  />

                  {logoUrl && (
                    <button
                      type="button"
                      className="podoload-btn-secondary podoload-btn-sm"
                      onClick={() => setLogoUrl('')}
                      style={{ color: '#ef4444', alignSelf: 'center', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Logo</span>
                    </button>
                  )}

                  {/* Logo Position Selector */}
                  <div className="podoload-form-group" style={{ marginTop: '0.35rem' }}>
                    <label className="podoload-label">Report Logo Position</label>
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

          {/* TAB 2: DOCTORS & STAFF DIRECTORY */}
          {activeTab === 'staff' && (
            <div className="podoload-card" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h4 className="podoload-card-title" style={{ margin: 0 }}>
                    ATTENDING CLINICIANS & TECHNICIANS
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

          {/* TAB 3: ALL REGISTERED HOSPITALS & MULTI-TENANCY */}
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

          {/* TAB 4: SECURITY & USER ACCESS */}
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
                  <div style={{ fontWeight: 700, color: '#0c2328', marginBottom: '0.35rem' }}>Report Sign-off Policy</div>
                  <div style={{ color: '#475569', marginBottom: '0.2rem' }}>
                    Ensures all generated reports carry official hospital accreditation and physician verification.
                  </div>
                  <span className="podo-badge podo-badge-green">IEC 62304 / ISO 13485 Verified</span>
                </div>
              </div>
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
    </div>
  );
};

