import { useState } from 'react';
import ThemeToggle from './ThemeToggle';

const Recursos = () => {
  const [recursos, setRecursos] = useState([
    { id: 1, nombre: 'Guía de respiración consciente', tipo: 'PDF', url: 'https://example.com/guia-respiracion.pdf' },
    { id: 2, nombre: 'Video: Afirmaciones positivas', tipo: 'Video', url: 'https://example.com/video-afirmaciones' },
    { id: 3, nombre: 'Infografía sobre autoestima', tipo: 'Imagen', url: 'https://example.com/infografia-autoestima' }
  ]);

  const [nuevo, setNuevo] = useState({ nombre: '', tipo: '', url: '' });
  const [modal, setModal] = useState({ mostrar: false, id: null });

  const agregarRecurso = () => {
    if (!nuevo.nombre || !nuevo.tipo || !nuevo.url) return;
    const nuevoRecurso = { ...nuevo, id: Date.now() };
    setRecursos([nuevoRecurso, ...recursos]);
    setNuevo({ nombre: '', tipo: '', url: '' });
  };

  const eliminarRecurso = (id) => {
    setRecursos(recursos.filter((r) => r.id !== id));
    setModal({ mostrar: false, id: null });

    const toast = document.createElement('div');
    toast.textContent = '🗑️ Recurso eliminado correctamente';
    toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-rose-600 text-white px-4 py-2 rounded shadow z-50';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  return (
    <div className="min-h-screen bg-violet-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 p-6">
      <ThemeToggle />
      <h1 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mb-6">📁 Recursos</h1>

      <div className="mb-6 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-4 rounded-lg shadow space-y-2">
        <h2 className="text-lg font-semibold">Agregar recurso</h2>
        <input
          type="text"
          placeholder="Nombre del recurso"
          value={nuevo.nombre}
          onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
          className="w-full px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
        />
        <input
          type="text"
          placeholder="Tipo (PDF, Video, Imagen...)"
          value={nuevo.tipo}
          onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}
          className="w-full px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
        />
        <input
          type="url"
          placeholder="Enlace URL"
          value={nuevo.url}
          onChange={(e) => setNuevo({ ...nuevo, url: e.target.value })}
          className="w-full px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
        />
        <button
          onClick={agregarRecurso}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Guardar recurso
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recursos.map((recurso) => (
          <div key={recurso.id} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 shadow">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{recurso.nombre}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Tipo: {recurso.tipo}</p>
            <a
              href={recurso.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-medium text-sm px-4 py-2 rounded shadow transition"
            >
              Ver recurso
            </a>
            <button
              onClick={() => setModal({ mostrar: true, id: recurso.id })}
              className="mt-2 w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-medium text-sm px-4 py-2 rounded shadow transition"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>

      {modal.mostrar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-xl max-w-sm w-full text-center">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">¿Está seguro?</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">Esta acción eliminará el recurso permanentemente.</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setModal({ mostrar: false, id: null })}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminarRecurso(modal.id)}
                className="px-4 py-2 rounded bg-rose-600 hover:bg-rose-700 text-white text-sm"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recursos;
