const { Pool } = require('pg');
const fs = require('fs');
const { exec } = require('child_process');

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://u4a6su3t5n0fn6:p5f4a04c5bab918014522e2eeb051dfb5c13f62872bf11e829c1ef3168d21c637@cfcojm7sp9tfip.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com:5432/d9qg97gb6fqhoe';

async function createDatabaseBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFileName = `database-backup-${timestamp}.sql`;
    
    console.log('🗄️ Creating database backup...');
    console.log(`📁 Backup file: ${backupFileName}`);
    
    try {
        // Use pg_dump to create a complete database backup
        const pgDumpCommand = `pg_dump "${DATABASE_URL}" > ${backupFileName}`;
        
        await new Promise((resolve, reject) => {
            exec(pgDumpCommand, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ pg_dump failed:', error);
                    reject(error);
                } else {
                    console.log('✅ Database backup completed');
                    if (stderr) {
                        console.log('⚠️ Warnings:', stderr);
                    }
                    resolve(stdout);
                }
            });
        });
        
        // Check if backup file was created and get its size
        if (fs.existsSync(backupFileName)) {
            const stats = fs.statSync(backupFileName);
            const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
            console.log(`📊 Backup file size: ${fileSizeInMB} MB`);
            
            // Create a metadata file with backup info
            const metadataFileName = `database-backup-${timestamp}.json`;
            const metadata = {
                timestamp: new Date().toISOString(),
                filename: backupFileName,
                size_mb: fileSizeInMB,
                database_url: DATABASE_URL.replace(/:[^:]*@/, ':****@'), // Hide password
                backup_type: 'full_database_dump',
                description: 'Complete database backup including schema and data'
            };
            
            fs.writeFileSync(metadataFileName, JSON.stringify(metadata, null, 2));
            console.log(`📋 Metadata saved: ${metadataFileName}`);
            
            return {
                success: true,
                backup_file: backupFileName,
                metadata_file: metadataFileName,
                size_mb: fileSizeInMB
            };
        } else {
            throw new Error('Backup file was not created');
        }
        
    } catch (error) {
        console.error('❌ Database backup failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Also create a data-only backup for key tables
async function createDataBackup() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    const client = await pool.connect();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    
    try {
        console.log('📊 Creating data-only backup...');
        
        const backupData = {
            timestamp: new Date().toISOString(),
            backup_type: 'critical_data',
            tables: {}
        };
        
        // Key tables to backup
        const criticalTables = [
            'users',
            'children', 
            'activities',
            'activity_invitations',
            'pending_activity_invitations',
            'connections',
            'connection_requests'
        ];
        
        for (const table of criticalTables) {
            try {
                console.log(`📋 Backing up table: ${table}`);
                const result = await client.query(`SELECT * FROM ${table} ORDER BY id`);
                backupData.tables[table] = {
                    row_count: result.rows.length,
                    data: result.rows
                };
                console.log(`✅ ${table}: ${result.rows.length} rows`);
            } catch (error) {
                console.log(`⚠️ Could not backup table ${table}: ${error.message}`);
                backupData.tables[table] = {
                    error: error.message
                };
            }
        }
        
        const dataBackupFileName = `data-backup-${timestamp}.json`;
        fs.writeFileSync(dataBackupFileName, JSON.stringify(backupData, null, 2));
        
        const fileSizeInMB = (fs.statSync(dataBackupFileName).size / (1024 * 1024)).toFixed(2);
        console.log(`✅ Data backup completed: ${dataBackupFileName} (${fileSizeInMB} MB)`);
        
        return {
            success: true,
            data_backup_file: dataBackupFileName,
            size_mb: fileSizeInMB
        };
        
    } catch (error) {
        console.error('❌ Data backup failed:', error);
        return {
            success: false,
            error: error.message
        };
    } finally {
        client.release();
        await pool.end();
    }
}

async function main() {
    console.log('🚀 Starting comprehensive backup process...');
    
    const dbBackup = await createDatabaseBackup();
    const dataBackup = await createDataBackup();
    
    console.log('\n📊 Backup Summary:');
    console.log('==================');
    
    if (dbBackup.success) {
        console.log(`✅ Database dump: ${dbBackup.backup_file} (${dbBackup.size_mb} MB)`);
        console.log(`📋 Metadata: ${dbBackup.metadata_file}`);
    } else {
        console.log(`❌ Database dump failed: ${dbBackup.error}`);
    }
    
    if (dataBackup.success) {
        console.log(`✅ Data backup: ${dataBackup.data_backup_file} (${dataBackup.size_mb} MB)`);
    } else {
        console.log(`❌ Data backup failed: ${dataBackup.error}`);
    }
    
    console.log('\n🔧 To restore from backup:');
    console.log('1. Database: psql "$DATABASE_URL" < backup-file.sql');
    console.log('2. Frontend: tar -xzf frontend-backup.tar.gz');
    console.log('3. Backend: cp backend-backup.js postgres-backend.js');
}

main().catch(console.error);