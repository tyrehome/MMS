import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
    console.error('❌ No connection string found in .env (DIRECT_URL or DATABASE_URL)');
    process.exit(1);
}

const client = new Client({ connectionString });

async function setup() {
    console.log('🚀 Starting Supabase Infrastructure Setup...');
    try {
        await client.connect();

        // 1. Setup Storage Buckets
        console.log('📦 Setting up storage buckets (tires, logos)...');
        await client.query(`
            INSERT INTO storage.buckets (id, name, public)
            VALUES 
                ('tires', 'tires', true),
                ('logos', 'logos', true)
            ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;
        `);

        // 2. Setup Storage RLS Policies
        console.log('🔐 Applying Storage RLS policies...');
        const storagePolicies = [
            // Tires policies
            `DROP POLICY IF EXISTS "Public Access" ON storage.objects`,
            `CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'tires')`,
            `DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects`,
            `CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tires' AND auth.role() = 'authenticated')`,
            `DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects`,
            `CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE USING (bucket_id = 'tires' AND auth.role() = 'authenticated')`,
            `DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects`,
            `CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING (bucket_id = 'tires' AND auth.role() = 'authenticated')`,
            // Logos policies
            `DROP POLICY IF EXISTS "Public Logo Access" ON storage.objects`,
            `CREATE POLICY "Public Logo Access" ON storage.objects FOR SELECT USING (bucket_id = 'logos')`,
            `DROP POLICY IF EXISTS "Authenticated Logo Upload" ON storage.objects`,
            `CREATE POLICY "Authenticated Logo Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated')`
        ];
        for (const sql of storagePolicies) {
            await client.query(sql);
        }

        // 3. Enable Realtime
        console.log('📡 Enabling Realtime for public tables...');
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
                    CREATE PUBLICATION supabase_realtime;
                END IF;
            END $$;
        `);

        // Get list of all tables in public schema
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `);
        
        for (const row of tablesRes.rows) {
            try {
                await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE public.${row.table_name}`);
            } catch (e) {
                // Ignore if already added
            }
        }

        console.log('✅ Supabase infrastructure setup completed successfully!');
    } catch (err) {
        console.error('❌ Setup failed:', err.message);
    } finally {
        await client.end();
    }
}

setup();
