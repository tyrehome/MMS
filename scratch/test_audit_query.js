import { createClient } from '@supabase/supabase-client'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function testQuery() {
  const { data, error } = await supabase
    .from('audit_log')
    .select('*, profiles!user_id(name, email)')
    .limit(5)
  
  if (error) {
    console.error('Error with !user_id:', error)
  } else {
    console.log('Success with !user_id:', data)
  }

  const { data: data2, error: error2 } = await supabase
    .from('audit_log')
    .select('*, profiles(name, email)')
    .limit(5)
  
  if (error2) {
    console.error('Error without !user_id:', error2)
  } else {
    console.log('Success without !user_id:', data2)
  }
}

testQuery()
