"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
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

type SortField = "full_name" | "created_at" | "birth_date" | "sex";
type SortDirection = "asc" | "desc";

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return fullName.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-indigo-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-violet-500",
    "bg-cyan-500",
    "bg-pink-500",
    "bg-teal-500",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Form states
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
      .select("*")
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

  // Filtered and sorted patients
  const filteredAndSortedPatients = useMemo(() => {
    let result = [...patients];

    // Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((patient) => {
        const fullNameMatch = patient.full_name?.toLowerCase().includes(query);
        const emailMatch = patient.email?.toLowerCase().includes(query);
        const phoneMatch = patient.phone?.toLowerCase().includes(query);
        const birthDateMatch = patient.birth_date?.includes(query);
        const createdAtMatch = new Date(patient.created_at)
          .toLocaleDateString("fr-FR")
          .includes(query);
        return fullNameMatch || emailMatch || phoneMatch || birthDateMatch || createdAtMatch;
      });
    }

    // Sort
    result.sort((a, b) => {
      let aValue: string | number = "";
      let bValue: string | number = "";

      switch (sortField) {
        case "full_name":
          aValue = a.full_name?.toLowerCase() || "";
          bValue = b.full_name?.toLowerCase() || "";
          break;
        case "created_at":
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case "birth_date":
          aValue = a.birth_date ? new Date(a.birth_date).getTime() : 0;
          bValue = b.birth_date ? new Date(b.birth_date).getTime() : 0;
          break;
        case "sex":
          aValue = a.sex || "";
          bValue = b.sex || "";
          break;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [patients, searchQuery, sortField, sortDirection]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  async function handleCreatePatient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (authLoading) {
      setError("Vérification de l'authentification en cours...");
      return;
    }

    if (!user) {
      setError("Vous devez être connecté pour ajouter un patient.");
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
      // Reset form
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
      setSuccessMessage("Patient ajouté avec succès");
      await fetchPatients();
      setTimeout(() => setSuccessMessage(""), 3000);
    }
    setStatus("idle");
  }

  async function handleDeletePatient(patientId: string) {
    if (!confirm("Supprimer ce patient et toutes ses séances ?")) {
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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 animate-fadeIn">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Patients</h1>
            <p className="mt-1 text-sm text-slate-600">
              {filteredAndSortedPatients.length} patient{filteredAndSortedPatients.length > 1 ? "s" : ""}
            </p>
          </div>
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

        {/* Messages */}
        {!authLoading && !user && (
          <Card variant="glass" className="border-amber-200 bg-white">
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 rounded-full bg-amber-100 p-2">
                  <svg className="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-amber-900">Authentification requise</p>
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
          <Card variant="glass" className="border-red-200 bg-white">
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
          <Card variant="glass" className="border-teal-200 bg-white">
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
        <form onSubmit={handleCreatePatient} className="animate-slideInDown">
          <Card variant="default" padding="lg">
            <CardHeader>
              <CardTitle size="lg">Nouveau patient</CardTitle>
              <CardDescription>Remplissez les informations du patient</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Informations personnelles */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
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
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="birthDate">
                      Date de naissance
                    </label>
                    <input
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(event) => setBirthDate(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="sex">
                      Sexe
                    </label>
                    <select
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      id="sex"
                      value={sex}
                      onChange={(event) => setSex(event.target.value)}
                    >
                      <option value="">Non renseigné</option>
                      <option value="female">Femme</option>
                      <option value="male">Homme</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                  <Input
                    label="Téléphone"
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+33 6 00 00 00 00"
                    fullWidth
                  />
                </div>

                <Input
                  label="Email"
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="patient@email.fr"
                  fullWidth
                />

                <Textarea
                  label="Notes"
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Observations, remarques..."
                  rows={3}
                  fullWidth
                />

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-slate-200 bg-white p-3 transition-all hover:border-teal-300 hover:bg-teal-50/30">
                  <input
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-teal-600 transition focus:ring-2 focus:ring-teal-500"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    type="checkbox"
                  />
                  <span className="text-sm font-medium text-slate-700">Consentement obtenu</span>
                </label>
              </div>
            </CardContent>

            <CardFooter>
              <div className="flex items-center gap-3">
                <Button
                  disabled={status === "saving"}
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={status === "saving"}
                >
                  {status === "saving" ? "Enregistrement..." : "Ajouter"}
                </Button>
                <Button type="button" onClick={() => setShowForm(false)} variant="ghost" size="lg">
                  Annuler
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      )}

      {/* Search bar */}
      {!showForm && patients.length > 0 && (
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Rechercher par nom, email, téléphone, date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Patients table */}
      {status === "loading" ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
          <p className="mt-4 text-sm text-slate-600">Chargement des patients...</p>
        </div>
      ) : filteredAndSortedPatients.length === 0 && !searchQuery ? (
        <Card variant="glass" className="animate-scaleIn">
          <CardContent className="p-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Aucun patient</h3>
            <p className="mb-4 text-sm text-slate-600">Commencez par ajouter votre premier patient</p>
            <Button onClick={() => setShowForm(true)} variant="primary">
              Nouveau patient
            </Button>
          </CardContent>
        </Card>
      ) : filteredAndSortedPatients.length === 0 && searchQuery ? (
        <Card variant="glass">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-slate-600">Aucun patient trouvé pour &quot;{searchQuery}&quot;</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort("full_name")}
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900 transition"
                    >
                      Patient
                      {sortField === "full_name" && (
                        <svg className={`h-4 w-4 ${sortDirection === "desc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort("birth_date")}
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900 transition"
                    >
                      Âge
                      {sortField === "birth_date" && (
                        <svg className={`h-4 w-4 ${sortDirection === "desc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort("sex")}
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900 transition"
                    >
                      Sexe
                      {sortField === "sex" && (
                        <svg className={`h-4 w-4 ${sortDirection === "desc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Contact</span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort("created_at")}
                      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900 transition"
                    >
                      Création
                      {sortField === "created_at" && (
                        <svg className={`h-4 w-4 ${sortDirection === "desc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Statut</span>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedPatients.map((patient) => {
                  const age = calculateAge(patient.birth_date);
                  const avatarColor = getAvatarColor(patient.full_name);
                  const initials = getInitials(patient.full_name);

                  return (
                    <tr key={patient.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${avatarColor} text-sm font-semibold text-white`}>
                            {initials}
                          </div>
                          <div>
                            <Link href={`/patients/${patient.id}`} className="font-medium text-slate-900 hover:text-indigo-600 transition">
                              {patient.full_name}
                            </Link>
                            {patient.notes && (
                              <p className="text-xs text-slate-500 line-clamp-1">{patient.notes}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {age !== null ? `${age} ans` : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {patient.sex === "female" ? "F" : patient.sex === "male" ? "H" : "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div className="space-y-1">
                          {patient.email && (
                            <div className="flex items-center gap-1">
                              <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="text-xs">{patient.email}</span>
                            </div>
                          )}
                          {patient.phone && (
                            <div className="flex items-center gap-1">
                              <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span className="text-xs">{patient.phone}</span>
                            </div>
                          )}
                          {!patient.email && !patient.phone && "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(patient.created_at).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            patient.consent
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {patient.consent ? (
                            <>
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              OK
                            </>
                          ) : (
                            <>
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              Manquant
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/patients/${patient.id}`}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
                          >
                            Voir
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                          <button
                            onClick={() => handleDeletePatient(patient.id)}
                            disabled={deletingId === patient.id}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            {deletingId === patient.id ? (
                              <>
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                                Suppression...
                              </>
                            ) : (
                              <>
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Supprimer
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
