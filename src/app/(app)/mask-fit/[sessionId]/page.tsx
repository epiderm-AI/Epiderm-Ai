"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

type Point = [number, number];

type PhotoRow = {
  id: string;
  storage_path: string;
};

export default function MaskFitPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = Array.isArray(params?.sessionId)
    ? params.sessionId[0]
    : params?.sessionId;

  const [model, setModel] = useState("XX");
  const [maskPoints, setMaskPoints] = useState<Point[]>([]);
  const [photo, setPhoto] = useState<PhotoRow | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("idle");
  const [autoStatus, setAutoStatus] = useState<"idle" | "running">("idle");
  const [autoRequested, setAutoRequested] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const offsetStartRef = useRef<{ x: number; y: number } | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);

  const storageBucket = useMemo(
    () => process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET,
    []
  );

  useEffect(() => {
    async function fetchBaseData() {
      if (!sessionId) {
        return;
      }
      setStatus("loading");

      const { data: sessionData } = await supabaseBrowser
        .from("sessions")
        .select("id, patients(sex)")
        .eq("id", sessionId)
        .maybeSingle();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const patients = (sessionData as any)?.patients;
      const sexValue = Array.isArray(patients)
        ? patients[0]?.sex
        : patients?.sex;
      const nextModel = sexValue === "male" ? "XY" : "XX";
      setModel(nextModel);

      const { data: photoData } = await supabaseBrowser
        .from("photos")
        .select("id, storage_path")
        .eq("session_id", sessionId)
        .eq("angle", "face")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (photoData) {
        setPhoto(photoData);
        if (storageBucket) {
          const { data: signedData } = await supabaseBrowser.storage
            .from(storageBucket)
            .createSignedUrl(photoData.storage_path, 60 * 60);
          setImageUrl(signedData?.signedUrl ?? "");
        }

        const { data: fitData } = await supabaseBrowser
          .from("face_mask_fits")
          .select("scale, offset_x, offset_y")
          .eq("session_id", sessionId)
          .eq("photo_id", photoData.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fitData) {
          setScale(Number(fitData.scale ?? 1));
          setOffset({
            x: Number(fitData.offset_x ?? 0),
            y: Number(fitData.offset_y ?? 0),
          });
        }
      }

      setStatus("idle");
    }

    fetchBaseData();
  }, [sessionId, storageBucket]);

  useEffect(() => {
    if (searchParams?.get("auto") === "1") {
      setAutoRequested(true);
    }
  }, [searchParams]);

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
    async function fetchMask() {
      const { data } = await supabaseBrowser
        .from("face_calibrations")
        .select("mask")
        .eq("model", model)
        .maybeSingle();

      setMaskPoints((data?.mask as Point[]) ?? []);
    }

    fetchMask();
  }, [model]);

  useEffect(() => {
    if (!autoRequested || autoStatus === "running") {
      return;
    }
    if (imageUrl && maskPoints.length > 2) {
      handleAutoFit();
      setAutoRequested(false);
    }
  }, [autoRequested, autoStatus, imageUrl, maskPoints]);

  const transformedMask = useMemo(() => {
    if (maskPoints.length === 0) {
      return [];
    }
    return maskPoints.map(([x, y]) => [
      (x - 50) * scale + 50 + offset.x,
      (y - 50) * scale + 50 + offset.y,
    ]) as Point[];
  }, [maskPoints, scale, offset]);

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

  async function handleAutoFit() {
    if (!imageUrl || maskPoints.length < 3 || !containerRef.current || !photo || !sessionId) {
      return;
    }
    setAutoStatus("running");
    setMessage("");

    try {
      const landmarker = await getLandmarker();
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = imageUrl;
      await image.decode();

      const results = landmarker.detect(image);
      const face = results.faceLandmarks?.[0];
      if (!face || face.length === 0) {
        setMessage("Aucun visage detecte.");
        setAutoStatus("idle");
        return;
      }

      const pick = (index: number) => face[index] ?? face[0];
      const leftEye = pick(33);
      const rightEye = pick(263);
      const noseTip = pick(1);
      const mouthLeft = pick(61);
      const mouthRight = pick(291);
      const chin = pick(152);
      const leftCheek = pick(234);
      const rightCheek = pick(454);

      // Calculer les proportions faciales pour une calibration précise
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

      const faceWidth = Math.sqrt(
        Math.pow((rightCheek.x - leftCheek.x) * 100, 2) +
        Math.pow((rightCheek.y - leftCheek.y) * 100, 2)
      );

      const faceHeight = Math.sqrt(
        Math.pow((chin.x - pick(10).x) * 100, 2) + // Landmark 10 = forehead
        Math.pow((chin.y - pick(10).y) * 100, 2)
      );

      // Sauvegarder les landmarks dans la base de données pour référence future
      await supabaseBrowser.from("face_landmarks").insert({
        photo_id: photo.id,
        session_id: sessionId,
        landmarks: face.map((point) => ({ x: point.x, y: point.y, z: point.z })),
        left_eye: { x: leftEye.x * 100, y: leftEye.y * 100 },
        right_eye: { x: rightEye.x * 100, y: rightEye.y * 100 },
        nose_tip: { x: noseTip.x * 100, y: noseTip.y * 100 },
        mouth_left: { x: mouthLeft.x * 100, y: mouthLeft.y * 100 },
        mouth_right: { x: mouthRight.x * 100, y: mouthRight.y * 100 },
        chin: { x: chin.x * 100, y: chin.y * 100 },
        face_width: faceWidth,
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
      });

      const keyPoints = [
        leftEye,
        rightEye,
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

      // Utiliser les proportions faciales pour des marges plus précises
      // Proportions moyennes: front = 1/3, yeux-nez = 1/3, nez-menton = 1/3
      const marginX = eyeDistance * 0.9; // Marges latérales basées sur la distance inter-pupillaire
      const marginTop = eyeDistance * 0.65; // Marge supérieure pour le front
      const marginBottom = eyeDistance * 0.35; // Marge inférieure pour la mâchoire

      faceMinX -= marginX;
      faceMaxX += marginX;
      faceMinY -= marginTop;
      faceMaxY += marginBottom;

      const maskXs = maskPoints.map(([x]) => x);
      const maskYs = maskPoints.map(([, y]) => y);
      const maskMinX = Math.min(...maskXs);
      const maskMaxX = Math.max(...maskXs);
      const maskMinY = Math.min(...maskYs);
      const maskMaxY = Math.max(...maskYs);

      const detectedFaceWidth = faceMaxX - faceMinX;
      const detectedFaceHeight = faceMaxY - faceMinY;
      const maskWidth = maskMaxX - maskMinX;
      const maskHeight = maskMaxY - maskMinY;

      if (maskWidth <= 0 || maskHeight <= 0) {
        setAutoStatus("idle");
        return;
      }

      const nextScale = Math.min(
        detectedFaceWidth / maskWidth,
        detectedFaceHeight / maskHeight
      );
      const maskCenterX = (maskMinX + maskMaxX) / 2;
      const maskCenterY = (maskMinY + maskMaxY) / 2;
      const faceCenterX = (faceMinX + faceMaxX) / 2;
      const faceCenterY = (faceMinY + faceMaxY) / 2;

      setScale(Number(nextScale.toFixed(3)));
      setOffset({
        x: faceCenterX - maskCenterX,
        y: faceCenterY - maskCenterY,
      });

      setMessage("Calibration automatique réussie avec détection des proportions faciales.");
    } catch (error) {
      console.error("Auto-fit error:", error);
      setMessage("Auto-fit impossible. Vérifiez que le visage est bien visible.");
    } finally {
      setAutoStatus("idle");
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!containerRef.current) {
      return;
    }
    setDragging(true);
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    offsetStartRef.current = { ...offset };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !dragStartRef.current || !offsetStartRef.current) {
      return;
    }
    if (!containerRef.current) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const dx = ((event.clientX - dragStartRef.current.x) / rect.width) * 100;
    const dy = ((event.clientY - dragStartRef.current.y) / rect.height) * 100;
    setOffset({
      x: offsetStartRef.current.x + dx,
      y: offsetStartRef.current.y + dy,
    });
  }

  function handlePointerUp() {
    setDragging(false);
    dragStartRef.current = null;
    offsetStartRef.current = null;
  }

  async function handleSave() {
    if (!sessionId || !photo) {
      return;
    }
    setStatus("saving");
    setMessage("");

    await supabaseBrowser
      .from("face_mask_fits")
      .delete()
      .eq("session_id", sessionId)
      .eq("photo_id", photo.id);

    const { error } = await supabaseBrowser.from("face_mask_fits").insert({
      session_id: sessionId,
      photo_id: photo.id,
      model,
      scale,
      offset_x: offset.x,
      offset_y: offset.y,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Masque enregistre.");
      router.push(`/analysis/${sessionId}`);
    }
    setStatus("idle");
  }

  if (!sessionId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card variant="glass" padding="lg" className="text-center">
          <p className="text-slate-600">Session invalide.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="space-y-4 animate-fadeIn">
        <div>
          <h1 className="bg-gradient-to-r from-indigo-600 via-pink-600 to-teal-600 bg-clip-text text-4xl font-bold text-transparent">
            Ajuster le masque
          </h1>
          <p className="mt-2 text-lg text-slate-600">
            Faites glisser le masque pour l'aligner et ajustez le zoom.
          </p>
        </div>
      </header>

      {message ? (
        <div className={`animate-fadeIn rounded-xl px-4 py-3 text-sm font-medium ${
          message.includes("succes") || message.includes("reussie")
            ? "border border-green-300 bg-green-50 text-green-700"
            : "border border-slate-300 bg-slate-50 text-slate-700"
        }`}>
          {message}
        </div>
      ) : null}

      <Card variant="gradient" className="animate-slideInDown" style={{ animationDelay: "0.05s" }}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-indigo-500">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <CardTitle size="md">Instructions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 text-sm text-slate-600">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-xs font-bold text-white">1</span>
              <span>Faites glisser le masque vert pour l'aligner avec le visage</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-xs font-bold text-white">2</span>
              <span>Ajustez le zoom avec le curseur pour un ajustement precis</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 text-xs font-bold text-white">3</span>
              <span>Utilisez l'auto-fit IA pour une calibration automatique</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="space-y-4 animate-fadeIn" style={{ animationDelay: "0.1s" }}>
        <Card variant="glass" padding="none" className="overflow-hidden bg-black shadow-2xl">
          <div
            ref={containerRef}
            className="relative"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="Photo face" className="w-full" />
            ) : (
              <div className="flex h-96 items-center justify-center text-sm text-white/70">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white/80"></div>
                  <p>Chargement de la photo...</p>
                </div>
              </div>
            )}
            <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 100 100">
              {transformedMask.length > 2 && (
                <polygon
                  points={transformedMask.map(([x, y]) => `${x},${y}`).join(" ")}
                  fill="rgba(16,185,129,0.18)"
                  stroke="rgba(16,185,129,0.9)"
                  strokeWidth="0.6"
                />
              )}
            </svg>
            {dragging && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/80 backdrop-blur-sm px-4 py-2 text-xs font-semibold text-white shadow-lg">
                Deplacez le masque
              </div>
            )}
          </div>
        </Card>

        <Card variant="glass" className="animate-slideInDown" style={{ animationDelay: "0.2s" }}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
              <CardTitle size="md">Controle du zoom</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <label className="flex-shrink-0 text-sm font-semibold text-slate-700">
                Zoom
              </label>
              <input
                type="range"
                min="0.7"
                max="1.4"
                step="0.01"
                value={scale}
                onChange={(event) => setScale(Number(event.target.value))}
                className="w-full h-2 rounded-full bg-slate-200 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-indigo-500 [&::-webkit-slider-thumb]:to-pink-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-gradient-to-r [&::-moz-range-thumb]:from-indigo-500 [&::-moz-range-thumb]:to-pink-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:cursor-pointer"
              />
              <span className="flex-shrink-0 min-w-[60px] text-right text-sm font-bold text-slate-900">
                {scale.toFixed(2)}x
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 animate-fadeIn" style={{ animationDelay: "0.3s" }}>
          <Button
            onClick={handleAutoFit}
            disabled={autoStatus === "running"}
            variant="secondary"
            size="lg"
            fullWidth
            loading={autoStatus === "running"}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            }
          >
            {autoStatus === "running" ? "Auto-fit..." : "Auto-fit (IA visage)"}
          </Button>

          <Button
            onClick={handleSave}
            disabled={status === "saving"}
            variant="accent"
            size="lg"
            fullWidth
            loading={status === "saving"}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            }
          >
            {status === "saving" ? "Enregistrement..." : "Valider le masque"}
          </Button>
        </div>
      </div>
    </div>
  );
}
