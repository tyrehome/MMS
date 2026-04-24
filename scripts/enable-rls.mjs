import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const client = new Client({ connectionString });

async function run() {
    try {
        await client.connect();
        console.log('Enabling RLS on all tables...');
        await client.query(`
            DO $$
            DECLARE
                t text;
            BEGIN
                FOR t IN 
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_type = 'BASE TABLE'
                LOOP
                    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
                END LOOP;
            END $$;
        `);
        console.log('RLS enabled.');
    } catch (err) {
        console.error('Error enabling RLS', err);
    } finally {
        await client.end();
    }
}

run();
