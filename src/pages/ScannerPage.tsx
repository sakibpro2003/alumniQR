// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useZxing } from "react-zxing";
import { decryptEnvelope } from "../lib/secureQr";

export default function ScannerPage({ onRecordScan }) {
  const [scannerEnabled, setScannerEnabled] = useState(false);
  const [scannerStatus, setScannerStatus] = useState("Scanner idle");
  const [scanError, setScanError] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [lastRaw, setLastRaw] = useState("");
  const lastResetTimer = useRef(null);
  const [recordFeedback, setRecordFeedback] = useState(null);
  const feedbackClassMap = {
    success: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border border-amber-200 bg-amber-50 text-amber-700",
    error: "border border-rose-200 bg-rose-50 text-rose-600",
    info: "border border-slate-200 bg-slate-50 text-slate-600",
  };

  const recordScan = useCallback(
    async ({ envelope, data, issuedAt }) => {
      if (!onRecordScan || !data) {
        return;
      }

      let payloadIssuedAt = null;
      if (issuedAt !== undefined && issuedAt !== null) {
        const issuedDate =
          typeof issuedAt === "number" ? new Date(issuedAt) : new Date(issuedAt);
        if (!Number.isNaN(issuedDate.getTime())) {
          payloadIssuedAt = issuedDate.toISOString();
        }
      }
      if (!payloadIssuedAt) {
        payloadIssuedAt = new Date().toISOString();
      }

      setRecordFeedback({
        type: "info",
        message: "Recording guest check-in...",
      });

      try {
        const result = await onRecordScan({
          envelope,
          name: data.name ?? "",
          batch: data.batch ?? "",
          generatedBy: data.generatedBy ?? "",
          issuedAt: payloadIssuedAt,
        });

        if (result?.success) {
          setRecordFeedback({
            type: "success",
            message: result?.message || "Guest check-in recorded.",
          });
        } else if (result?.duplicate) {
          setRecordFeedback({
            type: "warning",
            message: result?.message || "Duplicate QR detected.",
          });
        } else {
          setRecordFeedback({
            type: "error",
            message:
              result?.message || "Failed to record guest check-in.",
          });
        }
      } catch (error) {
        setRecordFeedback({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to record guest check-in.",
        });
      }
    },
    [onRecordScan]
  );

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
        const enrichedResult = {
          issuedAt: payload?.issuedAt ?? null,
          raw: payload?.text ?? rawText,
          data: parsed,
          envelope: rawText,
        };
        setScanResult(enrichedResult);
        setScanError("");
        setScannerStatus("Encrypted QR detected");
        setScannerEnabled(false);

        if (parsed) {
          void recordScan({
            envelope: rawText,
            data: parsed,
            issuedAt: payload?.issuedAt ?? null,
          });
        } else {
          setRecordFeedback({
            type: "error",
            message:
              "QR contents could not be parsed. Unable to record this scan.",
          });
        }

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
    if (scannerEnabled) {
      setScannerStatus("Point the camera at an encrypted QR code.");
      return;
    }

    if (scanResult) {
      setScannerStatus("Scan captured. Scanner paused.");
    } else {
      setScannerStatus("Scanner idle");
      setScanError("");
      setLastRaw("");
    }
  }, [scannerEnabled, scanResult]);

  const issuedLabel = useMemo(() => {
    if (!scanResult?.issuedAt) {
      return null;
    }
    return new Date(scanResult.issuedAt).toLocaleString();
  }, [scanResult]);

  const isDuplicateScan = useMemo(
    () => recordFeedback?.type === "warning",
    [recordFeedback]
  );

  const invitationTheme = useMemo(
    () =>
      isDuplicateScan
        ? {
            container: "border-rose-200 bg-rose-50 text-rose-700",
            heading: "text-rose-700",
            label: "text-rose-600",
            value: "text-rose-800",
            inner: "border-rose-200 text-rose-800",
            raw: "border-rose-200 text-rose-800",
            issuedText: "text-rose-700/80",
            issuedHeading: "text-rose-700",
          }
        : {
            container: "border-emerald-200 bg-emerald-50 text-emerald-700",
            heading: "text-emerald-700",
            label: "text-emerald-600",
            value: "text-emerald-800",
            inner: "border-emerald-200 text-emerald-800",
            raw: "border-emerald-200 text-emerald-800",
            issuedText: "text-emerald-700/80",
            issuedHeading: "text-emerald-700",
          },
    [isDuplicateScan]
  );

  const startNewScan = useCallback(() => {
    setScanResult(null);
    setScanError("");
    setRecordFeedback(null);
    setLastRaw("");
    setScannerEnabled(true);
  }, []);

  const newScanReady = useMemo(
    () => Boolean(scanResult) && !scannerEnabled,
    [scanResult, scannerEnabled]
  );

  const handleScannerButtonClick = () => {
    if (newScanReady) {
      startNewScan();
      return;
    }

    setScannerEnabled((enabled) => {
      const next = !enabled;
      if (next) {
        setScanError("");
        setRecordFeedback(null);
        setLastRaw("");
      }
      return next;
    });
  };

  return (
    <div className="relative mx-auto w-full max-w-4xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
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

      <section className="relative mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-emerald-200/40 sm:p-8">
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
                onClick={handleScannerButtonClick}
                className={`inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-white ${
                  scannerEnabled
                    ? "bg-emerald-500 shadow-emerald-400/40 hover:brightness-105"
                    : "bg-emerald-400 shadow-emerald-300/40 hover:brightness-105"
                }`}
              >
                {newScanReady
                  ? "New scan"
                  : scannerEnabled
                  ? "Pause scanner"
                  : "Start secure scanner"}
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
                    {newScanReady
                      ? 'Scan captured. Tap "New scan" to continue.'
                      : 'Tap "Start secure scanner" to begin.'}
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
                <div
                  className={`grid gap-3 rounded-xl border p-4 text-sm ${invitationTheme.container}`}
                >
                  <h3
                    className={`text-base font-semibold ${invitationTheme.heading}`}
                  >
                    Invitation contents
                  </h3>
                  {scanResult.data ? (
                    <div
                      className={`grid gap-2 rounded-xl border bg-white/70 p-4 text-sm ${invitationTheme.inner}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <span
                          className={`text-xs uppercase tracking-wide ${invitationTheme.label}`}
                        >
                          Guest
                        </span>
                        <span
                          className={`text-base font-semibold ${invitationTheme.value}`}
                        >
                          {scanResult.data.name || "Unknown guest"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <span
                          className={`text-xs uppercase tracking-wide ${invitationTheme.label}`}
                        >
                          Batch
                        </span>
                        <span
                          className={`text-base font-semibold ${invitationTheme.value}`}
                        >
                          {scanResult.data.batch || "-"}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <span
                          className={`text-xs uppercase tracking-wide ${invitationTheme.label}`}
                        >
                          Generated by
                        </span>
                        <span
                          className={`text-base font-semibold ${invitationTheme.value}`}
                        >
                          {scanResult.data.generatedBy || "Unknown"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`rounded-xl border bg-white/70 p-3 font-mono text-xs ${invitationTheme.raw}`}
                    >
                      {scanResult.raw}
                    </div>
                  )}
                  {issuedLabel && (
                    <div className={`text-xs ${invitationTheme.issuedText}`}>
                      <span
                        className={`font-semibold uppercase tracking-wide ${invitationTheme.issuedHeading}`}
                      >
                        Issued
                      </span>
                      <div>{issuedLabel}</div>
                    </div>
                  )}
                </div>
              )}

              {recordFeedback && (
                <p
                  className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                    feedbackClassMap[recordFeedback.type] ?? feedbackClassMap.info
                  }`}
                >
                  {recordFeedback.message}
                </p>
              )}

              {!scanResult && !scanError && (
                <p className="text-xs text-slate-500">
                  Align the QR within the frame until the status changes.
                </p>
              )}
            </div>
          </div>
        </section>
    </div>
  );
}

