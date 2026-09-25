import type { CosmosDocument, ExecutionResult } from './types.ts';
import { CosmosSqlParser } from './parser.ts';
import { CosmosEvaluator } from './evaluator.ts';
import { CosmosPartitionManager } from './partitioning.ts';
import { CosmosRuCalculator } from './ru-calculator.ts';
import { SAMPLE_DOCUMENTS, PRESET_QUERIES } from './samples.ts';

export type * from './types.ts';
export * from './parser.ts';
export * from './evaluator.ts';
export * from './partitioning.ts';
export * from './ru-calculator.ts';
export * from './samples.ts';

export class NanoCosmosEngine {
  private documents: CosmosDocument[];
  private partitionManager: CosmosPartitionManager;
  private ruCalculator: CosmosRuCalculator;

  constructor(
    initialDocuments: CosmosDocument[] = SAMPLE_DOCUMENTS,
    partitionKey: string = "/customerType"
  ) {
    this.documents = [...initialDocuments];
    this.partitionManager = new CosmosPartitionManager(partitionKey);
    this.ruCalculator = new CosmosRuCalculator();
  }

  public setDocuments(docs: CosmosDocument[]): void {
    this.documents = [...docs];
  }

  public getDocuments(): CosmosDocument[] {
    return this.documents;
  }

  public setPartitionKey(key: string): void {
    this.partitionManager = new CosmosPartitionManager(key);
  }

  public query(sql: string): ExecutionResult {
    try {
      const parser = new CosmosSqlParser(sql);
      const ast = parser.parse();

      const partitionMetrics = this.partitionManager.analyzeQuery(ast, this.documents);
      const evaluator = new CosmosEvaluator(this.documents, ast.fromAlias);
      const { results, retrievedCount } = evaluator.execute(ast);

      const metrics = this.ruCalculator.calculate(
        ast,
        partitionMetrics,
        retrievedCount,
        results
      );

      return {
        documents: results,
        metrics
      };
    } catch (err: any) {
      return {
        documents: [],
        metrics: {
          requestCharge: 0,
          retrievedDocumentCount: 0,
          outputDocumentCount: 0,
          indexLookupTimeMs: 0,
          documentLoadTimeMs: 0,
          queryEngineExecutionTimeMs: 0,
          systemExecutionTimeMs: 0,
          indexHitRatio: 0,
          outputDocumentSizeBytes: 0,
          partitionMetrics: {
            totalPartitions: 3,
            queriedPartitions: 0,
            isSinglePartition: false,
            partitionKeyField: "/customerType",
            isFanout: false
          },
          explanation: "Query execution failed."
        },
        error: err.message || String(err)
      };
    }
  }
}
