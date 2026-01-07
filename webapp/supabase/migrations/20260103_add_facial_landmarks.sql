-- Table pour stocker les landmarks faciaux détectés sur les photos
-- Permet de réutiliser les points de repère pour la calibration automatique

CREATE TABLE IF NOT EXISTS face_landmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  -- Landmarks MediaPipe (468 points normalisés)
  landmarks JSONB NOT NULL, -- Array de {x, y, z} en coordonnées normalisées [0-1]

  -- Points de repère clés extraits pour faciliter l'accès
  left_eye JSONB, -- {x, y} du centre de l'œil gauche (landmark #33)
  right_eye JSONB, -- {x, y} du centre de l'œil droit (landmark #263)
  nose_tip JSONB, -- {x, y} de la pointe du nez (landmark #1)
  mouth_left JSONB, -- {x, y} du coin gauche de la bouche (landmark #61)
  mouth_right JSONB, -- {x, y} du coin droit de la bouche (landmark #291)
  chin JSONB, -- {x, y} du menton (landmark #152)

  -- Dimensions calculées pour proportions faciales
  face_width NUMERIC, -- Distance entre les oreilles
  face_height NUMERIC, -- Distance front-menton
  eye_distance NUMERIC, -- Distance inter-pupillaire
  nose_width NUMERIC, -- Largeur du nez
  mouth_width NUMERIC, -- Largeur de la bouche

  -- Bounding box du visage détecté
  bbox_x NUMERIC NOT NULL,
  bbox_y NUMERIC NOT NULL,
  bbox_width NUMERIC NOT NULL,
  bbox_height NUMERIC NOT NULL,

  -- Confiance de la détection (0-1)
  confidence NUMERIC DEFAULT 1.0,

  -- Métadonnées
  detection_method TEXT DEFAULT 'mediapipe', -- mediapipe, dlib, etc.
  model_version TEXT, -- Version du modèle de détection
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide par photo/session
CREATE INDEX IF NOT EXISTS idx_face_landmarks_photo_id ON face_landmarks(photo_id);
CREATE INDEX IF NOT EXISTS idx_face_landmarks_session_id ON face_landmarks(session_id);

-- Trigger pour update_at
CREATE OR REPLACE FUNCTION update_face_landmarks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_face_landmarks_updated_at
  BEFORE UPDATE ON face_landmarks
  FOR EACH ROW
  EXECUTE FUNCTION update_face_landmarks_updated_at();

-- Commentaires
COMMENT ON TABLE face_landmarks IS 'Landmarks faciaux détectés via MediaPipe pour calibration automatique des masques';
COMMENT ON COLUMN face_landmarks.landmarks IS 'Array complet des 468 landmarks MediaPipe en format {x, y, z}';
COMMENT ON COLUMN face_landmarks.left_eye IS 'Centre de l''œil gauche (landmark #33)';
COMMENT ON COLUMN face_landmarks.right_eye IS 'Centre de l''œil droit (landmark #263)';
COMMENT ON COLUMN face_landmarks.eye_distance IS 'Distance inter-pupillaire normalisée';
