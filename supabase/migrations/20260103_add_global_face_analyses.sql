-- Table pour stocker les analyses globales du visage
CREATE TABLE IF NOT EXISTS global_face_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES photo_sessions(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES clinical_photos(id) ON DELETE CASCADE,

  -- Résultat de l'analyse IA (JSON structuré)
  result JSONB NOT NULL,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_global_face_analyses_session ON global_face_analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_global_face_analyses_photo ON global_face_analyses(photo_id);
CREATE INDEX IF NOT EXISTS idx_global_face_analyses_created ON global_face_analyses(created_at DESC);

-- RLS policies
ALTER TABLE global_face_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: Praticiens peuvent voir leurs propres analyses
CREATE POLICY "Praticiens peuvent voir leurs analyses globales"
  ON global_face_analyses
  FOR SELECT
  USING (
    session_id IN (
      SELECT ps.id FROM photo_sessions ps
      JOIN patients p ON ps.patient_id = p.id
      WHERE p.practitioner_id = auth.uid()
    )
  );

-- Policy: Praticiens peuvent insérer des analyses
CREATE POLICY "Praticiens peuvent créer des analyses globales"
  ON global_face_analyses
  FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT ps.id FROM photo_sessions ps
      JOIN patients p ON ps.patient_id = p.id
      WHERE p.practitioner_id = auth.uid()
    )
  );

-- Policy: Praticiens peuvent supprimer leurs analyses
CREATE POLICY "Praticiens peuvent supprimer leurs analyses globales"
  ON global_face_analyses
  FOR DELETE
  USING (
    session_id IN (
      SELECT ps.id FROM photo_sessions ps
      JOIN patients p ON ps.patient_id = p.id
      WHERE p.practitioner_id = auth.uid()
    )
  );

-- Commentaires
COMMENT ON TABLE global_face_analyses IS 'Analyses esthétiques globales du visage générées par IA';
COMMENT ON COLUMN global_face_analyses.result IS 'Résultat structuré de l''analyse: summary, globalObservations, regionalAnalysis, agingConcerns, strengths, globalRecommendations';
