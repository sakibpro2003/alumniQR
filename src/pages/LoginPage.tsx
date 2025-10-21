// @ts-nocheck
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

export default function LoginPage({ isAuthed, checkingAuth, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  if (checkingAuth) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 text-sm font-semibold text-slate-600">
        Checking your session...
      </div>
    );
  }

  if (isAuthed) {
    return <Navigate to="/gen" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const result = await onLogin(username.trim(), password);
      if (!result?.success) {
        setError(result?.message || "Unable to sign in.");
        return;
      }
      setUsername("");
      setPassword("");
      navigate("/gen", { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-10">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-300/20">
        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-6 py-6 text-left sm:px-8 sm:py-8">
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
            Welcome back
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            Enter your credentials to access the encrypted invitation studio.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-6 sm:px-8 sm:py-8">
          <label className="flex flex-col gap-1 text-left text-sm font-medium text-slate-700">
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-white"
              autoComplete="username"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-left text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-white"
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-400/40 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 text-sm text-slate-600 sm:px-8">
          <span>Need an account? </span>
          <Link
            to="/register"
            className="font-semibold text-indigo-600 transition hover:text-indigo-500"
          >
            Create one
          </Link>
        </div>
      </section>
    </div>
  );
}
