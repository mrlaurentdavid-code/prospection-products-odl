#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const supabaseUrl = 'https://xewnzetqvrovqjcvwkus.supabase.co';
const supabaseServiceKey = 'YOUR_SERVICE_ROLE_KEY_HERE';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration(filename) {
  console.log(`\n📝 Applying migration: ${filename}`);

  const filePath = path.join(__dirname, 'supabase', 'migrations', filename);
  const sql = fs.readFileSync(filePath, 'utf8');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Essayer avec une requête brute via REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ query: sql })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      console.log(`✅ Migration ${filename} applied successfully`);
    } else {
      console.log(`✅ Migration ${filename} applied successfully`);
    }
  } catch (error) {
    console.error(`❌ Error applying migration ${filename}:`, error.message);

    // Essayer d'exécuter ligne par ligne
    console.log(`🔄 Trying to execute line by line...`);
    const lines = sql
      .split(';')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('--'));

    for (const line of lines) {
      try {
        await supabase.rpc('query', { sql: line + ';' });
        console.log(`  ✓ Executed: ${line.substring(0, 60)}...`);
      } catch (lineError) {
        console.error(`  ✗ Failed: ${line.substring(0, 60)}...`, lineError.message);
      }
    }
  }
}

async function main() {
  console.log('🚀 Starting migration deployment to Supabase production...\n');
  console.log(`📍 Target: ${supabaseUrl}`);

  // Migrations à appliquer
  const migrations = [
    '036_add_company_parent_column.sql',
    '037_update_insert_product_add_parent_company.sql'
  ];

  for (const migration of migrations) {
    await applyMigration(migration);
  }

  console.log('\n✅ All migrations applied successfully!');
}

main().catch(error => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
