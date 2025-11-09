// src/pages/RegistroPaciente.jsx
import { useState, useCallback, useEffect } from "react";
import { upsertPatient } from "../services/api"; // Only need upsertPatient for saving
// import ThemeToggle from "../components/ThemeToggle"; // Uncomment if used

// --- Mapeo de Diagnóstico SIGSA -> CIE-10 (según tu lista) ---
const DIAG_TO_CIE10_RAW = {
  "problemas de lenguaje": "F80",
  "problema de adaptacion": "F43.2",
  "ansiedad generalizada": "F41.1",
  "problema somatomofo": "F45.8",
  "tristeza leve": "F32",
  "asesoria anticoncepcion": "F30.1",
  "fobia especifica": "F40.2",
  "ansiedad y deprecion": "F41.2",
  "embarazo incidental": "F33",
  "estres": "F43",
  "distimia": "F34.1",
};

// Normaliza: minúsculas, sin acentos y espacios compactados
const normalize = (s = "") =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .replace(/\s+/g, " ")
    .trim();

// Alias para etiquetas del <select> que no coinciden exactamente con las claves del mapa
const DIAG_ALIASES = {
  [normalize("Problemas de Lenguaje")]: "problemas de lenguaje",
  [normalize("Problemas de Adaptacion")]: "problema de adaptacion",
  [normalize("Ansiedad Generalizada")]: "ansiedad generalizada",
  [normalize("Problemas Somatoommorfos")]: "problema somatomofo",
  [normalize("Tristeza Leve")]: "tristeza leve",
  [normalize("Asesoria Anticoncepcion")]: "asesoria anticoncepcion",
  [normalize("Fobia")]: "fobia especifica",
  [normalize("Estrés Laboral")]: "estres", // usar F43
  // Las siguientes no se dieron en tu tabla (las dejamos sin mapeo)
  [normalize("Duelo")]: null,
  [normalize("Trastorno del Sueño")]: null,
  [normalize("Problemas con Alcoholismo")]: null,
  [normalize("Problemas de Desarrollo")]: null,
  [normalize("Problemas Conyugales")]: null,
  [normalize("Otros Prob. que Generan Estrés en la fam")]: null,
  [normalize("Apoyo Psicologico")]: null,
  [normalize("Ajuste de Vida")]: null,
  [normalize("Depresión")]: null,
  [normalize("Trastorno de la ansiedad")]: null,
};

const mapDiagnosticoToCIE10 = (label) => {
  const n = normalize(label);
  if (DIAG_TO_CIE10_RAW[n]) return DIAG_TO_CIE10_RAW[n];
  const key = DIAG_ALIASES[n];
  if (key && DIAG_TO_CIE10_RAW[key]) return DIAG_TO_CIE10_RAW[key];
  return "";
};

export default function RegistroPaciente() {
  // --- State for ALL unique form fields ---
  const [form, setForm] = useState({
    // Personal Info (Mapped to new_info, sigsa_info, ficha_medica_info)
    nombre: "",
    apellido: "",
    cui: "", // Will be main ID source if available
    fecha_nacimiento: "",
    edad: "", // Calculated
    sexo: "", // Form uses M=Mujer, H=Hombre
    municipio: "",
    aldea: "",
    estado_civil: "", // Ficha Medica
    escolaridad: "", // Ficha Medica
    ocupacion: "", // Ficha Medica

    // Clinical Info (Mapped to sigsa_info, ficha_medica_info)
    consulta: "", // SIGSA & Ficha (Type) -> Primera / Reconsulta
    diagnostico: "", // SIGSA -> Diagnostico
    cie_10: "", // SIGSA -> CIE-10 Code
    terapia: "", // SIGSA -> Therapy Type

    patologia: "", // Ficha Medica -> Pathology (can be same as diagnostico)
    cei10: "", // Ficha Medica -> CIE-10 Code (can be same as cie_10)
    tipo_terapia: "", // Ficha Medica -> Therapy Type (can be same as terapia)

    // Conditional Fields
    embarazo: "", // Ficha Medica (String value) & SIGSA (Boolean logic) - Only if sexo='M'
    paciente_referido: false, // Ficha Medica
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showDPI, setShowDPI] = useState(false); // Controls DPI visibility

  // --- Handlers ---
  const handleChange = useCallback(
    (key) => (e) => {
      const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      setMsg("");
      setForm((prevForm) => {
        const updatedForm = { ...prevForm, [key]: value };

        // Reset embarazo if gender is not Female ('M')
        if (key === "sexo" && value !== "M") {
          updatedForm.embarazo = "";
        }
        return updatedForm;
      });
    },
    []
  );

  const handleFechaNacimiento = useCallback((e) => {
    const val = e.target.value;
    let calculatedAge = "";
    let shouldShowDPI = false;
    if (val) {
      try {
        const fechaNac = new Date(val);
        const hoy = new Date();
        let edad = hoy.getFullYear() - fechaNac.getFullYear();
        const m = hoy.getMonth() - fechaNac.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) {
          edad--;
        }
        calculatedAge = isNaN(edad) ? "" : String(edad);
        shouldShowDPI = !isNaN(edad) && edad >= 18; // Show DPI if 18 or older
      } catch {
        calculatedAge = "";
      }
    }
    setMsg("");
    setForm((f) => ({ ...f, fecha_nacimiento: val, edad: calculatedAge }));
    setShowDPI(shouldShowDPI); // Update DPI visibility state
  }, []);

  // Handler específico para Diagnóstico -> autollenar CIE-10
  const handleDiagnosticoChange = useCallback((e) => {
    const value = e.target.value;
    const cie = mapDiagnosticoToCIE10(value);

    setMsg("");
    setForm((prev) => {
      const next = { ...prev, diagnostico: value };
      if (cie) {
        next.cie_10 = cie; // SIGSA
        if (!prev.cei10) next.cei10 = cie; // Ficha (si está vacío)
      }
      return next;
    });
  }, []);

  // --- Submit Function ---
  const guardarPaciente = async (e) => {
    e.preventDefault();
    setMsg("");

    // Basic Validation
    if (!form.nombre || !form.apellido || !form.fecha_nacimiento || !form.sexo || !form.consulta) {
      setMsg("❌ Completa los campos obligatorios (*).");
      return;
    }
    if (showDPI && !form.cui) {
      // Require CUI only if shown (adult)
      setMsg("❌ El CUI/DPI es obligatorio para mayores de edad.");
      return;
    }

    setLoading(true);
    try {
      const nowISO = new Date().toISOString();
      const ageNum = parseInt(form.edad, 10);
      const isAdult = !isNaN(ageNum) && ageNum >= 18;
      const isMenor15 = !isNaN(ageNum) && ageNum < 15;

      // Determine UID: Use CUI if adult, otherwise generate temporary ID.
      // Backend should generate the final/real UID.
      const uidToSend = isAdult && form.cui ? form.cui : `temp_${Date.now()}`;

      // --- Construct the Payload ---
      const payload = {
        uid: uidToSend,
        new_info: {
          nombre: form.nombre.trim() || null,
          apellido: form.apellido.trim() || null,
          fecha_consulta: nowISO,
          estado_paciente: "Activo", // Default status
        },
        sigsa_info: {
          fecha_consulta: nowISO,
          nombre: form.nombre.trim() || null,
          apellido: form.apellido.trim() || null,
          cui: form.cui || null, // CUI or null
          fecha_nacimiento: form.fecha_nacimiento || null,
          edad: form.edad || null, // Age as string
          ninio_menor_15: isMenor15,
          adulto: isAdult,
          genero: form.sexo === "M" ? "F" : form.sexo === "H" ? "M" : null, // Map M/H -> F/M
          municipio: form.municipio || null,
          aldea: form.aldea || null,
          // TRUE solo si es mujer y seleccionó una de las categorías
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
          patologia: form.patologia || null, // o form.diagnostico si quieres
          cui: form.cui || null, // CUI or null
          escolaridad: form.escolaridad || null,
          edad: form.edad || null, // Age as string
          ocupacion: form.ocupacion || null,
          aldea: form.aldea || null,
          estado_civil: form.estado_civil || null,
          paciente_referido: form.paciente_referido || false,
          genero: form.sexo === "M" ? "F" : form.sexo === "H" ? "M" : null, // Map M/H -> F/M
          municipio: form.municipio || null,
          cei10: form.cei10 || null, // o form.cie_10 si quieres replicar
          tipo_consulta:
            form.consulta === "Primera"
              ? "Primera vez"
              : form.consulta === "Reconsulta"
              ? "Control"
              : null,
          tipo_terapia: form.tipo_terapia || null, // o form.terapia si quieres
          // API espera string cuando aplica
          embarazo: form.sexo === "M" ? form.embarazo || null : null,
        },
      };

      console.log("Enviando Payload:", JSON.stringify(payload, null, 2));

      const response = await upsertPatient(payload);

      if (response && response.success === false) {
        throw new Error(response.error || "Error desconocido desde la API.");
      }

      setMsg("✅ Paciente registrado/actualizado correctamente.");
      // Optionally reset form: setForm({ /* initial empty state */ });
    } catch (err) {
      console.error("Error al guardar paciente:", err);
      setMsg(`❌ Error al guardar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Render Component ---
  return (
    // Outer container
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 to-teal-200 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-4xl">
        {/* Increased max-width */}
        <form
          onSubmit={guardarPaciente}
          className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl shadow-xl p-6 space-y-8 border border-gray-200 dark:border-gray-700" // Increased space-y
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">🧾 Registro de Paciente</h1>
            {/* <ThemeToggle /> */}
          </div>

          {/* --- Section: Datos Personales --- */}
          <fieldset className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 pt-2">
            <legend className="text-lg font-semibold px-2 text-gray-700 dark:text-gray-300">Datos Personales</legend>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-2">
              <div>
                <label htmlFor="nombre" className="form-label">
                  Nombre *
                </label>
                <input
                  id="nombre"
                  name="nombre"
                  placeholder="Nombre(s)"
                  value={form.nombre}
                  onChange={handleChange("nombre")}
                  required
                  className="form-input"
                />
              </div>
              <div>
                <label htmlFor="apellido" className="form-label">
                  Apellido *
                </label>
                <input
                  id="apellido"
                  name="apellido"
                  placeholder="Apellido(s)"
                  value={form.apellido}
                  onChange={handleChange("apellido")}
                  required
                  className="form-input"
                />
              </div>
              <div>
                <label htmlFor="fecha_nacimiento" className="form-label">
                  Fecha de Nacimiento *
                </label>
                <input
                  id="fecha_nacimiento"
                  type="date"
                  value={form.fecha_nacimiento}
                  onChange={handleFechaNacimiento}
                  required
                  className="form-input"
                />
              </div>
              <div className="flex items-center justify-center p-2 border rounded bg-gray-50 dark:bg-gray-700 text-center">
                {/* Age Display */}
                {form.edad ? (
                  <span className="text-base font-semibold">
                    {" "}
                    Edad: {form.edad}{" "}
                    {form.edad !== "" && parseInt(form.edad, 10) < 18 ? (
                      <span className="text-amber-600">(Menor)</span>
                    ) : (
                      <span className="text-emerald-600">(Mayor)</span>
                    )}{" "}
                  </span>
                ) : (
                  <span className="text-gray-500">Edad Calculada</span>
                )}
              </div>
              {/* Conditional DPI/CUI */}
              {showDPI ? (
                <div>
                  <label htmlFor="cui" className="form-label">
                    CUI / DPI *
                  </label>
                  <input
                    id="cui"
                    name="cui"
                    placeholder="CUI / DPI"
                    value={form.cui}
                    onChange={handleChange("cui")}
                    required
                    className="form-input"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center p-2 border rounded bg-yellow-50 dark:bg-yellow-900/30 text-center">
                  <span className="text-yellow-700 dark:text-yellow-300 text-sm font-medium">Menor de Edad (No requiere DPI)</span>
                </div>
              )}
              <div>
                <label htmlFor="sexo" className="form-label">
                  Género *
                </label>
                <select id="sexo" name="sexo" value={form.sexo} onChange={handleChange("sexo")} required className="form-select">
                  <option value="">Seleccionar...</option>
                  <option value="M">Mujer</option>
                  <option value="H">Hombre</option>
                </select>
              </div>
              {form.sexo === "M" && (
                // Conditional Embarazo
                <div>
                  <label htmlFor="embarazo" className="form-label">
                    Embarazo
                  </label>
                  <select id="embarazo" name="embarazo" value={form.embarazo} onChange={handleChange("embarazo")} className="form-select">
                    <option value="">No aplica / No</option>
                    <option value="Menor de 14">Menor de 14</option>
                    <option value="Mayor de edad">Mayor de edad</option>
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="estado_civil" className="form-label">
                  Estado Civil
                </label>
                <input
                  id="estado_civil"
                  name="estado_civil"
                  placeholder="Ej. Soltero"
                  value={form.estado_civil}
                  onChange={handleChange("estado_civil")}
                  className="form-input"
                />
              </div>

              {/* === Municipio como SELECT === */}
              <div>
                <label htmlFor="municipio" className="form-label">
                  Municipio
                </label>
                <select id="municipio" name="municipio" value={form.municipio} onChange={handleChange("municipio")} className="form-select">
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

              {/* === Aldea / Dirección como SELECT con territorios === */}
            <div>
  <label htmlFor="aldea" className="form-label aldea-label">
    Aldea / Dirección
  </label>

  {/* Campo que permite escribir o seleccionar sugerencias */}
  <input
    list="aldeas"
    id="aldea"
    name="aldea"
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

  {/* === ESTILOS EN EL MISMO ARCHIVO === */}
  <style>{`
    .aldea-label {
      font-weight: 600;
      margin-bottom: 6px;
      display: inline-block;
      color: #374151; /* gris oscuro */
    }

    .custom-select-input {
      width: 100%;
      font-size: 0.95rem;
      line-height: 1.25rem;
      padding: 0.625rem 2.5rem 0.625rem 0.875rem; /* espacio para la flecha */
      border: 1.5px solid #d1d5db; /* gris claro */
      border-radius: 10px;
      background-color: #fff;

      /* Quitar estilos nativos y poner flecha */
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;

      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      background-size: 1rem;

      transition: border-color .2s ease, box-shadow .2s ease, background-color .2s ease;
    }

    .custom-select-input::placeholder {
      color: #6b7280; /* gris medio */
    }

    .custom-select-input:hover {
      border-color: #a5b4fc; /* morado claro */
    }

    .custom-select-input:focus {
      outline: none;
      border-color: #6366f1; /* morado/azulado como en la imagen */
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
    }

    /* Modo oscuro opcional (si usas dark mode) */
    :root.dark .aldea-label { color: #e5e7eb; }
    :root.dark .custom-select-input {
      background-color: #0f172a;
      border-color: #334155;
      color: #e5e7eb;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2399a2ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
    }
    :root.dark .custom-select-input:hover { border-color: #475569; }
    :root.dark .custom-select-input:focus {
      border-color: #818cf8;
      box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.35);
    }
  `}</style>
</div>

              {/* === FIN Aldea === */}
            </div>
          </fieldset>

          {/* --- Section: Ficha Médica --- */}
          <fieldset className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 pt-2">
            <legend className="text-lg font-semibold px-2 text-gray-700 dark:text-gray-300">Ficha Médica</legend>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-2">
              <div>
                <label htmlFor="escolaridad" className="form-label">
                  Escolaridad
                </label>
                <input
                  id="escolaridad"
                  name="escolaridad"
                  placeholder="Ej. Diversificado"
                  value={form.escolaridad}
                  onChange={handleChange("escolaridad")}
                  className="form-input"
                />
              </div>
              <div>
                <label htmlFor="ocupacion" className="form-label">
                  Ocupación
                </label>
                <input id="ocupacion" name="ocupacion" placeholder="Ej. Estudiante" value={form.ocupacion} onChange={handleChange("ocupacion")} className="form-input" />
              </div>
              <div>
                <label htmlFor="patologia" className="form-label">
                  Patología
                </label>
                <input
                  id="patologia"
                  name="patologia"
                  placeholder="Patología según ficha"
                  value={form.patologia}
                  onChange={handleChange("patologia")}
                  className="form-input"
                />
              </div>
              <div>
                <label htmlFor="cei10" className="form-label">
                  Código CIE-10 (Ficha)
                </label>
                <input id="cei10" name="cei10" placeholder="Ej. F32.1" value={form.cei10} onChange={handleChange("cei10")} className="form-input" />
              </div>
              <div>
                <label htmlFor="tipo_terapia" className="form-label">
                  Tipo Terapia (Ficha)
                </label>
                <input
                  id="tipo_terapia"
                  name="tipo_terapia"
                  placeholder="Ej. Psicoterapia grupal"
                  value={form.tipo_terapia}
                  onChange={handleChange("tipo_terapia")}
                  className="form-input"
                />
              </div>
              <div className="lg:col-span-3 pt-2">
                {/* Checkbox spans full width */}
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
              {/* Add fields for institucion etc. here if form.paciente_referido is true */}
            </div>
          </fieldset>

          {/* --- Section: Ficha SIGSA --- */}
          <fieldset className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 pt-2">
            <legend className="text-lg font-semibold px-2 text-gray-700 dark:text-gray-300">Ficha SIGSA</legend>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-2">
              <div>
                <label htmlFor="consulta" className="form-label">
                  Tipo de Consulta *
                </label>
                <select id="consulta" name="consulta" value={form.consulta} onChange={handleChange("consulta")} required className="form-select">
                  <option value="">Seleccionar...</option>
                  <option value="Primera">Primera</option>
                  <option value="Reconsulta">Reconsulta</option>
                </select>
              </div>

              <div>
  <label htmlFor="diagnostico" className="form-label diagnostico-label">
    Diagnóstico (SIGSA)
  </label>

  <input
    list="diagnosticos"
    id="diagnostico"
    name="diagnostico"
    value={form.diagnostico}
    onChange={handleDiagnosticoChange}
    className="form-control custom-select-input"
    placeholder="Seleccionar o escribir..."
  />

  <datalist id="diagnosticos">
    <option value="Problemas con Alcoholismo" />
    <option value="Estrés Laboral" />
    <option value="Problemas de Lenguaje" />
    <option value="Problemas de Desarrollo" />
    <option value="Problemas Conyugales" />
    <option value="Trastorno de la ansiedad" />
    <option value="Problemas de Adaptacion" />
    <option value="Depresión" />
    <option value="Ansiedad Generalizada" />
    <option value="Problemas Somatoommorfos" />
    <option value="Tristeza Leve" />
    <option value="Otros Prob. que Generan Estrés en la fam" />
    <option value="Asesoria Anticoncepcion" />
    <option value="Falta de Alimentos Adecuados" />
    <option value="Fobia" />
    <option value="Apoyo Psicologico" />
    <option value="Ajuste de Vida" />
    <option value="Duelo" />
    <option value="Trastorno del Sueño" />
  </datalist>

  <style>{`
    .diagnostico-label {
      font-weight: 600;
      margin-bottom: 6px;
      display: inline-block;
      color: #374151;
    }

    .custom-select-input {
      width: 100%;
      font-size: 0.95rem;
      line-height: 1.25rem;
      padding: 0.625rem 2.5rem 0.625rem 0.875rem;
      border: 1.5px solid #d1d5db;
      border-radius: 10px;
      background-color: #fff;
      color: #111827;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
      background-repeat: no-repeat;
      background-position: right 0.75rem center;
      background-size: 1rem;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .custom-select-input::placeholder {
      color: #6b7280;
    }

    .custom-select-input:hover {
      border-color: #a5b4fc;
    }

    .custom-select-input:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
    }

    /* Modo oscuro opcional */
    :root.dark .diagnostico-label { color: #e5e7eb; }
    :root.dark .custom-select-input {
      background-color: #0f172a;
      border-color: #334155;
      color: #e5e7eb;
      background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2399a2ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>");
    }
    :root.dark .custom-select-input:hover { border-color: #475569; }
    :root.dark .custom-select-input:focus {
      border-color: #818cf8;
      box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.35);
    }
  `}</style>
</div>


              <div>
                <label htmlFor="cie_10" className="form-label">
                  CIE-10 (SIGSA)
                </label>
                <input id="cie_10" name="cie_10" placeholder="Ej. F41.1" value={form.cie_10} onChange={handleChange("cie_10")} className="form-input" />
              </div>
              <div>
                <label htmlFor="terapia" className="form-label">
                  Terapia (SIGSA)
                </label>
                <input id="terapia" name="terapia" placeholder="Ej. Psicoterapia individual" value={form.terapia} onChange={handleChange("terapia")} className="form-input" />
              </div>
            </div>
          </fieldset>

          {/* --- Actions & Messages --- */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            {/* Message Area */}
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
            {/* Submit Button (EN AZUL) */}
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

      {/* Basic styles - move to CSS global */}
      <style>{`
        .form-label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: #374151; }
        .dark .form-label { color: #d1d5db; }
        .form-input, .form-select {
          width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.375rem; border: 1px solid #d1d5db;
          background-color: white; color: #111827; font-size: 0.875rem; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .dark .form-input, .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }
        .form-input:focus, .form-select:focus { outline: none; border-color: #4f46e5; box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.4); }
        .form-select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; }
        .dark .form-select { background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); }
        fieldset { margin-top: 1rem; }
        legend { font-size: 1.125rem; }
      `}</style>
    </div>
  );
}
