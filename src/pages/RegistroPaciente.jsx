// src/pages/RegistroPaciente.jsx 
import { useState, useCallback, useEffect, useMemo } from "react";
import { upsertPatient } from "../services/api";

// =================== Utilidades de fecha ===================
const pad2 = (n) => String(n).padStart(2, "0");
const formatYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Hoy - 1 año (en hora local, sin usar ISO para evitar desfases)
const getOneYearAgoYMD = () => {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  return formatYMD(oneYearAgo);
};

// =================== Normalización y mapeo SIGSA→CIE-10 ===================
const normalize = (s = "") =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const DIAG_TO_CIE10_RAW = {
  [normalize("Problemas de lenguaje")]: "F80",
  [normalize("Problemas de adaptación")]: "F43.2",
  [normalize("Ansiedad generalizada")]: "F41.1",
  [normalize("Problema somatomorfo")]: "F45.8",
  [normalize("Tristeza leve")]: "F32.0",
  [normalize("Asesoría en anticoncepción")]: "F30.1",
  [normalize("Fobia específica")]: "F40.2",
  [normalize("Ansiedad y depresión")]: "F41.2",
  [normalize("Embarazo incidental")]: "Z33.0",
  [normalize("Estrés")]: "F43.0",
  [normalize("Distimia")]: "F34.1",
};

const DIAG_ALIASES = {
  "problemas de lenguaje": normalize("Problemas de lenguaje"),
  "problemas de adaptacion": normalize("Problemas de adaptación"),
  "ansiedad generalizada": normalize("Ansiedad generalizada"),
  "problema somatomorfo": normalize("Problema somatomorfo"),
  "problemas somatomorfos": normalize("Problema somatomorfo"),
  "tristeza leve": normalize("Tristeza leve"),
  "asesoria en anticoncepcion": normalize("Asesoría en anticoncepción"),
  "asesoria anticoncepcion": normalize("Asesoría en anticoncepción"),
  "fobia especifica": normalize("Fobia específica"),
  "ansiedad y depresion": normalize("Ansiedad y depresión"),
  "embarazo incidental": normalize("Embarazo incidental"),
  "estres": normalize("Estrés"),
  "distimia": normalize("Distimia"),
};

const mapDiagnosticoToCIE10 = (label) => {
  const n = normalize(label);
  if (DIAG_TO_CIE10_RAW[n]) return DIAG_TO_CIE10_RAW[n];
  const aliasKey = DIAG_ALIASES[n];
  if (aliasKey && DIAG_TO_CIE10_RAW[aliasKey]) return DIAG_TO_CIE10_RAW[aliasKey];
  return "";
};

export default function RegistroPaciente() {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    cui: "",
    fecha_nacimiento: "",
    edad: "",
    sexo: "",
    municipio: "",
    aldea: "",
    estado_civil: "",
    escolaridad: "",
    ocupacion: "",
    consulta: "",
    diagnostico: "",
    cie_10: "",
    terapia: "",
    patologia: "",
    cei10: "",
    tipo_terapia: "",
    embarazo: "",
    paciente_referido: false,
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showDPI, setShowDPI] = useState(false);

  // Max permitido en el datepicker: hoy - 1 año
  const maxDOB = useMemo(() => getOneYearAgoYMD(), []);

  // 🔽 Datos de la sección "Paciente referido" (inline)
  const [refData, setRefData] = useState({
    no: "",
    nombre_paciente: "",
    edad: "",
    motivo: "",
    institucion_sel: "",
    institucion: "",
    fecha_referencia: "",
    obs: "",
  });

  useEffect(() => {
    if (form.paciente_referido) {
      setRefData((prev) => ({
        ...prev,
        no: prev.no || `${Date.now()}`,
        nombre_paciente: `${form.nombre || ""} ${form.apellido || ""}`.trim(),
        edad: form.edad || prev.edad || "",
        fecha_referencia: prev.fecha_referencia || new Date().toISOString().slice(0, 10),
      }));
    }
  }, [form.paciente_referido, form.nombre, form.apellido, form.edad]);

  const handleChange = useCallback(
    (key) => (e) => {
      let value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      setMsg("");

      if (key === "cui") {
        value = (value || "").replace(/\D/g, "").slice(0, 13);
      }

      setForm((prev) => {
        const next = { ...prev, [key]: value };
        if (key === "sexo" && value !== "M") next.embarazo = "";
        return next;
      });
    },
    []
  );

  const handleFechaNacimiento = useCallback(
    (e) => {
      const val = e.target.value;
      let calculatedAge = "";
      let shouldShowDPI = false;

      // Validación: no permitir fechas mayores a maxDOB (edad < 1 año)
      if (val && val > maxDOB) {
        setMsg("⚠️ La fecha de nacimiento debe indicar al menos 1 año de edad.");
        setForm((f) => ({ ...f, fecha_nacimiento: "", edad: "" }));
        setShowDPI(false);
        return;
      }

      if (val) {
        try {
          const fechaNac = new Date(val);
          const hoy = new Date();
          let edad = hoy.getFullYear() - fechaNac.getFullYear();
          const m = hoy.getMonth() - fechaNac.getMonth();
          if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) edad--;

          calculatedAge = isNaN(edad) ? "" : String(edad);
          shouldShowDPI = !isNaN(edad) && edad >= 18;
        } catch {
          calculatedAge = "";
        }
      }

      setMsg("");
      setForm((f) => ({ ...f, fecha_nacimiento: val, edad: calculatedAge }));
      setShowDPI(shouldShowDPI);
    },
    [maxDOB]
  );

  const handleDiagnosticoChange = useCallback((e) => {
    const value = e.target.value;
    const cie = mapDiagnosticoToCIE10(value);
    setMsg("");
    setForm((prev) => {
      const next = { ...prev, diagnostico: value };
      if (cie) {
        next.cie_10 = cie;
        if (!prev.cei10) next.cei10 = cie;
      }
      return next;
    });
  }, []);

  const updateRef = (key) => (e) => setRefData((r) => ({ ...r, [key]: e.target.value }));

  const guardarPaciente = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!form.nombre || !form.apellido || !form.fecha_nacimiento || !form.sexo || !form.consulta) {
      setMsg("❌ Completa los campos obligatorios (*).");
      return;
    }

    // Bloquea edad < 1 año también en envío
    const ageNum = parseInt(form.edad, 10);
    if (isNaN(ageNum) || ageNum < 1) {
      setMsg("❌ La edad debe ser de al menos 1 año.");
      return;
    }

    if (showDPI) {
      if (!form.cui) {
        setMsg("❌ El CUI/DPI es obligatorio para mayores de edad.");
        return;
      }
      if (String(form.cui).length !== 13) {
        setMsg("❌ El CUI/DPI debe contener exactamente 13 dígitos.");
        return;
      }
    }

    setLoading(true);
    try {
      const nowISO = new Date().toISOString();
      const isAdult = ageNum >= 18;
      const isMenor15 = ageNum < 15;

      const uidToSend = isAdult && form.cui ? form.cui : `temp_${Date.now()}`;

      const payload = {
        uid: uidToSend,
        new_info: {
          nombre: form.nombre.trim() || null,
          apellido: form.apellido.trim() || null,
          fecha_consulta: nowISO,
          estado_paciente: "Activo",
        },
        sigsa_info: {
          fecha_consulta: nowISO,
          nombre: form.nombre.trim() || null,
          apellido: form.apellido.trim() || null,
          cui: form.cui || null,
          fecha_nacimiento: form.fecha_nacimiento || null,
          edad: form.edad || null,
          ninio_menor_15: isMenor15,
          adulto: isAdult,
          genero: form.sexo === "M" ? "F" : form.sexo === "H" ? "M" : null,
          municipio: form.municipio || null,
          aldea: form.aldea || null,
          embarazo: form.sexo === "M" ? form.embarazo === "Menor de 14" || form.embarazo === "Mayor de edad" : false,
          consulta:
            form.consulta === "Primera"
              ? "Primera vez"
              : form.consulta === "Reconsulta"
              ? "Control"
              : null,
          diagnostico: form.diagnostico || null,
          cie_10: form.cie_10 || null,
          terapia: form.terapia || null,
        },
        ficha_medica_info: {
          patologia: form.patologia || null,
          cui: form.cui || null,
          escolaridad: form.escolaridad || null,
          edad: form.edad || null,
          ocupacion: form.ocupacion || null,
          aldea: form.aldea || null,
          estado_civil: form.estado_civil || null,
          paciente_referido: form.paciente_referido || false,
          genero: form.sexo === "M" ? "F" : form.sexo === "H" ? "M" : null,
          municipio: form.municipio || null,
          cei10: form.cei10 || null,
          tipo_consulta:
            form.consulta === "Primera"
              ? "Primera vez"
              : form.consulta === "Reconsulta"
              ? "Control"
              : null,
          tipo_terapia: form.tipo_terapia || null,
          embarazo: form.sexo === "M" ? form.embarazo || null : null,
          referencia:
            form.paciente_referido
              ? {
                  no: refData.no || null,
                  nombre_paciente: (refData.nombre_paciente || `${form.nombre} ${form.apellido}`).trim(),
                  edad: refData.edad || form.edad || null,
                  motivo: refData.motivo || null,
                  institucion_sel: refData.institucion_sel || null,
                  institucion: refData.institucion || null,
                  fecha_referencia: refData.fecha_referencia || null,
                  obs: refData.obs || null,
                }
              : null,
        },
      };

      console.log("Enviando Payload:", JSON.stringify(payload, null, 2));
      const response = await upsertPatient(payload);
      if (response && response.success === false) {
        throw new Error(response.error || "Error desconocido desde la API.");
      }
      setMsg("✅ Paciente registrado/actualizado correctamente.");
    } catch (err) {
      console.error("Error al guardar paciente:", err);
      setMsg(`❌ Error al guardar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 to-teal-200 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-4xl">
        <form
          onSubmit={guardarPaciente}
          className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl shadow-xl p-6 space-y-8 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">🧾 Registro de Paciente</h1>
          </div>

          {/* Datos Personales */}
          <fieldset className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 pt-2">
            <legend className="text-lg font-semibold px-2 text-gray-700 dark:text-gray-300">Datos Personales</legend>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-2">
              <div>
                <label htmlFor="nombre" className="form-label">Nombre *</label>
                <input id="nombre" value={form.nombre} onChange={handleChange("nombre")} required className="form-input" placeholder="Nombre(s)"/>
              </div>
              <div>
                <label htmlFor="apellido" className="form-label">Apellido *</label>
                <input id="apellido" value={form.apellido} onChange={handleChange("apellido")} required className="form-input" placeholder="Apellido(s)"/>
              </div>
              <div>
                <label htmlFor="fecha_nacimiento" className="form-label">Fecha de Nacimiento *</label>
                <input
                  id="fecha_nacimiento"
                  type="date"
                  value={form.fecha_nacimiento}
                  onChange={handleFechaNacimiento}
                  required
                  className="form-input"
                  max={maxDOB}  // ⛔ impide seleccionar edad < 1 año
                />
              </div>
              <div className="flex items-center justify-center p-2 border rounded bg-gray-50 dark:bg-gray-700 text-center">
                {form.edad ? (
                  <span className="text-base font-semibold">
                    Edad: {form.edad}{" "}
                    {parseInt(form.edad || "0", 10) < 18 ? (
                      <span className="text-amber-600">(Menor)</span>
                    ) : (
                      <span className="text-emerald-600">(Mayor)</span>
                    )}
                  </span>
                ) : (
                  <span className="text-gray-500">Edad Calculada</span>
                )}
              </div>

              {showDPI ? (
                <div>
                  <label htmlFor="cui" className="form-label">CUI / DPI *</label>
                  <input
                    id="cui"
                    placeholder="13 dígitos"
                    value={form.cui}
                    onChange={handleChange("cui")}
                    required
                    className="form-input"
                    inputMode="numeric"
                    maxLength={13}
                    pattern="\d{13}"
                    title="Ingrese exactamente 13 dígitos numéricos"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center p-2 border rounded bg-yellow-50 dark:bg-yellow-900/30 text-center">
                  <span className="text-yellow-700 dark:text-yellow-300 text-sm font-medium">Menor de Edad (No requiere DPI)</span>
                </div>
              )}

              <div>
                <label htmlFor="sexo" className="form-label">Género *</label>
                <select id="sexo" value={form.sexo} onChange={handleChange("sexo")} required className="form-select">
                  <option value="">Seleccionar...</option>
                  <option value="M">Mujer</option>
                  <option value="H">Hombre</option>
                </select>
              </div>

              {form.sexo === "M" && (
                <div>
                  <label htmlFor="embarazo" className="form-label">Embarazo</label>
                  <select id="embarazo" value={form.embarazo} onChange={handleChange("embarazo")} className="form-select">
                    <option value="">No aplica / No</option>
                    <option value="Menor de 14">Menor de 14</option>
                    <option value="Mayor de edad">Mayor de edad</option>
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="estado_civil" className="form-label">Estado Civil</label>
                <select id="estado_civil" value={form.estado_civil} onChange={handleChange("estado_civil")} className="form-select">
                  <option value="">Seleccionar...</option>
                  <option value="Soltero(a)">Soltero(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viudo(a)">Viudo(a)</option>
                  <option value="Unido(a) de hecho">Unido(a) de hecho</option>
                </select>
              </div>

              <div>
                <label htmlFor="municipio" className="form-label">Municipio</label>
                <select id="municipio" value={form.municipio} onChange={handleChange("municipio")} className="form-select">
                  <option value="">Seleccionar...</option>
                  <option value="Totonicapán (cabecera)">Totonicapán (cabecera)</option>
                  <option value="Momostenango">Momostenango</option>
                  <option value="San Andrés Xecul">San Andrés Xecul</option>
                  <option value="San Bartolo Aguas Calientes">San Bartolo Aguas Calientes</option>
                  <option value="San Cristóbal Totonicapán">San Cristóbal Totonicapán</option>
                  <option value="San Francisco El Alto">San Francisco El Alto</option>
                  <option value="Santa Lucía La Reforma">Santa Lucía La Reforma</option>
                  <option value="Santa María Chiquimula">Santa María Chiquimula</option>
                </select>
              </div>

              <div>
                <label htmlFor="aldea" className="form-label aldea-label">Aldea / Dirección</label>
                <input
                  list="aldeas"
                  id="aldea"
                  value={form.aldea}
                  onChange={handleChange("aldea")}
                  className="form-control custom-select-input"
                  placeholder="Seleccionar..."
                  autoComplete="off"
                />
                <datalist id="aldeas">
                  <option value="Chuacorral I" />
                  <option value="Chuacorral II" />
                  <option value="Chuacorral III" />
                  <option value="Xesaná" />
                  <option value="Xecajá" />
                  <option value="Rancho" />
                  <option value="Chuicacá" />
                  <option value="Xecachelaj" />
                  <option value="Xeb´e" />
                  <option value="Racaná" />
                  <option value="Patzam" />
                  <option value="Chuachituj" />
                  <option value="Chuiaj" />
                  <option value="Casa Blanca" />
                  <option value="Chuasiguan" />
                  <option value="Xecococh" />
                  <option value="Chuisactol" />
                </datalist>
              </div>
            </div>
          </fieldset>

          {/* Ficha SIGSA */}
          <fieldset className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 pt-2">
            <legend className="text-lg font-semibold px-2 text-gray-700 dark:text-gray-300">Ficha SIGSA</legend>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-2">
              <div>
                <label htmlFor="consulta" className="form-label">Tipo de Consulta *</label>
                <select id="consulta" value={form.consulta} onChange={handleChange("consulta")} required className="form-select">
                  <option value="">Seleccionar...</option>
                  <option value="Primera">Primera</option>
                  <option value="Reconsulta">Reconsulta</option>
                </select>
              </div>

              <div>
                <label htmlFor="diagnostico" className="form-label diagnostico-label">Diagnóstico (SIGSA)</label>
                <input
                  list="diagnosticos"
                  id="diagnostico"
                  value={form.diagnostico}
                  onChange={handleDiagnosticoChange}
                  className="form-control custom-select-input"
                  placeholder="Seleccionar o escribir..."
                />
                <datalist id="diagnosticos">
                  <option value="Problemas de lenguaje" />
                  <option value="Problemas de adaptación" />
                  <option value="Ansiedad generalizada" />
                  <option value="Problema somatomorfo" />
                  <option value="Tristeza leve" />
                  <option value="Asesoría en anticoncepción" />
                  <option value="Fobia específica" />
                  <option value="Ansiedad y depresión" />
                  <option value="Embarazo incidental" />
                  <option value="Estrés" />
                  <option value="Distimia" />
                </datalist>
              </div>

              <div>
                <label htmlFor="cie_10" className="form-label">CIE-10 (SIGSA)</label>
                <input id="cie_10" value={form.cie_10} onChange={handleChange("cie_10")} className="form-input" placeholder="Ej. F41.1"/>
              </div>
              <div>
                <label htmlFor="terapia" className="form-label">Terapia (SIGSA)</label>
                <input id="terapia" value={form.terapia} onChange={handleChange("terapia")} className="form-input" placeholder="Ej. Psicoterapia individual"/>
              </div>
            </div>
          </fieldset>

          {/* Ficha Médica */}
          <fieldset className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 pt-2">
            <legend className="text-lg font-semibold px-2 text-gray-700 dark:text-gray-300">Ficha Médica</legend>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-2">
              <div>
                <label htmlFor="escolaridad" className="form-label">Escolaridad</label>
                <input id="escolaridad" value={form.escolaridad} onChange={handleChange("escolaridad")} className="form-input" placeholder="Ej. Diversificado"/>
              </div>
              <div>
                <label htmlFor="ocupacion" className="form-label">Ocupación</label>
                <input id="ocupacion" value={form.ocupacion} onChange={handleChange("ocupacion")} className="form-input" placeholder="Ej. Estudiante"/>
              </div>
              <div>
                <label htmlFor="patologia" className="form-label">Patología</label>
                <input id="patologia" value={form.patologia} onChange={handleChange("patologia")} className="form-input" placeholder="Patología según ficha"/>
              </div>
              <div>
                <label htmlFor="cei10" className="form-label">Código CIE-10 (Ficha)</label>
                <input id="cei10" value={form.cei10} onChange={handleChange("cei10")} className="form-input" placeholder="Ej. F32.1"/>
              </div>
              <div>
                <label htmlFor="tipo_terapia" className="form-label">Tipo Terapia (Ficha)</label>
                <input id="tipo_terapia" value={form.tipo_terapia} onChange={handleChange("tipo_terapia")} className="form-input" placeholder="Ej. Psicoterapia grupal"/>
              </div>

              <div className="lg:col-span-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="paciente_referido"
                    checked={form.paciente_referido}
                    onChange={handleChange("paciente_referido")}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium">Paciente referido</span>
                </label>
              </div>

              {form.paciente_referido && (
                <div className="lg:col-span-3">
                  <div className="mt-3 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50/60 dark:bg-indigo-900/20 p-4">
                    <h3 className="font-semibold text-indigo-800 dark:text-indigo-300 mb-3">📄 Datos de Referencia</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">No.</label>
                        <input className="form-input" value={refData.no} readOnly />
                      </div>
                      <div>
                        <label className="form-label">Nombre del paciente</label>
                        <input className="form-input" value={refData.nombre_paciente} onChange={updateRef("nombre_paciente")} />
                      </div>
                      <div>
                        <label className="form-label">Edad</label>
                        <input className="form-input" value={refData.edad} onChange={updateRef("edad")} />
                      </div>
                      <div>
                        <label className="form-label">Fecha de referencia</label>
                        <input type="date" className="form-input" value={refData.fecha_referencia} onChange={updateRef("fecha_referencia")} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="form-label">Motivo</label>
                        <input className="form-input" placeholder="Describa el motivo" value={refData.motivo} onChange={updateRef("motivo")} />
                      </div>
                      <div>
                        <label className="form-label">Institución</label>
                        <select className="form-select" value={refData.institucion_sel} onChange={updateRef("institucion_sel")}>
                          <option value="">Seleccionar...</option>
                          <option value="MP">MP</option>
                          <option value="PGN">PGN</option>
                          <option value="JUZGADO DE NIÑEZ">JUZGADO DE NIÑEZ</option>
                          <option value="JUZGADO DE PAZ">JUZGADO DE PAZ</option>
                          <option value="JUZGADO DE FAMILIA">JUZGADO DE FAMILIA</option>
                          <option value="HOSPITAL NACIONAL">HOSPITAL NACIONAL</option>
                        </select>
                      </div>
                      <div>
                        <label className="form-label">Institucion</label>
                        <input className="form-input" placeholder="Nombre específico (opcional)" value={refData.institucion} onChange={updateRef("institucion")} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="form-label">OBS</label>
                        <textarea className="form-input" rows={3} placeholder="Observaciones" value={refData.obs} onChange={updateRef("obs")} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </fieldset>

          {/* Acciones */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            {msg && (
              <div
                className={`mb-4 p-3 rounded-lg border text-sm text-center font-medium
                  ${
                    msg.startsWith("❌") || msg.startsWith("⚠️")
                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300"
                      : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-300"
                  }`}
              >
                {msg}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            >
              {loading ? "Guardando..." : "Guardar Paciente"}
            </button>
          </div>
        </form>
      </div>

      {/* Estilos básicos */}
      <style>{`
        .form-label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: #374151; }
        .dark .form-label { color: #d1d5db; }
        .form-input, .form-select, textarea.form-input {
          width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.375rem; border: 1px solid #d1d5db;
          background-color: white; color: #111827; font-size: 0.875rem; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .dark .form-input, .dark .form-select, .dark textarea.form-input { border-color: #4b5563; background-color: #374151; color: white; }
        .form-input:focus, .form-select:focus, textarea.form-input:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.4); }
        .form-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem;
        }
        .dark .form-select {
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
        }
        .aldea-label, .diagnostico-label { font-weight: 600; margin-bottom: 6px; display: inline-block; color: #374151; }
        .custom-select-input {
          width: 100%; font-size: 0.95rem; line-height: 1.25rem;
          padding: 0.625rem 2.5rem 0.625rem 0.875rem; border: 1.5px solid #d1d5db; border-radius: 10px; background-color: #fff; color: #111827;
          appearance: none; -webkit-appearance: none; -moz-appearance: none;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
          background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 1rem;
          transition: border-color .2s ease, box-shadow .2s ease, background-color .2s ease;
        }
        .custom-select-input::placeholder { color: #6b7280; }
        .custom-select-input:hover { border-color: #a5b4fc; }
        .custom-select-input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25); }
        :root.dark .aldea-label, :root.dark .diagnostico-label { color: #e5e7eb; }
        :root.dark .custom-select-input {
          background-color: #0f172a; border-color: #334155; color: #e5e7eb;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2399a2ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
        }
        :root.dark .custom-select-input:hover { border-color: #475569; }
        :root.dark .custom-select-input:focus { border-color: #818cf8; box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.35); }
        fieldset { margin-top: 1rem; }
        legend { font-size: 1.125rem; }
      `}</style>
    </div>
  );
}
