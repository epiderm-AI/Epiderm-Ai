"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

type PatientOption = {
  id: string;
  full_name: string;
  sex: string | null;
};

const CAPTURE_STEPS = [
  { angle: "face", label: "Face", hint: "Regard neutre, visage centre" },
  { angle: "three_quarter_left", label: "3/4 gauche", hint: "Tournez legerement a gauche" },
  { angle: "three_quarter_right", label: "3/4 droit", hint: "Tournez legerement a droite" },
  { angle: "profile_left", label: "Profil gauche", hint: "Vue de profil complete" },
  { angle: "profile_right", label: "Profil droit", hint: "Vue de profil complete" },
];

export default function CapturePage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientId, setPatientId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "uploading">("idle");
  const [message, setMessage] = useState("");
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [fallbackFile, setFallbackFile] = useState<File | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [model, setModel] = useState("XX");
  const [maskPoints, setMaskPoints] = useState<[number, number][]>([]);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number } | null>(null);
  const [isAligned, setIsAligned] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDetectRef = useRef(0);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ initialDistance: number; initialZoom: number } | null>(null);

  const storageBucket = useMemo(
    () => process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET,
    []
  );

  useEffect(() => {
    async function fetchPatients() {
      setStatus("loading");
      const { data, error } = await supabaseBrowser
        .from("patients")
        .select("id, full_name, sex")
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(error.message);
      } else {
        const list = data ?? [];
        setPatients(list);
        if (!patientId && list.length > 0) {
          setPatientId(list[0].id);
        }
      }
      setStatus("idle");
    }

    fetchPatients();
  }, []);

  useEffect(() => {
    const selected = patients.find((item) => item.id === patientId);
    const sexValue = selected?.sex ?? "";
    const nextModel = sexValue === "male" ? "XY" : "XX";
    setModel(nextModel);
  }, [patientId, patients]);

  useEffect(() => {
    async function fetchCalibrationMask() {
      const { data } = await supabaseBrowser
        .from("face_calibrations")
        .select("mask")
        .eq("model", model)
        .maybeSingle();

      setMaskPoints((data?.mask as [number, number][]) ?? []);
    }

    fetchCalibrationMask();
  }, [model]);

  useEffect(() => {
    async function startCamera() {
      setCameraError("");
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera non disponible sur cet appareil");
        return;
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const track = stream.getVideoTracks()[0];
        const capabilities = track?.getCapabilities?.() as any;
        if (capabilities && "zoom" in capabilities && capabilities.zoom) {
          const min = Number(capabilities.zoom.min ?? 1);
          const max = Number(capabilities.zoom.max ?? 1);
          const step = Number(capabilities.zoom.step ?? 0.1);
          const current = Number((track.getSettings() as any)?.zoom ?? min);
          setZoomRange({ min, max, step });
          setZoomLevel(current);
        } else {
          setZoomRange(null);
          setZoomLevel(1);
        }
      } catch {
        setCameraError("Impossible d'acceder a la camera. Verifiez les autorisations.");
      }
    }

    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [facingMode]);

  useEffect(() => {
    setSessionId("");
    setCompleted({});
    setCurrentStep(0);
  }, [patientId]);

  const step = CAPTURE_STEPS[currentStep];
  const isLastStep = currentStep === CAPTURE_STEPS.length - 1;
  const completedCount = Object.keys(completed).length;

  useEffect(() => {
    async function applyZoom() {
      const track = streamRef.current?.getVideoTracks?.()[0];
      if (!track || !zoomRange) {
        return;
      }
      try {
        await track.applyConstraints({
          advanced: [{ zoom: zoomLevel } as any],
        });
      } catch {
        // Ignore zoom errors silently (not supported on all devices)
      }
    }

    applyZoom();
  }, [zoomLevel, zoomRange]);

  useEffect(() => {
    let cancelled = false;

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
        runningMode: "VIDEO",
      });
      landmarkerRef.current = landmarker;
      return landmarker;
    }

    async function startDetection() {
      if (!videoRef.current || step?.angle !== "face") {
        setIsAligned(false);
        return;
      }
      setIsDetecting(true);
      const landmarker = await getLandmarker();

      const loop = () => {
        if (cancelled || !videoRef.current) {
          return;
        }
        if (videoRef.current.readyState < 2) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        const now = performance.now();
        if (now - lastDetectRef.current < 120) {
          rafRef.current = requestAnimationFrame(loop);
          return;
        }
        lastDetectRef.current = now;
        const result = landmarker.detectForVideo(videoRef.current, now);
        const face = result.faceLandmarks?.[0];
        if (!face || face.length === 0) {
          setIsAligned(false);
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        const xs = face.map((point) => point.x * 100);
        const ys = face.map((point) => point.y * 100);
        const faceBox = {
          minX: Math.min(...xs),
          maxX: Math.max(...xs),
          minY: Math.min(...ys),
          maxY: Math.max(...ys),
        };

        const maskBox = maskPoints.length > 2
          ? {
              minX: Math.min(...maskPoints.map(([x]) => x)),
              maxX: Math.max(...maskPoints.map(([x]) => x)),
              minY: Math.min(...maskPoints.map(([, y]) => y)),
              maxY: Math.max(...maskPoints.map(([, y]) => y)),
            }
          : { minX: 20, maxX: 80, minY: 10, maxY: 90 };

        const faceWidth = faceBox.maxX - faceBox.minX;
        const faceHeight = faceBox.maxY - faceBox.minY;
        const maskWidth = maskBox.maxX - maskBox.minX;
        const maskHeight = maskBox.maxY - maskBox.minY;
        const centerDx = Math.abs(
          (faceBox.minX + faceBox.maxX) / 2 - (maskBox.minX + maskBox.maxX) / 2
        ) / maskWidth;
        const centerDy = Math.abs(
          (faceBox.minY + faceBox.maxY) / 2 - (maskBox.minY + maskBox.maxY) / 2
        ) / maskHeight;

        const sizeRatioX = faceWidth / maskWidth;
        const sizeRatioY = faceHeight / maskHeight;
        const aligned =
          centerDx < 0.08 &&
          centerDy < 0.08 &&
          sizeRatioX > 0.6 &&
          sizeRatioX < 0.95 &&
          sizeRatioY > 0.6 &&
          sizeRatioY < 0.95;

        setIsAligned(aligned);
        rafRef.current = requestAnimationFrame(loop);
      };

      rafRef.current = requestAnimationFrame(loop);
    }

    startDetection();

    return () => {
      cancelled = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      setIsDetecting(false);
    };
  }, [maskPoints, step?.angle]);

  async function uploadBlob(
    blob: Blob,
    angle: string,
    metadata: { name: string; type: string; size: number }
  ) {
    if (!storageBucket) {
      setMessage("Configuration manquante");
      return;
    }

    setStatus("uploading");
    setMessage("");

    const ensuredSessionId = await ensureSessionId();
    if (!ensuredSessionId) {
      setStatus("idle");
      return;
    }

    const extension = metadata.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}${extension ? `.${extension}` : ".jpg"}`;
    const storagePath = `${ensuredSessionId}/${fileName}`;

    const { error: uploadError } = await supabaseBrowser.storage
      .from(storageBucket)
      .upload(storagePath, blob, { upsert: false, contentType: metadata.type });

    if (uploadError) {
      setMessage(uploadError.message);
      setStatus("idle");
      return;
    }

    const { data: insertedPhoto, error: insertError } = await supabaseBrowser
      .from("photos")
      .insert({
        session_id: ensuredSessionId,
        angle,
        camera: facingMode === "user" ? "front" : "rear",
        storage_path: storagePath,
        metadata,
      })
      .select("id")
      .single();

    if (insertError) {
      setMessage(insertError.message);
      setStatus("idle");
      return;
    }

    setCompleted((prev) => {
      const next = { ...prev, [angle]: true };
      return next;
    });
    setStatus("idle");
    setMessage("Photo sauvegardee avec succes");
    setTimeout(() => setMessage(""), 3000);

    // Passer automatiquement à l'étape suivante si ce n'est pas la dernière
    const currentStepIndex = CAPTURE_STEPS.findIndex(s => s.angle === angle);
    if (currentStepIndex !== -1 && currentStepIndex < CAPTURE_STEPS.length - 1) {
      // Attendre un peu pour que l'utilisateur voie le message de succès
      setTimeout(() => {
        setCurrentStep(currentStepIndex + 1);
      }, 1000);
    } else if (Object.keys(completed).length + 1 === CAPTURE_STEPS.length) {
      // Toutes les photos sont prises, rediriger vers l'analyse
      setTimeout(() => {
        router.push(`/analysis/${ensuredSessionId}`);
      }, 1500);
    }
  }

  async function ensureSessionId() {
    if (sessionId) {
      return sessionId;
    }
    if (!patientId) {
      setMessage("Selectionnez un patient");
      return null;
    }

    setStatus("loading");
    setMessage("Creation d une seance photo...");

    const { data, error } = await supabaseBrowser
      .from("sessions")
      .insert({ patient_id: patientId })
      .select("id")
      .single();

    if (error) {
      setMessage(error.message);
      setStatus("idle");
      return null;
    }

    const newSessionId = data?.id ?? "";
    setSessionId(newSessionId);
    setStatus("idle");
    setMessage("");
    return newSessionId;
  }

  async function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const step = CAPTURE_STEPS[currentStep];

    if (!video || !canvas || !step) {
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );

    if (!blob) {
      setMessage("Echec de la capture");
      return;
    }

    await uploadBlob(blob, step.angle, {
      name: `${step.angle}.jpg`,
      type: "image/jpeg",
      size: blob.size,
    });
  }

  async function handleFallbackUpload() {
    if (!fallbackFile) {
      setMessage("Selectionnez un fichier");
      return;
    }
    const step = CAPTURE_STEPS[currentStep];
    if (!step) {
      return;
    }
    await uploadBlob(fallbackFile, step.angle, {
      name: fallbackFile.name,
      type: fallbackFile.type || "image/jpeg",
      size: fallbackFile.size,
    });
  }

  function handleNext() {
    setMessage("");
    setFallbackFile(null);
    setCurrentStep((prev) => Math.min(prev + 1, CAPTURE_STEPS.length - 1));
  }

  function handlePrev() {
    setMessage("");
    setFallbackFile(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }

  function clampZoom(value: number) {
    if (!zoomRange) {
      return value;
    }
    return Math.min(zoomRange.max, Math.max(zoomRange.min, value));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!zoomRange || event.pointerType !== "touch") {
      return;
    }
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2) {
      const points = Array.from(pointersRef.current.values());
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      pinchRef.current = { initialDistance: distance, initialZoom: zoomLevel };
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!zoomRange || event.pointerType !== "touch") {
      return;
    }
    if (!pointersRef.current.has(event.pointerId)) {
      return;
    }
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const points = Array.from(pointersRef.current.values());
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const scale = distance / pinchRef.current.initialDistance;
      setZoomLevel(clampZoom(pinchRef.current.initialZoom * scale));
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!zoomRange || event.pointerType !== "touch") {
      return;
    }
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      {/* Header */}
      <header className="space-y-4 animate-fadeIn">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Link href="/patients" className="hover:text-indigo-600 transition-colors">
            Patients
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-900">Capture guidee</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-slate-900">
            Capture guidee
          </h1>
          <p className="mt-2 text-lg text-slate-600">
            Suivez les etapes pour capturer les 5 angles requis
          </p>
        </div>

        {/* Patient selector */}
        <Card variant="glass" className="animate-slideInDown" style={{ animationDelay: "0.1s" }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="patient">
                <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  Patient cible
                </div>
              </label>
              <select
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base shadow-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[44px]"
                id="patient"
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
              >
                {patients.length === 0 ? (
                  <option value="">Aucun patient</option>
                ) : null}
                {patients.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.full_name}
                  </option>
                ))}
              </select>
              {patients.length === 0 && (
                <Link className="mt-2 inline-block text-xs text-indigo-600 hover:underline" href="/patients">
                  Creez un patient d'abord
                </Link>
              )}
              {patients.length > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  La seance photo est creee automatiquement a la premiere capture.
                </p>
              )}
              {sessionId && (
                <Link
                  className="mt-2 inline-block text-xs font-medium text-slate-900 hover:text-indigo-600"
                  href={`/analysis/${sessionId}`}
                >
                  Aller a l'analyse visage
                </Link>
              )}
            </div>

            <div className="text-sm">
              <div className="rounded-2xl bg-slate-900 p-4 text-center shadow-lg">
                <div className="text-3xl font-bold text-white">
                  {completedCount}/{CAPTURE_STEPS.length}
                </div>
                <div className="text-xs font-medium text-white/90">Photos capturees</div>
              </div>
            </div>
          </div>
        </Card>

        <Card variant="default" className="animate-slideInDown" style={{ animationDelay: "0.2s" }}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <CardTitle size="md">Concept en 4 etapes</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">1</span>
                <span>Choisir un patient (ou en creer un si besoin)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">2</span>
                <span>La seance photo se cree automatiquement a la premiere capture</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">3</span>
                <span>Capturer les 5 angles guides pour assurer la reproductibilite</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">4</span>
                <span>Lancer l'analyse visage par zones et consulter les observations</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Progress steps */}
        <Card variant="glass" className="animate-fadeIn" style={{ animationDelay: "0.3s" }}>
          <CardHeader>
            <CardTitle size="sm">Processus de capture</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-5">
              {CAPTURE_STEPS.map((item, index) => {
                const done = !!completed[item.angle];
                const isActive = index === currentStep;
                return (
                  <button
                    key={item.angle}
                    onClick={() => setCurrentStep(index)}
                    className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                      done
                        ? "border-emerald-300 bg-emerald-50"
                        : isActive
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-slate-200 bg-white"
                    }`}
                    type="button"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                        done
                          ? "border-emerald-400 bg-emerald-500 text-white"
                          : "border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      {done ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-sm font-semibold">{index + 1}</span>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-slate-700">
                      {item.label}
                      {done ? (
                        <p className="text-[10px] font-medium text-emerald-600">Valide</p>
                      ) : (
                        <p className="text-[10px] text-slate-400">En attente</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>Suivez les etapes dans l ordre pour une session completee.</span>
              {completedCount === CAPTURE_STEPS.length ? (
                <span className="flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-700">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Session completee
                </span>
              ) : (
                <span>{completedCount}/{CAPTURE_STEPS.length} valides</span>
              )}
            </div>
          </CardContent>
        </Card>
      </header>

      {/* Main capture interface */}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] animate-fadeIn" style={{ animationDelay: "0.4s" }}>
        {/* Camera preview */}
        <div className="space-y-4">
          <Card variant="glass" padding="none" className="overflow-hidden bg-black shadow-2xl">
            <div
              ref={containerRef}
              className="relative aspect-[4/3] bg-black"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />

              {/* Face guide overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  {maskPoints.length > 2 ? (
                    <polygon
                      points={maskPoints.map(([x, y]) => `${x},${y}`).join(" ")}
                      fill={isAligned ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.08)"}
                      stroke={isAligned ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.6)"}
                      strokeWidth="0.6"
                    />
                  ) : (
                    <rect
                      x="20"
                      y="10"
                      width="60"
                      height="80"
                      rx="18"
                      fill={isAligned ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.06)"}
                      stroke={isAligned ? "rgba(34,197,94,0.9)" : "rgba(255,255,255,0.4)"}
                      strokeWidth="0.6"
                    />
                  )}
                </svg>
              </div>

              <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white">
                <span className={isAligned ? "text-emerald-200" : "text-white/80"}>
                  {isAligned ? "Visage aligne" : "Ajustez le visage"}
                </span>
                {step?.angle === "face" && isDetecting && (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                )}
              </div>

              {/* Status overlay */}
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                  <Card variant="glass" padding="lg" className="max-w-sm text-center animate-scaleIn">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-pink-500">
                      <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-red-600">{cameraError}</p>
                  </Card>
                </div>
              )}
            </div>
          </Card>

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              onClick={() =>
                setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))
              }
              variant="secondary"
              size="sm"
            >
              Changer camera
            </Button>

            <div className="flex flex-1 items-center gap-3 text-xs text-slate-600">
              <span className="whitespace-nowrap">Zoom</span>
              <input
                className="w-full"
                type="range"
                min={zoomRange?.min ?? 1}
                max={zoomRange?.max ?? 1}
                step={zoomRange?.step ?? 0.1}
                value={zoomLevel}
                onChange={(event) => setZoomLevel(clampZoom(Number(event.target.value)))}
                disabled={!zoomRange}
              />
              <span className="w-10 text-right">{zoomLevel.toFixed(1)}x</span>
            </div>
          </div>

          {/* Capture controls */}
          <div className="flex items-center justify-between gap-4">
            <Button
              onClick={handlePrev}
              disabled={currentStep === 0}
              variant="ghost"
              size="md"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              }
            >
              Precedent
            </Button>

              <button
                onClick={handleCapture}
                disabled={status === "uploading" || !step || !!cameraError}
                className="group flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xl transition-all hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 min-h-[80px]"
              >
              {status === "uploading" ? (
                <svg className="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-10 w-10 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>

            <Button
              onClick={handleNext}
              disabled={isLastStep}
              variant="ghost"
              size="md"
              iconPosition="right"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              }
            >
              Suivant
            </Button>
          </div>
        </div>

        {/* Instructions panel */}
        <div className="space-y-4">
          <Card variant="glass">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 shadow-lg">
                <span className="text-2xl font-bold text-white">
                  {currentStep + 1}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Etape {currentStep + 1}/{CAPTURE_STEPS.length}
                </p>
                <h2 className="text-xl font-bold text-slate-900">
                  {step?.label}
                </h2>
              </div>
            </div>

            <p className="mb-4 text-slate-600">{step?.hint}</p>

            {message && (
              <div
                className={`animate-fadeIn rounded-xl px-4 py-3 text-sm font-medium ${
                  message.includes("succes")
                    ? "border border-green-300 bg-green-50 text-green-700"
                    : "border border-red-300 bg-red-50 text-red-700"
                }`}
              >
                {message}
              </div>
            )}
          </Card>

          {/* Fallback upload */}
          <Card variant="glass" className="border-2 border-dashed border-slate-300">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <CardTitle size="sm">Alternative: Upload manuel</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-xs text-slate-500">
                Si la camera ne fonctionne pas, uploadez une photo depuis vos fichiers
              </p>
              <input
                className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-slate-800 min-h-[44px]"
                type="file"
                accept="image/*"
                onChange={(event) => setFallbackFile(event.target.files?.[0] ?? null)}
              />
              <Button
                onClick={handleFallbackUpload}
                disabled={status === "uploading" || !fallbackFile}
                variant="secondary"
                size="md"
                fullWidth
              >
                {status === "uploading" ? "Upload..." : "Envoyer le fichier"}
              </Button>
            </CardContent>
          </Card>

          {/* Quick tips */}
          <Card variant="default">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <CardTitle size="sm">Conseils</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">✓</span>
                  <span>Assurez-vous d'avoir un bon eclairage</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">✓</span>
                  <span>Placez le visage dans le cadre guide</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">✓</span>
                  <span>Evitez les ombres trop marquees</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">✓</span>
                  <span>Expression neutre pour tous les angles</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Completion message */}
      {completedCount === CAPTURE_STEPS.length && (
        <Card variant="glass" padding="lg" className="text-center border-2 border-slate-300 bg-white animate-scaleIn">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-900 shadow-2xl">
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mb-2 text-2xl font-bold text-slate-900">
            Capture terminee !
          </h3>
          <p className="mb-6 text-slate-600">
            Toutes les photos ont ete capturees avec succes
          </p>
          <Link href={sessionId ? `/analysis/${sessionId}` : "/patients"}>
            <Button
              variant="accent"
              size="lg"
              iconPosition="right"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              }
            >
              Aller a l'analyse visage
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
