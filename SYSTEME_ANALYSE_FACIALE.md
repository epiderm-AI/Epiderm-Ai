# Système d'Analyse Faciale EpidermAI

## Vue d'ensemble

EpidermAI est une plateforme d'analyse faciale professionnelle qui combine la vision par ordinateur (MediaPipe), l'intelligence artificielle (Google Gemini 2.5 Flash via OpenRouter) et une gestion de flux clinique pour fournir des analyses esthétiques détaillées des zones du visage.

## Architecture du Système

### 1. Détection de Landmarks Faciaux

Le système utilise **MediaPipe FaceLandmarker** pour détecter 468 points de repère sur le visage en temps réel.

#### Points de Repère Clés

| Landmark | Index | Description |
|----------|-------|-------------|
| Œil gauche (centre) | 33 | Centre de l'œil gauche |
| Œil droit (centre) | 263 | Centre de l'œil droit |
| Pointe du nez | 1 | Extrémité du nez |
| Coin gauche de la bouche | 61 | Commissure labiale gauche |
| Coin droit de la bouche | 291 | Commissure labiale droite |
| Menton | 152 | Point le plus bas du menton |
| Pommette gauche | 234 | Point latéral gauche |
| Pommette droite | 454 | Point latéral droit |
| Front | 10 | Point supérieur du front |

#### Proportions Faciales Calculées

Le système calcule automatiquement:

- **Distance inter-pupillaire**: Distance entre les centres des yeux (référence anatomique principale)
- **Largeur du nez**: Distance entre les ailes nasales
- **Largeur de la bouche**: Distance entre les commissures labiales
- **Largeur faciale**: Distance entre les pommettes
- **Hauteur faciale**: Distance front-menton

Ces proportions sont utilisées pour:
1. Calibrer le masque facial de manière proportionnelle
2. Adapter les marges selon les règles des tiers faciaux
3. Garantir une cohérence anatomique

### 2. Calibration Automatique du Masque

Le système de calibration utilise les **proportions du visage** plutôt que des marges fixes.

#### Règle des Tiers Faciaux

Le visage est divisé en trois tiers verticaux égaux:
- **Tiers supérieur**: Ligne des cheveux → Sourcils (33%)
- **Tiers moyen**: Sourcils → Base du nez (33%)
- **Tiers inférieur**: Base du nez → Menton (33%)

#### Calcul des Marges Proportionnelles

```typescript
// Marges basées sur la distance inter-pupillaire (IPD)
const marginX = eyeDistance * 0.9;        // ≈ 90% de l'IPD pour les côtés
const marginTop = eyeDistance * 0.65;     // ≈ 65% de l'IPD pour le front
const marginBottom = eyeDistance * 0.35;  // ≈ 35% de l'IPD pour la mâchoire
```

**Pourquoi ces coefficients?**
- Les marges latérales (0.9) couvrent les tempes et oreilles
- La marge supérieure (0.65) inclut le front entier
- La marge inférieure (0.35) capture la ligne mandibulaire

### 3. Stockage des Landmarks

Tous les landmarks détectés sont sauvegardés dans la table `face_landmarks`:

```sql
CREATE TABLE face_landmarks (
  id UUID PRIMARY KEY,
  photo_id UUID NOT NULL,
  session_id UUID NOT NULL,

  -- 468 landmarks MediaPipe complets
  landmarks JSONB NOT NULL,

  -- Points clés extraits
  left_eye JSONB,
  right_eye JSONB,
  nose_tip JSONB,
  mouth_left JSONB,
  mouth_right JSONB,
  chin JSONB,

  -- Proportions faciales
  face_width NUMERIC,
  face_height NUMERIC,
  eye_distance NUMERIC,
  nose_width NUMERIC,
  mouth_width NUMERIC,

  -- Bounding box
  bbox_x NUMERIC,
  bbox_y NUMERIC,
  bbox_width NUMERIC,
  bbox_height NUMERIC,

  -- Métadonnées
  confidence NUMERIC DEFAULT 1.0,
  detection_method TEXT DEFAULT 'mediapipe',
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Avantages:**
- Réutilisation des landmarks pour analyses futures
- Traçabilité de la détection
- Comparaison inter-sessions
- Évolution des proportions faciales dans le temps

### 4. Analyse IA avec OpenRouter (Google Gemini 2.5 Flash)

#### Configuration

```env
OPENROUTER_API_KEY=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
OPENROUTER_MODEL=google/gemini-2.5-flash
```

#### Analyse Contextuelle par Zone

L'IA reçoit un **contexte anatomique** spécifique pour chaque zone faciale:

**Exemple: Zone Glabellaire**

```
Zone glabellaire: Région entre les sourcils, au-dessus de l'arête nasale.
Caractéristiques: Rides verticales et horizontales inter-sourcilières (rides du lion).
Points d'attention: Profondeur des rides, tension musculaire, pigmentation.
```

#### Prompt d'Analyse

Le système envoie à l'IA:

1. **Nom de la zone**: ex. "glabella", "peri_orbital_upper_left"
2. **Description anatomique**: localisation et caractéristiques
3. **Contexte spécifique**: particularités de cette région
4. **Image découpée**: uniquement la zone à analyser (sans contexte inutile)
5. **Instructions**: observer texture, tonus, hydratation, pigmentation, signes de vieillissement

#### Format de Réponse

```json
{
  "summary": "Résumé en 1-2 phrases",
  "observations": [
    "Texture cutanée fine avec pores peu visibles",
    "Légère déshydratation superficielle",
    "Tonus satisfaisant sans relâchement notable"
  ],
  "possibleConcerns": [
    "Rides naissantes de la patte d'oie",
    "Léger affaissement de la paupière supérieure"
  ],
  "suggestedFocus": [
    "Hydratation ciblée péri-orbitaire",
    "Soins raffermissants pour le contour de l'œil"
  ],
  "disclaimer": "Ces observations sont à visée esthétique uniquement et ne constituent pas un diagnostic médical."
}
```

#### Nettoyage de la Réponse IA

Le système nettoie automatiquement la réponse de l'IA pour supprimer tout formatage technique:
- Suppression des blocs markdown (` ```json `, ` ``` `)
- Extraction du JSON pur
- Parsing et structuration des données

#### Affichage de l'Analyse

L'interface utilisateur présente les résultats d'analyse de manière moderne et professionnelle, **sans aucun terme technique visible**:

- **Section Analyse** (gradient bleu/indigo): Résumé principal en texte clair et naturel
- **Section Observations** (gradient émeraude/teal): Liste détaillée des observations visuelles
- **Section Points d'attention** (gradient ambre/orange): Préoccupations esthétiques identifiées
- **Section Recommandations** (gradient violet/pourpre): Suggestions de soins ciblés (texte en gras)
- **Note de non-responsabilité**: Disclaimer médical discret en bas de page

**Mise en valeur automatique des mots-clés:**
Le système détecte et met en gras automatiquement plus de 70 termes professionnels clés dans tout le texte affiché:
- **Texture cutanée**: pores, lisse, rugueuse, fine, épaisse, grain de peau
- **Hydratation**: hydratation, déshydratation, sèche, sécheresse, hydratée
- **Tonus**: fermeté, relâchement, ptose, affaissement, élasticité, tonus
- **Pigmentation**: taches, hyperpigmentation, teint, uniformité, pigmentation
- **Rides**: ridules, plis, sillon, expression, statique, dynamique, rides
- **Vascularisation**: vascularisation, rougeurs, couperose, cernes
- **Volume**: volume, projection, creux, poches, bajoues
- **Zones anatomiques**: temporal, malaire, péri-orbitaire, nasal, frontal, glabellaire, etc.
- **Qualificatifs**: marqué, prononcé, léger, modéré, important, visible, naissant, satisfaisant
- **Traitements**: raffermissant, hydratant, anti-âge, lissant, tenseur, repulpant

**Présentation visuelle:**
- Aucun bloc de code ou terme JSON visible
- Titres en français clairs (Analyse, Observations, Points d'attention, Recommandations)
- Organisation par items avec puces colorées
- Design épuré avec cartes colorées et ombres légères
- Espacement généreux pour une lecture facile

### 5. Analyse Globale du Visage

#### Fonctionnalité d'Analyse Holistique

En complément de l'analyse ciblée par zones, le système propose une **analyse globale du visage** qui évalue l'ensemble du visage dans une approche holistique.

#### API Route: `/api/analysis/global-face`

**Méthode**: POST

**Paramètres**:
- `sessionId`: ID de la session photo
- `photoId`: ID de la photo à analyser
- `imageDataUrl`: Image complète en base64

**Processus d'analyse globale**:
1. L'image entière du visage est envoyée à l'IA (pas de découpe)
2. Prompt spécialisé pour une analyse holistique
3. L'IA évalue: proportions, symétrie, harmonie générale, qualité de peau globale
4. Analyse structurée par régions (supérieure, médiane, inférieure)
5. Identification des signes de vieillissement ET des points forts esthétiques

#### Format de Réponse Globale

```json
{
  "summary": "Vue d'ensemble du visage en 2-3 phrases",
  "globalObservations": [
    "Observation sur les proportions et symétrie",
    "Observation sur la qualité de peau générale",
    "Observation sur le tonus global"
  ],
  "regionalAnalysis": {
    "upperFace": "Analyse de la région supérieure (front, tempes, péri-orbitaire)",
    "midFace": "Analyse de la région médiane (pommettes, nez, sillons)",
    "lowerFace": "Analyse de la région inférieure (bouche, menton, ovale)"
  },
  "agingConcerns": [
    "Signe de vieillissement 1",
    "Signe de vieillissement 2"
  ],
  "strengths": [
    "Point fort esthétique 1",
    "Point fort esthétique 2"
  ],
  "globalRecommendations": [
    "Recommandation de soin global 1",
    "Recommandation de soin global 2"
  ],
  "disclaimer": "Cette analyse globale est à visée esthétique uniquement..."
}
```

#### Affichage de l'Analyse Globale

L'interface présente l'analyse globale dans une section dédiée avec un design distinctif:

- **Bordure indigo** et fond dégradé indigo/pourpre pour différencier visuellement
- **Icône de globe** et titre "Analyse Globale du Visage"
- **Vue d'ensemble**: Carte blanche avec résumé principal
- **Observations Générales**: Liste des observations holistiques
- **Analyse par Région**: 3 cartes colorées (supérieure bleu, médiane vert, inférieure violet)
- **Grid 2 colonnes**:
  - Signes de vieillissement (gradient ambre/orange)
  - Points forts esthétiques (gradient émeraude/teal)
- **Recommandations Globales**: Carte rose avec suggestions de soins
- **Disclaimer**: Note discrète en bas

#### Stockage en Base de Données

Table `global_face_analyses`:
```sql
CREATE TABLE global_face_analyses (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL,
  photo_id UUID NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Avantages de l'analyse globale**:
- Vision d'ensemble cohérente du visage
- Évaluation de l'harmonie et des proportions
- Identification des points forts (approche positive)
- Recommandations de soins adaptées au visage entier
- Complémentaire aux analyses ciblées par zones

### 6. Zones Anatomiques Reconnues

Le système comprend 13 régions faciales principales:

| Région | Zones Incluses | Caractéristiques |
|--------|----------------|-------------------|
| **Frontale** | frontal, glabella | Rides horizontales, rides du lion |
| **Temporale** | temporal_left, temporal_right | Peau fine, vascularisation |
| **Péri-orbitaire** | peri_orbital_upper/lower_left/right | Cernes, poches, rides de la patte d'oie |
| **Nasale** | nasal | Pores visibles, sébum |
| **Malaire** | malar_left, malar_right | Volume, projection |
| **Naso-labiale** | nasolabial_left, nasolabial_right | Profondeur des sillons |
| **Péri-orale** | perioral | Rides code-barres |
| **Labiale** | lip_upper, lip_lower | Volume, hydratation |
| **Marionnette** | marionette_left, marionette_right | Affaissement, ptose |
| **Mentonnière** | chin | Capitons, relief |
| **Mandibulaire** | mandibular_left, mandibular_right | Ovale du visage |
| **Cervicale** | cervical | Rides du cou, bandes platysmales |

## Flux de Travail Complet

### Étape 1: Capture Photo

**URL**: `/capture`

1. Sélection du patient
2. Choix du sexe (détermine le modèle XX ou XY)
3. Capture de 5 angles standardisés:
   - Face (frontal)
   - Trois-quarts gauche
   - Trois-quarts droit
   - Profil gauche
   - Profil droit
4. Upload vers Supabase Storage
5. Redirection automatique vers `/mask-fit/[sessionId]`

### Étape 2: Calibration du Masque

**URL**: `/mask-fit/[sessionId]`

1. Chargement de la photo frontale
2. **Auto-détection** (si `?auto=1`):
   - Détection des 468 landmarks MediaPipe
   - Extraction des points clés (yeux, nez, bouche, menton)
   - Calcul des proportions faciales
   - **Sauvegarde dans `face_landmarks`** ✨
   - Calibration proportionnelle du masque
   - Calcul automatique du scale et offset
3. Ajustement manuel possible:
   - Drag & drop pour repositionner
   - Slider de zoom (0.7x - 1.4x)
4. Sauvegarde dans `face_mask_fits`
5. Redirection vers `/analysis/[sessionId]`

### Étape 3: Analyse des Zones

**URL**: `/analysis/[sessionId]`

#### Deux Modes d'Analyse

**A) Analyse Globale du Visage** (bouton "🌐 Analyse globale" en haut à droite)
1. Clic sur le bouton → Lance l'analyse globale
2. **Processus**:
   - Conversion de l'image complète en base64
   - Envoi à Google Gemini 2.5 Flash via OpenRouter
   - Analyse holistique: proportions, symétrie, qualité de peau, régions
   - Réception de l'analyse JSON structurée
   - Sauvegarde dans `global_face_analyses`
3. **Affichage**:
   - Section dédiée avec bordure indigo
   - Vue d'ensemble + Observations générales
   - Analyse par région (3 cartes: supérieure/médiane/inférieure)
   - Signes de vieillissement + Points forts esthétiques
   - Recommandations globales
   - Disclaimer

**B) Analyse Ciblée par Zone** (clic sur une zone du masque)
1. Affichage de la photo avec masque superposé
2. Clic sur une zone → Analyse IA ciblée
3. **Processus d'analyse**:
   - Récupération des informations de la zone (nom, description)
   - Génération du contexte anatomique spécifique
   - Découpe de l'image de la zone
   - Envoi à Google Gemini 2.5 Flash via OpenRouter
   - Réception de l'analyse JSON
   - Sauvegarde dans `face_zone_analyses`
4. **Affichage des résultats**:
   - Résumé (carte bleue)
   - Observations détaillées (carte verte)
   - Points d'attention (carte orange)
   - Recommandations (carte violette)
   - Disclaimer

## Points Techniques Importants

### Système de Coordonnées

- **Coordonnées normalisées**: 0-100 (pourcentage)
- **Transformation du masque**:
  ```typescript
  transformedPoint = (point - 50) * scale + 50 + offset
  ```
- **Conversion pixels**:
  ```typescript
  pixelCoord = (normalizedCoord * imageDimension) / 100
  ```

### Gestion des Erreurs

- **Pas de visage détecté**: Message "Aucun visage detecte"
- **Erreur MediaPipe**: Fallback sur ajustement manuel
- **Erreur API OpenRouter**: Affichage du message d'erreur avec retry possible
- **Landmarks non sauvegardés**: L'analyse continue (la sauvegarde n'est pas bloquante)

### Performance

- **Cache MediaPipe**: Le landmarker est initialisé une seule fois
- **Signed URLs**: 1 heure d'expiration (configurable)
- **Lazy loading**: Les landmarks ne sont calculés qu'au besoin
- **Batch insert**: Possibilité d'analyser plusieurs zones en parallèle

## Migrations Base de Données

### Migration 1: Système de Landmarks Faciaux

Pour activer le système de landmarks, exécuter:

```bash
# Depuis Supabase Dashboard → SQL Editor
# Ou via CLI:
supabase db push supabase/migrations/20260103_add_facial_landmarks.sql
```

**Table créée**: `face_landmarks`
- Stocke les 468 points MediaPipe
- Points clés extraits (yeux, nez, bouche, menton)
- Proportions faciales calculées
- Bounding box du visage

### Migration 2: Analyses Globales du Visage

Pour activer l'analyse globale, exécuter:

```bash
# Depuis Supabase Dashboard → SQL Editor
# Ou via CLI:
supabase db push supabase/migrations/20260103_add_global_face_analyses.sql
```

**Table créée**: `global_face_analyses`
- Stocke les analyses holistiques du visage complet
- Résultat JSON structuré avec 6 sections
- Policies RLS pour sécurité praticien
- Index de performance sur session_id et photo_id

## Variables d'Environnement Requises

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ongcadzzheyyigickvfu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=clinical-photos
NEXT_PUBLIC_ALLOWED_ROLES=owner,practitioner,cabinet

# OpenRouter API (Google Gemini 2.5 Flash)
OPENROUTER_API_KEY=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
OPENROUTER_MODEL=google/gemini-2.5-flash
```

## Dépendances Principales

```json
{
  "@mediapipe/tasks-vision": "^0.10.22-rc.20250304",
  "@supabase/ssr": "^0.8.0",
  "@supabase/supabase-js": "^2.89.0",
  "next": "16.1.1",
  "react": "19.2.3"
}
```

## Améliorations Futures Possibles

1. **Comparaison inter-sessions**:
   - Visualisation de l'évolution des landmarks
   - Détection automatique des changements

2. **Analyse prédictive**:
   - Prédiction du vieillissement basée sur les proportions
   - Simulation de traitements

3. **Rapports automatiques**:
   - Génération PDF avec analyses de toutes les zones
   - Graphiques d'évolution temporelle

4. **Multi-angles**:
   - Analyse des profils et trois-quarts
   - Reconstruction 3D du visage

5. **Optimisations IA**:
   - Fine-tuning du modèle sur vocabulaire dermatologique
   - Analyse comparative avec base de données de référence

## Support et Documentation

- **Documentation MediaPipe**: https://developers.google.com/mediapipe/solutions/vision/face_landmarker
- **Documentation OpenRouter**: https://openrouter.ai/docs
- **Supabase Docs**: https://supabase.com/docs

---

**Version**: 1.0.0
**Dernière mise à jour**: 3 janvier 2026
**Auteur**: EpidermAI Development Team
