// Strategy Pattern Interface for Plantar Pressure & Contact Analysis Algorithms (Open-Closed Principle)
import {
  QualityControlResult,
  ClinicalCategory,
  RegionalAnalysis,
  FootSide,
} from '../../types';

export interface PlantarAnalysisInput {
  sourceImage: HTMLImageElement;
  footSide: FootSide;
  dpi?: number;
  sensitivity?: number;
  smoothRadius?: number;
  options?: Record<string, any>;
}

export interface PlantarAnalysisOutput {
  processedDataUrl: string;
  qcResult: QualityControlResult;
  categoryDistribution: {
    category: ClinicalCategory;
    percentage: number;
    areaMm2: number;
  }[];
  regionalAnalysis: RegionalAnalysis;
  contourBounds: { minX: number; maxX: number; minY: number; maxY: number };
  algorithmStrategyId: string;
  algorithmVersion: string;
}

export interface IPlantarAnalysisStrategy {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly supportedModality: 'HarrisMatOptical' | 'ElectronicSensorMat' | 'ThermographyHybrid';

  execute(input: PlantarAnalysisInput): Promise<PlantarAnalysisOutput>;
}
