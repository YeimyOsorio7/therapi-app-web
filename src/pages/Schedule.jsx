// src/pages/Schedule.jsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
// ❌ Removed unused ThemeToggle import
// import ThemeToggle from './ThemeToggle';
import { crearCita, listarCitas } from '../services/api';
import { useAuth } from '../context/AuthContext'; // To get the user ID

/* ================ Utils ================ */

// Helper to combine Date and Time into ISO 8601 string (UTC)
function combineDateTimeISO(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  try {
    // Creates date in local timezone based on input, then converts to ISO (UTC)
    const localDate = new Date(`${dateStr}T${timeStr}:00`);
    if (isNaN(localDate.getTime())) return null; // Invalid date/time input
    return localDate.toISOString(); // e.g., "2025-10-25T14:30:00.000Z"
  } catch {
    return null; // Handle potential errors during date creation
  }
}

// Helper to parse ISO string back to local date/time for display
const parseISOToLocal = (isoString) => {
  if (!isoString) return { fecha: 'N/A', hora: 'N/A' };
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) throw new Error("Invalid date");
    // Format date as YYYY-MM-DD
    const fecha = date.toISOString().split('T')[0];
    // Format time as HH:MM in local timezone
    const hora = date.toLocaleTimeString('en-GB', { // 'en-GB' typically gives HH:MM format
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // Use 24-hour format
     });
    return { fecha, hora };
  } catch (e) {
    console.warn("Could not parse ISO date:", isoString, e);
    return { fecha: 'Fecha Inválida', hora: 'N/A' };
  }
};


// Badge for appointment status (no changes needed)
const EstadoBadge = ({ estado }) => {
  const e = (estado || '').toLowerCase();
  const cls =
    e === 'pendiente' ? 'bg-amber-100 text-amber-800 dark:bg-amber-600/50 dark:text-amber-100' :
    e === 'atendida'  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-600/50 dark:text-emerald-100' :
    e === 'cancelada' ? 'bg-rose-100 text-rose-800 dark:bg-rose-600/50 dark:text-rose-100' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>{estado || 'Desconocido'}</span>;
};

/* ================ Página ================ */
export default function Schedule() {
  const { user } = useAuth(); // Get user info { uid, usuario, admin } from context
  const navigate = useNavigate();

  // ✅ State updated to match required payload fields + form inputs
  const [form, setForm] = useState({
    nombre_evento: 'Consulta Psicológica', // Default or empty
    descripcion_evento: '',
    fecha_inicio: '', // Date input YYYY-MM-DD
    hora_inicio: '',  // Time input HH:MM
    fecha_fin: '',    // Date input YYYY-MM-DD
    hora_fin: '',     // Time input HH:MM
    zona_horaria: 'America/Guatemala', // Default Timezone
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: 'info' });

  // State for appointment history
  const [citas, setCitas] = useState([]);
  const [loadingHist, setLoadingHist] = useState(true);

  // ✅ Updated handleChange to match new state keys
  const handleChange = (e) => {
    setMsg({ text: '', type: 'info' }); // Clear message
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

     // Auto-fill logic (optional but helpful)
    if (name === 'fecha_inicio' && value && (!form.fecha_fin || form.fecha_fin < value)) {
        setForm(prev => ({ ...prev, fecha_fin: value }));
    }
    if (name === 'hora_inicio' && value && form.fecha_inicio && (!form.hora_fin || (form.fecha_inicio === form.fecha_fin && form.hora_fin <= value))) {
        try {
            const startDate = new Date(`${form.fecha_inicio}T${value}:00`);
            if (!isNaN(startDate.getTime())) {
                startDate.setHours(startDate.getHours() + 1); // Add 1 hour default duration
                const endHour = startDate.getHours().toString().padStart(2, '0');
                const endMinute = startDate.getMinutes().toString().padStart(2, '0');
                 // Also update end date if start date caused end time calculation
                 const endDate = startDate.toISOString().split('T')[0];
                 setForm(prev => ({ ...prev, fecha_fin: endDate, hora_fin: `${endHour}:${endMinute}` }));
            }
        } catch { /* ignore parse error */ }
    }
  };


  /* ---------- Historial del paciente (Read-only) ---------- */
  // Fetches appointments and filters for the current user based on UID
  const fetchHistorial = useCallback(async () => {
    const currentUserId = user?.uid; // Get UID from context
    if (!currentUserId) { // Don't fetch if user is not identified
        setLoadingHist(false);
        setCitas([]);
        console.log("Historial: User not logged in or UID not available.");
        return;
    }

    setLoadingHist(true);
    try {
      const resp = await listarCitas(); // Fetch all appointments

      // Determine the structure of the response
      let raw = [];
      if (Array.isArray(resp)) raw = resp;
      else if (resp?.citas && Array.isArray(resp.citas)) raw = resp.citas;
      else if (resp?.data && Array.isArray(resp.data)) raw = resp.data;
      else { console.warn("Unexpected history data structure:", resp); }

      // Map and filter appointments
      const mapped = raw.map((c, i) => {
        const { fecha, hora } = parseISOToLocal(c.fecha_y_hora_inicio);
        const id = c.id_evento || c.id || `tmp-${Date.now()}-${i}`; // Ensure unique key
        // Try to get user identifier associated with the appointment (backend needs to provide this)
        const appointmentUserId = c.uid || c.user_id || c.paciente_usuario || null;

        return {
          id_evento: id,
          uid_for_filtering: appointmentUserId, // Use the field the backend returns for user ID
          nombre: c.nombre_evento || c.summary || `Cita ${id.slice(0,5)}`,
          fecha, hora,
          motivo: c.descripcion_evento || c.description || 'Sin Motivo',
          estado: c.estado_cita || 'Pendiente',
          fecha_y_hora_inicio_iso: c.fecha_y_hora_inicio, // Keep original ISO if needed
        };
      });

      // Filter appointments that belong to the current user
      const mine = mapped.filter(c => c.uid_for_filtering === currentUserId)
                         .sort((a,b) => { // Sort by date ascending
                            const ta = new Date(a.fecha_y_hora_inicio_iso || 0).getTime();
                            const tb = new Date(b.fecha_y_hora_inicio_iso || 0).getTime();
                            return ta - tb;
                         });

      console.log("Filtered user appointments:", mine);
      setCitas(mine);

    } catch (e) {
      setMsg({ text: `❌ Error al cargar historial: ${e?.message || 'Error de conexión.'}`, type: 'error' });
      setCitas([]);
    } finally {
      setLoadingHist(false);
    }
  }, [user?.uid]); // Depend on user.uid to refetch if user changes

  useEffect(() => { fetchHistorial(); }, [fetchHistorial]);


  /* ---------- Guardar cita ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ text: '', type: 'info' });

    // --- Get User ID ---
    const currentUserId = user?.uid; // Get UID from Auth context
    if (!currentUserId) {
        setMsg({ text: '❌ No se pudo identificar al usuario. Por favor, inicie sesión.', type: 'error' });
        return;
    }

    // --- Validation ---
    if (!form.nombre_evento || !form.fecha_inicio || !form.hora_inicio || !form.fecha_fin || !form.hora_fin) {
      setMsg({ text: '❌ Complete nombre del evento, fecha y hora de inicio/fin.', type: 'error' });
      return;
    }
    const inicioISO = combineDateTimeISO(form.fecha_inicio, form.hora_inicio);
    const finISO = combineDateTimeISO(form.fecha_fin, form.hora_fin);
    if (!inicioISO || !finISO) {
      setMsg({ text: '❌ Formato de fecha/hora inválido.', type: 'error' });
      return;
    }
    if (new Date(finISO) <= new Date(inicioISO)) {
      setMsg({ text: '❌ La hora de fin debe ser posterior a la de inicio.', type: 'error' });
      return;
    }

    // --- Build Payload ---
    const payload = {
      uid: currentUserId, // Use the actual user ID from context
      nombre_evento: form.nombre_evento.trim(),
      descripcion_evento: form.descripcion_evento.trim() || null, // Send null if empty
      fecha_y_hora_inicio: inicioISO, // ISO 8601 string
      fecha_y_hora_fin: finISO,       // ISO 8601 string
      zona_horaria: form.zona_horaria || 'America/Guatemala', // Use default if empty
      // 'asistentes' is omitted based on the required structure provided
    };

    try {
      setIsSubmitting(true);
      console.log('[CREAR_CITA] Payload:', JSON.stringify(payload, null, 2));
      const response = await crearCita(payload); // Call API function

      // Handle potential API error response format
      if (response && response.success === false) {
           throw new Error(response.error || "Error desconocido desde la API al crear cita.");
      }
       // Handle cases where API might just return OK status without success flag
      if (!response) {
            console.warn("API response might differ, assuming success based on status code.");
      }

      setMsg({ text: '✅ Cita guardada correctamente. Serás redirigido.', type: 'success' });
      // Reset form fields selectively
      setForm((prev) => ({
          ...prev, // Keep name, email, timezone
          fecha_inicio: '',
          hora_inicio: '',
          fecha_fin: '',
          hora_fin: '',
          descripcion_evento: ''
      }));
      await fetchHistorial(); // Refresh history immediately
      setTimeout(() => navigate('/'), 2500); // Navigate back to chat after ~2.5s

    } catch (err) {
      setMsg({ text: `❌ ${err?.message || 'Error al guardar la cita.'}`, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------- Render ---------- */
  return (
    // Outer container
    <div className="min-h-screen flex flex-col gap-6 bg-gradient-to-br from-indigo-50 via-violet-50 to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 p-4 md:p-6 items-center">
      {/* Form Card */}
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow border border-indigo-100/70 dark:border-indigo-900/40">
        {/* Card Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-indigo-100/70 dark:border-indigo-900/40 rounded-t-2xl">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
              <span role="img" aria-label="calendar">📅</span> Agendar Cita
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Completa los datos para tu consulta.
            </p>
          </div>
           {/* ThemeToggle removed */}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Use new state keys */}
          <div>
            <label htmlFor="nombre_evento" className="form-label">Nombre Evento *</label>
            <input id="nombre_evento" type="text" name="nombre_evento" value={form.nombre_evento} onChange={handleChange} required className="form-input"/>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="fecha_inicio" className="form-label">Fecha Inicio *</label>
              <input id="fecha_inicio" type="date" name="fecha_inicio" value={form.fecha_inicio} onChange={handleChange} required className="form-input"/>
            </div>
            <div>
               <label htmlFor="hora_inicio" className="form-label">Hora Inicio *</label>
              <input id="hora_inicio" type="time" name="hora_inicio" value={form.hora_inicio} onChange={handleChange} required className="form-input"/>
            </div>
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
               <label htmlFor="fecha_fin" className="form-label">Fecha Fin *</label>
              <input id="fecha_fin" type="date" name="fecha_fin" value={form.fecha_fin} onChange={handleChange} min={form.fecha_inicio} required className="form-input"/>
            </div>
            <div>
              <label htmlFor="hora_fin" className="form-label">Hora Fin *</label>
              <input id="hora_fin" type="time" name="hora_fin" value={form.hora_fin} onChange={handleChange} min={form.fecha_inicio === form.fecha_fin ? form.hora_inicio : undefined} required className="form-input"/>
            </div>
          </div>

          <div>
             <label htmlFor="descripcion_evento" className="form-label">Motivo / Descripción</label>
            <textarea id="descripcion_evento" name="descripcion_evento" placeholder="Motivo de la cita (opcional)" value={form.descripcion_evento} onChange={handleChange} rows="3" className="form-input resize-none"/>
          </div>
           <div>
             <label htmlFor="zona_horaria" className="form-label">Zona Horaria</label>
             <input id="zona_horaria" name="zona_horaria" type="text" value={form.zona_horaria} onChange={handleChange} className="form-input bg-gray-100 dark:bg-gray-700" readOnly/>
           </div>


          {/* Message Area */}
          {msg.text && ( <div className={`p-3 rounded-lg text-sm font-semibold mt-2 ${ msg.type === 'error' ? 'error-msg' : (msg.type === 'success' ? 'success-msg' : 'info-msg') }`}> {msg.text} </div> )}

          {/* Submit Button */}
          <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded transition disabled:opacity-60">
            {isSubmitting ? 'Guardando…' : 'Confirmar Cita'}
          </button>
        </form>
      </div>

      {/* Historial del paciente */}
      <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow border border-indigo-100/70 dark:border-indigo-900/40 mt-6">
        <div className="px-6 py-4 border-b border-indigo-100/70 dark:border-indigo-900/40 rounded-t-2xl">
          <h2 className="text-lg md:text-xl font-bold text-indigo-700 dark:text-indigo-300">Mis Próximas Citas</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Solo lectura.</p>
        </div>

        {loadingHist ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">Cargando historial…</div>
        ) : (
          <div className="p-4">
            {citas.length === 0 ? (
              <div className="text-sm text-center py-4 text-gray-500 dark:text-gray-400">No tienes citas agendadas.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full w-full text-sm border-collapse">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      {/* Removed "Evento" ID column */}
                      {["Nombre", "Fecha", "Hora", "Motivo", "Estado"].map(h => (
                        <th key={h} className="text-left font-semibold px-3 py-2 border-b dark:border-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {citas.map(cita => (
                      <tr key={cita.id_evento} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-700/50">
                        {/* Removed ID cell */}
                        <td className="px-3 py-2 border-b dark:border-gray-600">{cita.nombre}</td>
                        <td className="px-3 py-2 border-b dark:border-gray-600">{cita.fecha}</td>
                        <td className="px-3 py-2 border-b dark:border-gray-600">{cita.hora}</td>
                        <td className="px-3 py-2 border-b dark:border-gray-600">{cita.motivo}</td>
                        <td className="px-3 py-2 border-b dark:border-gray-600"><EstadoBadge estado={cita.estado} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Basic Styles */}
      <style>{`
        .form-label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: #374151; }
        .dark .form-label { color: #d1d5db; }
        .form-input, .form-select, textarea.form-input { width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.375rem; border: 1px solid #d1d5db; background-color: white; color: #111827; font-size: 0.875rem; transition: border-color 0.2s, box-shadow 0.2s; line-height: 1.5; }
        .dark .form-input, .dark .form-select, .dark textarea.form-input { border-color: #4b5563; background-color: #374151; color: white; }
        .form-input:focus, .form-select:focus, textarea.form-input:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.4); }
        .error-msg { background-color: #fee2e2; border-color: #fecaca; color: #b91c1c; } .dark .error-msg { background-color: rgba(159,18,57,0.2); border-color: rgba(220,38,38,0.4); color: #fca5a5; }
        .success-msg { background-color: #dcfce7; border-color: #bbf7d0; color: #166534; } .dark .success-msg { background-color: rgba(22,101,52,0.2); border-color: rgba(74, 222, 128, 0.4); color: #86efac; }
        .info-msg { background-color: #eff6ff; border-color: #bfdbfe; color: #1e40af; } .dark .info-msg { background-color: rgba(30,64,175,0.2); border-color: rgba(96, 165, 250, 0.4); color: #bfdbfe; }
      `}</style>
    </div>
  );
}