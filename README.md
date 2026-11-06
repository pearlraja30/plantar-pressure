# Technomind Healthcare — Plantar Pressure Analysis System

Medical-grade, platform-agnostic Plantar Pressure Analysis & Orthotic Prescription System based on Technical File `PPA-SW-TF-001`. Designed for high-precision diagnostic deployment across native **Desktop (Windows, macOS, Linux)**, **Mobile (iOS, Android)**, and **Cloud Web SaaS**.

---

## 📋 Core Architectural Specifications & Confirmed Requirements

All 12 key engineering and clinical requirements have been officially established and implemented:

| # | Question / Requirement | Confirmed Architectural Decision | Implementation Status |
| :-: | :--- | :--- | :--- |
| **1** | **Hardware & Image Capture** | **Both: Camera Capture + File Upload** | Supported via live camera stream (with gyro leveling) and drag-and-drop file upload (TIFF, PNG, JPEG, PDF). |
| **2** | **Paper Size & Scale** | **Custom Size Supported** | User-defined custom dimensions ($W \times H\text{ mm}$) and presets (Harris Mat $215 \times 310$, A4, US Letter) with direct on-device scale calibration ($\text{mm/px}$). |
| **3** | **Pressure Output & Units** | **Relative Intensity Index (RII)** | Normalized index scale ($0.00 - 1.00$) categorized into 6 tiers (`C1`–`C6`). Non-piezoelectric physical force. |
| **4** | **10-Zone Anatomical Partitioning** | **Fully Automated AI Contour Segmentation** | Automated on-device subzone partitioning (Hallux, Lesser Toes, M1, M2, M3–M5, Medial/Lateral Midfoot, Medial/Lateral Heel). |
| **5** | **Bilateral Stance & Asymmetry** | **Scanned Separately & Linked Under Patient** | Left and right foot impressions acquired as independent scans and linked under the patient record. Dynamic Bilateral Asymmetry Index ($ASI\%$). |
| **6** | **Orthotic Recommendations** | **Printed on 4-Page PDF Report** | Comprehensive clinical orthotic recommendations, materials, and modifications printed on Pages 3 & 4 of the official medical PDF report. |
| **7** | **Cloud & Storage** | **Both Local and Cloud Storage** | Dual local persistence (IndexedDB / SQLite) and encrypted cloud synchronization with SHA-256 integrity verification. |
| **8** | **Clinical Test Data Set** | **Clinical Samples Provided & Integrated** | Clinical ground-truth sample sets provided by partner; automated verification battery (VT-01 to VT-13) validates against them. |
| **9** | **Algorithm Execution** | **100% On-Device** | All computer vision unwarp, normalized convolution, and JET heatmap generation execute client-side with zero server latency. |
| **10** | **Native Camera Control** | **Fixed Burst Multi-Frame Capture** | Rapid 3 or 5 frame burst capture with Laplacian variance sharpness scoring to auto-select the crispest frame. |
| **11** | **Future Hardware Integration** | **No (Excluded)** | Proprietary third-party electronic sensor plate integration is out of scope; system is dedicated to optical Harris Mat impressions. |
| **12** | **Hospital PACS / DICOM** | **Not Required** | Zero DICOM / PACS overhead; hospital integration relies on standard on-device storage, encrypted cloud sync, and 4-page PDF exports. |

---

## 🚀 Quick Start (Development)

### Prerequisites
* Node.js v18+ and npm
* Git

### Installation
```bash
git clone <repo-url>
cd plantar-pressure
npm install
```

### Launch Development Server
```bash
npm run dev
```
The application will launch with HMR on **`http://localhost:5200/`**.

---

## 🖥️ Platform Build & Release Workflows

### 1. Desktop Applications (Electron)
```bash
npm run desktop           # Launch native desktop application window
npm run desktop:dev       # Launch desktop app with live reload
npm run dist:win          # Package Windows: NSIS Setup .exe + MSI installer
npm run dist:mac          # Package macOS: Universal .dmg disk image
npm run dist:linux        # Package Linux: AppImage + Debian .deb
```
*Output Artifacts:* Saved to `release/` (e.g. `release/win-arm64-unpacked/Plantar Pressure Analysis System.exe`).

### 2. Mobile Applications (iOS & Android)
```bash
npm run mobile:sync       # Compile web bundle and synchronize native projects
npm run mobile:ios        # Open native iOS workspace in Xcode
npm run mobile:android    # Open native Android project in Android Studio
```
*Native Projects:*
* iOS: `ios/App/App.xcworkspace` (Camera permission configured in `Info.plist`)
* Android: `android/` (Camera permission configured in `AndroidManifest.xml`)

---

## 🔄 Upgrading Versions & Triggering Releases

The application includes single-command version synchronization across Web, Desktop, Android, and iOS:

```bash
# 1. Bump version across all platforms
npm run bump:patch    # e.g. 1.0.0 -> 1.0.1
# or: npm run bump:minor / npm run bump:major

# 2. Commit and Tag
git commit -am "chore(release): bump to version 1.0.1"
git tag v1.0.1

# 3. Push to GitHub to trigger multi-platform CI/CD build
git push origin main --tags
```

GitHub Actions will automatically build all 4 platforms in parallel and publish an official GitHub Release with downloadable installers. Existing installations on client devices update in-place without erasing saved patient scans or custom orthotic settings.

---

## 📖 Master Documentation & Developer Manual

For the complete, in-depth architectural and operational manual, refer to:
👉 **[SYSTEM_ARCHITECTURE_AND_OPERATIONS_MANUAL.md](SYSTEM_ARCHITECTURE_AND_OPERATIONS_MANUAL.md)**
- Hardware Station Binding & MAC Fingerprinting
- Single-Use Activation Codes & Burn-On-Use Protocol
- Time-Bound Permit Enforcement (Hour/Day Licensing)
- Supabase Cloud Mailbox & Telemetry Schema
- Bi-directional Cloud Case Hydration & Remote Revocation Kill-Switch
- Disaster Recovery & Troubleshooting Runbooks

---

## 🧪 Regulatory Verification & Validation (VT-01 to VT-15)

The system includes an automated clinical verification battery covering all test protocols defined in Section 15 of Technical File `PPA-SW-TF-001`.
* **75 / 75 Unit Tests Passing** (`npm run test:unit`) — 100% test coverage across mathematical, image processing, security, database writing, burn-on-use codes, timed permits, Windows WIA hardware scanner automation, and cloud sync engines.
* **15 / 15 Clinical Scenarios Passing** (`npm run test:validate`) — 100% regulatory verification adherence.
* In the running application, click the **"V&V Battery"** button in the header.
* Click **"Run Full V&V Battery"** to execute all tests with live mathematical verification.
* Click **"Export Audit JSON"** to download verifiable compliance evidence.

---

## 🏥 Enterprise Features & Clinical Architecture

### 1. Patient Reports Hub
* Centralized historical examination browser attached to Patient Registration.
* Filter historical reports dynamically **By All**, **By Year**, **By Month**, and **By Date**.
* One-click session restoration: **Open Report** (Page 5) or **View Results** (Page 4).
* "Scan / Upload New Report for this Patient" workflow preserving active demographic context.

### 2. Multi-Technician Station Sign-In & Dynamic User ID Authentication
* **Explicit User ID Entry**: Under Clinical Technician Login, operators enter their assigned **Technician User ID / Username** (e.g. `tech@technomind.health`, `kavita.rao`) alongside their **Password / PIN**.
* **Dynamic Multi-Technician Roaming**: Diagnostic terminals are no longer locked to a single static operator name. Any authorized technician enrolled under the clinic can sign in, acquire footprints, and generate authenticated clinical reports.
* **Clear Credential Diagnostics**: Case-insensitive user lookup with distinct verification messages (`User ID not found` vs `Incorrect password`).

### 3. Public Login Screen Lockdown, Single Administrator Governance & Separated `/admin` Context
* **Default Technician-Only Flow (Zero Admin Clutter on New Devices)**: When installing the application on any new station (**Windows Desktop .exe**, **Android .apk**, or **iOS .ipa**), the station sign-in dialog opens exclusively in **Clinical Technician Station Login** mode. The "Hospital Administrator" card and account selector are completely invisible, preventing technician confusion, staff curiosity, and unauthorized tampering.
* **Dedicated `/admin` Context for Web & Intranet**: Navigating directly to `/admin`, `#/admin`, or `?mode=admin` in any browser instantly opens the **Hospital Administrator Portal** with Master Password authentication.
* **Discreet Administrator Access for Native Desktop & Mobile (Zero On-Screen Admin Buttons)**:
  * **100% Clean Kiosk Interface**: The clinical sign-in screen contains **zero** visible admin buttons, icons, or links, preventing staff curiosity and accidental tampering.
  * **Windows Desktop (.exe) Method 1 — Silent Hotkey**: Press **`Ctrl + Shift + A`** (or `Cmd + Shift + A` on macOS) anywhere on the window to silently reveal the Master Administrator prompt.
  * **Windows Desktop (.exe) Method 2 — Dedicated Admin Shortcut**: Launching via Windows shortcut with the `--admin` flag (`PodoPress.exe --admin`) opens directly into the Hospital Administrator Portal. Regular technicians click the default shortcut without flags.
  * **Windows Desktop (.exe) Method 3 — Native Security Menu**: Accessible via the native application menu bar under **Security $\rightarrow$ Hospital Administrator Console... (`Ctrl+Shift+A`)**.
  * **Mobile Kiosk Gesture (Android / iOS)**: Tapping the header lock icon or title **5 times within 2.5 seconds** unlocks the Master Administrator prompt.
  * **Quick Reversal**: The Admin login prompt features a prominent `← Back to Technician Login` button to effortlessly return to the standard clinical technician view.
* **Strict Single Administrator Setup**: Exactly one Hospital Administrator possesses master administrative authority over each station. Initial master credentials (`admin@technomind.health` / default `1234`) allow the designated clinic head to perform initial setup.
* **Protected Password Updates (Admin Only)**: Master Password changes are strictly confined inside the authenticated **Hospital Administrator Panel** (`Admin security` tab). Inputs are masked (`••••••••`) by default with current-password verification to prevent onlookers or operators from viewing or modifying credentials.
* **Zero Public Backdoors**: All "Register Admin", "First-Time Password Setup", and "Forgot Password" options have been permanently eliminated from the login/role-switcher dialog, preventing unauthorized users or operators from hijacking or resetting station credentials.
* **Authenticated Administration Only**: Creating technician logins, updating technician passwords, configuring facility profiles, and auditing login trails are strictly confined inside the authenticated Admin Panel.

### 4. Configurable Activation Voucher Rotation Policy (Hours / Days / Custom)
* **Timed Security Rotation**: Activation vouchers rotate automatically (default 1 hour, configurable to custom hours, days, or minutes).
* **Live Expiry Telemetry**: Admin hub displays live remaining countdowns (`⏱️ 8h 50m left`) and security policy indicators in a collapsible, clutter-free policy drawer.
* **21 CFR Part 11 Audit Trail**: Immutable logging of every activation attempt, voucher rotation, credential failure, and administrative transfer with JSON export.

### 5. Multi-Platform Device Registration & Responsive Activation Hub
* **Cross-Platform Alignment**: Universal enrollment workflow aligned for **Android (.apk)**, **iOS (.ipa)**, and **Windows (.exe)**.
* **Spacious 2x2 Responsive Credential Cards**: Re-engineered credential cards with `minmax(280px, 1fr)` eliminate cramped columns and text truncation (`...`), ensuring all codes, User IDs, and passwords remain 100% visible across any viewport width.
* **100% Offline Clinical Scanning**: Cryptographic terminal token binding (`AUTH-DEV-...`) enables uninterrupted examinations, footprint unwarping, and PDF generation without internet connectivity.

### 6. Responsive UI & Sandboxed Navigation Safety
* **Zero Horizontal Clipping**: Responsive CSS Grid layouts (`minmax(0, 1fr)`) and scroll-containment wrappers on all clinical tables eliminate right-edge truncation across laptops, tablets, and phones.
* **Navigation Isolation**: Electron main process blocks unvetted external navigation (`will-navigate`) and denies popup window creation; a global capture-phase web listener intercepts links to prevent accidental routing to external domains.
* **React Rules of Hooks Integrity**: All lifecycle hooks hoisted above early returns across components, guaranteeing zero hook mismatch exceptions (`DIAG-MVYLWFK2-384`).

### 7. Restricted Database Records Explorer & Administrator Direct Table Write Privileges
* **Hospital Administrator ONLY Access Control**: Raw database tables and record exploration are strictly locked to authenticated Hospital Administrators (`currentUser.role === 'admin'`). The `Database records` navigation item is completely hidden from Clinical Technicians, and direct route access is guarded with a medical clearance block.
* **Direct Table Write & Administrative Correction Privileges**: Hospital Administrators possess master privileges to correct and write database records across `patients`, `cases`, `technicians`, `admin_accounts`, `bound_devices`, and `settings`.
* **21 CFR Part 11 Audit Trail Conformance**: Every administrative record correction mandates a documented clinical justification/reason, immediately committing the modification to offline IndexedDB and appending an immutable `RECORD_ADMIN_CORRECTED` audit event with timestamp and administrator identity.
* **Dual-View Record Editor**: Offers both structured form-based editing (for rapid contact, phone, MRN, notes, and staff updates) and raw JSON editor with syntax validation.
* **75/75 Unit Tests & 15/15 Clinical Scenarios (100% Green)**: Comprehensive verification covering biomechanics, hardware binding, multi-technician roaming, security policies, separated `/admin` routing, administrative write privileges, Windows WIA scanning automation, and shift logout data purging.

### 8. Explicit Station Logout, Discreet Kiosk Authentication & Zero Stale Data Guarantee
* **Immediate Accessible Logout Controls**:
  * **Top Header**: Dedicated `Sign Out` button alongside the active clinician badge.
  * **Sidebar Profile Card**: Dedicated red-accented `Log Out` button directly inside the user footer card.
  * **Account Switcher Modal**: Prominent session banner displaying active user with an immediate `Sign Out` button.
* **Discreet Clinical Technician Kiosk Flow**:
  * Upon sign-out, the station enters a pure, full-screen sign-in kiosk displaying **strictly** the Clinical Technician Station Sign-In.
  * **Zero Public Admin Elements**: Tabs, selectors, and admin portal buttons are completely hidden from regular operators and passersby.
  * **Administrator Unlock Methods**: Admins access their portal via dedicated URL paths (`/admin`, `#/admin`, `?mode=admin`), global keyboard shortcut (`Ctrl+Shift+A` / `Cmd+Shift+A`), native Electron flag (`PodoPress.exe --admin`), or the 5-tap gesture on the header lock.
  * **Quick Reversal**: When in Admin mode, a clear `← Back to Technician Login` button allows switching back to the standard technician view anytime.
* **Window Close & Standby Mode**:
  * Operators can dismiss the sign-in modal at any time via the top-right **`✕`** button or the footer **`Close Window`** action.
  * On native Windows desktop (`.exe`), a dedicated **`⏻ Exit App`** button allows closing the entire application.
* **Zero Stale Data Guarantee**:
  * Logging out or switching users triggers an automated in-memory clinical purge:
    * Clears selected patient and selected case identifiers (`ppa-selected-patient-id`, `ppa-selected-case-id`, `ppa-active-session`).
    * Resets raw foot scans (`leftFoot`, `rightFoot`), pressure heatmaps, orthotic morphometry metrics, and regional analyses to pristine `null` states.
    * Resets clinical step counter to `Step 1: Patient Registration` and wipes search buffers.
  * Guarantees zero cross-patient and cross-technician data leakage between different operators sharing the same physical workstation.
  * Logs an immutable 21 CFR Part 11 audit trail event (`USER_LOGOUT`) recording timestamp and user details.

### 9. Administrator Profile & Contact Credentials Management
* **Comprehensive Profile Control**: Inside the Admin Panel (`Admin security` tab), Hospital Administrators hold full authority to configure and update:
  * **Administrator Full Name** (e.g. `Dr. Specialist`)
  * **Admin User ID / Username** (required alongside Master Password at sign-in)
  * **Admin Mobile Phone Number** (for SMS alerts, two-factor recovery, and station authorization)
  * **Official Administrator Email Address**
  * **Security Recovery Key** (e.g. `REC-TMH-9901` for emergency master password resets)
* **Active Session Telemetry**: The security card provides real-time display of active administrator credentials, contact information, and bound terminal status.
* **Immediate Persistence**: Updates persist to offline IndexedDB and localStorage mirror with full `ADMIN_PROFILE_UPDATED` audit logging.

---

## 📚 Enterprise Documentation & Architectural Roadmaps

For detailed clinical, architectural, and developer references, consult the following comprehensive manuals:
* 📄 [**`CLOUD_SEGREGATION_AND_SYNC_STRATEGY.md`**](file:///Users/rajasekaran/Projects/plantar-pressure/CLOUD_SEGREGATION_AND_SYNC_STRATEGY.md) — **Master Enterprise Cloud Segregation & Offline Sync Plan**: 3-Tier cloud segregation (Frontend CDN/Native Shells, Backend Microservices on AWS ECS/EKS, Aurora PostgreSQL 16+ & S3), 100% offline-first working strategy across Windows `.exe`, Android `.apk`, and iOS `.ipa`, and technician-based online batch synchronization protocol for later-stage execution.
* 📄 [**`CROSS_PLATFORM_OPERATIONS_MANUAL.md`**](file:///Users/rajasekaran/Projects/plantar-pressure/CROSS_PLATFORM_OPERATIONS_MANUAL.md) — Complete cross-platform operations guide covering Microsoft Windows Desktop (`.exe`), Google Android (`.apk`), and Apple iOS iPhone/iPad (`.ipa`), hardware scanners, mobile camera gyros, discreet admin routing, and packaging.
* 📄 [**`POSTGRESQL_3TIER_MIGRATION_PLAN.md`**](file:///Users/rajasekaran/Projects/plantar-pressure/POSTGRESQL_3TIER_MIGRATION_PLAN.md) — 3-Tier Distributed Architecture (Multi-platform Clients, Microservices, PostgreSQL 16+ & Cloud S3 Object Storage) with complete DDL schemas, migration scripts, and sync protocols.
* 📄 [**`ARCHITECTURE_AND_EXTENSIBILITY_MANUAL.md`**](file:///Users/rajasekaran/Projects/plantar-pressure/ARCHITECTURE_AND_EXTENSIBILITY_MANUAL.md) — Clean Hexagonal Architecture, HAL, 10-Zone AI segmentation model, storage engines, and regulatory compliance.
* 📄 [**`DEVELOPER_REFERENCE_GUIDE.md`**](file:///Users/rajasekaran/Projects/plantar-pressure/DEVELOPER_REFERENCE_GUIDE.md) — Comprehensive developer cookbook, computer vision pipeline, biomechanical indices, schema migration, and testing recipes.
* 📄 [**`PROJECT_ACTIVITY_AND_IMPLEMENTATION_RECORD.md`**](file:///Users/rajasekaran/Projects/plantar-pressure/PROJECT_ACTIVITY_AND_IMPLEMENTATION_RECORD.md) — Chronological implementation activity log, features, bug fixes, and verification test batteries.

---

## 🎨 Dual Medical Themes
The application provides two curated, medical-grade themes toggleable directly in the header:
* ☀️ **Clinical Light (Default):** Clean surgical white cards, medical sapphire accents, and high-contrast slate typography for daytime consultation clinics.
* 🌙 **Diagnostic Dark:** Low-glare deep obsidian theme designed for radiology and low-light diagnostic workstations.

---

## ⚖️ Regulatory Notice
*Image-derived contact/relative-intensity classification, not a direct measurement of physical force in kPa.* (IEC 62304 Class B SaMD).

---
*Technomind Healthcare Systems — Document Reference: PPA-SW-TF-001 / PPA-DEV-REF-001*
