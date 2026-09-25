export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue; }
export interface JsonArray extends Array<JsonValue> {}

export interface CosmosDocument extends JsonObject {
  id: string;
  [key: string]: any;
}

export type AggregateType = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';

export interface SelectField {
  raw: string;
  isWildcard: boolean;
  path?: string;
  alias?: string;
  aggregate?: {
    type: AggregateType;
    path: string; // e.g. "1" for COUNT(1) or "c.relationshipData.engagementScore"
  };
}

export type BinaryOperator = '=' | '!=' | '<' | '<=' | '>' | '>=';
export type LogicalOperator = 'AND' | 'OR';

export interface WhereCondition {
  type: 'binary' | 'logical' | 'not';
  field?: string; // e.g. "c.id", "c.customerType", "c.preferences.serviceInterests[0]"
  operator?: BinaryOperator;
  value?: any;
  left?: WhereCondition;
  right?: WhereCondition;
  op?: LogicalOperator;
}

export interface QueryAst {
  select: SelectField[];
  fromAlias: string;
  where?: WhereCondition;
  groupBy?: string[];
  orderBy?: { path: string; direction: 'ASC' | 'DESC' }[];
}

export interface PartitionMetrics {
  totalPartitions: number;
  queriedPartitions: number;
  isSinglePartition: boolean;
  partitionKeyField: string;
  partitionKeyValue?: string;
  isFanout: boolean;
}

export interface ExecutionMetrics {
  requestCharge: number;
  retrievedDocumentCount: number;
  outputDocumentCount: number;
  indexLookupTimeMs: number;
  documentLoadTimeMs: number;
  queryEngineExecutionTimeMs: number;
  systemExecutionTimeMs: number;
  indexHitRatio: number;
  outputDocumentSizeBytes: number;
  partitionMetrics: PartitionMetrics;
  explanation: string;
}

export interface ExecutionResult {
  documents: any[];
  metrics: ExecutionMetrics;
  error?: string;
}
