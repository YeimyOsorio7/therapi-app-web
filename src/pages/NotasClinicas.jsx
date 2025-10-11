// src/pages/NotasClinicas.jsx
import { useEffect, useMemo, useState } from "react";

/* ========================= LocalStorage helpers ========================= */
const LS_KEY = "notasClinicas";

const getNotasLS = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Semilla inicial si no hay nada guardado
  return [
    {
      id: 1,
      fecha: "2025-06-03",
      paciente: "Anónimo 2",
      contenido:
        "Se trabajó sobre autoestima. Se recomendó mantener un diario de pensamientos positivos.",
    },
    {
      id: 2,
      fecha: "2025-06-01",
      paciente: "Anónimo 1",
      contenido:
        "Paciente mostró señales de ansiedad moderada. Se recomendó seguimiento quincenal y práctica de técnicas de respiración.",
    },
  ];
};

const setNotasLS = (arr) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
  } catch {}
};

/* ========================= Utils ========================= */
const parseFecha = (str) => {
  if (!str) return null;
  // soporta yyyy-mm-dd
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{title}</h3>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Cerrar"
          >
            ✖
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

/* ========================= Página ========================= */
const NotasClinicas = () => {
  const [notas, setNotas] = useState(getNotasLS());
  const [nuevaNota, setNuevaNota] = useState({ fecha: "", paciente: "", contenido: "" });

  // filtros
  const [q, setQ] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // modal ver
  const [view, setView] = useState(null);

  useEffect(() => {
    setNotasLS(notas);
  }, [notas]);

  const agregarNota = () => {
    if (!nuevaNota.fecha || !nuevaNota.paciente.trim() || !nuevaNota.contenido.trim()) return;
    const nueva = { ...nuevaNota, id: Date.now() };
    setNotas((prev) => [nueva, ...prev]);
    setNuevaNota({ fecha: "", paciente: "", contenido: "" });
  };

  const eliminarNota = (id) => {
    setNotas((prev) => prev.filter((n) => n.id !== id));
  };

  const filtradas = useMemo(() => {
    const query = q.trim().toLowerCase();
    const dDesde = desde ? new Date(desde) : null;
    const dHasta = hasta ? new Date(hasta) : null;

    return [...notas]
      .filter((n) => {
        const tMatch =
          !query ||
          n.paciente.toLowerCase().includes(query) ||
          n.contenido.toLowerCase().includes(query);

        const f = parseFecha(n.fecha);
        const fMatch = (!dDesde || (f && f >= dDesde)) && (!dHasta || (f && f <= dHasta));
        return tMatch && fMatch;
      })
      .sort((a, b) => {
        // recientes primero
        const A = parseFecha(a.fecha)?.getTime() || 0;
        const B = parseFecha(b.fecha)?.getTime() || 0;
        return B - A;
      });
  }, [notas, q, desde, hasta]);

  const resetFiltros = () => {
    setQ("");
    setDesde("");
    setHasta("");
  };

  return (
    <div className="min-h-screen p-4 md:p-6 bg-violet-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100">
      <div className="mx-auto max-w-[1200px] rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 bg-white dark:bg-gray-900 shadow">
        {/* Header */}
        <div className="px-5 md:px-6 py-4 md:py-5 rounded-t-2xl bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-200/60 dark:border-indigo-800/50">
          <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
            <span role="img" aria-label="nota">📝</span> Notas Clínicas
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Registra y consulta notas clínicas. Se guardan localmente para mayor rapidez.
          </p>
        </div>

        {/* Contenido */}
        <div className="p-5 md:p-6 space-y-6">
          {/* Formulario agregar */}
          <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="font-semibold text-indigo-700 dark:text-indigo-300 mb-3">
              Agregar nueva nota
            </h2>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div>
                <label className="block text-xs mb-1">Fecha *</label>
                <input
                  type="date"
                  value={nuevaNota.fecha}
                  onChange={(e) => setNuevaNota({ ...nuevaNota, fecha: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-xs mb-1">Paciente *</label>
                <input
                  type="text"
                  placeholder="Nombre o código del paciente"
                  value={nuevaNota.paciente}
                  onChange={(e) => setNuevaNota({ ...nuevaNota, paciente: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs mb-1">Contenido *</label>
                <textarea
                  rows={3}
                  placeholder="Contenido de la nota (observaciones, indicaciones, etc.)"
                  value={nuevaNota.contenido}
                  onChange={(e) => setNuevaNota({ ...nuevaNota, contenido: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end mt-3">
              <button
                onClick={agregarNota}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Guardar nota
              </button>
            </div>
          </section>

          {/* Toolbar de filtros */}
          <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar por paciente o contenido..."
                  className="w-72 max-w-[60vw] pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 opacity-60">🔎</span>
              </div>

              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                title="Desde"
              />
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
                title="Hasta"
              />

              <button
                onClick={resetFiltros}
                className="px-3 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm"
              >
                🔄 Limpiar filtros
              </button>
            </div>
          </section>

          {/* Grid de notas */}
          <section>
            {filtradas.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No hay notas que coincidan con los filtros.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtradas.map((nota) => (
                  <article
                    key={nota.id}
                    className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow flex flex-col"
                  >
                    <div className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                      <div><strong>Fecha:</strong> {nota.fecha}</div>
                      <div className="mt-1">
                        <strong>Paciente:</strong>{" "}
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                          {nota.paciente}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap flex-1">
                      {nota.contenido}
                    </p>

                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setView(nota)}
                        className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                        title="Ver nota"
                      >
                        👁️ Ver
                      </button>
                      <button
                        onClick={() => eliminarNota(nota.id)}
                        className="px-3 py-1.5 rounded bg-rose-500 hover:bg-rose-600 text-white text-sm"
                        title="Eliminar"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Modal Ver */}
      <Modal open={!!view} onClose={() => setView(null)} title={view ? `Nota de ${view.paciente}` : ""}>
        {view && (
          <div className="space-y-2 text-sm">
            <div className="text-gray-600 dark:text-gray-400">
              <strong>Fecha:</strong> {view.fecha}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              <strong>Paciente:</strong> {view.paciente}
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 whitespace-pre-wrap text-gray-900 dark:text-gray-100">
              {view.contenido}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default NotasClinicas;
