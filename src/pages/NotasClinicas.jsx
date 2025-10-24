// src/pages/NotasClinicas.jsx
import { useState, useEffect, useCallback } from 'react';
// ✅ Import the new API functions
import { agregarNotaClinica, getAllNotasClinicas } from '../services/api';

// Placeholder for getting the logged-in user's ID
// Replace this with your actual authentication logic (Context, localStorage, etc.)
const getCurrentUserId = () => {
    // Example: Read from local storage
    // const user = JSON.parse(localStorage.getItem('user'));
    // return user?.uid || null;

    // --- Replace this placeholder ---
    return "USER_ID_FROM_LOGIN_OR_CONTEXT";
};

// Initial state for the form
const initialFormState = {
    contenido_reporte: '',
    recomendaciones_reporte: '',
    transtorno_posible: '',
    // fecha_generacion will be set on submit
    tipo_reporte: 'diagnóstico', // Default value
};

export default function NotasClinicas() {
    const [form, setForm] = useState(initialFormState);
    const [loading, setLoading] = useState(false); // For form submission
    const [fetchLoading, setFetchLoading] = useState(true); // For fetching notes
    const [msg, setMsg] = useState({ text: '', type: 'info' }); // For user feedback
    const [notas, setNotas] = useState([]); // To store fetched notes

    // Handle form input changes
    const handleChange = useCallback((e) => {
        setMsg({ text: '', type: 'info' }); // Clear message on change
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    }, []);

    // --- Fetch Existing Notes ---
    const fetchNotas = useCallback(async () => {
        setFetchLoading(true);
        setMsg({ text: '', type: 'info' });
        try {
            const data = await getAllNotasClinicas();
            // Assuming the API returns an array directly or an object like { notes: [...] }
            let notesData = [];
            if (Array.isArray(data)) {
                notesData = data;
            } else if (data && Array.isArray(data.notes)) { // Adjust 'notes' if key is different
                notesData = data.notes;
            } else if (data && Array.isArray(data.data)) { // Another common wrapper
                notesData = data.data;
            } else {
                 console.warn("Unexpected data structure for notes:", data);
            }
            setNotas(notesData);
        } catch (error) {
            console.error("Error fetching clinical notes:", error);
            setMsg({ text: `❌ Error al cargar notas: ${error.message}`, type: 'error' });
            setNotas([]); // Clear notes on error
        } finally {
            setFetchLoading(false);
        }
    }, []);

    // Fetch notes when the component mounts
    useEffect(() => {
        fetchNotas();
    }, [fetchNotas]);

    // --- Handle Form Submission ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg({ text: '', type: 'info' });

        const userId = getCurrentUserId(); // Get the current user's ID
        if (!userId || userId === "USER_ID_FROM_LOGIN_OR_CONTEXT") {
            setMsg({ text: '❌ Error: No se pudo identificar al usuario.', type: 'error' });
            return;
        }

        // Basic validation
        if (!form.contenido_reporte || !form.transtorno_posible) {
            setMsg({ text: '❌ Por favor, completa el contenido y el posible trastorno.', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            const currentDate = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD

            // Prepare payload matching the API structure
            const payload = {
                user_id: userId, // The ID of the user this note belongs to (patient?) or the psychologist creating it? Adjust as needed.
                contenido_reporte: form.contenido_reporte.trim(),
                recomendaciones_reporte: form.recomendaciones_reporte.trim() || null, // Send null if empty
                transtorno_posible: form.transtorno_posible.trim(),
                fecha_generacion: currentDate, // Automatically set current date
                tipo_reporte: form.tipo_reporte,
            };

            console.log("Enviando Payload Nota Clínica:", JSON.stringify(payload, null, 2));

            const response = await agregarNotaClinica(payload);

            if (response && response.success === false) {
                throw new Error(response.error || "Error desconocido desde la API al agregar nota.");
            }

            setMsg({ text: '✅ Nota clínica agregada correctamente.', type: 'success' });
            setForm(initialFormState); // Reset form after successful submission
            fetchNotas(); // Refresh the list of notes

        } catch (err) {
            console.error("Error al agregar nota clínica:", err);
            setMsg({ text: `❌ Error al guardar: ${err.message}`, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        // Use Tailwind classes for layout consistent with other pages
        <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto"> {/* Centered content */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notas Clínicas</h1>

            {/* --- Form Section --- */}
            <form
                onSubmit={handleSubmit}
                className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl shadow-lg p-6 space-y-4 border border-gray-200 dark:border-gray-700"
            >
                <h2 className="text-xl font-semibold text-indigo-600 dark:text-indigo-300 mb-4">Agregar Nueva Nota</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Contenido Reporte */}
                    <div className="md:col-span-2">
                        <label htmlFor="contenido_reporte" className="form-label">Contenido / Diagnóstico *</label>
                        <textarea
                            id="contenido_reporte"
                            name="contenido_reporte"
                            rows={4}
                            value={form.contenido_reporte}
                            onChange={handleChange}
                            placeholder="Describe el diagnóstico, observaciones, etc."
                            required
                            className="form-input"
                        />
                    </div>

                    {/* Recomendaciones */}
                     <div className="md:col-span-2">
                        <label htmlFor="recomendaciones_reporte" className="form-label">Recomendaciones</label>
                        <textarea
                            id="recomendaciones_reporte"
                            name="recomendaciones_reporte"
                            rows={3}
                            value={form.recomendaciones_reporte}
                            onChange={handleChange}
                            placeholder="Sugerencias terapéuticas, próximos pasos..."
                            className="form-input"
                        />
                    </div>

                    {/* Trastorno Posible */}
                    <div>
                        <label htmlFor="transtorno_posible" className="form-label">Trastorno Posible *</label>
                        <input
                            id="transtorno_posible"
                            name="transtorno_posible"
                            type="text"
                            value={form.transtorno_posible}
                            onChange={handleChange}
                            placeholder="Ej. Ansiedad generalizada"
                            required
                            className="form-input"
                        />
                    </div>

                    {/* Tipo Reporte */}
                    <div>
                        <label htmlFor="tipo_reporte" className="form-label">Tipo de Reporte</label>
                        <select
                             id="tipo_reporte"
                             name="tipo_reporte"
                             value={form.tipo_reporte}
                             onChange={handleChange}
                             className="form-select"
                        >
                            <option value="diagnóstico">Diagnóstico</option>
                            <option value="seguimiento">Seguimiento</option>
                            <option value="evaluación">Evaluación</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>
                </div>

                {/* --- Message Area --- */}
                {msg.text && (
                    <div className={`mt-4 p-3 rounded-lg border text-sm text-center font-medium
                        ${msg.type === 'error' ? 'error-msg' : (msg.type === 'success' ? 'success-msg' : 'info-msg')}`}
                    >
                        {msg.text}
                    </div>
                 )}

                {/* --- Submit Button --- */}
                <div className="pt-4">
                     <button
                        type="submit"
                        disabled={loading}
                        className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                    >
                        {loading ? "Guardando..." : "Guardar Nota"}
                    </button>
                </div>
            </form>

             {/* --- Display Existing Notes Section --- */}
            <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Notas Guardadas</h2>
                {fetchLoading ? (
                    <p className="text-gray-500 dark:text-gray-400">Cargando notas...</p>
                ) : notas.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">No hay notas clínicas guardadas.</p>
                ) : (
                    <div className="space-y-4">
                        {/* Iterate over notes and display them */}
                        {notas.map((nota, index) => (
                            <div key={nota.id || index} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Fecha: {nota.fecha_generacion || 'N/A'} | Tipo: {nota.tipo_reporte || 'N/A'} | Usuario ID: {nota.user_id || 'N/A'}
                                </p>
                                <h3 className="font-semibold mt-1 text-gray-900 dark:text-white">Trastorno: {nota.transtorno_posible || 'No especificado'}</h3>
                                <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
                                    <strong className="block">Contenido:</strong>
                                    {nota.contenido_reporte || 'N/A'}
                                </p>
                                {nota.recomendaciones_reporte && (
                                     <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
                                        <strong className="block">Recomendaciones:</strong>
                                        {nota.recomendaciones_reporte}
                                    </p>
                                )}
                                {/* Add Edit/Delete buttons here if needed, linking them to appropriate API calls */}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Basic Styles - Add to index.css or global scope */}
            <style>{`
                .form-label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: #374151; }
                .dark .form-label { color: #d1d5db; }
                .form-input, .form-select, textarea.form-input { width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.375rem; border: 1px solid #d1d5db; background-color: white; color: #111827; font-size: 0.875rem; transition: border-color 0.2s, box-shadow 0.2s; line-height: 1.5; }
                .dark .form-input, .dark .form-select, .dark textarea.form-input { border-color: #4b5563; background-color: #374151; color: white; }
                .form-input:focus, .form-select:focus, textarea.form-input:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.4); }
                .form-select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; }
                .dark .form-select { background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); }
                .error-msg { background-color: #fee2e2; border-color: #fecaca; color: #b91c1c; } .dark .error-msg { background-color: rgba(159,18,57,0.2); border-color: rgba(220,38,38,0.4); color: #fca5a5; }
                .success-msg { background-color: #dcfce7; border-color: #bbf7d0; color: #166534; } .dark .success-msg { background-color: rgba(22,101,52,0.2); border-color: rgba(74, 222, 128, 0.4); color: #86efac; }
                .info-msg { background-color: #eff6ff; border-color: #bfdbfe; color: #1e40af; } .dark .info-msg { background-color: rgba(30,64,175,0.2); border-color: rgba(96, 165, 250, 0.4); color: #bfdbfe; }
            `}</style>
        </div>
    );
}