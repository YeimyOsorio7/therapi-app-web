// src/pages/Citas.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
// ✅ Importamos todas las funciones de API de citas
import { getPacienteInfo, actualizarCita } from "../services/api"; 

/* ========================= Utils ========================= */
const toDateTime = (fecha, hora) => {
  if (!fecha) return null;
  try {
    const [y, m, d] = fecha.split("-").map(Number);
    const [hh = 0, mm = 0] = (hora || "00:00").split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm);
  } catch {
    return null;
  }
};

const EstadoBadge = ({ estado }) => {
  const cls =
    estado === "Pendiente"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-600 dark:text-amber-100"
      : estado === "Atendida"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-600 dark:text-emerald-100"
      : "bg-rose-100 text-rose-800 dark:bg-rose-600 dark:text-rose-100";
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {estado}
    </span>
  );
};

/* ========================= Página ========================= */
const Citas = () => {
  // ✅ CAMBIO 1: Inicializamos vacíos, los datos vendrán de la API
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Constante temporal para el UID del usuario logueado (REEMPLAZAR CON EL CONTEXTO DE AUTENTICACIÓN)
  const USER_UID = "Y30Kn8UXBj8gpCNDUuQd"; 

  // filtros
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroNombre, setFiltroNombre] = useState("");
  
  // Función de API para obtener citas
  const fetchCitas = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      // ✅ CORRECCIÓN: Usamos getPacienteInfo (ahora con GET) para traer los datos del paciente/citas
      const data = await getPacienteInfo({ uid: USER_UID }); 
      
      // NOTA: Asumimos que data contiene una propiedad "citas" o es un arreglo de citas. 
      // Si la API devuelve un objeto, ajusta "data.citas" a la clave correcta.
      const rawCitas = data.citas || data; 

      const mappedCitas = rawCitas.map((c, i) => ({
        // Usamos el ID del evento o un índice temporal como clave de identificación
        id_evento: c.id_evento || `temp-${i}`, 
        nombre: c.nombre_evento || c.nombre_paciente || 'N/A', 
        email: c.asistentes ? c.asistentes[0] : '',
        // Asumimos que tu API devuelve la fecha en formato ISO, como en tu JSON de ejemplo
        fecha: c.fecha_y_hora_inicio ? c.fecha_y_hora_inicio.split('T')[0] : 'N/A',
        hora: c.fecha_y_hora_inicio ? c.fecha_y_hora_inicio.split('T')[1].substring(0, 5) : 'N/A',
        motivo: c.descripcion_evento || 'Sin motivo',
        estado: c.estado_cita || 'Pendiente', 
      }));

      setCitas(mappedCitas);
    } catch (e) {
      setMsg(`❌ Error al cargar citas: ${e.message}. El backend solo acepta peticiones GET para esta ruta.`);
      setCitas([]);
    } finally {
      setLoading(false);
    }
  }, [USER_UID]);

  // ✅ Llamada inicial a la API
  useEffect(() => {
    fetchCitas();
  }, [fetchCitas]);


  const actualizarEstado = async (id_evento, nuevoEstado) => {
    setLoading(true);
    setMsg("");
    const citaActual = citas.find(c => c.id_evento === id_evento);
    
    if (!citaActual) return;

    try {
      // Preparamos el payload para actualizar (usando las fechas en formato ISO)
      const payload = {
        uid: USER_UID, // Requerido por el API
        id_evento: id_evento,
        nombre_evento: citaActual.nombre,
        descripcion_evento: citaActual.motivo,
        fecha_y_hora_inicio: toDateTime(citaActual.fecha, citaActual.hora).toISOString(), 
        fecha_y_hora_fin: toDateTime(citaActual.fecha, citaActual.hora).toISOString(), 
        estado_cita: nuevoEstado, 
        asistentes: [citaActual.email], 
      };

      await actualizarCita(payload);
      setMsg(`✅ Estado de cita actualizado a: ${nuevoEstado}`);
      fetchCitas(); // Recargar datos de la API para mostrar el cambio
    } catch (err) {
      setMsg(`❌ Error al actualizar cita: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };


  const limpiarFiltros = () => {
    setFiltroEstado("");
    setFiltroFecha("");
    setFiltroNombre("");
  };

  const citasFiltradas = useMemo(() => {
    const byNombre = (c) =>
      c.nombre.toLowerCase().includes(filtroNombre.trim().toLowerCase());

    const byEstado = (c) => (filtroEstado ? c.estado === filtroEstado : true);

    const byFecha = (c) => (filtroFecha ? c.fecha === filtroFecha : true);

    return [...citas]
      .filter((c) => byNombre(c) && byEstado(c) && byFecha(c))
      // ordenar por fecha+hora (próximas primero)
      .sort((a, b) => {
        const da = toDateTime(a.fecha, a.hora)?.getTime() || 0;
        const db = toDateTime(b.fecha, b.hora)?.getTime() || 0;
        return da - db;
      });
  }, [citas, filtroEstado, filtroFecha, filtroNombre]);

  // KPIs rápidos
  const kpi = useMemo(() => {
    const total = citas.length;
    const pendientes = citas.filter((c) => c.estado === "Pendiente").length;
    const atendidas = citas.filter((c) => c.estado === "Atendida").length;
    const canceladas = citas.filter((c) => c.estado === "Cancelada").length;
    return { total, pendientes, atendidas, canceladas };
  }, [citas]);

  return (
    <div className="min-h-screen p-4 md:p-6 bg-violet-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-[1200px] rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-white dark:bg-gray-900 shadow">
        {/* Header */}
        <div className="px-5 md:px-6 py-4 md:py-5 rounded-t-2xl bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-200/60 dark:border-indigo-800/50">
          <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
            <span role="img" aria-label="calendar">📅</span> Citas Agendadas
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Gestiona y filtra tus citas. Datos cargados desde el servidor.
          </p>
        </div>

        {/* Contenido */}
        <div className="p-5 md:p-6 space-y-6">
          {msg && (
            <div className={`p-3 rounded-lg text-sm font-semibold ${msg.startsWith('❌') ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
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

          {/* Filtros */}
          <div className="sm:hidden">
            <button
              onClick={() => setMostrarFiltros((v) => !v)}
              className="w-full px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {mostrarFiltros ? "Ocultar filtros" : "Mostrar filtros"}
            </button>
          </div>

          <section
            className={`rounded-xl border border-gray-200 dark:border-gray-700 p-4 ${
              mostrarFiltros ? "" : "hidden sm:block"
            }`}
          >
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs mb-1">Buscar por nombre</label>
                <div className="relative">
                  <input
                    type="text"
                    value={filtroNombre}
                    onChange={(e) => setFiltroNombre(e.target.value)}
                    placeholder="Ej. Ana, Carlos…"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                  />
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 opacity-60">🔎</span>
                </div>
              </div>

              <div className="min-w-[180px]">
                <label className="block text-xs mb-1">Estado</label>
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="">Todos</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Atendida">Atendida</option>
                  <option value="Cancelada">Cancelada</option>
                </select>
              </div>

              <div className="min-w-[180px]">
                <label className="block text-xs mb-1">Fecha</label>
                <input
                  type="date"
                  value={filtroFecha}
                  onChange={(e) => setFiltroFecha(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                />
              </div>

              <div className="ml-auto">
                <button
                  onClick={limpiarFiltros}
                  className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm"
                >
                  🔄 Limpiar
                </button>
              </div>
            </div>
          </section>
          
          {/* Mensaje de carga */}
          {loading && (
            <div className="text-center p-4 text-indigo-600 dark:text-indigo-300">
              Cargando citas del servidor...
            </div>
          )}

          {/* Tabla */}
          <div className="w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-[900px] w-full text-sm border-separate border-spacing-0">
              <thead className="bg-gray-100 dark:bg-gray-800 text-left">
                <tr>
                  {["Nombre", "Fecha", "Hora", "Motivo", "Estado", "Acciones"].map((h, i, arr) => (
                    <th
                      key={h}
                      className={`px-4 py-2 font-semibold border-b border-gray-200 dark:border-gray-700 ${
                        i === 0 ? "rounded-tl-xl" : ""
                      } ${i === arr.length - 1 ? "rounded-tr-xl" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900">
                {citasFiltradas.length === 0 && !loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                    >
                      No hay citas que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  citasFiltradas.map((cita, i) => (
                    <tr
                      key={cita.id_evento || i}
                      className="odd:bg-white even:bg-gray-50 odd:dark:bg-gray-900 even:dark:bg-gray-800"
                    >
                      <td className="px-4 py-2">{cita.nombre}</td>
                      <td className="px-4 py-2">{cita.fecha}</td>
                      <td className="px-4 py-2">{cita.hora}</td>
                      <td className="px-4 py-2">{cita.motivo}</td>
                      <td className="px-4 py-2">
                        <EstadoBadge estado={cita.estado} />
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          {cita.estado !== "Atendida" && (
                            <button
                              onClick={() => actualizarEstado(cita.id_evento, "Atendida")}
                              disabled={loading}
                              className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow transition disabled:opacity-50"
                            >
                              ✓ Atendida
                            </button>
                          )}
                          {cita.estado !== "Cancelada" && (
                            <button
                              onClick={() => actualizarEstado(cita.id_evento, "Cancelada")}
                              disabled={loading}
                              className="inline-flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow transition disabled:opacity-50"
                            >
                              ✕ Cancelar
                            </button>
                          )}
                          {cita.estado !== "Pendiente" && (
                            <button
                              onClick={() => actualizarEstado(cita.id_evento, "Pendiente")}
                              disabled={loading}
                              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow transition disabled:opacity-50"
                            >
                              ⌛ Pendiente
                            </button>
                          )}
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