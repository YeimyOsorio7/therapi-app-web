// src/pages/Estadisticas.jsx
import { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Document, Packer, Paragraph, Table, TableRow, TableCell } from 'docx';
import { saveAs } from 'file-saver';
// ✅ Importamos la función de API
import { getEstadisticas } from '../services/api';

const COLORS = ['#10b981', '#fbbf24', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

// Estructura mínima de los datos que esperamos de la API
const defaultResumen = {
  totalCitas: 0,
  atendidas: 0,
  canceladas: 0,
  pendientes: 0,
  // Asumimos que la API devuelve los temas con el formato { name: string, cantidad: number }
  temasFrecuentes: [], 
  error: null,
};

const Estadisticas = () => {
  const [resumen, setResumen] = useState(defaultResumen);
  const [loading, setLoading] = useState(true);

  // ✅ FUNCIÓN PARA CARGAR DATOS EN TIEMPO REAL
  const fetchEstadisticas = useCallback(async () => {
    setLoading(true);
    try {
      // ✅ Llamada a la API
      const data = await getEstadisticas();
      
      // Mapeo simple: Asumimos que la API devuelve las mismas claves que el resumen.
      setResumen({
        totalCitas: data.totalCitas || 0,
        atendidas: data.atendidas || 0,
        canceladas: data.canceladas || 0,
        pendientes: data.pendientes || 0,
        temasFrecuentes: data.temasFrecuentes || [], 
        error: null,
      });

    } catch (err) {
      setResumen(s => ({...s, error: `❌ Error al cargar datos del servidor: ${err.message}. Asegúrate que POST /api/get_dashboard_data esté activo.`}));
      console.error("Error fetching statistics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEstadisticas();
  }, [fetchEstadisticas]);

  // Datos de la Tarta (Pie Chart)
  const pieData = [
    { name: 'Atendidas', value: resumen.atendidas },
    { name: 'Pendientes', value: resumen.pendientes },
    { name: 'Canceladas', value: resumen.canceladas },
  ];

  // Datos de la barra (Bar Chart) - usa temasFrecuentes directamente
  const barData = resumen.temasFrecuentes; 

  const exportarDocx = () => {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph("\ud83d\udcc4 INFORME DE ESTADÍSTICAS"),
            new Paragraph(`Generado el: ${new Date().toLocaleDateString()}`),
            new Paragraph("Resumen de Citas:"),
            new Table({
              rows: [
                new TableRow({ children: [new TableCell({ children: [new Paragraph("Total")] }), new TableCell({ children: [new Paragraph(resumen.totalCitas.toString())] })] }),
                new TableRow({ children: [new TableCell({ children: [new Paragraph("Atendidas")] }), new TableCell({ children: [new Paragraph(resumen.atendidas.toString())] })] }),
                new TableRow({ children: [new TableCell({ children: [new Paragraph("Pendientes")] }), new TableCell({ children: [new Paragraph(resumen.pendientes.toString())] })] }),
                new TableRow({ children: [new TableCell({ children: [new Paragraph("Canceladas")] }), new TableCell({ children: [new Paragraph(resumen.canceladas.toString())] })] }),
              ],
            }),
            new Paragraph(""),
            new Paragraph("Temas Frecuentes:"),
            ...resumen.temasFrecuentes.map(t => new Paragraph(`\u2022 ${t.name || t} (${t.cantidad || 'N/A'})`)),
          ],
        },
      ],
    });

    Packer.toBlob(doc).then((blob) => {
      saveAs(blob, "estadisticas.docx");
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl font-semibold text-indigo-600 dark:text-indigo-300">Cargando estadísticas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-sky-700 dark:text-sky-300 mb-6 flex justify-between items-center">
        <span>📊 Estadísticas de Citas</span>
        <button
          onClick={fetchEstadisticas}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg shadow disabled:opacity-50 text-sm"
          disabled={loading}
        >
          {loading ? 'Cargando...' : 'Actualizar Datos'}
        </button>
      </h1>

      {resumen.error && (
        <div className="bg-rose-100 dark:bg-rose-900/30 border border-rose-300 dark:border-rose-800 rounded-lg p-4 mb-4 text-rose-700 dark:text-rose-200 font-medium">
          {resumen.error}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <button
          // La lógica de exportación a PDF requiere librerías adicionales que no están incluidas aquí
          className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded shadow"
        >
          \ud83d\udcc4 Descargar PDF
        </button>

        <button
          onClick={exportarDocx}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow"
        >
          \ud83d\udcdd Exportar a Word
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 shadow">
          <h2 className="text-lg font-semibold">Total de Citas</h2>
          <p className="text-3xl font-bold text-sky-600 dark:text-sky-300">{resumen.totalCitas}</p>
        </div>

        <div className="bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg p-4 shadow">
          <h2 className="text-lg font-semibold">Citas Atendidas</h2>
          <p className="text-3xl font-bold text-green-700 dark:text-green-200">{resumen.atendidas}</p>
        </div>

        <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4 shadow">
          <h2 className="text-lg font-semibold">Pendientes</h2>
          <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-200">{resumen.pendientes}</p>
        </div>

        <div className="bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg p-4 shadow">
          <h2 className="text-lg font-semibold">Canceladas</h2>
          <p className="text-3xl font-bold text-red-700 dark:text-red-200">{resumen.canceladas}</p>
        </div>
      </div>

      {/* Temas Frecuentes - Lista */}
      <div className="mt-8 col-span-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 shadow">
        <h2 className="text-lg font-semibold mb-2">Temas Frecuentes ({barData.length})</h2>
        {barData.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No hay datos de temas disponibles.</p>
        ) : (
            <ul className="list-disc pl-6 text-sm text-gray-700 dark:text-gray-300">
                {barData.sort((a,b) => b.cantidad - a.cantidad).map((t, i) => (
                    <li key={i}>{t.name || t.name} ({t.cantidad} citas)</li>
                ))}
            </ul>
        )}
      </div>

      <div className="grid gap-8 mt-8 lg:grid-cols-2">
        {/* Gráfico de Tarta */}
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 shadow">
          <h2 className="text-lg font-semibold mb-4">Distribución de citas</h2>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Gráfico de Barras */}
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-4 shadow">
          <h2 className="text-lg font-semibold mb-4">Frecuencia de temas</h2>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="cantidad" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Estadisticas;