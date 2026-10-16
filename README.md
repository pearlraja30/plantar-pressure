# Technomind Healthcare — Plantar Pressure Analysis System

Medical-grade, platform-agnostic Plantar Pressure Analysis & Orthotic Prescription System based on Technical File `PPA-SW-TF-001`. Designed for high-precision diagnostic deployment across native **Desktop (Windows, macOS, Linux)**, **Mobile (iOS, Android)**, and **Cloud Web SaaS**.

---

## 📚 Essential Engineering Manuals

For comprehensive architecture and implementation details, refer to:
* 📜 [**PROJECT ACTIVITY & IMPLEMENTATION RECORD (`PROJECT_ACTIVITY_AND_IMPLEMENTATION_RECORD.md`)**](./PROJECT_ACTIVITY_AND_IMPLEMENTATION_RECORD.md) — Complete chronological audit log of all project activities, decisions, algorithm corrections, packaging steps, and CI/CD pipelines.
* 📖 [**DEVELOPER REFERENCE GUIDE (`DEVELOPER_REFERENCE_GUIDE.md`)**](./DEVELOPER_REFERENCE_GUIDE.md) — The complete, end-to-end technical guide covering codebase map, computer vision algorithms, biomechanical formulas, design patterns, testing batteries, and extension recipes.
* 📐 [**ARCHITECTURE & EXTENSIBILITY MANUAL (`ARCHITECTURE_AND_EXTENSIBILITY_MANUAL.md`)**](./ARCHITECTURE_AND_EXTENSIBILITY_MANUAL.md) — Detailed specifications for Clean Architecture, SOLID patterns, schema migrations, and IWGDF 2023 diabetic ulcer rules.


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

## 🧪 Regulatory Verification & Validation (VT-01 to VT-13)

The system includes an automated clinical verification battery covering all 13 test protocols defined in Section 15 of Technical File `PPA-SW-TF-001`.
* In the running application, click the **"V&V Battery"** button in the header.
* Click **"Run Full V&V Battery"** to execute all tests with live mathematical verification.
* Click **"Export Audit JSON"** to download the verifiable compliance evidence.

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
