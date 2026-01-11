"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";

type Patient = {
  id: string;
  full_name: string;
  consent: boolean;
  notes: string | null;
  created_at: string;
  birth_date?: string | null;
  sex?: string | null;
  phone?: string | null;
  email?: string | null;
  smoker?: boolean | null;
  athlete_level?: string | null;
  alcohol?: string | null;
  other_drugs?: string | null;
  sun_exposure?: string | null;
  menopause?: boolean | null;
  hormonal_disorders?: string | null;
  phototype?: string | null;
  medical_history?: string | null;
  surgical_history?: string | null;
  allergy_history?: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  bmi?: number | null;
};

type SessionRow = {
  id: string;
  session_date: string;
  objectives: string | null;
  remarks: string | null;
};

type PhotoRow = {
  id: string;
  angle: string;
  storage_path: string;
  created_at: string;
  session_id: string;
  session_date: string;
};

type SignedPhoto = PhotoRow & { signed_url: string };

function getBmiLabel(bmi?: number | null) {
  if (!bmi) {
    return "-";
  }
  if (bmi < 18.5) {
    return "Insuffisance ponderale";
  }
  if (bmi < 25) {
    return "Corpulence normale";
  }
  if (bmi < 30) {
    return "Surpoids";
  }
  if (bmi < 35) {
    return "Obesite moderee";
  }
  if (bmi < 40) {
    return "Obesite severe";
  }
  return "Obesite morbide";
}

function InfoSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
      <div className="mb-4 h-6 w-32 rounded bg-gray-200" />
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-gray-100" />
        <div className="h-4 w-3/4 rounded bg-gray-100" />
      </div>
    </div>
  );
}

function SessionSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-2 h-5 w-24 rounded bg-gray-200" />
      <div className="h-4 w-full rounded bg-gray-100" />
    </div>
  );
}

function PhotoSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3">
        <div className="h-4 w-20 rounded bg-gray-100" />
      </div>
    </div>
  );
}

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [photos, setPhotos] = useState<SignedPhoto[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    birth_date: "",
    sex: "",
    phone: "",
    email: "",
    smoker: false,
    athlete_level: "",
    alcohol: "",
    other_drugs: "",
    sun_exposure: "",
    menopause: false,
    hormonal_disorders: "",
    phototype: "",
    medical_history: "",
    surgical_history: "",
    allergy_history: "",
    weight_kg: "",
    height_cm: "",
    notes: "",
  });

  const storageBucket = useMemo(
    () => process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET,
    []
  );

  async function fetchPatientDetails() {
    if (!patientId) {
      return;
    }
    setStatus("loading");
    setError("");

    const { data: patientData, error: patientError } = await supabaseBrowser
      .from("patients")
      .select(
        "id, full_name, consent, notes, created_at, birth_date, sex, phone, email, smoker, athlete_level, alcohol, other_drugs, sun_exposure, menopause, hormonal_disorders, phototype, medical_history, surgical_history, allergy_history, weight_kg, height_cm, bmi"
      )
      .eq("id", patientId)
      .single();

    if (patientError) {
      setError(patientError.message);
      setStatus("idle");
      return;
    }

    const { data: sessionData, error: sessionError } = await supabaseBrowser
      .from("sessions")
      .select("id, session_date, objectives, remarks")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (sessionError) {
      setError(sessionError.message);
    } else {
      setSessions(sessionData ?? []);
    }

    if (storageBucket) {
      const { data: photoData, error: photoFetchError } =
        await supabaseBrowser
          .from("photos")
          .select(
            "id, angle, storage_path, created_at, sessions!inner(id, session_date)"
          )
          .eq("sessions.patient_id", patientId)
          .order("created_at", { ascending: false });

      if (photoFetchError) {
        setPhotoError(photoFetchError.message);
      } else {
        const normalizedPhotos: PhotoRow[] =
          photoData?.map((photo: any) => {
            const session = Array.isArray(photo.sessions)
              ? photo.sessions[0]
              : photo.sessions;
            return {
              id: photo.id,
              angle: photo.angle,
              storage_path: photo.storage_path,
              created_at: photo.created_at,
              session_id: session?.id ?? "",
              session_date: session?.session_date ?? "",
            };
          }) ?? [];

        const signedPhotos = await Promise.all(
          normalizedPhotos.map(async (photo) => {
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
      }
    }

    setPatient(patientData);
    setFormData({
      full_name: patientData?.full_name ?? "",
      birth_date: patientData?.birth_date ?? "",
      sex: patientData?.sex ?? "",
      phone: patientData?.phone ?? "",
      email: patientData?.email ?? "",
      smoker: Boolean(patientData?.smoker),
      athlete_level: patientData?.athlete_level ?? "",
      alcohol: patientData?.alcohol ?? "",
      other_drugs: patientData?.other_drugs ?? "",
      sun_exposure: patientData?.sun_exposure ?? "",
      menopause: Boolean(patientData?.menopause),
      hormonal_disorders: patientData?.hormonal_disorders ?? "",
      phototype: patientData?.phototype ?? "",
      medical_history: patientData?.medical_history ?? "",
      surgical_history: patientData?.surgical_history ?? "",
      allergy_history: patientData?.allergy_history ?? "",
      weight_kg: patientData?.weight_kg ? String(patientData.weight_kg) : "",
      height_cm: patientData?.height_cm ? String(patientData.height_cm) : "",
      notes: patientData?.notes ?? "",
    });
    setStatus("idle");
  }

  useEffect(() => {
    fetchPatientDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  async function handleDeletePhoto(photo: SignedPhoto) {
    if (!storageBucket) {
      setPhotoError("Bucket manquant dans les variables d'env.");
      return;
    }
    if (!confirm("Supprimer cette photo ?")) {
      return;
    }

    setPhotoError("");
    setPhotoMessage("");

    const { error: storageError } = await supabaseBrowser.storage
      .from(storageBucket)
      .remove([photo.storage_path]);

    if (storageError) {
      setPhotoError(storageError.message);
      return;
    }

    const { error: deleteError } = await supabaseBrowser
      .from("photos")
      .delete()
      .eq("id", photo.id);

    if (deleteError) {
      setPhotoError(deleteError.message);
      return;
    }

    setPhotos((prev) => prev.filter((item) => item.id !== photo.id));
    setPhotoMessage("Photo supprimee.");
  }

  async function handleSave() {
    if (!patientId) {
      return;
    }
    setError("");
    const { error: updateError } = await supabaseBrowser
      .from("patients")
      .update({
        full_name: formData.full_name.trim(),
        birth_date: formData.birth_date || null,
        sex: formData.sex || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        smoker: formData.smoker,
        athlete_level: formData.athlete_level || null,
        alcohol: formData.alcohol || null,
        other_drugs: formData.other_drugs.trim() || null,
        sun_exposure: formData.sun_exposure || null,
        menopause: formData.menopause,
        hormonal_disorders: formData.hormonal_disorders.trim() || null,
        phototype: formData.phototype || null,
        medical_history: formData.medical_history.trim() || null,
        surgical_history: formData.surgical_history.trim() || null,
        allergy_history: formData.allergy_history.trim() || null,
        weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
        height_cm: formData.height_cm ? Number(formData.height_cm) : null,
        notes: formData.notes.trim() || null,
      })
      .eq("id", patientId);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setIsEditing(false);
    fetchPatientDetails();
  }

  if (!patientId) {
    return (
      <div className="flex h-screen items-center justify-center text-[var(--text-secondary)]">
        Patient introuvable
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
          <Link href="/patients" className="hover:text-[var(--primary)]">
            Patients
          </Link>
          <span>/</span>
          <span className="text-[var(--foreground)]">{patient?.full_name ?? "Chargement..."}</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">
              {patient?.full_name ?? "Chargement..."}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
              <span>
                Cree le {patient?.created_at ? new Date(patient.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                }) : "-"}
              </span>
              {patient && (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    patient.consent
                      ? "bg-[var(--success-light)] text-[var(--success)]"
                      : "bg-[var(--warning-light)] text-[var(--warning)]"
                  }`}
                >
                  {patient.consent ? "Consentement OK" : "Consentement manquant"}
                </span>
              )}
            </div>
          </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/sessions">
            <Button
              variant="primary"
              size="md"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Nouvelle seance
            </Button>
          </Link>
          <Link href="/capture">
            <Button
              variant="ghost"
              size="md"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            >
              Capturer
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="md"
            onClick={() => setIsEditing((prev) => !prev)}
          >
            {isEditing ? "Fermer l'edition" : "Modifier le patient"}
          </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-[var(--error)] bg-[var(--error-light)] px-4 py-3 text-sm text-[var(--error)]">
            {error}
          </div>
        )}
      </header>

      {/* Infos patient */}
      <section>
        {status === "loading" ? (
          <InfoSkeleton />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card variant="glass" className="animate-fadeIn">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <CardTitle size="md">Notes medicales</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={formData.notes}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    rows={5}
                    placeholder="Notes medicales du patient..."
                  />
                ) : (
                  <p className="text-slate-600">
                    {patient?.notes || "Aucune note pour le moment."}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card variant="glass" className="animate-fadeIn" style={{ animationDelay: "0.1s" }}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <CardTitle size="md">Informations patient</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
              <div className="grid gap-3 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Naissance</p>
                  {isEditing ? (
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                      type="date"
                      value={formData.birth_date}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, birth_date: event.target.value }))
                      }
                    />
                  ) : (
                    <p>{patient?.birth_date ?? "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Sexe</p>
                  {isEditing ? (
                    <select
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                      value={formData.sex}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, sex: event.target.value }))
                      }
                    >
                      <option value="">Non renseigne</option>
                      <option value="female">Femme</option>
                      <option value="male">Homme</option>
                      <option value="other">Autre</option>
                    </select>
                  ) : (
                    <p>{patient?.sex ?? "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Email</p>
                  {isEditing ? (
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                      type="email"
                      value={formData.email}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, email: event.target.value }))
                      }
                    />
                  ) : (
                    <p>{patient?.email ?? "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Telephone</p>
                  {isEditing ? (
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                      type="tel"
                      value={formData.phone}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, phone: event.target.value }))
                      }
                    />
                  ) : (
                    <p>{patient?.phone ?? "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Fumeur</p>
                  {isEditing ? (
                    <label className="mt-2 flex items-center gap-2 text-sm text-[var(--foreground)]">
                      <input
                        type="checkbox"
                        checked={formData.smoker}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, smoker: event.target.checked }))
                        }
                      />
                      Fumeur
                    </label>
                  ) : (
                    <p>{patient?.smoker ? "Oui" : "Non"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Sportif</p>
                  {isEditing ? (
                    <select
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                      value={formData.athlete_level}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          athlete_level: event.target.value,
                        }))
                      }
                    >
                      <option value="">Non renseigne</option>
                      <option value="none">Pas sportif</option>
                      <option value="low">Faible</option>
                      <option value="moderate">Modere</option>
                      <option value="high">Eleve</option>
                    </select>
                  ) : (
                    <p>{patient?.athlete_level ?? "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Alcool</p>
                  {isEditing ? (
                    <select
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                      value={formData.alcohol}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, alcohol: event.target.value }))
                      }
                    >
                      <option value="">Non renseigne</option>
                      <option value="never">Jamais</option>
                      <option value="occasionnel">Occasionnel</option>
                      <option value="regulier">Regulier</option>
                      <option value="frequent">Frequent</option>
                    </select>
                  ) : (
                    <p>{patient?.alcohol ?? "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Poids (kg)</p>
                  {isEditing ? (
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.weight_kg}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          weight_kg: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <p>{patient?.weight_kg ?? "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Taille (cm)</p>
                  {isEditing ? (
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.height_cm}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          height_cm: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <p>{patient?.height_cm ?? "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">IMC</p>
                  <p>{patient?.bmi ?? "-"}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {getBmiLabel(patient?.bmi ?? null)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Autres drogues</p>
                  {isEditing ? (
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                      value={formData.other_drugs}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          other_drugs: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <p>{patient?.other_drugs ?? "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Exposition solaire</p>
                  {isEditing ? (
                    <select
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                      value={formData.sun_exposure}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          sun_exposure: event.target.value,
                        }))
                      }
                    >
                      <option value="">Non renseigne</option>
                      <option value="faible">Faible</option>
                      <option value="moderee">Moderee</option>
                      <option value="forte">Forte</option>
                    </select>
                  ) : (
                    <p>{patient?.sun_exposure ?? "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Phototype</p>
                  {isEditing ? (
                    <select
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                      value={formData.phototype}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          phototype: event.target.value,
                        }))
                      }
                    >
                      <option value="">Non renseigne</option>
                      <option value="I">I</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
                      <option value="IV">IV</option>
                      <option value="V">V</option>
                      <option value="VI">VI</option>
                    </select>
                  ) : (
                    <p>{patient?.phototype ?? "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Menopause/Andropause</p>
                  {isEditing ? (
                    <label className="mt-2 flex items-center gap-2 text-sm text-[var(--foreground)]">
                      <input
                        type="checkbox"
                        checked={formData.menopause}
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            menopause: event.target.checked,
                          }))
                        }
                      />
                      Menopause / Andropause
                    </label>
                  ) : (
                    <p>{patient?.menopause ? "Oui" : "Non"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Troubles hormonaux</p>
                  {isEditing ? (
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                      value={formData.hormonal_disorders}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          hormonal_disorders: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <p>{patient?.hormonal_disorders ?? "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Antecedent medical</p>
                  {isEditing ? (
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                      value={formData.medical_history}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          medical_history: event.target.value,
                        }))
                      }
                      placeholder="Auto-immune, inflammatoire, chronique, pacemaker..."
                    />
                  ) : (
                    <p>{patient?.medical_history ?? "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Antecedent chirurgical</p>
                  {isEditing ? (
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                      value={formData.surgical_history}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          surgical_history: event.target.value,
                        }))
                      }
                      placeholder="Materiel osteo-synthese, hernie, eventration..."
                    />
                  ) : (
                    <p>{patient?.surgical_history ?? "-"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">Allergies</p>
                  {isEditing ? (
                    <input
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
                      value={formData.allergy_history}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          allergy_history: event.target.value,
                        }))
                      }
                      placeholder="Allergies connues"
                    />
                  ) : (
                    <p>{patient?.allergy_history ?? "-"}</p>
                  )}
                </div>
              </div>
              {isEditing ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSave}
                  >
                    Enregistrer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                  >
                    Annuler
                  </Button>
                </div>
              ) : null}
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* Seances */}
      <section className="space-y-4 animate-fadeIn" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Seances ({sessions.length})
          </h2>
        </div>

        {status === "loading" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <SessionSkeleton key={i} />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <Card variant="glass" padding="lg" className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="mb-4 text-slate-600">
              Aucune seance enregistree
            </p>
            <Link href="/sessions">
              <Button variant="primary" size="md">
                Creer une seance
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session, index) => (
              <Card
                key={session.id}
                variant="glass"
                hoverable
                className="animate-scaleIn"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-slate-900">
                    {new Date(session.session_date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </span>
                </div>
                {session.objectives && (
                  <p className="mb-2 text-sm text-slate-600">
                    <span className="font-semibold">Objectifs:</span> {session.objectives}
                  </p>
                )}
                {session.remarks && (
                  <p className="mb-3 text-xs text-slate-500">
                    {session.remarks}
                  </p>
                )}
                <Link href={`/analysis/${session.id}`}>
                  <Button variant="accent" size="sm" fullWidth>
                    Lancer l'analyse IA
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Galerie photos */}
      <section className="space-y-4 animate-fadeIn" style={{ animationDelay: "0.3s" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            Galerie photos ({photos.length})
          </h2>
        </div>

        {photoError && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-600 animate-fadeIn">
            {photoError}
          </div>
        )}
        {photoMessage && (
          <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-600 animate-fadeIn">
            {photoMessage}
          </div>
        )}

        {status === "loading" ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <PhotoSkeleton key={i} />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <Card variant="glass" padding="lg" className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <svg className="h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
            </div>
            <p className="mb-4 text-slate-600">
              Aucune photo disponible
            </p>
            <Link href="/capture">
              <Button variant="accent" size="md">
                Capturer des photos
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {photos.map((photo, index) => (
              <Card
                key={photo.id}
                variant="glass"
                padding="none"
                hoverable
                className="overflow-hidden animate-scaleIn"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {photo.signed_url ? (
                  <div className="group relative aspect-square overflow-hidden bg-slate-100">
                    <img
                      alt={`Photo ${photo.angle}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                      src={photo.signed_url}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <Button
                      variant="danger"
                      size="sm"
                      className="absolute right-2 top-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      onClick={() => handleDeletePhoto(photo)}
                    >
                      Supprimer
                    </Button>
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-slate-100 text-sm text-slate-400">
                    Image indisponible
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold capitalize text-slate-900">
                      {photo.angle.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(photo.session_date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short"
                      })}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
