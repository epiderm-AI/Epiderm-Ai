# Guide d'Utilisation - Analyse Globale du Visage

## Vue d'ensemble

L'analyse globale du visage est une fonctionnalité complémentaire aux analyses ciblées par zones. Elle offre une **vision holistique** du visage en évaluant l'ensemble des caractéristiques esthétiques.

## Comment l'utiliser

### 1. Accéder à la page d'analyse

Naviguez vers `/analysis/[sessionId]` après avoir:
- Créé une session photo pour un patient
- Capturé une photo frontale
- Calibré le masque facial (optionnel pour l'analyse globale)

### 2. Lancer l'analyse globale

En haut à droite de la page, cliquez sur le bouton:

```
🌐 Analyse globale
```

L'analyse prend quelques secondes (généralement 5-10 secondes).

### 3. Consulter les résultats

Une fois l'analyse terminée, une section dédiée s'affiche en bas de la page avec:

#### 📋 Vue d'ensemble
Résumé en 2-3 phrases de l'impression générale du visage.

#### 🔍 Observations Générales
Liste des observations holistiques sur:
- Proportions et symétrie faciale
- Qualité de peau globale
- Tonus et fermeté générale
- Harmonie des traits

#### 🗺️ Analyse par Région
3 cartes colorées analysant:
- **Région Supérieure** (bleu): Front, tempes, zone péri-orbitaire
- **Région Médiane** (vert): Pommettes, nez, sillons naso-labiaux
- **Région Inférieure** (violet): Bouche, menton, mandibule, ovale du visage

#### ⚠️ Signes de vieillissement
Liste des signes de vieillissement identifiés (rides, relâchement, perte de volume, etc.)

#### ✨ Points forts esthétiques
**NOUVEAUTÉ**: Identification des points forts du visage (approche positive)
- Traits harmonieux
- Zones préservées
- Caractéristiques esthétiques favorables

#### 💡 Recommandations Globales
Suggestions de soins adaptées au visage entier, basées sur l'analyse complète.

## Différences avec l'analyse par zones

| Aspect | Analyse Globale | Analyse par Zones |
|--------|----------------|-------------------|
| **Portée** | Visage entier | Zone spécifique (ex: péri-orbitaire) |
| **Image analysée** | Photo complète | Découpe de la zone |
| **Focus** | Harmonie, proportions, vision d'ensemble | Détails spécifiques de la zone |
| **Approche** | Holistique | Ciblée |
| **Points forts** | ✅ Identifiés | ❌ Non inclus |
| **Régions** | 3 grandes régions | 13+ zones détaillées |

## Complémentarité

Les deux types d'analyse sont **complémentaires**:

1. **Analyse globale**: Pour avoir une vision d'ensemble et identifier les zones prioritaires
2. **Analyses ciblées**: Pour approfondir zone par zone avec des détails anatomiques précis

## Stockage des données

Les analyses globales sont sauvegardées dans la table `global_face_analyses` et peuvent être:
- Consultées à nouveau lors de sessions futures
- Comparées dans le temps pour suivre l'évolution
- Exportées dans des rapports (fonctionnalité future)

## Aspects techniques

- **Modèle IA**: Google Gemini 2.5 Flash via OpenRouter
- **Température**: 0.3 (réponses cohérentes et précises)
- **Max tokens**: 2000 (analyses plus détaillées que les zones individuelles)
- **Mise en forme**: Mise en gras automatique de 70+ termes professionnels
- **Format**: JSON structuré avec 6 sections principales

## Migration base de données

⚠️ **Important**: Avant d'utiliser cette fonctionnalité, exécuter la migration SQL:

```bash
supabase db push supabase/migrations/20260103_add_global_face_analyses.sql
```

Ou depuis le Dashboard Supabase → SQL Editor → Copier/coller le contenu du fichier de migration.

## Prochaines évolutions possibles

- Comparaison entre analyses globales de différentes sessions
- Export PDF de l'analyse globale
- Analyse comparative avec base de référence
- Scores esthétiques globaux
- Visualisation graphique de l'évolution temporelle
