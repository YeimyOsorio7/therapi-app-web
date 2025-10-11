// src/pages/Registro.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUser } from "../services/api";

export default function Registro() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    usuario: "",
    contrasenia: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleChange = (e) => {
    setMsg("");
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      // Por defecto, los registros públicos NO son admin
      const resp = await createUser({
        usuario: form.usuario.trim(),
        contrasenia: form.contrasenia,
        admin: false,
      });

      if (resp && resp.success === false) {
        const t =
          typeof resp.error === "string" ? resp.error : JSON.stringify(resp.error);
        setMsg(`❌ ${t}`);
        return;
      }

      // Redirigir al login con bandera de "justRegistered"
      navigate("/login", {
        replace: true,
        state: { justRegistered: true },
      });
    } catch (err) {
      setMsg(`❌ Error al crear cuenta: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 to-teal-200 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <form
          onSubmit={onSubmit}
          className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl shadow-xl p-6 space-y-4 border border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-2xl font-bold text-center text-indigo-600 dark:text-indigo-300">
            📝 Crear cuenta
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Usuario</label>
              <input
                name="usuario"
                type="text"
                value={form.usuario}
                onChange={handleChange}
                placeholder="Tu nombre de usuario"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Contraseña</label>
              <input
                name="contrasenia"
                type="password"
                value={form.contrasenia}
                onChange={handleChange}
                placeholder="Elige una contraseña segura"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-60"
          >
            {loading ? "Creando..." : "Crear cuenta"}
          </button>

          {msg && (
            <p
              className={`mt-2 text-sm text-center ${
                msg.startsWith("❌") ? "text-rose-600" : "text-green-600"
              }`}
            >
              {msg}
            </p>
          )}

          <div className="text-center text-sm text-gray-600 dark:text-gray-300">
            ¿Ya tienes cuenta?{" "}
            <Link
              to="/login"
              className="font-semibold text-sky-600 dark:text-sky-300 hover:underline"
            >
              Inicia sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
