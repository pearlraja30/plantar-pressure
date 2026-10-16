// Concrete Strategy 1: Harris Mat Optical Grid Density Strategy (Default Reference)
import {
  IPlantarAnalysisStrategy,
  PlantarAnalysisInput,
  PlantarAnalysisOutput,
} from './IPlantarAnalysisStrategy';
import { processHarrisMatScan } from '../../services/imageProcessingService';

export class HarrisMatGridDensityStrategy implements IPlantarAnalysisStrategy {
  public readonly id = 'harris-mat-grid-v1';
  public readonly name = 'Harris Mat Optical Contact Density Algorithm';
  public readonly version = 'v1.2.0-MED-2026';
  public readonly description =
    'Ingests Harris Mat rubber inked impressions, removes paper background, measures optical ink darkness, and maps intensity to JET color spectrum.';
  public readonly supportedModality = 'HarrisMatOptical' as const;

  public async execute(input: PlantarAnalysisInput): Promise<PlantarAnalysisOutput> {
    const result = await processHarrisMatScan(input.sourceImage, input.footSide, {
      sensitivity: input.sensitivity ?? 1.0,
      smoothRadius: input.smoothRadius ?? 5,
      dpi: input.dpi ?? 300,
    });

    return {
      ...result,
      algorithmStrategyId: this.id,
      algorithmVersion: this.version,
    };
  }
}
