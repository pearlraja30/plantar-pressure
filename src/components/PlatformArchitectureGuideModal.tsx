import React, { useState } from 'react';
import {
  X,
  Laptop,
  Globe,
  Smartphone,
  ShieldCheck,
  Cpu,
  Layers,
  Database,
  Cloud,
  CheckCircle2,
  Terminal,
  FileCode,
} from 'lucide-react';

interface PlatformArchitectureGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlatformArchitectureGuideModal: React.FC<PlatformArchitectureGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'specifications' | 'desktop' | 'web' | 'mobile' | 'regulatory'>('specifications');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog architecture-modal">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Cross-Platform Principal Engineering Architecture
              </h2>
              <p className="text-xs text-slate-400">
                Unified Core: Desktop (macOS/Win/Linux), Web Portal & Mobile (iOS/Android)
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="report-pagination-bar">
          <div className="flex gap-2">
            <button
              className={`report-page-tab ${activeTab === 'specifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('specifications')}
            >
              1. Core Specifications (12 Key Decisions)
            </button>
            <button
              className={`report-page-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              2. Unified Architecture
            </button>
            <button
              className={`report-page-tab ${activeTab === 'desktop' ? 'active' : ''}`}
              onClick={() => setActiveTab('desktop')}
            >
              3. Desktop (Electron)
            </button>
            <button
              className={`report-page-tab ${activeTab === 'web' ? 'active' : ''}`}
              onClick={() => setActiveTab('web')}
            >
              4. Web Cloud SaaS
            </button>
            <button
              className={`report-page-tab ${activeTab === 'mobile' ? 'active' : ''}`}
              onClick={() => setActiveTab('mobile')}
            >
              5. Mobile (iOS & Android)
            </button>
            <button
              className={`report-page-tab ${activeTab === 'regulatory' ? 'active' : ''}`}
              onClick={() => setActiveTab('regulatory')}
            >
              6. Regulatory (IEC 62304)
            </button>
          </div>
        </div>

        <div className="modal-body p-6 space-y-5 text-xs text-slate-300">
          {/* TAB: CORE SPECIFICATIONS (12 KEY DECISIONS) */}
          {activeTab === 'specifications' && (
            <div className="space-y-4">
              <div className="p-4 bg-teal-950/30 rounded-lg border border-teal-800/60 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-teal-300">
                    Officially Confirmed Architectural Specifications Baseline
                  </h3>
                  <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">
                    All 12 architectural parameters raised during technical specification have been fully incorporated into the codebase, algorithmic pipelines, UI interfaces, and regulatory documentation.
                  </p>
                </div>
              </div>

              {/* 12 Specifications Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">01. Hardware & Capture</span>
                    <span className="badge-tag-sm">Active</span>
                  </div>
                  <div className="font-semibold text-slate-100 mt-1">Both: Camera Capture + File Upload</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Dual acquisition: Native live camera stream with gyro leveling and direct file upload (drag-and-drop PNG, TIFF, JPEG, PDF).
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">02. Paper Size & Scale</span>
                    <span className="badge-tag-sm">Active</span>
                  </div>
                  <div className="font-semibold text-slate-100 mt-1">Custom Size (Direct mm Calibration)</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Arbitrary width × height (mm) input with presets (Harris Mat 215×310mm, A4, US Letter). Scale: mm/px calculated on-device.
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">03. Pressure Output & Units</span>
                    <span className="badge-tag-sm">Active</span>
                  </div>
                  <div className="font-semibold text-slate-100 mt-1">Relative Intensity Index (RII)</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Normalized index (0.00–1.00) classified into 6 clinical categories (C1–C6). Explicitly labeled as non-piezoelectric force.
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">04. 10-Zone Partitioning</span>
                    <span className="badge-tag-sm">Active</span>
                  </div>
                  <div className="font-semibold text-slate-100 mt-1">Fully Automated AI Contour Segmentation</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Automated subzone isolation: Hallux, Lesser Toes, M1, M2, M3–M5, Medial/Lateral Midfoot, and Medial/Lateral Calcaneus.
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">05. Bilateral Stance & Asymmetry</span>
                    <span className="badge-tag-sm">Active</span>
                  </div>
                  <div className="font-semibold text-slate-100 mt-1">Scanned Separately & Linked Under Patient</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Left and right impressions acquired as distinct cases and linked under patient record. Computes Asymmetry Index (ASI %).
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">06. Orthotic Recommendations</span>
                    <span className="badge-tag-sm">Active</span>
                  </div>
                  <div className="font-semibold text-slate-100 mt-1">Printed on 4-Page PDF Report</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Pages 3 & 4 of official PDF report print custom fabrication guidelines, offloading wells (IWGDF), arch posting, and doctor sign-off.
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">07. Cloud & Storage</span>
                    <span className="badge-tag-sm">Active</span>
                  </div>
                  <div className="font-semibold text-slate-100 mt-1">Both Local and Cloud Storage</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    On-device local persistence (IndexedDB / SQLite) + encrypted cloud synchronization with SHA-256 integrity verification.
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">08. Clinical Test Data Set</span>
                    <span className="badge-tag-sm">Active</span>
                  </div>
                  <div className="font-semibold text-slate-100 mt-1">Clinical Samples Provided & Integrated</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Integrated sample loader for partner test sets and live execution against regulatory verification battery (VT-01 to VT-13).
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">09. Algorithm Execution</span>
                    <span className="badge-tag-sm">Active</span>
                  </div>
                  <div className="font-semibold text-slate-100 mt-1">100% On-Device Processing</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Zero server round-trips. Computer vision unwarp, normalized convolution, and JET heatmap render in &lt;40ms client-side.
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">10. Native Camera Control</span>
                    <span className="badge-tag-sm">Active</span>
                  </div>
                  <div className="font-semibold text-slate-100 mt-1">Fixed Burst Multi-Frame Capture</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Rapid 3 or 5 frame burst capture with Laplacian variance scoring to auto-select the sharpest image and eliminate hand tremor.
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">11. Future Hardware Integration</span>
                    <span className="text-[10px] text-amber-400 font-semibold">Excluded</span>
                  </div>
                  <div className="font-semibold text-slate-100 mt-1">No (Dedicated to Harris Mat Scans)</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Electronic sensor plate hardware is out of scope. System is laser-focused on optical Harris Mat rubber grid impressions.
                  </p>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">12. Hospital PACS / DICOM</span>
                    <span className="text-[10px] text-amber-400 font-semibold">Not Required</span>
                  </div>
                  <div className="font-semibold text-slate-100 mt-1">Not Required (Zero DICOM Overhead)</div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Eliminates costly PACS/DICOM server dependencies. Records are managed via on-device storage, cloud sync, and 4-page PDF exports.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/80 rounded-lg border border-slate-700">
                <h3 className="text-sm font-bold text-teal-400 mb-2">
                  "Write-Once, Deploy-Everywhere" Medical Architecture
                </h3>
                <p className="leading-relaxed text-slate-300">
                  To achieve total platform independence across <strong>Desktop (Windows, macOS, Linux)</strong>, 
                  <strong>Web Browser</strong>, and <strong>Mobile (iOS, Android)</strong> without fragmented codebases, 
                  we design the system as a layered clean architecture. The entire diagnostic and processing engine is 
                  implemented in platform-agnostic TypeScript/Wasm, allowing 100% code reuse across all target targets.
                </p>
              </div>

              {/* Architectural Block Diagram */}
              <div className="p-4 bg-slate-900 rounded-lg border border-slate-800 space-y-3 font-mono text-[11px]">
                <div className="text-slate-400 font-bold uppercase tracking-wider">
                  Target Deployment Stack:
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-800/80 rounded border border-slate-700">
                    <div className="font-bold text-teal-400 flex items-center gap-1.5 mb-1">
                      <Laptop className="w-4 h-4" /> Desktop App
                    </div>
                    <div className="text-slate-400 text-[10px]">
                      Tauri 2.0 / Electron<br />
                      • TWAIN / WIA / SANE Bridge<br />
                      • Local SQLite Offline DB<br />
                      • High-speed native processing
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded border border-slate-700">
                    <div className="font-bold text-cyan-400 flex items-center gap-1.5 mb-1">
                      <Globe className="w-4 h-4" /> Cloud Web Portal
                    </div>
                    <div className="text-slate-400 text-[10px]">
                      Next.js / Vite SPA<br />
                      • Multi-clinic Telepodiatry<br />
                      • Centralized HIPAA/GDPR Cloud<br />
                      • Remote Clinician Sign-Off
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded border border-slate-700">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                      <Smartphone className="w-4 h-4" /> iOS & Android
                    </div>
                    <div className="text-slate-400 text-[10px]">
                      Capacitor / React Native<br />
                      • Camera scan + Optical Deskew<br />
                      • Touch landmark adjusting<br />
                      • Field clinic offline sync
                    </div>
                  </div>
                </div>

                {/* Shared Core Engine */}
                <div className="p-3 bg-teal-950/40 border border-teal-800/60 rounded text-center">
                  <div className="font-bold text-teal-300">
                    SHARED CORE ENGINE (100% REUSABLE CODEBASE)
                  </div>
                  <div className="text-slate-400 text-[11px] mt-1">
                    • Plantar Image Processing & JET Synthesizer • Cavanagh Arch Index & Orthotic Engine • jsPDF 4-Page Medical Report • Offline Queue & Cryptographic Audit Log
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DESKTOP */}
          {activeTab === 'desktop' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/80 rounded-lg border border-slate-700 space-y-2">
                <h3 className="text-sm font-bold text-teal-400">
                  Desktop Packaging: Tauri 2.0 (Rust) or Electron
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  For the medical workstation, desktop execution provides direct low-level communication with flatbed document scanners via operating system driver APIs:
                </p>
                <div className="space-y-1.5 text-[11px] pt-1">
                  <div>• <strong>Windows:</strong> Direct TWAIN 2.4 and WIA (Windows Image Acquisition) COM automation.</div>
                  <div>• <strong>macOS:</strong> ImageCaptureCore framework & AirScan/eSCL network scanner discovery.</div>
                  <div>• <strong>Linux:</strong> SANE (Scanner Access Now Easy) backend integration.</div>
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded border border-slate-800 font-mono text-[11px] space-y-1">
                <div className="text-slate-400">// Native Scanner IPC Bridge Pattern (Rust / Tauri)</div>
                <div className="text-teal-400">#[tauri::command]</div>
                <div>pub fn enumerate_scanners() -&gt; Vec&lt;ScannerDevice&gt; &#123;</div>
                <div className="pl-4 text-slate-400">// Query OS TWAIN / WIA subsystem and return device list</div>
                <div className="pl-4">twain_sys::get_devices()</div>
                <div>&#125;</div>
              </div>

              <div className="p-3 bg-slate-800 rounded text-[11px] text-slate-300">
                <strong>Installer Targets:</strong> MSI / EXE for Windows 10/11, DMG / PKG (Universal Apple Silicon & Intel) for macOS, and AppImage / Deb for Linux medical workstations.
              </div>
            </div>
          )}

          {/* TAB 3: WEB */}
          {activeTab === 'web' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/80 rounded-lg border border-slate-700 space-y-2">
                <h3 className="text-sm font-bold text-teal-400">
                  Web-Based SaaS Portal & Tele-Podiatry
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  In hospital networks and orthotic manufacturing labs, the web client enables podiatrists to review scans submitted from remote satellite clinics:
                </p>
                <div className="space-y-1.5 text-[11px] pt-1">
                  <div>• <strong>Client-Side Image Processing:</strong> Wasm / Web Workers run the JET heat-map classification locally in the browser with zero server latency.</div>
                  <div>• <strong>Multi-Tenant Database:</strong> PostgreSQL + MinIO / AWS S3 encrypted bucket for DICOM / TIFF source scans.</div>
                  <div>• <strong>Role-Based Access:</strong> Podiatrists (review/sign-off), Orthotic Fabricators (read measurements & export CAD), Clinic Admins (audit logs).</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MOBILE */}
          {activeTab === 'mobile' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/80 rounded-lg border border-slate-700 space-y-2">
                <h3 className="text-sm font-bold text-teal-400">
                  Mobile Application: iOS & Android (Capacitor)
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  By wrapping this web application with <strong>Capacitor 6</strong> or <strong>React Native</strong>, field nurses and home-care podiatrists can perform scans using the smartphone camera:
                </p>
                <div className="space-y-1.5 text-[11px] pt-1">
                  <div>• <strong>Camera Scanner:</strong> High-res photo capture of the Harris Mat sheet with corner auto-detection and homography deskewing.</div>
                  <div>• <strong>Touch Landmarking:</strong> Touch-optimized draggable pins with haptic feedback for precise anatomical placement.</div>
                  <div>• <strong>Field Offline Sync:</strong> Automatic queueing when operating in rural or low-connectivity environments.</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: REGULATORY */}
          {activeTab === 'regulatory' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-800/80 rounded-lg border border-slate-700 space-y-2">
                <h3 className="text-sm font-bold text-teal-400">
                  Medical Software Regulatory Blueprint (IEC 62304 / ISO 14971)
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  As Principal Engineer, regulatory compliance is built into the codebase architecture from day one:
                </p>
                <div className="space-y-2 text-[11px] pt-1">
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="font-bold text-slate-200">1. Software Safety Classification (IEC 62304):</span>
                    <p className="text-slate-400 mt-0.5">
                      Class B Software as a Medical Device (SaMD). Risk of non-serious injury if an orthotic is fabricated incorrectly due to dimensional error. Controlled via automated DPI calibration verification and physician sign-off gates.
                    </p>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="font-bold text-slate-200">2. Risk Control & Labelling (ISO 14971):</span>
                    <p className="text-slate-400 mt-0.5">
                      Mandatory regulatory disclaimer rendered on all screens and PDF exports: "Image-derived relative contact classification, not a calibrated pressure transducer (kPa)".
                    </p>
                  </div>
                  <div className="p-2 bg-slate-900 rounded border border-slate-800">
                    <span className="font-bold text-slate-200">3. Immutable Audit Trail (21 CFR Part 11):</span>
                    <p className="text-slate-400 mt-0.5">
                      Cryptographic hash of all patient records, immutable timestamping, and user attribution for every clinical action.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary ml-auto" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
