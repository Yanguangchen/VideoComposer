"use client";

import type { FormEvent } from "react";
import { useId, useState } from "react";
import {
  SIMULATED_AUTH_PASSWORD,
  writeSimulatedSignedIn,
} from "@/lib/simulated-auth";

type Props = {
  onSuccess: () => void;
};

/** Stable synthetic username so password managers can save & autofill this site. */
const PERSISTED_USERNAME = "VideoComposer";

export function SignInModal({ onSuccess }: Props) {
  const titleId = useId();
  const usernameId = useId();
  const passwordId = useId();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== SIMULATED_AUTH_PASSWORD) {
      setError("Invalid password.");
      return;
    }
    writeSimulatedSignedIn(true);
    onSuccess();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm dark:bg-black/70"
      aria-modal="true"
      role="dialog"
      aria-labelledby={titleId}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <h2
          id={titleId}
          className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100"
        >
          Sign in
        </h2>

        <form
          autoComplete="on"
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-4"
        >
          {/*
            Hidden username pairs with password so browsers & password managers
            can store and autofill credentials (same pattern as password-only flows).
          */}
          <div className="sr-only">
            <label htmlFor={usernameId}>Account</label>
            <input
              id={usernameId}
              name="username"
              type="text"
              autoComplete="username"
              defaultValue={PERSISTED_USERNAME}
              tabIndex={-1}
            />
          </div>

          <label className="flex flex-col gap-1.5" htmlFor={passwordId}>
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Password
            </span>
            <input
              id={passwordId}
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
              required
            />
          </label>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
