/**
 * Types pour le système de détection des zones faciales
 */

// Point de coordonnées (x, y)
export type Point = [number, number];

// Géométrie des zones pour différents angles
export type ZoneGeometry = {
  face?: Point[];
  three_quarter_left?: Point[];
  three_quarter_right?: Point[];
  profile_left?: Point[];
  profile_right?: Point[];
};

// Hints pour la détection automatique
export type DetectionHints = {
  landmark_anchors: number[]; // Indices des landmarks face-api.js (68 points)
  relative_position: string; // Description position relative (ex: "between_eyes_and_nose")
  expected_size_ratio: number; // Ratio taille attendue par rapport à la largeur du visage
};

// Template de zone anatomique
export type ZoneTemplate = {
  id: string;
  model: 'XX' | 'XY';
  label: string;
  description?: string | null;
  anatomical_category?: 'frontal' | 'mid_face' | 'lower_face' | 'periorbital' | 'other' | null;
  geometry: ZoneGeometry;
  optimal_angles: string[];
  fallback_angles?: string[] | null;
  detection_hints: DetectionHints;
  created_at?: string;
  updated_at?: string;
};

// Détails du score de confiance
export type ConfidenceDetails = {
  geometric_match: number; // Similarité forme détectée vs template (0-1)
  landmark_coverage: number; // % de landmarks dans la zone (0-1)
  size_ratio: number; // Ratio taille détectée vs attendue (0-1)
  position_accuracy: number; // Précision position (0-1)
};

// Zone détectée avec score de confiance
export type DetectedZone = {
  id?: string;
  session_id?: string;
  photo_id?: string;
  zone_template_id: string;
  detected_geometry: Point[];
  confidence_score: number;
  confidence_details: ConfidenceDetails;
  validation_status?: 'pending' | 'approved' | 'adjusted' | 'rejected';
  validated_geometry?: Point[] | null;
  validated_at?: string | null;
  validated_by?: string | null;
  detection_method?: string;
  detection_timestamp?: string;
  created_at?: string;
  updated_at?: string;
};

// Métriques de qualité photo
export type PhotoQualityMetrics = {
  id?: string;
  photo_id: string;
  resolution: number; // width * height
  sharpness_score: number; // Laplacian variance
  brightness_score: number; // 0-100
  contrast_ratio: number;
  face_coverage: number; // % du cadre occupé par le visage (0-100)
  is_acceptable: boolean;
  quality_issues: string[]; // ["too_dark", "blurry", "face_too_small", etc.]
  created_at?: string;
};

// Guidage pour la capture
export type CaptureGuidance = {
  distance: 'too_close' | 'too_far' | 'optimal';
  angle: 'correct' | 'adjust_left' | 'adjust_right' | 'tilt_up' | 'tilt_down';
  lighting: 'good' | 'too_dark' | 'too_bright' | 'uneven_shadows';
  sharpness: 'sharp' | 'blurry';
  alignment: 'centered' | 'adjust';
};

// Résultat de détection de visage
export type FaceDetectionResult = {
  landmarks: any; // face-api.js FaceLandmarks68
  box: any; // face-api.js Box
  confidence: number;
};

// Options pour l'ajustement manuel des zones
export type AdjustmentLimits = {
  max_translation_percent: number; // % de la largeur du visage
  max_scale_change_percent: number; // % de changement de taille
  max_rotation_degrees: number; // Degrés de rotation max
};

// Validation d'ajustement
export type AdjustmentValidation = {
  valid: boolean;
  errors: string[];
};

// Photo avec zones détectées (pour UI de validation)
export type PhotoWithZones = {
  id: string;
  storage_path: string;
  angle: string;
  created_at: string;
  zones: (DetectedZone & {
    zone_template: ZoneTemplate;
  })[];
};

// Configuration des limites d'ajustement
export const ADJUSTMENT_LIMITS: AdjustmentLimits = {
  max_translation_percent: 15,
  max_scale_change_percent: 25,
  max_rotation_degrees: 10,
};

// Seuils de qualité photo
export const QUALITY_THRESHOLDS = {
  sharpness: {
    min: 100, // Laplacian variance minimum
    warning: 150,
  },
  brightness: {
    min: 30,
    max: 85,
    warning_low: 40,
    warning_high: 75,
  },
  contrast: {
    min: 40,
    warning: 50,
  },
  face_coverage: {
    min: 20,
    max: 80,
    optimal_min: 30,
    optimal_max: 70,
  },
};

// Seuils de confiance
export const CONFIDENCE_THRESHOLDS = {
  high: 0.85, // Validation automatique possible
  medium: 0.70, // Revue recommandée
  low: 0.70, // Nécessite ajustement
};
