-- Migration: Suppression templates zones anatomiques (legacy)
-- Date: 2026-01-13
-- Description: Supprime les tables liées aux templates de zones et aligne selected_face_zones sur face_zones

-- ============================================================================
-- 1. RECREER selected_face_zones AVEC face_zones
-- ============================================================================

DROP TABLE IF EXISTS selected_face_zones;

CREATE TABLE IF NOT EXISTS selected_face_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES photos(id) ON DELETE SET NULL,
  zone_id TEXT NOT NULL REFERENCES face_zones(id) ON DELETE CASCADE,

  selection_method TEXT DEFAULT 'manual',
  priority INT DEFAULT 0,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(session_id, zone_id)
);

CREATE INDEX IF NOT EXISTS idx_selected_face_zones_session_id ON selected_face_zones(session_id);
CREATE INDEX IF NOT EXISTS idx_selected_face_zones_patient_id ON selected_face_zones(patient_id);
CREATE INDEX IF NOT EXISTS idx_selected_face_zones_zone_id ON selected_face_zones(zone_id);

DROP TRIGGER IF EXISTS update_selected_face_zones_updated_at ON selected_face_zones;
CREATE TRIGGER update_selected_face_zones_updated_at
  BEFORE UPDATE ON selected_face_zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE selected_face_zones ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- 2. SUPPRESSION TABLES TEMPLATE
-- ============================================================================

DROP TABLE IF EXISTS detected_face_zones CASCADE;
DROP TABLE IF EXISTS zone_templates CASCADE;
DROP TABLE IF EXISTS photo_quality_metrics CASCADE;
