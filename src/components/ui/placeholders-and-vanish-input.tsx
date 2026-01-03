"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  placeholders: string[];
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  disabled?: boolean;
};

export function PlaceholdersAndVanishInput({
  placeholders,
  value,
  onChange,
  onSubmit,
  disabled,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [pulse, setPulse] = useState(false);

  const currentPlaceholder = useMemo(() => {
    if (placeholders.length === 0) {
      return "";
    }
    return placeholders[activeIndex % placeholders.length];
  }, [placeholders, activeIndex]);

  useEffect(() => {
    if (placeholders.length <= 1) {
      return;
    }
    const interval = setInterval(() => {
      setPulse(true);
      setActiveIndex((prev) => (prev + 1) % placeholders.length);
      setTimeout(() => setPulse(false), 220);
    }, 2800);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  return (
    <form
      onSubmit={onSubmit}
      className="relative w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm"
    >
      <div className="flex items-center gap-3 rounded-[1.1rem] bg-slate-900 p-[1px]">
        <div className="flex w-full items-center gap-3 rounded-[1rem] bg-white px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-slate-900 shadow-sm" />
          <input
            className={`w-full bg-transparent text-sm text-zinc-800 placeholder-zinc-400 outline-none transition ${
              pulse ? "translate-y-0.5 opacity-70" : ""
            }`}
            placeholder={currentPlaceholder}
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
          <button
            className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
            disabled={disabled}
            type="submit"
          >
            {disabled ? "Envoi..." : "Envoyer"}
          </button>
        </div>
      </div>
    </form>
  );
}
