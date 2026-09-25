import type { CosmosDocument, QueryAst, WhereCondition, SelectField } from './types.ts';

export class CosmosEvaluator {
  private documents: CosmosDocument[];
  private alias: string;

  constructor(documents: CosmosDocument[], alias: string = 'c') {
    this.documents = documents;
    this.alias = alias;
  }

  public execute(ast: QueryAst): { results: any[]; retrievedCount: number } {
    let filtered = this.documents;
    let retrievedCount = this.documents.length;

    // Apply WHERE filter
    if (ast.where) {
      filtered = this.documents.filter(doc => this.evaluateCondition(doc, ast.where!));
    }

    // Check GROUP BY
    if (ast.groupBy && ast.groupBy.length > 0) {
      const grouped = this.executeGroupBy(filtered, ast.groupBy, ast.select);
      return { results: grouped, retrievedCount };
    }

    // Apply Projections (SELECT)
    const projected = filtered.map(doc => this.projectDocument(doc, ast.select));
    return { results: projected, retrievedCount };
  }

  public getNestedValue(obj: any, path: string): any {
    // Strip leading alias like "c."
    let cleanPath = path;
    if (cleanPath.startsWith(`${this.alias}.`)) {
      cleanPath = cleanPath.substring(this.alias.length + 1);
    } else if (cleanPath === this.alias) {
      return obj;
    }

    // Parse array indices and dot notation: e.g. preferences.serviceInterests[0]
    const tokens = cleanPath.replace(/\[(\d+)\]/g, '.$1').split('.');
    let current = obj;

    for (const token of tokens) {
      if (current === undefined || current === null) return undefined;
      current = current[token];
    }
    return current;
  }

  private evaluateCondition(doc: CosmosDocument, cond: WhereCondition): boolean {
    if (cond.type === 'logical') {
      const leftRes = cond.left ? this.evaluateCondition(doc, cond.left) : true;
      const rightRes = cond.right ? this.evaluateCondition(doc, cond.right) : true;
      if (cond.op === 'AND') return leftRes && rightRes;
      if (cond.op === 'OR') return leftRes || rightRes;
    }

    if (cond.type === 'binary' && cond.field && cond.operator) {
      const actualVal = this.getNestedValue(doc, cond.field);
      const targetVal = cond.value;

      switch (cond.operator) {
        case '=':
          return actualVal === targetVal;
        case '!=':
          return actualVal !== targetVal;
        case '<':
          return actualVal < targetVal;
        case '<=':
          return actualVal <= targetVal;
        case '>':
          return actualVal > targetVal;
        case '>=':
          return actualVal >= targetVal;
        default:
          return false;
      }
    }

    return true;
  }

  private projectDocument(doc: CosmosDocument, selectFields: SelectField[]): any {
    if (selectFields.length === 1 && selectFields[0].isWildcard) {
      return doc;
    }

    const out: Record<string, any> = {};
    for (const field of selectFields) {
      if (field.isWildcard) {
        Object.assign(out, doc);
      } else if (field.path) {
        const val = this.getNestedValue(doc, field.path);
        const key = field.alias || field.path;
        out[key] = val;
      }
    }
    return out;
  }

  private executeGroupBy(docs: CosmosDocument[], groupByFields: string[], selectFields: SelectField[]): any[] {
    const groups = new Map<string, CosmosDocument[]>();

    for (const doc of docs) {
      const keyParts = groupByFields.map(field => String(this.getNestedValue(doc, field)));
      const groupKey = keyParts.join(':::');
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(doc);
    }

    const results: any[] = [];

    groups.forEach((groupDocs, _) => {
      const row: Record<string, any> = {};
      const sampleDoc = groupDocs[0];

      for (const field of selectFields) {
        if (field.aggregate) {
          const { type, path } = field.aggregate;
          const key = field.alias || type.toLowerCase();

          if (type === 'COUNT') {
            row[key] = groupDocs.length;
          } else if (type === 'SUM' || type === 'AVG') {
            const values = groupDocs
              .map(d => Number(this.getNestedValue(d, path)))
              .filter(v => !isNaN(v));
            const sum = values.reduce((a, b) => a + b, 0);
            row[key] = type === 'SUM' ? sum : (values.length > 0 ? Number((sum / values.length).toFixed(2)) : 0);
          } else if (type === 'MIN') {
            const values = groupDocs.map(d => this.getNestedValue(d, path));
            row[key] = Math.min(...values);
          } else if (type === 'MAX') {
            const values = groupDocs.map(d => this.getNestedValue(d, path));
            row[key] = Math.max(...values);
          }
        } else if (field.path) {
          const key = field.alias || field.path;
          row[key] = this.getNestedValue(sampleDoc, field.path);
        }
      }
      results.push(row);
    });

    return results;
  }
}
