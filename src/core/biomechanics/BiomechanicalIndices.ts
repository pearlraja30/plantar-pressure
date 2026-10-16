// Pure Biomechanical Calculation Engine (PPA-SW-TF-001 Section 8 & 9)
// Follows International Standards: Cavanagh-Rodgers, Chippaux-Smirak, Staheli & IWGDF 2023 Guidelines
import { DiabeticUlcerRisk, SubZonal10Breakdown } from '../../types';

export class BiomechanicalCalculator {
  /**
   * Cavanagh & Rodgers Arch Index (AI)
   * Ratio of contact area of the middle third of the footprint to the total area (excluding toes)
   */
  public static calculateCavanaghArchIndex(
    hindfootArea: number,
    midfootArea: number,
    forefootArea: number
  ): { index: number; classification: 'High Arch (Pes Cavus)' | 'Normal Arch' | 'Flat Foot (Pes Planus)' } {
    const totalMainFootArea = hindfootArea + midfootArea + forefootArea;
    const ai = totalMainFootArea > 0 ? Number((midfootArea / totalMainFootArea).toFixed(3)) : 0.22;

    let classification: 'High Arch (Pes Cavus)' | 'Normal Arch' | 'Flat Foot (Pes Planus)' = 'Normal Arch';
    if (ai < 0.21) {
      classification = 'High Arch (Pes Cavus)';
    } else if (ai > 0.26) {
      classification = 'Flat Foot (Pes Planus)';
    }

    return { index: ai, classification };
  }

  /**
   * Chippaux-Smirak Index (CSI)
   * Ratio of narrowest midfoot contact width to widest forefoot metatarsal width (%)
   */
  public static calculateChippauxSmirakIndex(midfootWidthMm: number, forefootWidthMm: number): number {
    if (forefootWidthMm <= 0) return 32.5;
    return Number(((midfootWidthMm / forefootWidthMm) * 100).toFixed(1));
  }

  /**
   * Staheli Arch Index (SI)
   * Ratio of narrowest midfoot width to widest rearfoot heel width
   */
  public static calculateStaheliIndex(midfootWidthMm: number, heelWidthMm: number): number {
    if (heelWidthMm <= 0) return 0.55;
    return Number((midfootWidthMm / heelWidthMm).toFixed(2));
  }

  /**
   * International Working Group on the Diabetic Foot (IWGDF 2023) Ulcer Risk Stratification
   * Evaluates focal hyperpressure category (C6) and clinical indication
   */
  public static evaluateDiabeticUlcerRisk(
    peakCategory: string,
    peakRegion: string,
    clinicalIndication: string
  ): DiabeticUlcerRisk {
    const isDiabetic =
      clinicalIndication.toLowerCase().includes('diabet') ||
      clinicalIndication.toLowerCase().includes('neuropath');

    const isFocalC6 = peakCategory === 'C6';

    let iwgdfRiskCategory: 0 | 1 | 2 | 3 = 0;
    let riskLabel = 'IWGDF Category 0: Very Low Risk';
    let offloadingDepthMm = 0;
    const recommendations: string[] = [];

    if (isDiabetic && isFocalC6) {
      iwgdfRiskCategory = 2;
      riskLabel = 'IWGDF Category 2: Moderate Ulceration Risk (Focal Hyperpressure)';
      offloadingDepthMm = 6.0;
      recommendations.push(
        `High localized contact pressure at ${peakRegion} exceeds safety threshold. Prescribe 6mm custom Poron/EVA offloading relief well.`
      );
      recommendations.push('Full-contact total rocker shoe or functional offloading orthosis recommended.');
      recommendations.push('Clinical podiatric review every 4 to 6 weeks.');
    } else if (isDiabetic) {
      iwgdfRiskCategory = 1;
      riskLabel = 'IWGDF Category 1: Low Risk (Diabetic Foot Monitoring)';
      offloadingDepthMm = 3.0;
      recommendations.push('Prescribe pressure-distributing custom insole with cushioning topcover (Plastazote/Poron).');
    } else if (isFocalC6) {
      riskLabel = 'Biomechanical Hyperpressure (Non-Diabetic Metatarsalgia / Heel Spur)';
      offloadingDepthMm = 4.0;
      recommendations.push(`Localized Category C6 peak at ${peakRegion}. Add 4mm offloading pad to redistribute propulsive load.`);
    } else {
      recommendations.push('Physiological contact distribution within normal biomechanical baseline.');
    }

    return {
      iwgdfRiskCategory,
      riskLabel,
      offloadingDepthMm,
      focalHyperpressureAlert: isFocalC6,
      recommendations,
    };
  }

  /**
   * Bilateral Load Asymmetry Index (ASI)
   * Evaluates percentage load asymmetry between left and right feet: (|L - R| / ((L + R)/2)) * 100%
   */
  public static calculateAsymmetryIndex(leftLoad: number, rightLoad: number): number {
    const mean = (leftLoad + rightLoad) / 2;
    if (mean <= 0) return 0;
    return Number(((Math.abs(leftLoad - rightLoad) / mean) * 100).toFixed(1));
  }
}
