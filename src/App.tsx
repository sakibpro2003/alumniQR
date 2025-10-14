// @ts-nocheck
// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import GeneratorPage from "./pages/GeneratorPage";
import ScannerPage from "./pages/ScannerPage";
import NotFoundPage from "./pages/NotFoundPage";

const ADMIN_USERNAME = "sakib2003";
const ADMIN_PASSWORD = "pass1517";
const AUTH_STORAGE_KEY = "qr-secure:auth-user";
const USERS_STORAGE_KEY = "qr-secure:users";

function Navigation({ currentUser, onLogout }) {
  const linkClasses = ({ isActive }) =>
    [
      "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-semibold transition-colors duration-200",
      isActive
        ? "bg-slate-900 text-white shadow-lg shadow-slate-300/30"
        : "text-slate-600 hover:text-slate-900",
    ].join(" ");

  return (
    <header className="sticky top-0 z-20 border-b border-transparent bg-white/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:flex-nowrap sm:gap-5 sm:px-6 lg:px-10">
        <Link
          to="/gen"
          className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl"
        >
          QR Secure
        </Link>

        <nav className="flex items-center gap-2">
          <NavLink to="/gen" className={linkClasses} end>
            Generate
          </NavLink>
          <NavLink to="/scan" className={linkClasses}>
            Scan
          </NavLink>
        </nav>

        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-600">
          {currentUser ? (
            <>
              <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {currentUser.username}
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Sign out
              </button>
            </>
          ) : (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-500">
              Login required to generate
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const [users, setUsers] = useState(() => {
    if (typeof window === "undefined") {
      return [];
    }
    try {
      const stored = window.localStorage.getItem(USERS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // noop
    }
    const defaults = [
      {
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD,
        isAdmin: true,
      },
    ];
    if (typeof window !== "undefined") {
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(defaults));
    }
    return defaults;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // noop
    }
    return null;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
  }, [users]);

  const handleLogin = (username, password) => {
    const candidate = users.find(
      (user) =>
        user.username.trim().toLowerCase() === username.trim().toLowerCase() &&
        user.password === password
    );

    if (candidate) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify(candidate)
        );
      }
      setCurrentUser(candidate);
      return true;
    }

    return false;
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setCurrentUser(null);
  };

  const handleCreateUser = (username, password, isAdmin = false) => {
    if (!currentUser?.isAdmin) {
      return { success: false, error: "Only admins can add users." };
    }

    if (!username || !password) {
      return { success: false, error: "Username and password are required." };
    }

    const exists = users.some(
      (user) => user.username.trim().toLowerCase() === username.trim().toLowerCase()
    );

    if (exists) {
      return { success: false, error: "This username already exists." };
    }

    const nextUsers = [
      ...users,
      { username: username.trim(), password, isAdmin },
    ];
    setUsers(nextUsers);
    return { success: true };
  };

  const isAuthed = Boolean(currentUser);

  const memoizedNav = useMemo(
    () => <Navigation currentUser={currentUser} onLogout={handleLogout} />,
    [currentUser]
  );

  return (
    <BrowserRouter>
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f5f7fb] via-white to-[#e8efff]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.18)_0%,_transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(16,185,129,0.15)_0%,_transparent_65%)]" />

        <div className="relative z-10 flex min-h-screen flex-col">
          {memoizedNav}
          <main className="flex-1 pb-16">
            <Routes>
              <Route
                path="/gen"
                element={
                  <GeneratorPage
                    isAuthed={isAuthed}
                    onLogin={handleLogin}
                    onLogout={handleLogout}
                    onCreateUser={handleCreateUser}
                    users={users}
                    currentUser={currentUser}
                  />
                }
              />
              <Route path="/scan" element={<ScannerPage />} />
              <Route path="/" element={<Navigate to="/gen" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
