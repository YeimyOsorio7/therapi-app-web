import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from '../components/Header'; // ✅ 1. IMPORTA EL ENCABEZADO (Ajusta la ruta si es necesario)

export default function AuthLogin() {
  const navigate = useNavigate();
  const { login, routeFor } = useAuth();

  // --- Banner de éxito ---
  const location = useLocation();
  const [justRegistered, setJustRegistered] = useState(
    Boolean(location.state?.justRegistered)
  );

  useEffect(() => {
    if (justRegistered) {
      const t = setTimeout(() => {
        setJustRegistered(false);
        navigate(location.pathname, { replace: true, state: {} });
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [justRegistered, navigate, location.pathname]);

  // --- Lógica de Login ---
  const [form, setForm] = useState({ user: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // Añadido estado de carga

  const handleChange = (e) => {
    if (error) setError("");
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError(""); // Limpia error previo
    if (!form.user.trim() || !form.password.trim()) {
      setError("❌ Por favor, completa todos los campos");
      return;
    }

    setLoading(true); // Inicia carga

    // Simula una llamada a API (o llama a tu función real de login)
    // Reemplaza esto con tu llamada a `loginUser` si la tienes en api.js
    setTimeout(() => {
        try {
          // Regla: si el usuario es 'psicologa' => admin
          const isAdmin = form.user.trim().toLowerCase() === "psicologa";
          // Simula creación de payload de usuario (ajusta según tu AuthContext)
          const userPayload = {
              id: isAdmin ? 'admin-123' : `user-${Date.now()}`, // Simula un ID
              usuario: form.user.trim(),
              admin: isAdmin
          };

          // Guardamos en el contexto
          login(userPayload);

          // Redirigimos según rol
          navigate(routeFor(userPayload), { replace: true });

        } catch (loginError) {
             console.error("Login failed:", loginError);
             setError(`❌ Error al iniciar sesión: ${loginError.message || 'Intenta de nuevo.'}`);
             setLoading(false); // Detiene carga en error
        }
      // No necesitamos setLoading(false) en caso de éxito porque navegamos fuera
    }, 500); // Simula retraso de red
  };

  return (
    // Contenedor principal de la página, ajustado para header fijo
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-teal-200 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center"> {/* Cambiado a flex-col */}

      {/* ✅ 2. RENDERIZA EL ENCABEZADO AQUÍ */}
      <Header />

      {/* Contenedor para centrar el formulario (con padding superior) */}
      <div className="flex-grow w-full flex items-center justify-center p-4 pt-24 md:pt-20"> {/* Aumentado pt para header */}
        <div className="w-full max-w-md">
          {/* Aviso de éxito */}
          {justRegistered && (
            <div className="mb-4 rounded-xl border border-green-300 bg-green-50 dark:bg-green-900/30 px-4 py-3 text-green-700 dark:text-green-300 shadow-sm flex items-center gap-2">
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
                <label htmlFor="user-login" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Usuario
                </label>
                <input
                  id="user-login" // ID único
                  name="user"
                  type="text"
                  placeholder="Ingresa tu usuario"
                  value={form.user}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border transition-all duration-200
                    ${error && !form.user.trim() ? "border-red-500 focus:border-red-500 focus:ring-red-200" : "border-gray-300 dark:border-gray-600 focus:border-sky-500 focus:ring-sky-200"}
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-opacity-50`}
                  required
                  aria-invalid={!!error && !form.user.trim()} // Indica error si aplica
                />
              </div>

              <div>
                <label htmlFor="password-login" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contraseña
                </label>
                <input
                  id="password-login" // ID único
                  name="password"
                  type="password"
                  placeholder="Ingresa tu contraseña"
                  value={form.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border transition-all duration-200
                    ${error && !form.password.trim() ? "border-red-500 focus:border-red-500 focus:ring-red-200" : "border-gray-300 dark:border-gray-600 focus:border-sky-500 focus:ring-sky-200"}
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-opacity-50`}
                  required
                   aria-invalid={!!error && !form.password.trim()} // Indica error si aplica
                />
              </div>
            </div>

            {/* Mensaje de Error Estilizado */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-3 mt-2">
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
              disabled={loading || !form.user.trim() || !form.password.trim()} // Deshabilita si está cargando o campos vacíos
            >
              {loading ? "Iniciando..." : "Iniciar sesión"}
            </button>

            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              ¿No tienes cuenta?{" "}
              <Link
                // Asegúrate que la ruta sea '/registro' si así está en tu router (main.jsx)
                to="/registro"
                className="font-semibold text-indigo-600 dark:text-indigo-300 hover:underline"
              >
                Crear una
              </Link>
            </div>
          </form>
        </div>
      </div>
       {/* Estilos básicos (mover a CSS global) */}
       <style>{`
          /* Añade estilos para form-label, form-input si no usas Tailwind */
       `}</style>
    </div>
  );
}