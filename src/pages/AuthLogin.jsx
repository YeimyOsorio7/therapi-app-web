import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Header from '../components/Header';
import { loginUser } from "../services/api"; // 👈 IMPORTAR llamada real a backend

export default function AuthLogin() {
  const navigate = useNavigate();
  const { login, routeFor } = useAuth();

  // --- Banner de éxito post-registro ---
  const location = useLocation();
  const [justRegistered, setJustRegistered] = useState(Boolean(location.state?.justRegistered));

  useEffect(() => {
    if (justRegistered) {
      const t = setTimeout(() => {
        setJustRegistered(false);
        navigate(location.pathname, { replace: true, state: {} });
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [justRegistered, navigate, location.pathname]);

  // --- Estado del login ---
  const [form, setForm] = useState({ user: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Manejar cambios en inputs
  const handleChange = (e) => {
    if (error) setError("");
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  // Enviar login REAL al backend
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.user.trim() || !form.password.trim()) {
      setError("❌ Por favor, completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      // 1. Llamamos al backend
      const resp = await loginUser({
        usuario: form.user.trim(),
        contrasenia: form.password.trim(),
      });

      // Esperamos algo tipo:
      // { success:true, user:{ user_id:'...', usuario:'...', admin:false, re_paciente:'...', fecha_creacion:'...' } }
      if (!resp || resp.success === false) {
        const msg = resp?.error || "Credenciales incorrectas";
        throw new Error(msg);
      }

      // Si el backend devuelve { success: true, user: {...} }
      // usamos resp.user; si devuelve directo {...}, usamos resp.
      const backendUser = resp.user || resp;

      // Validar que venga el identificador real
      // Este es EL ID que luego usaremos como user_id en NotasClinicas
      const finalUserObject = {
        id: backendUser.user_id || backendUser.id || backendUser.uid, // <-- clave interna única para ese paciente
        user_id: backendUser.user_id || backendUser.id || backendUser.uid, // redundante, para que sea explícito
        usuario: backendUser.usuario,
        admin: !!backendUser.admin,
        re_paciente: backendUser.re_paciente || null,
        fecha_creacion: backendUser.fecha_creacion || null,
      };

      if (!finalUserObject.user_id) {
        // Si NO viene user_id del backend, no podemos continuar porque luego NotasClinicas fallará
        throw new Error("No se recibió user_id del servidor.");
      }

      // 2. Guardamos al usuario en el contexto global
      login(finalUserObject);

      // 3. Redirigir según rol
      // routeFor() ya decide:
      //   admin / psicologa -> "/admin/estadisticas"
      //   normal -> "/chat"
      navigate(routeFor(finalUserObject), { replace: true });

    } catch (loginError) {
      console.error("Login failed:", loginError);
      setError(`❌ Error al iniciar sesión: ${loginError.message || "Intente de nuevo."}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-teal-200 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center">

      <Header />

      <div className="flex-grow w-full flex items-center justify-center p-4 pt-24 md:pt-20">
        <div className="w-full max-w-md">
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
                <label
                  htmlFor="user-login"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Usuario
                </label>
                <input
                  id="user-login"
                  name="user"
                  type="text"
                  placeholder="Ingresa tu usuario"
                  value={form.user}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border transition-all duration-200
                    ${error && !form.user.trim()
                      ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 dark:border-gray-600 focus:border-sky-500 focus:ring-sky-200"}
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-opacity-50`}
                  required
                  aria-invalid={!!error && !form.user.trim()}
                />
              </div>

              <div>
                <label
                  htmlFor="password-login"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Contraseña
                </label>
                <input
                  id="password-login"
                  name="password"
                  type="password"
                  placeholder="Ingresa tu contraseña"
                  value={form.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border transition-all duration-200
                    ${error && !form.password.trim()
                      ? "border-red-500 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 dark:border-gray-600 focus:border-sky-500 focus:ring-sky-200"}
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-opacity-50`}
                  required
                  aria-invalid={!!error && !form.password.trim()}
                />
              </div>
            </div>

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
              disabled={loading || !form.user.trim() || !form.password.trim()}
            >
              {loading ? "Iniciando..." : "Iniciar sesión"}
            </button>

            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
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

      <style>{`
        /* estilos extra si quieres */
      `}</style>
    </div>
  );
}
