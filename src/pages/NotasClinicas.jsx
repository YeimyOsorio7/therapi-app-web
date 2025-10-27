import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import ThemeToggle from "../components/ThemeToggle";
import {
  getAllNotasClinicas,
  getNotaClinicaById,
  getAllPacientes,
} from "../services/api";

// utils
function formatFecha(raw) {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return String(raw);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const anio = d.getFullYear();
  const hora = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dia}/${mes}/${anio} ${hora}:${min}`;
}

// ID único visible para cada nota
function generarUidNota() {
  return (
    "nota_" +
    Math.random().toString(36).substring(2, 10) +
    Date.now().toString(36)
  );
}

export default function NotasClinicas() {
  // ====== estado pacientes ======
  // pacientes[]: { uidPaciente, nombrePaciente }
  const [pacientes, setPacientes] = useState([]);

  // diccionario rapido UID -> nombre para lookup
  const mapPacientesByUid = useMemo(() => {
    const map = {};
    for (const p of pacientes) {
      if (p.uidPaciente) {
        map[p.uidPaciente] = p.nombrePaciente || p.uidPaciente;
      }
    }
    return map;
  }, [pacientes]);

  const [notas, setNotas] = useState([]);
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [errorNotas, setErrorNotas] = useState("");

  // ====== modal ======
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [notaDetalle, setNotaDetalle] = useState(null);
  const [modalError, setModalError] = useState("");

  // ====== control de carga inicial ======
  const [pacientesCargados, setPacientesCargados] = useState(false);
  const [notasCargadas, setNotasCargadas] = useState(false);
  
  // useRef para prevenir ejecuciones duplicadas en StrictMode
  const pacientesInitialized = useRef(false);
  const notasInitialized = useRef(false);

  // --------------------------------------------------
  // 1. Cargar pacientes para el buscador (solo una vez)
  // --------------------------------------------------
  useEffect(() => {
    // Prevenir ejecución duplicada en StrictMode
    if (pacientesInitialized.current) return;
    pacientesInitialized.current = true;
    
    if (pacientesCargados) return; // Evitar carga duplicada

    const cargarPacientes = async () => {
      try {
        const resp = await getAllPacientes();

        const lista = Array.isArray(resp)
          ? resp.map((p) => ({
              uidPaciente:
                p.uid,
              nombrePaciente:
                p.nombre || "miau"
            }))
          : [];

        const limpia = lista.filter(
          (p) => p.uidPaciente && p.nombrePaciente
        );

        setPacientes(limpia);
        setPacientesCargados(true);
      } catch (err) {
        console.warn(
          "No pude cargar la lista de pacientes. Revisa getAllPacientes().",
          err
        );

        setPacientesCargados(true);
      }
    };

    cargarPacientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo se ejecuta una vez al montar el componente

  // --------------------------------------------------
  // 3. Cargar notas clínicas existentes (solo cuando hay pacientes cargados)
  // --------------------------------------------------
  useEffect(() => {
    // Prevenir ejecución duplicada en StrictMode
    if (notasInitialized.current) return;
    
    // Evitar múltiples cargas
    if (notasCargadas || !pacientesCargados) {
      return;
    }

    notasInitialized.current = true;

    const cargarNotas = async () => {
      setLoadingNotas(true);
      setErrorNotas("");

      try {
        const resp = await getAllNotasClinicas();
        
        // El endpoint devuelve: { success, total, reportes: [...] }
        let listaReportes = [];
        if (resp && Array.isArray(resp.reportes)) {
          listaReportes = resp.reportes;
        } else if (Array.isArray(resp)) {
          listaReportes = resp;
        } else if (resp && Array.isArray(resp.notas)) {
          listaReportes = resp.notas;
        }

        // Mapear los reportes al formato interno
        const notasMapeadas = listaReportes.map((item) => {
          // UID del paciente dueño de la nota
          const pacienteUid = item.usuario_info?.uid || item.uid || item.user_id || "";

          // Nombre del paciente desde usuario_info o del mapa de pacientes
          const nombrePaciente = 
            item.usuario_info?.usuario || 
            mapPacientesByUid[pacienteUid] || 
            pacienteUid || 
            "—";

          return {
            note_uid: item.uid || item.id || item.note_id || generarUidNota(),
            user_id: pacienteUid,
            paciente_nombre: nombrePaciente,
            fecha_generacion: item.fecha_generacion || "",
            tipo_reporte: item.tipo || item.tipo_reporte || "",
            transtorno_posible: item.transtorno_posible || "",
            contenido_reporte: item.contenido_reporte || "",
            recomendaciones_reporte: item.recomendaciones_reporte || "",
            diagnostico_reporte: item.diagnostico_reporte || "",
          };
        });

        // orden cronológico descendente
        notasMapeadas.sort((a, b) => {
          const ta = new Date(a.fecha_generacion).getTime() || 0;
          const tb = new Date(b.fecha_generacion).getTime() || 0;
          return tb - ta;
        });

        setNotas(notasMapeadas);
        setNotasCargadas(true);
      } catch (errList) {
        console.error("Error al cargar notas clínicas:", errList);
        setErrorNotas(
          "Hubo un problema al listar las notas. " + (errList?.message || "Error desconocido")
        );
        setNotas([]);
        setNotasCargadas(true);
      } finally {
        setLoadingNotas(false);
      }
    };

    cargarNotas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacientesCargados]); // Solo se ejecuta cuando los pacientes ya están cargados

  // --------------------------------------------------
  // 4. Abrir nota en modal
  // --------------------------------------------------
  const abrirNota = useCallback(
    async (noteUidVisible) => {
      setShowModal(true);
      setModalLoading(true);
      setNotaDetalle(null);
      setModalError("");

      try {
        const enMemoria = notas.find((n) => n.note_uid === noteUidVisible);

        if (enMemoria) {
          // Usar la nota que ya tenemos en memoria
          setNotaDetalle(enMemoria);
        } else {
          // Si no está en memoria, intentar obtenerla del backend
          try {
            const resp = await getNotaClinicaById({ uid: noteUidVisible });
            const raw = resp?.nota || resp?.reporte || resp || {};

            const pacienteUid = raw.usuario_info?.uid || raw.uid || raw.user_id || "—";
            const nombrePaciente =
              raw.usuario_info?.usuario || 
              mapPacientesByUid[pacienteUid] || 
              pacienteUid || 
              "—";

            setNotaDetalle({
              note_uid: raw.uid || raw.id || raw.note_id || noteUidVisible,
              user_id: pacienteUid,
              paciente_nombre: nombrePaciente,
              fecha_generacion: raw.fecha_generacion || "",
              tipo_reporte: raw.tipo || raw.tipo_reporte || "",
              transtorno_posible: raw.transtorno_posible || "—",
              contenido_reporte: raw.contenido_reporte || "—",
              recomendaciones_reporte: raw.recomendaciones_reporte || "—",
              diagnostico_reporte: raw.diagnostico_reporte || "",
            });
          } catch (err) {
            console.error("Error al obtener nota del backend:", err);
            setModalError(
              "No se pudo cargar el detalle de la nota desde el servidor."
            );
          }
        }
      } catch (err) {
        console.error("Error al abrir nota:", err);
        setModalError(
          err?.message ||
            "Ocurrió un error al cargar el detalle de la nota clínica."
        );
      } finally {
        setModalLoading(false);
      }
    },
    [notas, mapPacientesByUid]
  );

  const cerrarModal = () => {
    setShowModal(false);
    setNotaDetalle(null);
    setModalError("");
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-purple-100 to-teal-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">

      <main className="flex-1 w-full pt-8 px-4 pb-24 max-w-7xl mx-auto text-gray-800 dark:text-gray-100">
        
        {/* LISTA DE NOTAS - Ahora ocupa todo el ancho */}
        <section className="w-full">
          <div className="bg-white/80 dark:bg-gray-800/70 backdrop-blur-xl shadow-2xl border border-white/50 dark:border-gray-700/50 rounded-3xl p-6 md:p-8">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-2">
                  📋 Notas Clínicas
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Historial completo de reportes y evaluaciones clínicas
                </p>
              </div>
              <ThemeToggle />
            </div>

            {loadingNotas ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  Cargando notas clínicas...
                </p>
              </div>
            ) : (
              <>
                {errorNotas && (
                  <div className="rounded-xl border border-red-400/40 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 px-6 py-4 text-sm mb-6">
                    {errorNotas}
                  </div>
                )}

                {notas.length === 0 ? (
                  <div className="text-center py-16">
                    <svg className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400">
                      No hay notas clínicas registradas todavía.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notas.map((n, idx) => (
                      <div
                        key={idx}
                        className="bg-white/60 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-700/60 rounded-2xl p-5 hover:shadow-lg hover:border-indigo-300/60 dark:hover:border-indigo-600/60 transition-all duration-300"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          {/* Información principal */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-3 mb-3">
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-300/40 dark:border-indigo-700/40 whitespace-nowrap">
                                {n.tipo_reporte || "—"}
                              </span>
                              <div className="flex-1">
                                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">
                                  {n.transtorno_posible || "Sin especificar"}
                                </h3>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    {n.paciente_nombre || mapPacientesByUid[n.user_id] || n.user_id || "—"}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {formatFecha(n.fecha_generacion)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="prose prose-sm dark:prose-invert max-w-none line-clamp-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                              <ReactMarkdown>
                                {n.contenido_reporte || "—"}
                              </ReactMarkdown>
                            </div>
                          </div>

                          {/* Botón ver más */}
                          <button
                            onClick={() => abrirNota(n.note_uid)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors whitespace-nowrap"
                          >
                            Ver detalle
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      {/* MODAL DETALLE */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-white/40 dark:border-gray-700/50 p-6 relative flex flex-col">
            <button
              onClick={cerrarModal}
              className="absolute top-3 right-3 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-semibold z-10"
            >
              ✕
            </button>

            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">
              Detalle de Nota Clínica
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Información completa, uso interno.
            </p>

            {modalLoading ? (
              <div className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
                Cargando información de la nota...
              </div>
            ) : modalError ? (
              <div className="rounded-lg border border-red-400/40 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 px-4 py-3 text-sm">
                {modalError}
              </div>
            ) : !notaDetalle ? (
              <div className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
                Nota no disponible.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
                {/* Información General en Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400">
                      ID Nota
                    </span>
                    <p className="text-sm text-gray-800 dark:text-gray-100 mt-1 break-all">
                      {notaDetalle.note_uid || "—"}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400">
                      Paciente
                    </span>
                    <p className="text-sm text-gray-800 dark:text-gray-100 mt-1">
                      {notaDetalle.paciente_nombre
                        ? `${notaDetalle.paciente_nombre}`
                        : `${mapPacientesByUid[notaDetalle.user_id] || "—"}`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 break-all">
                      {notaDetalle.user_id || "—"}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400">
                      Fecha de Generación
                    </span>
                    <p className="text-sm text-gray-800 dark:text-gray-100 mt-1">
                      {formatFecha(notaDetalle.fecha_generacion)}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400">
                      Tipo de Reporte
                    </span>
                    <p className="text-sm mt-1">
                      <span className="inline-block text-xs px-3 py-1 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-300/40 dark:border-indigo-700/40 font-medium">
                        {notaDetalle.tipo_reporte || "—"}
                      </span>
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <span className="text-[10px] uppercase font-semibold text-gray-500 dark:text-gray-400">
                      Posible Trastorno
                    </span>
                    <p className="text-sm text-gray-800 dark:text-gray-100 mt-1">
                      {notaDetalle.transtorno_posible || "—"}
                    </p>
                  </div>
                </div>

                {/* Contenido del Reporte */}
                <div className="p-4 bg-white dark:bg-gray-900/20 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Contenido del Reporte Clínico
                  </h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    <ReactMarkdown>
                      {notaDetalle.contenido_reporte || "—"}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Diagnóstico (si existe) */}
                {notaDetalle.diagnostico_reporte && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200/50 dark:border-amber-700/30">
                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Diagnóstico
                    </h4>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
                      <ReactMarkdown>
                        {notaDetalle.diagnostico_reporte}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Recomendaciones */}
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200/50 dark:border-emerald-700/30">
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    Recomendaciones / Plan de Tratamiento
                  </h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-emerald-900 dark:text-emerald-100 leading-relaxed">
                    <ReactMarkdown>
                      {notaDetalle.recomendaciones_reporte || "—"}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={cerrarModal}
                className="text-sm font-semibold rounded-xl px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="text-center text-[11px] text-gray-500 dark:text-gray-500 pb-4">
        Información sensible. Uso exclusivamente terapéutico.
      </footer>

      {/* Estilos para scrollbar personalizado */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.5);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.4);
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.6);
        }
      `}</style>
    </div>
  );
}
