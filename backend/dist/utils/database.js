"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryBuilder = exports.DatabaseHelper = void 0;
const mssql_1 = __importDefault(require("mssql"));
const database_1 = __importDefault(require("../config/database"));
class DatabaseHelper {
    static async getPool() {
        const dbConnection = database_1.default.getInstance();
        return await dbConnection.connect();
    }
    // Execute a query with parameters
    static async executeQuery(query, params) {
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
    static async executeProcedure(procedureName, params) {
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
    static async getOne(query, params) {
        const result = await this.executeQuery(query, params);
        return result.recordset.length > 0 ? result.recordset[0] : null;
    }
    // Get multiple records
    static async getMany(query, params) {
        const result = await this.executeQuery(query, params);
        return result.recordset;
    }
    // Insert and return the new record ID
    static async insertAndGetId(query, params) {
        const insertQuery = `${query}; SELECT SCOPE_IDENTITY() as id;`;
        const result = await this.executeQuery(insertQuery, params);
        return result.recordset[0].id;
    }
    // Begin transaction
    static async beginTransaction() {
        const pool = await this.getPool();
        const transaction = new mssql_1.default.Transaction(pool);
        await transaction.begin();
        return transaction;
    }
}
exports.DatabaseHelper = DatabaseHelper;
// Common query builders
class QueryBuilder {
    static buildSelectQuery(table, columns = ['*'], whereClause, orderBy, limit) {
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
    static buildInsertQuery(table, data) {
        const columns = Object.keys(data);
        const values = columns.map(col => `@${col}`);
        return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')})`;
    }
    static buildUpdateQuery(table, data, whereClause) {
        const setClause = Object.keys(data)
            .map(col => `${col} = @${col}`)
            .join(', ');
        return `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    }
    static buildDeleteQuery(table, whereClause) {
        return `DELETE FROM ${table} WHERE ${whereClause}`;
    }
}
exports.QueryBuilder = QueryBuilder;
