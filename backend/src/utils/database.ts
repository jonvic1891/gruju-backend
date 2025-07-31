import sql from 'mssql';
import DatabaseConnection from '../config/database';

export class DatabaseHelper {
  private static async getPool(): Promise<sql.ConnectionPool> {
    const dbConnection = DatabaseConnection.getInstance();
    return await dbConnection.connect();
  }

  // Execute a query with parameters
  public static async executeQuery<T = any>(
    query: string, 
    params?: { [key: string]: any }
  ): Promise<sql.IResult<T>> {
    const pool = await this.getPool();
    const request = pool.request();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
      });
    }
    
    return await request.query(query);
  }

  // Execute a stored procedure
  public static async executeProcedure<T = any>(
    procedureName: string,
    params?: { [key: string]: any }
  ): Promise<sql.IProcedureResult<T>> {
    const pool = await this.getPool();
    const request = pool.request();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
      });
    }
    
    return await request.execute(procedureName);
  }

  // Get a single record
  public static async getOne<T = any>(
    query: string,
    params?: { [key: string]: any }
  ): Promise<T | null> {
    const result = await this.executeQuery<T>(query, params);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  // Get multiple records
  public static async getMany<T = any>(
    query: string,
    params?: { [key: string]: any }
  ): Promise<T[]> {
    const result = await this.executeQuery<T>(query, params);
    return result.recordset;
  }

  // Insert and return the new record ID
  public static async insertAndGetId(
    query: string,
    params?: { [key: string]: any }
  ): Promise<number> {
    const insertQuery = `${query}; SELECT SCOPE_IDENTITY() as id;`;
    const result = await this.executeQuery(insertQuery, params);
    return result.recordset[0].id;
  }

  // Begin transaction
  public static async beginTransaction(): Promise<sql.Transaction> {
    const pool = await this.getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    return transaction;
  }
}

// Common query builders
export class QueryBuilder {
  public static buildSelectQuery(
    table: string,
    columns: string[] = ['*'],
    whereClause?: string,
    orderBy?: string,
    limit?: number
  ): string {
    let query = `SELECT ${columns.join(', ')} FROM ${table}`;
    
    if (whereClause) {
      query += ` WHERE ${whereClause}`;
    }
    
    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }
    
    if (limit) {
      query += ` OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY`;
    }
    
    return query;
  }

  public static buildInsertQuery(table: string, data: { [key: string]: any }): string {
    const columns = Object.keys(data);
    const values = columns.map(col => `@${col}`);
    
    return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')})`;
  }

  public static buildUpdateQuery(
    table: string,
    data: { [key: string]: any },
    whereClause: string
  ): string {
    const setClause = Object.keys(data)
      .map(col => `${col} = @${col}`)
      .join(', ');
    
    return `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  }

  public static buildDeleteQuery(table: string, whereClause: string): string {
    return `DELETE FROM ${table} WHERE ${whereClause}`;
  }
}