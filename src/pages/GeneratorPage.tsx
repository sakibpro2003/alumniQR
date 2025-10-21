// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { toPng } from "html-to-image";
import { Link } from "react-router-dom";
import { createEnvelope, decryptEnvelope } from "../lib/secureQr";

const INITIAL_INVITE = {
  name: "",
  batch: "",
};

export default function GeneratorPage({
  isAuthed,
  isLoading = false,
  onLogout,
  currentUser,
}) {
  const [invite, setInvite] = useState(INITIAL_INVITE);
  const [qrValue, setQrValue] = useState("");
  const [cardDetails, setCardDetails] = useState(INITIAL_INVITE);
  const [generatorError, setGeneratorError] = useState("");
  const [lastIssuedAt, setLastIssuedAt] = useState(null);
  const [downloadError, setDownloadError] = useState("");

  const cardRef = useRef(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  useEffect(() => {
    if (!isAuthed) {
      setInvite(INITIAL_INVITE);
      setQrValue("");
      setCardDetails(INITIAL_INVITE);
      setGeneratorError("");
      setLastIssuedAt(null);
      setDownloadError("");
    }
  }, [isAuthed]);

  const issuedLabel = useMemo(() => {
    if (!lastIssuedAt) return null;
    try {
      return new Date(lastIssuedAt).toLocaleString();
    } catch {
      return null;
    }
  }, [lastIssuedAt]);

  const invitationName = cardDetails.name?.trim() || "Guest";
  const invitationBatch = cardDetails.batch?.trim() || "Batch";
  const creatorName = currentUser?.username ?? "Unknown creator";

  const handleInviteChange = (field) => (event) => {
    setInvite((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleGenerate = async (event) => {
    event.preventDefault();
    setGeneratorError("");
    setDownloadError("");

    if (!currentUser) {
      setGeneratorError("Please log in to generate invitations.");
      return;
    }

    const payload = {
      ...invite,
      generatedBy: currentUser.username,
    };

    try {
      setGeneratingInvite(true);
      const envelope = createEnvelope(JSON.stringify(payload));
      const decrypted = decryptEnvelope(envelope);
      const issuedAtValue = decrypted?.issuedAt ?? Date.now();

      setQrValue(envelope);
      setCardDetails(payload);
      setLastIssuedAt(issuedAtValue);

    } catch (error) {
      setGeneratorError(
        error instanceof Error
          ? error.message
          : "Something went wrong while creating the QR code."
      );
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleDownloadCard = async () => {
    if (!cardRef.current) return;
    try {
      setDownloadError("");
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `secure-invitation-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : "Unable to prepare the invitation card."
      );
    }
  };

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-10 sm:px-6 lg:px-10">
      <header className="text-center text-slate-900">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 shadow-sm shadow-slate-200">
          <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
          Invitation Studio
        </div>
        <h1 className="mt-5 text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
          Generate encrypted invitation cards
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600">
          Design the invitation, seal the details with our built-in key, and share the QR-enabled card with confidence.
        </p>
      </header>

      {isAuthed && currentUser?.isAdmin && (
        <section className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-200/50 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-3 text-slate-900 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Team access
              </h2>
              <p className="text-sm text-slate-600">
                Approve new accounts and manage existing members from the
                dedicated dashboard.
              </p>
            </div>
            <Link
              to="/users"
              className="inline-flex items-center justify-center rounded-full border border-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-900 transition hover:bg-slate-900 hover:text-white"
            >
              Open user management
            </Link>
          </div>
        </section>
      )}

      {!isAuthed ? (
        <section className="mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-300/20">
          <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-6 py-5 text-left">
            <h2 className="text-xl font-semibold text-slate-900">Account required</h2>
            <p className="mt-1 text-sm text-slate-600">
              {isLoading
                ? "Checking your session, please wait..."
                : "Sign in or create an account to issue secure invitation QR codes."}
            </p>
          </div>
          {isLoading ? (
            <div className="px-6 py-6 text-sm font-semibold text-slate-600">
              Authenticating...
            </div>
          ) : (
            <div className="flex flex-col gap-3 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-500/30 transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-white"
              >
                Go to login
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-white"
              >
                Create account
              </Link>
            </div>
          )}
        </section>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40 sm:p-8">
            <div className="flex flex-col gap-6">
              <header className="flex flex-col gap-2 text-slate-900">
                <h2 className="text-xl font-semibold text-slate-900">
                  Invitation details
                </h2>
                <p className="text-sm text-slate-500">
                  Fill the essentials to personalise your invitation.
                </p>
              </header>

              <form onSubmit={handleGenerate} className="flex flex-col gap-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Guest name
                    <input
                      value={invite.name}
                      onChange={handleInviteChange("name")}
                      placeholder="e.g. Sakib Ahmed"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-white"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                    Batch
                    <input
                      value={invite.batch}
                      onChange={handleInviteChange("batch")}
                      placeholder="e.g. CSE 2003"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-white"
                      required
                    />
                  </label>
                </div>

                {generatorError && (
                  <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
                    {generatorError}
                  </p>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="submit"
                    disabled={generatingInvite}
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-400/40 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {generatingInvite ? "Generating..." : "Generate invitation QR"}
                  </button>

                  <button
                    type="button"
                    onClick={onLogout}
                    className="text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:text-slate-800"
                  >
                    Sign out
                  </button>
                </div>
              </form>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <div
              ref={cardRef}
              className="relative flex min-h-[220px] flex-col overflow-hidden rounded-[32px] border border-white/60 bg-gradient-to-br from-[#fff4ec] via-[#ffe8fa] to-[#eef4ff] p-6 text-[#2f1c52] shadow-[0_26px_58px_-26px_rgba(131,96,195,0.45)] sm:p-8 lg:flex-row lg:items-center lg:gap-10"
            >
              <div
                className="pointer-events-none absolute inset-x-0 -top-28 h-32 bg-gradient-to-b from-white/85 via-white/45 to-transparent"
                style={{ clipPath: "polygon(0 100%, 50% 0, 100% 100%)" }}
              />
              <div
                className="pointer-events-none absolute inset-x-6 bottom-0 h-14 rounded-t-[24px] bg-white/35"
                style={{ clipPath: "polygon(0 0, 100% 0, 90% 100%, 10% 100%)" }}
              />

              <div className="relative flex flex-1 flex-col justify-between gap-6">
                <div className="space-y-4">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-[#d64584] shadow-sm shadow-[#d64584]/20">
                    <span className="h-2 w-2 rounded-full bg-[#ff6f91]" />
                    Sealed Invitation
                  </span>
                  <h2 className="text-3xl font-semibold leading-tight text-[#1f1d40] sm:text-4xl">
                    Dear {invitationName},
                  </h2>
                  <p className="text-base font-medium text-[#3f3d56] sm:text-lg">
                    You're warmly invited. Present this envelope and the code beside it at the celebration entrance.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-[#7a62c5]">
                  <span>{invitationBatch}</span>
                  <span>Prepared by {creatorName}</span>
                  {issuedLabel && <span>{issuedLabel}</span>}
                </div>
              </div>

              <div className="relative mx-auto mt-6 flex shrink-0 flex-col items-center justify-center lg:mt-0">
                <div className="absolute -inset-9 rounded-[38px] bg-white/45 blur-[44px]" />
                <div className="relative rounded-[38px] border border-white/80 bg-white/95 p-6 shadow-2xl shadow-[#8360c3]/40">
                  <QRCodeCanvas
                    value={qrValue || "Invitation pending"}
                    size={340}
                    bgColor="#FFFFFF"
                    fgColor="#1f1d40"
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <p className="mt-3 text-center text-[11px] font-medium uppercase tracking-wide text-[#8360c3]">
                  Scan to reveal details
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-white/80 p-4 text-xs text-slate-600 shadow-lg shadow-slate-200/40 backdrop-blur">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-slate-700">
                  Invitation card{" "}
                  {qrValue ? "is ready." : isLoading ? "is loading..." : "will appear after you generate the QR."}
                </p>
                {qrValue && (
                  <button
                    type="button"
                    onClick={handleDownloadCard}
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-white shadow-lg shadow-slate-500/30 transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-white"
                  >
                    Download card (.png)
                  </button>
                )}
              </div>
              {downloadError && (
                <p className="text-xs font-semibold text-rose-600">{downloadError}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  AES encrypted QR
                </span>
                <span className="rounded-full border border-slate-200 px-3 py-1">
                  Share digitally or print
                </span>
                <Link
                  to="/scan"
                  className="rounded-full border border-slate-900 px-3 py-1 text-slate-900 transition hover:bg-slate-900 hover:text-white"
                >
                  Open scanner
                </Link>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
