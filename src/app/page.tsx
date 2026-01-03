import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-20">
        {/* Hero Section */}
        <header className="flex flex-col items-center gap-6 text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-xl">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>

          <div className="flex flex-col gap-4">
            <div className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: 'var(--primary)' }}></span>
              Plateforme médicale professionnelle
            </div>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl" style={{ color: 'var(--foreground)' }}>
              EpidermAI
            </h1>

            <p className="mx-auto max-w-2xl text-lg leading-8" style={{ color: 'var(--text-secondary)' }}>
              Solution complète de capture clinique guidée, gestion de dossiers patients et génération automatique de rapports professionnels.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              className="rounded-xl px-6 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl"
              style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)' }}
              href="/login"
            >
              Commencer
            </Link>
            <Link
              className="rounded-xl border px-6 py-3 font-semibold transition-all hover:shadow-md"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              href="/patients"
            >
              Voir les patients
            </Link>
          </div>
        </header>

        {/* Features Grid */}
        <section className="grid gap-6 sm:grid-cols-3">
          <Link
            className="group rounded-3xl border p-8 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            href="/patients"
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl transition-all group-hover:scale-110" style={{ backgroundColor: 'var(--primary-light)' }}>
              <svg className="h-6 w-6" style={{ color: 'var(--primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
              Gestion Patients
            </h2>
            <p className="mt-2 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Créez et gérez les dossiers de vos patients avec un suivi complet et sécurisé.
            </p>
          </Link>

          <Link
            className="group rounded-3xl border p-8 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            href="/capture"
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl transition-all group-hover:scale-110" style={{ backgroundColor: 'var(--warning-light)' }}>
              <svg className="h-6 w-6" style={{ color: 'var(--warning)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
              Capture Guidée
            </h2>
            <p className="mt-2 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Interface intuitive pour capturer les photos selon des angles standardisés.
            </p>
          </Link>

          <Link
            className="group rounded-3xl border p-8 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
            href="/sessions"
          >
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl transition-all group-hover:scale-110" style={{ backgroundColor: 'var(--success-light)' }}>
              <svg className="h-6 w-6" style={{ color: 'var(--success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
              Séances Cliniques
            </h2>
            <p className="mt-2 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Organisez vos consultations, photos cliniques et notes de suivi par session.
            </p>
          </Link>
        </section>

        {/* Features List */}
        <section className="rounded-3xl border p-10 shadow-lg" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h3 className="mb-6 text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Fonctionnalités principales
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--success)' }}>
                <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--foreground)' }}>Authentification sécurisée</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Connexion par lien magique via Supabase</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--success)' }}>
                <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--foreground)' }}>Stockage cloud sécurisé</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Photos et données hébergées de manière confidentielle</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--success)' }}>
                <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--foreground)' }}>Interface responsive</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Compatible desktop, tablette et mobile</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: 'var(--success)' }}>
                <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--foreground)' }}>Protocoles standardisés</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Capture multi-angles pour un suivi précis</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
