"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";

import { supabaseBrowser } from "@/lib/supabase/client";

export default function AuthStatus() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabaseBrowser.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session ?? null);
        setLoading(false);
      }
    });

    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (isMounted) {
          setSession(nextSession);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    await supabaseBrowser.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex h-9 w-9 items-center justify-center">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

  if (!session) {
    return (
      <Link
        href="/login"
        className="rounded-lg border px-4 py-2 text-sm font-medium transition-all hover:shadow-md"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
      >
        Connexion
      </Link>
    );
  }

  const userEmail = session.user.email || "Utilisateur";
  const initials = userEmail.substring(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-2 sm:flex">
        <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)' }}>
          {initials}
        </div>
        <div className="hidden lg:block">
          <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>{userEmail}</p>
        </div>
      </div>
      <button
        className="rounded-lg border px-3 py-2 text-sm font-medium transition-all hover:shadow-md disabled:opacity-50"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--error)'
        }}
        onClick={handleLogout}
        disabled={isLoggingOut}
        type="button"
      >
        {isLoggingOut ? (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="hidden sm:inline">Déconnexion...</span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Déconnexion</span>
          </span>
        )}
      </button>
    </div>
  );
}
