import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

const client = new Client({ connectionString });

async function createTiresBucket() {
    try {
        await client.connect();
        
        // 1. Insert bucket
        console.log('Inserting "tires" bucket...');
        await client.query(`
            INSERT INTO storage.buckets (id, name, public)
            VALUES ('tires', 'tires', true)
            ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public
        `);
        console.log('Success.');

        // 2. Check buckets again
        const bucketRes = await client.query("SELECT id, name, public FROM storage.buckets");
        console.log('Current Buckets:', JSON.stringify(bucketRes.rows));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

createTiresBucket();
