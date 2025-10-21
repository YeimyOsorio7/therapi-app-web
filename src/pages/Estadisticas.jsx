// src/pages/Estadisticas.jsx
import { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Document, Packer, Paragraph, Table, TableRow, TableCell } from 'docx';
// import { saveAs } from 'file-saver';
// ✅ Importamos la función de API correcta
import { getAllPacientes } from '../services/api';

const COLORS = ['#10b981', '#fbbf24', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

const defaultResumen = {
  totalCitas: 0,
  atendidas: 0,
  canceladas: 0,
  pendientes: 0,
  temasFrecuentes: [], 
  error: null,
};

const Estadisticas = () => {
  const [resumen, setResumen] = useState(defaultResumen);
  const [loading, setLoading] = useState(true);

  // ✅ FUNCIÓN MODIFICADA PARA PROCESAR LOS DATOS DE PACIENTES
  const fetchEstadisticas = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Llamamos a la API que trae la lista de pacientes
      const data = await getAllPacientes();
      
      // 2. Verificamos que la respuesta sea correcta
      if (data && data.patients && Array.isArray(data.patients)) {
        const patients = data.patients;

        // --- 3. Procesamos los datos ---

        // Total de Citas (usando total de pacientes como sustituto)
        const totalCitas = data.total || patients.length; 
        
        // Gráfico de Pastel: Contamos los estados de los pacientes
        // (Esto es una suposición, ya que los datos de "citas" no están aquí)
        let atendidas = 0;
        let pendientes = 0;
        
        patients.forEach(p => {
          if (p.paciente?.estado_paciente === 'Activo') {
            atendidas++;
          } else {
            pendientes++;
          }
        });

        // Gráfico de Barras: Contamos los "Temas Frecuentes"
        const temasMap = new Map();
        patients.forEach(p => {
          // Usamos el diagnóstico de sigsa o la patología de ficha_medica
          const tema = p.sigsa?.diagnostico || p.ficha_medica?.patologia;
          if (tema && tema !== "null") {
            temasMap.set(tema, (temasMap.get(tema) || 0) + 1);
          }
        });
        
        const temasFrecuentes = Array.from(temasMap, ([name, cantidad]) => ({ name, cantidad }));
        
        // 4. Actualizamos el estado
        setResumen({
          totalCitas: totalCitas,
          atendidas: atendidas,
          canceladas: 0, // No tenemos este dato en la lista de pacientes
          pendientes: pendientes,
          temasFrecuentes: temasFrecuentes,
          error: null,
        });

      } else {
        // Si la respuesta no es el formato esperado
        throw new Error("Formato de datos incorrecto recibido de la API.");
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      setResumen(prev => ({ ...prev, error: error.message }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEstadisticas();
  }, [fetchEstadisticas]);

  // (El resto del componente de renderizado no cambia)

  const pieData = [
    { name: 'Atendidas (Activos)', value: resumen.atendidas },
    { name: 'Pendientes (Otro)', value: resumen.pendientes },
  ].filter(item => item.value > 0);

  const barData = resumen.temasFrecuentes;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96 text-gray-600 dark:text-gray-400">
        Cargando estadísticas...
      </div>
    );
  }

  if (resumen.error) {
    return (
      <div className="p-4 text-red-500">
        <h2 className="font-bold">Error al cargar los datos:</h2>
        <pre className="mt-2 p-2 bg-red-100 rounded text-sm whitespace-pre-wrap">
          {resumen.error}
        </pre>
      </div>
    );
  }
  
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Estadísticas de Pacientes</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total de Pacientes</h3>
          <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{resumen.totalCitas}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-green-500">Pacientes Activos</h3>
          <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{resumen.atendidas}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-red-500">Canceladas</h3>
          <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{resumen.canceladas}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-yellow-500">Otros Estados</h3>
          <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{resumen.pendientes}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Distribución de Pacientes</h2>
          <div className="w-full h-[300px]">
            {pieData.length > 0 ? (
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
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">No hay datos para mostrar.</div>
            )}
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Frecuencia de Temas</h2>
          <div className="w-full h-[300px]">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cantidad" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">No hay datos para mostrar.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Estadisticas;