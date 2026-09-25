import type { ExecutionMetrics, PartitionMetrics, QueryAst } from './types.ts';

export class CosmosRuCalculator {
  public calculate(
    ast: QueryAst,
    partitionMetrics: PartitionMetrics,
    retrievedCount: number,
    outputDocs: any[]
  ): ExecutionMetrics {
    const outputJson = JSON.stringify(outputDocs);
    const outputSizeBytes = new TextEncoder().encode(outputJson).length;
    const outputSizeKb = Math.max(0.2, outputSizeBytes / 1024);

    let requestCharge = 0;
    let explanation = "";
    let indexHitRatio = 1.0;
    let indexLookupTimeMs = 0.35;
    let documentLoadTimeMs = 0.60;
    let queryEngineExecutionTimeMs = 1.20;
    let systemExecutionTimeMs = 2.40;

    const isAggregate = Boolean(ast.groupBy || ast.select.some(s => s.aggregate));

    if (partitionMetrics.isSinglePartition) {
      // Single Partition Query
      // Base query routing + index lookup + document serialization
      requestCharge = 2.2 + (outputSizeKb * 0.4) + (retrievedCount * 0.15);
      requestCharge = Math.round(requestCharge * 100) / 100;

      indexHitRatio = 1.0; // 100%
      indexLookupTimeMs = Number((0.30 + Math.random() * 0.1).toFixed(2));
      documentLoadTimeMs = Number((0.55 + Math.random() * 0.15).toFixed(2));
      queryEngineExecutionTimeMs = Number((1.10 + Math.random() * 0.2).toFixed(2));
      systemExecutionTimeMs = Number((indexLookupTimeMs + documentLoadTimeMs + queryEngineExecutionTimeMs + 0.4).toFixed(2));

      explanation = `Single-partition query routed directly to partition '${partitionMetrics.partitionKeyValue}'. Zero cross-partition fanout overhead. Predictable single-digit RU cost with sub-10ms execution.`;
    } else {
      // Cross-Partition (Fan-out) Query
      const partitions = partitionMetrics.totalPartitions;
      const baseFanout = partitions * 2.6; // Each partition charges base dispatch & seek
      const aggregationCost = isAggregate ? 3.5 : 1.2;
      const mergeOverhead = partitions * 0.4;

      requestCharge = baseFanout + aggregationCost + mergeOverhead + (outputSizeKb * 0.3);
      requestCharge = Math.round(requestCharge * 100) / 100;

      indexHitRatio = 0.85; // 85%
      indexLookupTimeMs = Number((2.40 + Math.random() * 0.6).toFixed(2));
      documentLoadTimeMs = Number((3.10 + Math.random() * 0.8).toFixed(2));
      queryEngineExecutionTimeMs = Number((6.80 + Math.random() * 1.5).toFixed(2));
      systemExecutionTimeMs = Number((indexLookupTimeMs + documentLoadTimeMs + queryEngineExecutionTimeMs + 2.5).toFixed(2));

      explanation = `Cross-partition fanout executed across all ${partitions} physical partitions because partition key was omitted from filter. Result sets required client/gateway collection, sorting, and aggregate merge, multiplying RU consumption by ~4x-5x.`;
    }

    return {
      requestCharge,
      retrievedDocumentCount: retrievedCount,
      outputDocumentCount: outputDocs.length,
      indexLookupTimeMs,
      documentLoadTimeMs,
      queryEngineExecutionTimeMs,
      systemExecutionTimeMs,
      indexHitRatio,
      outputDocumentSizeBytes: outputSizeBytes,
      partitionMetrics,
      explanation
    };
  }
}
