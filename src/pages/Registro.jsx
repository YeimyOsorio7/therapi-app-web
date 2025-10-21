// src/pages/Registro.jsx
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUser, getAllPacientes } from "../services/api";

// --- Nombres de usuario reservados (en minúsculas) ---
const RESERVED_USERNAMES = new Set(['psicologa', 'admin', 'administrador']);

// --- Componente Toast Simple ---
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    if (!message) return;
    
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // 5 segundos
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const baseStyle = "fixed top-5 right-5 z-50 p-4 rounded-lg shadow-lg text-white animate-fade-in-down";
  // Usaremos siempre el estilo de error para este mensaje específico
  const typeStyle = 'bg-rose-600';

  return (
    <div className={`${baseStyle} ${typeStyle}`}>
      <div className="flex items-center justify-between">
        {/* Mostramos solo el mensaje específico */}
        <span className="font-medium">{message}</span>
        <button onClick={onClose} className="ml-4 text-xl font-bold leading-none hover:opacity-70">&times;</button>
      </div>
    </div>
  );
};


export default function Registro() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    usuario: "",
    contrasenia: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(""); // Para OTROS mensajes generales <p>

  // --- Estados para Validación ---
  const [existingUsernames, setExistingUsernames] = useState(RESERVED_USERNAMES);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isUsernameTakenError, setIsUsernameTakenError] = useState(false); // Para controlar el borde rojo

  // --- Estado para la Notificación Toast ---
  const [toastNotification, setToastNotification] = useState({ message: "", type: "" });

  // 1. Cargar usuarios existentes (sin cambios)
  useEffect(() => {
    const fetchUsernames = async () => {
        try { /* ... (código igual que antes) ... */
            const data = await getAllPacientes();
            if (data && Array.isArray(data.patients)) {
            const apiUsernames = data.patients
                .map(p => (p.paciente?.nombre || p.usuario || "").toLowerCase())
                .filter(Boolean);
            setExistingUsernames(new Set([...apiUsernames, ...RESERVED_USERNAMES]));
            } else { setExistingUsernames(RESERVED_USERNAMES); }
        } catch (error) {
            console.error("Fallo al cargar la lista de usuarios:", error);
            setExistingUsernames(RESERVED_USERNAMES); // Mantiene los reservados
        }
    };
    fetchUsernames();
  }, []);

  // 3. Generar sugerencias (sin cambios)
  const generateSuggestions = useCallback((baseUsername) => { 
    const newSuggestions = [];
    const suffixes = [ Math.floor(10 + Math.random() * 90), `_${(new Date()).getFullYear().toString().slice(-2)}`, '1' ];
    for (const suffix of suffixes) {
        if (newSuggestions.length >= 3) break;
        const suggestion = `${baseUsername}${suffix}`;
        if (!existingUsernames.has(suggestion.toLowerCase())) { newSuggestions.push(suggestion); }
    }
    if (newSuggestions.length === 0) {
        let fallback = `${baseUsername}${Date.now() % 100}`; let i = 0;
        while(existingUsernames.has(fallback.toLowerCase()) && i < 5) { fallback = `${baseUsername}${Date.now() % 100 + i + 1}`; i++; }
        if (!existingUsernames.has(fallback.toLowerCase())) newSuggestions.push(fallback);
    }
    setSuggestions(newSuggestions.slice(0, 3));
  }, [existingUsernames]);

  // 2. Validar nombre de usuario (con debounce) -> Muestra error en Toast y activa borde
  useEffect(() => {
    if (!form.usuario.trim()) {
      setToastNotification({ message: "", type: "" });
      setSuggestions([]);
      setIsCheckingUsername(false);
      setIsUsernameTakenError(false); // Quita borde rojo
      return;
    }

    setIsCheckingUsername(true);
    setToastNotification({ message: "", type: "" });
    setSuggestions([]);
    setIsUsernameTakenError(false); // Quita borde rojo mientras verifica

    const debounceTimer = setTimeout(() => {
      const currentUsername = form.usuario.trim().toLowerCase();
      if (currentUsername.length > 0) {
          if (existingUsernames.has(currentUsername)) {
            // ✅ Muestra el error en el TOAST
            setToastNotification({ message: "Usuario ya existe, prueba con otro", type: "error" });
            setIsUsernameTakenError(true); // Activa borde rojo
            generateSuggestions(form.usuario.trim()); // Muestra sugerencias bajo el input
          } else {
            // No hay error
            setToastNotification({ message: "", type: "" });
            setIsUsernameTakenError(false); // Quita borde rojo
            setSuggestions([]);
          }
      } else {
          setToastNotification({ message: "", type: "" });
          setSuggestions([]);
          setIsUsernameTakenError(false); // Quita borde rojo
      }
      setIsCheckingUsername(false);
    }, 500);

    return () => clearTimeout(debounceTimer);

  }, [form.usuario, existingUsernames, generateSuggestions]);

  // Manejar cambios en inputs (Limpia toast y error al escribir en usuario)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setMsg("");
    setForm((s) => ({ ...s, [name]: value }));
    if (name === 'usuario') {
        setIsCheckingUsername(true);
        setToastNotification({ message: "", type: "" }); // Limpia toast
        setIsUsernameTakenError(false); // Quita borde rojo
        setSuggestions([]);
    }
  };

  // Manejar clic en sugerencia (Limpia toast y error)
  const handleSuggestionClick = (suggestion) => {
    setForm(prev => ({ ...prev, usuario: suggestion }));
    setToastNotification({ message: "", type: "" }); // Limpia toast
    setIsUsernameTakenError(false); // Quita borde rojo
    setSuggestions([]);
  };

  // Manejar envío del formulario -> Muestra error en Toast
  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    setToastNotification({ message: "", type: "" }); // Limpia toast

    // Prevenir envío si el nombre de usuario está marcado como ocupado o se está verificando
    if (isUsernameTakenError) {
       setToastNotification({ message: "Usuario ya existe, prueba con otro", type: "error" }); // Muestra toast de nuevo
      return;
    }
    if (isCheckingUsername) {
      setToastNotification({ message: "⏳ Espera a que termine la verificación", type: "error" });
      return;
    }
     // Verificación final
     if (existingUsernames.has(form.usuario.trim().toLowerCase())) {
        setToastNotification({ message: "Usuario ya existe, prueba con otro", type: "error" });
        setIsUsernameTakenError(true); // Activa borde rojo
        generateSuggestions(form.usuario.trim());
        return;
    }

    setLoading(true);
    try {
      const resp = await createUser({
        usuario: form.usuario.trim(),
        contrasenia: form.contrasenia,
        admin: false,
      });

      // Manejo de errores de la API
      if (resp && resp.success === false) {
        const errorText = typeof resp.error === "string" ? resp.error : JSON.stringify(resp.error);
        // ✅ Comprueba si el error es 'Usuario ya existe'
        if (errorText === "Usuario ya existe") {
            // Muestra el error específico en el TOAST
            setToastNotification({ message: "Usuario ya existe, prueba con otro", type: "error" });
            setIsUsernameTakenError(true); // Activa borde rojo
            generateSuggestions(form.usuario.trim()); // Muestra sugerencias
            setExistingUsernames(prev => new Set(prev).add(form.usuario.trim().toLowerCase())); // Actualiza localmente
        } else {
            // Muestra OTROS errores de API en el mensaje general <p>
            setMsg(`❌ ${errorText}`);
        }
        return; // Detiene el proceso
      }

      // Éxito
      navigate("/login", { replace: true, state: { justRegistered: true }, });
    } catch (err) { // Manejo de errores de red
        // ✅ Muestra errores de red en el mensaje general <p>, NO en el toast
      setMsg(`❌ Error al conectar con el servidor: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Deshabilitar botón (ahora comprueba isUsernameTakenError)
  const isSubmitDisabled = loading || isCheckingUsername || isUsernameTakenError || !form.usuario.trim() || !form.contrasenia;

  return (
    // Contenedor exterior original
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 to-teal-200 dark:from-gray-900 dark:to-gray-800 p-4 relative"> {/* relative para el toast */}

      {/* --- Componente Toast --- */}
      <Toast
        message={toastNotification.message}
        type={toastNotification.type}
        onClose={() => setToastNotification({ message: "", type: "" })}
      />

      {/* Contenedor del formulario original */}
      <div className="w-full max-w-md">
        <form
          onSubmit={onSubmit}
          className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl shadow-xl p-6 space-y-4 border border-gray-200 dark:border-gray-700"
        >
          <h2 className="text-2xl font-bold text-center text-indigo-600 dark:text-indigo-300">
            📝 Crear cuenta
          </h2>

          <div className="space-y-4">
            {/* Campo de Usuario */}
            <div>
              <label htmlFor="usuario-registro" className="block text-sm mb-1">Usuario</label>
              <input
                id="usuario-registro"
                name="usuario"
                type="text"
                value={form.usuario}
                onChange={handleChange}
                placeholder="Tu nombre de usuario"
                // Aplica borde rojo si isUsernameTakenError es true
                className={`w-full px-4 py-2 rounded-lg border ${isUsernameTakenError ? 'border-rose-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 ${isUsernameTakenError ? 'focus:ring-rose-500' : 'focus:ring-indigo-500'}`}
                required
                aria-invalid={isUsernameTakenError}
                aria-describedby="username-feedback"
              />
              {/* --- ÁREA DE FEEDBACK (Mantiene Sugerencias, elimina mensaje de error) --- */}
              <div id="username-feedback" className="mt-1 text-xs min-h-[24px]">
                {isCheckingUsername && <p className="text-sky-600 dark:text-sky-400">Verificando...</p>}
                {/* ❌ El error "Usuario ya existe" NO se muestra aquí, solo en el Toast */}
                {/* Muestra sugerencias si isUsernameTakenError es true */}
                {suggestions.length > 0 && isUsernameTakenError && !isCheckingUsername && (
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    <span className="text-gray-500 dark:text-gray-400">Sugerencias:</span>
                    {suggestions.map(s => (
                      <button key={s} type="button" onClick={() => handleSuggestionClick(s)} className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800/60 text-xs font-semibold">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                 {/* ❌ Eliminado el mensaje "✅ Disponible" */}
              </div>
            </div>

            {/* Campo de Contraseña (sin cambios) */}
            <div>
              <label htmlFor="contrasenia-registro" className="block text-sm mb-1">Contraseña</label>
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

          {/* Botón de Envío (sin cambios) */}
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creando..." : "Crear cuenta"}
          </button>

          {/* Mensaje General <p> (sin cambios, para OTROS errores) */}
          {msg && (
            <p className={`mt-2 text-sm text-center ${ msg.startsWith("❌") || msg.startsWith("⚠️") || msg.startsWith("⏳") ? "text-rose-600" : "text-green-600"}`}>
              {msg}
            </p>
          )}

          {/* Enlace a Iniciar Sesión (sin cambios) */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-300">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="font-semibold text-sky-600 dark:text-sky-300 hover:underline">
              Inicia sesión
            </Link>
          </div>
        </form>
      </div>

       {/* --- Estilos CSS para la animación del Toast (sin cambios) --- */}
       <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translate3d(0, -100%, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.4s ease-out forwards;
        }
       `}</style>
    </div>
  );
}