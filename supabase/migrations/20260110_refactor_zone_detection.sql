-- Migration: Refonte système de détection des zones faciales
-- Date: 2026-01-10
-- Description: Remplace le système de calibration manuelle par des templates de zones anatomiques avec détection automatique

-- ============================================================================
-- 1. CRÉATION DES NOUVELLES TABLES
-- ============================================================================

-- Templates de zones anatomiques (remplace face_calibrations)
CREATE TABLE IF NOT EXISTS zone_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model TEXT NOT NULL CHECK (model IN ('XX', 'XY')),
  label TEXT NOT NULL,
  description TEXT,
  anatomical_category TEXT, -- 'frontal', 'mid_face', 'lower_face', 'periorbital'

  -- Géométrie pour chaque angle de vue
  geometry JSONB NOT NULL,
  -- Structure: {
  --   "face": [[x,y], ...],
  --   "three_quarter_left": [[x,y], ...],
  --   "three_quarter_right": [[x,y], ...],
  --   "profile_left": [[x,y], ...],
  --   "profile_right": [[x,y], ...]
  -- }

  -- Angles optimaux pour cette zone
  optimal_angles TEXT[] DEFAULT ARRAY['face'],
  fallback_angles TEXT[],

  -- Indices pour mapping automatique
  detection_hints JSONB,
  -- Structure: {
  --   "landmark_anchors": [33, 263, 1], -- Indices face-api.js
  --   "relative_position": "between_eyes_and_nose",
  --   "expected_size_ratio": 0.15
  -- }

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(model, label)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_zone_templates_model ON zone_templates(model);
CREATE INDEX IF NOT EXISTS idx_zone_templates_category ON zone_templates(anatomical_category);

-- ============================================================================
-- 2. ZONES DÉTECTÉES PAR SESSION
-- ============================================================================

CREATE TABLE IF NOT EXISTS detected_face_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  zone_template_id UUID NOT NULL REFERENCES zone_templates(id) ON DELETE CASCADE,

  -- Géométrie détectée automatiquement
  detected_geometry JSONB NOT NULL,

  -- Scores de confiance
  confidence_score NUMERIC NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  confidence_details JSONB,
  -- Structure: {
  --   "geometric_match": 0.92,
  --   "landmark_coverage": 0.88,
  --   "size_ratio": 0.95,
  --   "position_accuracy": 0.90
  -- }

  -- Validation praticien
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'approved', 'adjusted', 'rejected')),
  validated_geometry JSONB, -- Si ajusté manuellement
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES auth.users(id),

  -- Métadonnées
  detection_method TEXT DEFAULT 'face-api',
  detection_timestamp TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(session_id, photo_id, zone_template_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_detected_zones_session ON detected_face_zones(session_id);
CREATE INDEX IF NOT EXISTS idx_detected_zones_photo ON detected_face_zones(photo_id);
CREATE INDEX IF NOT EXISTS idx_detected_zones_template ON detected_face_zones(zone_template_id);
CREATE INDEX IF NOT EXISTS idx_detected_zones_validation_status ON detected_face_zones(validation_status);
CREATE INDEX IF NOT EXISTS idx_detected_zones_confidence ON detected_face_zones(confidence_score);

-- ============================================================================
-- 3. MÉTRIQUES QUALITÉ PHOTO
-- ============================================================================

CREATE TABLE IF NOT EXISTS photo_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,

  resolution INT,
  sharpness_score NUMERIC CHECK (sharpness_score >= 0),
  brightness_score NUMERIC CHECK (brightness_score >= 0 AND brightness_score <= 100),
  contrast_ratio NUMERIC CHECK (contrast_ratio >= 0),
  face_coverage NUMERIC CHECK (face_coverage >= 0 AND face_coverage <= 100),

  is_acceptable BOOLEAN DEFAULT true,
  quality_issues TEXT[], -- ["too_dark", "blurry", "face_too_small"]

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(photo_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_photo_quality_photo ON photo_quality_metrics(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_quality_acceptable ON photo_quality_metrics(is_acceptable);

-- ============================================================================
-- 4. MIGRATION DES DONNÉES EXISTANTES
-- ============================================================================

-- Migrer face_calibrations → zone_templates
-- On crée un template par zone pour chaque modèle (XX/XY)
INSERT INTO zone_templates (model, label, description, anatomical_category, geometry, optimal_angles, detection_hints)
SELECT
  fc.model,
  zone_key AS label,
  fz.description,
  CASE
    WHEN fz.id IN ('frontal', 'glabella') THEN 'frontal'
    WHEN fz.id LIKE 'peri_orbital%' THEN 'periorbital'
    WHEN fz.id IN ('nasal', 'malar_left', 'malar_right', 'nasolabial_left', 'nasolabial_right') THEN 'mid_face'
    WHEN fz.id IN ('perioral', 'lip_upper', 'lip_lower', 'chin', 'mandibular_left', 'mandibular_right', 'marionette_left', 'marionette_right') THEN 'lower_face'
    ELSE 'other'
  END AS anatomical_category,
  jsonb_build_object('face', fc.zones->zone_key) AS geometry,
  ARRAY['face'] AS optimal_angles,
  jsonb_build_object(
    'landmark_anchors', ARRAY[]::INTEGER[],
    'relative_position', '',
    'expected_size_ratio', 0.15
  ) AS detection_hints
FROM face_calibrations fc
CROSS JOIN LATERAL jsonb_object_keys(fc.zones) AS zone_key
LEFT JOIN face_zones fz ON fz.id = zone_key
WHERE fc.zones ? zone_key
ON CONFLICT (model, label) DO NOTHING;

-- ============================================================================
-- 5. VUES DE COMPATIBILITÉ
-- ============================================================================

-- Vue pour maintenir compatibilité avec ancien code
CREATE OR REPLACE VIEW legacy_face_calibrations AS
SELECT
  model,
  jsonb_object_agg(label, geometry->'face') AS zones
FROM zone_templates
GROUP BY model;

-- ============================================================================
-- 6. COMMENTAIRES DE DÉPRÉCIATION
-- ============================================================================

-- Marquer anciennes tables comme dépréciées
COMMENT ON TABLE face_calibrations IS 'DEPRECATED: Use zone_templates instead. Kept for backward compatibility until 2026-02-10.';
COMMENT ON TABLE face_mask_fits IS 'DEPRECATED: Automatic detection replaces manual fitting. Kept for backward compatibility until 2026-02-10.';
COMMENT ON TABLE face_zone_overrides IS 'DEPRECATED: Use detected_face_zones.validated_geometry instead. Kept for backward compatibility until 2026-02-10.';

-- ============================================================================
-- 7. FONCTIONS UTILITAIRES
-- ============================================================================

-- Fonction pour obtenir la géométrie finale d'une zone (détectée ou validée)
CREATE OR REPLACE FUNCTION get_final_zone_geometry(zone_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT COALESCE(validated_geometry, detected_geometry)
  INTO result
  FROM detected_face_zones
  WHERE id = zone_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour valider automatiquement les zones avec haute confiance
CREATE OR REPLACE FUNCTION auto_validate_high_confidence_zones(p_session_id UUID, p_threshold NUMERIC DEFAULT 0.85)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE detected_face_zones
  SET
    validation_status = 'approved',
    validated_at = NOW()
  WHERE
    session_id = p_session_id
    AND validation_status = 'pending'
    AND confidence_score >= p_threshold;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_zone_templates_updated_at
  BEFORE UPDATE ON zone_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_detected_face_zones_updated_at
  BEFORE UPDATE ON detected_face_zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. PERMISSIONS (RLS - Row Level Security)
-- ============================================================================

-- Activer RLS sur les nouvelles tables
ALTER TABLE zone_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE detected_face_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_quality_metrics ENABLE ROW LEVEL SECURITY;

-- Politique pour zone_templates (lecture publique, écriture admin uniquement)
CREATE POLICY "Zone templates are viewable by all authenticated users"
  ON zone_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Zone templates are editable by admins only"
  ON zone_templates FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Politique pour detected_face_zones (accès via session ownership)
CREATE POLICY "Detected zones are viewable by session owners"
  ON detected_face_zones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = detected_face_zones.session_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Detected zones are editable by session owners"
  ON detected_face_zones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = detected_face_zones.session_id
      AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions s
      WHERE s.id = detected_face_zones.session_id
      AND s.user_id = auth.uid()
    )
  );

-- Politique pour photo_quality_metrics (accès via photo ownership)
CREATE POLICY "Photo quality metrics are viewable by photo owners"
  ON photo_quality_metrics FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM photos p
      JOIN sessions s ON s.id = p.session_id
      WHERE p.id = photo_quality_metrics.photo_id
      AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Photo quality metrics are insertable by photo owners"
  ON photo_quality_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM photos p
      JOIN sessions s ON s.id = p.session_id
      WHERE p.id = photo_quality_metrics.photo_id
      AND s.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 10. DONNÉES DE SEED (OPTIONNEL)
-- ============================================================================

-- Ajouter quelques templates de base si nécessaire
-- Ces templates peuvent être affinés plus tard via l'interface admin

-- Note: Les données réelles seront créées via l'interface admin
-- Cette section est laissée vide intentionnellement

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================

-- Log de la migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 20260110_refactor_zone_detection completed successfully';
  RAISE NOTICE 'Tables created: zone_templates, detected_face_zones, photo_quality_metrics';
  RAISE NOTICE 'Legacy tables marked as deprecated: face_calibrations, face_mask_fits, face_zone_overrides';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Create zone templates via admin interface';
  RAISE NOTICE '  2. Test detection with face-api.js';
  RAISE NOTICE '  3. Validate zones with new UI';
END $$;
