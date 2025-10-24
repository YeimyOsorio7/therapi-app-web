// src/pages/AgendarCita.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { crearCita } from '../services/api'; // Import the API function

// Placeholder for logged-in user ID - REPLACE with actual auth context/state
const USER_UID_PLACEHOLDER = "USER_ID_FROM_LOGIN"; // Example: "Jjk3SeRqXnZ5hKspBRav"

// Default Timezone for Guatemala
const DEFAULT_TIMEZONE = "America/Guatemala";

export default function AgendarCita() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre_evento: 'Consulta Psicológica', // Default value or empty
    descripcion_evento: '',
    fecha_inicio: '', // YYYY-MM-DD
    hora_inicio: '', // HH:MM
    fecha_fin: '', // YYYY-MM-DD
    hora_fin: '', // HH:MM
    asistente_email: '', // Optional email
    zona_horaria: DEFAULT_TIMEZONE, // Default or empty
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleChange = (e) => {
    setMsg('');
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Auto-fill end date if start date changes and end date is empty or earlier
    if (name === 'fecha_inicio' && (!formData.fecha_fin || formData.fecha_fin < value)) {
        setFormData(prev => ({ ...prev, fecha_fin: value }));
    }
    // Auto-fill end time (e.g., +1 hour) if start time changes and end time is empty or earlier
    if (name === 'hora_inicio' && value && (!formData.hora_fin || formData.hora_fin <= value)) {
        try {
            const [h, m] = value.split(':').map(Number);
            const startDate = new Date();
            startDate.setHours(h, m, 0, 0);
            startDate.setHours(startDate.getHours() + 1); // Add 1 hour
            const endHour = startDate.getHours().toString().padStart(2, '0');
            const endMinute = startDate.getMinutes().toString().padStart(2, '0');
             setFormData(prev => ({ ...prev, hora_fin: `${endHour}:${endMinute}` }));
        } catch {
             setFormData(prev => ({ ...prev, hora_fin: '' })); // Clear on error
        }
    }
  };

  // Helper to combine date and time into ISO string
  const combineDateTimeISO = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    try {
        // Creates date in local timezone based on input, then converts to ISO
        const localDate = new Date(`${dateStr}T${timeStr}:00`);
        if (isNaN(localDate.getTime())) return null;
        return localDate.toISOString();
    } catch {
        return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');

    // --- Validation ---
    if (!formData.nombre_evento || !formData.fecha_inicio || !formData.hora_inicio || !formData.fecha_fin || !formData.hora_fin) {
      setMsg("❌ Por favor, completa el nombre, fecha y hora de inicio/fin.");
      return;
    }

    const fechaInicioISO = combineDateTimeISO(formData.fecha_inicio, formData.hora_inicio);
    const fechaFinISO = combineDateTimeISO(formData.fecha_fin, formData.hora_fin);

    if (!fechaInicioISO || !fechaFinISO) {
       setMsg("❌ Formato de fecha u hora inválido.");
       return;
    }

    if (new Date(fechaFinISO) <= new Date(fechaInicioISO)) {
        setMsg("❌ La hora de fin debe ser posterior a la hora de inicio.");
        return;
    }

    // --- Prepare Payload ---
    const payload = {
      uid: USER_UID_PLACEHOLDER, // ** IMPORTANT: Replace with actual logged-in user ID **
      nombre_evento: formData.nombre_evento.trim(),
      descripcion_evento: formData.descripcion_evento.trim() || null, // Send null if empty
      fecha_y_hora_inicio: fechaInicioISO,
      fecha_y_hora_fin: fechaFinISO,
      asistentes: formData.asistente_email ? [formData.asistente_email.trim()] : [], // Array with email or empty array
      zona_horaria: formData.zona_horaria || DEFAULT_TIMEZONE,
    };

    setLoading(true);
    try {
      console.log("Enviando Payload Cita:", JSON.stringify(payload, null, 2));
      const response = await crearCita(payload);

      if (response && response.success === false) {
        throw new Error(response.error || "Error desconocido desde la API al crear cita.");
      }

      setMsg("✅ ¡Cita agendada correctamente!");
      // Optionally reset form or navigate away
      // setFormData({ /* initial empty state */ });
      // navigate('/'); // Example: navigate back to chat
      setTimeout(() => navigate('/'), 2000); // Navigate back after 2s

    } catch (err) {
      console.error("Error al agendar cita:", err);
      setMsg(`❌ Error al agendar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Form Container (Uses Tailwind)
    <div className="w-full max-w-lg">
      <form
        onSubmit={handleSubmit}
        className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl shadow-xl p-6 space-y-6 border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-2xl font-bold text-center text-indigo-600 dark:text-indigo-300">
          📅 Agendar Nueva Cita
        </h2>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label htmlFor="nombre_evento" className="form-label">Nombre del Evento *</label>
            <input
              id="nombre_evento"
              name="nombre_evento"
              type="text"
              value={formData.nombre_evento}
              onChange={handleChange}
              placeholder="Ej. Consulta Psicológica"
              required
              className="form-input"
            />
          </div>

          <div>
            <label htmlFor="descripcion_evento" className="form-label">Descripción / Motivo</label>
            <textarea
              id="descripcion_evento"
              name="descripcion_evento"
              value={formData.descripcion_evento}
              onChange={handleChange}
              placeholder="Breve descripción o motivo de la consulta"
              rows={3}
              className="form-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="fecha_inicio" className="form-label">Fecha Inicio *</label>
              <input
                id="fecha_inicio"
                name="fecha_inicio"
                type="date"
                value={formData.fecha_inicio}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
             <div>
              <label htmlFor="hora_inicio" className="form-label">Hora Inicio *</label>
              <input
                id="hora_inicio"
                name="hora_inicio"
                type="time"
                value={formData.hora_inicio}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>
          </div>

           <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="fecha_fin" className="form-label">Fecha Fin *</label>
              <input
                id="fecha_fin"
                name="fecha_fin"
                type="date"
                value={formData.fecha_fin}
                onChange={handleChange}
                min={formData.fecha_inicio} // Prevent end date before start date
                required
                className="form-input"
              />
            </div>
             <div>
              <label htmlFor="hora_fin" className="form-label">Hora Fin *</label>
              <input
                id="hora_fin"
                name="hora_fin"
                type="time"
                value={formData.hora_fin}
                onChange={handleChange}
                // Basic validation: if dates match, end time must be after start time
                min={formData.fecha_inicio === formData.fecha_fin ? formData.hora_inicio : undefined}
                required
                className="form-input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="asistente_email" className="form-label">Email Asistente (Opcional)</label>
            <input
              id="asistente_email"
              name="asistente_email"
              type="email"
              value={formData.asistente_email}
              onChange={handleChange}
              placeholder="correo@ejemplo.com (si aplica)"
              className="form-input"
            />
          </div>

           <div>
            <label htmlFor="zona_horaria" className="form-label">Zona Horaria (Opcional)</label>
            <input
              id="zona_horaria"
              name="zona_horaria"
              type="text"
              value={formData.zona_horaria}
              onChange={handleChange}
              placeholder="Ej. America/Guatemala"
              className="form-input"
            />
          </div>

        </div>

        {/* Message Area */}
        {msg && (
          <div className={`mt-4 p-3 rounded-lg border text-sm text-center font-medium
            ${msg.startsWith("❌") ? 'error-msg' : 'success-msg'}`} // Use CSS classes
          >
            {msg}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        >
          {loading ? "Agendando..." : "Agendar Cita"}
        </button>

      </form>
       {/* Add styles needed for form-label, form-input, form-select, error-msg, success-msg */}
       <style>{`
        .form-label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: #374151; }
        .dark .form-label { color: #d1d5db; }
        .form-input, .form-select, textarea.form-input {
          width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.375rem; border: 1px solid #d1d5db;
          background-color: white; color: #111827; font-size: 0.875rem; transition: border-color 0.2s, box-shadow 0.2s; line-height: 1.5;
        }
        .dark .form-input, .dark .form-select, .dark textarea.form-input { border-color: #4b5563; background-color: #374151; color: white; }
        .form-input:focus, .form-select:focus, textarea.form-input:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.4); }
        .form-select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; }
        .dark .form-select { background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); }
        .error-msg { background-color: #fee2e2; border-color: #fecaca; color: #b91c1c; } .dark .error-msg { background-color: rgba(159,18,57,0.2); border-color: rgba(220,38,38,0.4); color: #fca5a5; }
        .success-msg { background-color: #dcfce7; border-color: #bbf7d0; color: #166534; } .dark .success-msg { background-color: rgba(22,101,52,0.2); border-color: rgba(74, 222, 128, 0.4); color: #86efac; }
      `}</style>
    </div>
  );
}