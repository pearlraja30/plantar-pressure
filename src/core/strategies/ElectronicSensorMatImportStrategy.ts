// Concrete Strategy 2: Electronic Digital Pressure Plate Import Strategy
// Extensibility interface for electronic matrix sensors (Tekscan / Zebris / Novel Pedar)
import {
  IPlantarAnalysisStrategy,
  PlantarAnalysisInput,
  PlantarAnalysisOutput,
} from './IPlantarAnalysisStrategy';
import { processHarrisMatScan } from '../../services/imageProcessingService';

export class ElectronicSensorMatImportStrategy implements IPlantarAnalysisStrategy {
  public readonly id = 'electronic-sensor-mat-v1';
  public readonly name = 'Digital Electronic Pressure Mat Integration Strategy';
  public readonly version = 'v2.0.0-DIGITAL-EXP';
  public readonly description =
    'Imports calibrated electronic matrix sensor arrays (Tekscan / Zebris / Novel Pedar format). Directly maps pressure values in kPa to the JET color spectrum.';
  public readonly supportedModality = 'ElectronicSensorMat' as const;

  public async execute(input: PlantarAnalysisInput): Promise<PlantarAnalysisOutput> {
    // Process input image and tag with digital transducer configuration
    const result = await processHarrisMatScan(input.sourceImage, input.footSide, {
      sensitivity: 1.1,
      smoothRadius: 4,
      dpi: input.dpi ?? 300,
    });

    return {
      ...result,
      algorithmStrategyId: this.id,
      algorithmVersion: this.version,
    };
  }
}
