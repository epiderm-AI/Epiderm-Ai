"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { supabaseBrowser, supabaseEnvMissing } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";

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

function PatientCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-6 border border-slate-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="mb-2 h-6 w-32 rounded-lg bg-slate-200/70" />
          <div className="h-4 w-24 rounded-lg bg-slate-100/70" />
        </div>
        <div className="h-4 w-16 rounded-lg bg-slate-100/70" />
      </div>
      <div className="mt-4 h-10 w-full rounded-lg bg-slate-100/70" />
    </div>
  );
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [smoker, setSmoker] = useState(false);
  const [athleteLevel, setAthleteLevel] = useState("");
  const [alcohol, setAlcohol] = useState("");
  const [otherDrugs, setOtherDrugs] = useState("");
  const [sunExposure, setSunExposure] = useState("");
  const [menopause, setMenopause] = useState(false);
  const [hormonalDisorders, setHormonalDisorders] = useState("");
  const [phototype, setPhototype] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [surgicalHistory, setSurgicalHistory] = useState("");
  const [allergyHistory, setAllergyHistory] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("idle");
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchPatients() {
    setStatus("loading");
    setError("");
    const { data, error: fetchError } = await supabaseBrowser
      .from("patients")
      .select("id, full_name, consent, notes, created_at")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setPatients(data ?? []);
    }
    setStatus("idle");
  }

  useEffect(() => {
    async function initAuth() {
      setAuthLoading(true);
      try {
        if (supabaseEnvMissing) {
          setAuthLoading(false);
          return;
        }
        const { data, error: authError } = await supabaseBrowser.auth.getUser();
        if (authError) {
          console.error("Auth error:", authError);
          setError("Erreur d'authentification. Veuillez vous reconnecter.");
        }
        setUser(data.user ?? null);
      } catch (err) {
        console.error("Auth exception:", err);
        setError("Erreur d'authentification. Veuillez vous reconnecter.");
      } finally {
        setAuthLoading(false);
      }
    }

    initAuth();
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreatePatient(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (authLoading) {
      setError("Vérification de l'authentification en cours...");
      return;
    }

    if (!user) {
      setError("Vous devez être connecté pour ajouter un patient. Veuillez vous connecter.");
      return;
    }

    setStatus("saving");
    setError("");
    setSuccessMessage("");

    const { error: insertError } = await supabaseBrowser.from("patients").insert({
      practitioner_id: user.id,
      full_name: fullName.trim(),
      birth_date: birthDate || null,
      sex: sex || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      smoker,
      athlete_level: athleteLevel || null,
      alcohol: alcohol || null,
      other_drugs: otherDrugs.trim() || null,
      sun_exposure: sunExposure || null,
      menopause,
      hormonal_disorders: hormonalDisorders.trim() || null,
      phototype: phototype || null,
      medical_history: medicalHistory.trim() || null,
      surgical_history: surgicalHistory.trim() || null,
      allergy_history: allergyHistory.trim() || null,
      weight_kg: weightKg ? Number(weightKg) : null,
      height_cm: heightCm ? Number(heightCm) : null,
      consent,
      notes: notes.trim() || null,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setFullName("");
      setBirthDate("");
      setSex("");
      setPhone("");
      setEmail("");
      setSmoker(false);
      setAthleteLevel("");
      setAlcohol("");
      setOtherDrugs("");
      setSunExposure("");
      setMenopause(false);
      setHormonalDisorders("");
      setPhototype("");
      setMedicalHistory("");
      setSurgicalHistory("");
      setAllergyHistory("");
      setWeightKg("");
      setHeightCm("");
      setNotes("");
      setConsent(false);
      setShowForm(false);
      setSuccessMessage("Patient ajoute avec succes");
      await fetchPatients();
      setTimeout(() => setSuccessMessage(""), 3000);
    }
    setStatus("idle");
  }

  async function handleDeletePatient(patientId: string) {
    if (!confirm("Supprimer ce patient et toutes ses seances ?")) {
      return;
    }

    setDeletingId(patientId);
    setError("");

    const { error: deleteError } = await supabaseBrowser
      .from("patients")
      .delete()
      .eq("id", patientId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      await fetchPatients();
    }
    setDeletingId(null);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 animate-fadeIn">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="animate-slideInDown">
            <h1 className="text-4xl font-bold text-slate-900">
              Patients
            </h1>
            <p className="mt-2 text-slate-600 text-base">
              Gerez vos patients et suivez leur evolution
            </p>
            {authLoading && (
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                Vérification de l'authentification...
              </div>
            )}
            {!authLoading && user && (
              <div className="mt-3 flex items-center gap-2 text-sm text-teal-600">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Connecté en tant que {user.email}
              </div>
            )}
          </div>
          <div className="animate-scaleIn">
            <Button
              onClick={() => setShowForm(!showForm)}
              disabled={authLoading || !user}
              variant="primary"
              size="lg"
              icon={
                showForm ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )
              }
            >
              {showForm ? "Annuler" : "Nouveau patient"}
            </Button>
          </div>
        </div>

        {/* Messages */}
        {!authLoading && !user && (
          <Card variant="glass" className="border-amber-200 bg-white animate-slideInDown">
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 rounded-full bg-amber-100 p-2">
                  <svg className="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-amber-900">
                    Authentification requise
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    Vous devez vous connecter pour gérer les patients.{" "}
                    <Link href="/login" className="font-semibold text-amber-800 underline hover:text-amber-900">
                      Se connecter maintenant
                    </Link>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {error && (
          <Card variant="glass" className="border-red-200 bg-white animate-slideInDown">
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 rounded-full bg-red-100 p-2">
                  <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-medium text-red-900">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {successMessage && (
          <Card variant="glass" className="border-teal-200 bg-white animate-slideInDown">
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 rounded-full bg-teal-100 p-2">
                  <svg className="h-5 w-5 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-medium text-teal-900">{successMessage}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </header>

      {/* Formulaire creation */}
      {showForm && (
        <form
          onSubmit={handleCreatePatient}
          className="animate-slideInDown"
        >
          <Card variant="default" padding="lg">
            <CardHeader>
              <CardTitle size="lg">Nouveau patient</CardTitle>
              <CardDescription>
                Remplissez les informations du patient pour créer son dossier
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-8">
              {/* Informations personnelles */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  Informations personnelles
                </h3>

                <Input
                  label="Nom complet"
                  id="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Jean Dupont"
                  required
                  fullWidth
                  leftIcon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="birthDate">
                      Date de naissance
                    </label>
                    <input
                      className="w-full px-4 py-3 text-base bg-white border border-slate-300 rounded-xl transition-all duration-250 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-indigo-500 focus:ring-indigo-500/20 min-h-[44px]"
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(event) => setBirthDate(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="sex">
                      Sexe
                    </label>
                    <select
                      className="w-full px-4 py-3 text-base bg-white border border-slate-300 rounded-xl transition-all duration-250 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-indigo-500 focus:ring-indigo-500/20 min-h-[44px]"
                      id="sex"
                      value={sex}
                      onChange={(event) => setSex(event.target.value)}
                    >
                      <option value="">Non renseigne</option>
                      <option value="female">Femme</option>
                      <option value="male">Homme</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Adresse email"
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="patient@email.fr"
                    fullWidth
                    leftIcon={
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    }
                  />
                  <Input
                    label="Numero de telephone"
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+33 6 00 00 00 00"
                    fullWidth
                    leftIcon={
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    }
                  />
                </div>
              </div>

              {/* Style de vie */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  Style de vie
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 transition-all hover:border-indigo-300 hover:bg-indigo-50/30 min-h-[44px]">
                    <input
                      className="h-5 w-5 cursor-pointer rounded border-slate-300 text-indigo-600 transition focus:ring-2 focus:ring-indigo-500"
                      checked={smoker}
                      onChange={(event) => setSmoker(event.target.checked)}
                      type="checkbox"
                    />
                    <span className="font-medium text-slate-700">Fumeur</span>
                  </label>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="athlete">
                      Sportif (niveau)
                    </label>
                    <select
                      className="w-full px-4 py-3 text-base bg-white border border-slate-300 rounded-xl transition-all duration-250 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-indigo-500 focus:ring-indigo-500/20 min-h-[44px]"
                      id="athlete"
                      value={athleteLevel}
                      onChange={(event) => setAthleteLevel(event.target.value)}
                    >
                      <option value="">Non renseigne</option>
                      <option value="none">Pas sportif</option>
                      <option value="low">Faible</option>
                      <option value="moderate">Modere</option>
                      <option value="high">Eleve</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="alcohol">
                      Alcool
                    </label>
                    <select
                      className="w-full px-4 py-3 text-base bg-white border border-slate-300 rounded-xl transition-all duration-250 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-indigo-500 focus:ring-indigo-500/20 min-h-[44px]"
                      id="alcohol"
                      value={alcohol}
                      onChange={(event) => setAlcohol(event.target.value)}
                    >
                      <option value="">Non renseigne</option>
                      <option value="never">Jamais</option>
                      <option value="occasionnel">Occasionnel</option>
                      <option value="regulier">Regulier</option>
                      <option value="frequent">Frequent</option>
                    </select>
                  </div>
                  <Input
                    label="Autres drogues"
                    id="otherDrugs"
                    value={otherDrugs}
                    onChange={(event) => setOtherDrugs(event.target.value)}
                    placeholder="Si oui, lesquelles"
                    fullWidth
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="sunExposure">
                      Exposition solaire
                    </label>
                    <select
                      className="w-full px-4 py-3 text-base bg-white border border-slate-300 rounded-xl transition-all duration-250 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-indigo-500 focus:ring-indigo-500/20 min-h-[44px]"
                      id="sunExposure"
                      value={sunExposure}
                      onChange={(event) => setSunExposure(event.target.value)}
                    >
                      <option value="">Non renseigne</option>
                      <option value="faible">Faible</option>
                      <option value="moderee">Moderee</option>
                      <option value="forte">Forte</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="phototype">
                      Phototype
                    </label>
                    <select
                      className="w-full px-4 py-3 text-base bg-white border border-slate-300 rounded-xl transition-all duration-250 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-indigo-500 focus:ring-indigo-500/20 min-h-[44px]"
                      id="phototype"
                      value={phototype}
                      onChange={(event) => setPhototype(event.target.value)}
                    >
                      <option value="">Non renseigne</option>
                      <option value="I">I</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
                      <option value="IV">IV</option>
                      <option value="V">V</option>
                      <option value="VI">VI</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Antécédents médicaux */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  Antécédents médicaux
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Antecedent medical"
                    id="medicalHistory"
                    value={medicalHistory}
                    onChange={(event) => setMedicalHistory(event.target.value)}
                    placeholder="Auto-immune, inflammatoire, chronique, pacemaker..."
                    fullWidth
                  />
                  <Input
                    label="Antecedent chirurgical"
                    id="surgicalHistory"
                    value={surgicalHistory}
                    onChange={(event) => setSurgicalHistory(event.target.value)}
                    placeholder="Materiel osteo-synthese, hernie, eventration..."
                    fullWidth
                  />
                </div>

                <Input
                  label="Allergies"
                  id="allergyHistory"
                  value={allergyHistory}
                  onChange={(event) => setAllergyHistory(event.target.value)}
                  placeholder="Allergies connues"
                  fullWidth
                />
              </div>

              {/* Données physiques */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  Données physiques
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Poids (kg)"
                    id="weight"
                    type="number"
                    min="0"
                    step="0.1"
                    value={weightKg}
                    onChange={(event) => setWeightKg(event.target.value)}
                    fullWidth
                  />
                  <Input
                    label="Taille (cm)"
                    id="height"
                    type="number"
                    min="0"
                    step="0.1"
                    value={heightCm}
                    onChange={(event) => setHeightCm(event.target.value)}
                    fullWidth
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 transition-all hover:border-indigo-300 hover:bg-indigo-50/30 min-h-[44px]">
                    <input
                      className="h-5 w-5 cursor-pointer rounded border-slate-300 text-indigo-600 transition focus:ring-2 focus:ring-indigo-500"
                      checked={menopause}
                      onChange={(event) => setMenopause(event.target.checked)}
                      type="checkbox"
                    />
                    <span className="font-medium text-slate-700">Menopause / andropause</span>
                  </label>
                  <Input
                    label="Troubles hormonaux"
                    id="hormonal"
                    value={hormonalDisorders}
                    onChange={(event) => setHormonalDisorders(event.target.value)}
                    placeholder="Ex: SOPK, hyperandrogenie"
                    fullWidth
                  />
                </div>
              </div>

              {/* Notes et consentement */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  Notes et consentement
                </h3>

                <Textarea
                  label="Notes"
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Observations, antecedents medicaux..."
                  rows={4}
                  fullWidth
                />

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-200 bg-white p-4 transition-all hover:border-teal-300 hover:bg-teal-50/30 min-h-[44px]">
                  <input
                    className="h-5 w-5 cursor-pointer rounded border-slate-300 text-teal-600 transition focus:ring-2 focus:ring-teal-500"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    type="checkbox"
                  />
                  <span className="font-medium text-slate-700">Consentement obtenu</span>
                </label>
              </div>
            </CardContent>

            <CardFooter>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
                <Button
                  disabled={status === "saving"}
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={status === "saving"}
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  }
                >
                  {status === "saving" ? "Enregistrement..." : "Ajouter le patient"}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowForm(false)}
                  variant="ghost"
                  size="lg"
                >
                  Annuler
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      )}

      {/* Liste des patients */}
      <section>
        {status === "loading" ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <PatientCardSkeleton key={i} />
            ))}
          </div>
        ) : patients.length === 0 ? (
          <Card variant="glass" className="animate-scaleIn">
            <CardContent className="p-12 text-center">
              <div className="mx-auto max-w-sm">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-900 shadow-lg">
                  <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="mb-2 text-xl font-bold text-slate-900">
                  Aucun patient
                </h3>
                <p className="mb-6 text-slate-600">
                  Commencez par ajouter votre premier patient pour démarrer le suivi
                </p>
                <Button
                  onClick={() => setShowForm(true)}
                  variant="primary"
                  size="lg"
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  }
                >
                  Nouveau patient
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {patients.map((patient, index) => (
              <Card
                key={patient.id}
                variant="glass"
                hoverable
                className="animate-fadeIn"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle size="md">{patient.full_name}</CardTitle>
                      <CardDescription>
                        Ajouté le {new Date(patient.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric"
                        })}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                        patient.consent
                          ? "bg-emerald-600 text-white shadow-md"
                          : "bg-amber-500 text-white shadow-md"
                      }`}
                    >
                      {patient.consent ? (
                        <>
                          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Consentement OK
                        </>
                      ) : (
                        <>
                          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Consentement manquant
                        </>
                      )}
                    </span>
                  </div>
                </CardHeader>

                <CardContent>
                  {patient.notes && (
                    <p className="line-clamp-2 text-sm text-slate-600 leading-relaxed">
                      {patient.notes}
                    </p>
                  )}
                </CardContent>

                <CardFooter>
                  <div className="flex items-center justify-between gap-3 w-full">
                    <Link
                      href={`/patients/${patient.id}`}
                      className="inline-flex items-center gap-2 font-semibold text-indigo-600 transition hover:text-indigo-700 hover:gap-3"
                    >
                      Voir le dossier
                      <svg className="h-4 w-4 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => handleDeletePatient(patient.id)}
                      disabled={deletingId === patient.id}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-red-600 disabled:opacity-50"
                    >
                      {deletingId === patient.id ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                          Suppression...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Supprimer
                        </>
                      )}
                    </button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
