#!/usr/bin/env node

/**
 * Script de test pour vérifier la validité de votre clé API OpenRouter
 * Usage: node test-openrouter.js
 */

const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Fichier .env.local non trouvé !');
    console.log('📝 Créez un fichier .env.local à la racine du projet avec :');
    console.log('   OPENROUTER_API_KEY=sk-or-v1-...');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  }
}

loadEnv();

const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash';

console.log('🔍 Test de la clé API OpenRouter\n');
console.log('Configuration détectée:');
console.log(`  • Clé API: ${apiKey ? `${apiKey.substring(0, 20)}...` : '❌ MANQUANTE'}`);
console.log(`  • Modèle: ${model}\n`);

if (!apiKey) {
  console.error('❌ OPENROUTER_API_KEY manquante dans .env.local');
  console.log('\n📚 Pour obtenir une clé API:');
  console.log('   1. Allez sur https://openrouter.ai/keys');
  console.log('   2. Créez une nouvelle clé');
  console.log('   3. Ajoutez-la dans .env.local: OPENROUTER_API_KEY=sk-or-v1-...');
  process.exit(1);
}

// Test simple avec OpenRouter
async function testOpenRouter() {
  console.log('🚀 Envoi d\'une requête test à OpenRouter...\n');

  const payload = {
    model: model,
    messages: [
      {
        role: 'user',
        content: 'Réponds simplement "OK" si tu reçois ce message.'
      }
    ],
    max_tokens: 10
  };

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const statusCode = response.status;
    const responseText = await response.text();

    console.log(`📡 Statut HTTP: ${statusCode}`);

    if (!response.ok) {
      console.error(`\n❌ ERREUR ${statusCode}:`);
      console.error(responseText);

      if (statusCode === 401) {
        console.log('\n💡 Solutions possibles:');
        console.log('   1. Votre clé API est invalide ou expirée');
        console.log('   2. Allez sur https://openrouter.ai/keys');
        console.log('   3. Créez une nouvelle clé API');
        console.log('   4. Remplacez OPENROUTER_API_KEY dans .env.local');
        console.log('   5. Vérifiez que vous avez des crédits sur votre compte OpenRouter');
      } else if (statusCode === 402) {
        console.log('\n💡 Crédits insuffisants:');
        console.log('   1. Allez sur https://openrouter.ai/credits');
        console.log('   2. Ajoutez des crédits à votre compte (minimum $5)');
      } else if (statusCode === 429) {
        console.log('\n💡 Limite de taux atteinte:');
        console.log('   1. Vous avez fait trop de requêtes trop rapidement');
        console.log('   2. Attendez quelques secondes et réessayez');
      }

      process.exit(1);
    }

    const data = JSON.parse(responseText);
    const content = data?.choices?.[0]?.message?.content || 'Pas de réponse';

    console.log(`\n✅ SUCCÈS ! La clé API fonctionne correctement.`);
    console.log(`📝 Réponse de l'IA: "${content}"`);

    if (data.usage) {
      console.log(`\n💰 Coût de cette requête:`);
      console.log(`   • Tokens utilisés: ${data.usage.total_tokens || 'N/A'}`);
      console.log(`   • Coût estimé: ~$${((data.usage.total_tokens || 0) * 0.000001).toFixed(6)}`);
    }

    console.log(`\n✨ Votre configuration OpenRouter est prête à l'emploi !`);

  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error.message);
    process.exit(1);
  }
}

testOpenRouter();
