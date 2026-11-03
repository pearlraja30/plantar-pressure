# Plantar Pressure Analysis System — Enterprise Architecture & Extensibility Manual

**Document ID:** PPA-ARCH-MAN-001  
**Author:** Principal Medical Systems Software Engineer  
**Applicability:** Desktop (Windows, macOS, Linux), Mobile (iOS, Android), and Cloud Web Portal  
**Regulatory Alignment:** IEC 62304:2015 (Class B SaMD), ISO 14971:2019, IEC 62366-1:2015, IWGDF 2023  

---

## 1. Architectural Philosophy & Separation of Concerns

The Plantar Pressure Analysis System is built following **Clean Architecture (Hexagonal Architecture)** and **Object-Oriented Design Principles (SOLID)**. The core business rules and computer vision algorithms are completely decoupled from UI frameworks, operating systems, and physical scanner hardware.

```
+-------------------------------------------------------------------------------+
|                             PRESENTATION LAYER                                |
|  React UI Workspaces • Native Desktop Window • iOS/Android Mobile Viewports   |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                             APPLICATION LAYER                                 |
|     Domain Event Bus (Observer) • Scanner Manager • Cloud Sync Orchestrator   |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                               CORE DOMAIN LAYER                               |
|   Strategy Pattern: IPlantarAnalysisStrategy (Optical Harris Mat Grid Density)|
|   10-Zone Partitioning: Fully Automated AI Contour Segmentation               |
|   Specification Pattern: OrthoticRuleEngine (IWGDF, Cavus, Planus Rules)      |
|   Biomechanical Calculator: Cavanagh AI, Chippaux-Smirak CSI, Staheli SI, ASI |
+-------------------------------------------------------------------------------+
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                            INFRASTRUCTURE LAYER                               |
|   Native Camera Burst Control • Custom Paper Homography • Local & Cloud Sync  |
+-------------------------------------------------------------------------------+
```

---

## 2. Object-Oriented Design Patterns Applied

### 2.1 Strategy Pattern (`src/core/strategies/`)
Enables interchangeable analysis algorithms without modifying consumers (**Open-Closed Principle**).

- **Interface:** `IPlantarAnalysisStrategy`
  - `HarrisMatGridDensityStrategy`: Measures optical ink stippling/grid compression from physical Harris Mat rubber impressions.
  - `ElectronicSensorMatImportStrategy`: Ingests digital matrices from electronic pressure plates (Tekscan, Zebris, Novel Pedar).
- **Factory:** `AnalysisStrategyFactory` allows registering new strategies at runtime with zero breaking changes.

### 2.2 Specification & Rule Engine Pattern (`src/core/rules/`)
Decouples orthotic manufacturing guidelines from the UI.

- **Interface:** `IOrthoticRule`
  - `CavusArchRule`: Detects high arch ($AI < 0.21$) $\to$ prescribes 16mm heel cup and total-contact arch fill.
  - `FlatFootPlanusRule`: Detects flat foot ($AI > 0.26$) $\to$ prescribes 4° varus medial posting and rigid polypropylene shell.
  - `DiabeticHyperpressureRule`: Detects diabetic patient with focal Category C6 peak $\to$ prescribes 6mm EVA offloading well and Plastazote topcover (IWGDF 2023).
  - `MetatarsalgiaRule`: Detects excessive forefoot contact $\to$ prescribes teardrop metatarsal pad.
  - `PlantarFasciitisRule`: Adds horseshoe calcaneal spur relief and windlass mechanism groove.

### 2.3 Observer Pattern (`src/core/events/DomainEventBus.ts`)
A strongly-typed, publish-subscribe event bus decoupling clinical operations from side-effects (e.g., audit logging, cloud sync retry queues, telemetry).

- Events: `SCAN_ACQUIRED`, `ANALYSIS_COMPLETED`, `LANDMARKS_UPDATED`, `CLINICAL_SIGN_OFF`, `CLOUD_SYNC_STATUS_CHANGED`.

---

## 3. Step-by-Step Extensibility Guide

### 3.1 How to Add a Brand-New Analysis Algorithm (e.g. AI Deep Learning Segmenter)

Adding a new algorithm requires **zero changes** to existing components:

1. **Create the Strategy Class:**
   Create `src/core/strategies/DeepLearningSegmenterStrategy.ts`:
   ```typescript
   import { IPlantarAnalysisStrategy, PlantarAnalysisInput, PlantarAnalysisOutput } from './IPlantarAnalysisStrategy';

   export class DeepLearningSegmenterStrategy implements IPlantarAnalysisStrategy {
     public readonly id = 'ai-unet-segmenter-v1';
     public readonly name = 'U-Net Deep Learning Anatomical Segmenter';
     public readonly version = 'v3.0.0-AI';
     public readonly description = 'Uses an ONNX/TensorFlow.js neural network to segment the 10 anatomical zones.';
     public readonly supportedModality = 'HarrisMatOptical' as const;

     public async execute(input: PlantarAnalysisInput): Promise<PlantarAnalysisOutput> {
       // Run neural network inference on input.sourceImage
       // Return standard PlantarAnalysisOutput
     }
   }
   ```

2. **Register in Factory:**
   In `src/core/strategies/AnalysisStrategyFactory.ts`:
   ```typescript
   strategyFactory.registerStrategy(new DeepLearningSegmenterStrategy());
   ```

3. **Result:** The new algorithm is instantly selectable in the diagnostic workstation UI!

---

### 3.2 How to Add a New Clinical Orthotic Rule

To add an orthotic rule (e.g., for Hallux Rigidus or Morton's Neuroma):

1. **Implement `IOrthoticRule`:**
   ```typescript
   import { IOrthoticRule } from '../core/rules/OrthoticRuleEngine';

   export class HalluxRigidusRule implements IOrthoticRule {
     public readonly id = 'rule-hallux-rigidus';
     public readonly name = 'Hallux Rigidus Stiffening Rule';

     public isApplicable(analysisCase, patient): boolean {
       return patient.clinicalNotes.toLowerCase().includes('hallux rigidus');
     }

     public generateRecommendation(): string {
       return 'Hallux Rigidus: Prescribe rigid carbon-fiber Morton extension under the 1st ray with forefoot rocker sole to eliminate 1st MPJ dorsiflexion during terminal stance.';
     }
   }
   ```

2. **Register with the Rule Engine:**
   ```typescript
   orthoticRuleEngine.registerRule(new HalluxRigidusRule());
   ```

---

## 4. Biomechanical Formulations & Scientific Standards

### 4.1 Cavanagh & Rodgers Arch Index ($AI$)
Ratio of the midfoot contact area to the total main foot contact area:
$$AI = \frac{\text{Area}_{\text{Midfoot}}}{\text{Area}_{\text{Hindfoot}} + \text{Area}_{\text{Midfoot}} + \text{Area}_{\text{Forefoot}}}$$
- **$AI < 0.21$**: High Arch (*Pes Cavus*)
- **$0.21 \le AI \le 0.26$**: Normal Arch
- **$AI > 0.26$**: Flat Foot (*Pes Planus*)

### 4.2 Chippaux-Smirak Index ($CSI$)
Ratio of the narrowest width of the midfoot arch ($W_{\text{mid}}$) to the widest forefoot width ($W_{\text{fore}}$):
$$CSI = \frac{W_{\text{mid}}}{W_{\text{fore}}} \times 100\%$$
- **$CSI = 0\%$**: High Arch (complete absence of lateral border contact)
- **$0\% < CSI \le 29.9\%$**: Morphologically elevated arch
- **$30\% \le CSI \le 45\%$**: Normal arch
- **$CSI > 45\%$**: Flat foot (*Pes Planus*)

### 4.3 Staheli Arch Index ($SI$)
Ratio of narrowest midfoot width to rearfoot heel width:
$$SI = \frac{W_{\text{mid}}}{W_{\text{hind}}}$$
- **$SI < 0.30$**: High Arch
- **$0.30 \le SI \le 0.85$**: Normal Arch
- **$SI > 0.85$**: Flat Foot

### 4.4 IWGDF 2023 Diabetic Ulcer Risk Stratification
- **Category 0 (Very Low Risk):** Normal baseline contact without focal peak pressure.
- **Category 1 (Low Risk):** Peripheral neuropathy without focal hyperpressure.
- **Category 2 (Moderate Risk):** Neuropathy + focal Category C6 peak pressure at metatarsal head $\implies$ requires **6.0 mm EVA/Poron offloading well**.
- **Category 3 (High Risk):** History of foot ulceration or amputation $\implies$ requires rigid rocker sole and custom multi-density total-contact orthotic.

### 4.5 Bilateral Asymmetry Index ($ASI$)
Percentage loading asymmetry between left and right limbs:
$$ASI = \frac{|L - R|}{(L + R) / 2} \times 100\%$$
- Evaluates antalgic gait compensation, post-operative limb offloading, and leg length discrepancies.

---

## 5. Database & Migration Strategy

For local offline clinics and hospital servers, data storage follows a **Schema Versioning Migration Pattern**:

1. **Entity Schema Versioning:** Every stored case record carries an `entityVersion: number` (e.g. `v1`, `v2`).
2. **Migration Pipeline:**
   ```typescript
   export function migrateCaseRecord(rawCase: any): AnalysisCase {
     let c = { ...rawCase };
     if (!c.version || c.version < 2) {
       // Migration from v1 to v2: compute Chippaux-Smirak and IWGDF risk
       c.regionalAnalysis.chippauxSmirakIndex = BiomechanicalCalculator.calculateChippauxSmirakIndex(c.orthoticMeasurements.heelWidthMm, c.orthoticMeasurements.forefootWidthMm);
       c.regionalAnalysis.diabeticUlcerRisk = BiomechanicalCalculator.evaluateDiabeticUlcerRisk(c.regionalAnalysis.peakContactCategory, c.regionalAnalysis.peakRegion, c.indication);
       c.version = 2;
     }
     return c;
   }
   ```
3. **Database Drivers:**
   - **Desktop:** SQLite via Electron `better-sqlite3` with encrypted database file (`SQLCipher`).
   - **Web / Mobile:** `IndexedDB` with fallback to `localStorage`.
   - **Cloud Server:** PostgreSQL with JSONB schema and FHIR / HL7 observation mapping.

---

## 6. Regulatory Verification & Test Protocol (IEC 62304 / ISO 14971)

| Verification Area | Requirement | Test Procedure & Acceptance Criteria |
| :--- | :--- | :--- |
| **Algorithm Determinism** | IEC 62304 Class B | Running the same scan 100 times on-device must yield $\Delta \text{Intensity} = 0.000$ and identical category assignments. |
| **Scale Precision** | ISO 14971 Risk Control | Custom Sheet 4-Corner Rectification must produce $W_{\text{mm}} \pm 0.5\text{ mm}$ and $H_{\text{mm}} \pm 0.5\text{ mm}$. |
| **Audit Trail Immutability** | 21 CFR Part 11 | Audit log entries are strictly append-only, cryptographic SHA-256 hashes verified on sync. |
| **Clinical Disclaimer** | Labeling Compliance | "Image-derived Relative Intensity Index (RII), not a direct measurement of physical force in kPa" rendered on all UI screens and PDF reports. |
| **Bilateral Linking** | IEC 62366 Usability | Contralateral foot scans are scanned separately and automatically correlated under the same patient MRN. |

---

## 7. Enterprise System Requirements & Architectural Boundaries Baseline

| Item # | Domain Area | Formal Specification | System Architecture Realization |
| :--- | :--- | :--- | :--- |
| **1** | **Hardware & Image Capture** | **Both: Camera Capture + File Upload** | Supports live camera stream with alignment HUD and direct file upload (TIFF, PNG, JPEG, PDF) with drag-and-drop. |
| **2** | **Paper Size & Scale** | **Custom Size Supported** | Dynamic $W \times H\text{ mm}$ configuration with presets (A4, Harris Mat, US Letter). Homography unwarping calibrates $\text{Scale} = H_{\text{mm}} / H_{\text{px}}$. |
| **3** | **Pressure Output & Units** | **Relative Intensity Index (RII)** | Normalized index scale ($0.00 - 1.00$) classified into 6 clinical tiers (`C1` to `C6`). Not physical kPa. |
| **4** | **10-Zone Anatomical Partitioning** | **Fully Automated AI Contour Segmentation** | Real-time spatial pixel integration partitioning Hallux, Lesser Digits, M1, M2, M3–M5, Medial Arch, Lateral Arch, Medial Calcaneus, and Lateral Calcaneus. |
| **5** | **Bilateral Stance & Asymmetry** | **Scanned Separately & Linked Under Patient** | Left and Right feet are scanned in independent sessions and linked under patient MRN. Computes Bilateral Asymmetry Index ($ASI$). |
| **6** | **Orthotic Recommendations** | **Printed on 4-Page PDF Report** | Prescriptions, materials (EVA, Poron, Polypropylene), and shell modifications printed on Pages 3 & 4 of the clinical PDF. |
| **7** | **Cloud & Storage** | **Both Local and Cloud Storage** | Local offline persistence (IndexedDB / SQLite) paired with SHA-256 verified encrypted cloud backup. |
| **8** | **Clinical Test Data Set** | **Samples Provided by Partner** | Automated verification battery (VT-01 to VT-13) calibrated against clinical physical Harris Mat scans provided by clinical team. |
| **—** | **Algorithm Execution** | **100% On-Device** | Zero external cloud API compute latency; executes entirely in client browser / Electron / mobile native runtime. |
| **—** | **Native Camera Control** | **Fixed Burst Multi-Frame Capture** | 3-frame or 5-frame burst capture with automated Laplacian variance sharpness selection. |
| **—** | **Future Hardware Integration** | **NO (Excluded)** | Dedicated solely to optical Harris Mat impressions; third-party electronic mat drivers excluded from scope. |
| **—** | **Hospital PACS / DICOM** | **NOT REQUIRED (Excluded)** | Out of scope; platform operates with local storage and encrypted cloud sync with 4-page PDF exports. |

---

## 8. 3-Tier Enterprise Distributed Architecture & PostgreSQL Migration Roadmap

To transition from an embedded two-tier offline clinic model to a centralized, multi-tenant enterprise hospital network, the system architecture supports a phased evolution into a **3-Tier Distributed Architecture**:

```
+-------------------------------------------------------------------------------+
|                       TIER 1: MULTI-PLATFORM CLIENT FRONTENDS                 |
|  Web Portal (PWA) • Windows (.exe) • iOS (.ipa) • Android (.apk)              |
|  Offline Edge Cache: IndexedDB / SQLite (Zero-latency offline capture)        |
+-------------------------------------------------------------------------------+
                                      |  (HTTPS / TLS 1.3 / WebSocket / REST)
                                      v
+-------------------------------------------------------------------------------+
|                 TIER 2: BACKEND APPLICATION & CLINICAL SERVICES               |
|  - API Gateway: Reverse proxy, rate limiting, JWT validation                  |
|  - Auth & IAM: Master Password, RBAC, Recovery Key challenge                  |
|  - Device Licensing: Hardware fingerprint matching, multi-device quotas       |
|  - Biomechanics Engine: IEC 62304 Class B automated algorithm verification     |
|  - Sync Engine: Bidirectional conflict resolution (client vs server timestamp) |
|  - Audit Service: 21 CFR Part 11 append-only cryptographic log stream         |
+-------------------------------------------------------------------------------+
                         |                              |
      (Relational SQL)   v                              v  (S3 REST / Signed URLs)
+------------------------------------+   +--------------------------------------+
|       TIER 3A: DATABASE SERVICE    |   |     TIER 3B: CLOUD OBJECT STORAGE    |
|   PostgreSQL 16+ Relational DB     |   |   AWS S3 / GCP Storage / MinIO       |
|   - Multi-tenant Row-Level Security|   |   - Raw 300 DPI Footprint Scans      |
|   - Normalized clinical schemas    |   |   - Diagnostic Colormap Heatmaps     |
|   - Partitioned audit log trails   |   |   - 4-Page Generated PDF Reports     |
+------------------------------------+   +--------------------------------------+
```

### 8.1 Key Architectural Guarantees of the 3-Tier Model:
1. **Offline-First Resilience**: Field clinics and operating theaters can acquire footprints and calculate Cavanagh Arch Indices without an active internet connection. Scans are stored locally and synchronized atomically when connectivity is restored.
2. **Binary Bloat Mitigation**: High-resolution 300 DPI scans ($1240 \times 1754\text{ px}$) and JET colormaps are offloaded to Cloud Object Storage (S3/GCS/MinIO), storing only signed URI references in PostgreSQL rows to guarantee sub-millisecond database queries.
3. **Multi-Tenant Hospital Isolation**: Relational tables enforce `hospital_id` partitioning with PostgreSQL Row-Level Security (RLS), preventing cross-hospital data leakage while supporting centralized administrative oversight.

*(For full DDL schemas, migration scripts, and sequence flows, refer to [`POSTGRESQL_3TIER_MIGRATION_PLAN.md`](file:///Users/rajasekaran/Projects/plantar-pressure/POSTGRESQL_3TIER_MIGRATION_PLAN.md)).*

---

## 9. Security, Identity & Multi-Device Hardware Licensing Architecture

### 9.1 Two-Tier Role-Based Access Control (RBAC)
The system establishes a strict separation of privileges:
- **Hospital Administrator**: System-level configuration, hospital branding, technician user provisioning, device binding licensing, alphanumeric ID formatting, and centralized database maintenance.
- **Clinical Technician**: Day-to-day patient intake, footprint scanning, unwarp rectification, biomechanical review, and 4-page PDF report generation.

### 9.2 Master Password Security & Zero Plaintext Exposure
- Replaced legacy numeric PINs with strong alphanumeric Master Passwords and Technician Passwords.
- Elimination of all hardcoded password default hints (`(Default: ...)`).
- Two-way recovery architecture:
  - Admin: Recovery Key (`REC-TMH-9901`) or verified phone number.
  - Technician: Registered email/phone or Admin Master Password in-person override.
- Admin Technician Password Maintenance: Administrators can reveal/unmask, manually change, or cryptographically auto-generate technician credentials.

### 9.3 Hardware Device Licensing & Single-Device Binding
- **Hardware Telemetry Fingerprinting**: Synthesizes CPU concurrency, screen geometry, platform user-agent, and canvas optical rendering hash into a unique `DEVICE-FPRINT-...` signature.
- **Single-Device License Lock**: Restricts base installations to one registered physical device.
- **Multi-Device Payment & Activation Gateway**: Intercepts secondary device access, providing an upgrade path (Base, Pro Dual-Device, Enterprise Fleet) with immediate mock payment processing and cryptographic token issuance.

### 9.4 Enterprise Database Password Validation & REST API Architecture
To provide medical-grade security compliant with **21 CFR Part 11** and **HIPAA**, the distributed architecture decouples authentication into a dedicated REST service:

1. **Cryptographic Password Storage**:
   - Passwords are encrypted at rest using **Argon2id** (memory cost $64\text{ MB}$, time cost $3\text{ iterations}$, parallelism $4$).
   - Salt generation uses cryptographically secure random bytes ($16\text{ bytes}$).
   - Plaintext passwords never touch logs, storage tables, or diagnostic telemetry.
2. **Brute-Force & Attack Defense**:
   - Accounts enforce a strict lockout policy: after 5 consecutive failed login attempts, the account is locked for 15 minutes (`locked_until`).
   - IP and Device Fingerprint rate limiting throttling requests to a maximum of 10 attempts per minute.
3. **Session & Token Management**:
   - Issues short-lived JSON Web Tokens (JWT) for access ($15\text{ minutes}$) signed with asymmetric keys (RS256) or HMAC-SHA256.
   - Long-lived Refresh Tokens ($7\text{ days}$) stored in encrypted `httpOnly` secure cookies.
   - Immediate session invalidation across all terminals upon password reset.
4. **Offline / Online Dual-Mode Continuity**:
   - Client applications authenticate against the cloud REST API when internet connectivity is active.
   - When operating in remote clinic or offline theater environments, the client seamlessly falls back to local IndexedDB (`PodoPressDB`) credential verification, logging pending audit events to sync upon reconnection.

### 9.5 Dynamic Multi-Technician Terminal Architecture & Explicit User ID Authentication
Diagnostic stations frequently operate in multi-shift hospital departments where multiple clinical operators share the same diagnostic terminal:
1. **Explicit Operator Identification**: Under **Clinical Technician Login**, the system requires entering the technician's **User ID / Username** and confidential **Password / PIN**.
2. **Terminal Decoupling**: Diagnostic stations are not bound to a single operator. Any registered technician belonging to the clinic facility can sign in, acquire footprints, review analysis heatmaps, and produce signed examination records.
3. **Audit Trail Accountability (21 CFR Part 11)**: Every login event, examination acquisition, and PDF export explicitly records the active technician's User ID (`tech.username`) into immutable audit records.

### 9.6 Public Login Hardening, Single Administrator Setup & Separated `/admin` Context
1. **Default Technician-Only Flow on New Devices**:
   - When installed on new physical terminals (**Windows Desktop .exe**, **Android .apk**, or **iOS .ipa**), the station dialog opens exclusively in **Clinical Technician Station Sign-In** mode.
   - The "Hospital Administrator" card and account switcher are completely removed from standard view, preventing staff confusion and curiosity.
2. **Dedicated `/admin` Context (Web & Intranet)**:
   - Accessing `/admin`, `#/admin`, or `?mode=admin` routes immediately into the **Hospital Administrator Portal**.
3. **Discreet Administrator Access on Native Terminals (Zero On-Screen Admin Buttons)**:
   - **Zero Visual Footprint**: The clinical sign-in dialog contains **no visible buttons or links** for the Admin Portal.
   - **Windows Desktop Keystroke**: Pressing **`Ctrl + Shift + A`** (or `Cmd + Shift + A` on Mac) anywhere silently toggles into the Hospital Administrator Portal.
   - **Dedicated Desktop Shortcut Flag**: Creating a Windows shortcut with target `PodoPress.exe --admin` opens directly into `/admin`.
   - **Native Windows Menu**: Accessible via native menu bar under **Security $\rightarrow$ Hospital Administrator Console... (`Ctrl+Shift+A`)**.
   - **Mobile Kiosk Multi-Tap Gesture**: Tapping the header shield/lock icon 5 times in 2.5 seconds unlocks Master Administrator access.
   - **Quick Reversal**: The Admin login card provides a prominent `← Back to Technician Login` button.
4. **Single Master Administrator Governance**: Exactly one Hospital Administrator possesses master administrative authority over each station. On fresh deployment or first-time setup, default master credentials (`admin@technomind.health` / `1234`) allow the designated clinic head to perform initial station onboarding.
5. **Elimination of Public Setup & Recovery Backdoors**:
   - All "Register Admin" and "Create Admin" links are completely absent from the login dialog.
   - All public "Forgot Password" and "Forgot Master Password" recovery options have been eliminated from the unauthenticated login modal, guaranteeing that unauthorized operators, patients, or casual terminal users cannot trigger credential resets or bypass security gates.
6. **Protected Admin Panel Password Management**:
   - Master Password changes are strictly confined inside the authenticated **Hospital Administrator Panel** (`Admin security` tab).
   - Inputs are masked (`••••••••`) by default with optional reveal toggles to prevent onlookers and shoulder-surfers from capturing keystrokes.
   - Verification gate requires validating the active *current* Master Password before any new password can be applied.
   - Technician password resets are managed exclusively by the Hospital Administrator inside the Admin Panel.
7. **Strict Role-Based Admin Panel Guarding**:
   - If a technician or unauthenticated operator attempts to access the Admin Panel, the system halts and renders a secure "Hospital Administrator Access Required" gate prompting for the Master Password.

### 9.7 Configurable Activation Voucher Rotation Policy & 21 CFR Part 11 Audit Trail
1. **Configurable Rotation Frequencies**: Activation vouchers rotate dynamically based on an administrator-configured policy (default: 1 hour; options: 2 hours, 8 hours, 24 hours / 1 day, 3 days, 7 days, 30 days, or custom minutes/hours/days).
2. **Live Remaining Time Tracking**: Displays remaining time-to-live (`remainingMinutes`) with a 10% safety grace period to prevent operator lockouts during examination transitions.
3. **Responsive Activation Hub Layout**: Credential cards utilize responsive CSS Grid `repeat(auto-fit, minmax(280px, 1fr))` ensuring codes (`TMH-CENTRAL`, `TMH-TECH-2805`) and credentials never collapse or truncate (`...`) across standard laptop, desktop, and tablet displays.
4. **Collapsible Policy Drawer**: The configuration drawer remains tucked away until toggled via "Configure Policy ⚙️", maintaining a clean and focused operator hub.
5. **Immutable Audit Persistence**: All voucher rotations (`ACTIVATION_CODE_ROTATED`), failed logins (`LOGIN_FAILED`), password updates (`ADMIN_PASSWORD_UPDATED`), device bindings, and license upgrades are permanently logged in the `audit_logs` store.

### 9.8 UI Containment, React Rules of Hooks & Sandbox Boundary Isolation
1. **React Rules of Hooks Compliance**: All lifecycle hooks (`useState`, `useEffect`, `useMemo`, `useCallback`) are strictly hoisted to the top level of component bodies before any early conditional `return` statements (e.g. `if (!isOpen) return null;`), preventing hook count mismatch exceptions (`Rendered more hooks than during the previous render.`).
2. **Responsive Viewport Containment**: CSS Grid configurations enforce `grid-template-columns: 210px minmax(0, 1fr)` with strict `min-width: 0` constraints, completely eliminating horizontal clipping on smaller screens and mobile viewports.
3. **Wide Table Containment**: All data tables are wrapped in dedicated scroll containers (`overflow-x: auto; -webkit-overflow-scrolling: touch`), preventing wide tabular datasets from expanding the global application layout.
4. **Native Desktop & Web Navigation Sandboxing**:
   - Electron's main process filters `will-navigate` events, denying navigation to external web destinations while restricting execution strictly to local resources (`file://`, `localhost:`).
   - `setWindowOpenHandler` denies unexpected external window or popup creation (`{ action: 'deny' }`).
   - Global capture-phase click interceptor in `src/main.tsx` blocks unvetted external web links.
   - Modal views intercept the `Escape` key (`e.preventDefault()`, `e.stopPropagation()`) to prevent unintended browser navigation.

---

## 10. Inbuilt Storage Architecture & Database Records Explorer Engine

### 10.1 Multi-Store IndexedDB Schema (`PodoPressDB`)
The client engine utilizes IndexedDB (`PodoPressDB v1`) consisting of 7 distinct object stores:
1. `patients`: Demographic data, medical history, MRN, contact information.
2. `cases`: Complete clinical examination records, 10-zone forces, Cavanagh AI, orthotics.
3. `technicians`: Clinical technician accounts, usernames, credentials.
4. `admin_accounts`: Administrator master accounts and recovery credentials.
5. `bound_devices`: Authorized hardware fingerprints and license tier tags.
6. `audit_logs`: Immutable, append-only 21 CFR Part 11 audit records.
7. `settings`: Application configuration, scanner calibration, report branding.

### 10.2 Live Database Records Explorer (`PodoLoadDatabaseViewer.tsx`)
- Provides immediate direct access to inspect and search all database records across the 7 stores directly within the application UI (accessible via Sidebar and Settings).
- Real-time multi-column search and dynamic row count badges.
- Accessible modal for deep inspection of complete record payloads with formatted JSON and one-click JSON copy.
- Atomic Export/Import JSON backup engine for offline disaster recovery.

---

## 11. Station Session Architecture: Explicit Logout & Zero Stale Data Guarantee

### 11.1 Problem & Threat Modeling
In shared clinical environments (consultation rooms, diagnostic stations, gait labs), multiple technicians and clinicians often use the same physical workstation across shifts. If an active clinical session (containing patient demographics, raw Harris Mat scans, plantar pressure heatmaps, and orthotic measurements) is not explicitly purged upon user departure:
1. **HIPAA / GDPR Violation**: Subsequent operators can view previous patient records and diagnostic data.
2. **Clinical Data Contamination**: Scans and measurements from Patient A could be inadvertently linked or committed to an exam initiated for Patient B.
3. **Session Ambiguity**: Diagnostic audits cannot determine with mathematical certainty which operator performed the examination.

### 11.2 Architectural Solution: Zero Stale Data Ingestion & Purge Engine
1. **Multi-Point Logout UI**:
   - **Header Logout**: A clean, accessible `Sign Out` button with `<LogOut />` icon placed directly alongside the user role badge in `PodoLoadHeader.tsx`.
   - **Sidebar User Profile Card**: A dedicated red-accented `Log Out` action button integrated within the bottom operator card in `PodoLoadSidebar.tsx`.
   - **Modal Session Banner**: An active session indicator with immediate `Sign Out` action in `PodoLoadRoleModal.tsx`.
2. **In-Memory & Storage Sanitization (`handlePurgeSessionData()`)**:
   - Resets patient and examination state: `selectedPatientId = ''`, `selectedCaseId = ''`, `activeLoadedCase = null`.
   - Purges raw foot scans (`leftFoot = null`, `rightFoot = null`), processed heatmaps (`leftHeatmapUrl = null`, `rightHeatmapUrl = null`), and morphometric analyses (`leftAnalysis = null`, `rightAnalysis = null`).
   - Resets clinical stepper to `Step 1: Patient Registration` and wipes all search queries.
   - Cleans temporary storage keys (`ppa-selected-patient-id`, `ppa-selected-case-id`, `ppa-active-session`).
   - Automatically executed whenever a user logs out (`handleLogout()`) or switches active user roles (`handleSelectRole()`).
3. **Locked Workstation State (`isSessionLocked`)**:
   - When a session ends, `isSessionLocked` is set to `true`.
   - The station displays the sign-in modal in lockdown mode. Modal dismissal buttons (`X` and `Cancel`) are hidden, requiring legitimate authentication before the workstation can be used.
4. **21 CFR Part 11 Audit Record**:
   - An immutable audit trail event (`USER_LOGOUT`) is committed to the `audit_logs` store in `PodoPressDB` logging the user ID, role, and exact timestamp.

---
*Technomind Healthcare Systems — Document Reference: PPA-ARCH-MAN-001 — Confidential & Proprietary*
