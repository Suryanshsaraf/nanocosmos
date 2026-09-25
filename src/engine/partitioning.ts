import type { CosmosDocument, QueryAst, WhereCondition, PartitionMetrics } from './types.ts';

export class CosmosPartitionManager {
  private partitionKeyField: string; // e.g. "/customerType" or "/customerId"
  private simulatedPhysicalPartitions: number = 3;

  constructor(partitionKeyField: string = "/customerType") {
    this.partitionKeyField = partitionKeyField.startsWith('/') ? partitionKeyField.substring(1) : partitionKeyField;
  }

  public analyzeQuery(ast: QueryAst, documents: CosmosDocument[]): PartitionMetrics {
    const targetedValue = this.extractPartitionKeyValueFromWhere(ast.where, this.partitionKeyField);

    if (targetedValue !== undefined) {
      return {
        totalPartitions: this.simulatedPhysicalPartitions,
        queriedPartitions: 1,
        isSinglePartition: true,
        partitionKeyField: `/${this.partitionKeyField}`,
        partitionKeyValue: String(targetedValue),
        isFanout: false
      };
    }

    return {
      totalPartitions: this.simulatedPhysicalPartitions,
      queriedPartitions: this.simulatedPhysicalPartitions,
      isSinglePartition: false,
      partitionKeyField: `/${this.partitionKeyField}`,
      isFanout: true
    };
  }

  private extractPartitionKeyValueFromWhere(cond: WhereCondition | undefined, targetField: string): any {
    if (!cond) return undefined;

    if (cond.type === 'binary' && cond.field && cond.operator === '=') {
      const cleanField = cond.field.replace(/^c\./, '');
      if (cleanField === targetField) {
        return cond.value;
      }
    }

    if (cond.type === 'logical') {
      const leftVal = this.extractPartitionKeyValueFromWhere(cond.left, targetField);
      if (leftVal !== undefined) return leftVal;
      return this.extractPartitionKeyValueFromWhere(cond.right, targetField);
    }

    return undefined;
  }
}
