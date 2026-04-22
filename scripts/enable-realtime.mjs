import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DIRECT_URL;
const client = new Client({ connectionString });

async function enableRealtime() {
  await client.connect();
  console.log('Enabling Supabase Realtime for all public tables...');
  try {
    // 1. Create publication if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
          CREATE PUBLICATION supabase_realtime;
        END IF;
      END $$;
    `);

    // 2. Add all public tables to the publication
    // We can't use 'ADD ALL TABLES' easily if some are already in, so we do it explicitly or for all
    await client.query(`
      ALTER PUBLICATION supabase_realtime ADD TABLE 
        public.tires, 
        public.sales, 
        public.sale_items,
        public.inventory_lots, 
        public.parts, 
        public.customers, 
        public.accounts, 
        public.appointments, 
        public.invoices, 
        public.workers, 
        public.tasks, 
        public.vehicles, 
        public.suppliers, 
        public.business_settings, 
        public.master_data,
        public.hotel_tires;
    `);
    
    console.log('Realtime enabled successfully.');
  } catch (e) {
    if (e.message.includes('already exists')) {
       console.log('Some tables were already in publication. All good.');
    } else {
       console.error('Error:', e);
    }
  } finally {
    await client.end();
  }
}

enableRealtime();
