import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
    console.error('No connection string found');
    process.exit(1);
}

const client = new Client({
    connectionString,
});

async function run() {
    try {
        await client.connect();
        const sql = fs.readFileSync(path.join(process.cwd(), 'schema.sql'), 'utf8');
        console.log('Running schema.sql...');
        await client.query(sql);
        console.log('Schema executed successfully.');
    } catch (err) {
        console.error('Error executing schema', err);
    } finally {
        await client.end();
    }
}

run();
