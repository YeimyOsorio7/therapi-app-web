// src/pages/AgendarCita.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { crearCita } from '../services/api'; // Import the API function

// Placeholder for logged-in user ID - REPLACE with actual auth context/state
const USER_UID_PLACEHOLDER = "USER_ID_FROM_LOGIN"; // Example: "Jjk3SeRqXnZ5hKspBRav"

// Default Timezone for Guatemala
const DEFAULT_TIMEZONE = "America/Guatemala";

export default function AgendarCita() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    nombre_evento: 'Consulta Psicológica', // Default value or empty
    descripcion_evento: '',
    fecha_inicio: '', // YYYY-MM-DD
    hora_inicio: '', // HH:MM
    fecha_fin: '', // YYYY-MM-DD
    hora_fin: '', // HH:MM
    asistente_email: '', // Optional email
    numero_telefono: '', // Phone number
    zona_horaria: DEFAULT_TIMEZONE, // Default or empty
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // Mostrar mensaje si viene desde el chat
  useEffect(() => {
    if (location.state?.message) {
      setMsg(`💖 ${location.state.message}`);
      // Limpiar el mensaje después de unos segundos
      setTimeout(() => {
        setMsg('');
      }, 5000);
    }
  }, [location]);

  const handleChange = (e) => {
    setMsg('');
    const { name, value } = e.target;
    
    // Formatear número de teléfono automáticamente
    if (name === 'numero_telefono') {
      // Remover todo excepto números
      const digitsOnly = value.replace(/\D/g, '');
      
      // Limitar a 8 dígitos
      const limitedDigits = digitsOnly.slice(0, 8);
      
      // Formatear con guión después de 4 dígitos
      let formatted = limitedDigits;
      if (limitedDigits.length > 4) {
        formatted = `${limitedDigits.slice(0, 4)}-${limitedDigits.slice(4)}`;
      }
      
      setFormData(prev => ({ ...prev, [name]: formatted }));
      return;
    }
    
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
      numero_telefono: formData.numero_telefono.trim() ? `+502${formData.numero_telefono.replace(/-/g, '')}` : null, // Format: +502XXXXXXXX as string
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
    // Full page container with centered content
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Form Container */}
      <div className="w-full max-w-2xl">
        <form
          onSubmit={handleSubmit}
          className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 border border-gray-200 dark:border-gray-700"
        >
          {/* Header with back button */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <span>←</span>
              <span>Volver al Chat</span>
            </button>
          </div>

          <h2 className="text-3xl font-bold text-center text-indigo-600 dark:text-indigo-400">
            📅 Agendar Nueva Cita
          </h2>

          {/* Message Area */}
          {msg && (
            <div className={`p-4 rounded-lg border text-sm text-center font-medium animate-fade-in
              ${msg.startsWith("❌") ? 'error-msg' : 'success-msg'}`}
            >
              {msg}
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-5">
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
                className="form-input resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fecha_fin" className="form-label">Fecha Fin *</label>
                <input
                  id="fecha_fin"
                  name="fecha_fin"
                  type="date"
                  value={formData.fecha_fin}
                  onChange={handleChange}
                  min={formData.fecha_inicio}
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
              <label htmlFor="numero_telefono" className="form-label">Número de Teléfono (Opcional)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-300 font-semibold text-base pointer-events-none">
                  +502
                </span>
                <input
                  id="numero_telefono"
                  name="numero_telefono"
                  type="tel"
                  value={formData.numero_telefono}
                  onChange={handleChange}
                  placeholder="1234-5678"
                  maxLength="9"
                  className="form-input phone-input"
                  style={{ paddingLeft: '4.5rem' }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Formato: 1234-5678 (8 dígitos)</p>
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
                disabled
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Agendando...
              </span>
            ) : "Agendar Cita"}
          </button>
        </form>

        {/* Inline Styles */}
        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in { animation: fade-in 0.3s ease-out; }
          
          .form-label { 
            display: block; 
            font-size: 0.875rem; 
            font-weight: 600; 
            margin-bottom: 0.5rem; 
            color: #374151; 
          }
          .dark .form-label { color: #d1d5db; }
          
          .form-input, textarea.form-input {
            width: 100%; 
            padding: 0.75rem 1rem; 
            border-radius: 0.5rem; 
            border: 1px solid #d1d5db;
            background-color: white; 
            color: #111827; 
            font-size: 1rem; 
            transition: all 0.2s; 
            line-height: 1.5;
          }
          .dark .form-input, .dark textarea.form-input { 
            border-color: #4b5563; 
            background-color: #374151; 
            color: white; 
          }
          .form-input:focus, textarea.form-input:focus { 
            outline: none; 
            border-color: #4f46e5; 
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); 
          }
          .form-input:disabled {
            background-color: #f3f4f6;
            cursor: not-allowed;
            opacity: 0.6;
          }
          .dark .form-input:disabled {
            background-color: #1f2937;
          }
          
          .relative {
            position: relative;
          }
          
          .absolute {
            position: absolute;
          }
          
          .pointer-events-none {
            pointer-events: none;
          }
          
          .error-msg { 
            background-color: #fee2e2; 
            border-color: #fecaca; 
            color: #b91c1c; 
          } 
          .dark .error-msg { 
            background-color: rgba(159,18,57,0.2); 
            border-color: rgba(220,38,38,0.4); 
            color: #fca5a5; 
          }
          
          .success-msg { 
            background-color: #dcfce7; 
            border-color: #bbf7d0; 
            color: #166534; 
          } 
          .dark .success-msg { 
            background-color: rgba(22,101,52,0.2); 
            border-color: rgba(74, 222, 128, 0.4); 
            color: #86efac; 
          }
        `}</style>
      </div>
    </div>
  );
}