// src/pages/AgendarCita.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { crearCita } from '../services/api';

// ⚠️ Reemplazar por el UID real desde tu AuthContext cuando lo tengas
const USER_UID_PLACEHOLDER = "USER_ID_FROM_LOGIN";

export default function AgendarCita() {
  const navigate = useNavigate();
  const location = useLocation();

  // Helpers de fecha/hora mínima (futuro)
  const todayYYYYMMDD = (() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();
  const nowHHMM = (() => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mi}`;
  })();

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    nombre_evento: 'Consulta Psicológica',
    descripcion_evento: '',
    fecha_cita: '', // YYYY-MM-DD
    hora_cita: '',  // HH:MM
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  // Mensaje si viene desde el chat
  useEffect(() => {
    if (location.state?.message) {
      setMsg(`💖 ${location.state.message}`);
      setTimeout(() => setMsg(''), 5000);
    }
  }, [location]);

  const handleChange = (e) => {
    setMsg('');
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Combina fecha (YYYY-MM-DD) y hora (HH:MM) a ISO 8601 (UTC)
  const combineDateTimeISO = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    try {
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

    // ✅ Validar obligatorios
    const required = ['nombre', 'apellido', 'correo', 'nombre_evento', 'descripcion_evento', 'fecha_cita', 'hora_cita'];
    for (const k of required) {
      if (!String(formData[k] || '').trim()) {
        setMsg('❌ Todos los campos son obligatorios.');
        return;
      }
    }

    // ✅ Validar email
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo.trim());
    if (!emailOk) {
      setMsg('❌ Ingrese un correo electrónico válido.');
      return;
    }

    // ✅ Validar fecha/hora futura
    const fechaInicioISO = combineDateTimeISO(formData.fecha_cita, formData.hora_cita);
    if (!fechaInicioISO) {
      setMsg('❌ Formato de fecha u hora inválido.');
      return;
    }
    if (new Date(fechaInicioISO) <= new Date()) {
      setMsg('❌ La fecha y hora de la cita deben ser futuras.');
      return;
    }

    // 🚚 Payload (sin fecha fin ni zona horaria)
    const payload = {
      uid: USER_UID_PLACEHOLDER,
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      correo: formData.correo.trim(),
      nombre_evento: formData.nombre_evento.trim(),
      descripcion_evento: formData.descripcion_evento.trim(),
      fecha_y_hora_inicio: fechaInicioISO,
    };

    try {
      setLoading(true);
      console.log('Enviando Payload Cita:', JSON.stringify(payload, null, 2));
      const response = await crearCita(payload);
      if (response && response.success === false) {
        throw new Error(response.error || 'Error desconocido desde la API al crear cita.');
      }
      setMsg('✅ ¡Cita agendada correctamente!');
      // Limpiar y regresar
      setFormData({
        nombre: '',
        apellido: '',
        correo: '',
        nombre_evento: 'Consulta Psicológica',
        descripcion_evento: '',
        fecha_cita: '',
        hora_cita: '',
      });
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error('Error al agendar cita:', err);
      setMsg(`❌ Error al agendar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const minTimeForSelectedDate = formData.fecha_cita === todayYYYYMMDD ? nowHHMM : undefined;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl">
        <form
          onSubmit={handleSubmit}
          className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 border border-gray-200 dark:border-gray-700"
        >
          {/* Header con volver */}
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

          {/* Mensajes */}
          {msg && (
            <div
              className={`p-4 rounded-lg border text-sm text-center font-medium animate-fade-in ${
                msg.startsWith('❌') ? 'error-msg' : 'success-msg'
              }`}
            >
              {msg}
            </div>
          )}

          {/* Campos */}
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nombre" className="form-label">Nombre *</label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                  className="form-input"
                  autoComplete="given-name"
                />
              </div>
              <div>
                <label htmlFor="apellido" className="form-label">Apellido *</label>
                <input
                  id="apellido"
                  name="apellido"
                  type="text"
                  value={formData.apellido}
                  onChange={handleChange}
                  required
                  className="form-input"
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="correo" className="form-label">Correo *</label>
              <input
                id="correo"
                name="correo"
                type="email"
                value={formData.correo}
                onChange={handleChange}
                required
                className="form-input"
                autoComplete="email"
                placeholder="tu@correo.com"
              />
            </div>

            <div>
              <label htmlFor="nombre_evento" className="form-label">Nombre del Evento *</label>
              <input
                id="nombre_evento"
                name="nombre_evento"
                type="text"
                value={formData.nombre_evento}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="descripcion_evento" className="form-label">Motivo / Descripción *</label>
              <textarea
                id="descripcion_evento"
                name="descripcion_evento"
                value={formData.descripcion_evento}
                onChange={handleChange}
                rows={3}
                required
                className="form-input resize-none"
                placeholder="Breve descripción del motivo de la cita"
              />
            </div>

            {/* Fecha y hora de la cita (sin fin) */}
            <div>
              <p className="form-label">Fecha y hora de la cita *</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fecha_cita" className="sr-only">Fecha de la cita</label>
                  <input
                    id="fecha_cita"
                    name="fecha_cita"
                    type="date"
                    value={formData.fecha_cita}
                    onChange={handleChange}
                    required
                    className="form-input"
                    min={todayYYYYMMDD}
                  />
                </div>
                <div>
                  <label htmlFor="hora_cita" className="sr-only">Hora de la cita</label>
                  <input
                    id="hora_cita"
                    name="hora_cita"
                    type="time"
                    value={formData.hora_cita}
                    onChange={handleChange}
                    required
                    className="form-input"
                    min={formData.fecha_cita === todayYYYYMMDD ? nowHHMM : undefined}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botón */}
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
            ) : 'Agendar Cita'}
          </button>
        </form>

        {/* Estilos inline */}
        <style>{`
          @keyframes fade-in { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in { animation: fade-in 0.3s ease-out; }
          .form-label { display: block; font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem; color: #374151; }
          .dark .form-label { color: #d1d5db; }
          .form-input, textarea.form-input {
            width: 100%; padding: 0.75rem 1rem; border-radius: 0.5rem; border: 1px solid #d1d5db;
            background-color: white; color: #111827; font-size: 1rem; transition: all 0.2s; line-height: 1.5;
          }
          .dark .form-input, .dark textarea.form-input { border-color: #4b5563; background-color: #374151; color: white; }
          .form-input:focus, textarea.form-input:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
          .form-input:disabled { background-color: #f3f4f6; cursor: not-allowed; opacity: 0.6; }
          .dark .form-input:disabled { background-color: #1f2937; }
          .error-msg { background-color: #fee2e2; border-color: #fecaca; color: #b91c1c; }
          .dark .error-msg { background-color: rgba(159,18,57,0.2); border-color: rgba(220,38,38,0.4); color: #fca5a5; }
          .success-msg { background-color: #dcfce7; border-color: #bbf7d0; color: #166534; }
          .dark .success-msg { background-color: rgba(22,101,52,0.2); border-color: rgba(74,222,128,0.4); color: #86efac; }
          .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
        `}</style>
      </div>
    </div>
  );
}
