// src/pages/Estadisticas.jsx
import { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
  Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow,
  WidthType, AlignmentType
} from 'docx';
import { saveAs } from 'file-saver';
import { getAllPacientes } from '../services/api';

// --- Chart Colors (sin cambios)
const GENDER_COLORS = ['#3b82f6', '#ec4899', '#a855f7'];
const AGE_COLORS = ['#fbbf24', '#10b981', '#3b82f6'];
const CONSULTA_COLORS = ['#8b5cf6', '#f59e0b'];
const MULTI_COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280', '#d946ef'];

// --- Estado por defecto
const defaultStats = {
  totalPacientes: 0,
  countHombres: 0,         // hombres (todas las edades)
  countMujeres: 0,
  countMenores: 0,         // NUEVO KPI: <18
  generoData: [],
  edadGroupData: [],
  municipioData: [],
  consultaTypeData: [],
  diagnosticoData: [],
  // Datos para DOCX
  primeraHM: { H: 0, M: 0, T: 0 },
  reconsultaHM: { H: 0, M: 0, T: 0 },
  edadBandsHM: [],        // [{name,H,M,T}]
  diagnosticoHM: [],      // [{name, cie, H, M, T}]
  terapiaHM: [],          // [{name, H, M, T}]
  error: null,
};

/* ==================== DOCX helpers ==================== */
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

const row = (arr) =>
  new TableRow({
    children: arr.map((t) =>
      typeof t === 'object' && t && ('text' in t || 'opts' in t)
        ? cell(t.text ?? '', t.opts ?? {})
        : cell(t)
    ),
  });

// Anchos fijos para que Word muestre los bordes “cerrados”
const table = (rows, columnWidths) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths,
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

const subtitulo = (txt) =>
  new Paragraph({
    children: [new TextRun({ text: txt, bold: true })],
    alignment: AlignmentType.LEFT,
  });
const space = () => new Paragraph({ text: ' ' });

// CIE-10 básicos (puedes ampliar)
const CIE10_MAP = {
  'duelo': 'Z63.4',
  'estrés': 'Z73',
  'estres': 'Z73',
  'estrés post traumático': 'F43.1',
  'estres post traumatico': 'F43.1',
  'problemas conyugales': 'Z63.0',
  'apoyo psicológico': 'F45.8',
  'apoyo psicologico': 'F45.8',
};

/* ==================== DOCX: Generador (usa desgloses reales) ==================== */
const generateDocxReport = (s) => {
  try {
    const now = new Date();
    const monthNames = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
    const tituloMes = s.reportMonthTitle || `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    // 1) PRIMERA/RECONSULTA/SEXO (9 columnas)
    const p = s.primeraHM || {H:0,M:0,T:0};
    const r = s.reconsultaHM || {H:0,M:0,T:0};
    const tot = { H: p.H + r.H, M: p.M + r.M, T: p.T + r.T };
    const t1 = table(
      [
        row([
          { text:'PRIMERA CONSULTA', opts:{bold:true} }, '', '',
          { text:'RECONSULTA', opts:{bold:true} }, '', '',
          { text:'TOTAL', opts:{bold:true} }, '', ''
        ]),
        row(['H','M','T','H','M','T','H','M','T']),
        row([p.H, p.M, p.T, r.H, r.M, r.T, tot.H, tot.M, tot.T]),
      ],
      [1200,1200,1200, 1200,1200,1200, 1200,1200,1200]
    );

    // 2) POR PATOLOGÍA H/M reales
    const diagRows = [
      row([
        {text:'No.',opts:{bold:true}},
        {text:'PATOLOGÍA',opts:{bold:true, center:false}},
        {text:'CÓDIGO CIE-10',opts:{bold:true}},
        {text:'H',opts:{bold:true}},
        {text:'M',opts:{bold:true}},
        {text:'T',opts:{bold:true}},
      ])
    ];
    let diagTotal = 0;
    (s.diagnosticoHM || []).slice(0,10).forEach((d,i)=>{
      diagRows.push(row([
        i+1,
        {text:d.name, opts:{center:false}},
        d.cie || 'XX',
        d.H||0, d.M||0, d.T||0
      ]));
      diagTotal += Number(d.T||0);
    });
    diagRows.push(row(['', {text:'TOTALES',opts:{bold:true,center:false}}, '', '', '', {text:diagTotal,opts:{bold:true}}]));
    const t2 = table(diagRows, [600, 3600, 1600, 900, 900, 900]);

    // 3) POR EDAD H/M reales
    const edadRows = [
      row([{text:'No.',opts:{bold:true}}, {text:'EDADES',opts:{bold:true,center:false}}, {text:'H',opts:{bold:true}}, {text:'M',opts:{bold:true}}, {text:'T',opts:{bold:true}}])
    ];
    let edadTotal = 0;
    (s.edadBandsHM || []).forEach((b,i)=>{
      edadRows.push(row([i+1, {text:b.name,opts:{center:false}}, b.H||0, b.M||0, b.T||0]));
      edadTotal += Number(b.T||0);
    });
    edadRows.push(row(['', {text:'TOTALES',opts:{bold:true,center:false}}, '', '', {text:edadTotal,opts:{bold:true}}]));
    const t3 = table(edadRows, [600, 3000, 900, 900, 900]);

    // 4) POR TIPO DE TERAPIA H/M reales
    const terRows = [
      row([{text:'No.',opts:{bold:true}}, {text:'TERAPIA',opts:{bold:true,center:false}}, {text:'H',opts:{bold:true}}, {text:'M',opts:{bold:true}}, {text:'T',opts:{bold:true}}])
    ];
    let terTotal = 0;
    (s.terapiaHM || []).forEach((t,i)=>{
      terRows.push(row([i+1, {text:t.name,opts:{center:false}}, t.H||0, t.M||0, t.T||0]));
      terTotal += Number(t.T||0);
    });
    terRows.push(row(['', {text:'TOTALES',opts:{bold:true,center:false}}, '', '', {text:terTotal,opts:{bold:true}}]));
    const t4 = table(terRows, [600, 3000, 900, 900, 900]);

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: `INFORME MES DE ${tituloMes}, DISTRITO SANTA MARÍA CHIQUIMULA`, bold: true })],
          }),
          space(),
          subtitulo('PRIMERA CONSULTA, RECONSULTA Y SEXO'),
          t1,
          space(),
          subtitulo('POR PATOLOGÍA'),
          t2,
          space(),
          subtitulo('POR EDAD'),
          t3,
          space(),
          subtitulo('POR TIPO DE TERAPIA'),
          t4,
        ],
      }],
    });

    Packer.toBlob(doc).then((blob)=>{
      const stamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      saveAs(blob, `Informe_Estadistico_${stamp}.docx`);
    });
  } catch (err) {
    console.error('[DOCX] generateDocxReport error:', err);
    alert('Hubo un error al generar el reporte.');
  }
};

/* ==================== COMPONENTE: cálculo de estadísticas (SIGSA) ==================== */
const Estadisticas = () => {
  const [stats, setStats] = useState(defaultStats);
  const [loading, setLoading] = useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Normalizadores
  const normCheck = (v) => {
    if (v === true) return true;
    if (typeof v === 'string') return ['✓','si','sí','true','1','x'].includes(v.trim().toLowerCase());
    if (typeof v === 'number') return v === 1;
    return false;
  };
  const normSexo = (s) => {
    const v = (s||'').toString().trim().toLowerCase();
    if (v.startsWith('h') || v === 'm') return 'H'; // Hombre o 'M' de masculino
    if (v.startsWith('m') || v === 'f') return 'M'; // Mujer o 'F' femenino
    return null;
  };

  const fetchAndCalculateStats = useCallback(async () => {
    setLoading(true); setStats(defaultStats);
    try {
      const data = await getAllPacientes();
      if (!data || !Array.isArray(data.patients)) {
        throw new Error("Formato de datos incorrecto.");
      }
      const patients = data.patients;
      const totalPacientes = data.total || patients.length;

      // contadores globales (para gráficos KPI)
      let countHombres = 0, countMujeres = 0, countOtroGenero = 0;
      let countMenores = 0; // NUEVO KPI <18

      // contadores SOLO para la gráfica de barras
      let chartNinos = 0;         // < 15
      let chartAdolescentes = 0;  // 15-17
      let chartAdultos = 0;       // 18+

      // mapas H/M reales para DOCX
      const primeraHM = { H:0, M:0, T:0 };
      const reconsultaHM = { H:0, M:0, T:0 };

      // EDADES por bandas para DOCX
      const edadBands = [
        { name: '1 a 7 años', H:0, M:0, T:0 },
        { name: '8 a 17 años', H:0, M:0, T:0 },
        { name: '18 a 30 años', H:0, M:0, T:0 },
        { name: '31 a 50 años', H:0, M:0, T:0 },
        { name: '50 y más años', H:0, M:0, T:0 },
      ];

      // diagnósticos y terapias con HM
      const diagMap = new Map();   // key=name -> {cie, H,M,T}
      const terapiaMap = new Map();// key=name -> {H,M,T}

      // otros para gráficos
      const municipioMap = new Map();
      const consultaMap = new Map();

      patients.forEach(p => {
        const s = p.sigsa || {};
        const f = p.ficha_medica || {};

        // ---- sexo
        const sexo = normSexo(s.sexo || s.genero || f.genero);
        if (sexo === 'H') { countHombres++; }
        else if (sexo === 'M') { countMujeres++; }
        else { countOtroGenero++; }

        // ---- edad
        let edad = parseInt(s.edad ?? f.edad ?? '', 10);
        if (Number.isNaN(edad) && s.fecha_nacimiento) {
          const dob = new Date(s.fecha_nacimiento);
          if (!isNaN(dob)) {
            const today = new Date();
            edad = today.getFullYear() - dob.getFullYear() - (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
          }
        }

        const esNinioBand = normCheck(s['niño<15'] || s.ninio_menor_15 || s['niño_menor_15'] || s['< 14 AÑOS']);
        const esAdultoBand = normCheck(s.adulto || s['≥ de edad']);

        // KPI menores de 18
        if (!Number.isNaN(edad)) {
          if (edad < 18) countMenores++;
        } else if (esNinioBand && !esAdultoBand) {
          countMenores++; // si solo hay bandera de niño y no de adulto, cuenta como menor
        }
// ---- conteos exactos para la GRÁFICA (nuevas bandas: <13, 13-17, 18+)
if (!Number.isNaN(edad)) {
  if (edad < 13) {
    chartNinos++;
  } else if (edad <= 17) {
    chartAdolescentes++;
  } else {
    chartAdultos++;
  }
} else {
  // Si no hay edad numérica, usa banderas cuando existan
  if (esNinioBand) {
    // La bandera "niño<15" no nos dice si es 13-14; por seguridad contamos como Niño
    chartNinos++;
  } else if (esAdultoBand) {
    chartAdultos++;
  }
  // (Si existen otras banderas específicas para 13–17 podrías sumarlas aquí)
}


        // ---- bandas para DOCX (si hay edad exacta)
        const putEdadBand = (bandIndex) => {
          if (bandIndex < 0) return;
          if (sexo === 'H') edadBands[bandIndex].H++;
          else if (sexo === 'M') edadBands[bandIndex].M++;
          edadBands[bandIndex].T++;
        };
        if (!Number.isNaN(edad)) {
          if (edad >= 1 && edad <= 7) putEdadBand(0);
          else if (edad >= 8 && edad <= 17) putEdadBand(1);
          else if (edad >= 18 && edad <= 30) putEdadBand(2);
          else if (edad >= 31 && edad <= 50) putEdadBand(3);
          else if (edad >= 51) putEdadBand(4);
        }

        // ---- consulta: 1ra / reconsulta
        const esPrimera =
          normCheck(s['1ra'] || s['1 ra.'] || s.primera || s.primera_vez) ||
          /primera/i.test(String(s.consulta || f.tipo_consulta || ''));
        const esReconsulta =
          normCheck(s['re'] || s['re.'] || s.reconsulta || s.control) ||
          /(control|reconsulta)/i.test(String(s.consulta || f.tipo_consulta || ''));

        if (esPrimera) {
          if (sexo === 'H') primeraHM.H++; else if (sexo === 'M') primeraHM.M++;
          primeraHM.T++; consultaMap.set('Primera Vez', (consultaMap.get('Primera Vez')||0)+1);
        }
        if (esReconsulta) {
          if (sexo === 'H') reconsultaHM.H++; else if (sexo === 'M') reconsultaHM.M++;
          reconsultaHM.T++; consultaMap.set('Control/Reconsulta', (consultaMap.get('Control/Reconsulta')||0)+1);
        }

        // ---- municipio
        const municipio = s.municipio || f.municipio;
        if (municipio && municipio.toLowerCase() !== 'null') {
          municipioMap.set(municipio, (municipioMap.get(municipio) || 0) + 1);
        }

        // ---- diagnóstico + CIE-10 con HM
        const diagName = (s.diagnostico || f.patologia || '').toString().trim();
        const cie10 = s.cie10 || CIE10_MAP[diagName.toLowerCase()] || 'XX';
        if (diagName) {
          const prev = diagMap.get(diagName) || { cie: cie10, H:0, M:0, T:0 };
          if (sexo === 'H') prev.H++; else if (sexo === 'M') prev.M++;
          prev.T++; prev.cie = prev.cie || cie10;
          diagMap.set(diagName, prev);
        }

        // ---- terapia con HM
        const terapia = (s.terapia || f.terapia || '').toString().trim();
        if (terapia) {
          const prev = terapiaMap.get(terapia) || { H:0, M:0, T:0 };
          if (sexo === 'H') prev.H++; else if (sexo === 'M') prev.M++;
          prev.T++; terapiaMap.set(terapia, prev);
        }
      });

      // Datos para gráficos
      const generoData = [
        { name: 'Hombres', value: countHombres },
        { name: 'Mujeres', value: countMujeres },
      ];
      if (countOtroGenero > 0) generoData.push({ name: 'Otro/Desc.', value: countOtroGenero });

      const edadGroupData = [
        { name: 'Niños (<15)', value: Math.max(0, chartNinos) },
        { name: 'Adolescentes (15-17)', value: Math.max(0, chartAdolescentes) },
        { name: 'Adultos (18+)', value: Math.max(0, chartAdultos) },
      ];

      const municipioData = Array.from(municipioMap, ([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      const consultaTypeData = Array.from(consultaMap, ([name, value]) => ({ name, value }));
      const diagnosticoArr = Array.from(diagMap, ([name, v]) => ({ name, value: v.T, cie: v.cie }))
        .sort((a, b) => b.value - a.value);

      // --- arrays HM para DOCX
      const edadBandsHM = edadBands;
      const diagnosticoHM = Array.from(diagMap, ([name, v]) => ({ name, cie: v.cie, H: v.H, M: v.M, T: v.T }))
        .sort((a,b)=>b.T-a.T);
      const terapiaHM = Array.from(terapiaMap, ([name, v]) => ({ name, H: v.H, M: v.M, T: v.T }))
        .sort((a,b)=>b.T-a.T);

      setStats({
        totalPacientes,
        countHombres,
        countMujeres,
        countMenores, // NUEVO KPI
        generoData: generoData.filter(i => i.value > 0),
        edadGroupData,
        municipioData,
        consultaTypeData: consultaTypeData.filter(i => i.value > 0),
        diagnosticoData: diagnosticoArr,
        // para DOCX
        primeraHM, reconsultaHM,
        edadBandsHM,
        diagnosticoHM,
        terapiaHM,
        error: null,
      });
    } catch (error) {
      console.error('Error:', error);
      setStats(prev => ({ ...prev, error: error.message }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAndCalculateStats(); }, [fetchAndCalculateStats]);

  const handleDownloadReport = () => {
    if (loading || stats.error) { alert("Espera a que carguen los datos o corrige el error."); return; }
    setIsGeneratingReport(true);
    try { generateDocxReport(stats); }
    finally { setIsGeneratingReport(false); }
  };

  // === UI y gráficos (sin cambios de estilos) ===
  const pieGenderData = stats.generoData;
  const barAgeData = stats.edadGroupData;
  const barMunicipioData = stats.municipioData;
  const pieConsultaData = stats.consultaTypeData;

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

  return (
    <div className="p-4 sm:p-6 space-y-8 bg-white dark:bg-gray-900 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Informe Estadístico</h1>
        <button
          onClick={handleDownloadReport}
          disabled={isGeneratingReport}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isGeneratingReport ? 'Generando...' : 'Descargar Reporte (.docx)'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card text-center">
          <h3 className="kpi-title">Total Pacientes</h3>
          <p className="kpi-value text-indigo-600 dark:text-indigo-300">{stats.totalPacientes}</p>
        </div>

        <div className="kpi-card text-center">
          <h3 className="kpi-title text-blue-500">Hombres</h3>
          <p className="kpi-value">{stats.countHombres}</p>
        </div>

        <div className="kpi-card text-center">
          <h3 className="kpi-title text-pink-500">Mujeres</h3>
          <p className="kpi-value">{stats.countMujeres}</p>
        </div>

        {/* NUEVO: Menores de edad (<18) */}
        <div className="kpi-card text-center">
          <h3 className="kpi-title text-yellow-500">Menores (&lt;18)</h3>
          <p className="kpi-value">{stats.countMenores}</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="chart-container">
          <h2 className="chart-title">Distribución por Género</h2>
          <div className="chart-wrapper">
            {stats.generoData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieGenderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {pieGenderData.map((e, i) => <Cell key={`c-${i}`} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />)}
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
                <BarChart data={barAgeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  {/* 🔹 Cambios mínimos: solo enteros en eje Y + tooltip */}
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(v) => [Math.round(v), 'Pacientes']} />
                  <Legend />
                  <Bar dataKey="value" name="Pacientes">
                    {barAgeData.map((e, i) => <Cell key={`c-${i}`} fill={AGE_COLORS[i % AGE_COLORS.length]} />)}
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
                  <Pie data={pieConsultaData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
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
                  {/* 🔹 Solo enteros en eje X + tooltip */}
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip formatter={(v) => [Math.round(v), 'Pacientes']} />
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
                {/* 🔹 Solo enteros en eje Y + tooltip */}
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(v) => [Math.round(v), 'Casos']} />
                <Bar dataKey="value" name="Casos">
                  {stats.diagnosticoData.slice(0,15).map((e, i) => <Cell key={`c-${i}`} fill={MULTI_COLORS[i % MULTI_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (<div className="chart-placeholder">N/A</div>)}
          {stats.diagnosticoData.length > 15 && <p className="chart-note">Top 15 mostrados.</p>}
        </div>
      </div>

      <style>{`
        .loading-placeholder, .error-placeholder, .chart-placeholder { display: flex; align-items: center; justify-content: center; height: 300px; color: #6b7280; }
        .dark .loading-placeholder, .dark .error-placeholder, .chart-placeholder { color: #9ca3af; }
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
      `}</style>
    </div>
  );
};

export default Estadisticas;
