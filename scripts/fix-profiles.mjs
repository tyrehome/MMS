import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const client = new Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });

async function run() {
    try {
        await client.connect();
        
        // Add the missing INSERT policy for future signups
        await client.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own profile' AND tablename = 'profiles'
                ) THEN
                    CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
                END IF;
            END $$;
        `);
        console.log('Added missing INSERT policy to profiles table.');

        // Sync existing auth.users to public.profiles
        const res = await client.query(`
            INSERT INTO public.profiles (id, email, name, role)
            SELECT 
                id, 
                email, 
                UPPER(split_part(email, '@', 1)), 
                CASE 
                    WHEN email IN ('sewwasofficial@gmail.com', 'sewwas@gmail.com', 'sewwa.mms@gmail.com', 'sewwa.tms@gmail.com', 'mmstyrehome@gmail.com', 'amsomeinc@gmail.com') THEN 'admin'
                    ELSE 'staff'
                END
            FROM auth.users
            ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
        `);
        console.log(`Synced auth.users to public.profiles. Inserted/Updated rows: ${res.rowCount}`);
    } catch(e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
