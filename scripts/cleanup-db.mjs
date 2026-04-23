import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
    console.error('❌ No connection string found in .env (DIRECT_URL or DATABASE_URL)');
    process.exit(1);
}

const client = new Client({
    connectionString,
});

async function runCleanup() {
    console.log('🚀 Starting Database Cleanup...');
    try {
        await client.connect();
        const sql = fs.readFileSync(path.join(process.cwd(), 'cleanup.sql'), 'utf8');
        
        console.log('⏳ Executing cleanup.sql...');
        await client.query(sql);
        
        console.log('✅ Database fully reset successfully!');
        console.log('   - All transactional and master data removed.');
        console.log('   - Catalog and People tables cleared.');
        console.log('   - System is now in a "Fresh Install" state.');
    } catch (err) {
        console.error('❌ Error executing cleanup:', err.message);
        if (err.detail) console.error('   Detail:', err.detail);
        if (err.hint) console.error('   Hint:', err.hint);
    } finally {
        await client.end();
    }
}

runCleanup();
