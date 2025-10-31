// src/pages/NotasEvolutivas.jsx
import { useEffect, useMemo, useState } from "react";
import {
  crearNotaEvolutiva,
  obtenerNotasEvolutivas,
  actualizarNotaEvolutiva,
  getAllPacientes,
} from "../services/api";

export default function NotasEvolutivas() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warn, setWarn] = useState("");             // aviso suave cuando usamos fallback
  const [ok, setOk] = useState("");
  const [pacientes, setPacientes] = useState([]);   // [{uid, nombreCompleto}]
  const [notas, setNotas] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [pacienteUID, setPacienteUID] = useState("");
  const [modo, setModo] = useState("lista"); // lista | crear | editar

  const [form, setForm] = useState({
    nota_id: "",
    uid: "",
    no_registro: "",
    no_expediente: "",
    nombre_completo: "",      // autocompletado; oculto
    fecha: new Date().toISOString().slice(0, 10),
    contenido_nota: "",
    firma_psicologo: "Licda. Maura Violeta",
  });

  const normalizePacientes = (data) => {
    const arr = Array.isArray(data) ? data : Array.isArray(data?.patients) ? data.patients : [];
    return arr
      .map((row) => {
        const p = row.paciente || {};
        const s = row.sigsa || {};
        const f = row.ficha_medica || {};
        const uid = row.uid || p.uid || s.uid || f.uid || "";
        const nombre = p.nombre ?? s.nombre ?? f.nombre ?? "";
        const apellido = p.apellido ?? s.apellido ?? f.apellido ?? "";
        const nombreCompleto = `${nombre} ${apellido}`.trim() || "(Sin nombre)";
        return { uid, nombreCompleto };
      })
      .filter((x) => !!x.uid);
  };

  useEffect(() => {
    (async () => {
      setError(""); setWarn(""); setOk("");
      setLoading(true);
      try {
        const pacsResp = await getAllPacientes();
        setPacientes(normalizePacientes(pacsResp));
        // carga inicial: todas las notas
        const todas = await obtenerNotasEvolutivas();
        setNotas(Array.isArray(todas) ? todas : []);
      } catch (e) {
        setError(humanizeError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const notasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return notas;
    return notas.filter(
      (n) =>
        (n?.nombre_completo || "").toString().toLowerCase().includes(q) ||
        (n?.contenido_nota || "").toString().toLowerCase().includes(q)
    );
  }, [notas, busqueda]);

  // ——— Fallback: si el backend pide índice con ?uid=, traemos todas y filtramos por uid ———
  const fetchNotasPorUID = async (uid) => {
    setError(""); setWarn("");
    if (!uid) {
      const todas = await obtenerNotasEvolutivas();
      console.log("Todas las notas evolutivas:", todas);
      setNotas(Array.isArray(todas) ? todas : []);
      return;
    }
    try {
      const porPaciente = await obtenerNotasEvolutivas({ uid });
      setNotas(Array.isArray(porPaciente) ? porPaciente : []);
    } catch (e) {
      const msg = String(e?.message || e || "");
      if (msg.includes("requires an index")) {
        const todas = await obtenerNotasEvolutivas();
        const filtradas = (Array.isArray(todas) ? todas : []).filter((n) => n?.uid === uid);
        setNotas(filtradas);
        setWarn("Usando vista filtrada en la aplicación. Crea el índice en Firestore para optimizar esta consulta.");
      } else {
        throw e;
      }
    }
  };

  const onChangePaciente = async (uid) => {
    setPacienteUID(uid);
    setForm((f) => ({
      ...f,
      uid: uid || "",
      nombre_completo: pacientes.find((p) => p.uid === uid)?.nombreCompleto || "",
    }));
    setLoading(true);
    try {
      await fetchNotasPorUID(uid);
    } catch (e) {
      setError(humanizeError(e));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () =>
    setForm({
      nota_id: "",
      uid: pacienteUID || "",
      no_registro: "",
      no_expediente: "",
      nombre_completo: pacientes.find((p) => p.uid === pacienteUID)?.nombreCompleto || "",
      fecha: new Date().toISOString().slice(0, 10),
      contenido_nota: "",
      firma_psicologo: "Licda. Maura Violeta",
    });

  const beginCrear = () => {
    setOk(""); setError(""); setWarn("");
    resetForm();
    setModo("crear");
  };

  const onCrear = async (e) => {
    e.preventDefault();
    setError(""); setWarn(""); setOk("");
    setLoading(true);
    try {
      const payload = {
        uid: form.uid,
        no_registro: form.no_registro,
        no_expediente: form.no_expediente,
        nombre_completo: form.nombre_completo,
        fecha: form.fecha,
        contenido_nota: form.contenido_nota,
        firma_psicologo: form.firma_psicologo || "Licda. Maura Violeta",
      };
      
      // Crear la nota
      const resultado = await crearNotaEvolutiva(payload);
      console.log("Nota creada:", resultado);
      
      // Cambiar primero a modo lista
      setModo("lista");
      
      // Actualizar la lista de notas
      await fetchNotasPorUID(pacienteUID);
      
      // Mostrar mensaje de éxito
      setOk("✔️ Nota evolutiva guardada correctamente.");
      
      // Limpiar el formulario
      resetForm();
      
      // Auto-ocultar el mensaje después de 5 segundos
      setTimeout(() => setOk(""), 5000);
    } catch (e) {
      console.error("Error al crear nota:", e);
      setError(humanizeError(e));
    } finally {
      setLoading(false);
    }
  };

  const beginEditar = (n) => {
    setOk(""); setError(""); setWarn("");
    setForm({
      nota_id: n?.nota_id || n?.id || "",
      uid: n?.uid || "",
      no_registro: n?.no_registro || "",
      no_expediente: n?.no_expediente || "",
      nombre_completo: n?.nombre_completo || "",
      fecha: n?.fecha || new Date().toISOString().slice(0, 10),
      contenido_nota: n?.contenido_nota || "",
      firma_psicologo: n?.firma_psicologo || "Licda. Maura Violeta",
    });
    setModo("editar");
  };

  const onEditar = async (e) => {
    e.preventDefault();
    setError(""); setWarn(""); setOk("");
    setLoading(true);
    try {
      const resultado = await actualizarNotaEvolutiva({
        nota_id: form.nota_id,
        contenido_nota: form.contenido_nota,
        firma_psicologo: form.firma_psicologo,
        fecha: form.fecha,
      });
      console.log("Nota actualizada:", resultado);
      
      // Cambiar primero a modo lista
      setModo("lista");
      
      // Actualizar la lista de notas
      await fetchNotasPorUID(pacienteUID);
      
      // Mostrar mensaje de éxito
      setOk("✔️ Cambios guardados correctamente.");
      
      // Limpiar el formulario
      resetForm();
      
      // Auto-ocultar el mensaje después de 5 segundos
      setTimeout(() => setOk(""), 5000);
    } catch (e) {
      console.error("Error al actualizar nota:", e);
      setError(humanizeError(e));
    } finally {
      setLoading(false);
    }
  };

  const cancelar = () => {
    setModo("lista");
    resetForm();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-purple-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Notas Evolutivas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Registro y seguimiento evolutivo del paciente</p>
        </div>
        {modo === "lista" && (
          <button
            onClick={beginCrear}
            className="inline-flex items-center rounded-2xl px-4 py-2 text-sm font-semibold shadow hover:shadow-md bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
          >
            + Nueva Nota
          </button>
        )}
      </div>

      {ok && (
        <div className="mb-4 rounded-2xl border border-emerald-300 bg-emerald-50 text-emerald-800 px-4 py-2 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-200">
          {ok}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-2xl border border-rose-300 bg-rose-50 text-rose-800 px-4 py-2 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-200">
          {error}
        </div>
      )}
      {warn && !error && (
        <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 text-amber-800 px-4 py-2 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-200">
          {warn}
        </div>
      )}

      {modo === "lista" && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Buscar por nombre o contenido…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={pacienteUID}
            onChange={(e) => onChangePaciente(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los pacientes</option>
            {pacientes.map((p) => (
              <option key={p.uid} value={p.uid}>
                {p.nombreCompleto}
              </option>
            ))}
          </select>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            {loading ? "Cargando…" : `${notas.length} nota(s)`}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {modo === "lista" && (
          <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 p-4 shadow-sm">
            {notasFiltradas.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">No hay notas.</div>
            ) : (
              <ul className="space-y-3">
                {notasFiltradas.map((n) => (
                  <li
                    key={n?.nota_id || n?.id}
                    className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white/90 dark:bg-gray-800/70 p-4 hover:shadow transition-all"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">ID Nota:</span> {n?.nota_id || n?.id || "—"} ·{" "}
                        <span className="font-semibold">Fecha:</span> {n?.fecha || "—"}
                      </div>
                      <div className="text-base font-semibold text-gray-800 dark:text-gray-100">
                        {n?.nombre_completo || "Sin nombre"}
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                        {n?.contenido_nota || "—"}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-semibold">Firma:</span> {n?.firma_psicologo || "—"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">No. registro:</span> {n?.no_registro || "—"} ·{" "}
                        <span className="font-semibold">No. expediente:</span> {n?.no_expediente || "—"}
                      </div>
                      <div className="pt-2 flex gap-2">
                        <button
                          className="rounded-xl px-3 py-1 text-sm bg-indigo-600 text-white hover:bg-indigo-700"
                          onClick={() => beginEditar(n)}
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {(modo === "crear" || modo === "editar") && (
          <form
            onSubmit={modo === "crear" ? onCrear : onEditar}
            className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/60 p-5 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {modo === "crear" ? "Nueva Nota Evolutiva" : `Editar Nota (${form.nota_id})`}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Paciente</label>
                <select
                  disabled={modo === "editar"}
                  required
                  value={form.uid}
                  onChange={(e) => {
                    const uid = e.target.value;
                    const found = pacientes.find((p) => p.uid === uid);
                    setForm((f) => ({ ...f, uid, nombre_completo: found?.nombreCompleto || "" }));
                  }}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccionar…</option>
                  {pacientes.map((p) => (
                    <option key={p.uid} value={p.uid}>
                      {p.nombreCompleto}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campo oculto: nombre completo */}
              <input type="hidden" value={form.nombre_completo} readOnly />

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">No. registro</label>
                <input
                  type="text"
                  disabled={modo === "editar"}
                  value={form.no_registro}
                  onChange={(e) => setForm((f) => ({ ...f, no_registro: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">No. expediente</label>
                <input
                  type="text"
                  disabled={modo === "editar"}
                  value={form.no_expediente}
                  onChange={(e) => setForm((f) => ({ ...f, no_expediente: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={form.fecha}
                  onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Firma psicólogo</label>
                <input
                  type="text"
                  value={form.firma_psicologo}
                  onChange={(e) => setForm((f) => ({ ...f, firma_psicologo: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Contenido de la nota</label>
                <textarea
                  required
                  rows={6}
                  placeholder="Observaciones clínicas, evolución, acuerdos, tareas…"
                  value={form.contenido_nota}
                  onChange={(e) => setForm((f) => ({ ...f, contenido_nota: e.target.value }))}
                  className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={cancelar}
                disabled={loading}
                className="rounded-2xl px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl px-4 py-2 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? "Guardando..." : (modo === "crear" ? "Guardar Nota" : "Guardar Cambios")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function humanizeError(e) {
  const msg = String(e?.message || e || "");
  if (msg.includes("requires an index")) {
    const url = msg.match(/https:\/\/\S+/)?.[0] || undefined;
    return (
      <>
        Error al obtener notas evolutivas: se requiere un <strong>índice</strong> en Firestore{url ? <>. <a href={url} target="_blank" rel="noreferrer" className="underline">Crear índice</a></> : "."}
      </>
    );
  }
  return msg;
}
