import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

const client = new Client({
    connectionString,
});

async function run() {
    try {
        await client.connect();
        console.log('Adding missing columns to complaints table...');
        await client.query(`
            ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS item_id UUID;
            ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS item_type TEXT;
        `);
        console.log('Migration successful.');
    } catch (err) {
        console.error('Migration failed', err);
    } finally {
        await client.end();
    }
}

run();
