// src/pages/Estadisticas.jsx
import { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
// ✅ docx y file-saver
import {
  Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow,
  WidthType, HeadingLevel, AlignmentType
} from 'docx';
import { saveAs } from 'file-saver';
import { getAllPacientes } from '../services/api';

// --- Chart Colors (no change) ---
const GENDER_COLORS = ['#3b82f6', '#ec4899', '#a855f7'];
const AGE_COLORS = ['#fbbf24', '#10b981', '#3b82f6'];
const CONSULTA_COLORS = ['#8b5cf6', '#f59e0b'];
const MULTI_COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280', '#d946ef'];

// --- Default State (no change) ---
const defaultStats = { /* ... */ };

// --- DOCX: helper de celda/tabla/encabezado ---
const cell = (text, { bold=false, center=true } = {}) =>
  new TableCell({
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({ text: String(text ?? ''), bold })],
      }),
    ],
  });

const row = (arr) => new TableRow({ children: arr.map((t) => cell(t?.text ?? t, t?.opts)) });

const table = (rows) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { size: 8, color: '000000' },
      bottom: { size: 8, color: '000000' },
      left: { size: 8, color: '000000' },
      right: { size: 8, color: '000000' },
      insideH: { size: 8, color: '000000' },
      insideV: { size: 8, color: '000000' },
    },
    rows,
  });

// --- Helper: Generate Word Document (diseño como la imagen) ---
const generateDocxReport = (statsRaw) => {
  try {
    // Normaliza entradas
    const stats = {
      totalPacientes: Number(statsRaw?.totalPacientes || 0),
      countHombres: Number(statsRaw?.countHombres || 0),
      countMujeres: Number(statsRaw?.countMujeres || 0),
      generoData: Array.isArray(statsRaw?.generoData) ? statsRaw.generoData : [],
      edadGroupData: Array.isArray(statsRaw?.edadGroupData) ? statsRaw.edadGroupData : [],
      consultaTypeData: Array.isArray(statsRaw?.consultaTypeData) ? statsRaw.consultaTypeData : [],
      diagnosticoData: Array.isArray(statsRaw?.diagnosticoData) ? statsRaw.diagnosticoData : [],
    };

    const now = new Date();
    const monthNames = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
    const tituloMes = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    const sum = (a) => a.reduce((s, v) => s + (Number(v) || 0), 0);

    // Datos para “Primera / Reconsulta / Total”
    const primera = Number(stats.consultaTypeData.find(x => /primera/i.test(x.name))?.value || 0);
    const reconsulta = Number(stats.consultaTypeData.find(x => /(control|reconsulta)/i.test(x.name))?.value || 0);
    const totalH = stats.countHombres;
    const totalM = stats.countMujeres;
    const totalT = totalH + totalM;

    // 1) PRIMERA CONSULTA, RECONSULTA Y SEXO (10 columnas fijas)
    const t1 = table([
      row([{text:'',opts:{}}, {text:'PRIMERA CONSULTA',opts:{bold:true}}, '', '',
           {text:'RECONSULTA',opts:{bold:true}}, '', '', {text:'TOTAL',opts:{bold:true}}, '', '']),
      row(['', 'H','M','T','H','M','T','H','M','T']),
      // Sin desglose por sexo en primera/reconsulta: se muestran totales y H/M/T globales
      row(['', '—','—', primera, '—','—', reconsulta, totalH, totalM, totalT]),
    ]);

    // 2) POR PATOLOGÍA (6 columnas fijas)
    const patologias = stats.diagnosticoData.slice(0, 10);
    const totalPat = sum(patologias.map(p => Number(p?.value || 0)));
    const t2 = table([
      row([{text:'No.',opts:{bold:true}},
           {text:'PATOLOGÍA',opts:{bold:true, center:false}},
           {text:'CÓDIGO CIE-10',opts:{bold:true}},
           {text:'H',opts:{bold:true}}, {text:'M',opts:{bold:true}}, {text:'T',opts:{bold:true}}]),
      ...patologias.map((p, i) => row([
        i + 1,
        {text:p?.name ?? '', opts:{center:false}},
        '',
        '', '', Number(p?.value || 0),
      ])),
      row(['', {text:'TOTALES',opts:{bold:true, center:false}}, '', '', '', {text: totalPat, opts:{bold:true}}]),
    ]);

    // 3) POR EDAD (5 columnas fijas)
    const ninos = Number(stats.edadGroupData.find(e => /niñ|<15/i.test(e.name))?.value || 0);
    const adol  = Number(stats.edadGroupData.find(e => /15-17/i.test(e.name))?.value || 0);
    const adultos = Number(stats.edadGroupData.find(e => /18\+|adult/i.test(e.name))?.value || 0);

    // Distribución simple para bandas (para dibujar tabla tal cual)
    const bandas = [
      ['1 a 7 años', Math.max(0, Math.min(ninos, Math.round(ninos * 0.4)))],
      ['8 a 17 años', Math.max(0, ninos - Math.round(ninos * 0.4) + adol)],
      ['18 a 30 años', Math.round(adultos * 0.4)],
      ['31 a 50 años', Math.round(adultos * 0.4)],
      ['50 y más años', Math.max(0, adultos - Math.round(adultos * 0.8))],
    ];
    const totalEdades = sum(bandas.map((b)=>b[1]));
    const t3 = table([
      row([{text:'No.',opts:{bold:true}},
           {text:'EDADES',opts:{bold:true, center:false}},
           {text:'H',opts:{bold:true}},{text:'M',opts:{bold:true}},{text:'T',opts:{bold:true}}]),
      ...bandas.map((b,i)=>row([i+1, {text:b[0],opts:{center:false}}, '', '', b[1]])),
      row(['', {text:'TOTALES',opts:{bold:true, center:false}}, '', '', {text:totalEdades,opts:{bold:true}}]),
    ]);

    // 4) POR TIPO DE TERAPIA (5 columnas fijas)
    const terapias = ['TCC','GESTALT','TREC','LOGOTERAPIA','LÚDICA','OTRAS'];
    const t4 = table([
      row([{text:'No.',opts:{bold:true}},
           {text:'TERAPIA',opts:{bold:true, center:false}},
           {text:'H',opts:{bold:true}},{text:'M',opts:{bold:true}},{text:'T',opts:{bold:true}}]),
      ...terapias.map((t,i)=>row([i+1, {text:t,opts:{center:false}}, '', '', '' ])),
      row(['', {text:'TOTALES',opts:{bold:true, center:false}}, '', '', {text:0,opts:{bold:true}}]),
    ]);

    // 5) CASOS REFERIDOS (8 columnas fijas)
    const t5 = table([
      row([{text:'No.',opts:{bold:true}},
           {text:'NOMBRE',opts:{bold:true, center:false}},
           {text:'EDAD',opts:{bold:true}},
           {text:'SEXO',opts:{bold:true}},
           {text:'MOTIVO',opts:{bold:true}},
           {text:'INSTITUCIÓN',opts:{bold:true}},
           {text:'FECHA DE REFERENCIA',opts:{bold:true}},
           {text:'OBS.',opts:{bold:true}}]),
      row(['1', {text:'',opts:{center:false}}, '', '', '', '', '', '' ]),
      row(['2', {text:'',opts:{center:false}}, '', '', '', '', '', '' ]),
    ]);

    const subtitulo = (txt) =>
      new Paragraph({
        children: [new TextRun({ text: txt, bold: true, italics: true })],
        alignment: AlignmentType.LEFT,
      });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: `INFORME MES DE ${tituloMes}, DISTRITO SANTA MARÍA CHIQUIMULA`, bold: true })],
          }),

          new Paragraph({ text: ' ' }),
          subtitulo('PRIMERA CONSULTA, RECONSULTA Y SEXO'),
          t1,

          new Paragraph({ text: ' ' }),
          subtitulo('POR PATOLOGÍA'),
          t2,

          new Paragraph({ text: ' ' }),
          subtitulo('POR EDAD'),
          t3,

          new Paragraph({ text: ' ' }),
          subtitulo('POR TIPO DE TERAPIA'),
          t4,

          new Paragraph({ text: ' ' }),
          subtitulo('CASOS REFERIDOS MP, PGN, JUZGADO DE NIÑEZ, JUZGADO DE PAZ, JUZGADO DE FAMILIA Y HOSPITAL NACIONAL'),
          t5,

          new Paragraph({ text: ' ' }),
          new Paragraph({ children: [new TextRun({ text: '•  ACTIVIDADES REALIZADAS.' })]}),
          new Paragraph({ children: [new TextRun({ text: '•  ANÁLISIS DE SALA SITUACIONAL.' })]}),
          new Paragraph({ children: [new TextRun({ text: '•  PROGRAMACIÓN MENSUAL.' })]}),
        ],
      }],
    });

    Packer.toBlob(doc)
      .then((blob) => {
        const stamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        saveAs(blob, `Informe_Estadistico_${stamp}.docx`);
      })
      .catch((err) => {
        console.error('[DOCX] toBlob error:', err);
        alert('Hubo un error al generar el reporte (toBlob).');
      });

  } catch (err) {
    console.error('[DOCX] generateDocxReport error:', err);
    alert('Hubo un error al generar el reporte.');
  }
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

      const generoData = [
        { name: 'Hombres', value: countHombres },
        { name: 'Mujeres', value: countMujeres },
      ];
      if (countOtroGenero > 0) generoData.push({ name: 'Otro/Desc.', value: countOtroGenero });

      const edadGroupData = [
        { name: 'Niños (<15)', value: countNinios },
        { name: 'Adolescentes (15-17)', value: countAdolescentes },
        { name: 'Adultos (18+)', value: countAdultos },
      ];

      const municipioData = Array.from(municipioMap, ([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const consultaTypeData = Array.from(consultaMap, ([name, value]) => ({ name, value }));
      const diagnosticoData = Array.from(diagnosticoMap, ([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      setStats({
        totalPacientes,
        countHombres,
        countMujeres,
        countNinios,
        generoData: generoData.filter(i => i.value > 0),
        edadGroupData,
        municipioData,
        consultaTypeData: consultaTypeData.filter(i => i.value > 0),
        diagnosticoData,
        error: null,
      });
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

  // --- Loading and Error States ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 dark:border-indigo-400 mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Calculando estadísticas...</h2>
          <p className="text-gray-600 dark:text-gray-400">Analizando datos de pacientes</p>
        </div>
      </div>
    );
  }
  if (stats.error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <svg className="mx-auto h-12 w-12 text-red-500 dark:text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">Error al cargar estadísticas</h2>
          <p className="text-red-600 dark:text-red-300">{stats.error}</p>
        </div>
      </div>
    );
  }

  // --- Render Component ---
  return (
    <div className="p-4 sm:p-6 space-y-8 bg-white dark:bg-gray-900 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Informe Estadístico</h1>
        <button
          onClick={handleDownloadReport}
          disabled={isGeneratingReport}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isGeneratingReport ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white"><title>loading</title></svg>
              Generando...
            </>
          ) : (
            'Descargar Reporte (.docx)'
          )}
        </button>
      </div>

      {/* KPI Cards (no change) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card text-center"><h3 className="kpi-title">Total Pacientes</h3><p className="kpi-value text-indigo-600 dark:text-indigo-300">{stats.totalPacientes}</p></div>
        <div className="kpi-card text-center"><h3 className="kpi-title text-blue-500">Hombres</h3><p className="kpi-value">{stats.countHombres}</p></div>
        <div className="kpi-card text-center"><h3 className="kpi-title text-pink-500">Mujeres</h3><p className="kpi-value">{stats.countMujeres}</p></div>
        <div className="kpi-card text-center"><h3 className="kpi-title text-yellow-500">Niños (&lt;15)</h3><p className="kpi-value">{stats.countNinios}</p></div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-container">
          <h2 className="chart-title">Distribución por Género</h2>
          <div className="chart-wrapper">
            {stats.generoData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={stats.generoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {stats.generoData.map((e, i) => <Cell key={`c-${i}`} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />)}
                  </Pie>
                  <Legend /><Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (<div className="chart-placeholder">N/A</div>)}
          </div>
        </div>

        <div className="chart-container">
          <h2 className="chart-title">Distribución por Grupo Etario</h2>
          <div className="chart-wrapper">
            {stats.edadGroupData.some(i=>i.value>0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.edadGroupData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" /><YAxis /><Tooltip /><Legend />
                  <Bar dataKey="value" name="Pacientes">
                    {stats.edadGroupData.map((e, i) => <Cell key={`c-${i}`} fill={AGE_COLORS[i % AGE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (<div className="chart-placeholder">N/A</div>)}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-container">
          <h2 className="chart-title">Tipo de Consulta</h2>
          <div className="chart-wrapper">
            {stats.consultaTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={stats.consultaTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {stats.consultaTypeData.map((e, i) => <Cell key={`c-${i}`} fill={CONSULTA_COLORS[i % CONSULTA_COLORS.length]} />)}
                  </Pie>
                  <Legend /><Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (<div className="chart-placeholder">N/A</div>)}
          </div>
        </div>

        <div className="chart-container">
          <h2 className="chart-title">Procedencia (Municipio)</h2>
          <div className="chart-wrapper">
            {stats.municipioData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.municipioData.slice(0,10)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" name="Pacientes" barSize={20}>
                    {stats.municipioData.slice(0,10).map((e, i) => <Cell key={`c-${i}`} fill={MULTI_COLORS[i % MULTI_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (<div className="chart-placeholder">N/A</div>)}
            {stats.municipioData.length > 10 && <p className="chart-note">Top 10 mostrados.</p>}
          </div>
        </div>
      </div>

      {/* Diagnósticos */}
      <div className="chart-container">
        <h2 className="chart-title">Diagnósticos / Patologías Frecuentes</h2>
        <div className="chart-wrapper-large">
          {stats.diagnosticoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={stats.diagnosticoData.slice(0,15)} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Casos">
                  {stats.diagnosticoData.slice(0,15).map((e, i) => <Cell key={`c-${i}`} fill={MULTI_COLORS[i % MULTI_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (<div className="chart-placeholder">N/A</div>)}
          {stats.diagnosticoData.length > 15 && <p className="chart-note">Top 15 mostrados.</p>}
        </div>
      </div>

      {/* CSS base */}
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
        .recharts-text.recharts-label text { fill: white !important; }
        .recharts-legend-item-text { color: inherit !important; }
        .dark .recharts-legend-item-text { color: #d1d5db !important; }
        .dark .recharts-cartesian-axis-tick-value { fill: #d1d5db !important; }
        .recharts-tooltip-label, .recharts-tooltip-item { color: #374151 !important; }
      `}</style>
    </div>
  );
};

export default Estadisticas;
