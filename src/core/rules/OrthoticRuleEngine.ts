// Specification & Rule Engine Pattern for Clinical Orthotic Prescriptions
import { AnalysisCase, Patient } from '../../types';

export interface IOrthoticRule {
  readonly id: string;
  readonly name: string;
  isApplicable(analysisCase: AnalysisCase, patient: Patient): boolean;
  generateRecommendation(analysisCase: AnalysisCase, patient: Patient): string;
}

export class CavusArchRule implements IOrthoticRule {
  public readonly id = 'rule-pes-cavus';
  public readonly name = 'Pes Cavus (High Arch) Offloading Rule';

  public isApplicable(analysisCase: AnalysisCase): boolean {
    return analysisCase.regionalAnalysis.cavanaghArchIndex < 0.21;
  }

  public generateRecommendation(analysisCase: AnalysisCase): string {
    return `High Arch (Arch Index ${analysisCase.regionalAnalysis.cavanaghArchIndex}): Prescribe semi-flexible total-contact EVA arch filler with a 16mm deep heel cup to maximize weight-bearing surface and offload rearfoot/forefoot stress concentrations.`;
  }
}

export class FlatFootPlanusRule implements IOrthoticRule {
  public readonly id = 'rule-pes-planus';
  public readonly name = 'Pes Planus (Flat Foot) Stabilization Rule';

  public isApplicable(analysisCase: AnalysisCase): boolean {
    return analysisCase.regionalAnalysis.cavanaghArchIndex > 0.26;
  }

  public generateRecommendation(analysisCase: AnalysisCase): string {
    return `Flat Foot / Pes Planus (Arch Index ${analysisCase.regionalAnalysis.cavanaghArchIndex}): Prescribe rigid 3mm polypropylene shell with medial longitudinal arch posting (4° rearfoot varus wedge) to limit calcaneal eversion and navicular drop.`;
  }
}

export class DiabeticHyperpressureRule implements IOrthoticRule {
  public readonly id = 'rule-diabetic-ulcer-prevention';
  public readonly name = 'Diabetic Ulcer Risk Offloading Rule (IWGDF 2023)';

  public isApplicable(analysisCase: AnalysisCase, patient: Patient): boolean {
    const isDiabetic =
      patient.clinicalNotes.toLowerCase().includes('diabet') ||
      analysisCase.indication.toLowerCase().includes('diabet');
    return isDiabetic && analysisCase.regionalAnalysis.peakContactCategory === 'C6';
  }

  public generateRecommendation(analysisCase: AnalysisCase): string {
    return `Diabetic Neuropathic Risk: Focal Category C6 peak contact at ${analysisCase.regionalAnalysis.peakRegion}. Fabricate custom multi-density insole with 6mm circular EVA/Poron offloading well beneath the lesion and a medical-grade Plastazote topcover for shear dissipation.`;
  }
}

export class MetatarsalgiaRule implements IOrthoticRule {
  public readonly id = 'rule-metatarsalgia';
  public readonly name = 'Forefoot Metatarsal Head Offloading Rule';

  public isApplicable(analysisCase: AnalysisCase): boolean {
    return (
      analysisCase.regionalAnalysis.forefootContactPct > 45 ||
      analysisCase.indication.toLowerCase().includes('metatarsal')
    );
  }

  public generateRecommendation(): string {
    return 'Forefoot Load Elevation: Incorporate a teardrop-shaped metatarsal pad positioned 5mm proximal to metatarsal heads 2–4 to splay the transverse arch and relieve intermetatarsal nerve impingement.';
  }
}

export class PlantarFasciitisRule implements IOrthoticRule {
  public readonly id = 'rule-plantar-fasciitis';
  public readonly name = 'Plantar Fasciitis Calcaneal Relief Rule';

  public isApplicable(analysisCase: AnalysisCase, patient: Patient): boolean {
    return (
      patient.clinicalNotes.toLowerCase().includes('fascii') ||
      analysisCase.indication.toLowerCase().includes('fascii')
    );
  }

  public generateRecommendation(): string {
    return 'Plantar Fasciitis Indication: Add a horseshoe-shaped calcaneal spur relief cushion in the heel cup combined with first-ray cut-out to engage the windlass mechanism during propulsive push-off.';
  }
}

/**
 * Orthotic Rule Engine (Evaluates registered specifications)
 */
export class OrthoticRuleEngine {
  private static instance: OrthoticRuleEngine;
  private rules: IOrthoticRule[] = [];

  private constructor() {
    this.rules = [
      new CavusArchRule(),
      new FlatFootPlanusRule(),
      new DiabeticHyperpressureRule(),
      new MetatarsalgiaRule(),
      new PlantarFasciitisRule(),
    ];
  }

  public static getInstance(): OrthoticRuleEngine {
    if (!OrthoticRuleEngine.instance) {
      OrthoticRuleEngine.instance = new OrthoticRuleEngine();
    }
    return OrthoticRuleEngine.instance;
  }

  public registerRule(rule: IOrthoticRule): void {
    this.rules.push(rule);
  }

  public evaluateRecommendations(analysisCase: AnalysisCase, patient: Patient): string[] {
    const recs: string[] = [];
    for (const rule of this.rules) {
      if (rule.isApplicable(analysisCase, patient)) {
        recs.push(rule.generateRecommendation(analysisCase, patient));
      }
    }

    if (recs.length === 0) {
      recs.push('Standard physiological foot mechanics: Prescribe comfort functional insole with dual-density EVA support.');
    }

    return recs;
  }
}

export const orthoticRuleEngine = OrthoticRuleEngine.getInstance();
