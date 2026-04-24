import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const client = new Client({ connectionString });

async function check() {
    try {
        await client.connect();
        const res = await client.query(`
            SELECT tablename, policyname, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename IN ('business_settings', 'profiles');
        `);
        console.log(JSON.stringify(res.rows, null, 2));

        const rlsRes = await client.query(`
            SELECT tablename, rowsecurity 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename IN ('business_settings', 'profiles');
        `);
        console.log(JSON.stringify(rlsRes.rows, null, 2));
        
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
