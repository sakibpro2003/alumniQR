import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center text-slate-800">
      <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
        404 — Page not found
      </div>
      <h1 className="text-3xl font-semibold text-slate-900">
        The page you requested is not available.
      </h1>
      <p className="max-w-xl text-sm leading-relaxed text-slate-600">
        Use the links below to return to a secure flow.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          to="/gen"
          className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-400/40 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-white"
        >
          Go to generator
        </Link>
        <Link
          to="/scan"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-md shadow-slate-200/60 transition hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-white"
        >
          Go to scanner
        </Link>
      </div>
    </div>
  );
}
