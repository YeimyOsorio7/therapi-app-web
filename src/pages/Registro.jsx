// src/pages/Registro.jsx
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUser /*, getAllPacientes*/ } from "../services/api";
import Header from "../components/Header";

// Toast simple reutilizable
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-5 right-5 z-[100] p-4 rounded-lg shadow-lg text-white bg-rose-600 animate-fade-in-down">
      <div className="flex items-center justify-between">
        <span className="font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-4 text-xl font-bold leading-none hover:opacity-70"
        >
          &times;
        </button>
      </div>
    </div>
  );
};

export default function Registro() {
  const navigate = useNavigate();

  // formulario
  const [form, setForm] = useState({
    usuario: "",
    contrasenia: "",
  });

  // estado UI
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [toastNotification, setToastNotification] = useState({ message: "" });

  // ⚠ Antes: tenías existingUsernames, isCheckingUsername, isUsernameTakenError
  // y todo el lio de validar disponible en "tiempo real".
  // Ya NO vamos a estar preguntando si existe mientras escribe.
  // Eso se quita para que no se bloquee "psicologa".

  // handleChange simple, sin marcar error mientras escribe
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setMsg("");
    setToastNotification({ message: "" });
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  // submit final
  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setToastNotification({ message: "" });

    // validaciones básicas locales
    if (!form.usuario.trim()) {
      setMsg("❌ El campo Usuario es obligatorio.");
      return;
    }
    if (!form.contrasenia.trim()) {
      setMsg("❌ La contraseña es obligatoria.");
      return;
    }

    setLoading(true);
    try {
      // intentamos crear el usuario directamente
      const resp = await createUser({
        usuario: form.usuario.trim().toLowerCase(), // normalizamos
        contrasenia: form.contrasenia,
        admin: false,
      });

      // Si la API responde algo como { success: false, error: "Usuario ya existe" }
      if (resp && resp.success === false) {
        const errTxt =
          typeof resp.error === "string"
            ? resp.error
            : JSON.stringify(resp.error);

        if (
          errTxt.toLowerCase().includes("usuario ya existe") ||
          errTxt.toLowerCase().includes("ya existe")
        ) {
          // Mostrar el toast rojo ARRIBA a la derecha SOLO ahora,
          // después de intentar crear, no antes.
          setToastNotification({
            message: "Usuario ya existe, prueba con otro",
          });
          // y ponemos el borde rojo visual en el input usuario con msg
          setMsg("❌ Usuario ya existe. Intente con otro nombre.");
        } else {
          setMsg(`❌ ${errTxt}`);
        }

        setLoading(false);
        return;
      }

      // si todo bien -> navegar al login con el banner de "cuenta creada"
      navigate("/login", {
        replace: true,
        state: { justRegistered: true },
      });
    } catch (err) {
      setMsg(
        `❌ Error al conectar: ${err?.message || String(err)}`
      );
      setLoading(false);
    }
  };

  // deshabilitar botón solo si está en loading o campos vacíos
  const isSubmitDisabled =
    loading || !form.usuario.trim() || !form.contrasenia.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-teal-200 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center relative">
      {/* Header fijo */}
      <Header />

      {/* Toast arriba derecha */}
      <Toast
        message={toastNotification.message}
        onClose={() => setToastNotification({ message: "" })}
      />

      {/* Contenido centrado */}
      <div className="flex-grow w-full flex items-center justify-center p-4 pt-24 md:pt-20">
        <div className="w-full max-w-md">
          <form
            onSubmit={onSubmit}
            className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl shadow-xl p-6 space-y-4 border border-gray-200 dark:border-gray-700"
          >
            <h2 className="text-2xl font-bold text-center text-indigo-600 dark:text-indigo-300 flex items-center gap-2 justify-center">
              <span role="img" aria-label="note">
                📝
              </span>
              <span>Crear cuenta</span>
            </h2>

            <div className="space-y-4">
              {/* Usuario */}
              <div>
                <label
                  htmlFor="usuario-registro"
                  className="block text-sm mb-1"
                >
                  Usuario
                </label>
                <input
                  id="usuario-registro"
                  name="usuario"
                  type="text"
                  value={form.usuario}
                  onChange={handleChange}
                  placeholder="Tu nombre de usuario"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    msg.startsWith("❌ Usuario ya existe")
                      ? "border-rose-500 focus:ring-rose-500"
                      : "border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
                  } bg-white dark:bg-gray-700 focus:outline-none focus:ring-2`}
                  required
                />
              </div>

              {/* Contraseña */}
              <div>
                <label
                  htmlFor="contrasenia-registro"
                  className="block text-sm mb-1"
                >
                  Contraseña
                </label>
                <input
                  id="contrasenia-registro"
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

            {/* Mensaje general debajo del form */}
            {msg && (
              <p
                className={`mt-2 text-sm text-center ${
                  msg.startsWith("❌")
                    ? "text-rose-600 dark:text-rose-400 font-medium"
                    : "text-gray-600 dark:text-gray-300"
                }`}
              >
                {msg}
              </p>
            )}

            {/* Botón submit */}
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creando..." : "Crear cuenta"}
            </button>

            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              ¿Ya tienes cuenta?{" "}
              <Link
                to="/login"
                className="text-sky-600 dark:text-sky-400 font-semibold hover:underline"
              >
                Inicia sesión
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
