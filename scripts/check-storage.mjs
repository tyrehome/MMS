import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkBuckets() {
    console.log('Checking buckets for:', supabaseUrl);
    
    const { data: tiresData, error: tiresError } = await supabase.storage.from('tires').list('', { limit: 1 });
    if (tiresError) {
        console.error('Error accessing "tires" bucket:', tiresError.message);
    } else {
        console.log('"tires" bucket is accessible.');
    }

    const { data: logosData, error: logosError } = await supabase.storage.from('logos').list('', { limit: 1 });
    if (logosError) {
        console.error('Error accessing "logos" bucket:', logosError.message);
    } else {
        console.log('"logos" bucket is accessible.');
    }
}

checkBuckets();
