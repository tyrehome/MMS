import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const client = new Client({ connectionString });

async function check() {
    try {
        await client.connect();
        console.log('Checking Supabase Realtime Publication...');
        const res = await client.query(`
            SELECT schemaname, tablename 
            FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime';
        `);
        console.log('Tables in supabase_realtime publication:');
        console.log(res.rows.map(r => r.tablename).join(', '));

        const rlsRes = await client.query(`
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public';
        `);
        console.log('\nRLS Status:');
        console.table(rlsRes.rows);
        
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
