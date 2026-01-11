#!/usr/bin/env node

/**
 * Script pour exécuter la migration de base de données via l'API Supabase
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Charger les variables d'environnement
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Lire le fichier de migration
const migrationPath = path.join(__dirname, '../supabase/migrations/20260110_refactor_zone_detection.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('🚀 Starting database migration...');
console.log(`📄 Migration file: ${migrationPath}`);
console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);

// Extraire le project ref de l'URL
const projectRef = SUPABASE_URL.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('❌ Invalid Supabase URL');
  process.exit(1);
}

// Préparer la requête
const postData = JSON.stringify({ query: migrationSQL });

const options = {
  hostname: `${projectRef}.supabase.co`,
  port: 443,
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  },
};

// Fonction alternative : exécuter via pg (PostgreSQL client)
const { Client } = require('pg');

async function runMigrationWithPg() {
  // Note: Cette méthode nécessite la connection string directe
  // Pour l'instant, nous allons utiliser une approche simplifiée

  console.log('\n⚠️  Direct PostgreSQL connection not available.');
  console.log('📋 Please execute the migration manually via Supabase Studio:');
  console.log(`\n1. Go to: ${SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}/editor`);
  console.log('2. Open SQL Editor');
  console.log('3. Copy and paste the migration SQL');
  console.log('4. Run the query\n');
  console.log('Migration SQL path:', migrationPath);
}

runMigrationWithPg();
