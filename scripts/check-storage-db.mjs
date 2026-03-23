import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

const client = new Client({ connectionString });

async function checkStorageSchema() {
    try {
        await client.connect();
        const res = await client.query("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'storage'");
        if (res.rows.length === 0) {
            console.error('CRITICAL: "storage" schema does not exist in this database!');
        } else {
            console.log('"storage" schema exists.');
            const tableRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets'");
            if (tableRes.rows.length === 0) {
                console.error('CRITICAL: "storage.buckets" table does not exist!');
            } else {
                console.log('"storage.buckets" table exists.');
                const bucketRes = await client.query("SELECT id, name, public FROM storage.buckets");
                console.log('Buckets_JSON: ' + JSON.stringify(bucketRes.rows));
            }
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

checkStorageSchema();
