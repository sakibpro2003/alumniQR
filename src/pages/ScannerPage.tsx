// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useZxing } from "react-zxing";
import { decryptEnvelope } from "../lib/secureQr";

export default function ScannerPage() {
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [scannerStatus, setScannerStatus] = useState("Scanner idle");
  const [scanError, setScanError] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [lastRaw, setLastRaw] = useState("");
  const lastResetTimer = useRef(null);

  const { ref: scannerRef } = useZxing({
    paused: !scannerEnabled,
    timeBetweenDecodingAttempts: 150,
    constraints: {
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    onDecodeResult(result) {
      const rawText = result.getText();

      if (!rawText || rawText === lastRaw) {
        return;
      }

      setLastRaw(rawText);
      if (lastResetTimer.current) {
        clearTimeout(lastResetTimer.current);
      }

      try {
        const payload = decryptEnvelope(rawText);
        let parsed = null;
        if (payload?.text) {
          try {
            parsed = JSON.parse(payload.text);
          } catch {
            parsed = null;
          }
        }
        setScanResult({
          issuedAt: payload?.issuedAt ?? null,
          raw: payload?.text ?? rawText,
          data: parsed,
        });
        setScanError("");
        setScannerStatus("Encrypted QR detected");
        lastResetTimer.current = setTimeout(() => {
          setLastRaw("");
        }, 1500);
      } catch (error) {
        setScanResult(null);
        setScanError(
          error instanceof Error
            ? error.message
            : "Failed to decrypt the QR contents."
        );
        setScannerStatus("Waiting for a valid QR...");
        lastResetTimer.current = setTimeout(() => {
          setLastRaw("");
        }, 800);
      }
    },
    onDecodeError() {
      setScannerStatus("Scanning...");
    },
    onError(error) {
      console.error(error);
      setScannerStatus("Camera error. Please check permissions.");
    },
  });

  useEffect(() => {
    return () => {
      if (lastResetTimer.current) {
        clearTimeout(lastResetTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!scannerEnabled) {
      setScannerStatus("Scanner idle");
      setScanResult(null);
      setScanError("");
      setLastRaw("");
    } else {
      setScannerStatus("Point the camera at an encrypted QR code.");
    }
  }, [scannerEnabled]);

  const issuedLabel = useMemo(() => {
    if (!scanResult?.issuedAt) {
      return null;
    }
    return new Date(scanResult.issuedAt).toLocaleString();
  }, [scanResult]);

  const toggleScanner = () => {
    setScannerEnabled((enabled) => !enabled);
  };

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-10 sm:px-6 lg:px-10">
      <header className="text-center text-slate-900">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-500 shadow-sm shadow-emerald-100">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Live Scanner
        </div>
        <h1 className="mt-5 text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
          Validate invitations in seconds
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600">
          Activate the camera, present the encrypted QR, and reveal the invitation details instantly.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-emerald-200/40 sm:p-8">
          <div className="absolute -top-20 -right-14 h-40 w-40 rounded-full bg-emerald-200/50 blur-3xl" />
          <div className="relative flex h-full flex-col gap-6">
            <div className="flex flex-col gap-2 text-slate-900">
              <h2 className="text-xl font-semibold text-slate-900">
                Secure camera feed
              </h2>
              <p className="text-sm text-slate-500">
                Only QR codes created by this application can be decrypted here.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={toggleScanner}
                className={`inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-white ${
                  scannerEnabled
                    ? "bg-emerald-500 shadow-emerald-400/40 hover:brightness-105"
                    : "bg-emerald-400 shadow-emerald-300/40 hover:brightness-105"
                }`}
              >
                {scannerEnabled ? "Pause scanner" : "Start secure scanner"}
              </button>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                AES validation happens automatically
              </p>
            </div>

            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-950/80 shadow-inner shadow-slate-500/40">
              <video
                ref={scannerRef}
                className={`absolute inset-0 h-full w-full object-cover ${
                  scannerEnabled ? "opacity-100" : "opacity-30"
                }`}
                muted
              />
              {!scannerEnabled && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-sm text-slate-200">
                  <span className="rounded-full border border-white/20 bg-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    Scanner paused
                  </span>
                  <p className="max-w-[14rem] text-slate-100">
                    Tap “Start secure scanner” to begin.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  Status
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                    scannerEnabled
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      scannerEnabled ? "bg-emerald-500" : "bg-slate-500"
                    }`}
                  />
                  {scannerStatus}
                </span>
              </div>

              {scanError && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                  {scanError}
                </p>
              )}

              {scanResult && (
                <div className="grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                  <h3 className="text-base font-semibold text-emerald-700">
                    Invitation contents
                  </h3>
                  {scanResult.data ? (
                    <div className="grid gap-2 rounded-xl border border-emerald-200 bg-white/70 p-4 text-sm text-emerald-800">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs uppercase tracking-wide text-emerald-600">
                          Guest
                        </span>
                        <span className="text-base font-semibold text-emerald-800">
                          {scanResult.data.name || "Unknown guest"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs uppercase tracking-wide text-emerald-600">
                          Batch
                        </span>
                        <span className="text-base font-semibold text-emerald-800">
                          {scanResult.data.batch || "—"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-xs uppercase tracking-wide text-emerald-600">
                          Generated by
                        </span>
                        <span className="text-base font-semibold text-emerald-800">
                          {scanResult.data.generatedBy || "Unknown"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-emerald-200 bg-white/70 p-3 font-mono text-xs text-emerald-800">
                      {scanResult.raw}
                    </div>
                  )}
                  {issuedLabel && (
                    <div className="text-xs text-emerald-700/80">
                      <span className="font-semibold uppercase tracking-wide text-emerald-700">
                        Issued
                      </span>
                      <div>{issuedLabel}</div>
                    </div>
                  )}
                </div>
              )}

              {!scanResult && !scanError && (
                <p className="text-xs text-slate-500">
                  Align the QR within the frame until the status changes.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-indigo-200/40 sm:p-8">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Need to craft an invite?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Encrypted cards are issued from the generator after login. Share them digitally or print with confidence.
            </p>
          </div>
          <Link
            to="/gen"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-400/40 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-white sm:w-auto"
          >
            Go to generator
          </Link>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">
              Quick tips
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed">
              <li>— Ensure the QR is well-lit and within focus.</li>
              <li>— Hold steady for a second after detection.</li>
              <li>— The decrypted text displays immediately below.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
