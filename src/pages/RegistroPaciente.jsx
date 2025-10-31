// src/pages/RegistroPaciente.jsx
import { useState, useCallback, useEffect } from "react";
import { upsertPatient } from "../services/api"; // Only need upsertPatient for saving
// import ThemeToggle from "../components/ThemeToggle"; // Uncomment if used

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

    // Not directly in required payload structure but maybe useful?
    // institucion: "",
    // motivo: "",
    // fecha_referencia: "",
    // observaciones: "",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showDPI, setShowDPI] = useState(false); // Controls DPI visibility

  // --- Handlers ---
  const handleChange = useCallback((key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setMsg("");
    setForm((prevForm) => {
      const updatedForm = { ...prevForm, [key]: value };

      // Reset embarazo if gender is not Female ('M')
      if (key === 'sexo' && value !== 'M') {
        updatedForm.embarazo = "";
      }
      return updatedForm;
    });
  }, []);

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
      } catch { calculatedAge = ""; }
    }
    setMsg("");
    setForm((f) => ({ ...f, fecha_nacimiento: val, edad: calculatedAge }));
    setShowDPI(shouldShowDPI); // Update DPI visibility state
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
    if (showDPI && !form.cui) { // Require CUI only if shown (adult)
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
      const uidToSend = (isAdult && form.cui) ? form.cui : `temp_${Date.now()}`;

      // --- Construct the Payload ---
      const payload = {
        "uid": uidToSend,
        "new_info": {
          "nombre": form.nombre.trim() || null,
          "apellido": form.apellido.trim() || null,
          "fecha_consulta": nowISO,
          "estado_paciente": "Activo" // Default status
        },
        "sigsa_info": {
          "fecha_consulta": nowISO,
          "nombre": form.nombre.trim() || null,
          "apellido": form.apellido.trim() || null,
          "cui": form.cui || null, // CUI or null
          "fecha_nacimiento": form.fecha_nacimiento || null,
          "edad": form.edad || null, // Age as string
          "ninio_menor_15": isMenor15,
          "adulto": isAdult,
          "genero": form.sexo === 'M' ? 'F' : (form.sexo === 'H' ? 'M' : null), // Map M/H -> F/M
          "municipio": form.municipio || null,
          "aldea": form.aldea || null,
          // API expects boolean? Send true only if female and specific value selected
          "embarazo": form.sexo === 'M' ? (form.embarazo === "Menor de 14" || form.embarazo === ">= edad") : false,
          "consulta": form.consulta === "Primera" ? "Primera vez" : (form.consulta === "Reconsulta" ? "Control" : null),
          "diagnostico": form.diagnostico || null,
          "cie_10": form.cie_10 || null,
          "terapia": form.terapia || null,
        },
        "ficha_medica_info": {
          "patologia": form.patologia || null, // Can use diagnostico if patologia is empty: form.patologia || form.diagnostico || null
          "cui": form.cui || null, // CUI or null
          "escolaridad": form.escolaridad || null,
          "edad": form.edad || null, // Age as string
          "ocupacion": form.ocupacion || null,
          "aldea": form.aldea || null,
          "estado_civil": form.estado_civil || null,
          "paciente_referido": form.paciente_referido || false,
          "genero": form.sexo === 'M' ? 'F' : (form.sexo === 'H' ? 'M' : null), // Map M/H -> F/M
          "municipio": form.municipio || null,
          "cei10": form.cei10 || null, // Can use cie_10 if cei10 is empty: form.cei10 || form.cie_10 || null
          "tipo_consulta": form.consulta === "Primera" ? "Primera vez" : (form.consulta === "Reconsulta" ? "Control" : null),
          "tipo_terapia": form.tipo_terapia || null, // Can use terapia if tipo_terapia is empty: form.tipo_terapia || form.terapia || null
          // API expects string "Menor de 14" etc. Send selected value or null
          "embarazo": form.sexo === 'M' ? (form.embarazo || null) : null
        }
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
      <div className="w-full max-w-4xl"> {/* Increased max-width */}
        <form
          onSubmit={guardarPaciente}
          className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl shadow-xl p-6 space-y-8 border border-gray-200 dark:border-gray-700" // Increased space-y
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
              🧾 Registro de Paciente
            </h1>
            {/* <ThemeToggle /> */}
          </div>

          {/* --- Section: Datos Personales --- */}
          <fieldset className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 pt-2">
            <legend className="text-lg font-semibold px-2 text-gray-700 dark:text-gray-300">Datos Personales</legend>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-2">
              <div>
                <label htmlFor="nombre" className="form-label">Nombre *</label>
                <input id="nombre" name="nombre" placeholder="Nombre(s)" value={form.nombre} onChange={handleChange("nombre")} required className="form-input"/>
              </div>
              <div>
                <label htmlFor="apellido" className="form-label">Apellido *</label>
                <input id="apellido" name="apellido" placeholder="Apellido(s)" value={form.apellido} onChange={handleChange("apellido")} required className="form-input"/>
              </div>
              <div>
                <label htmlFor="fecha_nacimiento" className="form-label">Fecha de Nacimiento *</label>
                <input id="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={handleFechaNacimiento} required className="form-input"/>
              </div>
              <div className="flex items-center justify-center p-2 border rounded bg-gray-50 dark:bg-gray-700 text-center">
                 {/* Age Display */}
                 {form.edad ? (<span className="text-base font-semibold"> Edad: {form.edad} {form.edad !== "" && parseInt(form.edad, 10) < 18 ? <span className="text-amber-600">(Menor)</span> : <span className="text-emerald-600">(Mayor)</span>} </span>) : (<span className="text-gray-500">Edad Calculada</span>)}
              </div>
               {/* Conditional DPI/CUI */}
               {showDPI ? (
                <div>
                  <label htmlFor="cui" className="form-label">CUI / DPI *</label>
                  <input id="cui" name="cui" placeholder="CUI / DPI" value={form.cui} onChange={handleChange("cui")} required className="form-input"/>
                </div>
              ) : (
                <div className="flex items-center justify-center p-2 border rounded bg-yellow-50 dark:bg-yellow-900/30 text-center">
                  <span className="text-yellow-700 dark:text-yellow-300 text-sm font-medium">Menor de Edad (No requiere DPI)</span>
                </div>
              )}
              <div>
                <label htmlFor="sexo" className="form-label">Género *</label>
                <select id="sexo" name="sexo" value={form.sexo} onChange={handleChange("sexo")} required className="form-select">
                  <option value="">Seleccionar...</option>
                  <option value="M">Mujer</option>
                  <option value="H">Hombre</option>
                </select>
              </div>
               {form.sexo === "M" && ( // Conditional Embarazo
                  <div>
                      <label htmlFor="embarazo" className="form-label">Embarazo</label>
                      <select id="embarazo" name="embarazo" value={form.embarazo} onChange={handleChange("embarazo")} className="form-select">
                          <option value="">No aplica / No</option>
                          <option value="Menor de 14">Menor de 14</option>
                          <option value="Mayor de edad">Mayor de edad</option>
                      </select>
                  </div>
              )}
              <div>
                <label htmlFor="estado_civil" className="form-label">Estado Civil</label>
                <input id="estado_civil" name="estado_civil" placeholder="Ej. Soltero" value={form.estado_civil} onChange={handleChange("estado_civil")} className="form-input"/>
              </div>

              {/* === CAMBIO 1: Municipio como SELECT === */}
              <div>
                <label htmlFor="municipio" className="form-label">Municipio</label>
                <select
                  id="municipio"
                  name="municipio"
                  value={form.municipio}
                  onChange={handleChange("municipio")}
                  className="form-select"
                >
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
              {/* === FIN CAMBIO 1 === */}

              <div>
                <label htmlFor="aldea" className="form-label">Aldea / Dirección</label>
                <input id="aldea" name="aldea" placeholder="Aldea o dirección" value={form.aldea} onChange={handleChange("aldea")} className="form-input"/>
              </div>
            </div>
          </fieldset>

          {/* --- Section: Ficha Médica --- */}
          <fieldset className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 pt-2">
            <legend className="text-lg font-semibold px-2 text-gray-700 dark:text-gray-300">Ficha Médica</legend>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mt-2">
                <div>
                    <label htmlFor="escolaridad" className="form-label">Escolaridad</label>
                    <input id="escolaridad" name="escolaridad" placeholder="Ej. Diversificado" value={form.escolaridad} onChange={handleChange("escolaridad")} className="form-input"/>
                </div>
                <div>
                    <label htmlFor="ocupacion" className="form-label">Ocupación</label>
                    <input id="ocupacion" name="ocupacion" placeholder="Ej. Estudiante" value={form.ocupacion} onChange={handleChange("ocupacion")} className="form-input"/>
                </div>
                <div>
                  <label htmlFor="patologia" className="form-label">Patología</label>
                  <input id="patologia" name="patologia" placeholder="Patología según ficha" value={form.patologia} onChange={handleChange("patologia")} className="form-input"/>
                </div>
                 <div>
                  <label htmlFor="cei10" className="form-label">Código CIE-10 (Ficha)</label>
                  <input id="cei10" name="cei10" placeholder="Ej. F32.1" value={form.cei10} onChange={handleChange("cei10")} className="form-input"/>
                </div>
                 <div>
                  <label htmlFor="tipo_terapia" className="form-label">Tipo Terapia (Ficha)</label>
                  <input id="tipo_terapia" name="tipo_terapia" placeholder="Ej. Psicoterapia grupal" value={form.tipo_terapia} onChange={handleChange("tipo_terapia")} className="form-input"/>
                </div>
                <div className="lg:col-span-3 pt-2"> {/* Checkbox spans full width */}
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
                    <label htmlFor="consulta" className="form-label">Tipo de Consulta *</label>
                    <select id="consulta" name="consulta" value={form.consulta} onChange={handleChange("consulta")} required className="form-select">
                        <option value="">Seleccionar...</option>
                        <option value="Primera">Primera</option>
                        <option value="Reconsulta">Reconsulta</option>
                    </select>
                 </div>
                 {/* === CAMBIO 2: Diagnóstico (SIGSA) como SELECT === */}
                 <div>
                    <label htmlFor="diagnostico" className="form-label">Diagnóstico (SIGSA)</label>
                    <select
                      id="diagnostico"
                      name="diagnostico"
                      value={form.diagnostico}
                      onChange={handleChange("diagnostico")}
                      className="form-select"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Problemas con Alcoholismo">Problemas con Alcoholismo</option>
                      <option value="Estrés Laboral">Estrés Laboral</option>
                      <option value="Problemas de Lenguaje">Problemas de Lenguaje</option>
                      <option value="Problemas de Desarrollo">Problemas de Desarrollo</option>
                      <option value="Problemas Conyugales">Problemas Conyugales</option>
                      <option value="Trastorno de la ansiedad">Trastorno de la ansiedad</option>
                      <option value="Problemas de Adaptacion">Problemas de Adaptacion</option>
                      <option value="Depresión">Depresión</option>
                      <option value="Ansiedad Generalizada">Ansiedad Generalizada</option>
                      <option value="Problemas Somatoommorfos">Problemas Somatoommorfos</option>
                      <option value="Tristeza Leve">Tristeza Leve</option>
                      <option value="Otros Prob. que Generan Estrés en la fam">Otros Prob. que Generan Estrés en la fam</option>
                      <option value="Asesoria Anticoncepcion">Asesoria Anticoncepcion</option>
                      <option value="Falta de Alimentos Adecuados">Falta de Alimentos Adecuados</option>
                      <option value="Fobia">Fobia</option>
                      <option value="Apoyo Psicologico">Apoyo Psicologico</option>
                      <option value="Ajuste de Vida">Ajuste de Vida</option>
                      <option value="Duelo">Duelo</option>
                      <option value="Trastorno del Sueño">Trastorno del Sueño</option>
                    </select>
                 </div>
                 {/* === FIN CAMBIO 2 === */}
                 <div>
                    <label htmlFor="cie_10" className="form-label">CIE-10 (SIGSA)</label>
                    <input id="cie_10" name="cie_10" placeholder="Ej. F41.1" value={form.cie_10} onChange={handleChange("cie_10")} className="form-input"/>
                 </div>
                 <div>
                    <label htmlFor="terapia" className="form-label">Terapia (SIGSA)</label>
                    <input id="terapia" name="terapia" placeholder="Ej. Psicoterapia individual" value={form.terapia} onChange={handleChange("terapia")} className="form-input"/>
                 </div>
             </div>
           </fieldset>

          {/* --- Actions & Messages --- */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
             {/* Message Area */}
             {msg && (
                <div className={`mb-4 p-3 rounded-lg border text-sm text-center font-medium
                  ${msg.startsWith("❌") || msg.startsWith("⚠️")
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300'
                    : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-300'
                  }`}
                >
                  {msg}
                </div>
              )}
             {/* Submit Button */}
             <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
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
        fieldset { margin-top: 1rem; } /* Add some space between fieldsets */
        legend { font-size: 1.125rem; } /* Larger legend text */
      `}</style>
    </div>
  );
}
