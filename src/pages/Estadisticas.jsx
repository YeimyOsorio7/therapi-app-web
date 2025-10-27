// src/pages/Estadisticas.jsx
import { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
// ✅ Import necessary components from docx and file-saver
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { getAllPacientes } from '../services/api';

// --- Chart Colors (no change) ---
const GENDER_COLORS = ['#3b82f6', '#ec4899', '#a855f7'];
const AGE_COLORS = ['#fbbf24', '#10b981', '#3b82f6'];
const CONSULTA_COLORS = ['#8b5cf6', '#f59e0b'];
const MULTI_COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280', '#d946ef'];

// --- Default State (no change) ---
const defaultStats = { /* ... */ };

// --- Helper: Render Pie Label (no change) ---
// const renderCustomLabel = ({ /* ... */ });

// --- Helper: Generate Word Document ---
const generateDocxReport = (stats) => {
  // Helper function to create styled table cells
  const createCell = (text, bold = false) => new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: String(text), bold: bold })] })],
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: "Informe Estadístico Mensual de Pacientes",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ text: `Fecha de Generación: ${new Date().toLocaleDateString()}`, alignment: AlignmentType.CENTER, spacing: { after: 300 } }),

        new Paragraph({ text: "Resumen General", heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [createCell("Categoría", true), createCell("Cantidad", true)] }),
            new TableRow({ children: [createCell("Total Pacientes"), createCell(stats.totalPacientes)] }),
            new TableRow({ children: [createCell("Hombres"), createCell(stats.countHombres)] }),
            new TableRow({ children: [createCell("Mujeres"), createCell(stats.countMujeres)] }),
            new TableRow({ children: [createCell("Niños (<15)"), createCell(stats.countNinios)] }),
          ],
        }),

        new Paragraph({ text: "Distribución por Género", heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [createCell("Género", true), createCell("Cantidad", true)] }),
            ...stats.generoData.map(item => new TableRow({ children: [createCell(item.name), createCell(item.value)] })),
          ],
        }),

        new Paragraph({ text: "Distribución por Grupo Etario", heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [createCell("Grupo Etario", true), createCell("Cantidad", true)] }),
            ...stats.edadGroupData.map(item => new TableRow({ children: [createCell(item.name), createCell(item.value)] })),
          ],
        }),

         new Paragraph({ text: "Tipo de Consulta", heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [createCell("Tipo", true), createCell("Cantidad", true)] }),
            ...stats.consultaTypeData.map(item => new TableRow({ children: [createCell(item.name), createCell(item.value)] })),
          ],
        }),

        new Paragraph({ text: "Procedencia (Municipio)", heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [createCell("Municipio", true), createCell("Cantidad", true)] }),
            // Show top 10 or all if fewer
            ...stats.municipioData.slice(0, 10).map(item => new TableRow({ children: [createCell(item.name), createCell(item.value)] })),
            ...(stats.municipioData.length > 10 ? [new TableRow({ children: [createCell("Otros..."), createCell(stats.municipioData.slice(10).reduce((sum, item) => sum + item.value, 0))] })] : []),
          ],
        }),

        new Paragraph({ text: "Diagnósticos / Patologías Frecuentes", heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [createCell("Diagnóstico/Patología", true), createCell("Casos", true)] }),
             // Show top 15 or all if fewer
            ...stats.diagnosticoData.slice(0, 15).map(item => new TableRow({ children: [createCell(item.name), createCell(item.value)] })),
             ...(stats.diagnosticoData.length > 15 ? [new TableRow({ children: [createCell("Otros..."), createCell(stats.diagnosticoData.slice(15).reduce((sum, item) => sum + item.value, 0))] })] : []),
          ],
        }),
      ],
    }],
  });

  // Generate and download the document
  Packer.toBlob(doc).then(blob => {
    console.log("Document blob generated");
    saveAs(blob, "Informe_Estadisticas_Pacientes.docx");
    console.log("Download triggered");
  });
};


const Estadisticas = () => {
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false); // State for download button

  // Fetch and Calculate Stats function (no changes needed)
  const fetchAndCalculateStats = useCallback(async () => { /* ... (same as before) ... */
    setLoading(true); setStats(defaultStats); try {
      const data = await getAllPacientes();
      if (!data || !Array.isArray(data.patients)) {
        throw new Error("Formato de datos incorrecto.");
      } 
      const patients = data.patients;
      const totalPacientes = data.total || patients.length;
      let countHombres = 0, countMujeres = 0, countOtroGenero = 0, countNinios = 0, countAdolescentes = 0, countAdultos = 0;
      const municipioMap = new Map();
      const consultaMap = new Map();
      const diagnosticoMap = new Map();

      patients.forEach(p => {
        const sigsa = p.sigsa || {};
        const ficha = p.ficha_medica || {};
        const edadStr = sigsa.edad || ficha.edad;
        const edad = parseInt(edadStr, 10);

        if (!isNaN(edad)) {
          if (sigsa.ninio_menor_15 || edad < 15) countNinios++;
          else if (edad >= 15 && edad < 18) countAdolescentes++;
          else if (sigsa.adulto || edad >= 18) countAdultos++;
        }
      const genero = sigsa.genero || ficha.genero;
      if (genero === 'M' || genero === 'H') countHombres++;
      else if (genero === 'F') countMujeres++;
      else if (genero) countOtroGenero++;
      const municipio = sigsa.municipio || ficha.municipio;
      if (municipio && municipio.toLowerCase() !== 'null') {
        municipioMap.set(municipio, (municipioMap.get(municipio) || 0) + 1);
      }
      const consulta = sigsa.consulta || ficha.tipo_consulta;
      if (consulta && consulta.toLowerCase() !== 'null') {
        if (consulta.toLowerCase().includes('primera')) {
          consultaMap.set('Primera Vez', (consultaMap.get('Primera Vez') || 0) + 1);
        } else if (consulta.toLowerCase().includes('control') || consulta.toLowerCase().includes('reconsulta')) {
          consultaMap.set('Control/Reconsulta', (consultaMap.get('Control/Reconsulta') || 0) + 1);
        }
      }
      const diagnostico = sigsa.diagnostico || ficha.patologia;
      if (diagnostico && diagnostico.toLowerCase() !== 'null') {
        diagnosticoMap.set(diagnostico, (diagnosticoMap.get(diagnostico) || 0) + 1);
      }
    });
    const generoData = [{ name: 'Hombres', value: countHombres }, { name: 'Mujeres', value: countMujeres },];
    if (countOtroGenero > 0) generoData.push({ name: 'Otro/Desc.', value: countOtroGenero });
    const edadGroupData = [{ name: 'Niños (<15)', value: countNinios }, { name: 'Adolescentes (15-17)', value: countAdolescentes }, { name: 'Adultos (18+)', value: countAdultos },];
    const municipioData = Array.from(municipioMap, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const consultaTypeData = Array.from(consultaMap, ([name, value]) => ({ name, value }));
    const diagnosticoData = Array.from(diagnosticoMap, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    setStats({ totalPacientes, countHombres, countMujeres, countNinios, generoData: generoData.filter(i=>i.value>0), edadGroupData, municipioData, consultaTypeData: consultaTypeData.filter(i=>i.value>0), diagnosticoData, error: null, });
  } catch (error) {
    console.error('Error:', error);
    setStats(prev => ({ ...prev, error: error.message }));
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    fetchAndCalculateStats();
  }, [fetchAndCalculateStats]);

  // Handler for the download button
  const handleDownloadReport = () => {
    if (loading || stats.error) {
        alert("Espera a que carguen los datos o corrige el error antes de generar el reporte.");
        return;
    }
    setIsGeneratingReport(true);
    try {
        generateDocxReport(stats);
    } catch (e) {
        console.error("Error generating report:", e);
        alert("Hubo un error al generar el reporte.");
    } finally {
        setIsGeneratingReport(false);
    }
  };


  // Data for charts (no change)
  const pieGenderData = stats.generoData;
  const barAgeData = stats.edadGroupData;
  const barMunicipioData = stats.municipioData;
  const pieConsultaData = stats.consultaTypeData;
  const barDiagnosticoData = stats.diagnosticoData;

  // --- Loading and Error States (no change) ---
  if (loading) { /* ... */ return <div className="loading-placeholder">Calculando estadísticas...</div>; }
  if (stats.error) { /* ... */ return <div className="error-placeholder">Error: {stats.error}</div>; }

  // --- Render Component ---
  return (
    <div className="p-4 sm:p-6 space-y-8 bg-white dark:bg-gray-900 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Informe Estadístico</h1>
          {/* ✅ Download Button */}
          <button
            onClick={handleDownloadReport}
            disabled={isGeneratingReport}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGeneratingReport ? (
                 <>
                  <svg className="animate-spin h-4 w-4 text-white" /* SVG Spinner */>...</svg>
                  Generando...
                 </>
            ) : (
                'Descargar Reporte (.docx)'
            )}
          </button>
      </div>


      {/* KPI Cards (no change) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* ... (KPI card divs) ... */}
         <div className="kpi-card text-center"><h3 className="kpi-title">Total Pacientes</h3><p className="kpi-value text-indigo-600 dark:text-indigo-300">{stats.totalPacientes}</p></div>
         <div className="kpi-card text-center"><h3 className="kpi-title text-blue-500">Hombres</h3><p className="kpi-value">{stats.countHombres}</p></div>
         <div className="kpi-card text-center"><h3 className="kpi-title text-pink-500">Mujeres</h3><p className="kpi-value">{stats.countMujeres}</p></div>
         <div className="kpi-card text-center"><h3 className="kpi-title text-yellow-500">Niños (&lt;15)</h3><p className="kpi-value">{stats.countNinios}</p></div>
      </div>

      {/* Charts Row 1 (Gender, Age Group - no change) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-container"> <h2 className="chart-title">Distribución por Género</h2> <div className="chart-wrapper"> {/* PieChart Gender */} {pieGenderData.length > 0 ? (<ResponsiveContainer width="100%" height={300}><PieChart><Pie data={pieGenderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label> {pieGenderData.map((e, i) => <Cell key={`c-${i}`} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />)} </Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer>) : (<div className="chart-placeholder">N/A</div>)} </div> </div>
        <div className="chart-container"> <h2 className="chart-title">Distribución por Grupo Etario</h2> <div className="chart-wrapper"> {/* BarChart Age */} {barAgeData.some(i=>i.value>0) ? (<ResponsiveContainer width="100%" height={300}><BarChart data={barAgeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="value" name="Pacientes"> {barAgeData.map((e, i) => <Cell key={`c-${i}`} fill={AGE_COLORS[i % AGE_COLORS.length]} />)} </Bar></BarChart></ResponsiveContainer>) : (<div className="chart-placeholder">N/A</div>)} </div> </div>
      </div>

       {/* Charts Row 2 (Consultation Type, Municipio - no change) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="chart-container"> <h2 className="chart-title">Tipo de Consulta</h2> <div className="chart-wrapper"> {/* PieChart Consulta */} {pieConsultaData.length > 0 ? (<ResponsiveContainer width="100%" height={300}><PieChart><Pie data={pieConsultaData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label> {pieConsultaData.map((e, i) => <Cell key={`c-${i}`} fill={CONSULTA_COLORS[i % CONSULTA_COLORS.length]} />)} </Pie><Legend /><Tooltip /></PieChart></ResponsiveContainer>) : (<div className="chart-placeholder">N/A</div>)} </div> </div>
         <div className="chart-container"> <h2 className="chart-title">Procedencia (Municipio)</h2> <div className="chart-wrapper"> {/* BarChart Municipio */} {barMunicipioData.length > 0 ? (<ResponsiveContainer width="100%" height={300}><BarChart data={barMunicipioData.slice(0,10)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={80} /><Tooltip /><Bar dataKey="value" name="Pacientes" barSize={20}> {barMunicipioData.slice(0,10).map((e, i) => <Cell key={`c-${i}`} fill={MULTI_COLORS[i % MULTI_COLORS.length]} />)} </Bar></BarChart></ResponsiveContainer>) : (<div className="chart-placeholder">N/A</div>)} {barMunicipioData.length > 10 && <p className="chart-note">Top 10 mostrados.</p>} </div> </div>
      </div>

      {/* Chart Row 3: Diagnoses (no change) */}
       <div className="chart-container"> <h2 className="chart-title">Diagnósticos / Patologías Frecuentes</h2> <div className="chart-wrapper-large"> {/* BarChart Diagnostico */} {barDiagnosticoData.length > 0 ? (<ResponsiveContainer width="100%" height={350}><BarChart data={barDiagnosticoData.slice(0,15)} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} /><YAxis /><Tooltip /><Bar dataKey="value" name="Casos"> {barDiagnosticoData.slice(0,15).map((e, i) => <Cell key={`c-${i}`} fill={MULTI_COLORS[i % MULTI_COLORS.length]} />)} </Bar></BarChart></ResponsiveContainer>) : (<div className="chart-placeholder">N/A</div>)} {barDiagnosticoData.length > 15 && <p className="chart-note">Top 15 mostrados.</p>} </div> </div>

        {/* Basic CSS for placeholders and structure - Add to index.css or use Tailwind */}
         <style>{`
            .loading-placeholder, .error-placeholder, .chart-placeholder { display: flex; align-items: center; justify-content: center; height: 300px; color: #6b7280; }
            .dark .loading-placeholder, .dark .error-placeholder, .dark .chart-placeholder { color: #9ca3af; }
            .error-placeholder { color: #dc2626; } .dark .error-placeholder { color: #f87171; }
            .kpi-card { background-color: white; border-radius: 0.5rem; padding: 1rem; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
            .dark .kpi-card { background-color: #1f2937; border-color: #374151; }
            .kpi-title { font-size: 0.875rem; font-weight: 500; color: #6b7280; } .dark .kpi-title { color: #9ca3af; }
            .kpi-value { margin-top: 0.25rem; font-size: 1.875rem; font-weight: 600; color: #111827; } .dark .kpi-value { color: white; }
            .chart-container { background-color: white; border-radius: 0.5rem; padding: 1rem; box-shadow: 0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
            .dark .chart-container { background-color: #1f2937; border-color: #374151; }
            .chart-title { font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; color: #111827; } .dark .chart-title { color: white; }
            .chart-wrapper { width: 100%; height: 300px; }
            .chart-wrapper-large { width: 100%; height: 350px; }
            .chart-note { font-size: 0.75rem; text-align: center; color: #6b7280; margin-top: 0.5rem; }
            /* Ensure recharts labels are visible in dark mode */
            .recharts-text.recharts-label text { fill: white !important; } /* Pie chart labels */
            .recharts-legend-item-text { color: inherit !important; }
            .dark .recharts-legend-item-text { color: #d1d5db !important; }
            .dark .recharts-cartesian-axis-tick-value { fill: #d1d5db !important; }
            .recharts-tooltip-label, .recharts-tooltip-item { color: #374151 !important; } /* Tooltip text light */
         `}</style>
    </div>
  );
};

export default Estadisticas;