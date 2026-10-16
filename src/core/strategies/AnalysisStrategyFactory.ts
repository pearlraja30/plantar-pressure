// Factory Pattern for Plantar Analysis Strategies (Open-Closed Principle)
import { IPlantarAnalysisStrategy } from './IPlantarAnalysisStrategy';
import { HarrisMatGridDensityStrategy } from './HarrisMatGridDensityStrategy';
import { ElectronicSensorMatImportStrategy } from './ElectronicSensorMatImportStrategy';

export class AnalysisStrategyFactory {
  private static instance: AnalysisStrategyFactory;
  private strategies: Map<string, IPlantarAnalysisStrategy> = new Map();
  private defaultStrategyId: string;

  private constructor() {
    // Register standard out-of-the-box strategies
    const defaultStrategy = new HarrisMatGridDensityStrategy();
    const digitalStrategy = new ElectronicSensorMatImportStrategy();

    this.registerStrategy(defaultStrategy);
    this.registerStrategy(digitalStrategy);
    this.defaultStrategyId = defaultStrategy.id;
  }

  public static getInstance(): AnalysisStrategyFactory {
    if (!AnalysisStrategyFactory.instance) {
      AnalysisStrategyFactory.instance = new AnalysisStrategyFactory();
    }
    return AnalysisStrategyFactory.instance;
  }

  public registerStrategy(strategy: IPlantarAnalysisStrategy): void {
    this.strategies.set(strategy.id, strategy);
  }

  public getStrategy(id?: string): IPlantarAnalysisStrategy {
    const strategyId = id || this.defaultStrategyId;
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      console.warn(`Strategy '${strategyId}' not found. Falling back to default.`);
      return this.strategies.get(this.defaultStrategyId)!;
    }
    return strategy;
  }

  public getAllStrategies(): IPlantarAnalysisStrategy[] {
    return Array.from(this.strategies.values());
  }

  public setDefaultStrategy(id: string): void {
    if (this.strategies.has(id)) {
      this.defaultStrategyId = id;
    }
  }
}

export const strategyFactory = AnalysisStrategyFactory.getInstance();
