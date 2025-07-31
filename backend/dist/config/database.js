"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mssql_1 = __importDefault(require("mssql"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const config = {
    server: process.env.DB_SERVER || '',
    database: process.env.DB_NAME || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    port: parseInt(process.env.DB_PORT || '1433'),
    options: {
        encrypt: true, // For Azure SQL Database
        enableArithAbort: true,
        trustServerCertificate: false
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};
class DatabaseConnection {
    constructor() {
        this.pool = null;
    }
    static getInstance() {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }
    async connect() {
        try {
            if (!this.pool) {
                this.pool = new mssql_1.default.ConnectionPool(config);
                await this.pool.connect();
                console.log('Connected to Azure SQL Database');
            }
            return this.pool;
        }
        catch (error) {
            console.error('Database connection failed:', error);
            throw error;
        }
    }
    async close() {
        try {
            if (this.pool) {
                await this.pool.close();
                this.pool = null;
                console.log('Database connection closed');
            }
        }
        catch (error) {
            console.error('Error closing database connection:', error);
            throw error;
        }
    }
    getPool() {
        return this.pool;
    }
}
exports.default = DatabaseConnection;
