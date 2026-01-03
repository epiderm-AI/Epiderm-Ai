"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";

type ZoneMeta = {
  id: string;
  label: string;
};

type Point = [number, number];

type CalibrationPayload = {
  mask: Point[];
  zones: Record<string, Point[]>;
  zone_exclusions: Record<string, Point[]>;
};

const MODEL_OPTIONS = [
  { id: "XX", label: "Modele XX (femme)" },
  { id: "XY", label: "Modele XY (homme)" },
];

export default function CalibrationPage() {
  const [model, setModel] = useState("XX");
  const [zones, setZones] = useState<ZoneMeta[]>([]);
  const [maskPoints, setMaskPoints] = useState<Point[]>([]);
  const [zonePoints, setZonePoints] = useState<Record<string, Point[]>>({});
  const [zoneExclusions, setZoneExclusions] = useState<Record<string, Point[]>>(
    {}
  );
  const [activeTarget, setActiveTarget] = useState<string>("mask");
  const [pointMode, setPointMode] = useState<"include" | "exclude">("include");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("idle");
  const [imageUrl, setImageUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [dragState, setDragState] = useState<{
    zoneId: string;
    index: number;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const defaultModelUrl = useMemo(() => {
    return model === "XY" ? "/models/xy.png" : "/models/xx.png";
  }, [model]);

  useEffect(() => {
    async function fetchZones() {
      const { data, error } = await supabaseBrowser
        .from("face_zones")
        .select("id, label")
        .order("label", { ascending: true });

      if (error) {
        setMessage(error.message);
        return;
      }
      setZones(data ?? []);
    }

    fetchZones();
  }, []);

  useEffect(() => {
    async function fetchCalibration() {
      setStatus("loading");
      setMessage("");
      const { data, error } = await supabaseBrowser
        .from("face_calibrations")
        .select("mask, zones, zone_exclusions")
        .eq("model", model)
        .maybeSingle();

      if (error) {
        setMessage(error.message);
      } else if (data) {
        setMaskPoints((data.mask as Point[]) ?? []);
        setZonePoints((data.zones as Record<string, Point[]>) ?? {});
        setZoneExclusions(
          (data.zone_exclusions as Record<string, Point[]>) ?? {}
        );
      } else {
        setMaskPoints([]);
        setZonePoints({});
        setZoneExclusions({});
      }
      setStatus("idle");
    }

    fetchCalibration();
  }, [model]);

  const allZones = useMemo(() => {
    return ["mask", ...zones.map((zone) => zone.id)];
  }, [zones]);

  const currentPoints =
    activeTarget === "mask"
      ? maskPoints
      : pointMode === "include"
        ? zonePoints[activeTarget] ?? []
        : zoneExclusions[activeTarget] ?? [];

  function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function zoneColor(zoneId: string) {
    let hash = 0;
    for (let i = 0; i < zoneId.length; i += 1) {
      hash = zoneId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return {
      fill: `hsla(${hue}, 80%, 55%, 0.22)`,
      stroke: `hsla(${hue}, 80%, 45%, 0.85)`,
    };
  }

  function handleAddPoint(event: React.PointerEvent<SVGSVGElement>) {
    if (!svgRef.current) {
      return;
    }
    if (dragState) {
      return;
    }
    const svg = svgRef.current;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) {
      return;
    }
    const transformed = point.matrixTransform(ctm.inverse());
    const x = Math.min(Math.max(transformed.x, 0), 100);
    const y = Math.min(Math.max(transformed.y, 0), 100);
    const normalizedPoint: Point = [x, y];

    if (activeTarget === "mask") {
      setMaskPoints((prev) => [...prev, normalizedPoint]);
    } else if (pointMode === "include") {
      setZonePoints((prev) => ({
        ...prev,
        [activeTarget]: [...(prev[activeTarget] ?? []), normalizedPoint],
      }));
    } else {
      setZoneExclusions((prev) => ({
        ...prev,
        [activeTarget]: [...(prev[activeTarget] ?? []), normalizedPoint],
      }));
    }
  }

  function handleDragMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!dragState || !svgRef.current) {
      return;
    }
    const svg = svgRef.current;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) {
      return;
    }
    const transformed = point.matrixTransform(ctm.inverse());
    const x = Math.min(Math.max(transformed.x, 0), 100);
    const y = Math.min(Math.max(transformed.y, 0), 100);
    const normalizedPoint: Point = [x, y];

    if (dragState.zoneId === "mask") {
      setMaskPoints((prev) =>
        prev.map((item, index) =>
          index === dragState.index ? normalizedPoint : item
        )
      );
    } else if (pointMode === "include") {
      setZonePoints((prev) => ({
        ...prev,
        [dragState.zoneId]: (prev[dragState.zoneId] ?? []).map((item, index) =>
          index === dragState.index ? normalizedPoint : item
        ),
      }));
    } else {
      setZoneExclusions((prev) => ({
        ...prev,
        [dragState.zoneId]: (prev[dragState.zoneId] ?? []).map((item, index) =>
          index === dragState.index ? normalizedPoint : item
        ),
      }));
    }
  }

  function handleDragEnd() {
    setDragState(null);
  }

  function handleUndoPoint() {
    if (activeTarget === "mask") {
      setMaskPoints((prev) => prev.slice(0, -1));
    } else if (pointMode === "include") {
      setZonePoints((prev) => ({
        ...prev,
        [activeTarget]: (prev[activeTarget] ?? []).slice(0, -1),
      }));
    } else {
      setZoneExclusions((prev) => ({
        ...prev,
        [activeTarget]: (prev[activeTarget] ?? []).slice(0, -1),
      }));
    }
  }

  function handleClearPoints() {
    if (activeTarget === "mask") {
      setMaskPoints([]);
    } else if (pointMode === "include") {
      setZonePoints((prev) => ({ ...prev, [activeTarget]: [] }));
    } else {
      setZoneExclusions((prev) => ({ ...prev, [activeTarget]: [] }));
    }
  }

  async function handleSave() {
    if (maskPoints.length < 3) {
      setMessage("Le masque doit contenir au moins 3 points.");
      return;
    }

    const payload: CalibrationPayload = {
      mask: maskPoints,
      zones: zonePoints,
      zone_exclusions: zoneExclusions,
    };

    setStatus("saving");
    setMessage("");

    const { error } = await supabaseBrowser.from("face_calibrations").upsert({
      model,
      mask: payload.mask,
      zones: payload.zones,
      zone_exclusions: payload.zone_exclusions,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Calibration sauvegardee.");
    }
    setStatus("idle");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Calibration visage
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Importez le modele (XX/XY), delimitez le masque du visage puis les zones anatomiques.
        </p>
      </header>

      {message ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-[var(--foreground)]">
              Modele
            </label>
            <select
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
              value={model}
              onChange={(event) => setModel(event.target.value)}
            >
              {MODEL_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)]"
              onClick={() => setImageUrl(defaultModelUrl)}
              type="button"
            >
              Charger le modele {model}
            </button>
            <label className="text-sm font-medium text-[var(--foreground)]">
              Importer
            </label>
            <input type="file" accept="image/*" onChange={handleImageUpload} />
          </div>

          <div
            className={`relative overflow-hidden rounded-2xl border bg-black ${
              isDragging ? "border-[var(--primary)]" : "border-[var(--border)]"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Modele visage"
                className="w-full"
                style={{ pointerEvents: "none" }}
              />
            ) : (
              <div className="flex h-96 items-center justify-center text-sm text-white/70">
                Glissez-deposez une image modele ici ou chargez le modele {model}
              </div>
            )}
            <svg
              ref={svgRef}
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              onPointerDown={handleAddPoint}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerLeave={handleDragEnd}
              style={{ pointerEvents: "auto", touchAction: "none" }}
            >
              {maskPoints.length > 2 && (
                <polygon
                  points={maskPoints.map(([x, y]) => `${x},${y}`).join(" ")}
                  fill="rgba(14, 165, 233, 0.15)"
                  stroke="rgba(14, 165, 233, 0.9)"
                  strokeWidth="0.6"
                />
              )}
              {Object.entries(zonePoints).map(([zoneId, points]) => {
                if (points.length < 3) {
                  return null;
                }
                const colors = zoneColor(zoneId);
                return (
                  <polygon
                    key={zoneId}
                    points={points.map(([x, y]) => `${x},${y}`).join(" ")}
                    fill={
                      zoneId === activeTarget
                        ? colors.fill.replace("0.22", "0.32")
                        : colors.fill
                    }
                    stroke={colors.stroke}
                    strokeWidth="0.4"
                  />
                );
              })}
              {Object.entries(zoneExclusions).map(([zoneId, points]) => {
                if (points.length < 3) {
                  return null;
                }
                const colors = zoneColor(zoneId);
                return (
                  <polygon
                    key={`exclude-${zoneId}`}
                    points={points.map(([x, y]) => `${x},${y}`).join(" ")}
                    fill="rgba(239, 68, 68, 0.12)"
                    stroke={colors.stroke}
                    strokeDasharray="2 2"
                    strokeWidth="0.4"
                  />
                );
              })}
              {currentPoints.map(([x, y], index) => (
                <circle
                  key={`${x}-${y}-${index}`}
                  cx={x}
                  cy={y}
                  r="1.1"
                  fill="white"
                  stroke="black"
                  strokeWidth="0.3"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    setDragState({ zoneId: activeTarget, index });
                  }}
                  style={{ cursor: "grab" }}
                />
              ))}
            </svg>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              Ciblage
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Selectionnez une zone puis cliquez sur le visage pour ajouter des points.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <button
                className={`rounded-full px-3 py-1 ${
                  pointMode === "include"
                    ? "bg-[var(--primary)] text-white"
                    : "border border-[var(--border)] text-[var(--text-secondary)]"
                }`}
                onClick={() => setPointMode("include")}
                type="button"
              >
                Zone
              </button>
              <button
                className={`rounded-full px-3 py-1 ${
                  pointMode === "exclude"
                    ? "bg-[var(--warning)] text-white"
                    : "border border-[var(--border)] text-[var(--text-secondary)]"
                }`}
                onClick={() => setPointMode("exclude")}
                type="button"
                disabled={activeTarget === "mask"}
              >
                Exclusion
              </button>
            </div>
            <div className="mt-3 grid gap-2">
              {allZones.map((zoneId) => {
                const label =
                  zoneId === "mask"
                    ? "Masque visage"
                    : zones.find((zone) => zone.id === zoneId)?.label ?? zoneId;
                return (
                  <button
                    key={zoneId}
                    className={`rounded-lg border px-3 py-2 text-left text-sm ${
                      activeTarget === zoneId
                        ? "border-[var(--primary)] text-[var(--primary)]"
                        : "border-[var(--border)] text-[var(--text-secondary)]"
                    }`}
                    onClick={() => setActiveTarget(zoneId)}
                    type="button"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-sm)]">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Edition
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)]"
                onClick={handleUndoPoint}
                type="button"
              >
                Annuler le dernier point
              </button>
              <button
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)]"
                onClick={handleClearPoints}
                type="button"
              >
                Effacer la zone
              </button>
              {pointMode === "exclude" && activeTarget !== "mask" ? (
                <button
                  className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)]"
                  onClick={() =>
                    setZoneExclusions((prev) => ({
                      ...prev,
                      [activeTarget]: [],
                    }))
                  }
                  type="button"
                >
                  Supprimer l'exclusion
                </button>
              ) : null}
            </div>
          </div>

          <button
            className="w-full rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:opacity-60"
            onClick={handleSave}
            disabled={status === "saving"}
            type="button"
          >
            {status === "saving" ? "Sauvegarde..." : "Sauvegarder la calibration"}
          </button>
        </aside>
      </div>
    </div>
  );
}
