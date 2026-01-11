-- Migration: Stockage Face Mesh + sélection zones patient
-- Date: 2026-01-11
-- Description: Ajoute le stockage des masques Face Mesh et des zones sélectionnées par patient/session

-- ============================================================================
-- 1. FACE MESH MASKS
-- ============================================================================

CREATE TABLE IF NOT EXISTS face_mesh_masks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,

  -- Ovale du visage (Face Mesh)
  mask_points JSONB NOT NULL, -- Array de [x, y] normalisés (0-100)

  -- Métadonnées
  source TEXT DEFAULT 'mediapipe',
  model_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(photo_id)
);

CREATE INDEX IF NOT EXISTS idx_face_mesh_masks_session_id ON face_mesh_masks(session_id);
CREATE INDEX IF NOT EXISTS idx_face_mesh_masks_photo_id ON face_mesh_masks(photo_id);

-- ============================================================================
-- 2. ZONES IMPORTANTES SELECTIONNEES
-- ============================================================================

CREATE TABLE IF NOT EXISTS selected_face_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES photos(id) ON DELETE SET NULL,
  zone_id TEXT NOT NULL REFERENCES face_zones(id) ON DELETE CASCADE,

  selection_method TEXT DEFAULT 'manual', -- manual, auto
  priority INT DEFAULT 0, -- plus haut = plus important
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(session_id, zone_id)
);

CREATE INDEX IF NOT EXISTS idx_selected_face_zones_session_id ON selected_face_zones(session_id);
CREATE INDEX IF NOT EXISTS idx_selected_face_zones_patient_id ON selected_face_zones(patient_id);
CREATE INDEX IF NOT EXISTS idx_selected_face_zones_zone_id ON selected_face_zones(zone_id);

-- ============================================================================
-- 3. TRIGGERS UPDATED_AT
-- ============================================================================

DROP TRIGGER IF EXISTS update_face_mesh_masks_updated_at ON face_mesh_masks;
CREATE TRIGGER update_face_mesh_masks_updated_at
  BEFORE UPDATE ON face_mesh_masks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_selected_face_zones_updated_at ON selected_face_zones;
CREATE TRIGGER update_selected_face_zones_updated_at
  BEFORE UPDATE ON selected_face_zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. RLS POLICIES
-- ============================================================================

ALTER TABLE face_mesh_masks ENABLE ROW LEVEL SECURITY;
ALTER TABLE selected_face_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Face mesh masks are viewable by all authenticated users" ON face_mesh_masks;
CREATE POLICY "Face mesh masks are viewable by all authenticated users"
  ON face_mesh_masks FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Face mesh masks are insertable by all authenticated users" ON face_mesh_masks;
CREATE POLICY "Face mesh masks are insertable by all authenticated users"
  ON face_mesh_masks FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Face mesh masks are updatable by all authenticated users" ON face_mesh_masks;
CREATE POLICY "Face mesh masks are updatable by all authenticated users"
  ON face_mesh_masks FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Face mesh masks are deletable by all authenticated users" ON face_mesh_masks;
CREATE POLICY "Face mesh masks are deletable by all authenticated users"
  ON face_mesh_masks FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Selected face zones are viewable by all authenticated users" ON selected_face_zones;
CREATE POLICY "Selected face zones are viewable by all authenticated users"
  ON selected_face_zones FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Selected face zones are insertable by all authenticated users" ON selected_face_zones;
CREATE POLICY "Selected face zones are insertable by all authenticated users"
  ON selected_face_zones FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Selected face zones are updatable by all authenticated users" ON selected_face_zones;
CREATE POLICY "Selected face zones are updatable by all authenticated users"
  ON selected_face_zones FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Selected face zones are deletable by all authenticated users" ON selected_face_zones;
CREATE POLICY "Selected face zones are deletable by all authenticated users"
  ON selected_face_zones FOR DELETE
  TO authenticated
  USING (true);
