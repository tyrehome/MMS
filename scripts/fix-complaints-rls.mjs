import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

const client = new Client({
    connectionString,
});

async function run() {
    try {
        await client.connect();
        console.log('Enabling RLS and creating policies for complaints and complaint_logs...');
        
        const tables = ['complaints', 'complaint_logs'];
        
        for (const table of tables) {
            await client.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
            await client.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_policies 
                        WHERE tablename = '${table}' 
                        AND policyname = 'Allow authenticated users'
                    ) THEN
                        CREATE POLICY "Allow authenticated users" ON public.${table} 
                        FOR ALL TO authenticated USING (true);
                    END IF;
                END $$;
            `);
        }
        
        console.log('RLS setup successful.');
    } catch (err) {
        console.error('RLS setup failed', err);
    } finally {
        await client.end();
    }
}

run();
