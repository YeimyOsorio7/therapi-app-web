import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // restaura sesión del localStorage al montar
  useEffect(() => {
    const raw = localStorage.getItem("auth_user");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setUser(parsed);
      } catch {
        localStorage.removeItem("auth_user");
      }
    }
  }, []);

  // login: guardar usuario en estado y en localStorage
  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("auth_user", JSON.stringify(userData));
  };

  // logout: limpiar usuario
  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth_user");
  };

  // lógica para decidir si es admin / psicóloga
  const isUserAdmin = (u) =>
    !!u &&
    (u.admin === true ||
      String(u.usuario || u.user || "").toLowerCase() === "psicologa");

  // adónde mandamos al usuario después de login
  const routeFor = (u) =>
    isUserAdmin(u) ? "/admin/estadisticas" : "/chat";

  // esto es lo que usan PrivateRoute / AdminRoute
  const isAuthenticated = !!user;
  const isAdmin = isUserAdmin(user);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated,
        isAdmin,
        routeFor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
