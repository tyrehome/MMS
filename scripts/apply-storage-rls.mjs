import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

const client = new Client({ connectionString });

async function applyRLS() {
    try {
        await client.connect();
        
        console.log('Applying RLS for "tires"...');
        
        const queries = [
            `DROP POLICY IF EXISTS "Public Access" ON storage.objects`,
            `CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'tires')`,
            
            `DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects`,
            `CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'tires' AND auth.role() = 'authenticated')`,
            
            `DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects`,
            `CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE USING (bucket_id = 'tires' AND auth.role() = 'authenticated')`,
            
            `DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects`,
            `CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING (bucket_id = 'tires' AND auth.role() = 'authenticated')`
        ];

        for (const q of queries) {
            await client.query(q);
        }
        
        console.log('Success.');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

applyRLS();
