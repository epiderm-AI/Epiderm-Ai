# Refonte Design Moderne - EpidermAI WebApp

## Vue d'ensemble

Refonte complète du design de l'application EpidermAI avec un focus **ultra moderne** et **mobile-first**, optimisée pour iPhone et iPad.

**Date**: 3 janvier 2026
**Objectif**: Interface moderne, intuitive, avec animations fluides et totalement responsive

---

## 🎨 Nouveau Design System

### Palette de Couleurs Modernes

```css
/* Primary (Indigo) */
--primary: #6366f1
--primary-hover: #4f46e5
--primary-active: #4338ca

/* Secondary (Pink) */
--secondary: #ec4899
--secondary-hover: #db2777
--secondary-active: #be185d

/* Accent (Teal) */
--accent: #14b8a6
--accent-hover: #0d9488
--accent-active: #0f766e
```

### Effets Visuels

- **Glassmorphism**: `backdrop-filter: blur(12px)` avec opacité 70-80%
- **Gradients**: Dégradés multi-couleurs (indigo → pink → teal)
- **Shadows**: Ombres colorées avec opacité 30% (ex: `shadow-indigo-500/30`)
- **Rounded**: Border-radius généreux (12px, 20px, 9999px pour pills)

### Animations

```css
@keyframes fadeIn        /* 0.3s ease-out */
@keyframes slideInRight  /* 0.3s ease-out */
@keyframes slideInDown   /* 0.3s ease-out */
@keyframes scaleIn       /* 0.2s ease-out */
@keyframes shimmer       /* 2s linear infinite */
```

### Optimisations Mobile

- **Touch targets**: Minimum 44px (iOS Human Interface Guidelines)
- **Safe areas**: Support du notch iPhone avec `env(safe-area-inset-*)`
- **Scrolling**: Momentum scrolling iOS avec `-webkit-overflow-scrolling: touch`
- **Tap highlight**: Désactivé avec `-webkit-tap-highlight-color: transparent`

---

## 📦 Nouveaux Composants UI

### 1. Button (`/src/components/ui/Button.tsx`)

**Variants**:
- `primary`: Gradient indigo avec ombre
- `secondary`: Gradient pink avec ombre
- `accent`: Gradient teal avec ombre
- `ghost`: Fond blanc semi-transparent
- `danger`: Gradient rouge

**Sizes**:
- `sm`: 36px min-height
- `md`: 44px min-height (default, iOS-friendly)
- `lg`: 52px min-height
- `xl`: 60px min-height

**Features**:
- Loading state avec spinner
- Icônes left/right
- Active scale animation (0.95)
- Disabled state avec opacité 50%

**Exemple**:
```tsx
<Button variant="primary" size="md" loading={isLoading}>
  Enregistrer
</Button>
```

---

### 2. Input & Textarea (`/src/components/ui/Input.tsx`)

**Features**:
- Label intégré
- Messages d'erreur et helper text
- Icônes left/right
- Focus ring coloré (indigo par défaut, rouge si erreur)
- Min-height 44px pour touch
- Rounded corners (12px)

**Exemple**:
```tsx
<Input
  label="Email"
  type="email"
  error={errors.email}
  helperText="Format: nom@exemple.fr"
  leftIcon={<EmailIcon />}
  fullWidth
/>

<Textarea
  label="Notes"
  rows={4}
  placeholder="Vos observations..."
/>
```

---

### 3. Card (`/src/components/ui/Card.tsx`)

**Variants**:
- `default`: Fond blanc avec bordure
- `glass`: Glassmorphism avec backdrop-blur
- `gradient`: Gradient subtil (white → indigo-50/30 → pink-50/30)

**Padding**:
- `none`: Pas de padding
- `sm`: 16px
- `md`: 24px (default)
- `lg`: 32px

**Sub-components**:
- `CardHeader`: Header avec espacement
- `CardTitle`: Titre avec tailles (sm, md, lg)
- `CardDescription`: Description en texte secondaire
- `CardContent`: Contenu principal
- `CardFooter`: Footer avec bordure top

**Features**:
- `hoverable`: Effet hover (translate-y, shadow)
- `onClick`: Rend la carte cliquable
- Support du `style` pour animations échelonnées

**Exemple**:
```tsx
<Card variant="glass" hoverable>
  <CardHeader>
    <CardTitle>Patient Jean Dupont</CardTitle>
    <CardDescription>Créé le 3 janvier 2026</CardDescription>
  </CardHeader>
  <CardContent>
    Contenu de la carte...
  </CardContent>
  <CardFooter>
    <Button variant="primary">Voir le dossier</Button>
  </CardFooter>
</Card>
```

---

### 4. Modal (`/src/components/ui/Modal.tsx`)

**Features**:
- Overlay avec backdrop-blur
- Animations (fadeIn + scaleIn)
- Fermeture ESC
- Fermeture au clic sur overlay (optionnel)
- Bouton de fermeture stylisé
- Sticky header
- Scroll dans le contenu
- Prevent body scroll quand ouvert

**Sizes**:
- `sm`: max-w-md
- `md`: max-w-lg (default)
- `lg`: max-w-2xl
- `full`: max-w-full avec marge 4

**Exemple**:
```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirmer l'action"
  size="md"
>
  <p>Êtes-vous sûr de vouloir continuer ?</p>
  <ModalFooter>
    <Button variant="ghost" onClick={() => setIsOpen(false)}>
      Annuler
    </Button>
    <Button variant="primary" onClick={handleConfirm}>
      Confirmer
    </Button>
  </ModalFooter>
</Modal>
```

---

## 🔄 Pages Modernisées

### 1. Page Patients (`/src/app/(app)/patients/page.tsx`)

**Améliorations**:
- ✅ Titre avec gradient multi-couleurs
- ✅ Button "Nouveau patient" avec variant primary
- ✅ Formulaire dans Card gradient avec sections iconifiées
- ✅ Messages (erreur/succès/warning) avec Card glass
- ✅ Cartes patients avec Card glass + hoverable
- ✅ Badges de consentement avec gradients colorés
- ✅ Animations échelonnées sur les cartes (délai 0.05s/0.1s/0.15s...)
- ✅ État vide avec Card glass et call-to-action
- ✅ Tous les inputs remplacés par composant Input/Textarea

**Sections du Formulaire** (avec icônes gradient):
1. 👤 Informations personnelles (indigo)
2. 🏃 Style de vie (pink)
3. 📄 Antécédents médicaux (teal)
4. 📊 Données physiques (purple)
5. ✍️ Notes et consentement (amber)

---

### 2. Page Sessions (`/src/app/(app)/patients/[id]/page.tsx`)

**Améliorations**:
- ✅ Titre avec gradient multi-couleurs
- ✅ Infos patient dans Card glass avec icônes
- ✅ Button "Nouvelle session" avec variant primary
- ✅ Cartes sessions avec Card glass + hoverable
- ✅ Galerie photos avec effet zoom au hover
- ✅ Animations échelonnées
- ✅ État vide moderne
- ✅ Textarea pour notes médicales

**Badges de Statut**:
- Complète: Gradient teal/emerald
- En cours: Gradient amber/orange
- Vide: Gradient slate

---

### 3. Page Capture Photo (`/src/app/(app)/capture/page.tsx`)

**Améliorations**:
- ✅ Titre avec gradient
- ✅ Sélecteur de patient dans Card glass
- ✅ Compteur de photos avec gradient indigo → pink
- ✅ Étapes de progression avec badges colorés
- ✅ Bouton de capture géant (80x80px) avec gradient
- ✅ Instructions numérotées avec badges circulaires
- ✅ Conseils dans Card gradient
- ✅ Interface camera optimisée mobile
- ✅ Upload manuel dans Card glass

**Bouton de Capture**:
- Taille: 80x80px
- Gradient: indigo → pink
- Shadow: glow indigo
- Animation: scale au hover/active
- Position: Centré avec contrôles de chaque côté

---

### 4. Page Mask-Fit (`/src/app/(app)/mask-fit/[sessionId]/page.tsx`)

**Améliorations**:
- ✅ Titre avec gradient
- ✅ Instructions dans Card gradient avec étapes numérotées
- ✅ Zone d'image dans Card glass
- ✅ Slider de zoom stylisé (gradient sur le thumb)
- ✅ Indicateur "Déplacez le masque" lors du drag
- ✅ Boutons Auto-fit et Valider en grille 2 colonnes
- ✅ Curseurs grab/grabbing
- ✅ Touch-friendly (slider thumb 20px)

---

## 📱 Optimisations Mobile

### iPhone / iPad

✅ **Touch Targets**: Tous les boutons respectent le minimum de 44px
✅ **Safe Area**: Support du notch et des bords arrondis
✅ **Orientation**: Responsive pour portrait et paysage
✅ **Scroll**: Momentum scrolling natif iOS
✅ **Gestures**: Drag and drop optimisé pour le tactile

### Breakpoints Tailwind

- `sm:`: 640px (iPhone paysage, petites tablettes)
- `md:`: 768px (iPad portrait)
- `lg:`: 1024px (iPad paysage, laptop)
- `xl:`: 1280px (desktop)

### Grilles Responsives

```tsx
// 1 colonne mobile, 2 colonnes tablet, 3 colonnes desktop
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
```

---

## 🎭 Animations et Transitions

### Animations Échelonnées

Pour donner un effet de "cascade" aux éléments de liste:

```tsx
{items.map((item, index) => (
  <Card
    key={item.id}
    variant="glass"
    style={{ animationDelay: `${index * 0.05}s` }}
    className="animate-fadeIn"
  >
    {/* contenu */}
  </Card>
))}
```

### Classes Utilitaires

```css
.transition-smooth     /* transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1) */
.glass                 /* background + backdrop-blur */
.glass-hover:hover     /* background hover pour glass */
.bg-gradient-primary   /* linear-gradient indigo */
.bg-gradient-secondary /* linear-gradient pink */
.bg-gradient-accent    /* linear-gradient teal */
```

---

## 🧪 Tests à Effectuer

### Desktop (Chrome/Safari/Firefox)

- [ ] Navigation entre les pages
- [ ] Création d'un patient
- [ ] Création d'une session
- [ ] Capture photo
- [ ] Ajustement du masque
- [ ] Animations fluides
- [ ] Hover states fonctionnels

### Mobile (iPhone Safari)

- [ ] Touch targets suffisamment grands (44px)
- [ ] Formulaires faciles à remplir
- [ ] Boutons facilement cliquables
- [ ] Scroll fluide
- [ ] Pas de débordements horizontaux
- [ ] Safe area respectée (pas de contenu sous le notch)
- [ ] Camera fonctionnelle
- [ ] Drag and drop du masque

### Tablette (iPad Safari)

- [ ] Layout adapté (2-3 colonnes selon orientation)
- [ ] Touch gestures fluides
- [ ] Capture photo en paysage
- [ ] Ajustement du masque avec les doigts
- [ ] Clavier n'obstrue pas les champs

---

## 🚀 Prochaines Étapes (Optionnel)

### Composants Additionnels

- [ ] Badge (pour statuts)
- [ ] Alert (pour messages système)
- [ ] Tooltip (pour infos contextuelles)
- [ ] Dropdown/Select (pour menus déroulants)
- [ ] DatePicker (pour sélection de dates)
- [ ] Avatar (pour photos de profil)

### Améliorations Fonctionnelles

- [ ] Mode sombre (dark mode)
- [ ] Transitions entre pages
- [ ] Loading states globaux
- [ ] Toast notifications
- [ ] Gestes swipe pour navigation
- [ ] Pull-to-refresh sur mobile

### Performance

- [ ] Lazy loading des images
- [ ] Code splitting des routes
- [ ] Optimisation des animations (will-change)
- [ ] Service Worker pour offline

---

## 📝 Notes de Développement

### Conventions de Code

- **Composants**: PascalCase (`Button.tsx`, `Card.tsx`)
- **Fichiers utilitaires**: camelCase (`designSystem.css`)
- **Variants**: snake_case pour enum (`"primary"`, `"secondary"`)
- **Props**: camelCase (`fullWidth`, `iconPosition`)

### Structure des Fichiers

```
webapp/
├── src/
│   ├── app/
│   │   ├── globals.css           # Design system + animations
│   │   ├── (app)/
│   │   │   ├── patients/
│   │   │   │   ├── page.tsx      # Liste patients ✅
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx  # Sessions ✅
│   │   │   └── capture/
│   │   │       └── page.tsx      # Capture photo ✅
│   │   └── mask-fit/
│   │       └── [sessionId]/
│   │           └── page.tsx      # Ajustement masque ✅
│   └── components/
│       └── ui/
│           ├── Button.tsx        # Nouveau ✅
│           ├── Input.tsx         # Nouveau ✅
│           ├── Card.tsx          # Nouveau ✅
│           └── Modal.tsx         # Nouveau ✅
└── REFONTE_DESIGN_MODERNE.md     # Ce fichier
```

### Variables CSS Importantes

Toujours utiliser les variables CSS pour la cohérence:

```tsx
// ❌ Mauvais
<div className="bg-indigo-600">

// ✅ Bon
<div className="bg-[var(--primary)]">

// ✅ Ou mieux avec Tailwind
<div className="bg-indigo-600">  // OK car cohérent avec le design system
```

---

## 🐛 Dépannage

### Animations ne fonctionnent pas

Vérifier que `globals.css` est bien importé dans le layout principal.

### Touch targets trop petits

Toujours utiliser le composant `Button` ou définir `min-h-[44px]`.

### Glassmorphism invisible

Vérifier que l'élément parent a un fond (couleur ou image).

### Style écrasé par Tailwind

Augmenter la spécificité ou utiliser `!important` en dernier recours.

---

## 📚 Ressources

- [Tailwind CSS](https://tailwindcss.com/docs)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)
- [MDN - CSS Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations)
- [Web.dev - Mobile UX](https://web.dev/mobile-ux/)

---

**Dernière mise à jour**: 3 janvier 2026
**Version**: 1.0.0
**Auteur**: Claude Sonnet 4.5
