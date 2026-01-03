import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 py-16">
        <header className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
              Epiderm-AI
            </div>
            <div className="flex items-center gap-3">
              <Link
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                href="/capture"
              >
                Tester
              </Link>
              <Link
                className="rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                href="/login"
              >
                Demarrer
              </Link>
            </div>
          </div>

          <div className="max-w-3xl space-y-4">
            <h1 className="text-3xl font-semibold sm:text-5xl">
              Epiderm‑AI, la plateforme clinique pour l’esthétique du visage.
            </h1>
            <p className="text-base text-slate-600 sm:text-lg">
              Photographier, analyser, puis projeter. Un parcours clair pour capturer les
              photos du patient, obtenir une analyse intelligente des zones faciales et
              dialoguer avec l’IA sur les traitements esthétiques.
            </p>
            <p className="text-sm text-slate-500">
              De la capture standardisee a la proposition de traitements, tout est structure
              pour accelerer la consultation et valoriser l’experience patient.
            </p>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "1. Photographier",
              text: "Capture guidee multi‑angles avec masque et controle qualite.",
            },
            {
              title: "2. Analyser",
              text: "Lecture automatique des zones du visage et synthese claire.",
            },
            {
              title: "3. Se projeter",
              text: "Dialogue IA + generation de propositions de traitements.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
            >
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-2 text-sm text-slate-600">{item.text}</p>
              <p className="mt-3 text-xs text-slate-500">
                Optimise le temps clinique et standardise les resultats.
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-6">
            <h2 className="text-lg font-semibold text-slate-900">
            Une plateforme construite pour la consultation esthétique
            </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3 text-sm text-slate-600">
              <p>
                Epiderm‑AI standardise la capture clinique et structure automatiquement le
                dossier patient. Chaque photo est guidee par un masque de cadrage pour
                garantir la reproductibilite. Les zones du visage sont ensuite analysees
                pour produire une synthese claire et exploitable.
              </p>
              <p>
                L IA vous accompagne dans la formulation des traitements, propose des textes
                pédagogiques pour le patient et facilite la projection des options esthétiques.
                Le praticien reste toujours decisionnaire : l IA est un support, pas une
                automatisation medicale.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Ce que vous gagnez
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>Un dossier patient clair, complet et exploitable.</li>
                <li>Des captures standardisees a chaque consultation.</li>
                <li>Des textes et recommandations coherents, en quelques secondes.</li>
                <li>Une experience patient valorisante et pedagogique.</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-900">Pourquoi Epiderm‑AI</h2>
          <p className="mt-2 text-sm text-slate-600">
            Standardisez la capture, gagnez du temps sur la synthese clinique et proposez
            des recommandations esthétiques claires et pédagogiques pour vos patients.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              "Moins de temps perdu a refaire des photos.",
              "Des comptes‑rendus coherents a chaque consultation.",
              "Une projection claire pour rassurer le patient.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600"
              >
                {item}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
