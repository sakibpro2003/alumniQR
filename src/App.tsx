// @ts-nocheck
import { useCallback, useEffect, useState } from "react";
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
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminUsersPage from "./pages/AdminUsersPage";

const TOKEN_STORAGE_KEY = "qr-secure:token";
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

async function apiRequest(path, { method = "GET", body, token } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const errorPayload = await response.json();
      if (errorPayload?.message) {
        message = errorPayload.message;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function Navigation({ currentUser, onLogout }) {
  const linkClasses = ({ isActive }) =>
    [
      "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-semibold transition-colors duration-200",
      isActive
        ? "bg-slate-900 text-white shadow-lg shadow-slate-300/30"
        : "text-slate-600 hover:text-slate-900",
    ].join(" ");

  const authLinkClasses = ({ isActive }) =>
    [
      "inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide transition",
      isActive
        ? "bg-slate-900 text-white shadow-lg shadow-slate-300/30 border-slate-900"
        : "text-slate-600 hover:text-slate-900 hover:border-slate-300",
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
          {currentUser?.isAdmin && (
            <NavLink to="/users" className={linkClasses}>
              Users
            </NavLink>
          )}
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
            <>
              <NavLink to="/login" className={authLinkClasses}>
                Log in
              </NavLink>
              <NavLink to="/register" className={authLinkClasses}>
                Register
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function AuthGate({ isAuthed, checking, children }) {
  if (checking) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm font-semibold text-slate-500">
        Checking authentication...
      </div>
    );
  }

  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminGate({ currentUser, checking, children }) {
  if (checking) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm font-semibold text-slate-500">
        Checking administrator access...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!currentUser.isAdmin) {
    return <Navigate to="/gen" replace />;
  }

  return children;
}

export default function App() {
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [checkingAuth, setCheckingAuth] = useState(Boolean(token));

  const saveToken = useCallback((value) => {
    setToken(value);
    if (typeof window === "undefined") return;
    if (value) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, []);

  const loadUsers = useCallback(
    async (activeToken) => {
      const authToken = activeToken ?? token;
      if (!authToken) {
        setUsers([]);
        throw new Error("Authentication required.");
      }

      try {
        const result = await apiRequest("/api/users", {
          token: authToken,
        });
        setUsers(result.users ?? []);
        return result.users ?? [];
      } catch (error) {
        console.error("Failed to load users", error);
        throw error;
      }
    },
    [token]
  );

  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      setUsers([]);
      setCheckingAuth(false);
      return;
    }

    let cancelled = false;

    async function hydrate() {
      setCheckingAuth(true);
      try {
        const { user } = await apiRequest("/api/auth/me", { token });
        if (cancelled) return;
        setCurrentUser(user);
        if (user.isAdmin) {
          try {
            await loadUsers(token);
          } catch {
            setUsers([]);
          }
        } else {
          setUsers([]);
        }
      } catch (error) {
        console.error("Auth check failed", error);
        if (!cancelled) {
          saveToken(null);
          setCurrentUser(null);
          setUsers([]);
        }
      } finally {
        if (!cancelled) {
          setCheckingAuth(false);
        }
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [token, loadUsers, saveToken]);

  const handleLogin = useCallback(
    async (username, password) => {
      try {
        const { token: newToken, user } = await apiRequest("/api/auth/login", {
          method: "POST",
          body: { username, password },
        });
        saveToken(newToken);
        setCurrentUser(user);
        if (user.isAdmin) {
          try {
            await loadUsers(newToken);
          } catch {
            setUsers([]);
          }
        } else {
          setUsers([]);
        }
        return { success: true };
      } catch (error) {
        return { success: false, message: error.message || "Login failed." };
      }
    },
    [loadUsers, saveToken]
  );

  const handleRegister = useCallback(async (username, password) => {
    try {
      const response = await apiRequest("/api/auth/register", {
        method: "POST",
        body: { username, password },
      });
      return {
        success: true,
        message:
          response?.message ??
          "Account created. Await administrator approval before signing in.",
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || "Registration failed.",
      };
    }
  }, []);

  const handleLogout = useCallback(() => {
    saveToken(null);
    setCurrentUser(null);
    setUsers([]);
  }, [saveToken]);

  const handleCreateUser = useCallback(
    async ({ username, password, isAdmin = false, isValidated }) => {
      if (!token) {
        return { success: false, message: "Authentication required." };
      }
      try {
        const body = {
          username,
          password,
          isAdmin,
        };
        if (typeof isValidated === "boolean") {
          body.isValidated = isValidated;
        }
        const { user } = await apiRequest("/api/users", {
          method: "POST",
          body,
          token,
        });
        setUsers((prev) => [...prev, user]);
        return { success: true, message: "New user added." };
      } catch (error) {
        return {
          success: false,
          message: error.message || "Failed to add user.",
        };
      }
    },
    [token]
  );

  const handleToggleUserValidation = useCallback(
    async (userId, isValidated) => {
      if (!token) {
        return { success: false, message: "Authentication required." };
      }
      try {
        const { user } = await apiRequest(`/api/users/${userId}/validation`, {
          method: "PATCH",
          body: { isValidated },
          token,
        });
        setUsers((prev) =>
          prev.map((existing) =>
            existing.id === user.id ? user : existing
          )
        );
        return { success: true, user };
      } catch (error) {
        return {
          success: false,
          message: error.message || "Failed to update user.",
        };
      }
    },
    [token]
  );

  const handleReloadUsers = useCallback(async () => {
    await loadUsers();
  }, [loadUsers]);

  const handleRecordScan = useCallback(
    async ({ envelope, name, batch, generatedBy, issuedAt }) => {
      if (!token) {
        return {
          success: false,
          message: "Authentication required to track scans.",
        };
      }
      try {
        const response = await apiRequest("/api/guests", {
          method: "POST",
          body: {
            envelope,
            name,
            batch,
            generatedBy,
            issuedAt,
          },
          token,
        });
        return { success: true, guest: response.guest };
      } catch (error) {
        const duplicate =
          typeof error.message === "string" &&
          error.message.toLowerCase().includes("duplicate qr");
        return {
          success: false,
          duplicate,
          message: error.message || "Failed to record scan.",
        };
      }
    },
    [token]
  );

  const isAuthed = Boolean(currentUser);

  return (
    <BrowserRouter>
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#f5f7fb] via-white to-[#e8efff]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.18)_0%,_transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(16,185,129,0.15)_0%,_transparent_65%)]" />

        <div className="relative z-10 flex min-h-screen flex-col">
          <Navigation currentUser={currentUser} onLogout={handleLogout} />
          <main className="flex-1 pb-16">
            <Routes>
              <Route
                path="/gen"
                element={
                  <AuthGate isAuthed={isAuthed} checking={checkingAuth}>
                    <GeneratorPage
                      isAuthed={isAuthed}
                      isLoading={checkingAuth}
                      onLogout={handleLogout}
                      currentUser={currentUser}
                    />
                  </AuthGate>
                }
              />
              <Route
                path="/users"
                element={
                  <AdminGate
                    currentUser={currentUser}
                    checking={checkingAuth}
                  >
                    <AdminUsersPage
                      currentUser={currentUser}
                      users={users}
                      onCreateUser={handleCreateUser}
                      onToggleValidation={handleToggleUserValidation}
                      onReloadUsers={handleReloadUsers}
                    />
                  </AdminGate>
                }
              />
              <Route
                path="/scan"
                element={<ScannerPage onRecordScan={handleRecordScan} />}
              />
              <Route
                path="/login"
                element={
                  <LoginPage
                    isAuthed={isAuthed}
                    checkingAuth={checkingAuth}
                    onLogin={handleLogin}
                  />
                }
              />
              <Route
                path="/register"
                element={
                  <RegisterPage
                    isAuthed={isAuthed}
                    checkingAuth={checkingAuth}
                    onRegister={handleRegister}
                  />
                }
              />
              <Route
                path="/"
                element={
                  <Navigate to={isAuthed ? "/gen" : "/login"} replace />
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
