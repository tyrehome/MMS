import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkBuckets() {
    console.log('Testing with URL:', supabaseUrl);
    
    // 1. Try to list files
    const { data: listData, error: listError } = await supabase.storage.from('tires').list('', { limit: 1 });
    if (listError) {
        console.error('List "tires" error:', JSON.stringify(listError, null, 2));
    } else {
        console.log('List "tires" success:', listData.length, 'items found.');
    }

    // 2. Try to upload a dummy file
    const dummyFile = Buffer.from('test');
    const { data: uploadData, error: uploadError } = await supabase.storage.from('tires').upload('test.txt', dummyFile, { upsert: true });
    if (uploadError) {
        console.error('Upload "tires" error:', JSON.stringify(uploadError, null, 2));
    } else {
        console.log('Upload "tires" success:', uploadData);
    }
}

checkBuckets();
