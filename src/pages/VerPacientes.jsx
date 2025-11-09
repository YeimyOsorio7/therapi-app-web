// src/pages/VerPacientes.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getAllPacientes, getPacienteInfo, getSigsaInfo, getFichaMedica, upsertPatient } from "../services/api";

// ⬇️ Importaciones para generar DOCX
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
  TextRun,
  PageOrientation,
} from "docx";
import { saveAs } from "file-saver";

/* ==================== Utilidades (sin cambios) ==================== */
const parseFecha = (str) => {
  if (!str) return null;
  if (str.includes('-')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
  }
  const parts = str.split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts.map(Number);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      return new Date(y, m - 1, d);
    }
  }
  return null;
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
  sexo === "H" || sexo === "M" ? (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
      Hombre
    </span>
  ) : (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-200">
      Mujer
    </span>
  );

/* ==================== Modal genérico (sin cambios) ==================== */
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

  const [view, setView] = useState(null);
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [modalData, setModalData] = useState({
    sigsa: null,
    ficha: null,
    paciente: null,
    loading: false,
    error: null
  });

  // ⬇️ Estado para botón "Eliminar"
  const [deletingIds, setDeletingIds] = useState({}); // { [uid]: true }

  // (Función de carga de tabla fetchPacientes sin cambios)
  const fetchPacientes = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await getAllPacientes();
      console.log("Request data", data);
      if (!data || !Array.isArray(data.patients)) {
        throw new Error("El servidor no devolvió una lista de pacientes válida. Se esperaba { patients: [...] }");
      }
      const mappedData = data.patients.map((row, index) => {
        const { paciente = {}, sigsa = {}, ficha_medica = {} } = row;
        return {
          no: index + 1,
          uid: row.uid,
          historia: ficha_medica.cui || sigsa.cui || row.uid,
          fechaConsulta: paciente.fecha_consulta || sigsa.fecha_consulta,
          nombre: `${paciente.nombre || ''} ${paciente.apellido || ''}`.trim(),
          dpi: sigsa.cui || ficha_medica.cui,
          nacimiento: sigsa.fecha_nacimiento,
          edad: sigsa.edad || ficha_medica.edad,
          menorDe15: sigsa.ninio_menor_15 || false,
          adulto: sigsa.adulto || false,
          sexo: sigsa.genero || ficha_medica.genero,
          municipio: sigsa.municipio || ficha_medica.municipio,
          aldea: sigsa.aldea || ficha_medica.aldea,
          embarazo: {
            menor: ficha_medica.embarazo === 'Menor de 14',
            mayor: false,
          },
          consulta: {
            primera: sigsa.consulta === 'Primera vez',
            reconsulta: sigsa.consulta === 'Control' || ficha_medica.tipo_consulta === 'Control',
            emergencia: false
          },
          diagnostico: sigsa.diagnostico || ficha_medica.patologia,
          cie10: sigsa.cie_10 || ficha_medica.cei10,
          terapia: sigsa.terapia || ficha_medica.tipo_terapia,
        };
      });
      setRows(mappedData);
    } catch (e) {
      console.error("Error al cargar pacientes:", e);
      setFetchError(`❌ Error al cargar los datos: ${e.message || 'Error de conexión desconocido.'}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  // (Función de modal handleViewPatient sin cambios)
  const handleViewPatient = async (patientRow) => {
    setView(patientRow);
    setModalData({ sigsa: null, ficha: null, paciente: null, loading: true, error: null });
    const payload = { uid: patientRow.uid };
    console.log("Fetching details for UID:", payload);
    if (!payload.uid) {
      setModalData({ loading: false, error: "Este paciente no tiene un UID para consultar." });
      return;
    }
    try {
      const [pacienteData, sigsaData, fichaData] = await Promise.all([
        getPacienteInfo(payload),
        getSigsaInfo(payload),
        getFichaMedica(payload)
      ]);

      console.log("📋 Datos del paciente recibidos:", pacienteData);
      console.log("📋 Datos SIGSA recibidos:", sigsaData);
      console.log("📋 Ficha médica recibida:", fichaData);

      setModalData({
        sigsa: sigsaData,
        ficha: fichaData,
        paciente: pacienteData,
        loading: false,
        error: null
      });
    } catch (e) {
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
    setModalData({ sigsa: null, ficha: null, paciente: null, loading: false, error: null });
  }

  // (Filtros y paginación sin cambios)
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
    const dDesde = desde ? parseFecha(desde) : null;
    const dHasta = hasta ? parseFecha(hasta) : null;
    if (dDesde) dDesde.setHours(0, 0, 0, 0);
    if (dHasta) dHasta.setHours(23, 59, 59, 999);
    return rows.filter((p) => {
      const tMatch = !q || p.nombre.toLowerCase().includes(q) || (p.diagnostico && p.diagnostico.toLowerCase().includes(q)) || (p.cie10 && p.cie10.toLowerCase().includes(q));
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
    setQuery(""); setDesde(""); setHasta(""); setPage(1);
  };

  // (Funciones de edición startEdit, cancelEdit sin cambios)
  const startEdit = (row) => {
    const originalIndex = rows.findIndex(r => r.no === row.no);
    setEditId(originalIndex);
    setDraft(JSON.parse(JSON.stringify(rows[originalIndex])));
  };
  const cancelEdit = () => {
    setEditId(null); setDraft(null);
  };

  // (Función de guardado saveEdit sin cambios)
  const saveEdit = async () => {
    if (!draft) return;
    const payload = {
      uid: draft.uid,
      new_info: {
        nombre: draft.nombre.split(' ')[0],
        apellido: draft.nombre.split(' ')[1] || '',
        fecha_consulta: draft.fechaConsulta,
        estado_paciente: "Activo",
      },
      sigsa_info: {
        cui: draft.dpi,
        fecha_nacimiento: draft.nacimiento,
        edad: draft.edad,
        genero: draft.sexo,
        municipio: draft.municipio,
        aldea: draft.aldea,
        consulta: draft.consulta.primera ? "Primera vez" : "Control",
        diagnostico: draft.diagnostico,
        cie_10: draft.cie10,
        terapia: draft.terapia,
      },
      ficha_medica_info: {
        cui: draft.dpi,
        edad: draft.edad,
        patologia: draft.diagnostico,
        cei10: draft.cie10,
        tipo_consulta: draft.consulta.reconsulta ? "Control" : "Primera vez",
        tipo_terapia: draft.terapia,
        embarazo: draft.embarazo.menor ? "Menor de 14" : "",
      }
    };
    try {
      await upsertPatient(payload);
      const updated = [...rows];
      updated[editId] = draft;
      setRows(updated);
      setEditId(null); setDraft(null);
    } catch (e) {
      console.error("Error al guardar:", e);
      alert(`Error al guardar: ${e.message}`);
    }
  };

  /* ==================== Eliminar Paciente (nuevo) ==================== */
  const handleDeletePatient = async (row) => {
    if (!row?.uid) {
      alert("Este registro no tiene UID válido.");
      return;
    }
    const ok = window.confirm(`¿Eliminar al paciente "${row.nombre}"? Esta acción marcará el registro como Eliminado.`);
    if (!ok) return;

    try {
      setDeletingIds((m) => ({ ...m, [row.uid]: true }));

      // Soft delete con tu endpoint existente
      await upsertPatient({
        uid: row.uid,
        new_info: {
          estado_paciente: "Eliminado",
        },
      });

      // Quitar de la UI
      setRows((prev) => prev.filter((r) => r.uid !== row.uid));
    } catch (e) {
      console.error("Error al eliminar:", e);
      alert(`No se pudo eliminar: ${e.message || "Error desconocido."}`);
    } finally {
      setDeletingIds((m) => {
        const { [row.uid]: _, ...rest } = m;
        return rest;
      });
    }
  };

  // ⬇️ Botón/Funcionalidad: Exportar DOCX en horizontal (sin tocar lo demás)
  const handleExportDocx = async () => {
    try {
      const headers = [
        "No.", "N.º Historia Clínica", "FECHA DE CONSULTA", "Nombres y apellidos", "DPI",
        "FECHA DE NACIMIENTO", "Edad", "Niño < 15", "Adulto", "Sexo", "Municipio", "Aldea",
        "< 14 AÑOS", "≥ de edad", "1 ra.", "Re.", "Em.", "Diagnóstico", "CIE-10", "Terapia"
      ];

      const bool = (v) => (v ? "Sí" : "No");
      const sexoTexto = (s) => (s === "M" || s === "H" ? "Hombre" : s === "F" ? "Mujer" : "");

      const rowsForTable = filtrados.map((r) => ([
        r.no?.toString() || "",
        r.historia || "",
        r.fechaConsulta || "",
        r.nombre || "",
        r.dpi || "",
        r.nacimiento || "",
        (r.edad ?? "").toString(),
        bool(!!r.menorDe15),
        bool(!!r.adulto),
        sexoTexto(r.sexo) || "",
        r.municipio || "",
        r.aldea || "",
        bool(!!r.embarazo?.menor),
        bool(!!r.embarazo?.mayor),
        bool(!!r.consulta?.primera),
        bool(!!r.consulta?.reconsulta),
        bool(!!r.consulta?.emergencia),
        r.diagnostico || "",
        r.cie10 || "",
        r.terapia || "",
      ]));

      const headerRow = new TableRow({
        children: headers.map((h) =>
          new TableCell({
            width: { size: 5, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: h, bold: true })],
              }),
            ],
          })
        ),
      });

      const bodyRows = rowsForTable.map((rowArr) =>
        new TableRow({
          children: rowArr.map((cellText) =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun(String(cellText || ""))] })],
            })
          ),
        })
      );

      const table = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...bodyRows],
      });

      const now = new Date();
      const fechaStr = `${String(now.getDate()).padStart(2,"0")}/${String(now.getMonth()+1).padStart(2,"0")}/${now.getFullYear()}`;

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                size: { orientation: PageOrientation.LANDSCAPE }, // Horizontal
                margin: { top: 720, right: 720, bottom: 720, left: 720 }, // 1"
              },
            },
            children: [
              new Paragraph({
                heading: HeadingLevel.HEADING1,
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Lista de Pacientes", bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `Generado: ${fechaStr}` })],
              }),
              new Paragraph({ text: " " }),
              table,
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(
        blob,
        `Pacientes_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}.docx`
      );
    } catch (err) {
      console.error("Error generando DOCX:", err);
      alert("Ocurrió un error al generar el archivo .docx");
    }
  };

  // --- Renderizado (con la corrección en thead) ---
  return (
    <div className="min-h-screen p-4 md:p-6 bg-violet-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-[1500px] rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-white dark:bg-gray-900 shadow">
        {/* Header (sin cambios) */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-5 md:px-6 py-4 md:py-5 rounded-t-2xl bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-200/60 dark:border-indigo-800/50">
          <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
            <span role="img" aria-label="medico">👩‍⚕️</span> Lista de Pacientes
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {/* Toolbar (sin cambios) */}
            <div className="relative">
              <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Buscar nombre, diagnóstico o CIE-10..." className="w-72 max-w-[60vw] pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 opacity-60">🔎</span>
            </div>
            <input type="date" value={desde} min={minDate || undefined} max={hasta || maxDate || undefined} onChange={(e) => { setDesde(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" title="Desde" />
            <input type="date" value={hasta} min={desde || minDate || undefined} max={maxDate || undefined} onChange={(e) => { setHasta(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" title="Hasta" />
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" title="Tamaño de página">
              {[5, 10, 20, 50].map((n) => ( <option key={n} value={n}> {n} / pág. </option> ))}
            </select>
            <button onClick={fetchPacientes} disabled={loading} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 text-sm" title="Recargar datos del servidor">
              🔄 Recargar
            </button>
            <button onClick={resetFilters} className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm" title="Limpiar filtros">
              🧹 Limpiar
            </button>

            {/* ⬇️ Botón para descargar DOCX (Horizontal) */}
            <button
              onClick={handleExportDocx}
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-500 text-white text-sm"
              title="Descargar pacientes en DOCX (horizontal)"
            >
              Descargar Pacientes (.docx)
            </button>
          </div>
        </div>

        {/* Mensajes de carga y error (sin cambios) */}
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
                    "No.", "N.º Historia Clínica", "FECHA DE CONSULTA", "Nombres y apellidos", "DPI",
                    "FECHA DE NACIMIENTO", "Edad", "Niño < 15", "Adulto", "Sexo", "Municipio", "Aldea",
                    "< 14 AÑOS", "≥ de edad", "1 ra.", "Re.", "Em.", "Diagnóstico", "CIE-10", "Terapia", "Acciones",
                  ].map((h, i, arr) => (
                    <th key={i} className={`px-3 py-2 font-semibold border-b border-gray-200 dark:border-gray-700 ${ i === 0 ? "rounded-tl-2xl" : ""} ${i === arr.length - 1 ? "rounded-tr-2xl" : ""}`}>
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
                  pageRows.map((p) => {
                    const editing = editId === (p.no - 1);
                    const row = editing ? draft : p;
                    const isDeleting = !!deletingIds[row.uid];

                    return (
                      <tr key={p.no} className="odd:bg-white even:bg-gray-50 odd:dark:bg-gray-900 even:dark:bg-gray-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors">
                        {/* Celdas */}
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">{row.no}</td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editing ? <input value={row.historia} onChange={(e) => setDraft({ ...row, historia: e.target.value })} className="w-24 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" /> : row.historia}
                        </td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editing ? <input value={row.fechaConsulta} onChange={(e) => setDraft({ ...row, fechaConsulta: e.target.value })} placeholder="dd/mm/yyyy" className="w-28 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" /> : row.fechaConsulta}
                        </td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 whitespace-pre-line">
                          {editing ? <textarea value={row.nombre} onChange={(e) => setDraft({ ...row, nombre: e.target.value })} className="w-56 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" /> : row.nombre}
                        </td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editing ? <input value={row.dpi} onChange={(e) => setDraft({ ...row, dpi: e.target.value })} className="w-28 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" /> : row.dpi}
                        </td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editing ? <input value={row.nacimiento} onChange={(e) => setDraft({ ...row, nacimiento: e.target.value })} placeholder="dd/mm/yyyy" className="w-28 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" /> : row.nacimiento}
                        </td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                          {editing ? <input type="number" value={row.edad} onChange={(e) => setDraft({ ...row, edad: Number(e.target.value) })} className="w-16 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-center" /> : row.edad}
                        </td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                          {editing ? <input type="checkbox" checked={row.menorDe15} onChange={(e) => setDraft({ ...row, menorDe15: e.target.checked })} /> : <Check ok={row.menorDe15} />}
                        </td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                          {editing ? <input type="checkbox" checked={row.adulto} onChange={(e) => setDraft({ ...row, adulto: e.target.checked })} /> : <Check ok={row.adulto} />}
                        </td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editing ? (
                            <select value={row.sexo} onChange={(e) => setDraft({ ...row, sexo: e.target.value })} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
                              <option value="F">Mujer</option>
                              <option value="M">Hombre</option>
                            </select>
                          ) : ( <SexBadge sexo={row.sexo} /> )}
                        </td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 whitespace-pre-line">
                          {editing ? <input value={row.municipio} onChange={(e) => setDraft({ ...row, municipio: e.target.value })} className="w-44 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" /> : row.municipio}
                        </td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editing ? <input value={row.aldea} onChange={(e) => setDraft({ ...row, aldea: e.target.value })} className="w-36 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" /> : row.aldea}
                        </td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                          {editing ? <input type="checkbox" checked={row.embarazo?.menor || false} onChange={(e) => setDraft({ ...row, embarazo: { ...row.embarazo, menor: e.target.checked } })} /> : <Check ok={row.embarazo?.menor} />}
                        </td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                          {editing ? <input type="checkbox" checked={row.embarazo?.mayor || false} onChange={(e) => setDraft({ ...row, embarazo: { ...row.embarazo, mayor: e.target.checked } })} /> : <Check ok={row.embarazo?.mayor} />}
                        </td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                          {editing ? <input type="checkbox" checked={row.consulta?.primera || false} onChange={(e) => setDraft({ ...row, consulta: { ...row.consulta, primera: e.target.checked } })} /> : <Check ok={row.consulta?.primera} />}
                        </td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                          {editing ? <input type="checkbox" checked={row.consulta?.reconsulta || false} onChange={(e) => setDraft({ ...row, consulta: { ...row.consulta, reconsulta: e.target.checked } })} /> : <Check ok={row.consulta?.reconsulta} />}
                        </td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                          {editing ? <input type="checkbox" checked={row.consulta?.emergencia || false} onChange={(e) => setDraft({ ...row, consulta: { ...row.consulta, emergencia: e.target.checked } })} /> : <Check ok={row.consulta?.emergencia} />}
                        </td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editing ? <input value={row.diagnostico} onChange={(e) => setDraft({ ...row, diagnostico: e.target.value })} className="w-56 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" /> : row.diagnostico}
                        </td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editing ? <input value={row.cie10} onChange={(e) => setDraft({ ...row, cie10: e.target.value })} className="w-24 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" /> : row.cie10}
                        </td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editing ? <input value={row.terapia} onChange={(e) => setDraft({ ...row, terapia: e.target.value })} className="w-40 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" /> : row.terapia}
                        </td>
                        <td className="p-3 border-b border-gray-200 dark:border-gray-700">
                          {editId !== (p.no - 1) ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewPatient(p)}
                                className="px-2 py-1 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                                title="Ver ficha"
                              >
                                👁️ Ver
                              </button>
                              <button
                                onClick={() => startEdit(p)}
                                className="px-2 py-1 rounded bg-indigo-500 hover:bg-indigo-600 text-white"
                                title="Editar"
                              >
                                ✏️ Editar
                              </button>

                              {/* ⬇️ NUEVO: botón Eliminar */}
                              <button
                                onClick={() => handleDeletePatient(p)}
                                disabled={isDeleting}
                                className={`px-2 py-1 rounded text-white ${isDeleting ? "opacity-60 cursor-not-allowed bg-rose-500" : "bg-rose-500 hover:bg-rose-600"}`}
                                title="Eliminar paciente"
                              >
                                ✖️ Eliminar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button onClick={saveEdit} className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white" title="Guardar">
                                💾 Guardar
                              </button>
                              <button onClick={cancelEdit} className="px-2 py-1 rounded bg-rose-500 hover:bg-rose-600 text-white" title="Cancelar">
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

          {/* Paginación (sin cambios) */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 px-5 md:px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {total === 0
                ? "0 resultados"
                : `Mostrando ${(safePage - 1) * pageSize + 1}–${Math.min( safePage * pageSize, total )} de ${total} resultados`}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className={`px-3 py-1.5 rounded border text-sm ${ safePage === 1 ? "opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-700" : "border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700" }`}>
                ← Anterior
              </button>
              <span className="text-sm">
                Página <strong>{safePage}</strong> de <strong>{lastPage}</strong>
              </span>
              <button onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={safePage === lastPage} className={`px-3 py-1.5 rounded border text-sm ${ safePage === lastPage ? "opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-700" : "border-gray-300 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-700" }`}>
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Modal open={!!view} onClose={closeModal} title={view ? `Ficha de ${view.nombre}` : ""}>
        {modalData.loading ? (
          <div className="text-center p-8 text-indigo-600 dark:text-indigo-300">Cargando detalles...</div>
        ) : modalData.error ? (
          <div className="text-center p-8 text-rose-600 dark:text-rose-400">
            {modalData.error}
          </div>
        ) : view ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {/* Columna Izquierda: Datos Básicos y Ficha Médica */}
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-indigo-700 dark:text-indigo-300 mb-3 pb-2 border-b border-indigo-200 dark:border-indigo-800">
                  Datos Básicos del Paciente
                </h4>
                <div className="space-y-2">
                  <p><strong>UID:</strong> {view.uid || modalData.paciente?.uid || 'N/A'}</p>
                  <p><strong>Nombre Completo:</strong> {view.nombre || `${modalData.paciente?.nombre || ''} ${modalData.paciente?.apellido || ''}`.trim() || 'N/A'}</p>
                  <p><strong>Estado:</strong> {modalData.paciente?.estado_paciente || 'N/A'}</p>
                  <p><strong>Fecha de Consulta:</strong> {view.fechaConsulta || modalData.paciente?.fecha_consulta || 'N/A'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-indigo-700 dark:text-indigo-300 mb-3 pb-2 border-b border-indigo-200 dark:border-indigo-800">
                  Ficha Médica
                </h4>
                <div className="space-y-2">
                  <p><strong>DPI/CUI:</strong> {view.dpi || modalData.ficha?.cui || 'N/A'}</p>
                  <p><strong>Patología:</strong> {view.diagnostico || modalData.ficha?.patologia || 'N/A'}</p>
                  <p><strong>CIE-10:</strong> {view.cie10 || modalData.ficha?.cei10 || 'N/A'}</p>
                  <p><strong>Escolaridad:</strong> {modalData.ficha?.escolaridad || 'N/A'}</p>
                  <p><strong>Ocupación:</strong> {modalData.ficha?.ocupacion || 'N/A'}</p>
                  <p><strong>Estado Civil:</strong> {modalData.ficha?.estado_civil || 'N/A'}</p>
                  <p><strong>Paciente Referido:</strong> {modalData.ficha?.paciente_referido ? 'Sí' : 'No'}</p>
                  <p><strong>Tipo de Terapia:</strong> {view.terapia || modalData.ficha?.tipo_terapia || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Datos SIGSA */}
            <div>
              <h4 className="font-bold text-indigo-700 dark:text-indigo-300 mb-3 pb-2 border-b border-indigo-200 dark:border-indigo-800">
                Datos SIGSA
              </h4>
              <div className="space-y-2">
                <p><strong>DPI/CUI:</strong> {view.dpi || modalData.sigsa?.cui || 'N/A'}</p>
                <p><strong>Fecha de Nacimiento:</strong> {view.nacimiento || modalData.sigsa?.fecha_nacimiento || 'N/A'}</p>
                <p><strong>Edad:</strong> {view.edad || modalData.sigsa?.edad || 'N/A'}</p>
                <p>
                  <strong>Sexo:</strong>{" "}
                  {view.sexo === "M" || modalData.sigsa?.genero === "M"
                    ? "Hombre"
                    : view.sexo === "F" || modalData.sigsa?.genero === "F"
                    ? "Mujer"
                    : 'N/A'}
                </p>
                <p><strong>Municipio:</strong> {view.municipio || modalData.sigsa?.municipio || 'N/A'}</p>
                <p><strong>Aldea:</strong> {view.aldea || modalData.sigsa?.aldea || 'N/A'}</p>
                <p><strong>Diagnóstico:</strong> {view.diagnostico || modalData.sigsa?.diagnostico || 'N/A'}</p>
                <p><strong>CIE-10:</strong> {view.cie10 || modalData.sigsa?.cie_10 || 'N/A'}</p>
                <p><strong>Tipo de Consulta:</strong> {modalData.sigsa?.consulta || (view.consulta?.primera ? 'Primera vez' : view.consulta?.reconsulta ? 'Control' : 'N/A')}</p>
                <p><strong>Terapia:</strong> {view.terapia || modalData.sigsa?.terapia || 'N/A'}</p>
                <p><strong>Embarazo:</strong> {modalData.sigsa?.embarazo || view.embarazo?.menor ? "Sí" : 'No aplica'}</p>
              </div>
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
