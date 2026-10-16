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
*Technomind Healthcare Systems — Document Reference: PPA-ARCH-MAN-001 — Confidential & Proprietary*
