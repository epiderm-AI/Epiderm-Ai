"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

type AuthMode = "password" | "magic";

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<AuthMode>("password");
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }: { data: any }) => {
      if (data.session) {
        router.replace("/patients");
      }
    });
  }, [router]);

  async function handleMagicLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    const { error } = await supabaseBrowser.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Lien envoye. Verifie ta boite mail.");
  }

  async function handlePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    if (isSignup) {
      const { error } = await supabaseBrowser.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      setStatus("sent");
      setMessage("Compte cree. Verifie ta boite mail si requis.");
      return;
    }

    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Connexion reussie.");
    router.replace("/patients");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center gap-6">
      <header className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Connexion praticien
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Mot de passe ou lien magique.
        </p>
      </header>

      <div className="flex items-center justify-center gap-2">
        <button
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            authMode === "password"
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 text-zinc-600"
          }`}
          onClick={() => setAuthMode("password")}
          type="button"
        >
          Mot de passe
        </button>
        <button
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            authMode === "magic"
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 text-zinc-600"
          }`}
          onClick={() => setAuthMode("magic")}
          type="button"
        >
          Lien magique
        </button>
      </div>

      {authMode === "password" ? (
        <form
          className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          onSubmit={handlePassword}
        >
          <label className="text-sm font-medium text-zinc-700" htmlFor="email">
            Email
          </label>
          <input
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            id="email"
            name="email"
            placeholder="nom@cabinet.fr"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
          <label className="text-sm font-medium text-zinc-700" htmlFor="password">
            Mot de passe
          </label>
          <input
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            id="password"
            name="password"
            placeholder="********"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
          <button
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            disabled={status === "sending"}
            type="submit"
          >
            {status === "sending"
              ? "Envoi..."
              : isSignup
                ? "Creer le compte"
                : "Se connecter"}
          </button>
          <button
            className="text-sm text-zinc-600 hover:text-zinc-900"
            onClick={() => setIsSignup((prev) => !prev)}
            type="button"
          >
            {isSignup
              ? "Deja un compte ? Se connecter"
              : "Pas de compte ? Creer un compte"}
          </button>
          {message ? (
            <p
              className={`text-sm ${
                status === "error" ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {message}
            </p>
          ) : null}
        </form>
      ) : (
        <form
          className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          onSubmit={handleMagicLink}
        >
          <label className="text-sm font-medium text-zinc-700" htmlFor="email">
            Email
          </label>
          <input
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            id="email"
            name="email"
            placeholder="nom@cabinet.fr"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
          <button
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            disabled={status === "sending"}
            type="submit"
          >
            {status === "sending" ? "Envoi..." : "Recevoir le lien"}
          </button>
          {message ? (
            <p
              className={`text-sm ${
                status === "error" ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {message}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
