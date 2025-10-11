// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const rawNew = localStorage.getItem("auth_user");
      const rawOld = localStorage.getItem("currentUser");
      const parsedNew = rawNew ? JSON.parse(rawNew) : null;
      const parsedOld = rawOld ? JSON.parse(rawOld) : null;
      return parsedNew || parsedOld || null;
    } catch {
      return null;
    }
  });

  const isUserAdmin = (u) =>
    !!u &&
    (u.admin === true ||
      String(u.usuario || u.user || "").toLowerCase() === "psicologa");

  useEffect(() => {
    try {
      if (user) {
        const serialized = JSON.stringify(user);
        localStorage.setItem("auth_user", serialized);
        localStorage.setItem("currentUser", serialized); // compat con código viejo
        localStorage.setItem("auth", "true");            // compat extra (si alguien mira esto)
      } else {
        localStorage.removeItem("auth_user");
        localStorage.removeItem("currentUser");
        localStorage.removeItem("auth");
      }
    } catch {}
  }, [user]);

  // puedes cambiar aquí el aterrizaje de psicóloga
  const routeFor = (u) => (isUserAdmin(u) ? "/admin/estadisticas" : "/chat");

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isAdmin: isUserAdmin(user),
      routeFor,
      login: (u) => setUser(u),
      logout: () => setUser(null),
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
