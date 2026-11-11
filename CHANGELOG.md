# Technomind Healthcare — Plantar Pressure Analysis System
# Master End-to-End Changes History & Architectural Rationale Log

**Document Identifier:** `PPA-DOC-CHANGELOG-2026`  
**Governing Standards:** IEC 62304 (Medical Device Software Lifecycle Processes) · ISO 14971 (Risk Management to Medical Devices) · 21 CFR Part 11 (Electronic Records & Signatures) · ISO 27001 / HIPAA (Data Protection & Privacy)  
**Maintained by:** Technomind Healthcare Systems & Antigravity AI Engineering  

---

## 📌 Architectural Standard Operating Procedure (SOP) for System Changes

To ensure total traceability, regulatory audit readiness, and engineering clarity, **every system modification must document**:
1. **Clinical & Operational Problem Statement**: The exact failure, clinician obstacle, or regulatory deficit encountered.
2. **Why the Change was Suggested**: The clinical, biomechanical, driver compatibility, security, or ergonomic rationale behind the decision.
3. **Technical Root Cause Analysis**: Low-level code, OS, driver, or architectural failure mechanisms.
4. **End-to-End Architectural Solution**: How data flows through the system, from sensor/hardware capture to database and reporting.
5. **Modified Artifacts & Code Responsibilities**: Exact file paths, line numbers, and duties of each modified module.
6. **Regulatory Verification & Test Battery**: Automated test suite additions, scenario passes, and compiler/bundler health.
7. **Upstream & Downstream System Impact**: Effects on offline kiosks, Supabase cloud sync, native shells, and report generation.

---

## 📑 Chronological End-to-End Version History

---

### [v1.0.77] — 2026-11-11
#### Step 11 Anatomical Foot Bounding Box Crop, Viewport Auto-Fit & Multi-Mode Background Selector

#### 1. Clinical & Operational Problem Statement
- In **Step 3 (Process Images)**, the processed foot heatmap was not fitting within the workstation screen. The heel was clipped/cut off at the bottom border, and cards expanded out of the viewport.
- Differing image alignments across uploads: depending on where the foot was positioned on the scanner glass or paper, some images appeared pushed down, misaligned, or shrunken.
- Clinicians requested a pure black background to highlight subtle plantar pressure peaks, with the ability to choose background colors.

#### 2. Why the Change Was Suggested
- **Clinical Usability & Diagnostic Safety**: Clinicians cannot perform complete diabetic foot ulcer risk assessments if the calcaneal (heel) region is truncated by an overflowing viewport border.
- **Image Consistency**: A diagnostic system must provide uniform scale, centering, and alignment regardless of whether a clinician places the Harris Mat near the edge or center of the flatbed.
- **Dynamic Range Contrast**: Standard white or gray backgrounds dilute the visual luminance of faint toe contacts and low-intensity pressure gradients. A clinical pitch black background (`#000000`) maximizes the dynamic range of scientific JET colormaps, while dark slate reduces eye fatigue during long shifts and white allows true-to-print preview.

#### 3. Technical Root Cause Analysis
1. **Vertical Overflow / Heel Cutoff**:
   - In `PodoLoadProcess.tsx` and `podoload.css`, `.podoload-process-foot-preview` had a rigid `min-height: 310px` within an unconstrained flex container. On 768p, 800p, or 900p monitors (or 1080p with Windows 125%/150% display scaling), the card expanded beyond the viewport, and the bottom border sliced off the heel.
2. **Differing Upload Alignment**:
   - In `src/services/imageProcessingService.ts`, `outputCanvas` was sized to the full input scan (e.g. 2480×3508 A4). When the footprint was off-center on the paper, the generated PNG had enormous blank margins. When rendered via `object-fit: contain`, the browser centered the *canvas* rather than the *footprint*, pushing the foot downwards or misaligning it.

#### 4. End-to-End Architectural Solution
1. **Step 11 Anatomical Foot Bounding Box Crop (`imageProcessingService.ts`)**:
   - Implemented exact adherence to Python reference `scripts/harris_jet_v1.py` Step 11.
   - Detects `minX, maxX, minY, maxY` of all segmented foot and toe components.
   - Computes uniform proportional margin padding: `pad = Math.round(Math.max(16, Math.min(width, height) * 0.035))`.
   - Crops `outputCanvas` directly to the footprint, discarding extraneous paper margins and outputting a standardized ~1:2 anatomical aspect ratio.
2. **Constrained Responsive Viewport (`PodoLoadProcess.tsx` & `podoload.css`)**:
   - Set `.podoload-process-grid` and `.podoload-process-foot-preview` to `min-height: 0`.
   - Implemented `.podoload-process-viewport-box`: `height: calc(100vh - 290px)`, `minHeight: 260px`, `maxHeight: 430px`.
   - Applied `img`: `width: 100%`, `height: 100%`, `objectFit: contain`, `objectPosition: center`.
   - Result: 100% of the foot from toes to heel is permanently visible on any resolution without scrolling.
3. **Multi-Mode Clinical Background Selector (`PodoLoadProcess.tsx` & `PodoLoadResults.tsx`)**:
   - Added `HeatmapBackgroundMode = 'black' | 'slate' | 'white'`, defaulting to clinical Pitch Black (`#000000`).
   - Added 1-click quick-toggle buttons (`⬛ Black`, `🌑 Slate`, `⬜ White`) in Step 3 Left Foot Card, Right Foot Card, Parameters Sidebar, and Step 4 Results Toolbar.
   - Persisted selection in `localStorage.getItem('podoload_heatmap_bg')`.
   - Added subtle diagnostic drop-shadow glow (`drop-shadow(0 0 12px rgba(14, 165, 233, 0.2))`) on dark backgrounds.

#### 5. Modified Artifacts
- [`src/services/imageProcessingService.ts`](file:///Users/rajasekaran/Projects/plantar-pressure/src/services/imageProcessingService.ts): Added Step 11 tight anatomical bounding box cropping.
- [`src/components/podoload/PodoLoadProcess.tsx`](file:///Users/rajasekaran/Projects/plantar-pressure/src/components/podoload/PodoLoadProcess.tsx): Responsive viewport auto-fitting and background color switcher.
- [`src/components/podoload/PodoLoadResults.tsx`](file:///Users/rajasekaran/Projects/plantar-pressure/src/components/podoload/PodoLoadResults.tsx): Dynamic background styling, label contrast adjustments, and responsive image scaling.
- [`src/components/podoload/podoload.css`](file:///Users/rajasekaran/Projects/plantar-pressure/src/components/podoload/podoload.css): Updated `.podoload-process-grid`, `.podoload-process-foot-preview`, and `.podoload-bilateral-canvas-box` heights.
- [`scripts/unit_tests.cjs`](file:///Users/rajasekaran/Projects/plantar-pressure/scripts/unit_tests.cjs): Added Section 44 covering Step 11 crop calculation, background persistence, and responsive viewport sizing.

#### 6. Verification Evidence
- **Unit Test Battery**: **118 / 118 Unit Tests Passing** (`npm test`).
- **Clinical Validation Suite**: **15 / 15 Scenarios Passing** (`scripts/validate_system.cjs`).
- **Production Build**: Clean TypeScript compilation (`tsc -b && vite build` in 341ms).
- **Capacitor Synchronization**: Assets cleanly synced to Android and iOS.

---

### [v1.0.76] — 2026-11-11
#### Dual-Architecture WIA Minidriver Integration & All-in-One Printer-Scanner Diagnostics

#### 1. Clinical & Operational Problem Statement
- Clinicians running multi-function printer-cum-scanners (specifically EPSON L3210 Series) saw the printer status monitor show "Ready: It is ready to print", but the scanning application displayed "Scanner Offline / Disconnected".
- Acquisition failed with: `Command failed: powershell ... The command line is too long.`

#### 2. Why the Change Was Suggested
- **Hardware Realities in Clinical Settings**: Most diagnostic clinics use affordable All-in-One USB tank printers (Epson EcoTank L3210, HP InkTank, Canon Pixma). These vendors supply 32-bit WIA minidrivers.
- **Elimination of Administrative Confusion**: Clinicians were confused why Windows reported the printer was online and ready, but the optical scanning station couldn't acquire impressions.
- **Fail-Safe Acquisition**: Even if vendor-specific COM properties fail or hang, Windows native WIA UI must automatically take over so the patient does not have to be rescheduled.

#### 3. Technical Root Cause Analysis
1. **64-bit PowerShell Driver Blindness**:
   - 64-bit PowerShell (`System32\WindowsPowerShell\v1.0\powershell.exe`) cannot load or communicate with 32-bit WIA minidrivers located in `C:\Windows\twain_32\escndv`.
   - Executing `New-Object -ComObject WIA.DeviceManager` inside 64-bit PowerShell returned 0 devices, while 32-bit PowerShell (`SysWOW64\WindowsPowerShell\v1.0\powershell.exe`) instantly detected the scanner.
2. **Coupled CommonDialog Fallback**:
   - The fallback to `WIA.CommonDialog` was previously gated on an empty error message (`if (!$dev -and !$errMsg)`). If an informational warning was set, the fallback never executed.
3. **Command Line Overflow**:
   - Base64 UTF-16LE encoding of WIA PowerShell scripts exceeded the 8,191-character ceiling of `cmd.exe`.

#### 4. End-to-End Architectural Solution
1. **Dual-Architecture Runner (`electron/main.cjs`)**:
   - `runPowerShell()` updated with `force32Bit` parameter directing execution to `C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe`.
   - `scanner:enumerate` and `scanner:acquire` attempt 64-bit first; if 0 devices are found or driver fails, it automatically transparently falls back to 32-bit SysWOW64 PowerShell.
2. **Decoupled WIA CommonDialog Fallback**:
   - Decoupled `WIA.CommonDialog` from `$errMsg`. If programmatic acquisition does not return an image, Windows native `ShowAcquireImage(1)` automatically engages.
3. **Temporary `.ps1` Script Runner**:
   - Writes scripts to OS temp as `.ps1` files with UTF-8 BOM (`\ufeff`) and executes via `-File`, reducing CLI length from 34,350 characters to < 85 characters.
4. **Actionable Clinical Diagnostics**:
   - When printer spooler reports online but WIA scanner service fails, UI displays: *"Printer 'EPSON L3210 Series' is ready, but its optical scanner driver (Epson Scan 2 / WIA driver) was not detected by Windows. Please install or re-run 'Epson Scan 2' setup to enable scanner automation."*

#### 5. Modified Artifacts
- [`electron/main.cjs`](file:///Users/rajasekaran/Projects/plantar-pressure/electron/main.cjs): Dual 64/32-bit SysWOW64 runner and decoupled CommonDialog fallback.
- [`vite.config.ts`](file:///Users/rajasekaran/Projects/plantar-pressure/vite.config.ts): Temp `.ps1` execution in dev server scanner proxy.
- [`src/components/podoload/PodoLoadCapture.tsx`](file:///Users/rajasekaran/Projects/plantar-pressure/src/components/podoload/PodoLoadCapture.tsx): Actionable printer-cum-scanner driver guidance.
- [`scripts/unit_tests.cjs`](file:///Users/rajasekaran/Projects/plantar-pressure/scripts/unit_tests.cjs): Added Section 41 test scenarios.

#### 6. Verification Evidence
- **Unit Test Battery**: **115 / 115 Unit Tests Passing** (`npm test`).
- **Clinical Validation Suite**: **15 / 15 Scenarios Passing** (`scripts/validate_system.cjs`).
- **Production Build**: Clean compilation in 314ms.

---

### [v1.0.75] — 2026-11-10
#### Password Security Compliance, Stored Password Non-Exposure & Forced Password Change

#### 1. Clinical & Operational Problem Statement
- In previous versions, Administrators and Super Administrators could view stored passwords in plain text via eye toggles, which constitutes a security breach under HIPAA and ISO 27001.
- In case a technician forgot their credentials, there was no compliant way to issue a temporary password or force a reset.

#### 2. Why the Change Was Suggested
- **Compliance with Healthcare Security Standards**: 21 CFR Part 11, HIPAA Security Rule (§ 164.312), and ISO 27001 strictly mandate that stored passwords must never be readable by administrators, developers, or system operators.
- **Credential Ownership**: A technician's password must be private to that technician. Administrators should only be able to trigger resets, issue temporary credentials, or re-issue hardware vouchers.

#### 3. Technical Root Cause Analysis
- Administrator management modals rendered stored password strings directly into `<input type={showPin ? 'text' : 'password'} value={tech.pin} />`, exposing plain-text passwords in memory and DOM.

#### 4. End-to-End Architectural Solution
1. **Permanent Password Masking**:
   - All stored password displays in Admin and Super Admin modals permanently display `••••••••`.
   - Eye reveal buttons and copy-stored-password buttons permanently removed.
2. **Admin Temporary Password Issuance**:
   - Admins can enter or generate a new temporary password.
   - Checkbox: *Force technician to change password upon next station sign-in* (`mustChangePassword: true`, checked by default).
   - Saved password shown once in a **One-Time Handover Dialog** with copy button; never viewable again.
3. **Forced Password Reset Screen**:
   - Technician logging in with `mustChangePassword === true` is intercepted before session grant and routed to **Establish Permanent Password** modal.
   - Session cannot proceed until new permanent password is confirmed and saved locally and to cloud.
4. **Hardware Unbinding & Voucher Re-issuance**:
   - Added `[Re-issue Voucher & Unbind]` button in Admin and Super Admin panels. Unbinds existing hardware MAC and generates fresh single-use voucher code (`TMH-TECH-...`).

#### 5. Modified Artifacts
- [`src/components/podoload/PodoLoadAdmin.tsx`](file:///Users/rajasekaran/Projects/plantar-pressure/src/components/podoload/PodoLoadAdmin.tsx): Masked passwords, temporary password issuance modal, one-time handover dialog, and voucher unbinding.
- [`src/components/podoload/PodoLoadSuperAdmin.tsx`](file:///Users/rajasekaran/Projects/plantar-pressure/src/components/podoload/PodoLoadSuperAdmin.tsx): Masked passwords, temporary password issuance, and hardware unbinding across hospital networks.
- [`src/components/podoload/PodoLoadRoleModal.tsx`](file:///Users/rajasekaran/Projects/plantar-pressure/src/components/podoload/PodoLoadRoleModal.tsx): Intercepts `mustChangePassword: true` and enforces new permanent password entry.
- [`src/services/dbService.ts`](file:///Users/rajasekaran/Projects/plantar-pressure/src/services/dbService.ts): Added `mustChangePassword?: boolean` to `TechnicianUser` interface.
- [`scripts/unit_tests.cjs`](file:///Users/rajasekaran/Projects/plantar-pressure/scripts/unit_tests.cjs): Added Section 42 test suite.

#### 6. Verification Evidence
- **Unit Test Battery**: **109 / 109 Unit Tests Passing** (`npm test`).
- **Clinical Validation Suite**: **15 / 15 Scenarios Passing**.

---

### [v1.0.74] — 2026-11-10
#### Windows Hardware Scanner WIA Automation & Command Ceiling Elimination

#### 1. Clinical & Operational Problem Statement
- Scanning on Windows flatbed scanners failed with `Command failed: powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ... The command line is too long.`

#### 2. Why the Change Was Suggested
- Base64 UTF-16LE encoded PowerShell scripts exceeded Windows `cmd.exe` maximum command-line length of 8,191 characters.

#### 3. End-to-End Architectural Solution
- Replaced inline `-EncodedCommand` with temporary script execution: writes `.ps1` file with UTF-8 BOM (`\ufeff`) to `os.tmpdir()` and runs `powershell.exe -ExecutionPolicy Bypass -File <path>`.
- Added flatbed source selection property (`WIA_DPS_DOCUMENT_HANDLING_SELECT: 2`).

---

### [v1.0.73] — 2026-11-10
#### Streamlined Clean Sign-In Experience & Clutter Elimination

#### 1. Clinical & Operational Problem Statement
- Login screen displayed distracting regulatory disclaimers and cluttered bullet points.

#### 2. End-to-End Architectural Solution
- Removed regulatory footer banner and bullet point noise from `PodoLoadRoleModal.tsx`.
- Kept clean User ID and Password fields with clear device binding telemetry.

---

### [v1.0.72] — 2026-11-09
#### Three-Tier Role Hierarchy & Central Super Admin Governance

#### 1. Clinical & Operational Problem Statement
- Hospitals required vendor oversight to manage multiple hospital clinics, administrators, and roaming technicians under unified licensing.

#### 2. End-to-End Architectural Solution
- Implemented 3-Tier Hierarchy:
  - **Tier 1: 🛡️ Super Administrator (Global Vendor Authority)**: Master console (`Ctrl+Shift+S`), multi-clinic provisioning, global telemetry.
  - **Tier 2: 🏥 Hospital Administrator (Clinic Governance)**: Staff management, facility branding, audit logging.
  - **Tier 3: 🔬 Clinical Technician (Diagnostic Operator)**: 100% offline Harris Mat examinations and PDF report generation.
- Integrated Supabase Cloud bi-directional synchronization (`https://yqfbhxtvrpfyzygzuqts.supabase.co`).

---

### [v1.0.0 – v1.0.71] — Core Platform Foundation
- **Optical Harris Mat Morphometry**: 39-step image processing pipeline, normalized convolution, and scientific JET colormap synthesis.
- **Biomechanical Analysis**: 10-zone anatomical contour segmentation, Cavanagh Arch Index, Bilateral Asymmetry Index ($ASI\%$).
- **Offline-First Architecture**: Embedded IndexedDB, cryptographic terminal MAC binding, single-use activation vouchers (`TMH-TECH-...`).
- **Regulatory Medical Reporting**: 4-page clinical PDF report generation with orthotic modifications and risk stratifications.
- **Cross-Platform Delivery**: Native Windows `.exe` (Electron), Android `.apk` (Capacitor/Camera2 HAL), iOS `.ipa`, and Web SaaS.
