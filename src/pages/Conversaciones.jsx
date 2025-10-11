// src/pages/Conversaciones.jsx
import { useState } from "react";

const Conversaciones = () => {
  const [conversaciones] = useState([
    {
      id: 1,
      fecha: "2025-06-01",
      hora: "09:15",
      resumen:
        "El usuario expresó ansiedad y se ofreció orientación para técnicas de respiración.",
      detalle:
        "Durante la sesión se exploraron causas posibles del malestar emocional. Se brindaron ejercicios de respiración profunda y se sugirió escribir un diario emocional diario.",
    },
    {
      id: 2,
      fecha: "2025-06-02",
      hora: "16:40",
      resumen: "Conversación sobre estrés laboral y agotamiento emocional.",
      detalle:
        "El usuario compartió sobre cargas laborales excesivas. Se sugirió establecer límites, realizar pausas activas y se validaron sus emociones.",
    },
    {
      id: 3,
      fecha: "2025-06-03",
      hora: "11:00",
      resumen:
        "Se habló de inseguridades personales y estrategias de afirmación positiva.",
      detalle:
        "Se exploraron pensamientos automáticos negativos. Se trabajó en reformulación cognitiva y técnicas de autoestima básica.",
    },
  ]);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [detalleSeleccionado, setDetalleSeleccionado] = useState("");
  const [cabeceraSeleccionada, setCabeceraSeleccionada] = useState("");

  const descargarTexto = (titulo, contenido) => {
    const blob = new Blob([contenido], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${titulo}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const abrirModal = (conv) => {
    setDetalleSeleccionado(conv.detalle);
    setCabeceraSeleccionada(`${conv.fecha} ${conv.hora}`);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setDetalleSeleccionado("");
    setCabeceraSeleccionada("");
  };

  return (
    <div className="min-h-screen p-4 md:p-6 bg-violet-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-[1200px] rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-white dark:bg-gray-900 shadow">
        {/* Encabezado */}
        <div className="px-5 md:px-6 py-4 md:py-5 rounded-t-2xl bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-200/60 dark:border-indigo-800/50">
          <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
            <span role="img" aria-label="chat">💬</span> Conversaciones Anónimas
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Vista de conversaciones con diseño unificado.
          </p>
        </div>

        {/* Contenido */}
        <div className="p-5 md:p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {conversaciones.map((conv) => (
              <article
                key={conv.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow hover:shadow-md transition flex flex-col"
              >
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  <div>
                    <strong>Fecha:</strong> {conv.fecha}
                  </div>
                  <div>
                    <strong>Hora:</strong> {conv.hora}
                  </div>
                </div>

                <p className="text-sm text-gray-900 dark:text-gray-100 mb-3">
                  {conv.resumen}
                </p>

                <div className="mt-auto flex items-center justify-between gap-2">
                  <button
                    onClick={() => abrirModal(conv)}
                    className="text-xs px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    👁️ Ver detalles
                  </button>
                  <button
                    onClick={() =>
                      descargarTexto(
                        `Conversacion_${conv.id}`,
                        conv.detalle
                      )
                    }
                    className="text-xs px-3 py-1.5 rounded bg-slate-600 hover:bg-slate-700 text-white"
                  >
                    📄 Descargar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={cerrarModal}
          />
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                📝 Detalles — {cabeceraSeleccionada}
              </h3>
              <button
                onClick={cerrarModal}
                className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Cerrar"
              >
                ✖
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm whitespace-pre-line text-gray-900 dark:text-gray-100">
                {detalleSeleccionado}
              </p>
              <div className="mt-4 flex items-center justify-end">
                <button
                  onClick={cerrarModal}
                  className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Conversaciones;
