import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const envParams = fs.readFileSync('.env.local', 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const [key, ...val] = line.split('=')
    if (key && val.length) acc[key.trim()] = val.join('=').trim()
    return acc
  }, {} as any)

const supabaseUrl = envParams['NEXT_PUBLIC_SUPABASE_URL'] || ''
const supabaseKey = envParams['NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY'] || envParams['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPolicies() {
  const { data, error } = await supabase.from('pg_policies').select('*').eq('tablename', 'shelf_bookings');
  console.log('Policies from pg_policies:', data, error);
}
checkPolicies()
