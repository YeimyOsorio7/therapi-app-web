// src/routes/Guards.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function PrivateRoute({ children }) {
  const { user } = useAuth();

  // user debe existir para dejarlo pasar
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth();

  // si no hay sesión -> fuera
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // si hay sesión pero no es admin -> fuera
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
