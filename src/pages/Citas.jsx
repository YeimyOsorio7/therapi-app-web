// src/pages/Citas.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { listarCitas, actualizarCita, eliminarCita } from "../services/api";
import { useAuth } from "../context/AuthContext";

/* ========================= Utils ========================= */
// Helper to safely parse date/time strings (ISO format expected from API)
const parseISOToLocal = (isoString) => {
  if (!isoString) return { fecha: "N/A", hora: "N/A" };
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) throw new Error("Invalid date");
    const fecha = date.toISOString().split("T")[0]; // YYYY-MM-DD
    const hora = date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }); // HH:MM (local)
    return { fecha, hora };
  } catch (e) {
    console.warn("Could not parse date:", isoString, e);
    return { fecha: "Invalid Date", hora: "N/A" };
  }
};

// Helper to create ISO string from local date/time for updates
const toDateTimeISO = (fecha, hora) => {
  if (!fecha || !hora) return null;
  try {
    const localDate = new Date(`${fecha}T${hora}:00`);
    if (isNaN(localDate.getTime())) return null;
    return localDate.toISOString();
  } catch {
    return null;
  }
};

const EstadoBadge = ({ estado }) => {
  // Determine color based on estado, fallback for unknown states
  let cls = "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"; // Default/Unknown
  const lowerEstado = estado?.toLowerCase() || "";
  if (lowerEstado === "pendiente") {
    cls =
      "bg-amber-100 text-amber-800 dark:bg-amber-600/50 dark:text-amber-100";
  } else if (lowerEstado === "atendida") {
    cls =
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-600/50 dark:text-emerald-100";
  } else if (lowerEstado === "cancelada") {
    cls = "bg-rose-100 text-rose-800 dark:bg-rose-600/50 dark:text-rose-100";
  }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {estado || "Desconocido"}
    </span>
  );
};

/* ========================= Página ========================= */
const Citas = () => {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(true); // Start loading initially
  const [msg, setMsg] = useState({ text: "", type: "info" }); // Use object for message + type

  // User UID - Replace with actual auth context or prop as needed
  const { user, logout } = useAuth();
  const userId = user?.user_id || user?.id || null;
  console.log("AUTH USER:", user);
  console.log("Logout function:", logout);
  console.log("USER UID:", userId);

  // Filtros state (no change)
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroNombre, setFiltroNombre] = useState("");

  // ✅ Function to fetch and process appointments
  const fetchCitas = useCallback(async () => {
    setLoading(true);
    setMsg({ text: "", type: "info" }); // Clear previous messages
    try {
      const apiResponse = await listarCitas(); // Call the GET endpoint

      // --- Robust Data Extraction ---
      let rawCitas = [];
      // Check if the response itself is the array
      if (Array.isArray(apiResponse)) {
        rawCitas = apiResponse;
        // Check if the response is an object with a 'citas' array property
      } else if (apiResponse && Array.isArray(apiResponse.citas)) {
        rawCitas = apiResponse.citas;
        // Check if the response is an object with a 'data' array property (common wrapper)
      } else if (apiResponse && Array.isArray(apiResponse.data)) {
        rawCitas = apiResponse.data;
      }
      // Add more checks here if your API might return data differently
      else {
        console.warn(
          "Unexpected data structure from listarCitas:",
          apiResponse
        );
        // Attempt to use the response directly if it's an object (edge case)
        // Or throw an error if it's definitely wrong
        if (typeof apiResponse === "object" && apiResponse !== null) {
          // Maybe it's a single appointment object? Or pagination? Handle specific cases.
          // For now, assume it's an error or empty
          console.error("Received object but expected array for appointments.");
          rawCitas = []; // Treat as empty
        } else {
          throw new Error("Formato de respuesta inesperado al listar citas.");
        }
      }

      // --- Map data to table structure ---
      const mappedCitas = rawCitas.map((c, i) => {
        console.log("Raw Cita Data:", c);
        // Parse date/time from Google Calendar format or custom format
        const startDateTime = c.start?.dateTime || c.fecha_inicio;
        const endDateTime = c.end?.dateTime || c.fecha_fin;
        const { fecha, hora } = parseISOToLocal(startDateTime);

        // Ensure unique ID, fallback if API doesn't provide one reliably
        const id = c.id_evento || c.id || `temp-${Date.now()}-${i}`;

        // Extract Google Meet link
        const meetLink = c.meet_link || "";

        return {
          id_evento: id,
          // Use standard properties or fallbacks
          nombre: c.nombre_evento || c.summary || `Cita ${id.substring(0, 5)}`,
          email:
            Array.isArray(c.asistentes) && c.asistentes.length > 0
              ? c.asistentes[0]
              : c.attendees?.[0]?.email || "",
          fecha: fecha,
          hora: hora,
          motivo: c.descripcion_evento || c.description || "Sin Motivo",
          estado: c.estado_cita || "Pendiente", // Default to 'Pendiente'
          meetLink: meetLink, // Add Meet link
          // Keep original ISO dates if needed for updates
          fecha_inicio: startDateTime,
          fecha_fin: endDateTime,
        };
      });

      setCitas(mappedCitas);
    } catch (e) {
      console.error("Error fetching citas:", e);
      // Display a user-friendly error message, avoid showing raw JSON/HTML
      setMsg({
        text: `❌ Error al cargar citas: ${e.message || "Error de conexión."}`,
        type: "error",
      });
      setCitas([]); // Clear data on error
    } finally {
      setLoading(false);
    }
  }, []); // Dependency array is empty as it fetches all citas

  // Initial fetch on component mount
  useEffect(() => {
    fetchCitas();
  }, [fetchCitas]);

  // ✅ Function to Update Appointment Status
  const actualizarEstado = async (id_evento, nuevoEstado) => {
    const citaActual = citas.find((c) => c.id_evento === id_evento);
    if (!citaActual) {
      setMsg({
        text: "❌ Error: No se encontró la cita para actualizar.",
        type: "error",
      });
      return;
    }

    // Use original ISO dates if available, otherwise reconstruct (might have timezone issues)
    const fechaHoraInicioISO =
      citaActual.fecha_y_hora_inicio_iso ||
      toDateTimeISO(citaActual.fecha, citaActual.hora);
    const fechaHoraFinISO =
      citaActual.fecha_y_hora_fin_iso || fechaHoraInicioISO; // Assume end = start if not provided

    if (!fechaHoraInicioISO || !fechaHoraFinISO) {
      setMsg({
        text: "❌ Error: Fecha/Hora inválida para la cita.",
        type: "error",
      });
      return;
    }

    // Prepare payload EXACTLY as the API expects
    const payload = {
      uid: userId, // Psychologist/Admin UID
      id_evento: id_evento,
      nombre_evento: citaActual.nombre,
      descripcion_evento: citaActual.motivo,
      fecha_inicio: fechaHoraInicioISO,
      fecha_fin: fechaHoraFinISO, // Adjust if API needs a different end time
      estado_cita: nuevoEstado,
      asistentes: [citaActual.email].filter(Boolean),
      // Add zona_horaria if the API requires it
    };

    setLoading(true); // Indicate activity
    setMsg({ text: "", type: "info" });
    try {
      console.log("Updating Cita Payload:", JSON.stringify(payload, null, 2));
      const response = await actualizarCita(payload);
      console.log("Cita updated successfully:", response);
      setMsg({
        text: `✅ Estado de cita actualizado a: ${nuevoEstado}`,
        type: "success",
      });
      fetchCitas(); // Reload data to show changes
    } catch (err) {
      setMsg({
        text: `❌ Error al actualizar cita: ${err.message}`,
        type: "error",
      });
      setLoading(false); // Stop loading on error
    }
    // setLoading(false); // Handled by fetchCitas in success case
  };

  // ✅ Function to Delete Appointment
  const handleEliminar = async (id_evento) => {
    if (
      !window.confirm(
        "¿Estás seguro de que deseas eliminar esta cita permanentemente?"
      )
    ) {
      return;
    }

    // Prepare payload as expected by the API (likely just the event ID)
    const payload = {
      // uid: USER_UID, // Include UID if required by the API
      id_evento: id_evento,
    };

    setLoading(true);
    setMsg({ text: "", type: "info" });
    try {
      console.log("Deleting Cita Payload:", JSON.stringify(payload, null, 2));
      await eliminarCita(payload);
      setMsg({ text: "✅ Cita eliminada correctamente.", type: "success" });
      fetchCitas(); // Reload data
    } catch (err) {
      setMsg({
        text: `❌ Error al eliminar cita: ${err.message}`,
        type: "error",
      });
      setLoading(false); // Stop loading on error
    }
    // setLoading(false); // Handled by fetchCitas in success case
  };

  // Filtros (no change)
  const limpiarFiltros = () => {
    /* ... */ setFiltroEstado("");
    setFiltroFecha("");
    setFiltroNombre("");
  };
  const citasFiltradas = useMemo(() => {
    /* ... */
    return [...citas]
      .filter(
        (c) =>
          c.nombre.toLowerCase().includes(filtroNombre.trim().toLowerCase()) &&
          (filtroEstado ? c.estado === filtroEstado : true) &&
          (filtroFecha ? c.fecha === filtroFecha : true)
      )
      .sort((a, b) => {
        const da = new Date(`${a.fecha}T${a.hora}`).getTime() || 0;
        const db = new Date(`${b.fecha}T${b.hora}`).getTime() || 0;
        return da - db;
      });
  }, [citas, filtroEstado, filtroFecha, filtroNombre]);
  const kpi = useMemo(() => {
    /* ... */
    const total = citas.length;
    const pendientes = citas.filter((c) => c.estado === "Pendiente").length;
    const atendidas = citas.filter((c) => c.estado === "Atendida").length;
    const canceladas = citas.filter((c) => c.estado === "Cancelada").length;
    return { total, pendientes, atendidas, canceladas };
  }, [citas]);

  // --- Render (Original Design) ---
  return (
    <div className="min-h-screen p-4 md:p-6 bg-violet-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-[1200px] rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-white dark:bg-gray-900 shadow">
        {/* Header */}
        <div className="px-5 md:px-6 py-4 md:py-5 rounded-t-2xl bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-200/60 dark:border-indigo-800/50">
          <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
            <span role="img" aria-label="calendar">
              📅
            </span>
            Citas Agendadas
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Gestiona y filtra tus citas.
          </p>
        </div>

        {/* Contenido */}
        <div className="p-5 md:p-6 space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* ... KPI divs ... */}
            <div className="kpi-card">
              <div className="kpi-title">Total</div>
              <div className="kpi-value text-indigo-700 dark:text-indigo-300">
                {kpi.total}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Pendientes</div>
              <div className="kpi-value text-amber-600 dark:text-amber-300">
                {kpi.pendientes}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Atendidas</div>
              <div className="kpi-value text-emerald-600 dark:text-emerald-300">
                {kpi.atendidas}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Canceladas</div>
              <div className="kpi-value text-rose-600 dark:text-rose-300">
                {kpi.canceladas}
              </div>
            </div>
          </div>
          {/* Filtros */}
          <div className="sm:hidden">
            {/* ... Botón Mostrar/Ocultar ... */}
            <button
              onClick={() => setMostrarFiltros((v) => !v)}
              className="filter-toggle-button"
            >
              {mostrarFiltros ? "Ocultar" : "Mostrar"} filtros
            </button>
          </div>
          <section
            className={`filter-section ${
              mostrarFiltros ? "" : "hidden sm:block"
            }`}
          >
            <div className="filter-controls">
              {/* Filtro Nombre */}
              <div className="filter-group">
                <label htmlFor="filtro-nombre-cita" className="filter-label">
                  Buscar nombre
                </label>
                <div className="relative">
                  <input
                    id="filtro-nombre-cita"
                    type="text"
                    value={filtroNombre}
                    onChange={(e) => setFiltroNombre(e.target.value)}
                    placeholder="Ej. Ana…"
                    className="filter-input-text"
                  />
                  <span className="filter-icon">🔎</span>
                </div>
              </div>
              {/* Filtro Estado */}
              <div className="filter-group">
                <label htmlFor="filtro-estado-cita" className="filter-label">
                  Estado
                </label>
                <select
                  id="filtro-estado-cita"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todos</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Atendida">Atendida</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>
              {/* Filtro Fecha */}
              <div className="filter-group">
                <label htmlFor="filtro-fecha-cita" className="filter-label">
                  Fecha
                </label>
                <input
                  id="filtro-fecha-cita"
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="filter-input-date"
                />
              </div>
              {/* Botón Limpiar */}
              <div className="ml-auto">
                <button
                  onClick={limpiarFiltros}
                  className="clear-filter-button"
                >
                  🔄 Limpiar
                </button>
              </div>
            </div>
          </section>
          {/* Message Area */}
          {msg.text && (
            <div
              className={`p-3 rounded-lg text-sm font-semibold ${
                msg.type === "error"
                  ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                  : msg.type === "success"
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
              }`}
            >
              {msg.text}
            </div>
          )}
          {/* Mensaje de Carga o Tabla de Citas */}
          {loading ? (
            <div className="loading-message"> Cargando citas... </div>
          ) : (
            <div className="table-container">
              <table className="appointments-table">
                <thead>
                  <tr>
                    {[
                      "Nombre",
                      "Fecha",
                      "Hora",
                      "Motivo",
                      "Reunión",
                      "Estado",
                      "Acciones",
                    ].map((h, i, arr) => (
                      <th
                        key={h}
                        className={`table-header ${
                          i === 0 ? "rounded-tl-xl" : ""
                        } ${i === arr.length - 1 ? "rounded-tr-xl" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {citasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="table-empty-message">
                        {citas.length === 0
                          ? "No hay citas registradas."
                          : "No hay citas que coincidan con los filtros."}
                      </td> 
                    </tr>
                  ) : (
                    citasFiltradas.map((cita) => (
                      <tr key={cita.id_evento} className="table-row">
                        <td className="table-cell">{cita.nombre}</td>
                        <td className="table-cell">{cita.fecha}</td>
                        <td className="table-cell">{cita.hora}</td>
                        <td className="table-cell">{cita.motivo}</td>
                        <td className="table-cell">
                          {cita.meetLink ? (
                            <a
                              href={cita.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="meet-link"
                              title="Abrir Google Meet"
                            >
                              📹 Unirse a la reunión
                            </a>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 text-xs">
                              Sin enlace
                            </span>
                          )}
                        </td>
                        <td className="table-cell">
                          <EstadoBadge estado={cita.estado} />
                        </td>
                        <td className="table-cell">
                          {/* Botones de Acciones */}
                          <div className="action-buttons">
                            {cita.estado !== "ATENDIDA" && (
                              <button
                                onClick={() =>
                                  actualizarEstado(cita.id_evento, "ATENDIDA")
                                }
                                disabled={loading}
                                className="action-button attend-button"
                              >
                                ✓ Atendida
                              </button>
                            )}
                            {cita.estado !== "CANCELADA" && (
                              <button
                                onClick={() =>
                                  actualizarEstado(cita.id_evento, "CANCELADA")
                                }
                                disabled={loading}
                                className="action-button cancel-button"
                              >
                                ✕ Cancelar
                              </button>
                            )}
                            {cita.estado !== "PENDIENTE" && (
                              <button
                                onClick={() =>
                                  actualizarEstado(cita.id_evento, "PENDIENTE")
                                }
                                disabled={loading}
                                className="action-button pending-button"
                              >
                                ⌛ Pendiente
                              </button>
                            )}
                            <button
                              onClick={() => handleEliminar(cita.id_evento)}
                              disabled={loading}
                              className="action-button delete-button"
                              title="Eliminar Cita"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {/* Basic Styles - Move to global CSS */}
      <style>{`
          .kpi-card { border-radius: 0.75rem; border: 1px solid #e5e7eb; padding: 0.75rem; }
          .dark .kpi-card { border-color: #374151; }
          .kpi-title { font-size: 0.75rem; color: #6b7280; } .dark .kpi-title { color: #9ca3af; }
          .kpi-value { font-size: 1.5rem; font-weight: 700; margin-top: 0.25rem; } .dark .kpi-value { color: white; }
          .filter-toggle-button { width: 100%; padding: 0.5rem 1rem; border-radius: 0.375rem; background-color: #4f46e5; color: white; }
          .filter-section { border-radius: 0.75rem; border: 1px solid #e5e7eb; padding: 1rem; } .dark .filter-section { border-color: #374151; }
          .filter-controls { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.75rem; }
          .filter-group { flex: 1; min-width: 180px; }
          .filter-label { display: block; font-size: 0.75rem; margin-bottom: 0.25rem; }
          .filter-input-text, .filter-select, .filter-input-date { width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.375rem; border: 1px solid #d1d5db; background-color: white; font-size: 0.875rem; }
          .dark .filter-input-text, .dark .filter-select, .dark .filter-input-date { border-color: #4b5563; background-color: #374151; color: white; }
          .filter-input-text { padding-left: 2.25rem; } .filter-icon { position: absolute; left: 0.5rem; top: 50%; transform: translateY(-50%); opacity: 0.6; }
          .clear-filter-button { padding: 0.5rem 0.75rem; border-radius: 0.375rem; background-color: #e5e7eb; font-size: 0.875rem; } .dark .clear-filter-button { background-color: #4b5563; }
          .loading-message { text-align: center; padding: 1rem; color: #4f46e5; } .dark .loading-message { color: #a5b4fc; }
          .table-container { width: 100%; overflow-x: auto; border-radius: 0.75rem; border: 1px solid #e5e7eb; } .dark .table-container { border-color: #374151; }
          .appointments-table { min-width: 900px; width: 100%; font-size: 0.875rem; border-collapse: separate; border-spacing: 0; }
          .appointments-table thead { background-color: #f3f4f6; text-align: left; } .dark .appointments-table thead { background-color: #374151; }
          .table-header { padding: 0.5rem 1rem; font-weight: 600; border-bottom: 1px solid #e5e7eb; } .dark .table-header { border-color: #4b5563; }
          .table-row:nth-child(odd) { background-color: white; } .table-row:nth-child(even) { background-color: #f9fafb; }
          .dark .table-row:nth-child(odd) { background-color: #1f2937; } .dark .table-row:nth-child(even) { background-color: #374151; }
          .table-row:hover { background-color: #eff6ff; } .dark .table-row:hover { background-color: #1e3a8a; }
          .table-cell { padding: 0.5rem 1rem; border-bottom: 1px solid #e5e7eb; } .dark .table-cell { border-color: #4b5563; }
          .table-empty-message { padding: 1.5rem 1rem; text-align: center; color: #6b7280; } .dark .table-empty-message { color: #9ca3af; }
          .meet-link { display: inline-flex; align-items: center; gap: 0.25rem; color: #4f46e5; font-weight: 600; font-size: 0.875rem; text-decoration: none; transition: color 0.2s; }
          .meet-link:hover { color: #6366f1; text-decoration: underline; }
          .dark .meet-link { color: #818cf8; }
          .dark .meet-link:hover { color: #a5b4fc; }
          .action-buttons { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
          .action-button { display: inline-flex; align-items: center; justify-content: center; gap: 0.25rem; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); transition: background-color 0.2s; color: white; border: none; cursor: pointer; }
          .action-button:disabled { opacity: 0.5; cursor: not-allowed; }
          .attend-button { background-color: #10b981; } .attend-button:hover { background-color: #059669; }
          .cancel-button { background-color: #ef4444; } .cancel-button:hover { background-color: #dc2626; }
          .pending-button { background-color: #f59e0b; } .pending-button:hover { background-color: #d97706; }
          .delete-button { background-color: #6b7280; } .delete-button:hover { background-color: #4b5563; }
       `}</style>
    </div>
  );
};

export default Citas;
