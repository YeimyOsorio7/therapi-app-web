// src/pages/AuthLogin.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthLogin() {
  const navigate = useNavigate();
  const { login, routeFor } = useAuth();

  // --- banner de éxito si viene de /registro ---
  const location = useLocation();
  const [justRegistered, setJustRegistered] = useState(
    Boolean(location.state?.justRegistered)
  );

  useEffect(() => {
    if (justRegistered) {
      const t = setTimeout(() => {
        setJustRegistered(false);
        // limpiamos el state del history para que no reaparezca
        navigate(location.pathname, { replace: true, state: {} });
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [justRegistered, navigate, location.pathname]);

  // --- login (demo sin backend de verificación aún) ---
  const [form, setForm] = useState({ user: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    if (error) setError("");
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!form.user.trim() || !form.password.trim()) {
      setError("❌ Por favor, completa todos los campos");
      return;
    }

    // Regla: si el usuario es 'psicologa' => admin
    const isAdmin = form.user.trim().toLowerCase() === "psicologa";
    const userPayload = { usuario: form.user.trim(), admin: isAdmin };

    // Guardamos en el contexto (y localStorage por el provider)
    login(userPayload);

    // Redirigimos según rol
    navigate(routeFor(userPayload), { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 to-teal-200 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        {/* Aviso de éxito al volver de /registro */}
        {justRegistered && (
          <div className="mb-4 rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-green-700 shadow-sm flex items-center gap-2">
            <span>✅</span>
            <span>Cuenta creada con éxito. Ya puedes iniciar sesión.</span>
          </div>
        )}

        <form
          onSubmit={handleLogin}
          className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl shadow-xl p-6 space-y-4 border border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-2xl font-bold text-center text-sky-600 dark:text-sky-300">
            🔐 Iniciar sesión
          </h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="user"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Usuario
              </label>
              <input
                id="user"
                name="user"
                type="text"
                placeholder="Ingresa tu usuario"
                value={form.user}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border transition-all duration-200 
                  ${
                    error && !form.user.trim()
                      ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 dark:border-gray-600 focus:border-sky-500 focus:ring-sky-200"
                  } 
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                  focus:outline-none focus:ring-2 focus:ring-opacity-50`}
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={form.password}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border transition-all duration-200 
                  ${
                    error && !form.password.trim()
                      ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 dark:border-gray-600 focus:border-sky-500 focus:ring-sky-200"
                  } 
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                  focus:outline-none focus:ring-2 focus:ring-opacity-50`}
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-600 dark:text-red-400 text-sm text-center font-medium">
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-gray-400 disabled:cursor-not-allowed 
                     text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 
                     transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 
                     focus:ring-sky-500 focus:ring-opacity-50"
            disabled={!form.user.trim() || !form.password.trim()}
          >
            Iniciar sesión
          </button>

          <div className="text-center text-sm text-gray-600 dark:text-gray-300">
            ¿No tienes cuenta?{" "}
            <Link
              to="/registro"
              className="font-semibold text-indigo-600 dark:text-indigo-300 hover:underline"
            >
              Crear una
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
