// @ts-nocheck
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const INITIAL_USER_FORM = {
  username: "",
  password: "",
  isAdmin: false,
  isValidated: false,
};

function StatusBadge({ label, tone = "slate" }) {
  const styles = {
    slate:
      "border-slate-200 bg-slate-50 text-slate-600 shadow-slate-200/40",
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-600 shadow-emerald-200/40",
    amber: "border-amber-200 bg-amber-50 text-amber-600 shadow-amber-200/40",
    violet:
      "border-violet-200 bg-violet-50 text-violet-600 shadow-violet-200/40",
  };

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide shadow",
        styles[tone] ?? styles.slate,
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function UserList({
  users,
  onToggleValidation,
  busyUserId,
  onReload,
  reloading,
}) {
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (a.isAdmin && !b.isAdmin) return -1;
      if (!a.isAdmin && b.isAdmin) return 1;
      if (a.isValidated && !b.isValidated) return -1;
      if (!a.isValidated && b.isValidated) return 1;
      return (a.username ?? "").localeCompare(b.username ?? "");
    });
  }, [users]);

  if (!sortedUsers.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-10 text-center shadow-inner shadow-slate-200/60">
        <p className="text-sm font-semibold text-slate-600">
          No users found yet.
        </p>
        <button
          type="button"
          onClick={onReload}
          disabled={reloading}
          className="inline-flex items-center justify-center rounded-full border border-slate-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-900 transition hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {reloading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">
          {sortedUsers.length} user{sortedUsers.length === 1 ? "" : "s"}
        </h3>
        <button
          type="button"
          onClick={onReload}
          disabled={reloading}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {reloading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <ul className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white/80 shadow-lg shadow-slate-200/40">
        {sortedUsers.map((user) => {
          const isBusy = busyUserId === user.id;
          const approved = Boolean(user.isValidated);
          return (
            <li
              key={user.id ?? user.username}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6"
            >
              <div className="flex flex-1 flex-col gap-1 text-sm text-slate-700">
                <span className="text-base font-semibold text-slate-900">
                  {user.username}
                </span>
                <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-slate-500">
                  {user.isAdmin ? (
                    <StatusBadge label="Admin" tone="violet" />
                  ) : (
                    <StatusBadge label="Member" tone="slate" />
                  )}
                  {approved ? (
                    <StatusBadge label="Validated" tone="emerald" />
                  ) : (
                    <StatusBadge label="Pending approval" tone="amber" />
                  )}
                </div>
              </div>

              {!user.isAdmin && (
                <button
                  type="button"
                  onClick={() => onToggleValidation(user, !approved)}
                  disabled={isBusy}
                  className={[
                    "inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white",
                    approved
                      ? "border border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 focus:ring-amber-200"
                      : "border border-emerald-200 bg-emerald-500 text-white hover:border-emerald-400 hover:bg-emerald-600 focus:ring-emerald-200",
                    isBusy ? "cursor-not-allowed opacity-60" : "",
                  ].join(" ")}
                >
                  {isBusy
                    ? "Saving..."
                    : approved
                    ? "Mark as pending"
                    : "Approve user"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function AdminUsersPage({
  currentUser,
  users,
  onCreateUser,
  onToggleValidation,
  onReloadUsers,
}) {
  const [form, setForm] = useState(INITIAL_USER_FORM);
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [targetUser, setTargetUser] = useState(null);
  const [reloading, setReloading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (creating) return;
    setFeedback(null);

    if (!form.username.trim() || !form.password) {
      setFeedback({
        type: "error",
        message: "Username and password are required.",
      });
      return;
    }

    setCreating(true);
    try {
      const result = await onCreateUser({
        username: form.username.trim(),
        password: form.password,
        isAdmin: form.isAdmin,
        isValidated: form.isValidated,
      });
      if (!result?.success) {
        setFeedback({
          type: "error",
          message: result?.message || "Unable to create user.",
        });
        return;
      }
      setFeedback({
        type: "success",
        message: result?.message || "New user created.",
      });
      setForm(INITIAL_USER_FORM);
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong while creating the user.",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleValidation = async (user, nextState) => {
    if (!user?.id) return;
    setTargetUser(user.id);
    setFeedback(null);
    try {
      const result = await onToggleValidation(user.id, nextState);
      if (!result?.success) {
        setFeedback({
          type: "error",
          message: result?.message || "Unable to update user.",
        });
        return;
      }
      setFeedback({
        type: "success",
        message: `User ${nextState ? "approved" : "set to pending"}.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to update user status.",
      });
    } finally {
      setTargetUser(null);
    }
  };

  const handleReloadUsers = async () => {
    if (reloading) return;
    setReloading(true);
    setFeedback(null);
    try {
      await onReloadUsers();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to refresh users right now.",
      });
    } finally {
      setReloading(false);
    }
  };

  return (
    <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-10">
      <section className="rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-300/20">
        <div className="flex flex-col gap-6 border-b border-slate-100 bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
              Manage users
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Approve new team members, promote additional administrators, and
              keep your QR invitation workflow secure.
            </p>
          </div>
          <Link
            to="/gen"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            Back to generator
          </Link>
        </div>

        <div className="flex flex-col gap-8 px-6 py-6 sm:px-8 sm:py-8">
          <div className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-5 shadow-inner shadow-slate-200/50">
            <p className="text-sm font-medium text-slate-700">
              Signed in as{" "}
              <span className="font-semibold text-slate-900">
                {currentUser?.username ?? "Unknown admin"}
              </span>
              .
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
              Administrator access granted
            </p>
          </div>

          <section className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-lg shadow-slate-200/40">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Add a team member
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Create a new account for your team. Approvals can be toggled
                here whenever you are ready.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Username
                <input
                  value={form.username}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      username: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-white"
                  autoComplete="off"
                  required
                />
              </label>

              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Temporary password
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-white"
                  autoComplete="new-password"
                  required
                />
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isAdmin}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      isAdmin: event.target.checked,
                      isValidated: event.target.checked
                        ? true
                        : prev.isValidated,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Grant administrator access
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isValidated}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      isValidated: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  disabled={form.isAdmin}
                />
                Approve immediately
                <span className="text-xs font-normal uppercase tracking-wide text-slate-500">
                  {form.isAdmin
                    ? "Administrators are approved automatically."
                    : "Uncheck to keep the user pending."}
                </span>
              </label>

              {feedback && (
                <div className="sm:col-span-2">
                  <p
                    className={[
                      "rounded-xl border px-3 py-2 text-sm font-semibold",
                      feedback.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-600",
                    ].join(" ")}
                  >
                    {feedback.message}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-lg shadow-slate-500/30 transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? "Creating..." : "Create user"}
                </button>
                <p className="text-xs text-slate-500">
                  Share the temporary password securely with the teammate.
                </p>
              </div>
            </form>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Pending approvals
            </h2>
            <UserList
              users={users}
              onToggleValidation={handleToggleValidation}
              busyUserId={targetUser}
              onReload={handleReloadUsers}
              reloading={reloading}
            />
          </section>
        </div>
      </section>
    </div>
  );
}
