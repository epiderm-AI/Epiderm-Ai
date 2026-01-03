"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { supabaseBrowser } from "@/lib/supabase/client";

type PatientOption = {
  id: string;
  full_name: string;
};

type SessionRow = {
  id: string;
  session_date: string;
  objectives: string | null;
  remarks: string | null;
  patient: { id: string; full_name: string } | null;
};

type PhotoRow = {
  id: string;
  angle: string;
  storage_path: string;
  created_at: string;
};

type SignedPhoto = PhotoRow & { signed_url: string };

function SessionSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="mb-3 h-6 w-32 rounded bg-gray-200" />
      <div className="mb-2 h-4 w-full rounded bg-gray-100" />
      <div className="h-4 w-3/4 rounded bg-gray-100" />
    </div>
  );
}

function PhotoSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="aspect-square bg-gray-200" />
      <div className="p-2">
        <div className="h-3 w-16 rounded bg-gray-100" />
      </div>
    </div>
  );
}

export default function SessionsPage() {
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [patientId, setPatientId] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [objectives, setObjectives] = useState("");
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("idle");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoAngle, setPhotoAngle] = useState("face");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading">("idle");
  const [uploadMessage, setUploadMessage] = useState("");

  const [photos, setPhotos] = useState<SignedPhoto[]>([]);
  const [galleryStatus, setGalleryStatus] = useState<"idle" | "loading">("idle");
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  const storageBucket = useMemo(
    () => process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET,
    []
  );

  async function fetchPatients() {
    const { data, error: fetchError } = await supabaseBrowser
      .from("patients")
      .select("id, full_name")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setPatients(data ?? []);
      if (!patientId && data && data.length > 0) {
        setPatientId(data[0].id);
      }
    }
  }

  async function fetchSessions() {
    setStatus("loading");
    setError("");

    const { data, error: fetchError } = await supabaseBrowser
      .from("sessions")
      .select("id, session_date, objectives, remarks, patients(id, full_name)")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      const normalized =
        data?.map((row) => ({
          id: row.id,
          session_date: row.session_date,
          objectives: row.objectives,
          remarks: row.remarks,
          patient: Array.isArray(row.patients)
            ? (row.patients[0] ?? null)
            : (row.patients ?? null),
        })) ?? [];
      setSessions(normalized);

      if (!selectedSessionId && normalized.length > 0) {
        setSelectedSessionId(normalized[0].id);
      }
    }
    setStatus("idle");
  }

  async function fetchPhotos(sessionId: string) {
    if (!storageBucket || !sessionId) return;

    setGalleryStatus("loading");

    const { data, error: fetchError } = await supabaseBrowser
      .from("photos")
      .select("id, angle, storage_path, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setGalleryStatus("idle");
      return;
    }

    const signedPhotos = await Promise.all(
      (data ?? []).map(async (photo) => {
        const { data: signedData, error: signedError } =
          await supabaseBrowser.storage
            .from(storageBucket)
            .createSignedUrl(photo.storage_path, 60 * 60);

        if (signedError || !signedData?.signedUrl) {
          return { ...photo, signed_url: "" };
        }

        return { ...photo, signed_url: signedData.signedUrl };
      })
    );

    setPhotos(signedPhotos);
    setGalleryStatus("idle");
  }

  useEffect(() => {
    fetchPatients();
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      fetchPhotos(selectedSessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId]);

  async function handleCreateSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patientId) {
      setError("Selectionne un patient.");
      return;
    }

    setStatus("saving");
    setError("");
    setSuccessMessage("");

    const { error: insertError } = await supabaseBrowser.from("sessions").insert({
      patient_id: patientId,
      session_date: sessionDate || undefined,
      objectives: objectives.trim() || null,
      remarks: remarks.trim() || null,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setObjectives("");
      setRemarks("");
      setSessionDate("");
      setShowForm(false);
      setSuccessMessage("Seance creee avec succes");
      await fetchSessions();
      setTimeout(() => setSuccessMessage(""), 3000);
    }
    setStatus("idle");
  }

  async function handlePhotoUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadStatus("uploading");
    setUploadMessage("");

    if (!photoFile) {
      setUploadStatus("idle");
      setUploadMessage("Selectionne un fichier.");
      return;
    }
    if (!selectedSessionId) {
      setUploadStatus("idle");
      setUploadMessage("Selectionne une seance.");
      return;
    }
    if (!storageBucket) {
      setUploadStatus("idle");
      setUploadMessage("Configuration manquante.");
      return;
    }

    const extension = photoFile.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}${extension ? `.${extension}` : ""}`;
    const storagePath = `${selectedSessionId}/${fileName}`;

    const { error: uploadError } = await supabaseBrowser.storage
      .from(storageBucket)
      .upload(storagePath, photoFile, { upsert: false });

    if (uploadError) {
      setUploadStatus("idle");
      setUploadMessage(uploadError.message);
      return;
    }

    const { error: insertError } = await supabaseBrowser.from("photos").insert({
      session_id: selectedSessionId,
      angle: photoAngle,
      camera: "rear",
      storage_path: storagePath,
      metadata: {
        name: photoFile.name,
        type: photoFile.type,
        size: photoFile.size,
      },
    });

    if (insertError) {
      setUploadStatus("idle");
      setUploadMessage(insertError.message);
      return;
    }

    setPhotoFile(null);
    setUploadStatus("idle");
    setUploadMessage("Photo uploadee avec succes");
    await fetchPhotos(selectedSessionId);
    setTimeout(() => setUploadMessage(""), 3000);
  }

  async function handleDeletePhoto(photo: SignedPhoto) {
    if (!storageBucket || !confirm("Supprimer cette photo ?")) {
      return;
    }

    setDeletingPhotoId(photo.id);

    const { error: storageError } = await supabaseBrowser.storage
      .from(storageBucket)
      .remove([photo.storage_path]);

    if (storageError) {
      setError(storageError.message);
      setDeletingPhotoId(null);
      return;
    }

    const { error: deleteError } = await supabaseBrowser
      .from("photos")
      .delete()
      .eq("id", photo.id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setPhotos((prev) => prev.filter((item) => item.id !== photo.id));
    }
    setDeletingPhotoId(null);
  }

  async function handleDeleteSession(sessionId: string) {
    if (!confirm("Supprimer cette seance et ses photos ?")) {
      return;
    }

    setStatus("saving");
    setError("");

    const { error: deleteError } = await supabaseBrowser
      .from("sessions")
      .delete()
      .eq("id", sessionId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      await fetchSessions();
    }
    setStatus("idle");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">Seances</h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              Creez et gerez les seances de vos patients
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-all hover:bg-[var(--primary-hover)]"
          >
            {showForm ? "Annuler" : "+ Nouvelle seance"}
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="rounded-xl border border-[var(--error)] bg-[var(--error-light)] px-4 py-3 text-sm text-[var(--error)]">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="rounded-xl border border-[var(--success)] bg-[var(--success-light)] px-4 py-3 text-sm text-[var(--success)]">
            {successMessage}
          </div>
        )}
      </header>

      {/* Formulaire creation */}
      {showForm && (
        <form
          onSubmit={handleCreateSession}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"
        >
          <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
            Nouvelle seance
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]" htmlFor="patient">
                Patient *
              </label>
              <select
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] transition focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
                id="patient"
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
                required
              >
                {patients.length === 0 ? (
                  <option value="">Aucun patient</option>
                ) : null}
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]" htmlFor="date">
                Date de la seance
              </label>
              <input
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] transition focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
                id="date"
                type="date"
                value={sessionDate}
                onChange={(event) => setSessionDate(event.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]" htmlFor="obj">
                Objectifs
              </label>
              <input
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] transition focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
                id="obj"
                value={objectives}
                onChange={(event) => setObjectives(event.target.value)}
                placeholder="Ex: Suivi post-traitement, evaluation initiale..."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]" htmlFor="rem">
                Remarques
              </label>
              <textarea
                className="min-h-[80px] w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] transition focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
                id="rem"
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Observations additionnelles..."
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              className="rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={status === "saving"}
              type="submit"
            >
              {status === "saving" ? "Enregistrement..." : "Creer la seance"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)]"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Liste des seances */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          Historique des seances ({sessions.length})
        </h2>

        {status === "loading" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <SessionSkeleton key={i} />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center">
            <div className="mx-auto max-w-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary-light)]">
                <svg className="h-8 w-8 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-[var(--foreground)]">
                Aucune seance
              </h3>
              <p className="mb-4 text-sm text-[var(--text-secondary)]">
                Commencez par creer une premiere seance
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
              >
                + Nouvelle seance
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] transition hover:shadow-[var(--shadow-md)]"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">
                      {session.patient?.full_name ?? "Patient"}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {new Date(session.session_date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="text-sm text-[var(--text-muted)] transition hover:text-[var(--error)]"
                  >
                    Supprimer
                  </button>
                </div>

                {session.objectives && (
                  <p className="mb-2 text-sm text-[var(--text-secondary)]">
                    <span className="font-medium">Objectifs:</span> {session.objectives}
                  </p>
                )}
                {session.remarks && (
                  <p className="text-xs text-[var(--text-muted)]">
                    {session.remarks}
                  </p>
                )}
                <Link
                  href={`/analysis/${session.id}`}
                  className="mt-3 inline-flex text-xs font-semibold text-[var(--primary)] hover:underline"
                >
                  Lancer l'analyse IA
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upload photo */}
      {sessions.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            Ajouter une photo
          </h2>

          <form
            onSubmit={handlePhotoUpload}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]" htmlFor="session">
                  Seance
                </label>
                <select
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] transition focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
                  id="session"
                  value={selectedSessionId}
                  onChange={(event) => setSelectedSessionId(event.target.value)}
                >
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.patient?.full_name ?? "Patient"} - {new Date(session.session_date).toLocaleDateString("fr-FR")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]" htmlFor="angle">
                  Angle
                </label>
                <select
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] transition focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-light)]"
                  id="angle"
                  value={photoAngle}
                  onChange={(event) => setPhotoAngle(event.target.value)}
                >
                  <option value="face">Face</option>
                  <option value="three_quarter_left">3/4 gauche</option>
                  <option value="three_quarter_right">3/4 droit</option>
                  <option value="profile_left">Profil gauche</option>
                  <option value="profile_right">Profil droit</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">
                  Fichier image
                </label>
                <input
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] file:mr-4 file:cursor-pointer file:rounded-full file:border-0 file:bg-[var(--primary-light)] file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-[var(--primary)] hover:file:bg-[var(--primary)] hover:file:text-white"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                className="rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={uploadStatus === "uploading"}
                type="submit"
              >
                {uploadStatus === "uploading" ? "Upload..." : "Ajouter la photo"}
              </button>
              {uploadMessage && (
                <span className={uploadMessage.includes("succes") ? "text-sm text-[var(--success)]" : "text-sm text-[var(--error)]"}>
                  {uploadMessage}
                </span>
              )}
            </div>
          </form>

          {/* Galerie de la seance selectionnee */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Photos de la seance
            </h3>

            {galleryStatus === "loading" ? (
              <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {[...Array(5)].map((_, i) => (
                  <PhotoSkeleton key={i} />
                ))}
              </div>
            ) : photos.length === 0 ? (
              <p className="text-center text-sm text-[var(--text-secondary)]">
                Aucune photo pour cette seance
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] transition hover:shadow-[var(--shadow-md)]"
                  >
                    {photo.signed_url ? (
                      <div className="relative aspect-square overflow-hidden bg-gray-100">
                        <img
                          alt={`Photo ${photo.angle}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          src={photo.signed_url}
                        />
                        <button
                          onClick={() => handleDeletePhoto(photo)}
                          disabled={deletingPhotoId === photo.id}
                          className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition hover:bg-[var(--error)] group-hover:opacity-100 disabled:opacity-50"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-gray-100 text-xs text-[var(--text-muted)]">
                        Indisponible
                      </div>
                    )}
                    <div className="p-2">
                      <p className="truncate text-xs capitalize text-[var(--text-secondary)]">
                        {photo.angle.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
