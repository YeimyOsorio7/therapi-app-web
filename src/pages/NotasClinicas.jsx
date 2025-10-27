import { useState, useEffect, useCallback, useMemo } from "react";
import ThemeToggle from "../components/ThemeToggle";
import {
  getAllNotasClinicas,
  getNotaClinicaById,
  agregarNotaClinica,
  getAllPacientes,
} from "../services/api";
import { useAuth } from "../context/AuthContext";

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

function preview(str, max = 60) {
  if (!str) return "—";
  if (str.length <= max) return str;
  return str.slice(0, max) + "…";
}

// ID único visible para cada nota
function generarUidNota() {
  return (
    "nota_" +
    Math.random().toString(36).substring(2, 10) +
    Date.now().toString(36)
  );
}

const initialForm = {
  contenido_reporte: "",
  recomendaciones_reporte: "",
  transtorno_posible: "",
  tipo_reporte: "seguimiento",
};

export default function NotasClinicas() {
  const { user } = useAuth();

  // uid fallback por si no hay selector
  const uidActualAuth =
    user?.uid || user?.user_id || user?.id || user?.re_paciente || "";

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

  // búsqueda en selector
  const [inputNombrePaciente, setInputNombrePaciente] = useState("");
  const [showListaPacientes, setShowListaPacientes] = useState(false);

  // paciente elegido
  const [pacienteSeleccionadoUid, setPacienteSeleccionadoUid] = useState("");
  const [pacienteSeleccionadoNombre, setPacienteSeleccionadoNombre] =
    useState("");

  // ====== estado notas clínicas ======
  // cada nota:
  // {
  //   note_uid,
  //   user_id,
  //   paciente_nombre,
  //   fecha_generacion,
  //   tipo_reporte,
  //   transtorno_posible,
  //   contenido_reporte,
  //   recomendaciones_reporte,
  // }
  const [notas, setNotas] = useState([]);
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [errorNotas, setErrorNotas] = useState("");

  // ====== modal ======
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [notaDetalle, setNotaDetalle] = useState(null);
  const [modalError, setModalError] = useState("");

  // ====== form nueva nota ======
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState({ type: "", text: "" });

  // --------------------------------------------------
  // 1. Cargar pacientes para el buscador
  // --------------------------------------------------
  useEffect(() => {
    const cargarPacientes = async () => {
      try {
        const resp = await getAllPacientes();

        // AJUSTA A TU API AQUÍ:
        // según tu tabla:
        //   N.º Historia Clínica => es nuestro UID paciente
        //   Nombres y apellidos => nombrePaciente
        //
        // voy a mapear suponiendo que cada objeto viene así:
        // { historia_clinica: "1213...", nombres_apellidos: "Yeimy Maribel", ... }
        // si tus llaves reales cambian, cámbialas aquí 👇
        const lista = Array.isArray(resp)
          ? resp.map((p) => ({
              uidPaciente:
                p.historia_clinica ||
                p.numero_historia ||
                p.uid ||
                "",
              nombrePaciente:
                p.nombres_apellidos ||
                p.nombre_completo ||
                `${p.nombre || ""} ${p.apellido || ""}`.trim(),
            }))
          : [];

        const limpia = lista.filter(
          (p) => p.uidPaciente && p.nombrePaciente
        );

        setPacientes(limpia);

        // auto-selecciona algo si aún no hay
        if (!pacienteSeleccionadoUid) {
          const primero = limpia[0];
          if (primero) {
            setPacienteSeleccionadoUid(primero.uidPaciente);
            setPacienteSeleccionadoNombre(primero.nombrePaciente);
            setInputNombrePaciente(
              `${primero.nombrePaciente} (${primero.uidPaciente})`
            );
          } else if (uidActualAuth) {
            // fallback: auth user
            setPacienteSeleccionadoUid(uidActualAuth);
            setPacienteSeleccionadoNombre(uidActualAuth);
            setInputNombrePaciente(uidActualAuth);
          }
        }
      } catch (err) {
        console.warn(
          "No pude cargar la lista de pacientes. Revisa getAllPacientes().",
          err
        );

        // fallback si endpoint aún no existe
        if (uidActualAuth && !pacienteSeleccionadoUid) {
          setPacientes([
            {
              uidPaciente: uidActualAuth,
              nombrePaciente: uidActualAuth,
            },
          ]);
          setPacienteSeleccionadoUid(uidActualAuth);
          setPacienteSeleccionadoNombre(uidActualAuth);
          setInputNombrePaciente(uidActualAuth);
        }
      }
    };

    cargarPacientes();
  }, [uidActualAuth, pacienteSeleccionadoUid]);

  // --------------------------------------------------
  // 2. Filtrar pacientes mientras escribes en el input
  // --------------------------------------------------
  const pacientesFiltrados = useMemo(() => {
    if (!inputNombrePaciente) return pacientes.slice(0, 8);
    const q = inputNombrePaciente.toLowerCase().trim();
    return pacientes
      .filter(
        (p) =>
          p.nombrePaciente.toLowerCase().includes(q) ||
          p.uidPaciente.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [inputNombrePaciente, pacientes]);

  const handleElegirPaciente = (p) => {
    setPacienteSeleccionadoUid(p.uidPaciente);
    setPacienteSeleccionadoNombre(p.nombrePaciente);
    setInputNombrePaciente(`${p.nombrePaciente} (${p.uidPaciente})`);
    setShowListaPacientes(false);
    setFormMsg({ type: "", text: "" });
  };

  const handleBuscarPacienteChange = (e) => {
    const value = e.target.value;
    setInputNombrePaciente(value);
    setShowListaPacientes(true);
    setFormMsg({ type: "", text: "" });
  };

  // --------------------------------------------------
  // 3. Cargar notas clínicas existentes
  // --------------------------------------------------
  useEffect(() => {
    const cargarNotas = async () => {
      setLoadingNotas(true);
      setErrorNotas("");

      let listaBasica = [];
      try {
        // este endpoint puede tirar error DatetimeWithNanoseconds -> lo capturamos
        const resp = await getAllNotasClinicas();
        if (Array.isArray(resp)) {
          listaBasica = resp;
        } else if (resp && Array.isArray(resp.notas)) {
          listaBasica = resp.notas;
        }
      } catch (errList) {
        console.warn(
          "Fallo obtener_notas_clinicas (posible DatetimeWithNanoseconds):",
          errList
        );
        setErrorNotas(
          "Hubo un problema al listar algunas notas. Todavía puedes crear y ver notas individuales."
        );
        listaBasica = [];
      }

      // obtenemos los IDs únicos de nota que el backend nos dio
      const uniqueIds = [
        ...new Set(
          listaBasica
            .map((item) => item.uid || item.id || item.note_id || "")
            .filter(Boolean)
        ),
      ];

      // pedimos cada nota por ID
      const detallesPromises = uniqueIds.map(async (notaUid) => {
        try {
          const resDet = await getNotaClinicaById({ uid: notaUid });
          const raw = resDet?.nota || resDet || {};

          // UID del paciente dueño de la nota
          const pacienteUid = raw.user_id || "";

          // conseguimos su nombre a través del mapa de pacientes
          const nombrePaciente =
            mapPacientesByUid[pacienteUid] || pacienteUid || "—";

          return {
            note_uid:
              raw.uid ||
              raw.id ||
              raw.note_id ||
              notaUid ||
              generarUidNota(),

            user_id: pacienteUid,
            paciente_nombre: nombrePaciente,

            fecha_generacion: raw.fecha_generacion || "",
            tipo_reporte: raw.tipo_reporte || "",
            transtorno_posible: raw.transtorno_posible || "",
            contenido_reporte: raw.contenido_reporte || "",
            recomendaciones_reporte: raw.recomendaciones_reporte || "",
          };
        } catch (err) {
          console.warn("No se pudo cargar detalle de nota:", notaUid, err);
          return null;
        }
      });

      const notasDetalladas = await Promise.all(detallesPromises);
      const limpias = notasDetalladas.filter(Boolean);

      // orden cronológico descendente
      limpias.sort((a, b) => {
        const ta = new Date(a.fecha_generacion).getTime() || 0;
        const tb = new Date(b.fecha_generacion).getTime() || 0;
        return tb - ta;
      });

      setNotas(limpias);
      setLoadingNotas(false);
    };

    // cargamos notas cuando ya tengamos pacientes (para que podamos mapear nombres)
    if (pacientes.length > 0 || uidActualAuth) {
      cargarNotas();
    }
  }, [pacientes, uidActualAuth, mapPacientesByUid]);

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
          // intentar cargar versión backend con ese UID
          try {
            const resp = await getNotaClinicaById({ uid: noteUidVisible });
            const raw = resp?.nota || resp || {};

            const pacienteUid = raw.user_id || enMemoria.user_id || "—";
            const nombrePaciente =
              mapPacientesByUid[pacienteUid] ||
              enMemoria.paciente_nombre ||
              pacienteUid ||
              "—";

            const detalleFinal = {
              note_uid:
                raw.uid ||
                raw.id ||
                raw.note_id ||
                noteUidVisible,
              user_id: pacienteUid,
              paciente_nombre: nombrePaciente,
              fecha_generacion:
                raw.fecha_generacion ||
                enMemoria.fecha_generacion ||
                "",
              tipo_reporte:
                raw.tipo_reporte ||
                enMemoria.tipo_reporte ||
                "",
              transtorno_posible:
                raw.transtorno_posible ||
                enMemoria.transtorno_posible ||
                "—",
              contenido_reporte:
                raw.contenido_reporte ||
                enMemoria.contenido_reporte ||
                "—",
              recomendaciones_reporte:
                raw.recomendaciones_reporte ||
                enMemoria.recomendaciones_reporte ||
                "—",
            };

            setNotaDetalle(detalleFinal);
          } catch {
            // si no existe en backend con ese ID (por ejemplo es un UID "nota_..."), usamos lo que tenemos
            const pacienteUid = enMemoria.user_id || "—";
            const nombrePaciente =
              mapPacientesByUid[pacienteUid] ||
              enMemoria.paciente_nombre ||
              pacienteUid ||
              "—";

            setNotaDetalle({
              ...enMemoria,
              user_id: pacienteUid,
              paciente_nombre: nombrePaciente,
              note_uid: enMemoria.note_uid || noteUidVisible,
              contenido_reporte: enMemoria.contenido_reporte || "—",
              recomendaciones_reporte:
                enMemoria.recomendaciones_reporte || "—",
            });
          }
        } else {
          // nota no está en memoria -> intento backend directo
          const resp = await getNotaClinicaById({ uid: noteUidVisible });
          const raw = resp?.nota || resp || {};

          const pacienteUid = raw.user_id || "—";
          const nombrePaciente =
            mapPacientesByUid[pacienteUid] ||
            pacienteUid ||
            "—";

          setNotaDetalle({
            note_uid:
              raw.uid ||
              raw.id ||
              raw.note_id ||
              noteUidVisible,
            user_id: pacienteUid,
            paciente_nombre: nombrePaciente,
            fecha_generacion: raw.fecha_generacion || "",
            tipo_reporte: raw.tipo_reporte || "",
            transtorno_posible: raw.transtorno_posible || "—",
            contenido_reporte: raw.contenido_reporte || "—",
            recomendaciones_reporte:
              raw.recomendaciones_reporte || "—",
          });
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
  // 5. Inputs del formulario
  // --------------------------------------------------
  const handleFormChange = useCallback(
    (key) => (e) => {
      const value = e.target.value;
      setForm((prev) => ({ ...prev, [key]: value }));
      setFormMsg({ type: "", text: "" });
    },
    []
  );

  // --------------------------------------------------
  // 6. Guardar nueva nota
  // --------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormMsg({ type: "", text: "" });

    if (!pacienteSeleccionadoUid) {
      setFormMsg({
        type: "error",
        text: "❌ Selecciona un paciente.",
      });
      return;
    }

    if (!form.contenido_reporte.trim()) {
      setFormMsg({
        type: "error",
        text: "❌ El contenido del reporte es obligatorio.",
      });
      return;
    }

    if (!form.transtorno_posible.trim()) {
      setFormMsg({
        type: "error",
        text: "❌ Debes indicar el posible trastorno.",
      });
      return;
    }

    const fecha_generacion = new Date().toISOString();
    const nuevoNoteUid = generarUidNota();

    // payload EXACTO que tu backend espera
    const payload = {
      user_id: pacienteSeleccionadoUid,
      contenido_reporte: form.contenido_reporte.trim(),
      recomendaciones_reporte: form.recomendaciones_reporte.trim(),
      transtorno_posible: form.transtorno_posible.trim(),
      fecha_generacion,
      tipo_reporte: form.tipo_reporte,
    };

    setSubmitting(true);
    try {
      const resp = await agregarNotaClinica(payload);

      const backendUid =
        resp?.uid ||
        resp?.id ||
        resp?.note_id ||
        resp?.nota_id ||
        null;

      const finalNoteUid = backendUid || nuevoNoteUid;

      // nombre siempre desde el diccionario o desde selección actual
      const nombrePacienteVisible =
        mapPacientesByUid[pacienteSeleccionadoUid] ||
        pacienteSeleccionadoNombre ||
        pacienteSeleccionadoUid;

      const nuevaNotaVisual = {
        note_uid: finalNoteUid,
        user_id: pacienteSeleccionadoUid,
        paciente_nombre: nombrePacienteVisible,
        fecha_generacion,
        tipo_reporte: form.tipo_reporte,
        transtorno_posible: form.transtorno_posible.trim(),
        contenido_reporte: form.contenido_reporte.trim(),
        recomendaciones_reporte: form.recomendaciones_reporte.trim(),
      };

      setNotas((prev) => [nuevaNotaVisual, ...prev]);

      setFormMsg({
        type: "success",
        text: "✅ Nota clínica registrada correctamente.",
      });

      setForm({
        contenido_reporte: "",
        recomendaciones_reporte: "",
        transtorno_posible: "",
        tipo_reporte: form.tipo_reporte,
      });
    } catch (err) {
      console.error("Error al enviar nota clínica:", err);
      setFormMsg({
        type: "error",
        text:
          err?.message ||
          "❌ Error inesperado al intentar guardar la nota clínica.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-purple-100 to-teal-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex flex-col">

      {/* ya NO renderizamos <Header /> para quitar el encabezado superior */}

      <main className="flex-1 w-full pt-8 px-4 pb-24 max-w-7xl mx-auto text-gray-800 dark:text-gray-100">
        <div className="flex flex-col gap-6 lg:flex-row">

          {/* LISTA DE NOTAS */}
          <section className="w-full lg:w-2/3">
            <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl border border-white/40 dark:border-gray-700/50 rounded-2xl p-4 md:p-6">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                    Notas Clínicas Registradas
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Vista general de cada reporte.
                  </p>
                </div>
                <ThemeToggle />
              </div>

              {loadingNotas ? (
                <div className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
                  Cargando notas clínicas...
                </div>
              ) : (
                <>
                  {errorNotas && (
                    <div className="rounded-lg border border-red-400/40 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 px-4 py-3 text-sm mb-4">
                      {errorNotas}
                    </div>
                  )}

                  {notas.length === 0 ? (
                    <div className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">
                      No hay notas clínicas registradas todavía.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="text-gray-600 dark:text-gray-400 text-[10px] uppercase border-b border-gray-200/50 dark:border-gray-700/60">
                            <th className="py-2 pr-4 font-medium">ID Nota</th>
                            <th className="py-2 pr-4 font-medium">Paciente</th>
                            <th className="py-2 pr-4 font-medium">Fecha</th>
                            <th className="py-2 pr-4 font-medium">Tipo</th>
                            <th className="py-2 pr-4 font-medium">
                              Trastorno
                            </th>
                            <th className="py-2 pr-4 font-medium">
                              Contenido
                            </th>
                            <th className="py-2 pr-4 font-medium">Ver</th>
                          </tr>
                        </thead>
                        <tbody>
                          {notas.map((n, idx) => (
                            <tr
                              key={idx}
                              className="border-b border-gray-200/40 dark:border-gray-700/40 hover:bg-sky-50/60 dark:hover:bg-gray-700/30 transition-colors align-top"
                            >
                              <td className="py-2 pr-4 text-gray-800 dark:text-gray-100 text-[11px] break-all">
                                {n.note_uid || "—"}
                              </td>

                              {/* Paciente siempre intenta usar nombre completo */}
                              <td className="py-2 pr-4 text-gray-700 dark:text-gray-300 text-[11px] break-all">
                                <div className="font-semibold text-[11px] text-gray-800 dark:text-gray-100">
                                  {n.paciente_nombre ||
                                    mapPacientesByUid[n.user_id] ||
                                    n.user_id ||
                                    "—"}
                                </div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                  {n.user_id || "—"}
                                </div>
                              </td>

                              <td className="py-2 pr-4 text-gray-700 dark:text-gray-300 text-[11px]">
                                {formatFecha(n.fecha_generacion)}
                              </td>

                              <td className="py-2 pr-4 text-[11px]">
                                <span className="inline-block text-[10px] px-2 py-1 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-300/40 dark:border-indigo-700/40">
                                  {n.tipo_reporte || "—"}
                                </span>
                              </td>

                              <td className="py-2 pr-4 text-gray-700 dark:text-gray-300 text-[11px]">
                                {n.transtorno_posible || "—"}
                              </td>

                              <td className="py-2 pr-4 text-gray-700 dark:text-gray-300 text-[11px] max-w-[200px]">
                                {preview(n.contenido_reporte, 80)}
                              </td>

                              <td className="py-2 pr-4">
                                <button
                                  onClick={() => abrirNota(n.note_uid)}
                                  className="text-indigo-600 dark:text-indigo-300 text-[11px] font-semibold hover:underline"
                                >
                                  Ver nota
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* REGISTRAR NOTA */}
          <section className="w-full lg:w-1/3">
            <div className="bg-white/70 dark:bg-gray-800/60 backdrop-blur-xl shadow-xl border border-white/40 dark:border-gray-700/50 rounded-2xl p-4 md:p-6 relative">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
                Registrar Nota Clínica
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                1) Busca paciente • 2) Llena la nota • 3) Guarda
              </p>

              {formMsg.text && (
                <div
                  className={
                    "mb-4 rounded-lg border px-4 py-3 text-sm " +
                    (formMsg.type === "error"
                      ? "border-red-400/40 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300"
                      : "border-green-400/40 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300")
                  }
                >
                  {formMsg.text}
                </div>
              )}

              {/* buscador de paciente tipo autocomplete */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Paciente
                </label>

                <div className="relative">
                  <input
                    type="text"
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-900/60 text-gray-800 dark:text-gray-100 text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Buscar por nombre o UID..."
                    value={inputNombrePaciente}
                    onChange={handleBuscarPacienteChange}
                    onFocus={() => setShowListaPacientes(true)}
                  />

                  {showListaPacientes && pacientesFiltrados.length > 0 && (
                    <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg text-sm">
                      {pacientesFiltrados.map((p) => (
                        <li
                          key={p.uidPaciente}
                          className="px-3 py-2 cursor-pointer hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-900/40 dark:hover:text-indigo-300 text-gray-800 dark:text-gray-100"
                          onMouseDown={() => handleElegirPaciente(p)}
                        >
                          <div className="font-semibold text-[13px] leading-tight">
                            {p.nombrePaciente}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                            {p.uidPaciente}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-2">
                  {pacienteSeleccionadoUid ? (
                    <>
                      Paciente seleccionado:{" "}
                      <b>{pacienteSeleccionadoNombre || "—"}</b>{" "}
                      ({pacienteSeleccionadoUid})
                      <br />
                      <span className="text-[10px]">
                        Este UID se enviará como <b>user_id</b>.
                      </span>
                    </>
                  ) : (
                    "No hay paciente seleccionado."
                  )}
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de reporte
                  </label>
                  <select
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-900/40 text-gray-800 dark:text-gray-100 text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.tipo_reporte}
                    onChange={handleFormChange("tipo_reporte")}
                  >
                    <option value="diagnóstico">Diagnóstico</option>
                    <option value="seguimiento">Seguimiento</option>
                    <option value="alta">Alta</option>
                    <option value="referencia">Referencia</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Posible trastorno / motivo principal
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-900/40 text-gray-800 dark:text-gray-100 text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej. ansiedad, duelo, episodio depresivo..."
                    value={form.transtorno_posible}
                    onChange={handleFormChange("transtorno_posible")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contenido del reporte clínico
                  </label>
                  <textarea
                    className="w-full min-h-[90px] rounded-xl border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-900/40 text-gray-800 dark:text-gray-100 text-sm px-3 py-2 outline-none resize-y focus:ring-2 focus:ring-indigo-500"
                    placeholder="Descripción clínica, estado emocional, factores de riesgo, hallazgos en sesión..."
                    value={form.contenido_reporte}
                    onChange={handleFormChange("contenido_reporte")}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Recomendaciones / Plan
                  </label>
                  <textarea
                    className="w-full min-h-[70px] rounded-xl border border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-900/40 text-gray-800 dark:text-gray-100 text-sm px-3 py-2 outline-none resize-y focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ej. ejercicios de respiración, seguimiento semanal, derivación si hay riesgo, etc."
                    value={form.recomendaciones_reporte}
                    onChange={handleFormChange("recomendaciones_reporte")}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={
                    "w-full flex justify-center items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2 transition-colors " +
                    (submitting
                      ? "bg-gray-400 text-white dark:bg-gray-600 cursor-not-allowed"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400")
                  }
                >
                  {submitting ? "Guardando..." : "Guardar Nota Clínica"}
                </button>
              </form>
            </div>
          </section>
        </div>
      </main>

      {/* MODAL DETALLE */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-white/40 dark:border-gray-700/50 p-6 relative">
            <button
              onClick={cerrarModal}
              className="absolute top-3 right-3 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-semibold"
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
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scroll">
                <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      ID nota:
                    </span>{" "}
                    {notaDetalle.note_uid || "—"}
                  </div>

                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Paciente:
                    </span>{" "}
                    {notaDetalle.paciente_nombre
                      ? `${notaDetalle.paciente_nombre} (${notaDetalle.user_id})`
                      : `${mapPacientesByUid[notaDetalle.user_id] || "—"} (${notaDetalle.user_id || "—"})`}
                  </div>

                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Fecha:
                    </span>{" "}
                    {formatFecha(notaDetalle.fecha_generacion)}
                  </div>

                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Tipo de reporte:
                    </span>{" "}
                    {notaDetalle.tipo_reporte || "—"}
                  </div>

                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Posible trastorno:
                    </span>{" "}
                    {notaDetalle.transtorno_posible || "—"}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    Contenido del reporte clínico
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {notaDetalle.contenido_reporte || "—"}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">
                    Recomendaciones / Plan
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {notaDetalle.recomendaciones_reporte || "—"}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={cerrarModal}
                className="text-sm font-semibold rounded-xl px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100 transition-colors"
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
    </div>
  );
}
