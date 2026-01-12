"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

import { supabaseBrowser } from "@/lib/supabase/client";
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input";

/**
 * Fonction pour mettre en gras les mots-clés importants dans le texte
 */
function highlightKeywords(text: string): React.ReactNode {
  const keywords = [
    // Termes de texture
    "texture", "pores", "grain de peau", "lisse", "rugueuse", "fine", "épaisse",
    // Termes d'hydratation
    "hydratation", "hydratée", "déshydratation", "sèche", "sécheresse",
    // Termes de tonus
    "tonus", "fermeté", "relâchement", "ptose", "affaissement", "élasticité",
    // Termes de pigmentation
    "pigmentation", "taches", "hyperpigmentation", "teint", "uniformité",
    // Termes de rides
    "rides", "ridules", "plis", "sillon", "expression", "statique", "dynamique",
    // Termes vasculaires
    "vascularisation", "rougeurs", "couperose", "cernes",
    // Termes de volume
    "volume", "projection", "creux", "poches", "bajoues",
    // Zones anatomiques
    "front", "glabellaire", "temporal", "péri-orbitaire", "malaire", "nasal",
    "naso-labial", "péri-oral", "labial", "mentonnier", "mandibulaire", "cervical",
    "sourcils", "paupière", "pommette", "menton", "mâchoire", "cou",
    // Qualificatifs importants
    "marqué", "prononcé", "léger", "modéré", "important", "visible", "naissant",
    "satisfaisant", "optimal", "correct", "irrégulier",
    // Traitements
    "raffermissant", "hydratant", "anti-âge", "lissant", "tenseur", "repulpant"
  ];

  // Créer une regex pour tous les mots-clés (insensible à la casse)
  const pattern = new RegExp(`\\b(${keywords.join("|")})e?s?\\b`, "gi");
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Ajouter le texte avant le match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // Ajouter le mot-clé en gras
    parts.push(
      <strong key={match.index} className="font-semibold text-gray-900">
        {match[0]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  // Ajouter le reste du texte
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

/**
 * Fonction pour formater les messages du chat avec mise en forme améliorée
 */
function formatChatMessage(text: string): React.ReactNode {
  if (!text) return text;

  const parts: React.ReactNode[] = [];
  const lines = text.split('\n');

  lines.forEach((line, lineIndex) => {
    if (!line.trim()) {
      // Ligne vide - ajouter de l'espace
      parts.push(<br key={`br-${lineIndex}`} />);
      return;
    }

    // Détecter les titres/sections (lignes se terminant par :)
    if (line.trim().endsWith(':') && line.length < 100) {
      parts.push(
        <div key={`title-${lineIndex}`} className="mt-3 mb-1 font-bold text-emerald-800">
          {line}
        </div>
      );
      return;
    }

    // Détecter les listes numérotées (1., 2., etc.)
    const numberMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberMatch) {
      const [, number, content] = numberMatch;
      parts.push(
        <div key={`num-${lineIndex}`} className="mt-2 flex gap-2">
          <span className="font-bold text-emerald-700 flex-shrink-0">{number}.</span>
          <span>{highlightKeywords(content)}</span>
        </div>
      );
      return;
    }

    // Détecter les listes à puces (-, •, *)
    const bulletMatch = line.match(/^[\s]*[-•*]\s+(.+)/);
    if (bulletMatch) {
      const content = bulletMatch[1];
      parts.push(
        <div key={`bullet-${lineIndex}`} className="mt-1 flex gap-2 ml-4">
          <span className="text-emerald-600 flex-shrink-0">•</span>
          <span>{highlightKeywords(content)}</span>
        </div>
      );
      return;
    }

    // Ligne normale
    parts.push(
      <div key={`line-${lineIndex}`} className="mt-2">
        {highlightKeywords(line)}
      </div>
    );
  });

  return <>{parts}</>;
}

/**
 * Configuration des traitements de médecine esthétique faciale
 * avec prompts optimisés pour Nano Banana Pro
 */
const AESTHETIC_TREATMENTS = [
  // === INJECTIONS ACIDE HYALURONIQUE ===
  {
    id: "ha_lips",
    label: "Injection acide hyaluronique - Lèvres",
    category: "Acide Hyaluronique",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "subtile augmentation de 0.5ml, contours naturels, volumes discrets",
        2: "augmentation modérée de 1ml, définition améliorée, hydratation visible",
        3: "augmentation prononcée de 1.5-2ml, volumes bien définis, projection marquée"
      };
      return `Photo portrait médical : augmentation volumétrique des lèvres par acide hyaluronique. ${intensityMap[intensity as 1|2|3]}. Maintenir symétrie et proportions faciales. Résultat naturel, texture lisse, sans déformation. Même personne, même angle, même éclairage. Rendu photoréaliste médical.`;
    }
  },
  {
    id: "ha_cheeks",
    label: "Injection acide hyaluronique - Pommettes",
    category: "Acide Hyaluronique",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "restauration subtile volume malaire, projection légère",
        2: "augmentation modérée zone malaire, définition osseuse améliorée",
        3: "restructuration prononcée pommettes, projection haute visible"
      };
      return `Photo portrait médical : injection acide hyaluronique zone malaire. ${intensityMap[intensity as 1|2|3]}. Respecter architecture osseuse naturelle, symétrie faciale préservée. Résultat harmonieux sans excès. Même personne, même angle. Photoréalisme médical.`;
    }
  },
  {
    id: "ha_jawline",
    label: "Injection acide hyaluronique - Jawline",
    category: "Acide Hyaluronique",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "définition subtile ligne mandibulaire, angle discret",
        2: "restructuration modérée jawline, angulation visible",
        3: "définition prononcée contour mandibulaire, angle marqué"
      };
      return `Photo portrait médical : injection acide hyaluronique ligne mandibulaire. ${intensityMap[intensity as 1|2|3]}. Définition contour inférieur visage, symétrie bilatérale. Résultat masculinisant ou féminisant selon morphologie. Photoréalisme médical.`;
    }
  },
  {
    id: "ha_nasolabial",
    label: "Injection acide hyaluronique - Sillons nasogéniens",
    category: "Acide Hyaluronique",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "atténuation subtile plis nasogéniens, comblement léger",
        2: "correction modérée sillons, atténuation visible des plis",
        3: "comblement prononcé, effacement marqué des sillons"
      };
      return `Photo portrait médical : injection acide hyaluronique sillons nasogéniens. ${intensityMap[intensity as 1|2|3]}. Atténuation plis sans aplatissement excessif, maintien expressions naturelles. Photoréalisme médical.`;
    }
  },
  {
    id: "ha_tear_trough",
    label: "Injection acide hyaluronique - Cernes/Vallée des larmes",
    category: "Acide Hyaluronique",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "comblement subtil vallée lacrymale, atténuation cernes",
        2: "correction modérée creux sous-orbitaire, regard reposé",
        3: "comblement prononcé, effacement marqué cernes et creux"
      };
      return `Photo portrait médical : injection acide hyaluronique vallée lacrymale. ${intensityMap[intensity as 1|2|3]}. Atténuation cernes et creux sous-orbitaires, regard rajeuni sans effet Tyndall. Photoréalisme médical.`;
    }
  },
  {
    id: "ha_temples",
    label: "Injection acide hyaluronique - Tempes",
    category: "Acide Hyaluronique",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "restauration subtile volume temporal, légère convexité",
        2: "augmentation modérée tempes, correction creusement visible",
        3: "restauration prononcée volume temporal, rajeunissement marqué"
      };
      return `Photo portrait médical : injection acide hyaluronique région temporale. ${intensityMap[intensity as 1|2|3]}. Restauration volume perdu, correction creusement temporal. Résultat harmonieux avec tiers supérieur. Photoréalisme médical.`;
    }
  },
  {
    id: "ha_chin",
    label: "Injection acide hyaluronique - Menton",
    category: "Acide Hyaluronique",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "projection subtile menton, définition légère",
        2: "augmentation modérée, meilleure projection antérieure",
        3: "projection prononcée, définition marquée du menton"
      };
      return `Photo portrait médical : injection acide hyaluronique menton. ${intensityMap[intensity as 1|2|3]}. Amélioration projection et définition, équilibre profil facial. Résultat harmonieux. Photoréalisme médical.`;
    }
  },
  {
    id: "ha_marionette",
    label: "Injection acide hyaluronique - Plis d'amertume",
    category: "Acide Hyaluronique",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "atténuation subtile plis commissures, légère amélioration",
        2: "correction modérée plis d'amertume, rajeunissement visible",
        3: "comblement prononcé, effacement marqué aspect triste"
      };
      return `Photo portrait médical : injection acide hyaluronique plis d'amertume. ${intensityMap[intensity as 1|2|3]}. Atténuation plis commissures labiales, correction aspect triste. Expression plus détendue. Photoréalisme médical.`;
    }
  },

  // === TOXINE BOTULIQUE ===
  {
    id: "botox_forehead",
    label: "Toxine botulique - Rides frontales",
    category: "Toxine Botulique",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "atténuation subtile rides horizontales front, mobilité préservée",
        2: "lissage modéré rides frontales, front détendu naturel",
        3: "lissage prononcé, front lisse au repos et en mouvement"
      };
      return `Photo portrait médical : traitement toxine botulique front. ${intensityMap[intensity as 1|2|3]}. Réduction rides horizontales sans effet figé. Expressions naturelles préservées. Photoréalisme médical.`;
    }
  },
  {
    id: "botox_glabella",
    label: "Toxine botulique - Rides glabellaires (lion)",
    category: "Toxine Botulique",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "atténuation subtile rides inter-sourcilières, détente légère",
        2: "lissage modéré région glabellaire, expression détendue",
        3: "lissage prononcé, effacement marqué rides du lion"
      };
      return `Photo portrait médical : traitement toxine botulique glabelle. ${intensityMap[intensity as 1|2|3]}. Atténuation rides inter-sourcilières, regard adouci. Expression moins sévère. Photoréalisme médical.`;
    }
  },
  {
    id: "botox_crowsfeet",
    label: "Toxine botulique - Pattes d'oie",
    category: "Toxine Botulique",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "atténuation subtile rides péri-orbitaires latérales, sourire naturel",
        2: "lissage modéré pattes d'oie, regard rajeuni",
        3: "lissage prononcé contour externe yeux, effacement rides"
      };
      return `Photo portrait médical : traitement toxine botulique pattes d'oie. ${intensityMap[intensity as 1|2|3]}. Atténuation rides péri-orbitaires, regard ouvert et reposé. Sourire naturel préservé. Photoréalisme médical.`;
    }
  },
  {
    id: "botox_bunny",
    label: "Toxine botulique - Rides du lapin",
    category: "Toxine Botulique",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "atténuation subtile rides nasales transverses",
        2: "lissage modéré rides du lapin, harmonie nasale",
        3: "lissage prononcé rides transverses nez"
      };
      return `Photo portrait médical : traitement toxine botulique rides du lapin. ${intensityMap[intensity as 1|2|3]}. Atténuation rides transverses racine nasale. Résultat discret. Photoréalisme médical.`;
    }
  },
  {
    id: "botox_lip_flip",
    label: "Toxine botulique - Lip flip",
    category: "Toxine Botulique",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "éversion subtile lèvre supérieure, ourlet léger",
        2: "lip flip modéré, lèvre supérieure plus visible",
        3: "éversion prononcée, ourlet marqué lèvre supérieure"
      };
      return `Photo portrait médical : lip flip par toxine botulique. ${intensityMap[intensity as 1|2|3]}. Éversion lèvre supérieure sans volume ajouté. Résultat naturel, sourire préservé. Photoréalisme médical.`;
    }
  },
  {
    id: "botox_neck",
    label: "Toxine botulique - Bandes platysmales",
    category: "Toxine Botulique",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "atténuation subtile bandes cervicales, détente légère",
        2: "relaxation modérée platysma, cou plus lisse",
        3: "relaxation prononcée, effacement bandes platysmales"
      };
      return `Photo portrait médical : traitement toxine botulique platysma. ${intensityMap[intensity as 1|2|3]}. Atténuation bandes cervicales, cou rajeuni. Contour cervical amélioré. Photoréalisme médical.`;
    }
  },
  {
    id: "botox_gummy_smile",
    label: "Toxine botulique - Sourire gingival",
    category: "Toxine Botulique",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "réduction subtile exposition gingivale au sourire",
        2: "correction modérée sourire gingival, harmonie améliorée",
        3: "réduction prononcée exposition gencive supérieure"
      };
      return `Photo portrait médical : traitement toxine botulique sourire gingival. ${intensityMap[intensity as 1|2|3]}. Réduction exposition gingivale, sourire plus harmonieux. Expressions naturelles. Photoréalisme médical.`;
    }
  },
  {
    id: "botox_masseter",
    label: "Toxine botulique - Masséters (slim face)",
    category: "Toxine Botulique",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "amincissement subtil tiers inférieur, définition légère",
        2: "réduction modérée volume masséter, visage affiné",
        3: "amincissement prononcé, visage en V marqué"
      };
      return `Photo portrait médical : traitement toxine botulique masséters. ${intensityMap[intensity as 1|2|3]}. Amincissement tiers inférieur visage, contour affiné. Effet slimming naturel. Photoréalisme médical.`;
    }
  },

  // === SKINBOOSTERS & MESOTHERAPIE ===
  {
    id: "skinbooster_face",
    label: "Skinbooster - Visage complet",
    category: "Skinboosters",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "amélioration subtile éclat et hydratation cutanée",
        2: "amélioration modérée texture, hydratation visible, glow naturel",
        3: "amélioration prononcée qualité peau, éclat marqué, texture lissée"
      };
      return `Photo portrait médical : traitement skinbooster visage. ${intensityMap[intensity as 1|2|3]}. Amélioration texture, hydratation, éclat cutané. Peau rebondie et lumineuse. Grain de peau affiné. Photoréalisme médical.`;
    }
  },
  {
    id: "mesotherapy_face",
    label: "Mésothérapie - Revitalisation faciale",
    category: "Mésothérapie",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "revitalisation subtile, teint légèrement unifié",
        2: "revitalisation modérée, éclat visible, teint homogène",
        3: "revitalisation prononcée, peau éclatante, texture optimisée"
      };
      return `Photo portrait médical : mésothérapie revitalisante faciale. ${intensityMap[intensity as 1|2|3]}. Amélioration éclat, uniformisation teint, hydratation profonde. Peau revitalisée. Photoréalisme médical.`;
    }
  },

  // === FILS TENSEURS ===
  {
    id: "threads_lower_face",
    label: "Fils tenseurs - Ovale du visage",
    category: "Fils Tenseurs",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "redéfinition subtile ovale, légère amélioration contours",
        2: "lifting modéré tiers inférieur, ovale redéfini",
        3: "lifting prononcé, redéfinition marquée jawline et ovale"
      };
      return `Photo portrait médical : fils tenseurs ovale du visage. ${intensityMap[intensity as 1|2|3]}. Redéfinition contours, lifting tiers inférieur sans chirurgie. Résultat naturel. Photoréalisme médical.`;
    }
  },
  {
    id: "threads_midface",
    label: "Fils tenseurs - Tiers moyen",
    category: "Fils Tenseurs",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "lifting subtil zone malaire, légère remontée",
        2: "lifting modéré tiers moyen, pommettes rehaussées",
        3: "lifting prononcé, rajeunissement marqué tiers moyen"
      };
      return `Photo portrait médical : fils tenseurs tiers moyen. ${intensityMap[intensity as 1|2|3]}. Remontée pommettes, atténuation relâchement, rajeunissement harmonieux. Photoréalisme médical.`;
    }
  },
  {
    id: "threads_neck",
    label: "Fils tenseurs - Cou",
    category: "Fils Tenseurs",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "amélioration subtile tonicité cervicale",
        2: "lifting modéré cou, peau plus tendue",
        3: "lifting prononcé cervical, redéfinition angle cervico-mentonnier"
      };
      return `Photo portrait médical : fils tenseurs cervicaux. ${intensityMap[intensity as 1|2|3]}. Amélioration tonicité cou, atténuation relâchement cutané. Contour cervical rajeuni. Photoréalisme médical.`;
    }
  },

  // === LASERS & TECHNOLOGIES ÉNERGÉTIQUES ===
  {
    id: "laser_pigment",
    label: "Laser pigmentaire - Taches brunes",
    category: "Lasers",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "atténuation subtile hyperpigmentation, teint légèrement unifié",
        2: "réduction modérée taches pigmentaires, uniformisation visible",
        3: "effacement prononcé lentigos et taches, teint homogène"
      };
      return `Photo portrait médical : traitement laser pigmentaire. ${intensityMap[intensity as 1|2|3]}. Atténuation taches brunes, lentigos, hyperpigmentation. Teint unifié et lumineux. Photoréalisme médical.`;
    }
  },
  {
    id: "laser_vascular",
    label: "Laser vasculaire - Couperose/Rougeurs",
    category: "Lasers",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "atténuation subtile rougeurs et télangiectasies",
        2: "réduction modérée couperose, teint apaisé",
        3: "effacement prononcé vaisseaux dilatés, teint uniforme"
      };
      return `Photo portrait médical : traitement laser vasculaire. ${intensityMap[intensity as 1|2|3]}. Atténuation couperose, rougeurs, télangiectasies. Teint homogène sans rougeurs. Photoréalisme médical.`;
    }
  },
  {
    id: "laser_resurfacing",
    label: "Laser fractionné - Resurfacing",
    category: "Lasers",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "amélioration subtile texture, lissage léger",
        2: "resurfacing modéré, texture améliorée, pores affinés",
        3: "resurfacing prononcé, peau lissée, cicatrices atténuées"
      };
      return `Photo portrait médical : laser fractionné resurfacing. ${intensityMap[intensity as 1|2|3]}. Amélioration texture cutanée, atténuation cicatrices, pores affinés. Peau lissée. Photoréalisme médical.`;
    }
  },
  {
    id: "rf_microneedling",
    label: "Radiofréquence micro-needling",
    category: "Technologies énergétiques",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "amélioration subtile fermeté et texture",
        2: "raffermissement modéré, tonicité améliorée",
        3: "raffermissement prononcé, peau visiblement retendue"
      };
      return `Photo portrait médical : radiofréquence fractionnée micro-needling. ${intensityMap[intensity as 1|2|3]}. Raffermissement cutané, amélioration texture et tonicité. Résultat tenseur naturel. Photoréalisme médical.`;
    }
  },
  {
    id: "hifu_lifting",
    label: "HIFU - Lifting par ultrasons",
    category: "Technologies énergétiques",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "lifting subtil profond, amélioration légère tonicité",
        2: "lifting modéré SMAS, redéfinition contours visible",
        3: "lifting prononcé, effet tenseur marqué"
      };
      return `Photo portrait médical : HIFU lifting ultrasonique. ${intensityMap[intensity as 1|2|3]}. Lifting profond sans chirurgie, redéfinition ovale, raffermissement marqué. Photoréalisme médical.`;
    }
  },

  // === PEELINGS ===
  {
    id: "peeling_superficial",
    label: "Peeling superficiel - Éclat",
    category: "Peelings",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "amélioration subtile éclat et uniformité teint",
        2: "effet glow modéré, teint lumineux et unifié",
        3: "éclat prononcé, peau lumineuse, texture affinée"
      };
      return `Photo portrait médical : peeling superficiel. ${intensityMap[intensity as 1|2|3]}. Amélioration éclat cutané, uniformisation teint, texture affinée. Effet bonne mine. Photoréalisme médical.`;
    }
  },
  {
    id: "peeling_medium",
    label: "Peeling moyen - Anti-âge",
    category: "Peelings",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "atténuation subtile ridules et irrégularités",
        2: "amélioration modérée rides, taches, texture",
        3: "rajeunissement prononcé, peau lissée, teint uniforme"
      };
      return `Photo portrait médical : peeling moyen. ${intensityMap[intensity as 1|2|3]}. Atténuation rides, taches, irrégularités. Renouvellement cutané visible. Photoréalisme médical.`;
    }
  },

  // === TRAITEMENTS COMBINÉS ===
  {
    id: "combo_liquid_facelift",
    label: "Liquid Facelift - Rajeunissement global",
    category: "Traitements combinés",
    promptTemplate: (intensity: number) => {
      const intensityMap = {
        1: "rajeunissement subtil multi-zones, harmonisation douce",
        2: "liquid facelift modéré, restauration volumes et traits",
        3: "rajeunissement prononcé, transformation harmonieuse globale"
      };
      return `Photo portrait médical : liquid facelift combiné. ${intensityMap[intensity as 1|2|3]}. Rajeunissement global par injections multi-zones, restauration volumes, atténuation rides. Résultat harmonieux naturel. Photoréalisme médical.`;
    }
  }
] as const;

type PhotoRow = {
  id: string;
  storage_path: string;
  created_at: string;
  angle?: string;
};

type SessionPhoto = PhotoRow & {
  angle: string;
  signedUrl: string;
};

type FaceLandmark = {
  x: number;
  y: number;
  z?: number;
};

type ZoneShape = {
  id: string;
  label: string;
  points: { x: number; y: number }[];
  labelX: number;
  labelY: number;
  color: string;
};

type GlobalAnalysis = {
  id: string;
  result: {
    summary?: string;
    globalObservations?: string[];
    regionalAnalysis?: {
      upperFace?: string;
      midFace?: string;
      lowerFace?: string;
    };
    agingConcerns?: string[];
    strengths?: string[];
    globalRecommendations?: string[];
    disclaimer?: string;
    raw?: string;
  };
  created_at: string;
};

const REQUIRED_ANGLES = [
  "face",
  "three_quarter_left",
  "three_quarter_right",
  "profile_left",
  "profile_right",
];

const ANGLE_LABELS: Record<string, string> = {
  face: "Face",
  three_quarter_left: "3/4 gauche",
  three_quarter_right: "3/4 droit",
  profile_left: "Profil gauche",
  profile_right: "Profil droit",
};

const ZONE_COLORS = [
  "#22c55e",
  "#38bdf8",
  "#f97316",
  "#e879f9",
  "#facc15",
  "#fb7185",
  "#60a5fa",
  "#34d399",
];

const FACE_OVAL_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379,
  378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
  162, 21, 54, 103, 67, 109,
];

const LEFT_EYE_INDICES = [
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
];

const RIGHT_EYE_INDICES = [
  263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466,
];

const MOUTH_OUTER_INDICES = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308,
];

const NOSE_INDICES = [1, 2, 98, 327, 168, 197, 5, 4, 45, 275, 279, 48, 358, 129];

const LEFT_CHEEK_INDICES = [234, 93, 132, 58, 172, 136, 150];
const RIGHT_CHEEK_INDICES = [454, 323, 361, 288, 397, 365, 379];
const CHIN_INDICES = [152, 148, 176, 149, 150, 136, 172];
const JAW_LEFT_INDICES = [172, 136, 150, 149, 176, 148, 152];
const JAW_RIGHT_INDICES = [397, 365, 379, 378, 400, 377, 152];
const BROW_INDICES = [70, 63, 105, 66, 107, 336, 296, 334, 293, 300];

function clampZone(value: number) {
  return Math.min(Math.max(value, 0), 100);
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function pickPoint(landmarks: FaceLandmark[], index: number) {
  const point = landmarks[index];
  if (!point) {
    return null;
  }
  return { x: point.x * 100, y: point.y * 100 };
}

function pointsFromIndices(landmarks: FaceLandmark[], indices: number[]) {
  return indices
    .map((index) => pickPoint(landmarks, index))
    .filter((point): point is { x: number; y: number } => Boolean(point));
}

function centroid(points: { x: number; y: number }[]) {
  const sum = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 }
  );
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function sortPoints(points: { x: number; y: number }[]) {
  const center = centroid(points);
  return [...points].sort((a, b) => {
    const angleA = Math.atan2(a.y - center.y, a.x - center.x);
    const angleB = Math.atan2(b.y - center.y, b.x - center.x);
    return angleA - angleB;
  });
}

function ellipseToPolygon(cx: number, cy: number, rx: number, ry: number, segments = 16) {
  const points = Array.from({ length: segments }, (_, index) => {
    const angle = (Math.PI * 2 * index) / segments;
    return {
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
    };
  });
  return points.map((point) => ({
    x: clampZone(point.x),
    y: clampZone(point.y),
  }));
}

function buildPolygonFromIndices(landmarks: FaceLandmark[], indices: number[]) {
  const points = pointsFromIndices(landmarks, indices);
  if (points.length < 3) {
    return null;
  }
  return sortPoints(points).map((point) => ({
    x: clampZone(point.x),
    y: clampZone(point.y),
  }));
}

function createZone(
  id: string,
  label: string,
  points: { x: number; y: number }[] | null,
  fallback: { cx: number; cy: number; rx: number; ry: number },
  color: string
): ZoneShape | null {
  const resolvedPoints =
    points && points.length >= 3
      ? points
      : ellipseToPolygon(fallback.cx, fallback.cy, fallback.rx, fallback.ry);
  if (resolvedPoints.length < 3) {
    return null;
  }
  const center = centroid(resolvedPoints);
  return {
    id,
    label,
    points: resolvedPoints,
    labelX: clampZone(center.x),
    labelY: clampZone(center.y),
    color,
  };
}

function buildLandmarkInsert(face: FaceLandmark[], photoId: string, sessionId: string) {
  const pick = (index: number) => face[index] ?? face[0];
  const leftEye = pick(33);
  const rightEye = pick(263);
  const noseTip = pick(1);
  const mouthLeft = pick(61);
  const mouthRight = pick(291);
  const chin = pick(152);
  const forehead = pick(10);
  const leftTemple = pick(127);
  const rightTemple = pick(356);
  const leftJaw = pick(172);
  const rightJaw = pick(397);
  const leftCheek = pick(234);
  const rightCheek = pick(454);

  const eyeDistance = Math.sqrt(
    Math.pow((rightEye.x - leftEye.x) * 100, 2) +
      Math.pow((rightEye.y - leftEye.y) * 100, 2)
  );
  const noseWidth = Math.sqrt(
    Math.pow((pick(129).x - pick(358).x) * 100, 2) +
      Math.pow((pick(129).y - pick(358).y) * 100, 2)
  );
  const mouthWidth = Math.sqrt(
    Math.pow((mouthRight.x - mouthLeft.x) * 100, 2) +
      Math.pow((mouthRight.y - mouthLeft.y) * 100, 2)
  );
  const faceWidthAtCheeks = Math.sqrt(
    Math.pow((rightCheek.x - leftCheek.x) * 100, 2) +
      Math.pow((rightCheek.y - leftCheek.y) * 100, 2)
  );
  const faceWidthAtTemples = Math.sqrt(
    Math.pow((rightTemple.x - leftTemple.x) * 100, 2) +
      Math.pow((rightTemple.y - leftTemple.y) * 100, 2)
  );
  const faceWidthAtJaw = Math.sqrt(
    Math.pow((rightJaw.x - leftJaw.x) * 100, 2) +
      Math.pow((rightJaw.y - leftJaw.y) * 100, 2)
  );
  const faceHeight = Math.sqrt(
    Math.pow((chin.x - forehead.x) * 100, 2) +
      Math.pow((chin.y - forehead.y) * 100, 2)
  );

  return {
    photo_id: photoId,
    session_id: sessionId,
    landmarks: face.map((point) => ({ x: point.x, y: point.y, z: point.z })),
    left_eye: { x: leftEye.x * 100, y: leftEye.y * 100 },
    right_eye: { x: rightEye.x * 100, y: rightEye.y * 100 },
    nose_tip: { x: noseTip.x * 100, y: noseTip.y * 100 },
    mouth_left: { x: mouthLeft.x * 100, y: mouthLeft.y * 100 },
    mouth_right: { x: mouthRight.x * 100, y: mouthRight.y * 100 },
    chin: { x: chin.x * 100, y: chin.y * 100 },
    face_width: Math.max(faceWidthAtCheeks, faceWidthAtTemples, faceWidthAtJaw),
    face_height: faceHeight,
    eye_distance: eyeDistance,
    nose_width: noseWidth,
    mouth_width: mouthWidth,
    bbox_x: 0,
    bbox_y: 0,
    bbox_width: 100,
    bbox_height: 100,
    confidence: 1.0,
    detection_method: "mediapipe",
    model_version: "1.0.0",
  };
}

function buildFaceZones(landmarks: FaceLandmark[]) {
  const leftEye = pickPoint(landmarks, 33);
  const rightEye = pickPoint(landmarks, 263);
  const noseTip = pickPoint(landmarks, 1);
  const mouthLeft = pickPoint(landmarks, 61);
  const mouthRight = pickPoint(landmarks, 291);
  const mouthUpper = pickPoint(landmarks, 13);
  const mouthLower = pickPoint(landmarks, 14);
  const chin = pickPoint(landmarks, 152);
  const forehead = pickPoint(landmarks, 10);
  const leftCheek = pickPoint(landmarks, 234);
  const rightCheek = pickPoint(landmarks, 454);
  const leftJaw = pickPoint(landmarks, 172);
  const rightJaw = pickPoint(landmarks, 397);
  const noseLeft = pickPoint(landmarks, 129);
  const noseRight = pickPoint(landmarks, 358);

  if (!leftEye || !rightEye || !noseTip || !mouthLeft || !mouthRight || !chin || !forehead) {
    return [];
  }

  const eyeCenter = {
    x: (leftEye.x + rightEye.x) / 2,
    y: (leftEye.y + rightEye.y) / 2,
  };
  const eyeDistance = distance(leftEye, rightEye);
  const faceHeight = distance(forehead, chin);
  const mouthCenter = {
    x: (mouthLeft.x + mouthRight.x) / 2,
    y: ((mouthUpper?.y ?? mouthLeft.y) + (mouthLower?.y ?? mouthRight.y)) / 2,
  };
  const noseCenter = {
    x: noseTip.x,
    y: (eyeCenter.y + (mouthUpper?.y ?? mouthCenter.y)) / 2,
  };
  const noseWidth = noseLeft && noseRight ? distance(noseLeft, noseRight) : eyeDistance * 0.55;
  const mouthWidth = distance(mouthLeft, mouthRight);

  const upperFacePoints = pointsFromIndices(landmarks, FACE_OVAL_INDICES).filter(
    (point) => point.y <= eyeCenter.y + eyeDistance * 0.12
  );
  const browPoints = pointsFromIndices(landmarks, BROW_INDICES);
  const frontalPoints =
    upperFacePoints.length + browPoints.length >= 3
      ? sortPoints([...upperFacePoints, ...browPoints])
      : null;

  const zones = [
    createZone(
      "frontal",
      "Zone frontale",
      frontalPoints,
      {
        cx: eyeCenter.x,
        cy: clampZone(forehead.y + (eyeCenter.y - forehead.y) * 0.45),
        rx: eyeDistance * 1.2,
        ry: Math.max((eyeCenter.y - forehead.y) * 0.6, faceHeight * 0.14),
      },
      ZONE_COLORS[0]
    ),
    createZone(
      "glabella",
      "Zone glabellaire",
      buildPolygonFromIndices(landmarks, [...BROW_INDICES, 168, 6, 197]),
      {
        cx: eyeCenter.x,
        cy: eyeCenter.y - eyeDistance * 0.15,
        rx: eyeDistance * 0.32,
        ry: eyeDistance * 0.22,
      },
      ZONE_COLORS[1]
    ),
    createZone(
      "peri_orbital_left",
      "Contour oeil gauche",
      buildPolygonFromIndices(landmarks, LEFT_EYE_INDICES),
      {
        cx: leftEye.x,
        cy: leftEye.y,
        rx: eyeDistance * 0.42,
        ry: eyeDistance * 0.28,
      },
      ZONE_COLORS[2]
    ),
    createZone(
      "peri_orbital_right",
      "Contour oeil droit",
      buildPolygonFromIndices(landmarks, RIGHT_EYE_INDICES),
      {
        cx: rightEye.x,
        cy: rightEye.y,
        rx: eyeDistance * 0.42,
        ry: eyeDistance * 0.28,
      },
      ZONE_COLORS[3]
    ),
    createZone(
      "nasal",
      "Zone nasale",
      buildPolygonFromIndices(landmarks, NOSE_INDICES),
      {
        cx: noseCenter.x,
        cy: noseCenter.y,
        rx: noseWidth * 0.85,
        ry: faceHeight * 0.16,
      },
      ZONE_COLORS[4]
    ),
    leftCheek && rightCheek
      ? createZone(
          "malar_left",
          "Pommette gauche",
          buildPolygonFromIndices(landmarks, LEFT_CHEEK_INDICES),
          {
            cx: leftCheek.x,
            cy: leftCheek.y,
            rx: eyeDistance * 0.55,
            ry: eyeDistance * 0.35,
          },
          ZONE_COLORS[5]
        )
      : null,
    leftCheek && rightCheek
      ? createZone(
          "malar_right",
          "Pommette droite",
          buildPolygonFromIndices(landmarks, RIGHT_CHEEK_INDICES),
          {
            cx: rightCheek.x,
            cy: rightCheek.y,
            rx: eyeDistance * 0.55,
            ry: eyeDistance * 0.35,
          },
          ZONE_COLORS[6]
        )
      : null,
    createZone(
      "perioral",
      "Zone peri-orale",
      buildPolygonFromIndices(landmarks, MOUTH_OUTER_INDICES),
      {
        cx: mouthCenter.x,
        cy: (mouthUpper?.y ?? mouthCenter.y) +
          (mouthLower ? (mouthLower.y - (mouthUpper?.y ?? mouthCenter.y)) * 0.5 : 0),
        rx: mouthWidth * 0.65,
        ry: Math.max(mouthWidth * 0.28, faceHeight * 0.08),
      },
      ZONE_COLORS[7]
    ),
    createZone(
      "chin",
      "Menton",
      buildPolygonFromIndices(landmarks, CHIN_INDICES),
      {
        cx: chin.x,
        cy: chin.y - faceHeight * 0.08,
        rx: mouthWidth * 0.5,
        ry: faceHeight * 0.12,
      },
      ZONE_COLORS[0]
    ),
    leftJaw
      ? createZone(
          "mandibular_left",
          "Mâchoire gauche",
          buildPolygonFromIndices(landmarks, JAW_LEFT_INDICES),
          {
            cx: leftJaw.x,
            cy: leftJaw.y - faceHeight * 0.04,
            rx: eyeDistance * 0.45,
            ry: faceHeight * 0.12,
          },
          ZONE_COLORS[1]
        )
      : null,
    rightJaw
      ? createZone(
          "mandibular_right",
          "Mâchoire droite",
          buildPolygonFromIndices(landmarks, JAW_RIGHT_INDICES),
          {
            cx: rightJaw.x,
            cy: rightJaw.y - faceHeight * 0.04,
            rx: eyeDistance * 0.45,
            ry: faceHeight * 0.12,
          },
          ZONE_COLORS[2]
        )
      : null,
  ];

  return zones.filter((zone): zone is ZoneShape => Boolean(zone));
}

function filterZonesByAngle(zones: ZoneShape[], angle?: string | null) {
  if (!angle || angle === "face") {
    return zones;
  }
  const leftOnly = new Set(["peri_orbital_left", "malar_left", "mandibular_left"]);
  const rightOnly = new Set(["peri_orbital_right", "malar_right", "mandibular_right"]);
  const shared = new Set(["nasal", "perioral", "chin"]);
  const frontalShared = new Set(["frontal", "glabella"]);

  if (angle === "three_quarter_left") {
    return zones.filter(
      (zone) => leftOnly.has(zone.id) || shared.has(zone.id) || frontalShared.has(zone.id)
    );
  }
  if (angle === "three_quarter_right") {
    return zones.filter(
      (zone) => rightOnly.has(zone.id) || shared.has(zone.id) || frontalShared.has(zone.id)
    );
  }
  if (angle === "profile_left") {
    return zones.filter((zone) => leftOnly.has(zone.id) || shared.has(zone.id) || zone.id === "nasal");
  }
  if (angle === "profile_right") {
    return zones.filter((zone) => rightOnly.has(zone.id) || shared.has(zone.id) || zone.id === "nasal");
  }
  return zones;
}

export default function AnalysisPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = Array.isArray(params?.sessionId)
    ? params.sessionId[0]
    : params?.sessionId;

  const [facePhoto, setFacePhoto] = useState<PhotoRow | null>(null);
  const [signedUrl, setSignedUrl] = useState("");
  const [globalAnalysis, setGlobalAnalysis] = useState<GlobalAnalysis | null>(null);
  const [autoGlobalTriggered, setAutoGlobalTriggered] = useState(false);
  const [globalStatus, setGlobalStatus] = useState<"idle" | "analyzing">("idle");
  const [error, setError] = useState("");
  const [isCaptureComplete, setIsCaptureComplete] = useState(false);
  const [sessionPhotos, setSessionPhotos] = useState<SessionPhoto[]>([]);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [showZones, setShowZones] = useState(false);
  const [zonesByPhoto, setZonesByPhoto] = useState<Record<string, ZoneShape[]>>({});
  const [zonesStatus, setZonesStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [zonesError, setZonesError] = useState("");
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [autoZoom, setAutoZoom] = useState(false);
  const [zoomTransform, setZoomTransform] = useState({ scale: 1, translateX: 0, translateY: 0 });
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStatus, setChatStatus] = useState<"idle" | "loading">("idle");
  const [chatError, setChatError] = useState("");
  const [treatmentText, setTreatmentText] = useState("");
  const [visualPrompt, setVisualPrompt] = useState("");
  const [selectedTreatment, setSelectedTreatment] = useState<string>(AESTHETIC_TREATMENTS[0].id);
  const [treatmentIntensity, setTreatmentIntensity] = useState<number>(2);

  // Obtenir le traitement actuellement sélectionné
  const currentTreatment = AESTHETIC_TREATMENTS.find(t => t.id === selectedTreatment);

  // Obtenir le label de l'intensité
  const getIntensityLabel = (intensity: number) => {
    switch (intensity) {
      case 1: return "Subtil";
      case 2: return "Modéré";
      case 3: return "Prononcé";
      default: return "Modéré";
    }
  };
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const mainImageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const drawingRef = useRef<{
    isDrawing: boolean;
    lastPoint: { x: number; y: number };
    rectStart: { x: number; y: number } | null;
    snapshot: ImageData | null;
  }>({
    isDrawing: false,
    lastPoint: { x: 0, y: 0 },
    rectStart: null,
    snapshot: null,
  });
  const [drawTool, setDrawTool] = useState<"pen" | "rect">("pen");
  const [strokeColor, setStrokeColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(3);

  const storageBucket = useMemo(
    () => process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET,
    []
  );
  const activePhoto = useMemo(
    () => sessionPhotos.find((photo) => photo.id === activePhotoId) ?? null,
    [sessionPhotos, activePhotoId]
  );
  const activeZones = activePhoto ? zonesByPhoto[activePhoto.id] ?? null : null;

  useEffect(() => {
    if (activePhotoId) {
      return;
    }
    if (facePhoto?.id) {
      setActivePhotoId(facePhoto.id);
      return;
    }
    if (sessionPhotos.length > 0) {
      setActivePhotoId(sessionPhotos[0].id);
    }
  }, [activePhotoId, facePhoto, sessionPhotos]);

  useEffect(() => {
    async function fetchData() {
      if (!sessionId) {
        return;
      }
      setError("");

      const { data: photoData, error: photoError } = await supabaseBrowser
        .from("photos")
        .select("id, storage_path, created_at")
        .eq("session_id", sessionId)
        .eq("angle", "face")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (photoError) {
        setError(photoError.message);
      } else {
        setFacePhoto(photoData ?? null);
        if (photoData && storageBucket) {
          const { data: signedData, error: signedError } =
            await supabaseBrowser.storage
              .from(storageBucket)
              .createSignedUrl(photoData.storage_path, 60 * 60);

          if (signedError) {
            setError(signedError.message);
          } else {
            setSignedUrl(signedData?.signedUrl ?? "");
          }
        }
      }

      const { data: allPhotos, error: allPhotosError } = await supabaseBrowser
        .from("photos")
        .select("id, storage_path, created_at, angle")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      if (allPhotosError) {
        setError(allPhotosError.message);
        setIsCaptureComplete(false);
        setSessionPhotos([]);
      } else if (allPhotos) {
        const angleSet = new Set(allPhotos.map((row: PhotoRow) => row.angle));
        setIsCaptureComplete(REQUIRED_ANGLES.every((angle) => angleSet.has(angle)));
        if (storageBucket) {
          const signedPhotos = await Promise.all(
            allPhotos.map(async (photo: PhotoRow) => {
              const { data: signedData } = await supabaseBrowser.storage
                .from(storageBucket)
                .createSignedUrl(photo.storage_path, 60 * 60);
              return {
                ...photo,
                angle: photo.angle || "",
                signedUrl: signedData?.signedUrl ?? "",
              } as SessionPhoto;
            })
          );
          setSessionPhotos(signedPhotos.filter((photo: SessionPhoto) => photo.signedUrl));
        } else {
          setSessionPhotos([]);
        }
      } else {
        setIsCaptureComplete(false);
        setSessionPhotos([]);
      }

      if (photoData) {
        // Charger l'analyse globale
        const { data: globalData, error: globalError } =
          await supabaseBrowser
            .from("global_face_analyses")
            .select("id, result, created_at")
            .eq("session_id", sessionId)
            .eq("photo_id", photoData.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!globalError && globalData) {
          setGlobalAnalysis(globalData);
        }
      }
    }

    fetchData();
  }, [sessionId, storageBucket]);

  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      const [first] = args;
      if (
        typeof first === "string" &&
        first.includes("Created TensorFlow Lite XNNPACK delegate for CPU")
      ) {
        return;
      }
      originalError(...args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  async function handleGlobalAnalysis() {
    if (!sessionId || !facePhoto || !signedUrl) {
      return;
    }

    setGlobalStatus("analyzing");
    setError("");

    // Convertir l'image complète en data URL
    let imageDataUrl = "";
    try {
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      imageDataUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      setError("Impossible de charger l'image.");
      setGlobalStatus("idle");
      return;
    }

    const apiResponse = await fetch("/api/analysis/global-face", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        photoId: facePhoto.id,
        imageDataUrl,
      }),
    });

    if (!apiResponse.ok) {
      const payload = await apiResponse.json().catch(() => null);
      setError(payload?.error ?? "Erreur analyse globale.");
      setGlobalStatus("idle");
      return;
    }

    const payload = await apiResponse.json();
    setGlobalAnalysis(payload.data);
    setGlobalStatus("idle");
  }

  async function sendChatMessage(
    message: string,
    mode: "chat" | "treatment" | "nutrition" = "chat",
    treatmentType?: string
  ) {
    if (!sessionId || !facePhoto) {
      return;
    }

    setChatStatus("loading");
    setChatError("");
    setChatMessages((prev) => [...prev, { role: "user", content: message }]);

    const globalSummary =
      typeof globalAnalysis?.result === "object" && globalAnalysis?.result
        ? (globalAnalysis.result as { summary?: string; raw?: string }).summary ??
          (globalAnalysis.result as { raw?: string }).raw ??
          ""
        : "";

    const response = await fetch("/api/analysis/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        photoId: facePhoto.id,
        message,
        mode,
        treatmentType,
        imageUrl: signedUrl,
        globalSummary,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setChatError(payload?.error ?? "Erreur lors de l appel IA.");
      setChatStatus("idle");
      return;
    }

    const payload = await response.json();
    let reply =
      payload?.data?.reply ??
      payload?.data?.summary ??
      "Reponse indisponible.";

    // Sécurité : si reply contient du JSON brut, l'extraire
    if (typeof reply === "string" && reply.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(reply);
        reply = parsed.reply ?? parsed.summary ?? reply;
      } catch {
        // Si le parsing échoue, garder la réponse telle quelle
      }
    }

    setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    if (payload?.data?.treatmentText) {
      setTreatmentText(payload.data.treatmentText);
    }
    if (payload?.data?.visualPrompt) {
      setVisualPrompt(payload.data.visualPrompt);
    }
    setChatStatus("idle");
  }

  useEffect(() => {
    const shouldAuto = searchParams?.get("auto") === "1";
    if (!shouldAuto || autoGlobalTriggered || globalStatus === "analyzing") {
      return;
    }
    if (!facePhoto || !signedUrl || globalAnalysis) {
      return;
    }
    // Use setTimeout to avoid setState during render
    setTimeout(() => {
      setAutoGlobalTriggered(true);
      handleGlobalAnalysis();
    }, 0);
  }, [
    searchParams,
    autoGlobalTriggered,
    globalStatus,
    facePhoto,
    signedUrl,
    globalAnalysis,
  ]);

  // Calculer le zoom automatique basé sur les landmarks
  useEffect(() => {
    if (!autoZoom || !activePhoto) {
      setZoomTransform({ scale: 1, translateX: 0, translateY: 0 });
      return;
    }

    const currentPhoto = activePhoto; // Capturer pour éviter les problèmes de nullabilité

    async function calculateAutoZoom() {
      const { data, error } = await supabaseBrowser
        .from("face_landmarks")
        .select("landmarks")
        .eq("photo_id", currentPhoto.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data?.landmarks) {
        return;
      }

      const landmarks = data.landmarks as Array<{ x: number; y: number; z?: number }>;
      const xs = landmarks.map((p) => p.x * 100);
      const ys = landmarks.map((p) => p.y * 100);

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const faceWidth = maxX - minX;
      const faceHeight = maxY - minY;
      const faceCenterX = (minX + maxX) / 2;
      const faceCenterY = (minY + maxY) / 2;

      // Ajouter des marges de 25% autour du visage
      const targetWidth = faceWidth * 1.5;
      const targetHeight = faceHeight * 1.5;

      // Calculer le facteur de zoom pour remplir ~70% de l'espace
      const scaleX = 70 / targetWidth;
      const scaleY = 70 / targetHeight;
      const scale = Math.min(scaleX, scaleY, 2.5); // Max zoom 2.5x

      // Calculer le translate pour centrer le visage
      const translateX = (50 - faceCenterX) * scale;
      const translateY = (50 - faceCenterY) * scale;

      setZoomTransform({ scale, translateX, translateY });
    }

    calculateAutoZoom();
  }, [autoZoom, activePhoto]);

  useEffect(() => {
    if (!showZones || !activePhoto) {
      return;
    }
    // Capturer activePhoto pour éviter les problèmes de nullabilité
    const currentPhoto = activePhoto;
    if (zonesByPhoto[currentPhoto.id]) {
      setZonesStatus("ready");
      return;
    }
    let mounted = true;
    async function fetchZones() {
      setZonesStatus("loading");
      setZonesError("");
      const { data, error: zonesLoadError } = await supabaseBrowser
        .from("face_landmarks")
        .select("landmarks")
        .eq("photo_id", currentPhoto.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!mounted) {
        return;
      }
      if (zonesLoadError) {
        setZonesStatus("error");
        setZonesError(zonesLoadError.message);
        return;
      }
      if (!data?.landmarks) {
        if (!currentPhoto.signedUrl || !sessionId) {
          setZonesStatus("error");
          setZonesError("Landmarks indisponibles pour cette photo.");
          return;
        }
        try {
          const landmarker = await getLandmarker();
          const image = new Image();
          image.crossOrigin = "anonymous";
          image.src = currentPhoto.signedUrl;
          await image.decode();

          const results = landmarker.detect(image);
          const face = results.faceLandmarks?.[0];
          if (!face || face.length === 0) {
            setZonesStatus("error");
            setZonesError("Aucun visage detecte pour cette photo.");
            return;
          }

          const insertPayload = buildLandmarkInsert(
            face as FaceLandmark[],
            currentPhoto.id,
            sessionId
          );
          const { error: insertError } = await supabaseBrowser
            .from("face_landmarks")
            .insert(insertPayload);

          if (insertError) {
            setZonesStatus("error");
            setZonesError(insertError.message);
            return;
          }

          const zones = filterZonesByAngle(
            buildFaceZones(face as FaceLandmark[]),
            currentPhoto.angle
          );
          if (zones.length === 0) {
            setZonesStatus("error");
            setZonesError("Zones non disponibles pour cet angle.");
            return;
          }
          setZonesByPhoto((prev) => ({ ...prev, [currentPhoto.id]: zones }));
          setZonesStatus("ready");
          return;
        } catch (error) {
          setZonesStatus("error");
          setZonesError("Echec de la detection des landmarks.");
          return;
        }
      }

      const zones = filterZonesByAngle(
        buildFaceZones(data.landmarks as FaceLandmark[]),
        currentPhoto.angle
      );
      if (zones.length === 0) {
        setZonesStatus("error");
        setZonesError("Zones non disponibles pour cet angle.");
        return;
      }
      setZonesByPhoto((prev) => ({ ...prev, [currentPhoto.id]: zones }));
      setZonesStatus("ready");
    }

    fetchZones();
    return () => {
      mounted = false;
    };
  }, [showZones, activePhoto, zonesByPhoto]);

  useEffect(() => {
    if (!activePhoto?.signedUrl && !signedUrl) {
      return;
    }
    const raf = requestAnimationFrame(() => syncCanvasSize());
    return () => cancelAnimationFrame(raf);
  }, [activePhoto?.signedUrl, signedUrl]);

  if (!sessionId) {
    return <div className="text-sm text-zinc-500">Session invalide.</div>;
  }

  async function getLandmarker() {
    if (landmarkerRef.current) {
      return landmarkerRef.current;
    }
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    const landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      },
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
      numFaces: 1,
      runningMode: "IMAGE",
    });
    landmarkerRef.current = landmarker;
    return landmarker;
  }

  function syncCanvasSize() {
    const img = mainImageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) {
      return;
    }
    const rect = img.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * scale);
    canvas.height = Math.round(rect.height * scale);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = window.devicePixelRatio || 1;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function getCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return { x: 0, y: 0 };
    }
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    canvas.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(event);
    drawingRef.current.isDrawing = true;
    drawingRef.current.lastPoint = point;
    if (drawTool === "pen") {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    } else {
      drawingRef.current.rectStart = point;
      drawingRef.current.snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  }

  function handleCanvasPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !drawingRef.current.isDrawing) {
      return;
    }
    const point = getCanvasPoint(event);
    if (drawTool === "pen") {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      drawingRef.current.lastPoint = point;
    } else if (drawingRef.current.rectStart && drawingRef.current.snapshot) {
      const { rectStart, snapshot } = drawingRef.current;
      ctx.putImageData(snapshot, 0, 0);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.strokeRect(
        rectStart.x,
        rectStart.y,
        point.x - rectStart.x,
        point.y - rectStart.y
      );
    }
  }

  function handleCanvasPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }
    canvas.releasePointerCapture(event.pointerId);
    if (drawTool === "rect" && drawingRef.current.snapshot) {
      drawingRef.current.snapshot = null;
      drawingRef.current.rectStart = null;
    }
    drawingRef.current.isDrawing = false;
  }

  function handleCanvasPointerLeave() {
    drawingRef.current.isDrawing = false;
    drawingRef.current.snapshot = null;
    drawingRef.current.rectStart = null;
  }

  function scrollGallery(direction: "left" | "right") {
    if (!galleryRef.current) {
      return;
    }
    const delta = direction === "left" ? -320 : 320;
    galleryRef.current.scrollBy({ left: delta, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Analyse visage
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Lance une analyse globale du visage pour obtenir une évaluation complète.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!activePhoto}
              onClick={() => setShowZones((prev) => !prev)}
              type="button"
            >
              {showZones ? "Masquer les zones" : "Afficher les zones"}
            </button>
            <button
              className={`rounded-full border px-5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                autoZoom
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "border-zinc-200 bg-white text-zinc-700 hover:border-emerald-300 hover:text-emerald-700"
              }`}
              disabled={!activePhoto}
              onClick={() => setAutoZoom((prev) => !prev)}
              type="button"
            >
              {autoZoom ? "🔍 Zoom activé" : "🔍 Zoom auto"}
            </button>
            <button
              className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              disabled={!facePhoto || globalStatus === "analyzing"}
              onClick={handleGlobalAnalysis}
              type="button"
            >
              {globalStatus === "analyzing"
                ? "Analyse globale en cours..."
                : "🌐 Analyse globale"}
            </button>
          </div>
        </div>
      </header>

      {/* Animation pendant l'analyse globale uniquement */}
      {globalStatus === "analyzing" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl mx-4">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto rounded-2xl shadow-2xl"
              src="https://ongcadzzheyyigickvfu.supabase.co/storage/v1/object/public/images%20site%20web/new.mp4"
            />
            <div className="absolute bottom-8 left-0 right-0 text-center">
              <p className="text-2xl font-bold text-white drop-shadow-lg">
                Analyse en cours
                <span className="inline-block animate-pulse">...</span>
              </p>
              <p className="mt-2 text-sm text-gray-300">
                Veuillez patienter pendant que l&apos;IA analyse les données
              </p>
            </div>
          </div>
        </div>
      )}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!facePhoto || !signedUrl ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-6 text-sm text-zinc-500">
          Aucune photo face disponible. Capture une photo face d&apos;abord.
        </div>
      ) : (
        <section className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="relative overflow-hidden rounded-2xl bg-zinc-100" style={{ touchAction: "none" }}>
              <div
                style={{
                  transform: autoZoom
                    ? `scale(${zoomTransform.scale}) translate(${zoomTransform.translateX}px, ${zoomTransform.translateY}px)`
                    : "none",
                  transition: "transform 0.5s ease-out",
                  transformOrigin: "center center",
                }}
              >
                <img
                  ref={mainImageRef}
                  alt={`Photo ${ANGLE_LABELS[activePhoto?.angle ?? "face"] ?? "face"}`}
                  className="w-full select-none object-cover"
                  src={activePhoto?.signedUrl ?? signedUrl}
                  onLoad={syncCanvasSize}
                />
              {showZones && activeZones ? (
                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {/* Quadrillage subtil pour référence */}
                  <defs>
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(100,116,139,0.08)" strokeWidth="0.15"/>
                    </pattern>
                  </defs>
                  <rect width="100" height="100" fill="url(#grid)" />

                  {/* Zones faciales */}
                  {activeZones.map((zone) => {
                    const isHovered = hoveredZone === zone.id;
                    const isSelected = selectedZone === zone.id;

                    return (
                      <g
                        key={zone.id}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredZone(zone.id)}
                        onMouseLeave={() => setHoveredZone(null)}
                        onClick={() => setSelectedZone(isSelected ? null : zone.id)}
                      >
                        {/* Zone de remplissage invisible pour l'interaction */}
                        <polygon
                          points={zone.points.map((point) => `${point.x},${point.y}`).join(" ")}
                          fill="transparent"
                          strokeWidth="0"
                        />

                        {/* Contour de la zone - style professionnel */}
                        <polygon
                          points={zone.points.map((point) => `${point.x},${point.y}`).join(" ")}
                          fill={isSelected ? "rgba(99,102,241,0.12)" : isHovered ? "rgba(99,102,241,0.08)" : "rgba(100,116,139,0.03)"}
                          stroke={isSelected ? "#6366f1" : isHovered ? "#818cf8" : "rgba(100,116,139,0.35)"}
                          strokeWidth={isSelected ? "0.5" : isHovered ? "0.4" : "0.25"}
                          strokeDasharray={isSelected ? "none" : "1,0.5"}
                          style={{
                            transition: "all 0.2s ease",
                            pointerEvents: "all"
                          }}
                        />

                        {/* Label affiché au survol ou à la sélection */}
                        {(isHovered || isSelected) && (
                          <g>
                            {/* Fond du label */}
                            <rect
                              x={zone.labelX - 8}
                              y={zone.labelY - 2.5}
                              width="16"
                              height="5"
                              rx="1"
                              fill="rgba(15,23,42,0.92)"
                              stroke="rgba(255,255,255,0.15)"
                              strokeWidth="0.15"
                            />
                            {/* Texte du label */}
                            <text
                              x={zone.labelX}
                              y={zone.labelY}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize="1.8"
                              fontWeight="500"
                              fill="#ffffff"
                              style={{ pointerEvents: "none" }}
                            >
                              {zone.label}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              ) : null}
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 h-full w-full ${
                  drawTool === "pen" ? "cursor-crosshair" : "cursor-cell"
                }`}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onPointerLeave={handleCanvasPointerLeave}
              />
              </div>
            </div>
            {showZones ? (
              <div className="mt-3 text-xs text-zinc-500">
                {zonesStatus === "loading" ? "Chargement des zones..." : null}
                {zonesStatus === "error" ? zonesError : null}
                {zonesStatus === "ready" ? "Zones affichees sur la photo active." : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Outils d&apos;annotation
            </p>
            <h3 className="mt-2 text-lg font-semibold text-zinc-900">
              Tracer sur la photo
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              Dessinez des traits ou encadrez des zones importantes.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { id: "pen" as const, label: "Trait" },
                { id: "rect" as const, label: "Zone" },
              ].map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setDrawTool(tool.id)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                    drawTool === tool.id
                      ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-indigo-300 hover:text-indigo-700"
                  }`}
                  aria-pressed={drawTool === tool.id}
                >
                  {tool.label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-zinc-600">Couleur</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["#ef4444", "#f97316", "#22c55e", "#3b82f6", "#111827"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setStrokeColor(color)}
                    className={`h-7 w-7 rounded-full border transition ${
                      strokeColor === color ? "border-indigo-400 ring-2 ring-indigo-200" : "border-zinc-200"
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`Couleur ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-semibold text-zinc-600">
                Epaisseur
              </label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={strokeWidth}
                  onChange={(event) => setStrokeWidth(Number(event.target.value))}
                  className="w-full"
                />
                <span className="min-w-[32px] text-right text-xs font-semibold text-zinc-700">
                  {strokeWidth}px
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                className="w-full rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-600 transition hover:border-red-300 hover:text-red-600"
                onClick={clearCanvas}
              >
                Effacer les tracés
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Galerie session
            </p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-900">
              Toutes les photos du patient
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Les prises face, profils et 3/4 sont toutes visibles ici.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-zinc-200 bg-white p-2 text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700"
              onClick={() => scrollGallery("left")}
              aria-label="Defiler vers la gauche"
            >
              ←
            </button>
            <button
              type="button"
              className="rounded-full border border-zinc-200 bg-white p-2 text-zinc-600 transition hover:border-indigo-300 hover:text-indigo-700"
              onClick={() => scrollGallery("right")}
              aria-label="Defiler vers la droite"
            >
              →
            </button>
          </div>
        </div>

        {sessionPhotos.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">
            Aucune photo disponible pour cette session.
          </div>
        ) : (
          <div
            ref={galleryRef}
            className="mt-6 flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory"
          >
            {sessionPhotos.map((photo) => (
              <div
                key={photo.id}
                className={`min-w-[240px] max-w-[240px] snap-start overflow-hidden rounded-2xl border ${
                  photo.id === activePhotoId
                    ? "border-indigo-400 ring-2 ring-indigo-200"
                    : "border-zinc-200"
                } bg-zinc-50`}
              >
                <button
                  type="button"
                  onClick={() => setActivePhotoId(photo.id)}
                  className="block w-full text-left"
                >
                  <div className="relative aspect-[4/3] bg-zinc-100">
                  <img
                    alt={`Photo ${ANGLE_LABELS[photo.angle] ?? photo.angle}`}
                    className="h-full w-full object-cover"
                    src={photo.signedUrl}
                  />
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 text-xs text-zinc-600">
                    <span className="font-semibold text-zinc-800">
                      {ANGLE_LABELS[photo.angle] ?? photo.angle}
                    </span>
                    <span className="uppercase tracking-[0.2em]">
                      {photo.angle.replaceAll("_", " ")}
                    </span>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {isCaptureComplete ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              IA esthetique visage
            </p>
            <h2 className="mt-2 text-xl font-semibold text-zinc-900">
              Discussion et generations rapides
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Posez vos questions sur les photos et lancez des generations de traitements.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Injection levres", prompt: "Propose un traitement d'injection des levres." },
                { label: "Pommettes", prompt: "Propose un traitement de volumisation des pommettes." },
                { label: "Jawline", prompt: "Propose un traitement pour definir la jawline." },
                { label: "Sillons nasogeniens", prompt: "Propose un traitement des sillons nasogeniens." },
                { label: "Rides frontales", prompt: "Propose un traitement des rides frontales." },
                { label: "Cernes", prompt: "Propose un traitement pour les cernes peri-orbitaires." },
                { label: "Nutrition & vieillissement", prompt: "Donne des conseils nutritionnels pour la qualite de peau et le vieillissement.", mode: "nutrition" as const },
              ].map((item) => (
                <button
                  key={item.label}
                  className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-60"
                  disabled={chatStatus === "loading"}
                  onClick={() =>
                    sendChatMessage(
                      item.prompt,
                      item.mode ?? "treatment",
                      item.label
                    )
                  }
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-4 max-h-[500px] space-y-3 overflow-y-auto rounded-xl bg-white p-4 text-sm text-zinc-700 shadow-inner">
              {chatMessages.length === 0 ? (
                <p className="text-zinc-400">
                  Aucun message pour le moment. Utilisez les raccourcis ou posez une question.
                </p>
              ) : (
                chatMessages.map((msg, index) => (
                  <div
                    key={`${msg.role}-${index}`}
                    className={`rounded-xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-indigo-50 text-indigo-900"
                        : "bg-emerald-50 text-emerald-900"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide">
                      {msg.role === "user" ? "Vous" : "IA"}
                    </p>
                    <div className="mt-1 text-sm leading-relaxed">
                      {msg.role === "assistant" ? formatChatMessage(msg.content) : msg.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            {chatError ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
                {chatError}
              </div>
            ) : null}

            <div className="mt-6">
              <h3 className="text-center text-lg font-semibold text-zinc-900">
                Demandez a l IA
              </h3>
              <p className="mt-1 text-center text-xs text-zinc-500">
                Esthetique du visage, traitements, nutrition, vieillissement.
              </p>
              <div className="mt-4">
                <PlaceholdersAndVanishInput
                  placeholders={[
                    "Quelles zones du visage faut-il prioriser ?",
                    "Quels traitements pour la jawline ?",
                    "Conseils nutritionnels pour la qualite de peau",
                    "Proposer une option de traitement levres",
                    "Comment ralentir le vieillissement du visage ?",
                  ]}
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!chatInput.trim()) {
                      return;
                    }
                    sendChatMessage(chatInput.trim(), "chat");
                    setChatInput("");
                  }}
                  disabled={chatStatus === "loading"}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Prévisualisation IA
            </p>
            <h3 className="mt-2 text-lg font-semibold text-zinc-900">
              Simulation de traitement
            </h3>
            <p className="mt-2 text-sm text-zinc-600">
              Générez une image de prévisualisation du résultat du traitement proposé sur le patient.
            </p>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <p className="text-xs font-semibold text-zinc-700 mb-2">Type de traitement</p>
                <select
                  value={selectedTreatment}
                  onChange={(e) => setSelectedTreatment(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  disabled
                >
                  {AESTHETIC_TREATMENTS.map((treatment) => (
                    <option key={treatment.id} value={treatment.id}>
                      {treatment.label}
                    </option>
                  ))}
                </select>
                {currentTreatment && (
                  <p className="mt-2 text-xs text-zinc-500">
                    Catégorie : {currentTreatment.category}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <p className="text-xs font-semibold text-zinc-700 mb-2">Intensité du traitement</p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="1"
                    value={treatmentIntensity}
                    onChange={(e) => setTreatmentIntensity(Number(e.target.value))}
                    className="w-full"
                    disabled
                  />
                  <span className="text-xs text-zinc-600 min-w-[70px] font-semibold">
                    {getIntensityLabel(treatmentIntensity)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-xs text-zinc-500">
                  <span>Subtil</span>
                  <span>Modéré</span>
                  <span>Prononcé</span>
                </div>
              </div>

              <button
                type="button"
                className="w-full rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
              >
                Générer la prévisualisation
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
              <p className="font-semibold mb-1">⚠️ En développement</p>
              <p>La génération d&apos;images via Replicate est en cours de configuration. L&apos;IA ajustera automatiquement les volumes selon le traitement et l&apos;intensité sélectionnés.</p>
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {/* Section Analyse Globale */}
      {globalAnalysis && (
        <section className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-indigo-600 p-2">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-indigo-900">
              Analyse Globale du Visage
            </h2>
          </div>

          <div className="space-y-6">
            {/* Vue d'ensemble */}
            <div className="rounded-2xl bg-white p-6 shadow-md">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
                <h3 className="text-lg font-bold uppercase tracking-wide text-indigo-900">
                  Vue d&apos;ensemble
                </h3>
              </div>
              <p className="text-base leading-relaxed text-gray-800">
                {highlightKeywords(globalAnalysis.result.summary ?? globalAnalysis.result.raw ?? "")}
              </p>
            </div>

            {/* Observations globales */}
            {globalAnalysis.result.globalObservations?.length ? (
              <div className="rounded-2xl bg-white p-6 shadow-md">
                <div className="mb-5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-teal-600"></div>
                  <h3 className="text-lg font-bold uppercase tracking-wide text-teal-900">
                    Observations Générales
                  </h3>
                </div>
                <ul className="space-y-4">
                  {globalAnalysis.result.globalObservations.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-4 text-base text-gray-700"
                    >
                      <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-teal-500"></span>
                      <span className="leading-relaxed">{highlightKeywords(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Analyse par région */}
            {globalAnalysis.result.regionalAnalysis && (
              <div className="grid gap-6 md:grid-cols-3">
                {globalAnalysis.result.regionalAnalysis.upperFace && (
                  <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 p-6 shadow-md">
                    <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-blue-900">
                      Région Supérieure
                    </h4>
                    <p className="text-sm leading-relaxed text-gray-700">
                      {highlightKeywords(globalAnalysis.result.regionalAnalysis.upperFace)}
                    </p>
                  </div>
                )}
                {globalAnalysis.result.regionalAnalysis.midFace && (
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 p-6 shadow-md">
                    <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-emerald-900">
                      Région Médiane
                    </h4>
                    <p className="text-sm leading-relaxed text-gray-700">
                      {highlightKeywords(globalAnalysis.result.regionalAnalysis.midFace)}
                    </p>
                  </div>
                )}
                {globalAnalysis.result.regionalAnalysis.lowerFace && (
                  <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 p-6 shadow-md">
                    <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-violet-900">
                      Région Inférieure
                    </h4>
                    <p className="text-sm leading-relaxed text-gray-700">
                      {highlightKeywords(globalAnalysis.result.regionalAnalysis.lowerFace)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {/* Signes de vieillissement */}
              {globalAnalysis.result.agingConcerns?.length ? (
                <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-md">
                  <div className="mb-5 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-600"></div>
                    <h3 className="text-lg font-bold uppercase tracking-wide text-amber-900">
                      Signes de vieillissement
                    </h3>
                  </div>
                  <ul className="space-y-3">
                    {globalAnalysis.result.agingConcerns.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-sm text-gray-700"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500"></span>
                        <span className="leading-relaxed">{highlightKeywords(item)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Points forts */}
              {globalAnalysis.result.strengths?.length ? (
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-md">
                  <div className="mb-5 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-600"></div>
                    <h3 className="text-lg font-bold uppercase tracking-wide text-emerald-900">
                      Points forts esthétiques
                    </h3>
                  </div>
                  <ul className="space-y-3">
                    {globalAnalysis.result.strengths.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-sm text-gray-700"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500"></span>
                        <span className="leading-relaxed font-medium">{highlightKeywords(item)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* Recommandations globales */}
            {globalAnalysis.result.globalRecommendations?.length ? (
              <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 p-6 shadow-md">
                <div className="mb-5 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-rose-600"></div>
                  <h3 className="text-lg font-bold uppercase tracking-wide text-rose-900">
                    Recommandations Globales
                  </h3>
                </div>
                <ul className="space-y-3">
                  {globalAnalysis.result.globalRecommendations.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 text-sm text-gray-700"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-rose-500"></span>
                      <span className="leading-relaxed font-medium">{highlightKeywords(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Disclaimer */}
            <p className="rounded-lg bg-white px-4 py-3 text-xs leading-relaxed text-gray-500 shadow-sm">
              {globalAnalysis.result.disclaimer ??
                "Cette analyse globale est à visée esthétique uniquement et ne constitue pas un diagnostic médical."}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
