# Configuration OpenRouter pour l'Analyse IA

## Problème

Si vous voyez l'erreur suivante lors de l'analyse faciale:
```
OpenRouter error: {"error":{"message":"User not found.","code":401}}
```

Cela signifie que votre clé API OpenRouter est **invalide, expirée ou manquante**.

---

## Solution : Obtenir une nouvelle clé API OpenRouter

### 1. Créer un compte OpenRouter

1. Allez sur [https://openrouter.ai](https://openrouter.ai)
2. Cliquez sur "Sign In" ou "Get Started"
3. Créez un compte (gratuit)

### 2. Obtenir votre clé API

1. Une fois connecté, allez sur [https://openrouter.ai/keys](https://openrouter.ai/keys)
2. Cliquez sur "Create Key" ou "New API Key"
3. Donnez un nom à votre clé (ex: "EpidermAI Production")
4. Copiez la clé générée (elle commence par `sk-or-v1-...`)

⚠️ **IMPORTANT**: Cette clé ne sera affichée qu'une seule fois. Copiez-la immédiatement!

### 3. Configurer la clé dans votre projet

#### En développement local:

1. Ouvrez le fichier `.env.local` à la racine du projet webapp
2. Remplacez la ligne `OPENROUTER_API_KEY` par votre nouvelle clé:
   ```bash
   OPENROUTER_API_KEY=sk-or-v1-VOTRE_NOUVELLE_CLE_ICI
   ```
3. Redémarrez votre serveur de développement:
   ```bash
   npm run dev
   ```

#### En production (Netlify):

1. Allez dans votre dashboard Netlify
2. Sélectionnez votre site → **Site settings** → **Environment variables**
3. Trouvez la variable `OPENROUTER_API_KEY`
4. Cliquez sur **Edit** et remplacez par votre nouvelle clé
5. Cliquez sur **Save**
6. **Redéployez votre site**: **Deploys** → **Trigger deploy** → **Deploy site**

⚠️ **Note**: Le redéploiement est OBLIGATOIRE pour que la nouvelle variable soit prise en compte.

---

## Vérification

Pour vérifier que votre clé fonctionne:

### 1. Test via l'API de debug

Allez sur: `http://localhost:3000/api/debug` (en dev) ou `https://votre-site.netlify.app/api/debug` (en prod)

Vous devriez voir:
```json
{
  "message": "Environment check",
  "env": {
    "hasOpenRouterKey": true,  // ← Doit être true
    ...
  }
}
```

### 2. Test d'analyse faciale

1. Créez un patient
2. Créez une session
3. Capturez une photo
4. Lancez une analyse globale
5. L'analyse devrait fonctionner sans erreur 401

---

## Coûts et Modèles

### Modèle par défaut: `google/gemini-2.5-flash`

- **Coût**: ~$0.000075 par analyse (très économique)
- **Vitesse**: Très rapide (~2-3 secondes)
- **Qualité**: Excellente pour l'analyse esthétique

### Budget estimé

- 1000 analyses ≈ $0.075 (7.5 centimes)
- 10000 analyses ≈ $0.75
- 100000 analyses ≈ $7.50

Pour changer de modèle, modifiez `OPENROUTER_MODEL` dans vos variables d'environnement.

Modèles disponibles: [https://openrouter.ai/models](https://openrouter.ai/models)

---

## Crédits et Facturation

### Créditer votre compte

1. Allez sur [https://openrouter.ai/credits](https://openrouter.ai/credits)
2. Ajoutez des crédits (minimum $5)
3. Votre clé API fonctionnera dès que les crédits sont ajoutés

### Surveiller votre utilisation

- Dashboard: [https://openrouter.ai/activity](https://openrouter.ai/activity)
- Vous pouvez définir des limites de dépenses pour éviter les surprises

---

## Sécurité

### ⚠️ NE JAMAIS:

- ❌ Committer votre clé API dans Git
- ❌ Partager votre clé publiquement
- ❌ Utiliser la même clé en dev et en prod (créez 2 clés distinctes)

### ✅ TOUJOURS:

- ✅ Utiliser les variables d'environnement (`.env.local` / Netlify)
- ✅ Révoquer les clés compromises immédiatement
- ✅ Utiliser des clés différentes par environnement

---

## Support

- Documentation OpenRouter: [https://openrouter.ai/docs](https://openrouter.ai/docs)
- Discord OpenRouter: [https://discord.gg/openrouter](https://discord.gg/openrouter)

---

**Dernière mise à jour**: 3 janvier 2026
