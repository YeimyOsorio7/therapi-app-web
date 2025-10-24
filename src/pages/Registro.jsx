// src/pages/Registro.jsx
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUser, getAllPacientes } from "../services/api";
import Header from '../components/Header'; // ✅ 1. IMPORTA EL ENCABEZADO (Ajusta la ruta si es necesario)

// --- Nombres de usuario reservados ---
const RESERVED_USERNAMES = new Set(['psicologa', 'admin', 'administrador']);

// --- Componente Toast Simple ---
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => { onClose(); }, 5000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;
  const baseStyle = "fixed top-5 right-5 z-[100] p-4 rounded-lg shadow-lg text-white animate-fade-in-down"; // Increased z-index
  const typeStyle = 'bg-rose-600';
  return ( <div className={`${baseStyle} ${typeStyle}`}> <div className="flex items-center justify-between"> <span className="font-medium">{message}</span> <button onClick={onClose} className="ml-4 text-xl font-bold leading-none hover:opacity-70">&times;</button> </div> </div> );
};

export default function Registro() {
  const navigate = useNavigate();

  // --- Estados (sin cambios) ---
  const [form, setForm] = useState({ usuario: "", contrasenia: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [existingUsernames, setExistingUsernames] = useState(RESERVED_USERNAMES);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [isUsernameTakenError, setIsUsernameTakenError] = useState(false);
  const [toastNotification, setToastNotification] = useState({ message: "" });

  // --- useEffect y Funciones (fetchUsernames, generateSuggestions, useEffect[form.usuario], handleChange, handleSuggestionClick, onSubmit) ---
  // (Mantén toda la lógica de validación y envío exactamente como la tenías)
  // ... (código abreviado para brevedad) ...
  useEffect(() => { // Cargar usuarios
    const fetchUsernames = async () => { try { const data = await getAllPacientes(); if (data && Array.isArray(data.patients)) { const apiUsernames = data.patients.map(p=>(p.paciente?.nombre||p.usuario||"").toLowerCase()).filter(Boolean); setExistingUsernames(new Set([...apiUsernames, ...RESERVED_USERNAMES])); } else { setExistingUsernames(RESERVED_USERNAMES); } } catch (error) { console.error("Fallo carga usuarios:", error); setExistingUsernames(RESERVED_USERNAMES); } }; fetchUsernames();
  }, []);
  const generateSuggestions = useCallback((baseUsername) => { /* ... (código sin cambios) ... */ }, [existingUsernames]);
  useEffect(() => { // Validar usuario
      if (!form.usuario.trim()) { setToastNotification({message:""}); setSuggestions([]); setIsCheckingUsername(false); setIsUsernameTakenError(false); return; } setIsCheckingUsername(true); setToastNotification({message:""}); setSuggestions([]); setIsUsernameTakenError(false); const timer = setTimeout(()=>{ const current = form.usuario.trim().toLowerCase(); if(current.length>0){ if(existingUsernames.has(current)){ setToastNotification({message:"Usuario ya existe, prueba con otro"}); setIsUsernameTakenError(true); generateSuggestions(form.usuario.trim()); } else { setToastNotification({message:""}); setIsUsernameTakenError(false); setSuggestions([]); } } else { setToastNotification({message:""}); setSuggestions([]); setIsUsernameTakenError(false); } setIsCheckingUsername(false); }, 500); return ()=>clearTimeout(timer);
  }, [form.usuario, existingUsernames, generateSuggestions]);
  const handleChange = (e) => { const {name, value}=e.target; setMsg(""); setForm(s=>({...s,[name]:value})); if(name==='usuario'){ setIsCheckingUsername(true); setToastNotification({message:""}); setIsUsernameTakenError(false); setSuggestions([]); } };
  const handleSuggestionClick = (suggestion) => { setForm(p=>({...p,usuario:suggestion})); setToastNotification({message:""}); setIsUsernameTakenError(false); setSuggestions([]); };
  const onSubmit = async (e) => { /* ... (tu lógica onSubmit completa sin cambios) ... */
      e.preventDefault(); setMsg(""); setToastNotification({message:""}); if(isUsernameTakenError){ setToastNotification({message:"Usuario ya existe, prueba con otro"}); return; } if(isCheckingUsername){ setToastNotification({message:"⏳ Espera verificación"}); return; } if(existingUsernames.has(form.usuario.trim().toLowerCase())){ setToastNotification({message:"Usuario ya existe, prueba con otro"}); setIsUsernameTakenError(true); generateSuggestions(form.usuario.trim()); return; } setLoading(true); try { const resp = await createUser({usuario:form.usuario.trim(), contrasenia:form.contrasenia, admin:false}); if(resp && resp.success === false){ const errTxt = typeof resp.error === "string"?resp.error:JSON.stringify(resp.error); if(errTxt === "Usuario ya existe"){ setToastNotification({message:"Usuario ya existe, prueba con otro"}); setIsUsernameTakenError(true); generateSuggestions(form.usuario.trim()); setExistingUsernames(p=>new Set(p).add(form.usuario.trim().toLowerCase())); } else { setMsg(`❌ ${errTxt}`); } return; } navigate("/login", {replace:true, state:{justRegistered:true}}); } catch (err){ setMsg(`❌ Error al conectar: ${err?.message||String(err)}`); } finally { setLoading(false); }
  };
  const isSubmitDisabled = loading || isCheckingUsername || isUsernameTakenError || !form.usuario.trim() || !form.contrasenia;
  // ...

  return (
    // ✅ Contenedor principal ajustado para header fijo
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-teal-200 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center relative"> {/* relative para toast */}

      {/* ✅ 2. RENDERIZA EL ENCABEZADO AQUÍ */}
      <Header />

      {/* --- Componente Toast (igual que antes) --- */}
      <Toast
        message={toastNotification.message}
        onClose={() => setToastNotification({ message: "" })}
      />

      {/* ✅ Contenedor para centrar el formulario (con padding superior) */}
      <div className="flex-grow w-full flex items-center justify-center p-4 pt-24 md:pt-20"> {/* pt-24 o pt-20 para espacio */}
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
                  id="usuario-registro" name="usuario" type="text" value={form.usuario} onChange={handleChange} placeholder="Tu nombre de usuario"
                  className={`w-full px-4 py-2 rounded-lg border ${isUsernameTakenError ? 'border-rose-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 ${isUsernameTakenError ? 'focus:ring-rose-500' : 'focus:ring-indigo-500'}`}
                  required aria-invalid={isUsernameTakenError} aria-describedby="username-feedback"
                />
                {/* Área de Feedback (Verificando... y Sugerencias) */}
                <div id="username-feedback" className="mt-1 text-xs min-h-[24px]">
                  {isCheckingUsername && <p className="text-sky-600 dark:text-sky-400">Verificando...</p>}
                  {/* El error se muestra en el Toast */}
                  {/* Muestra sugerencias si hay error */}
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
                </div>
              </div>

              {/* Campo de Contraseña */}
              <div>
                <label htmlFor="contrasenia-registro" className="block text-sm mb-1">Contraseña</label>
                <input
                  id="contrasenia-registro" name="contrasenia" type="password" value={form.contrasenia} onChange={handleChange} placeholder="Elige una contraseña segura"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            {/* Botón de Envío */}
            <button type="submit" disabled={isSubmitDisabled}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creando..." : "Crear cuenta"}
            </button>

            {/* Mensaje General <p> (para otros errores) */}
            {msg && (
              <p className={`mt-2 text-sm text-center ${ msg.startsWith("❌") || msg.startsWith("⚠️") || msg.startsWith("⏳") ? "text-rose-600" : "text-green-600"}`}>
                {msg}
              </p>
            )}

            {/* Enlace a Iniciar Sesión */}
            <div className="text-center text-sm text-gray-600 dark:text-gray-300">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="font-semibold text-sky-600 dark:text-sky-300 hover:underline">
                Inicia sesión
              </Link>
            </div>
          </form>
        </div>
      </div>

       {/* --- Estilos CSS para Toast (igual que antes) --- */}
       <style>{`
        @keyframes fadeInDown { from { opacity: 0; transform: translate3d(0, -100%, 0); } to { opacity: 1; transform: translate3d(0, 0, 0); } }
        .animate-fade-in-down { animation: fadeInDown 0.4s ease-out forwards; }
       `}</style>
    </div>
  );
}