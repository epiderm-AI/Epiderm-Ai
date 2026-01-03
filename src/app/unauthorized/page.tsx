import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-lg flex-col items-center justify-center gap-8 px-4 text-center">
      <div className="rounded-full p-4" style={{ backgroundColor: 'var(--error-light)' }}>
        <svg className="h-16 w-16" style={{ color: 'var(--error)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
          Accès refusé
        </h1>
        <p className="text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Votre compte ne dispose pas des autorisations nécessaires pour accéder à cette section de l'application.
        </p>
      </div>

      <div className="rounded-2xl border p-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
          Besoin d'accès ?
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Contactez votre administrateur pour obtenir les droits requis (rôle praticien, owner ou cabinet).
        </p>
      </div>

      <Link
        href="/login"
        className="rounded-xl px-6 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl"
        style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)' }}
      >
        Retour à la connexion
      </Link>
    </div>
  );
}
