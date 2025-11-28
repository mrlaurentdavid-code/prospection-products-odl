const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Extract project ref from URL
const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

async function applyMigration() {
  const sqlPath = path.join(__dirname, '../supabase/migrations/043_create_contacts_rpc_functions.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log('🔄 Applying migration via Supabase SQL API...');
  console.log('Project:', projectRef);
  
  // Use the pg_execute endpoint for raw SQL execution
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/pg_execute`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql }),
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.error('❌ Failed:', response.status, text);
    
    // Try alternative: split into individual statements
    console.log('\n🔄 Trying to execute SQL statements individually...');
    return false;
  }
  
  console.log('✅ Migration applied successfully!');
  return true;
}

applyMigration().catch(console.error);
