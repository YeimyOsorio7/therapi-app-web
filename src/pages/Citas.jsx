// src/pages/Citas.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
// ✅ Importamos las funciones CORRECTAS de API de citas
import { listarCitas, actualizarCita, eliminarCita } from "../services/api";

/* ========================= Utils (sin cambios) ========================= */
const toDateTime = (fecha, hora) => {
  if (!fecha) return null;
  try {
    // Intenta parsear YYYY-MM-DD
    if (fecha.includes('-')) {
        const [y, m, d] = fecha.split("-").map(Number);
        const [hh = 0, mm = 0] = (hora || "00:00").split(":").map(Number);
        return new Date(y, m - 1, d, hh, mm);
    }
    // Añade otros formatos si es necesario
    return null; // O devuelve new Date(fecha) si es un formato estándar
  } catch(e) {
    console.error("Error parsing date/time:", fecha, hora, e);
    return null;
  }
};

const EstadoBadge = ({ estado }) => {
  const cls =
    estado === "Pendiente"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-600/50 dark:text-amber-100" // Ajustado dark mode
      : estado === "Atendida"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-600/50 dark:text-emerald-100" // Ajustado dark mode
      : "bg-rose-100 text-rose-800 dark:bg-rose-600/50 dark:text-rose-100"; // Ajustado dark mode
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {estado || 'Desconocido'} {/* Añadido fallback */}
    </span>
  );
};

/* ========================= Página ========================= */
const Citas = () => {
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Constante temporal (REEMPLAZAR CON AUTENTICACIÓN REAL)
  const USER_UID = "Y30Kn8UXBj8gpCNDUuQd"; // Ejemplo, debería venir del contexto de Auth

  // filtros (sin cambios)
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroNombre, setFiltroNombre] = useState("");

  // ✅ FUNCIÓN PARA CARGAR CITAS (CORREGIDA)
  const fetchCitas = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      // Usamos la nueva función 'listarCitas' que hace GET
      const data = await listarCitas();

      // Verifica la estructura de la respuesta de 'listar_citas_consultorio'
      // Asumimos que devuelve un array directamente o un objeto con una propiedad 'citas'
      let rawCitas = [];
      if (Array.isArray(data)) {
        rawCitas = data;
      } else if (data && Array.isArray(data.citas)) { // Ajusta 'citas' si la clave es diferente
        rawCitas = data.citas;
      } else {
        throw new Error("Formato de respuesta inesperado al listar citas.");
      }

      // Mapea los datos recibidos a la estructura que usa la tabla
      const mappedCitas = rawCitas.map((c, i) => {
         // Intenta obtener fecha y hora
         let fecha = 'N/A', hora = 'N/A';
         if (c.fecha_y_hora_inicio) {
            try {
                const dateTime = new Date(c.fecha_y_hora_inicio); // Intenta parsear directamente
                if (!isNaN(dateTime.getTime())) {
                    fecha = dateTime.toISOString().split('T')[0];
                    hora = dateTime.toTimeString().substring(0, 5);
                }
            } catch (e) {
                 console.warn("Could not parse date:", c.fecha_y_hora_inicio);
            }
         }

         return {
            id_evento: c.id_evento || `temp-${Date.now()}-${i}`, // Asegura ID único
            nombre: c.nombre_evento || c.summary || 'Sin Nombre', // Ajusta claves según tu API
            email: Array.isArray(c.asistentes) ? c.asistentes[0] : (c.attendees ? c.attendees[0]?.email : ''), // Ajusta claves
            fecha: fecha,
            hora: hora,
            motivo: c.descripcion_evento || c.description || 'Sin Motivo', // Ajusta claves
            estado: c.estado_cita || 'Pendiente', // Asume Pendiente si no hay estado
         }
      });

      setCitas(mappedCitas);
    } catch (e) {
      setMsg(`❌ Error al cargar citas: ${e.message}`);
      setCitas([]); // Limpia las citas en caso de error
    } finally {
      setLoading(false);
    }
  }, []); // No depende de USER_UID si lista todas las citas

  // Carga inicial
  useEffect(() => {
    fetchCitas();
  }, [fetchCitas]);


  // FUNCIÓN PARA ACTUALIZAR ESTADO (sin cambios lógicos, usa 'actualizarCita')
  const actualizarEstado = async (id_evento, nuevoEstado) => {
    // Busca la cita en el estado actual para obtener todos sus datos
    const citaActual = citas.find(c => c.id_evento === id_evento);
    if (!citaActual) {
        setMsg("❌ Error: No se encontró la cita para actualizar.");
        return;
    }

    // Intenta reconstruir fecha y hora ISO
    const fechaHoraInicioISO = toDateTime(citaActual.fecha, citaActual.hora)?.toISOString();
    if (!fechaHoraInicioISO) {
        setMsg("❌ Error: Fecha/Hora inválida para la cita.");
        return;
    }

    // Prepara el payload EXACTO que espera tu endpoint 'actualizar_cita_consultorio'
    const payload = {
      uid: USER_UID, // Asumiendo que necesita el UID del psicólogo/admin
      id_evento: id_evento,
      nombre_evento: citaActual.nombre,
      descripcion_evento: citaActual.motivo,
      fecha_y_hora_inicio: fechaHoraInicioISO,
      fecha_y_hora_fin: fechaHoraInicioISO, // Asumiendo misma hora fin, ajusta si es necesario
      estado_cita: nuevoEstado,
      asistentes: [citaActual.email].filter(Boolean), // Envía email si existe
    };

    setLoading(true);
    setMsg("");
    try {
      await actualizarCita(payload);
      setMsg(`✅ Estado de cita actualizado a: ${nuevoEstado}`);
      // Vuelve a cargar todas las citas para reflejar el cambio
      fetchCitas();
    } catch (err) {
      setMsg(`❌ Error al actualizar cita: ${err.message}`);
      setLoading(false); // Detiene el loading si falla
    }
    // setLoading(false); // Se maneja en fetchCitas()
  };

  // ✅ NUEVA FUNCIÓN PARA ELIMINAR CITA
  const handleEliminar = async (id_evento) => {
    // Confirmación antes de eliminar
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta cita?")) {
      return;
    }

    // Prepara el payload que espera tu endpoint 'eliminar_cita_consultorio'
    // Usualmente solo necesita el ID del evento y quizás el UID del usuario
    const payload = {
        uid: USER_UID, // Asumiendo que necesita el UID
        id_evento: id_evento,
    };

    setLoading(true);
    setMsg("");
    try {
        await eliminarCita(payload);
        setMsg("✅ Cita eliminada correctamente.");
        // Vuelve a cargar las citas para quitar la eliminada
        fetchCitas();
    } catch (err) {
        setMsg(`❌ Error al eliminar cita: ${err.message}`);
        setLoading(false); // Detiene el loading si falla
    }
     // setLoading(false); // Se maneja en fetchCitas()
  };


  // Limpiar filtros (sin cambios)
  const limpiarFiltros = () => {
    setFiltroEstado(""); setFiltroFecha(""); setFiltroNombre("");
  };

  // Filtrado y Ordenación (sin cambios)
  const citasFiltradas = useMemo(() => {
    return [...citas]
      .filter((c) =>
        (c.nombre.toLowerCase().includes(filtroNombre.trim().toLowerCase())) &&
        (filtroEstado ? c.estado === filtroEstado : true) &&
        (filtroFecha ? c.fecha === filtroFecha : true)
      )
      .sort((a, b) => {
        const da = toDateTime(a.fecha, a.hora)?.getTime() || 0;
        const db = toDateTime(b.fecha, b.hora)?.getTime() || 0;
        return da - db; // Ordena de más antigua a más reciente
      });
  }, [citas, filtroEstado, filtroFecha, filtroNombre]);

  // KPIs (sin cambios)
  const kpi = useMemo(() => {
    const total = citas.length;
    const pendientes = citas.filter((c) => c.estado === "Pendiente").length;
    const atendidas = citas.filter((c) => c.estado === "Atendida").length;
    const canceladas = citas.filter((c) => c.estado === "Cancelada").length;
    return { total, pendientes, atendidas, canceladas };
  }, [citas]);

  // --- Renderizado (Diseño Original) ---
  return (
    // Contenedor principal
    <div className="min-h-screen p-4 md:p-6 bg-violet-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-[1200px] rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-white dark:bg-gray-900 shadow">
        {/* Encabezado */}
        <div className="px-5 md:px-6 py-4 md:py-5 rounded-t-2xl bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-200/60 dark:border-indigo-800/50">
          <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
            <span role="img" aria-label="calendar">📅</span> Citas Agendadas
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Gestiona y filtra tus citas.
          </p>
        </div>

        {/* Contenido */}
        <div className="p-5 md:p-6 space-y-6">
          {/* Mensaje de estado/error */}
          {msg && (
            <div className={`p-3 rounded-lg text-sm font-semibold ${msg.startsWith('❌') ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'}`}>
              {msg}
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
              <div className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300">{kpi.total}</div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">Pendientes</div>
              <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-300">{kpi.pendientes}</div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">Atendidas</div>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-300">{kpi.atendidas}</div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400">Canceladas</div>
              <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-300">{kpi.canceladas}</div>
            </div>
          </div>

          {/* Botón y Sección de Filtros */}
          <div className="sm:hidden">
            <button onClick={() => setMostrarFiltros((v) => !v)} className="w-full px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white">
              {mostrarFiltros ? "Ocultar filtros" : "Mostrar filtros"}
            </button>
          </div>
          <section className={`rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${ mostrarFiltros ? "" : "hidden sm:block" }`}>
            <div className="flex flex-wrap items-end gap-3">
              {/* Filtro Nombre */}
              <div className="flex-1 min-w-[220px]">
                <label htmlFor="filtro-nombre-cita" className="block text-xs mb-1">Buscar por nombre</label>
                <div className="relative">
                  <input id="filtro-nombre-cita" type="text" value={filtroNombre} onChange={(e) => setFiltroNombre(e.target.value)} placeholder="Ej. Ana, Carlos…" className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"/>
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 opacity-60">🔎</span>
                </div>
              </div>
              {/* Filtro Estado */}
              <div className="min-w-[180px]">
                <label htmlFor="filtro-estado-cita" className="block text-xs mb-1">Estado</label>
                <select id="filtro-estado-cita" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                  <option value="">Todos</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Atendida">Atendida</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>
              {/* Filtro Fecha */}
              <div className="min-w-[180px]">
                <label htmlFor="filtro-fecha-cita" className="block text-xs mb-1">Fecha</label>
                <input id="filtro-fecha-cita" type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"/>
              </div>
              {/* Botón Limpiar */}
              <div className="ml-auto">
                <button onClick={limpiarFiltros} className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm">
                  🔄 Limpiar
                </button>
              </div>
            </div>
          </section>

          {/* Mensaje de Carga */}
          {loading && (
            <div className="text-center p-4 text-indigo-600 dark:text-indigo-300">
              Cargando citas...
            </div>
          )}

          {/* Tabla de Citas */}
          <div className="w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-[900px] w-full text-sm border-separate border-spacing-0">
              <thead className="bg-gray-100 dark:bg-gray-800 text-left">
                <tr>
                  {["Nombre", "Fecha", "Hora", "Motivo", "Estado", "Acciones"].map((h, i, arr) => (
                    <th key={h} className={`px-4 py-2 font-semibold border-b border-gray-200 dark:border-gray-700 ${ i === 0 ? "rounded-tl-xl" : ""} ${i === arr.length - 1 ? "rounded-tr-xl" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900">
                {citasFiltradas.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      {citas.length === 0 ? "No hay citas registradas." : "No hay citas que coincidan con los filtros."}
                    </td>
                  </tr>
                ) : (
                  citasFiltradas.map((cita) => (
                    <tr key={cita.id_evento} className="odd:bg-white even:bg-gray-50 odd:dark:bg-gray-900 even:dark:bg-gray-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20">
                      <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">{cita.nombre}</td>
                      <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">{cita.fecha}</td>
                      <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">{cita.hora}</td>
                      <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">{cita.motivo}</td>
                      <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <EstadoBadge estado={cita.estado} />
                      </td>
                      <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        {/* --- Botones de Acciones --- */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          {cita.estado !== "Atendida" && (
                            <button onClick={() => actualizarEstado(cita.id_evento, "Atendida")} disabled={loading} className="inline-flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow transition disabled:opacity-50">
                              ✓ Atendida
                            </button>
                          )}
                          {cita.estado !== "Cancelada" && (
                            <button onClick={() => actualizarEstado(cita.id_evento, "Cancelada")} disabled={loading} className="inline-flex items-center justify-center gap-1 bg-rose-500 hover:bg-rose-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow transition disabled:opacity-50">
                              ✕ Cancelar
                            </button>
                          )}
                           {cita.estado !== "Pendiente" && (
                            <button onClick={() => actualizarEstado(cita.id_evento, "Pendiente")} disabled={loading} className="inline-flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow transition disabled:opacity-50">
                              ⌛ Pendiente
                            </button>
                          )}
                          {/* ✅ Botón para Eliminar */}
                          <button onClick={() => handleEliminar(cita.id_evento)} disabled={loading} className="inline-flex items-center justify-center gap-1 bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow transition disabled:opacity-50" title="Eliminar Cita">
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
        </div>
      </div>
    </div>
  );
};

export default Citas;