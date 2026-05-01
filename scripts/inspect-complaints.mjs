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
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'complaints' 
            AND table_schema = 'public'
        `);
        console.log('Columns in complaints table:');
        console.table(res.rows);
    } catch (err) {
        console.error('Error inspecting table', err);
    } finally {
        await client.end();
    }
}

run();
