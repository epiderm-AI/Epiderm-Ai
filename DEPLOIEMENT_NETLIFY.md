# Guide de Déploiement Netlify - EpidermAI

## ⚠️ Important

Cette application Next.js nécessite une configuration spécifique pour Netlify.

---

## 📋 Prérequis

1. Compte Netlify (gratuit ou payant)
2. Repository GitHub connecté
3. Variables d'environnement Supabase

---

## 🚀 Étapes de Déploiement

### 1. Configuration Netlify

Dans votre dashboard Netlify :

1. **New site from Git** → Sélectionnez votre repository GitHub
2. **Build settings** :
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Functions directory: `netlify/functions`

3. **Installer le plugin Next.js** :
   ```bash
   # Le plugin @netlify/plugin-nextjs est déjà configuré dans netlify.toml
   ```

### 2. Variables d'Environnement

Dans **Site settings → Build & deploy → Environment variables**, ajoutez :

```bash
# Supabase (OBLIGATOIRE)
NEXT_PUBLIC_SUPABASE_URL=https://ongcadzzheyyigickvfu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZ2NhZHp6aGV5eWlnaWNrdmZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMDU3NzMsImV4cCI6MjA4MjY4MTc3M30.rct51p0WIeGx3XaOlzXnT6_SlE5EF38P2GxGHmZyQzg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uZ2NhZHp6aGV5eWlnaWNrdmZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEwNTc3MywiZXhwIjoyMDgyNjgxNzczfQ.QnwYHlODJ7t6ni3sdlsLv3oHU-Fj4rjESUMvYYq62qk

# Storage
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=clinical-photos

# Auth
NEXT_PUBLIC_ALLOWED_ROLES=owner,practitioner,cabinet

# OpenRouter (Analyse IA)
OPENROUTER_API_KEY=sk-or-v1-02ce1792fd0edc7f4fd875dd2fb57cf703a12c210e1c3137c801c4506d85186bas
OPENROUTER_MODEL=google/gemini-2.5-flash

# Build
NODE_VERSION=20
NEXT_TELEMETRY_DISABLED=1
```

### 3. Configuration Supabase

Dans votre projet Supabase :

1. **Authentication → URL Configuration** :
   - Site URL: `https://votre-site.netlify.app`
   - Redirect URLs: Ajoutez `https://votre-site.netlify.app/auth/callback`

2. **Storage → Policies** :
   - Vérifiez que les RLS policies permettent l'accès depuis Netlify

### 4. Déploiement

1. Commitez et pushez vos changements :
   ```bash
   git add .
   git commit -m "Configuration Netlify"
   git push origin main
   ```

2. Netlify déploiera automatiquement votre site

---

## 🔍 Vérification Post-Déploiement

### Checklist

- [ ] Le site se charge sans erreur 404
- [ ] La connexion Supabase fonctionne (page de login)
- [ ] Les images s'affichent (Storage Supabase)
- [ ] La caméra est accessible (HTTPS requis)
- [ ] Les API routes fonctionnent (`/api/health`)
- [ ] Les analyses IA fonctionnent
- [ ] Le design moderne s'affiche correctement

### Tests à Effectuer

1. **Page de login** : `https://votre-site.netlify.app/login`
2. **API Health** : `https://votre-site.netlify.app/api/health`
3. **Création patient** : Testez le formulaire complet
4. **Capture photo** : Vérifiez l'accès caméra (HTTPS)
5. **Analyse IA** : Testez une analyse de zone

---

## 🐛 Dépannage

### Erreur 404 sur toutes les pages

**Problème** : Le plugin Next.js n'est pas activé

**Solution** :
1. Vérifiez que `netlify.toml` est à la racine du projet
2. Dans Netlify : **Site settings → Build & deploy → Build settings**
3. Assurez-vous que "Functions directory" est défini sur `netlify/functions`
4. Redéployez manuellement : **Deploys → Trigger deploy → Deploy site**

### Variables d'environnement non accessibles

**Problème** : Les variables `NEXT_PUBLIC_*` ne sont pas définies

**Solution** :
1. Allez dans **Site settings → Environment variables**
2. Cliquez sur **Add a variable**
3. Ajoutez **toutes** les variables listées ci-dessus
4. **Redéployez** le site (important : les variables ne sont appliquées qu'au prochain build)

### Erreur Supabase "Invalid API key"

**Problème** : Les clés Supabase sont incorrectes ou manquantes

**Solution** :
1. Vérifiez que `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont bien définies
2. Vérifiez qu'il n'y a pas d'espaces avant/après les valeurs
3. Dans Supabase : **Settings → API** pour copier les bonnes clés

### Caméra ne fonctionne pas

**Problème** : L'accès caméra nécessite HTTPS

**Solution** :
- Netlify fournit automatiquement HTTPS
- Vérifiez que vous accédez bien au site via `https://` et non `http://`
- Sur mobile, vérifiez les permissions dans les paramètres du navigateur

### Build échoue

**Problème** : Erreur lors du build Netlify

**Solutions** :
1. Vérifiez les logs de build dans Netlify
2. Assurez-vous que `NODE_VERSION=20` est défini
3. Vérifiez qu'il n'y a pas d'erreurs TypeScript localement : `npm run build`

---

## 📊 Performance et Monitoring

### Métriques à Surveiller

- **Build Time** : Devrait être < 5 minutes
- **Function Execution** : API routes < 2 secondes
- **Bandwidth** : Optimisez les images si nécessaire
- **Analytics** : Activez Netlify Analytics pour le monitoring

### Optimisations

1. **Images** :
   - Utilisez `next/image` pour l'optimisation automatique
   - Compressez les photos avant upload (déjà fait côté client)

2. **API Routes** :
   - Mettez en cache les réponses fréquentes
   - Limitez les appels OpenRouter (coût)

3. **Build** :
   - Activez le cache de build Netlify
   - Utilisez des imports dynamiques pour les grandes librairies

---

## 🔒 Sécurité

### Bonnes Pratiques

1. **Secrets** :
   - ❌ Ne jamais committer `.env` dans Git
   - ✅ Utilisez les variables d'environnement Netlify
   - ✅ Rotez régulièrement `SUPABASE_SERVICE_ROLE_KEY`

2. **Headers de Sécurité** :
   - Configurés dans `netlify.toml`
   - HTTPS forcé automatiquement
   - CORS géré par Next.js

3. **Authentification** :
   - Supabase gère l'auth avec JWT
   - Middleware Next.js protège les routes `/app/*`
   - RLS policies côté Supabase

---

## 🆘 Support

### Logs de Build

Accédez aux logs : **Deploys → [Votre deploy] → Deploy log**

### Logs de Function

Accédez aux logs : **Functions → [Function name] → Function log**

### Ressources

- [Documentation Netlify](https://docs.netlify.com/)
- [Next.js sur Netlify](https://docs.netlify.com/integrations/frameworks/next-js/)
- [Supabase + Netlify](https://supabase.com/docs/guides/getting-started/tutorials/with-netlify)

---

## 🚀 Alternative : Vercel (Recommandé pour Next.js)

Si vous rencontrez des difficultés avec Netlify, **Vercel** est la plateforme native pour Next.js :

### Avantages Vercel

- ✅ Optimisé spécifiquement pour Next.js
- ✅ Configuration zero (détection automatique)
- ✅ Edge Functions performantes
- ✅ Preview deployments automatiques
- ✅ Pas de plugin nécessaire

### Déploiement Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. **Import Git Repository** → Sélectionnez votre repo
3. Ajoutez les mêmes variables d'environnement
4. **Deploy** → C'est tout!

---

**Dernière mise à jour** : 3 janvier 2026
**Version** : 1.0.0
