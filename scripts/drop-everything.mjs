import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const client = new Client({ connectionString });

async function run() {
    try {
        await client.connect();
        console.log('Dropping all tables and views in public schema...');
        
        const res = await client.query(`
            SELECT tablename FROM pg_tables WHERE schemaname = 'public';
        `);
        for (const row of res.rows) {
            await client.query(`DROP TABLE IF EXISTS public."${row.tablename}" CASCADE`);
        }

        const viewsRes = await client.query(`
            SELECT viewname FROM pg_views WHERE schemaname = 'public';
        `);
        for (const row of viewsRes.rows) {
            await client.query(`DROP VIEW IF EXISTS public."${row.viewname}" CASCADE`);
        }

        console.log('Dropped all tables and views.');
    } catch(e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
