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
        console.log('Adding customer_refund_amount column to complaints table...');
        await client.query(`
            ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS customer_refund_amount NUMERIC DEFAULT 0;
        `);
        console.log('Migration successful.');
    } catch (err) {
        console.error('Migration failed', err);
    } finally {
        await client.end();
    }
}

run();
