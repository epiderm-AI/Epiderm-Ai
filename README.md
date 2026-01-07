# EpidermAI - Plateforme d'Analyse Faciale Esthétique

Application Next.js pour l'analyse faciale esthétique avec IA, développée pour les professionnels de santé.

## ⚠️ Configuration Requise

### Clé API OpenRouter

Cette application nécessite une clé API OpenRouter valide pour fonctionner.

**Si vous voyez cette erreur** : `OpenRouter error: {"error":{"message":"User not found.","code":401}}`

👉 **Consultez le guide complet** : [CONFIGURATION_OPENROUTER.md](./CONFIGURATION_OPENROUTER.md)

**Test rapide** :
```bash
node test-openrouter.js
```

---

## Getting Started

### 1. Variables d'environnement

Copiez `.env.local.example` et remplissez vos clés:

```bash
cp .env.local.example .env.local
```

Minimum requis:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key
OPENROUTER_API_KEY=sk-or-v1-...  # ⚠️ OBLIGATOIRE
```

### 2. Installation et démarrage

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) pour voir l'application.

---

## 📚 Documentation

- [CONFIGURATION_OPENROUTER.md](./CONFIGURATION_OPENROUTER.md) - Configuration de l'API OpenRouter (OBLIGATOIRE)
- [DEPLOIEMENT_NETLIFY.md](./DEPLOIEMENT_NETLIFY.md) - Guide de déploiement sur Netlify
- [ANALYSE_GLOBALE.md](./ANALYSE_GLOBALE.md) - Documentation de l'analyse faciale globale
- [SYSTEME_ANALYSE_FACIALE.md](./SYSTEME_ANALYSE_FACIALE.md) - Architecture du système d'analyse

---

## 🔧 Scripts Utiles

```bash
# Test de la clé API OpenRouter
node test-openrouter.js

# Build de production
npm run build

# Vérification TypeScript
npx tsc --noEmit

# Linting
npx eslint .
```

---

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
