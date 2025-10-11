// src/pages/VerPacientes.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getAllPacientes, getPacienteInfo, getSigsaInfo, getFichaMedica } from "../services/api"; 

/* ==================== Utilidades ==================== */
const parseFecha = (str) => {
  if (!str) return null;
  if (str.includes('-')) {
    const d = new Date(str);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  const [d, m, y] = str.split("/").map(Number);
  return new Date(y, m - 1, d);
};
const formatISO = (d) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "";

const Check = ({ ok }) => (
  <span
    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[12px] ${
      ok
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-600/30 dark:text-emerald-200"
        : "bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
    }`}
    title={ok ? "Sí" : "No"}
  >
    {ok ? "✓" : "—"}
  </span>
);

const SexBadge = ({ sexo }) =>
  sexo === "H" ? (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
      Hombre
    </span>
  ) : (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-200">
      Mujer
    </span>
  );

/* ==================== Modal genérico ==================== */
const Modal = ({ open, onClose, children, title }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-y-auto max-h-[90vh]">
        <div className="sticky top-0 bg-white dark:bg-gray-900 flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 z-10">
          <h3 className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{title}</h3>
          <button onClick={onClose} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="Cerrar">
            ✖
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

/* ==================== Página ==================== */
const VerPacientes = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null); 
    
  const [query, setQuery] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ver/editar
  const [view, setView] = useState(null);
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState(null);
  // Estado para guardar los datos específicos del modal (SIGSA/Ficha)
  const [modalData, setModalData] = useState({ 
      sigsa: null, 
      ficha: null, 
      loading: false, 
      error: null 
  });


  // ✅ FUNCIÓN PARA CARGAR DATOS DE LA API (Robusta con manejo de errores)
  const fetchPacientes = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await getAllPacientes(); 

      // 🛑 VERIFICACIÓN CRÍTICA: Aseguramos que la respuesta sea un array antes de mapear
      if (!Array.isArray(data)) {
         // Este error se mostrará en pantalla si el servidor devuelve un 404 o un JSON mal formado
         throw new Error("El servidor no devolvió una lista de pacientes (Revisa POST /api/get_all_patients).");
      }

      const mappedData = data.map((p, index) => ({
        no: index + 1,
        historia: p.historia || p.dpi || p.ref_patient || '---', 
        fechaConsulta: p.fecha_consulta_iso || p.fecha_consulta || 'N/A', 
        nombre: p.nombre || `${p.nombre} ${p.apellido}`,
        dpi: p.dpi || p.cui || '---',
        nacimiento: p.fechaNacimiento || p.fecha_nacimiento || 'N/A', 
        edad: p.edad || 0,
        menorDe15: (p.edad && p.edad < 15) || false,
        adulto: (p.edad && p.edad >= 18) || false,
        sexo: p.sexo || p.genero,
        municipio: p.municipio || 'N/A',
        aldea: p.aldea || 'N/A',
        embarazo: { 
          menor: p.embarazo === '< 14 años' || false, 
          mayor: p.embarazo === '>= edad' || false, 
        },
        consulta: { 
          primera: p.tipo_consulta === 'Primera' || p.consulta === 'Primera vez' || false, 
          reconsulta: p.tipo_consulta === 'Reconsulta' || p.consulta === 'Control' || false, 
          emergencia: false 
        },
        diagnostico: p.patologia || p.diagnostico,
        cie10: p.codigo || p.cie10 || 'N/A',
        terapia: p.tipoTerapia || p.terapia || 'N/A',
      }));

      setRows(mappedData);
    } catch (e) {
      console.error("Error al cargar pacientes:", e);
      setFetchError(`❌ Error al cargar los datos: ${e.message || 'Error de conexión desconocido.'}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Llamar a la función de carga al inicio
  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  // ✅ NUEVO: Función para manejar la apertura del modal y la carga de datos específicos
  const handleViewPatient = async (patient) => {
    setView(patient); // Abre el modal con la información básica
    setModalData({ sigsa: null, ficha: null, loading: true, error: null });

    // Usamos el DPI como ID para la consulta (o el valor de historia)
    const filter = { dpi: patient.dpi || patient.historia }; 

    try {
        // Carga los datos de los tres endpoints de información específica
        const sigsaData = await getSigsaInfo(filter); 
        const fichaData = await getFichaMedica(filter);
        const pacienteData = await getPacienteInfo(filter); // Datos generales del paciente

        setModalData({
            sigsa: sigsaData,
            ficha: fichaData,
            paciente: pacienteData,
            loading: false,
            error: null
        });

    } catch(e) {
        setModalData({
            sigsa: null,
            ficha: null,
            paciente: null,
            loading: false,
            error: `Error al cargar detalles: ${e.message}`
        });
    }
  };

  const closeModal = () => {
    setView(null);
    setModalData({ sigsa: null, ficha: null, loading: false, error: null });
  }

  // límites de fechas sugeridos
  const minDate = useMemo(() => {
    const d = rows.map((p) => parseFecha(p.fechaConsulta)).filter(Boolean);
    return d.length ? formatISO(new Date(Math.min(...d))) : "";
  }, [rows]);

  const maxDate = useMemo(() => {
    const d = rows.map((p) => parseFecha(p.fechaConsulta)).filter(Boolean);
    return d.length ? formatISO(new Date(Math.max(...d))) : "";
  }, [rows]);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    const dDesde = desde ? new Date(desde) : null;
    const dHasta = hasta ? new Date(hasta) : null;

    return rows.filter((p) => {
      const tMatch =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        (p.diagnostico && p.diagnostico.toLowerCase().includes(q)) ||
        (p.cie10 && p.cie10.toLowerCase().includes(q));

      const f = parseFecha(p.fechaConsulta);
      const fMatch = (!dDesde || (f && f >= dDesde)) && (!dHasta || (f && f <= dHasta));

      return tMatch && fMatch;
    });
  }, [rows, query, desde, hasta]);

  const total = filtrados.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, lastPage) || 1;

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtrados.slice(start, start + pageSize);
  }, [filtrados, safePage, pageSize]);

  const resetFilters = () => {
    setQuery("");
    setDesde("");
    setHasta("");
    setPage(1);
  };

  /* --------- Edición inline --------- */
  const startEdit = (globalIndex) => {
    setEditId(globalIndex);
    setDraft(JSON.parse(JSON.stringify(rows[globalIndex])));
  };
  const cancelEdit = () => {
    setEditId(null);
    setDraft(null);
  };
  const saveEdit = () => {
    const updated = [...rows];
    updated[editId] = draft;
    setRows(updated);
    setEditId(null);
    setDraft(null);
  };

  // Helpers para mapear index de página -> index global en rows
  const idxGlobal = (idxPage) => (safePage - 1) * pageSize + idxPage;

  return (
    <div className="min-h-screen p-4 md:p-6 bg-violet-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-[1500px] rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-white dark:bg-gray-900 shadow">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-5 md:px-6 py-4 md:py-5 rounded-t-2xl bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-200/60 dark:border-indigo-800/50">
          <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
            <span role="img" aria-label="medico">👩‍⚕️</span> Lista de Pacientes
          </h1>

          {/* Toolbar (con botón de refresco) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar nombre, diagnóstico o CIE-10..."
                className="w-72 max-w-[60vw] pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 opacity-60">🔎</span>
            </div>

            <input
              type="date"
              value={desde}
              min={minDate || undefined}
              max={hasta || maxDate || undefined}
              onChange={(e) => {
                setDesde(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              title="Desde"
            />
            <input
              type="date"
              value={hasta}
              min={desde || minDate || undefined}
              max={maxDate || undefined}
              onChange={(e) => {
                setHasta(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              title="Hasta"
            />

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
              title="Tamaño de página"
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n} / pág.
                </option>
              ))}
            </select>
            
            {/* Botón de recargar datos */}
            <button
              onClick={fetchPacientes}
              disabled={loading}
              className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 text-sm"
              title="Recargar datos del servidor"
            >
              🔄 Recargar
            </button>

            <button
              onClick={resetFilters}
              className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm"
              title="Limpiar filtros"
            >
              🧹 Limpiar
            </button>
          </div>
        </div>
        
        {/* Mensaje de carga y error (Visible para evitar la pantalla en blanco) */}
        {fetchError && (
          <div className="p-4 text-center text-rose-700 bg-rose-50 dark:bg-rose-900/30 border-t border-rose-300">
            {fetchError}
          </div>
        )}
        {loading && !fetchError && (
          <div className="p-4 text-center text-indigo-700 dark:text-indigo-300">
            Cargando pacientes...
          </div>
        )}

        {/* Tabla */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white dark:from-gray-900 to-transparent rounded-bl-2xl" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white dark:from-gray-900 to-transparent rounded-br-2xl" />

          <div className="overflow-x-auto rounded-b-2xl">
            <table className="min-w-[1200px] w-full text-sm border-separate border-spacing-0">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-100 dark:bg-gray-800 text-left">
                  {[
                    "No.",
                    "N.º Historia Clínica",
                    "FECHA DE CONSULTA",
                    "Nombres y apellidos",
                    "DPI",
                    "FECHA DE NACIMIENTO",
                    "Edad",
                    "Niño < 15",
                    "Adulto",
                    "Sexo",
                    "Municipio",
                    "Aldea",
                    "< 14 AÑOS",
                    "≥ de edad",
                    "1 ra.",
                    "Re.",
                    "Em.",
                    "Diagnóstico",
                    "CIE-10",
                    "Terapia",
                    "Acciones",
                  ].map((h, i, arr) => (
                    <th
                      key={i}
                      className={`px-3 py-2 font-semibold border-b border-gray-200 dark:border-gray-700 ${
                        i === 0 ? "rounded-tl-2xl" : ""
                      } ${i === arr.length - 1 ? "rounded-tr-2xl" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {pageRows.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={21} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      {fetchError ? "Intenta recargar los datos." : "No se encontraron pacientes."}
                    </td>
                  </tr>
                ) : (
                  pageRows.map((p, idxPage) => {
                    const globalIndex = idxGlobal(idxPage);
                    const editing = editId === globalIndex;
                    const row = editing ? draft : p;

                    return (
                      <tr
                        key={globalIndex}
                        className="odd:bg-white even:bg-gray-50 odd:dark:bg-gray-900 even:dark:bg-gray-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors"
                      >
                        {/* No. */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">{row.no}</td>

                        {/* Historia */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editing ? (
                            <input
                              value={row.historia}
                              onChange={(e) => setDraft({ ...row, historia: e.target.value })}
                              className="w-24 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                            />
                          ) : (
                            row.historia
                          )}
                        </td>

                        {/* Fecha consulta */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editing ? (
                            <input
                              value={row.fechaConsulta}
                              onChange={(e) => setDraft({ ...row, fechaConsulta: e.target.value })}
                              placeholder="dd/mm/yyyy"
                              className="w-28 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                            />
                          ) : (
                            row.fechaConsulta
                          )}
                        </td>

                        {/* Nombre */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 whitespace-pre-line">
                          {editing ? (
                            <textarea
                              value={row.nombre}
                              onChange={(e) => setDraft({ ...row, nombre: e.target.value })}
                              className="w-56 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                            />
                          ) : (
                            row.nombre
                          )}
                        </td>

                        {/* DPI */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editing ? (
                            <input
                              value={row.dpi}
                              onChange={(e) => setDraft({ ...row, dpi: e.target.value })}
                              className="w-28 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                            />
                          ) : (
                            row.dpi
                          )}
                        </td>

                        {/* Nacimiento */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editing ? (
                            <input
                              value={row.nacimiento}
                              onChange={(e) => setDraft({ ...row, nacimiento: e.target.value })}
                              placeholder="dd/mm/yyyy"
                              className="w-28 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                            />
                          ) : (
                            row.nacimiento
                          )}
                        </td>

                        {/* Edad */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                          {editing ? (
                            <input
                              type="number"
                              value={row.edad}
                              onChange={(e) => setDraft({ ...row, edad: Number(e.target.value) })}
                              className="w-16 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-center"
                            />
                          ) : (
                            row.edad
                          )}
                        </td>

                        {/* Niño < 15 */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                          {editing ? (
                            <input
                              type="checkbox"
                              checked={row.menorDe15}
                              onChange={(e) => setDraft({ ...row, menorDe15: e.target.checked })}
                            />
                          ) : (
                            <Check ok={row.menorDe15} />
                          )}
                        </td>

                        {/* Adulto */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                          {editing ? (
                            <input
                              type="checkbox"
                              checked={row.adulto}
                              onChange={(e) => setDraft({ ...row, adulto: e.target.checked })}
                            />
                          ) : (
                            <Check ok={row.adulto} />
                          )}
                        </td>

                        {/* Sexo */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editing ? (
                            <select
                              value={row.sexo}
                              onChange={(e) => setDraft({ ...row, sexo: e.target.value })}
                              className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                            >
                              <option value="F">Mujer</option>
                              <option value="H">Hombre</option>
                            </select>
                          ) : (
                            <SexBadge sexo={row.sexo} />
                          )}
                        </td>

                        {/* Municipio */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 whitespace-pre-line">
                          {editing ? (
                            <input
                              value={row.municipio}
                              onChange={(e) => setDraft({ ...row, municipio: e.target.value })}
                              className="w-44 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                            />
                          ) : (
                            row.municipio
                          )}
                        </td>

                        {/* Aldea */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editing ? (
                            <input
                              value={row.aldea}
                              onChange={(e) => setDraft({ ...row, aldea: e.target.value })}
                              className="w-36 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                            />
                          ) : (
                            row.aldea
                          )}
                        </td>

                        {/* <14 años */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                          {editing ? (
                            <input
                              type="checkbox"
                              checked={row.embarazo?.menor || false}
                              onChange={(e) => setDraft({ ...row, embarazo: { ...row.embarazo, menor: e.target.checked } })}
                            />
                          ) : (
                            <Check ok={row.embarazo?.menor} />
                          )}
                        </td>

                        {/* >= de edad */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                          {editing ? (
                            <input
                              type="checkbox"
                              checked={row.embarazo?.mayor || false}
                              onChange={(e) => setDraft({ ...row, embarazo: { ...row.embarazo, mayor: e.target.checked } })}
                            />
                          ) : (
                            <Check ok={row.embarazo?.mayor} />
                          )}
                        </td>

                        {/* 1ra */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                          {editing ? (
                            <input
                              type="checkbox"
                              checked={row.consulta?.primera || false}
                              onChange={(e) => setDraft({ ...row, consulta: { ...row.consulta, primera: e.target.checked } })}
                            />
                          ) : (
                            <Check ok={row.consulta?.primera} />
                          )}
                        </td>

                        {/* Re. */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                          {editing ? (
                            <input
                              type="checkbox"
                              checked={row.consulta?.reconsulta || false}
                              onChange={(e) => setDraft({ ...row, consulta: { ...row.consulta, reconsulta: e.target.checked } })}
                            />
                          ) : (
                            <Check ok={row.consulta?.reconsulta} />
                          )}
                        </td>

                        {/* Em. */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                          {editing ? (
                            <input
                              type="checkbox"
                              checked={row.consulta?.emergencia || false}
                              onChange={(e) => setDraft({ ...row, consulta: { ...row.consulta, emergencia: e.target.checked } })}
                            />
                          ) : (
                            <Check ok={row.consulta?.emergencia} />
                          )}
                        </td>

                        {/* Diagnóstico */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editing ? (
                            <input
                              value={row.diagnostico}
                              onChange={(e) => setDraft({ ...row, diagnostico: e.target.value })}
                              className="w-56 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                            />
                          ) : (
                            row.diagnostico
                          )}
                        </td>

                        {/* CIE-10 */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editing ? (
                            <input
                              value={row.cie10}
                              onChange={(e) => setDraft({ ...row, cie10: e.target.value })}
                              className="w-24 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                            />
                          ) : (
                            row.cie10
                          )}
                        </td>

                        {/* Terapia */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editing ? (
                            <input
                              value={row.terapia}
                              onChange={(e) => setDraft({ ...row, terapia: e.target.value })}
                              className="w-40 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                            />
                          ) : (
                            row.terapia
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editId !== idxGlobal(idxPage) ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewPatient(p)}
                                className="px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                title="Ver ficha"
                              >
                                👁️ Ver
                              </button>
                              <button
                                onClick={() => startEdit(idxGlobal(idxPage))}
                                className="px-2 py-1 rounded bg-indigo-500 hover:bg-indigo-600 text-white"
                                title="Editar"
                              >
                                ✏️ Editar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={saveEdit}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                                title="Guardar"
                              >
                                💾 Guardar
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-2 py-1 rounded bg-rose-500 hover:bg-rose-600 text-white"
                                title="Cancelar"
                              >
                                ✖ Cancelar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 px-5 md:px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {total === 0
                ? "0 resultados"
                : `Mostrando ${(safePage - 1) * pageSize + 1}–${Math.min(
                    safePage * pageSize,
                    total
                  )} de ${total} resultados`}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className={`px-3 py-1.5 rounded border text-sm ${
                  safePage === 1
                    ? "opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-700"
                    : "border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
                }`}
              >
                ← Anterior
              </button>
              <span className="text-sm">
                Página <strong>{safePage}</strong> de <strong>{lastPage}</strong>
              </span>
              <button
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={safePage === lastPage}
                className={`px-3 py-1.5 rounded border text-sm ${
                  safePage === lastPage
                    ? "opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-700"
                    : "border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700"
                }`}
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de ficha */}
      <Modal open={!!view} onClose={closeModal} title={view ? `Ficha de ${view.nombre}` : ""}>
        {modalData.loading ? (
            <div className="text-center p-8 text-indigo-600 dark:text-indigo-300">Cargando detalles...</div>
        ) : modalData.error ? (
            <div className="text-center p-8 text-rose-600 dark:text-rose-400">
                {modalData.error}
            </div>
        ) : view && modalData.sigsa && modalData.ficha ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-bold text-indigo-700 dark:text-indigo-300 mb-2">Datos Básicos</h4>
              <p><strong>N.º Hist. Clínica:</strong> {view.historia}</p>
              <p><strong>Nombre:</strong> {view.nombre}</p>
              <p><strong>DPI/CUI:</strong> {view.dpi}</p>
              <p><strong>Nacimiento:</strong> {view.nacimiento}</p>
              <p><strong>Edad:</strong> {view.edad}</p>
              <p><strong>Sexo:</strong> {view.sexo === "H" ? "Hombre" : "Mujer"}</p>
              
              <h4 className="font-bold text-indigo-700 dark:text-indigo-300 mt-4 mb-2">Ficha Médica (Adicional)</h4>
              <p><strong>Escolaridad:</strong> {modalData.ficha.escolaridad || 'N/A'}</p>
              <p><strong>Ocupación:</strong> {modalData.ficha.ocupacion || 'N/A'}</p>
              <p><strong>Estado Civil:</strong> {modalData.ficha.estado_civil || 'N/A'}</p>
              <p><strong>Paciente Referido:</strong> {modalData.ficha.paciente_referido ? 'Sí' : 'No'}</p>
            </div>

            <div>
              <h4 className="font-bold text-indigo-700 dark:text-indigo-300 mb-2">Datos SIGSA</h4>
              <p><strong>Fecha Consulta:</strong> {modalData.sigsa.fecha_consulta || view.fechaConsulta}</p>
              <p><strong>Municipio:</strong> {modalData.sigsa.municipio || view.municipio}</p>
              <p><strong>Aldea:</strong> {modalData.sigsa.aldea || view.aldea}</p>
              <p><strong>Diagnóstico (SIGSA):</strong> {modalData.sigsa.diagnostico || 'N/A'}</p>
              <p><strong>CIE-10 (SIGSA):</strong> {modalData.sigsa.cie_10 || 'N/A'}</p>
              <p><strong>Consulta:</strong> {modalData.sigsa.consulta || view.consulta?.primera ? "Primera vez" : "Reconsulta"}</p>
              <p><strong>Terapia:</strong> {modalData.sigsa.terapia || view.terapia}</p>
              <p><strong>Embarazo:</strong> {modalData.sigsa.embarazo || 'No aplica'}</p>
            </div>
          </div>
        ) : (
            <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                Datos de paciente no disponibles.
            </div>
        )}
      </Modal>
    </div>
  );
};

export default VerPacientes;