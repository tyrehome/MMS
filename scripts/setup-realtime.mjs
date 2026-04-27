import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ No connection string found in .env');
    process.exit(1);
}

const client = new Client({ connectionString });

const sql = `
-- 1. Enable Realtime publication for all operational tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Add tables to the publication (Safe add)
ALTER PUBLICATION supabase_realtime ADD TABLE tires, parts, sales, sale_items, inventory_lots, customers, accounts, appointments, suppliers, workers, tasks, vehicles, master_data, business_settings, audit_log;

-- 2. Enable REPLICA IDENTITY FULL for all tables
ALTER TABLE tires REPLICA IDENTITY FULL;
ALTER TABLE parts REPLICA IDENTITY FULL;
ALTER TABLE sales REPLICA IDENTITY FULL;
ALTER TABLE sale_items REPLICA IDENTITY FULL;
ALTER TABLE inventory_lots REPLICA IDENTITY FULL;
ALTER TABLE customers REPLICA IDENTITY FULL;
ALTER TABLE accounts REPLICA IDENTITY FULL;
ALTER TABLE appointments REPLICA IDENTITY FULL;
ALTER TABLE suppliers REPLICA IDENTITY FULL;
ALTER TABLE workers REPLICA IDENTITY FULL;
ALTER TABLE tasks REPLICA IDENTITY FULL;
ALTER TABLE vehicles REPLICA IDENTITY FULL;
ALTER TABLE master_data REPLICA IDENTITY FULL;
ALTER TABLE business_settings REPLICA IDENTITY FULL;
ALTER TABLE audit_log REPLICA IDENTITY FULL;
`;

async function run() {
    try {
        console.log('🚀 Connecting to Supabase...');
        await client.connect();
        console.log('⚡ Executing Real-time setup SQL...');
        await client.query(sql);
        console.log('✅ DATABASE UPDATED: Real-time is now active for all tables.');
    } catch (err) {
        if (err.message.includes('already exists')) {
             console.log('✅ Real-time was already enabled for some tables. System is ready.');
        } else {
            console.error('❌ Error executing SQL:', err.message);
        }
    } finally {
        await client.end();
    }
}

run();
