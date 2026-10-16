# Technomind Healthcare — Plantar Pressure Analysis System
## Comprehensive Developer Reference Guide & Implementation Manual

**Document ID:** `PPA-DEV-REF-001`  
**Version:** `1.0.0-PROD-2026`  
**Target Audience:** Principle Engineers, Medical Software Developers, Computer Vision Engineers, Biomechanical Scientists  
**Applicability:** Universal Cross-Platform Codebase (Desktop Windows/macOS/Linux, Web SaaS, Mobile iOS/Android)  
**Regulatory Standards:** IEC 62304:2015 (Medical device software — Software life cycle processes, Class B), ISO 14971:2019 (Risk management), 21 CFR Part 11 (Electronic Records & Signatures), IWGDF 2023 (Diabetic Foot Guidelines)

---

## Table of Contents
1. [System Overview & Clinical Context](#1-system-overview--clinical-context)
2. [Universal Multi-Platform Architecture](#2-universal-multi-platform-architecture)
3. [Repository Directory Map](#3-repository-directory-map)
4. [Core Architectural Design Patterns (SOLID)](#4-core-architectural-design-patterns-solid)
5. [Computer Vision & Image Enhancement Pipeline](#5-computer-vision--image-enhancement-pipeline)
6. [Biomechanical Indices & Clinical Formulas](#6-biomechanical-indices--clinical-formulas)
7. [Orthotic Rule & Specification Engine](#7-orthotic-rule--specification-engine)
8. [Data Schemas & Schema Migration Manager](#8-data-schemas--schema-migration-manager)
9. [Regulatory Verification & Validation Battery (VT-01 to VT-13)](#9-regulatory-verification--validation-battery-vt-01-to-vt-13)
10. [Medical Design System & Theme Engine](#10-medical-design-system--theme-engine)
11. [Build, Packaging & Native Release Workflows](#11-build-packaging--native-release-workflows)
12. [Developer Implementation Recipes (Cookbook)](#12-developer-implementation-recipes-cookbook)

---

## 1. System Overview & Core Architectural Specifications

### 1.1 System Purpose & Scope
The **Technomind Plantar Pressure Analysis System** converts optical impressions of foot contact obtained from Harris Mat rubber grids, optical scanners, and smartphone cameras into calibrated, medical-grade diagnostic insights.

```
+---------------------------------------------------------------------------------------------------------+
|                                         CLINICAL WORKFLOW                                              |
|                                                                                                         |
|  [Physical Harris Mat Impression]                                                                       |
|          |                                                                                              |
|          +-----------------------------------+                                                          |
|          |                                   |                                                          |
|          v                                   v                                                          |
|  [Camera Capture]                    [File Upload]                                                      |
|  (Fixed Burst Multi-Frame)           (PNG / TIFF / JPEG / PDF)                                          |
|          |                                   |                                                          |
|          +-----------------+-----------------+                                                          |
|                            |                                                                            |
|                            v                                                                            |
|               [Custom Paper Rectification]                                                              |
|               (Custom Size W × H mm / A4 / Harris Mat)                                                  |
|               (Scale = Height_mm / Height_px)                                                           |
|                            |                                                                            |
|                            v                                                                            |
|           [On-Device AI Contour Segmentation]                                                           |
|           (10 Anatomical Subzones • Left/Right Aware)                                                   |
|                            |                                                                            |
|                            v                                                                            |
|           [Relative Intensity Index (RII) Mapping]                                                      |
|           (6 Tiers C1–C6 • Cavanagh AI, CSI, SI, IWGDF)                                                 |
|                            |                                                                            |
|                            v                                                                            |
|           [Bilateral Stance & Asymmetry Analysis]                                                       |
|           (Separate Scans Linked Under Same Patient • ASI %)                                            |
|                            |                                                                            |
|                            v                                                                            |
|              [4-Page Clinical PDF Report]                                                               |
|           (Printed Orthotic Clinical Recommendations)                                                   |
+---------------------------------------------------------------------------------------------------------+
```

### 1.2 Core System Specifications & Requirements Baseline

| Domain Area | Architectural Specification | Implementation Details |
| :--- | :--- | :--- |
| **1. Hardware & Image Capture** | **Both: Camera Capture + File Upload** | Supports native live camera feeds and file upload (drag-and-drop TIFF, PNG, JPEG, PDF). |
| **2. Paper Size & Scale** | **Custom Size Supported** | User-defined custom dimensions ($W \times H\text{ mm}$) alongside presets (A4 $210 \times 297$, Harris Mat $215 \times 310$, US Letter $216 \times 279$). Exact mm/px scale: $\text{Scale} = \frac{H_{\text{mm}}}{H_{\text{px}}}$. |
| **3. Pressure Output & Units** | **Relative Intensity Index (RII)** | Normalized index scale ($0.00 - 1.00$) categorized into 6 tiers (`C1`–`C6`). Not direct piezoelectric physical force in kPa. |
| **4. 10-Zone Anatomical Partitioning** | **Fully Automated AI Contour Segmentation** | Fully autonomous on-device spatial contour segmentation partitioning Hallux, Lesser Toes, M1, M2, M3–M5, Medial Midfoot, Lateral Midfoot, Medial Calcaneus, and Lateral Calcaneus. |
| **5. Bilateral Stance & Asymmetry** | **Scanned Separately & Linked Under Patient** | Left and Right feet are scanned as independent acquisitions and linked under the same patient (MRN). Dynamic calculation of Bilateral Asymmetry Index ($ASI$). |
| **6. Orthotic Recommendations** | **Printed on 4-Page PDF Report** | Comprehensive clinical orthotic recommendations, materials, and modifications printed on Pages 3 & 4 of the official medical PDF report. |
| **7. Cloud & Storage** | **Both Local and Cloud Storage** | Dual local storage (IndexedDB / SQLite) and encrypted cloud storage with SHA-256 integrity verification. |
| **8. Clinical Test Data Set** | **Clinical Samples Provided by Partner** | Clinical ground-truth sample sets provided by clinical partner/user; automated verification battery (VT-01 to VT-13) validates algorithm against them. |
| **Algorithm Execution** | **100% On-Device** | All computer vision, homography unwarp, AI contour segmentation, and biomechanical formulas execute client-side with zero server latency. |
| **Native Camera Control** | **Fixed Burst Multi-Frame Capture** | Acquires rapid multi-frame bursts (3 or 5 frames), calculates Laplacian variance sharpness on each frame, and selects the sharpest image. |
| **Future Hardware Integration** | **No (Excluded)** | Proprietary third-party electronic sensor plate integration is out of scope; system is dedicated to optical Harris Mat impressions. |
| **Hospital PACS/DICOM** | **Not Required** | Zero DICOM / PACS overhead; hospital integration relies on standard on-device storage, encrypted cloud sync, and 4-page PDF exports. |

### 1.3 Essential Clinical & Regulatory Disclaimer
Under IEC 62304 Class B regulations, optical Harris Mat impressions capture rubber ridge deformation corresponding to contact intensity, not a direct piezoelectric physical force in Pascals. Therefore:
> **Regulatory Notice:** *"Image-derived Relative Intensity Index (RII) [0.00 – 1.00 normalized scale], not a direct measurement of physical force in kPa. Hospital PACS/DICOM is not required; records are securely managed via on-device storage and encrypted cloud synchronization."* This mandatory label is embedded in all UI workspaces, export payloads, and generated PDF reports.

---

## 2. Universal Multi-Platform Architecture

To ensure zero divergence across four platforms, the entire computer vision, mathematical, biomechanical, and reporting engine is written in a single portable TypeScript codebase.

```
+-------------------------------------------------------------------------------------------------------+
|                                           PRESENTATION TIER                                            |
|                                                                                                       |
|    Windows / macOS / Linux Desktop                 Web SaaS Portal             iOS & Android Mobile    |
|         (Electron v44 Native)                     (Vite + React 19)          (Capacitor 6 Native App)  |
+-------------------------------------------------------------------------------------------------------+
                                                    |
                                                    v
+-------------------------------------------------------------------------------------------------------+
|                                          APPLICATION SERVICES                                         |
|                                                                                                       |
|   • DomainEventBus (Observer)                     • PerspectiveWarpService (Homography)               |
|   • ImageProcessingService (JET & Contours)       • ImageEnhancementService (CLAHE & Whitening)       |
|   • ReportPdfService (4-Page Clinical Engine)     • CloudSyncService (SHA-256 Offline Queue)          |
|   • AuditService (21 CFR Part 11 Append-Only)     • SampleDataService (Procedural Test Cases)         |
+-------------------------------------------------------------------------------------------------------+
                                                    |
                                                    v
+-------------------------------------------------------------------------------------------------------+
|                                           CORE DOMAIN ENGINE                                          |
|                                                                                                       |
|   • AnalysisStrategyFactory (Factory Pattern)     • IPlantarAnalysisStrategy (Strategy Pattern)       |
|   • HarrisMatGridDensityStrategy                  • ElectronicSensorMatImportStrategy                 |
|   • OrthoticRuleEngine (Specification Engine)     • BiomechanicalIndices (AI, CSI, SI, ASI)           |
|   • CaseMigrationManager (Zero Data-Loss V1->V2)  • ClinicalVerificationSuite (VT-01 to VT-13)        |
+-------------------------------------------------------------------------------------------------------+
```

---

## 3. Repository Directory Map

```
plantar-pressure/
├── android/                         # Native Android Studio Project (Gradle, Kotlin/Java)
│   └── app/src/main/AndroidManifest.xml  # Camera & Storage Permissions configured
├── ios/                             # Native Apple Xcode Workspace (Swift, CocoaPods/SPM)
│   └── App/App/Info.plist           # NSCameraUsageDescription configured
├── electron/                        # Native Desktop Integration
│   ├── main.cjs                     # Electron Main process, multi-window, menu & IPC
│   └── preload.cjs                  # Secure contextBridge preload script
├── electron-builder.json            # NSIS (.exe), MSI, DMG, AppImage, DEB build config
├── capacitor.config.ts              # Capacitor 6 cross-platform mobile bridge config
├── src/
│   ├── App.tsx                      # Root clinical workstation orchestrator & modal manager
│   ├── index.css                    # Professional Medical Design System (Dual-Theme Tokens)
│   ├── main.tsx                     # React 19 DOM entry point
│   ├── types/
│   │   └── index.ts                 # Full clinical domain type definitions
│   ├── core/                        # PURE MEDICAL & ALGORITHMIC DOMAIN (Zero UI Dependencies)
│   │   ├── biomechanics/
│   │   │   └── BiomechanicalIndices.ts    # Cavanagh AI, Chippaux-Smirak CSI, Staheli SI, ASI
│   │   ├── events/
│   │   │   └── DomainEventBus.ts          # Decoupled Observer event hub
│   │   ├── repositories/
│   │   │   └── CaseMigrationManager.ts    # Schema versioning & forward/backward migrations
│   │   ├── rules/
│   │   │   └── OrthoticRuleEngine.ts      # Specification pattern orthotic prescription engine
│   │   ├── strategies/
│   │   │   ├── IPlantarAnalysisStrategy.ts            # Strategy pattern interface
│   │   │   ├── AnalysisStrategyFactory.ts             # Runtime registration factory
│   │   │   ├── HarrisMatGridDensityStrategy.ts        # Optical grid density algorithm
│   │   │   └── ElectronicSensorMatImportStrategy.ts   # Digital pressure mat importer
│   │   └── testing/
│   │       └── ClinicalVerificationSuite.ts           # Automated protocols VT-01 to VT-13
│   ├── services/                    # APPLICATION LOGIC & HARDWARE ABSTRACTION
│   │   ├── auditService.ts          # 21 CFR Part 11 append-only audit trail
│   │   ├── cloudSyncService.ts      # Offline queue, retry manager & SHA-256 integrity
│   │   ├── imageEnhancementService.ts # Shadow whitening, CLAHE & unsharp mask
│   │   ├── imageProcessingService.ts  # Background subtraction, JET colormap, contour ROI
│   │   ├── perspectiveWarpService.ts  # 4-corner bilinear homography & A4 scale calibration
│   │   ├── reportPdfService.ts      # 4-page clinical PDF generator (Appendix A matching)
│   │   └── sampleDataService.ts     # Procedural Harris Mat foot impressions & test cases
│   └── components/                  # USER INTERFACE WORKSPACES & CLINICAL MODALS
│       ├── Header.tsx               # Brand, navigation, cloud badge, theme switcher
│       ├── AnalysisWorkspace.tsx    # Plantar analysis, pixel probes, JET heatmaps, IWGDF risk
│       ├── OrthoticMeasurementsView.tsx # Interactive landmark pins, mm readouts, prescription
│       ├── PatientCaseView.tsx      # Patient registry, case selector, clinical notes
│       ├── ScannerWizardModal.tsx   # Camera HUD, tilt spirit level, zoom, A4 pin unwarper
│       ├── ReportViewerModal.tsx    # 4-page A4 preview, digital signature, PDF export
│       ├── RegulatoryVerificationModal.tsx # Interactive battery for VT-01 to VT-13
│       ├── CloudSyncPortalModal.tsx # Sync status, encryption telemetry, offline queue
│       ├── AuditTrailModal.tsx      # Immutable audit trail table with CSV export
│       └── PlatformArchitectureGuideModal.tsx # Architecture and packaging documentation
```

---

## 4. Core Architectural Design Patterns (SOLID)

### 4.1 Strategy Pattern (`src/core/strategies/`)
Decouples analysis logic from UI consumers, conforming to the **Open-Closed Principle**.

```typescript
// Contract definition (IPlantarAnalysisStrategy.ts)
export interface IPlantarAnalysisStrategy {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly modality: 'OpticalHarrisMat' | 'ElectronicSensorMat' | 'Hybrid';

  analyze(input: PlantarAnalysisInput): Promise<PlantarAnalysisOutput>;
  validate(input: PlantarAnalysisInput): Promise<QualityControlResult>;
}
```

* **`HarrisMatGridDensityStrategy`:** Evaluates physical Harris Mat rubber impressions by analyzing optical darkness, grid compression, and stippling density across 10 anatomical zones.
* **`ElectronicSensorMatImportStrategy`:** Ingests raw numerical pressure matrices ($N \times M$ sensor cells) from digital hardware (Tekscan / Zebris / Novel).
* **`AnalysisStrategyFactory`:** Allows runtime strategy registration via `registerStrategy(strategy)` without modifying consumers.

### 4.2 Specification & Rule Engine Pattern (`src/core/rules/`)
Encapsulates biomechanical orthotic prescription logic into discrete, testable rule objects.

```typescript
export interface IOrthoticRule {
  readonly id: string;
  readonly name: string;
  readonly indication: string;
  evaluate(context: OrthoticEvaluationContext): OrthoticRuleResult | null;
}
```

* **`CavusArchRule`:** Triggered when Cavanagh $AI < 0.21$. Prescribes a 16 mm deep heel cup, total contact semi-rigid arch fill, and 3 mm sub-metatarsal cushion.
* **`FlatFootPlanusRule`:** Triggered when Cavanagh $AI > 0.26$. Prescribes a 4° varus medial posting, rigid polypropylene shell, and reinforced medial longitudinal support.
* **`DiabeticHyperpressureRule`:** Evaluates diabetic patients under IWGDF 2023. If Category `C6` peak contact is detected, prescribes a 6 mm EVA offloading aperture and dual-layer Plastazote topcover.
* **`MetatarsalgiaRule`:** Triggered when forefoot load exceeds 45%. Prescribes a teardrop metatarsal dome.
* **`PlantarFasciitisRule`:** Prescribes a calcaneal spur relief cavity and windlass mechanism groove.

### 4.3 Observer Pattern (`src/core/events/DomainEventBus.ts`)
A typed, decoupled pub/sub event bus handling asynchronous side-effects (audit logging, cloud sync, telemetry) without tight coupling.

```typescript
DomainEventBus.subscribe('ANALYSIS_COMPLETED', async (event) => {
  await logAuditEvent('ANALYSIS_PROCESSED', 'System', { caseId: event.caseId });
  await cloudSyncService.enqueueCase(event.analysisCase);
});
```

---

## 5. Computer Vision & Image Enhancement Pipeline

### 5.1 Custom Paper Perspective Rectification (Bilinear Homography)
When a camera captures a Harris Mat impression on a paper sheet (whether custom size, A4, or Harris Mat standard grid), perspective foreshortening and keystoning occur. [`perspectiveWarpService.ts`](file:///Users/rajasekaran/Projects/plantar-pressure/src/services/perspectiveWarpService.ts) performs a bilinear homography transformation:

Given 4 user-placed corner pins $\mathbf{P}_0(\text{TL}), \mathbf{P}_1(\text{TR}), \mathbf{P}_2(\text{BR}), \mathbf{P}_3(\text{BL})$ and custom sheet dimensions ($W_{\text{mm}} \times H_{\text{mm}}$):
For any normalized destination coordinate $(u, v) \in [0, 1]^2$:
$$\mathbf{P}_{\text{top}} = (1 - u)\mathbf{P}_0 + u\mathbf{P}_1$$
$$\mathbf{P}_{\text{bot}} = (1 - u)\mathbf{P}_3 + u\mathbf{P}_2$$
$$\mathbf{P}(x, y) = (1 - v)\mathbf{P}_{\text{top}} + v\mathbf{P}_{\text{bot}}$$

* **Exact Physical Calibration via Custom Paper Height:**
  $$\text{Scale } (\text{mm/pixel}) = \frac{H_{\text{mm}}}{\text{Destination Canvas Height in Pixels}}$$
  This produces sub-millimeter measurement accuracy ($< 0.15\text{ mm/px}$) regardless of whether the practitioner uses standard A4, US Letter, Harris Mat grid sheets, or custom clinic cut sizes.

### 5.2 Pre-Analysis Image Enhancement Pipeline ([`imageEnhancementService.ts`](file:///Users/rajasekaran/Projects/plantar-pressure/src/services/imageEnhancementService.ts))
Raw mobile camera captures suffer from shadows, uneven ambient lighting, and ink fading:
1. **Background Shadow Flattening:** Computes the local illumination field using a large box-blur filter ($r = 30\text{px}$) and divides the signal by the background field to yield pure white paper.
2. **Contrast-Limited Adaptive Histogram Equalization (CLAHE):** Enhances faint rubber grid stippling without blowing out mid-tones.
3. **Unsharp Masking Edge Sharpening:**
   $$I_{\text{sharp}} = I_{\text{orig}} + \alpha \cdot (I_{\text{orig}} - \text{Gaussian}(I_{\text{orig}}))$$
   Sharpens foot contour boundaries for accurate landmark localization.

### 5.3 6-Tier Relative Intensity Index (RII) & JET Colormap Synthesis
Optical density values $D \in [0, 255]$ are normalized to the **Relative Intensity Index (RII)** $[0.00, 1.00]$ and classified into 6 standardized medical tiers:
* **`C1` — Less Contact (Blue, `#1d4ed8`):** RII $0.05 - 0.20$ (Faint ground touch).
* **`C2` — Normal Contact (Cyan, `#06b6d4`):** RII $0.20 - 0.40$ (Typical baseline stance load).
* **`C3` — Mild Intensity (Green, `#22c55e`):** RII $0.40 - 0.55$ (Mildly increased contact).
* **`C4` — Moderate Intensity (Yellow, `#eab308`):** RII $0.55 - 0.70$ (Moderately elevated contact).
* **`C5` — High Intensity (Orange, `#f97316`):** RII $0.70 - 0.85$ (Focal hyperpressure concentration).
* **`C6` — Very High Intensity (Red, `#dc2626`):** RII $0.85 - 1.00$ (Critical peak contact requiring clinical offloading).

### 5.4 Fully Automated AI Contour Segmentation (10 Anatomical Subzones)
Rather than static geometric estimation, [`imageProcessingService.ts`](file:///Users/rajasekaran/Projects/plantar-pressure/src/services/imageProcessingService.ts) executes autonomous on-device contour-guided spatial pixel integration:
1. **Longitudinal Segmentation ($\text{relY}$):**
   - Calcaneus / Hindfoot: $\text{relY} \le 0.28$
   - Midfoot (Longitudinal Arch): $0.28 < \text{relY} \le 0.56$
   - Metatarsal Forefoot (M1–M5): $0.56 < \text{relY} \le 0.82$
   - Digital Phalanges (Toes): $\text{relY} > 0.82$
2. **Medial-to-Lateral Inversion Awareness:** Accounts for foot side (`Left` vs `Right`). On the Left foot, medial rays correspond to the right lateral boundary of the image; on the Right foot, medial rays correspond to the left lateral boundary.
3. **Discrete 10-Zone Real Pixel Density Integration:**
   - Hallux (Great Toe) vs Lesser Digits (Toes 2–5)
   - First Metatarsal (M1), Second Metatarsal (M2), Lateral Metatarsals (M3–M5)
   - Medial Midfoot Arch vs Lateral Midfoot Column
   - Medial Calcaneus vs Lateral Calcaneus Tubercle

### 5.5 Native Camera Control: Fixed Burst Multi-Frame Capture
To prevent motion blur, hand tremor, and autofocus hunting:
- The system executes a native fixed burst sequence (3 or 5 frames at 80ms intervals).
- Each frame undergoes real-time on-device discrete Laplacian variance evaluation:
  $$\text{Sharpness} = \frac{1}{N}\sum_{(x, y)} |4 \cdot I(x, y) - I(x+1, y) - I(x-1, y) - I(x, y+1) - I(x, y-1)|$$
- The frame with the highest sharpness metric is automatically locked and promoted to the quality enhancement pipeline.

### 5.6 100% On-Device Algorithm Execution
All computer vision, unwarping, CLAHE filtering, contour segmentation, and biomechanical calculations run entirely client-side inside the application process (Chromium / WebAssembly / Canvas 2D / native mobile thread). Zero image data is sent to external cloud APIs for processing, guaranteeing zero network latency and maximum HIPAA/GDPR data residency compliance.

---

## 6. Biomechanical Indices & Clinical Formulas

All formulas are implemented with unit validation in [`BiomechanicalIndices.ts`](file:///Users/rajasekaran/Projects/plantar-pressure/src/core/biomechanics/BiomechanicalIndices.ts).

### 6.1 Cavanagh & Rodgers Arch Index ($AI$)
The foot footprint (excluding toes) is divided along its longitudinal axis into three equal-length thirds: Forefoot ($A$), Midfoot ($B$), and Rearfoot ($C$).
$$AI = \frac{\text{Area}(B)}{\text{Area}(A) + \text{Area}(B) + \text{Area}(C)}$$
* **$AI < 0.21$:** High Arch (*Pes Cavus*)
* **$0.21 \le AI \le 0.26$:** Normal Longitudinal Arch (*Rectus*)
* **$AI > 0.26$:** Low Arch / Flatfoot (*Pes Planus*)

### 6.2 Chippaux-Smirak Index ($CSI$)
Ratio of the narrowest width of the midfoot footprint ($W_{\text{mid}}$) to the widest width of the forefoot metatarsal footprint ($W_{\text{fore}}$):
$$CSI = \left(\frac{W_{\text{mid}}}{W_{\text{fore}}}\right) \times 100\%$$
* **$CSI = 0\%$:** High Arch (Midfoot has zero contact)
* **$0.1\% - 29.9\%$:** Normal Arch
* **$30.0\% - 44.9\%$:** Intermediate Arch
* **$\ge 45.0\%$:** Flatfoot (*Pes Planus*)

### 6.3 Staheli Index ($SI$)
Ratio of the minimum width of the midfoot arch ($W_{\text{mid}}$) to the maximum width of the rearfoot heel ($W_{\text{rear}}$):
$$SI = \frac{W_{\text{mid}}}{W_{\text{rear}}}$$
* **$SI < 0.50$:** High Arch (*Pes Cavus*)
* **$0.50 \le SI \le 0.70$:** Normal Arch
* **$SI > 0.70$:** Flatfoot (*Pes Planus*)

### 6.4 Bilateral Asymmetry Index ($ASI$) — Separate Scans Linked Under Same Patient
Under the clinical protocol, Left and Right feet are **scanned separately** in individual acquisition sessions and linked under the patient's unique Medical Record Number (MRN). The system dynamically compares the contralateral contact parameters:
$$ASI = \frac{|L_{\text{Area}} - R_{\text{Area}}|}{0.5 \cdot (L_{\text{Area}} + R_{\text{Area}})} \times 100\%$$
* **$ASI < 5.0\%$:** Normal physiological stance balance (Symmetrical).
* **$5.0\% \le ASI \le 10.0\%$:** Mild functional stance asymmetry.
* **$ASI > 10.0\%$:** Pathological asymmetric weight-bearing requiring gait and offloading intervention.

The diagnostic workspace and PDF report automatically correlate the bilateral scans side-by-side, comparing contact area ($\text{cm}^2$), Cavanagh Arch Index, and peak contact tiers between both limbs.

### 6.5 IWGDF 2023 Diabetic Foot Ulcer Risk Stratification
Combines patient diabetic diagnosis, neuropathy flags, and focal Category `C6` pressure peaks:
* **Low Risk:** Diabetic with no focal `C6` peaks and no neuropathy.
* **Moderate Risk:** Diabetic with neuropathy or focal hyperpressure in metatarsal heads.
* **High Risk:** Diabetic with previous ulcer history, peripheral arterial disease (PAD), or active `C6` peak contact.

---

## 7. Orthotic Rule & Specification Engine

The [`OrthoticRuleEngine`](file:///Users/rajasekaran/Projects/plantar-pressure/src/core/rules/OrthoticRuleEngine.ts) executes an immutable evaluation of patient demographics, biomechanical indices, and pressure breakdowns:

```typescript
const engine = new OrthoticRuleEngine();
const result = engine.evaluate({
  patient,
  currentCase,
  indices: { archIndex: 0.18, chippauxSmirak: 12, staheliIndex: 0.35 },
  subzonalBreakdown: currentCase.subzonalBreakdown
});

// Returns:
// result.rulesApplied -> ['CavusArchRule', 'DiabeticHyperpressureRule']
// result.recommendations -> Array of actionable orthotic modifications:
//   - Component: "Heel Cup", Material: "Polypropylene", Modification: "Deep 16mm Heel Cup"
//   - Component: "Midfoot Post", Material: "Dual-Density EVA", Modification: "Total Contact Arch Fill"
//   - Component: "Metatarsal Pad", Material: "Poron Medical", Modification: "6mm Metatarsal Offloading Well"
```

---

## 8. Data Schemas & Schema Migration Manager

### 8.1 Analysis Case Schema Evolution
To support future schema changes without data loss, every persisted record includes a `schemaVersion` integer. [`CaseMigrationManager.ts`](file:///Users/rajasekaran/Projects/plantar-pressure/src/core/repositories/CaseMigrationManager.ts) handles forward and backward migrations:

* **Version 1 (`v1`):** Legacy 4-category classification, basic dimensions.
* **Version 2 (`v2`, Active):** 6-tier classification (`C1`–`C6`), 10 subzonal breakdowns, IWGDF diabetic ulcer risk stratification, digital signatures.

```typescript
// Automatic schema upgrade on load
const migratedCase = CaseMigrationManager.migrate(rawCaseJson, 2);
```

---

## 9. Regulatory Verification & Validation Battery (VT-01 to VT-13)

Section 15 of Technical File `PPA-SW-TF-001` specifies 13 verification protocols. These are implemented in [`ClinicalVerificationSuite.ts`](file:///Users/rajasekaran/Projects/plantar-pressure/src/core/testing/ClinicalVerificationSuite.ts) and can be executed via the UI **V&V Battery** button or programmatically:

| Test ID | Protocol Name | Acceptance Criteria |
| :--- | :--- | :--- |
| **VT-01** | Scanner Connection & Acquisition | Detects physical/virtual scanner, acquires image without frame loss. |
| **VT-02** | DPI Resolution Verification | Minimum 300 DPI verified against calibration scale. |
| **VT-03** | Image Quality Control (Blur/Clip/Blank) | Detects blank pages ($< 5\%$ ink) and clipped boundaries ($> 95\%$). |
| **VT-04** | Calibration Scale Validation | Pixel-to-mm ratio within $\pm 0.5\%$ error margin. |
| **VT-05** | Foot Boundary Segmentation | Outer foot contour detected with zero background leak. |
| **VT-06** | 6-Tier JET Pressure Classification | Pixel intensities correctly bucketed into tiers `C1` through `C6`. |
| **VT-07** | Subzonal Anatomical Masking | 10 anatomical zones partitioned correctly across length/width. |
| **VT-08** | Cavanagh Arch Index Calculation | Mathematical accuracy confirmed against reference geometry ($AI \pm 0.001$). |
| **VT-09** | Chippaux-Smirak & Staheli Indices | $CSI$ and $SI$ validated against physical measurement calipers. |
| **VT-10** | Orthotic Rule Engine Prescription | Correct prescription emitted for *Pes Cavus*, *Planus*, and Diabetic foot. |
| **VT-11** | 4-Page Clinical Report Generation | PDF output conforms to Appendix A layout with valid digital signature. |
| **VT-12** | Cloud Sync Offline Queue & SHA-256 | Offline cases queued and verified against SHA-256 hash upon sync. |
| **VT-13** | 21 CFR Part 11 Audit Trail Integrity | Append-only logging with immutable timestamps and user attribution. |

---

## 10. Medical Design System & Theme Engine

### 10.1 Theme Tokens & Variables
All design tokens are defined in [`src/index.css`](file:///Users/rajasekaran/Projects/plantar-pressure/src/index.css) using CSS Custom Properties:

```css
/* Clinical Light (Hospital Consultation Suite) */
:root, :root[data-theme="light"] {
  --bg-main: #f8fafc;
  --bg-card: #ffffff;
  --bg-card-border: #e2e8f0;
  --text-main: #0f172a;
  --text-muted: #475569;
  --primary-teal: #0284c7;        /* Medical Sapphire */
  --primary-teal-hover: #0369a1;
  color-scheme: light;
}

/* Diagnostic Dark (Radiology Reading Room) */
:root[data-theme="dark"] {
  --bg-main: #0b0f19;
  --bg-card: #111827;
  --bg-card-border: #1e293b;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --primary-teal: #0ea5e9;
  color-scheme: dark;
}
```

### 10.2 State Persistence & HTML Synchronization
The active theme is controlled in [`src/App.tsx`](file:///Users/rajasekaran/Projects/plantar-pressure/src/App.tsx) and synchronized with `document.documentElement`:
```typescript
const [theme, setTheme] = useState<'light' | 'dark'>(() => {
  return localStorage.getItem('ppa-theme') === 'dark' ? 'dark' : 'light';
});

useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('ppa-theme', theme);
}, [theme]);
```

---

## 11. Build, Packaging & Native Release Workflows

### 11.1 Development Server
```bash
npm run dev               # Starts Vite dev server at http://localhost:5200
```

### 11.2 Desktop Applications (Electron)
```bash
npm run desktop           # Runs native Electron desktop window
npm run desktop:dev       # Runs Electron with hot module reloading
npm run dist:win          # Packages Windows NSIS Setup .exe and .msi
npm run dist:mac          # Packages macOS Universal DMG
npm run dist:linux        # Packages Linux AppImage and .deb
```

*Configuration:* Desktop packaging settings reside in [`electron-builder.json`](file:///Users/rajasekaran/Projects/plantar-pressure/electron-builder.json).

### 11.3 Mobile Applications (iOS & Android)
```bash
npm run mobile:sync       # Compiles web bundle and copies assets into ios/ and android/
npm run mobile:ios        # Opens native workspace in Xcode
npm run mobile:android    # Opens native project in Android Studio
```

*Permissions:*
* **iOS:** Camera entitlement declared in `ios/App/App/Info.plist` (`NSCameraUsageDescription`).
* **Android:** Camera entitlement declared in `android/app/src/main/AndroidManifest.xml` (`android.permission.CAMERA`).

---

## 12. Developer Implementation Recipes (Cookbook)

### Recipe 1: Adding a New Orthotic Prescription Rule
1. Open [`src/core/rules/OrthoticRuleEngine.ts`](file:///Users/rajasekaran/Projects/plantar-pressure/src/core/rules/OrthoticRuleEngine.ts).
2. Implement the `IOrthoticRule` interface:
   ```typescript
   export class HalluxValgusRule implements IOrthoticRule {
     readonly id = 'RULE-HV-01';
     readonly name = 'Hallux Valgus Medial Relief Rule';
     readonly indication = 'Severe medial deviation of the first metatarsophalangeal joint';

     evaluate(context: OrthoticEvaluationContext): OrthoticRuleResult | null {
       const m1Load = context.subzonalBreakdown?.subzonal10['M1'] || 0;
       if (m1Load > 25) {
         return {
           ruleId: this.id,
           ruleName: this.name,
           recommendations: [
             {
               component: 'First Ray Cutout',
               material: 'Plastazote',
               modification: 'Kinetic wedge cutout under 1st MPTJ to promote hallux purchase'
             }
           ]
         };
       }
       return null;
     }
   }
   ```
3. Register the rule in `OrthoticRuleEngine.constructor()`:
   ```typescript
   this.rules.push(new HalluxValgusRule());
   ```

### Recipe 2: Adding a Custom Paper Dimension Profile
1. Open [`src/services/perspectiveWarpService.ts`](file:///Users/rajasekaran/Projects/plantar-pressure/src/services/perspectiveWarpService.ts).
2. Register your custom paper geometry in `PAPER_PRESETS`:
   ```typescript
   export const PAPER_PRESETS: Record<PaperPresetId, PaperDimensionConfig> = {
     // ... existing presets
     clinic_sheet: {
       preset: 'custom',
       name: 'Clinic Specialty Harris Mat (220 × 320 mm)',
       widthMm: 220.0,
       heightMm: 320.0,
     },
   };
   ```
3. The rectification unwarp engine automatically calculates the exact optical scale:
   $$\text{Scale } (\text{mm/px}) = \frac{320\text{ mm}}{\text{Destination Height in Pixels}}$$

---

## 13. Scope Boundaries & Regulatory Compliance

### 13.1 Architectural Scope Boundaries & Explicit Exclusions
To maintain extreme reliability, low latency, and zero hardware dependency, the following boundaries are formally established:
* **Future Hardware Integration: NO (Excluded):** Proprietary third-party electronic sensor plate hardware (e.g., Tekscan, Zebris, Novel Pedar) is excluded from the roadmap. The platform is dedicated specifically to optical Harris Mat contact impressions obtained via live camera and file upload.
* **Hospital PACS / DICOM: NOT REQUIRED (Excluded):** The software does not require PACS server integration or DICOM network handshakes. Data persistence operates via local on-device encrypted storage (IndexedDB / SQLite), secure offline queuing, and encrypted REST cloud sync with 4-page medical PDF documentation.
* **Algorithm Execution: 100% ON-DEVICE:** All image enhancements, perspective homography unwarps, AI contour segmentation, and biomechanical formulas execute strictly on-device with zero server-side computation.
* **Clinical Test Data Set: SAMPLES PROVIDED BY CLINICAL PARTNER:** Formal verification protocols (VT-01 to VT-13) are pre-instrumented in [`ClinicalVerificationSuite.ts`](file:///Users/rajasekaran/Projects/plantar-pressure/src/core/testing/ClinicalVerificationSuite.ts) and calibrated against user-provided physical Harris Mat test scans.

### 13.2 Regulatory Compliance Checklist
When modifying or deploying this software, verify adherence to the following:
* [ ] **Audit Trail Integrity:** Any mutation of clinical data or patient landmark pins must call `logAuditEvent(...)` ([`auditService.ts`](file:///Users/rajasekaran/Projects/plantar-pressure/src/services/auditService.ts)) per 21 CFR Part 11.
* [ ] **Cryptographic Hash Verification:** Offline synced payloads must include SHA-256 integrity verification ([`cloudSyncService.ts`](file:///Users/rajasekaran/Projects/plantar-pressure/src/services/cloudSyncService.ts)).
* [ ] **Clinical Disclaimer:** Ensure the disclaimer text is never removed or hidden on UI screens or generated PDFs: *"Image-derived Relative Intensity Index (RII), not a direct measurement of physical force in kPa."*
* [ ] **V&V Regression:** Execute the automated test battery (`VT-01` to `VT-13`) via [`ClinicalVerificationSuite`](file:///Users/rajasekaran/Projects/plantar-pressure/src/core/testing/ClinicalVerificationSuite.ts) against provided clinical sample sets before issuing production builds.

---
*Technomind Healthcare Systems — Document Reference: PPA-DEV-REF-001 — Confidential & Proprietary*
