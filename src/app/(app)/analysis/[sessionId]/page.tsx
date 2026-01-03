"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

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

type ZoneMeta = {
  id: string;
  label: string;
  description: string | null;
};

type PhotoRow = {
  id: string;
  storage_path: string;
  created_at: string;
};

type ZoneAnalysis = {
  id: string;
  zone_id: string;
  result: {
    summary?: string;
    observations?: string[];
    possibleConcerns?: string[];
    suggestedFocus?: string[];
    disclaimer?: string;
    raw?: string;
  };
  created_at: string;
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

type ZoneGeometry = {
  id: string;
  points: [number, number][];
};

/**
 * Génère le contour du visage (masque facial) à partir des landmarks MediaPipe
 */
function generateFaceMask(
  landmarks: { x: number; y: number; z: number }[]
): ZoneGeometry | null {
  if (!landmarks || landmarks.length < 478) {
    return null;
  }

  // Utiliser les landmarks du contour du visage MediaPipe
  // https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
  const faceOvalIndices = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
    397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
    172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
  ];

  const contourPoints: [number, number][] = faceOvalIndices.map(index => {
    const point = landmarks[index] ?? landmarks[0];
    return [point.x * 100, point.y * 100];
  });

  return {
    id: "face_mask",
    points: contourPoints
  };
}

/**
 * Adapte les zones de calibration à la morphologie du visage détecté
 * en appliquant une transformation proportionnelle
 */
function adaptZonesToFace(
  calibrationZones: ZoneGeometry[],
  landmarks: { x: number; y: number; z: number }[]
): ZoneGeometry[] {
  if (!landmarks || landmarks.length < 478 || calibrationZones.length === 0) {
    return calibrationZones;
  }

  // Points clés du visage pour calculer les dimensions réelles
  const pick = (index: number): [number, number] => {
    const point = landmarks[index] ?? landmarks[0];
    return [point.x * 100, point.y * 100];
  };

  // Points de référence anatomiques
  const forehead = pick(10);
  const chin = pick(152);
  const leftEye = pick(133);
  const rightEye = pick(362);
  const noseTip = pick(1);
  const leftCheek = pick(234);
  const rightCheek = pick(454);

  // Dimensions du visage détecté
  const detectedFaceWidth = Math.abs(rightCheek[0] - leftCheek[0]);
  const detectedFaceHeight = Math.abs(chin[1] - forehead[1]);
  const detectedCenterX = (leftCheek[0] + rightCheek[0]) / 2;
  const detectedCenterY = (forehead[1] + chin[1]) / 2;

  // Dimensions de référence de la calibration (calculées depuis les zones)
  const allCalibPoints = calibrationZones.flatMap(z => z.points);
  const calibXs = allCalibPoints.map(([x]) => x);
  const calibYs = allCalibPoints.map(([, y]) => y);
  const calibMinX = Math.min(...calibXs);
  const calibMaxX = Math.max(...calibXs);
  const calibMinY = Math.min(...calibYs);
  const calibMaxY = Math.max(...calibYs);
  const calibWidth = calibMaxX - calibMinX;
  const calibHeight = calibMaxY - calibMinY;
  const calibCenterX = (calibMinX + calibMaxX) / 2;
  const calibCenterY = (calibMinY + calibMaxY) / 2;

  // Facteurs d'échelle pour adapter les zones
  const scaleX = detectedFaceWidth / calibWidth;
  const scaleY = detectedFaceHeight / calibHeight;

  // Transformation proportionnelle de chaque zone
  return calibrationZones.map(zone => {
    const adaptedPoints = zone.points.map(([x, y]) => {
      // Centrer le point par rapport à la calibration
      const relX = x - calibCenterX;
      const relY = y - calibCenterY;

      // Appliquer l'échelle proportionnelle
      const scaledX = relX * scaleX;
      const scaledY = relY * scaleY;

      // Recentrer sur le visage détecté
      const finalX = scaledX + detectedCenterX;
      const finalY = scaledY + detectedCenterY;

      return [finalX, finalY] as [number, number];
    });

    return {
      id: zone.id,
      points: adaptedPoints
    };
  });
}

const DEFAULT_ZONE_GEOMETRY: ZoneGeometry[] = [
  {
    id: "frontal",
    points: [
      [18, 6],
      [82, 6],
      [78, 24],
      [50, 28],
      [22, 24],
    ],
  },
  {
    id: "glabella",
    points: [
      [44, 26],
      [56, 26],
      [58, 40],
      [50, 44],
      [42, 40],
    ],
  },
  {
    id: "temporal_left",
    points: [
      [78, 18],
      [96, 22],
      [92, 40],
      [76, 36],
    ],
  },
  {
    id: "temporal_right",
    points: [
      [4, 22],
      [22, 18],
      [24, 36],
      [8, 40],
    ],
  },
  {
    id: "peri_orbital_upper_left",
    points: [
      [56, 26],
      [84, 28],
      [82, 40],
      [60, 40],
    ],
  },
  {
    id: "peri_orbital_upper_right",
    points: [
      [16, 28],
      [44, 26],
      [40, 40],
      [18, 40],
    ],
  },
  {
    id: "peri_orbital_lower_left",
    points: [
      [58, 40],
      [82, 40],
      [80, 52],
      [62, 52],
    ],
  },
  {
    id: "peri_orbital_lower_right",
    points: [
      [20, 40],
      [42, 40],
      [38, 52],
      [22, 52],
    ],
  },
  {
    id: "nasal",
    points: [
      [44, 40],
      [56, 40],
      [60, 70],
      [50, 74],
      [40, 70],
    ],
  },
  {
    id: "malar_left",
    points: [
      [60, 48],
      [88, 52],
      [86, 66],
      [64, 64],
      [56, 56],
    ],
  },
  {
    id: "malar_right",
    points: [
      [12, 52],
      [40, 48],
      [44, 56],
      [36, 64],
      [14, 66],
    ],
  },
  {
    id: "nasolabial_left",
    points: [
      [56, 60],
      [70, 60],
      [72, 76],
      [58, 76],
    ],
  },
  {
    id: "nasolabial_right",
    points: [
      [30, 60],
      [44, 60],
      [42, 76],
      [28, 76],
    ],
  },
  {
    id: "perioral",
    points: [
      [34, 68],
      [66, 68],
      [66, 82],
      [50, 88],
      [34, 82],
    ],
  },
  {
    id: "lip_upper",
    points: [
      [38, 70],
      [62, 70],
      [60, 78],
      [50, 80],
      [40, 78],
    ],
  },
  {
    id: "lip_lower",
    points: [
      [40, 78],
      [60, 78],
      [62, 86],
      [50, 88],
      [38, 86],
    ],
  },
  {
    id: "marionette_left",
    points: [
      [56, 78],
      [70, 78],
      [72, 92],
      [58, 92],
    ],
  },
  {
    id: "marionette_right",
    points: [
      [28, 78],
      [44, 78],
      [42, 92],
      [26, 92],
    ],
  },
  {
    id: "chin",
    points: [
      [38, 84],
      [62, 84],
      [70, 98],
      [30, 98],
    ],
  },
  {
    id: "mandibular_left",
    points: [
      [70, 82],
      [90, 90],
      [78, 100],
      [60, 90],
    ],
  },
  {
    id: "mandibular_right",
    points: [
      [10, 90],
      [30, 82],
      [40, 90],
      [22, 100],
    ],
  },
];

export default function AnalysisPage() {
  const params = useParams();
  const sessionId = Array.isArray(params?.sessionId)
    ? params.sessionId[0]
    : params?.sessionId;

  const [zones, setZones] = useState<ZoneMeta[]>([]);
  const [facePhoto, setFacePhoto] = useState<PhotoRow | null>(null);
  const [signedUrl, setSignedUrl] = useState("");
  const [analyses, setAnalyses] = useState<ZoneAnalysis[]>([]);
  const [globalAnalysis, setGlobalAnalysis] = useState<GlobalAnalysis | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [model, setModel] = useState("XX");
  const [status, setStatus] = useState<"idle" | "loading" | "analyzing">(
    "idle"
  );
  const [globalStatus, setGlobalStatus] = useState<"idle" | "analyzing">("idle");
  const [error, setError] = useState("");
  const [calibration, setCalibration] = useState<Record<string, [number, number][]>>(
    {}
  );
  const [zoneExclusions, setZoneExclusions] = useState<
    Record<string, [number, number][]>
  >({});
  const [zoneOverrides, setZoneOverrides] = useState<
    Record<string, [number, number][]>
  >({});
  const [editMode, setEditMode] = useState(false);
  const [editPoints, setEditPoints] = useState<[number, number][]>([]);
  const [dragPointIndex, setDragPointIndex] = useState<number | null>(null);
  const [maskFit, setMaskFit] = useState({ scale: 1, offset_x: 0, offset_y: 0 });
  const [autoFit, setAutoFit] = useState({ scale: 1, offset_x: 0, offset_y: 0 });
  const [autoFitEnabled, setAutoFitEnabled] = useState(true);
  const [faceLandmarks, setFaceLandmarks] = useState<{ x: number; y: number; z: number }[] | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);

  const storageBucket = useMemo(
    () => process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET,
    []
  );

  useEffect(() => {
    async function fetchData() {
      if (!sessionId) {
        return;
      }
      setStatus("loading");
      setError("");

      const { data: zoneData, error: zoneError } = await supabaseBrowser
        .from("face_zones")
        .select("id, label, description")
        .order("label", { ascending: true });

      if (zoneError) {
        setError(zoneError.message);
      } else {
        setZones(zoneData ?? []);
      }

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

      if (photoData) {
        const { data: analysisData, error: analysisError } =
          await supabaseBrowser
            .from("face_zone_analyses")
            .select("id, zone_id, result, created_at")
            .eq("session_id", sessionId)
            .eq("photo_id", photoData.id)
            .order("created_at", { ascending: false });

        if (analysisError) {
          setError(analysisError.message);
        } else {
          setAnalyses(analysisData ?? []);
        }

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

        const { data: overrideData } = await supabaseBrowser
          .from("face_zone_overrides")
          .select("zone_id, points")
          .eq("session_id", sessionId)
          .eq("photo_id", photoData.id);

        if (overrideData) {
          const mapped: Record<string, [number, number][]> = {};
          overrideData.forEach((row) => {
            mapped[row.zone_id] = (row.points as [number, number][]) ?? [];
          });
          setZoneOverrides(mapped);
        } else {
          setZoneOverrides({});
        }

        const { data: fitData } = await supabaseBrowser
          .from("face_mask_fits")
          .select("scale, offset_x, offset_y")
          .eq("session_id", sessionId)
          .eq("photo_id", photoData.id)
          .eq("model", model)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fitData) {
          setMaskFit({
            scale: Number(fitData.scale ?? 1),
            offset_x: Number(fitData.offset_x ?? 0),
            offset_y: Number(fitData.offset_y ?? 0),
          });
        } else {
          setMaskFit({ scale: 1, offset_x: 0, offset_y: 0 });
        }
      }

      setStatus("idle");
    }

    fetchData();
  }, [sessionId, storageBucket, model]);

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

  useEffect(() => {
    async function fetchModelFromPatient() {
      if (!sessionId) {
        return;
      }
      const { data } = await supabaseBrowser
        .from("sessions")
        .select("patients(sex)")
        .eq("id", sessionId)
        .maybeSingle();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const patients = (data as any)?.patients;
      const sexValue = Array.isArray(patients)
        ? patients[0]?.sex
        : patients?.sex;
      setModel(sexValue === "male" ? "XY" : "XX");
    }

    fetchModelFromPatient();
  }, [sessionId]);

  useEffect(() => {
    async function fetchCalibration() {
      const { data, error: calibrationError } = await supabaseBrowser
        .from("face_calibrations")
        .select("zones, zone_exclusions")
        .eq("model", model)
        .maybeSingle();

      if (calibrationError) {
        setCalibration({});
        setZoneExclusions({});
        return;
      }

      const zonesData = (data?.zones as Record<string, [number, number][]>) ?? {};
      setCalibration(zonesData);
      const exclusionsData =
        (data?.zone_exclusions as Record<string, [number, number][]>) ?? {};
      setZoneExclusions(exclusionsData);
    }

    fetchCalibration();
  }, [model]);

  const calibratedGeometry = useMemo(() => {
    // Préparer les zones de calibration de base
    let baseZones: ZoneGeometry[] = [];

    if (calibration && Object.keys(calibration).length > 0) {
      baseZones = Object.entries(calibration)
        .filter(([, points]) => Array.isArray(points) && points.length > 2)
        .map(([id, points]) => ({ id, points }));
    } else {
      baseZones = DEFAULT_ZONE_GEOMETRY;
    }

    // Si on a les landmarks MediaPipe, adapter les zones à la morphologie du visage
    if (faceLandmarks && faceLandmarks.length >= 478) {
      // D'abord générer le masque du visage
      const faceMask = generateFaceMask(faceLandmarks);

      // Adapter les zones de calibration au visage détecté
      const adaptedZones = adaptZonesToFace(baseZones, faceLandmarks);

      // Ajouter le masque du visage si disponible
      if (faceMask) {
        return [faceMask, ...adaptedZones];
      }

      return adaptedZones;
    }

    // Sans landmarks, utiliser les zones de calibration brutes
    return baseZones;
  }, [faceLandmarks, calibration, model]);

  useEffect(() => {
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
      });
      landmarkerRef.current = landmarker;
      return landmarker;
    }

    async function computeAutoFit() {
      if (!signedUrl) {
        return;
      }
      try {
        const landmarker = await getLandmarker();
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.src = signedUrl;
        await image.decode();

        const results = landmarker.detect(image);
        const face = results.faceLandmarks?.[0];
        if (!face || face.length === 0) {
          return;
        }

        // Sauvegarder les landmarks pour la génération intelligente des zones
        setFaceLandmarks(face);

        const pick = (index: number) => face[index] ?? face[0];
        const leftEyeOuter = pick(33);
        const rightEyeOuter = pick(263);
        const noseTip = pick(1);
        const mouthLeft = pick(61);
        const mouthRight = pick(291);
        const chin = pick(152);

        const keyPoints = [
          leftEyeOuter,
          rightEyeOuter,
          noseTip,
          mouthLeft,
          mouthRight,
          chin,
        ]
          .filter(Boolean)
          .map((point) => [point.x * 100, point.y * 100] as [number, number]);

        let faceMinX = Math.min(...keyPoints.map(([x]) => x));
        let faceMaxX = Math.max(...keyPoints.map(([x]) => x));
        let faceMinY = Math.min(...keyPoints.map(([, y]) => y));
        let faceMaxY = Math.max(...keyPoints.map(([, y]) => y));

        const marginX = (faceMaxX - faceMinX) * 0.18;
        const marginY = (faceMaxY - faceMinY) * 0.35;
        faceMinX -= marginX;
        faceMaxX += marginX;
        faceMinY -= marginY;
        faceMaxY += marginY;

        const maskXs = calibratedGeometry.flatMap((zone) =>
          zone.points.map(([x]) => x)
        );
        const maskYs = calibratedGeometry.flatMap((zone) =>
          zone.points.map(([, y]) => y)
        );
        if (maskXs.length === 0 || maskYs.length === 0) {
          return;
        }

        const maskMinX = Math.min(...maskXs);
        const maskMaxX = Math.max(...maskXs);
        const maskMinY = Math.min(...maskYs);
        const maskMaxY = Math.max(...maskYs);
        const maskWidth = maskMaxX - maskMinX;
        const maskHeight = maskMaxY - maskMinY;
        if (maskWidth <= 0 || maskHeight <= 0) {
          return;
        }

        const faceWidth = faceMaxX - faceMinX;
        const faceHeight = faceMaxY - faceMinY;
        const nextScale = Math.min(faceWidth / maskWidth, faceHeight / maskHeight);
        const maskCenterX = (maskMinX + maskMaxX) / 2;
        const maskCenterY = (maskMinY + maskMaxY) / 2;
        const faceCenterX = (faceMinX + faceMaxX) / 2;
        const faceCenterY = (faceMinY + faceMaxY) / 2;

        setAutoFit({
          scale: Number(nextScale.toFixed(3)),
          offset_x: faceCenterX - maskCenterX,
          offset_y: faceCenterY - maskCenterY,
        });
      } catch {
        return;
      }
    }

    if (autoFitEnabled) {
      computeAutoFit();
    }
  }, [signedUrl, autoFitEnabled, calibratedGeometry]);

  const transformedGeometry = useMemo(() => {
    // Calculer le centre de la bbox du masque complet
    const allMaskPoints = calibratedGeometry.flatMap((zone) => zone.points);
    if (allMaskPoints.length === 0) {
      return calibratedGeometry;
    }

    const maskXs = allMaskPoints.map(([x]) => x);
    const maskYs = allMaskPoints.map(([, y]) => y);
    const maskCenterX = (Math.min(...maskXs) + Math.max(...maskXs)) / 2;
    const maskCenterY = (Math.min(...maskYs) + Math.max(...maskYs)) / 2;

    const appliedFit = autoFitEnabled ? autoFit : maskFit;

    const apply = (points: [number, number][]) =>
      points.map(([x, y]) => [
        (x - maskCenterX) * appliedFit.scale + maskCenterX + appliedFit.offset_x,
        (y - maskCenterY) * appliedFit.scale + maskCenterY + appliedFit.offset_y,
      ]) as [number, number][];

    return calibratedGeometry.map((zone) => ({
      ...zone,
      points: apply(zone.points),
    }));
  }, [calibratedGeometry, maskFit, autoFit, autoFitEnabled]);

  const finalGeometry = useMemo(() => {
    return transformedGeometry.map((zone) => {
      const override = zoneOverrides[zone.id];
      const edited =
        editMode && selectedZoneId === zone.id && editPoints.length > 2
          ? editPoints
          : null;
      return {
        ...zone,
        points: edited ?? override ?? zone.points,
      };
    });
  }, [transformedGeometry, zoneOverrides, editMode, editPoints, selectedZoneId]);

  const zoneMeta = useMemo(() => {
    if (!selectedZoneId) {
      return null;
    }
    return zones.find((zone) => zone.id === selectedZoneId) ?? null;
  }, [zones, selectedZoneId]);

  const zoneGeometry = useMemo(() => {
    if (!selectedZoneId) {
      return null;
    }
    return finalGeometry.find((zone) => zone.id === selectedZoneId) ?? null;
  }, [finalGeometry, selectedZoneId]);

  const zoneAnalysis = useMemo(() => {
    if (!selectedZoneId) {
      return null;
    }
    return analyses.find((item) => item.zone_id === selectedZoneId) ?? null;
  }, [analyses, selectedZoneId]);

  async function createZoneDataUrl(
    imageUrl: string,
    points: [number, number][],
    exclusion?: [number, number][]
  ) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageUrl;
    await image.decode();

    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;

    const normalized = points.map(([x, y]) => [x / 100, y / 100]);
    const xs = normalized.map(([x]) => x * width);
    const ys = normalized.map(([, y]) => y * height);
    const minX = Math.max(Math.floor(Math.min(...xs)), 0);
    const maxX = Math.min(Math.ceil(Math.max(...xs)), width);
    const minY = Math.max(Math.floor(Math.min(...ys)), 0);
    const maxY = Math.min(Math.ceil(Math.max(...ys)), height);
    const cropWidth = Math.max(maxX - minX, 1);
    const cropHeight = Math.max(maxY - minY, 1);

    const baseCanvas = document.createElement("canvas");
    baseCanvas.width = width;
    baseCanvas.height = height;
    const baseCtx = baseCanvas.getContext("2d");
    if (!baseCtx) {
      return "";
    }

    baseCtx.save();
    baseCtx.beginPath();
    normalized.forEach(([x, y], index) => {
      const px = x * width;
      const py = y * height;
      if (index === 0) {
        baseCtx.moveTo(px, py);
      } else {
        baseCtx.lineTo(px, py);
      }
    });
    baseCtx.closePath();

    if (exclusion && exclusion.length > 2) {
      const normalizedExclude = exclusion.map(([x, y]) => [x / 100, y / 100]);
      normalizedExclude.forEach(([x, y], index) => {
        if (index === 0) {
          baseCtx.moveTo(x * width, y * height);
        } else {
          baseCtx.lineTo(x * width, y * height);
        }
      });
      baseCtx.closePath();
      baseCtx.clip("evenodd");
    } else {
      baseCtx.clip();
    }

    baseCtx.drawImage(image, 0, 0, width, height);
    baseCtx.restore();

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = cropWidth;
    cropCanvas.height = cropHeight;
    const cropCtx = cropCanvas.getContext("2d");
    if (!cropCtx) {
      return "";
    }

    cropCtx.drawImage(
      baseCanvas,
      minX,
      minY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    return cropCanvas.toDataURL("image/jpeg", 0.9);
  }

  async function handleAnalyzeZone() {
    if (!sessionId || !facePhoto || !selectedZoneId || !signedUrl) {
      return;
    }
    const geometry = finalGeometry.find(
      (zone) => zone.id === selectedZoneId
    );
    if (!geometry) {
      return;
    }

    setStatus("analyzing");
    setError("");

    let imageDataUrl = "";
    try {
      // Calculer le centre du masque complet pour la transformation
      const allMaskPoints = calibratedGeometry.flatMap((zone) => zone.points);
      const maskXs = allMaskPoints.map(([x]) => x);
      const maskYs = allMaskPoints.map(([, y]) => y);
      const maskCenterX = (Math.min(...maskXs) + Math.max(...maskXs)) / 2;
      const maskCenterY = (Math.min(...maskYs) + Math.max(...maskYs)) / 2;

      const appliedFit = autoFitEnabled ? autoFit : maskFit;
      const exclusion = zoneExclusions[selectedZoneId]
        ? (zoneExclusions[selectedZoneId].map(([x, y]) => [
            (x - maskCenterX) * appliedFit.scale + maskCenterX + appliedFit.offset_x,
            (y - maskCenterY) * appliedFit.scale + maskCenterY + appliedFit.offset_y,
          ]) as [number, number][])
        : undefined;
      imageDataUrl = await createZoneDataUrl(
        signedUrl,
        geometry.points,
        exclusion
      );
    } catch (error) {
      imageDataUrl = "";
    }

    if (!imageDataUrl) {
      setError("Impossible de preparer la zone. Verifie le CORS storage.");
      setStatus("idle");
      return;
    }

    const response = await fetch("/api/analysis/face-zone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        photoId: facePhoto.id,
        zoneId: selectedZoneId,
        imageDataUrl,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "Erreur analyse.");
      setStatus("idle");
      return;
    }

    const payload = await response.json();
    setAnalyses((prev) => [
      payload.data,
      ...prev.filter((item) => item.zone_id !== selectedZoneId),
    ]);
    setStatus("idle");
  }

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

  if (!sessionId) {
    return <div className="text-sm text-zinc-500">Session invalide.</div>;
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
              Clique sur une zone pour une analyse ciblée, ou lance une analyse globale du visage.
            </p>
          </div>
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
      </header>

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
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="relative overflow-hidden rounded-2xl bg-zinc-100">
              <img
                alt="Photo face"
                className="w-full object-cover"
                src={signedUrl}
              />
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 100 100"
                onPointerMove={(event) => {
                  if (dragPointIndex === null) {
                    return;
                  }
                  const rect = (
                    event.currentTarget as SVGSVGElement
                  ).getBoundingClientRect();
                  const x = ((event.clientX - rect.left) / rect.width) * 100;
                  const y = ((event.clientY - rect.top) / rect.height) * 100;
                  setEditPoints((prev) =>
                    prev.map((point, index) =>
                      index === dragPointIndex
                        ? [Math.min(Math.max(x, 0), 100), Math.min(Math.max(y, 0), 100)]
                        : point
                    )
                  );
                }}
                onPointerUp={() => setDragPointIndex(null)}
                onPointerLeave={() => setDragPointIndex(null)}
              >
                {finalGeometry.map((zone) => (
                  <polygon
                    key={zone.id}
                    points={zone.points.map(([x, y]) => `${x},${y}`).join(" ")}
                    fill={
                      selectedZoneId === zone.id
                        ? "rgba(45, 212, 191, 0.4)"
                        : "rgba(59, 130, 246, 0.18)"
                    }
                    stroke={
                      selectedZoneId === zone.id
                        ? "rgba(13, 148, 136, 0.9)"
                        : "rgba(59, 130, 246, 0.5)"
                    }
                    strokeWidth="0.5"
                    onClick={() => setSelectedZoneId(zone.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <title>
                      {zones.find((meta) => meta.id === zone.id)?.label ?? zone.id}
                    </title>
                  </polygon>
                ))}
                {editMode && editPoints.length > 0
                  ? editPoints.map(([x, y], index) => (
                      <circle
                        key={`edit-${x}-${y}-${index}`}
                        cx={x}
                        cy={y}
                        r="0.9"
                        fill="white"
                        stroke="black"
                        strokeWidth="0.3"
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          event.currentTarget.setPointerCapture(event.pointerId);
                          setDragPointIndex(index);
                        }}
                        style={{ cursor: "grab" }}
                      />
                    ))
                  : null}
              </svg>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                Zone selectionnee
              </p>
              <h2 className="mt-2 text-xl font-semibold text-zinc-900">
                {zoneMeta?.label ?? "Choisir une zone"}
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                {zoneMeta?.description ?? "Clique sur une zone bleue."}
              </p>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Modele
              </label>
              <select
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
                value={model}
                onChange={(event) => setModel(event.target.value)}
              >
                <option value="XX">XX (femme)</option>
                <option value="XY">XY (homme)</option>
              </select>
              <a
                className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                href="/calibration"
              >
                Calibrer les modeles
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-700"
                href={`/mask-fit/${sessionId}?auto=1`}
              >
                Auto-ajuster le masque
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className={`rounded-full border border-zinc-200 px-3 py-1 text-xs ${
                  autoFitEnabled ? "bg-zinc-900 text-white" : "text-zinc-700"
                }`}
                onClick={() => setAutoFitEnabled((prev) => !prev)}
                type="button"
              >
                {autoFitEnabled ? "Zones auto (ON)" : "Zones auto (OFF)"}
              </button>
              <button
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-700"
                onClick={() => {
                  if (!selectedZoneId) {
                    return;
                  }
                  setEditMode(true);
                  const zone = finalGeometry.find(
                    (item) => item.id === selectedZoneId
                  );
                  setEditPoints(zone?.points ?? []);
                }}
                type="button"
              >
                Ajuster la zone
              </button>
              {editMode ? (
                <>
                  <button
                    className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-white"
                    onClick={async () => {
                      if (!selectedZoneId || !facePhoto) {
                        return;
                      }
                      const { error: saveError } = await supabaseBrowser
                        .from("face_zone_overrides")
                        .upsert({
                          session_id: sessionId,
                          photo_id: facePhoto.id,
                          zone_id: selectedZoneId,
                          points: editPoints,
                        });
                      if (!saveError) {
                        setZoneOverrides((prev) => ({
                          ...prev,
                          [selectedZoneId]: editPoints,
                        }));
                        setEditMode(false);
                      }
                    }}
                    type="button"
                  >
                    Sauver
                  </button>
                  <button
                    className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-700"
                    onClick={async () => {
                      if (!selectedZoneId || !facePhoto) {
                        return;
                      }
                      await supabaseBrowser
                        .from("face_zone_overrides")
                        .delete()
                        .eq("session_id", sessionId)
                        .eq("photo_id", facePhoto.id)
                        .eq("zone_id", selectedZoneId);
                      setZoneOverrides((prev) => {
                        const next = { ...prev };
                        delete next[selectedZoneId];
                        return next;
                      });
                      setEditMode(false);
                      setEditPoints([]);
                    }}
                    type="button"
                  >
                    Reset
                  </button>
                </>
              ) : null}
            </div>
            <button
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              disabled={!selectedZoneId || status === "analyzing"}
              onClick={handleAnalyzeZone}
              type="button"
            >
              {status === "analyzing"
                ? "Analyse en cours..."
                : "Analyser la zone"}
            </button>

            {zoneAnalysis ? (
              <div className="space-y-4">
                {/* Résumé principal */}
                <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-900">
                      Analyse
                    </h3>
                  </div>
                  <p className="text-base leading-relaxed text-gray-800">
                    {highlightKeywords(zoneAnalysis.result.summary ?? zoneAnalysis.result.raw ?? "")}
                  </p>
                </div>

                {/* Observations */}
                {zoneAnalysis.result.observations?.length ? (
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-900">
                        Observations
                      </h3>
                    </div>
                    <ul className="space-y-3">
                      {zoneAnalysis.result.observations.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 text-sm text-gray-700"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400"></span>
                          <span className="leading-relaxed">{highlightKeywords(item)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Préoccupations potentielles */}
                {zoneAnalysis.result.possibleConcerns?.length ? (
                  <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500"></div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-900">
                        Points d&apos;attention
                      </h3>
                    </div>
                    <ul className="space-y-3">
                      {zoneAnalysis.result.possibleConcerns.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 text-sm text-gray-700"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400"></span>
                          <span className="leading-relaxed">{highlightKeywords(item)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Recommandations */}
                {zoneAnalysis.result.suggestedFocus?.length ? (
                  <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-violet-500"></div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-900">
                        Recommandations
                      </h3>
                    </div>
                    <ul className="space-y-3">
                      {zoneAnalysis.result.suggestedFocus.map((item, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 text-sm text-gray-700"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-400"></span>
                          <span className="leading-relaxed font-medium">{highlightKeywords(item)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Disclaimer discret */}
                <p className="rounded-lg bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-500">
                  {zoneAnalysis.result.disclaimer ??
                    "Ces observations sont à visée esthétique uniquement et ne constituent pas un diagnostic médical."}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                <p className="text-sm text-gray-500">
                  Sélectionnez une zone et cliquez sur &quot;Analyser la zone&quot; pour obtenir une analyse détaillée
                </p>
              </div>
            )}
          </div>
        </section>
      )}

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
