import type { QueryAst, SelectField, WhereCondition, BinaryOperator, LogicalOperator, AggregateType } from './types.ts';

export class CosmosSqlParser {
  private query: string;

  constructor(query: string) {
    this.query = query.trim();
  }

  public parse(): QueryAst {
    const cleanQuery = this.stripComments(this.query);

    const selectMatch = cleanQuery.match(/SELECT\s+([\s\S]+?)\s+FROM\s+([a-zA-Z0-9_]+)/i);
    if (!selectMatch) {
      throw new Error("Invalid Cosmos SQL syntax: Missing SELECT ... FROM clause");
    }

    const selectRaw = selectMatch[1].trim();
    const fromAlias = selectMatch[2].trim();

    // Remaining string after FROM <alias>
    const fromIndex = selectMatch.index! + selectMatch[0].length;
    let remainder = cleanQuery.substring(fromIndex).trim();

    let whereClause = "";
    let groupByClause = "";
    let orderByClause = "";

    // Check ORDER BY
    const orderByIndex = remainder.search(/\bORDER\s+BY\b/i);
    if (orderByIndex !== -1) {
      orderByClause = remainder.substring(orderByIndex + 8).trim();
      remainder = remainder.substring(0, orderByIndex).trim();
    }

    // Check GROUP BY
    const groupByIndex = remainder.search(/\bGROUP\s+BY\b/i);
    if (groupByIndex !== -1) {
      groupByClause = remainder.substring(groupByIndex + 8).trim();
      remainder = remainder.substring(0, groupByIndex).trim();
    }

    // Check WHERE
    const whereIndex = remainder.search(/\bWHERE\b/i);
    if (whereIndex !== -1) {
      whereClause = remainder.substring(whereIndex + 5).trim();
    }

    const selectFields = this.parseSelect(selectRaw);
    const whereCondition = whereClause ? this.parseWhere(whereClause) : undefined;
    const groupBy = groupByClause ? groupByClause.split(',').map(s => s.trim()) : undefined;

    return {
      select: selectFields,
      fromAlias,
      where: whereCondition,
      groupBy
    };
  }

  private stripComments(sql: string): string {
    return sql
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();
  }

  private parseSelect(selectStr: string): SelectField[] {
    if (selectStr === '*') {
      return [{ raw: '*', isWildcard: true }];
    }

    // Split by comma outside parentheses
    const parts = this.splitByComma(selectStr);
    return parts.map(part => {
      const trimmed = part.trim();
      if (trimmed === '*') return { raw: '*', isWildcard: true };

      // Check alias (AS alias or space alias)
      let fieldStr = trimmed;
      let alias: string | undefined = undefined;

      const asMatch = trimmed.match(/^([\s\S]+?)\s+(?:AS\s+)?([a-zA-Z0-9_]+)$/i);
      if (asMatch && !trimmed.endsWith(')')) {
        fieldStr = asMatch[1].trim();
        alias = asMatch[2].trim();
      }

      // Check aggregate function
      const aggMatch = fieldStr.match(/^(COUNT|SUM|AVG|MIN|MAX)\(([\s\S]+?)\)$/i);
      if (aggMatch) {
        return {
          raw: trimmed,
          isWildcard: false,
          alias: alias || aggMatch[1].toLowerCase(),
          aggregate: {
            type: aggMatch[1].toUpperCase() as AggregateType,
            path: aggMatch[2].trim()
          }
        };
      }

      return {
        raw: trimmed,
        isWildcard: false,
        path: fieldStr,
        alias: alias || this.extractDefaultAlias(fieldStr)
      };
    });
  }

  private extractDefaultAlias(path: string): string {
    const clean = path.replace(/\[\d+\]/g, '');
    const segments = clean.split('.');
    return segments[segments.length - 1];
  }

  private splitByComma(str: string): string[] {
    const results: string[] = [];
    let current = "";
    let depth = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '(') depth++;
      else if (char === ')') depth--;
      else if (char === ',' && depth === 0) {
        results.push(current);
        current = "";
        continue;
      }
      current += char;
    }
    if (current.trim()) results.push(current);
    return results;
  }

  private parseWhere(whereStr: string): WhereCondition {
    // Simple recursive parsing for AND / OR expressions
    // Handles expressions like: c.customerType = "individual" AND c.preferences.serviceInterests[0] = "strategic consulting"
    const orParts = this.splitLogical(whereStr, 'OR');
    if (orParts.length > 1) {
      let current: WhereCondition = this.parseWhere(orParts[0]);
      for (let i = 1; i < orParts.length; i++) {
        current = {
          type: 'logical',
          op: 'OR',
          left: current,
          right: this.parseWhere(orParts[i])
        };
      }
      return current;
    }

    const andParts = this.splitLogical(whereStr, 'AND');
    if (andParts.length > 1) {
      let current: WhereCondition = this.parseWhere(andParts[0]);
      for (let i = 1; i < andParts.length; i++) {
        current = {
          type: 'logical',
          op: 'AND',
          left: current,
          right: this.parseWhere(andParts[i])
        };
      }
      return current;
    }

    // Binary comparison expression
    const binaryMatch = whereStr.match(/^([\s\S]+?)\s*(=|!=|<=|>=|<|>)\s*([\s\S]+)$/);
    if (!binaryMatch) {
      throw new Error(`Unable to parse WHERE condition: "${whereStr}"`);
    }

    const field = binaryMatch[1].trim();
    const operator = binaryMatch[2].trim() as BinaryOperator;
    const rawVal = binaryMatch[3].trim();
    const value = this.parseValue(rawVal);

    return {
      type: 'binary',
      field,
      operator,
      value
    };
  }

  private splitLogical(str: string, op: 'AND' | 'OR'): string[] {
    const results: string[] = [];
    let current = "";
    let inQuotes = false;
    let quoteChar = "";

    const regex = new RegExp(`^\\s+${op}\\s+`, 'i');

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if ((char === '"' || char === "'") && (i === 0 || str[i - 1] !== '\\')) {
        if (!inQuotes) { inQuotes = true; quoteChar = char; }
        else if (quoteChar === char) { inQuotes = false; }
      }

      if (!inQuotes) {
        const sub = str.substring(i);
        const match = sub.match(regex);
        if (match) {
          results.push(current.trim());
          current = "";
          i += match[0].length - 1;
          continue;
        }
      }
      current += char;
    }
    if (current.trim()) results.push(current.trim());
    return results;
  }

  private parseValue(raw: string): any {
    if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      return raw.substring(1, raw.length - 1);
    }
    if (raw.toLowerCase() === 'true') return true;
    if (raw.toLowerCase() === 'false') return false;
    if (raw.toLowerCase() === 'null') return null;
    const num = Number(raw);
    if (!isNaN(num)) return num;
    return raw;
  }
}
