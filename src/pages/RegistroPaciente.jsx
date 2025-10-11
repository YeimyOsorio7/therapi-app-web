// src/pages/RegistroPaciente.jsx
import { useEffect, useState } from "react";
// Se asume que upsertPatient, getPacienteInfo, y getSigsaInfo están bien definidas.
// AÑADE getFichaMedica si la usas
import { upsertPatient, getPacienteInfo, getSigsaInfo } from "../services/api"; 
import ThemeToggle from "../components/ThemeToggle"; // si lo usas aquí

export default function RegistroPaciente() {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "", // Añadido para completar el objeto new_info
    dpi: "",
    // Usaremos ref_patient para el input y para el 'uid' en el payload
    ref_patient: "", 
    fechaNacimiento: "",
    edad: "",
    sexo: "", // Debería ser M/F
    tipoConsulta: "", // Primera / Reconsulta
    patologia: "", // Lo usamos en ficha_medica_info
    codigo: "", // CIE-10 code
    tipoTerapia: "",
    escolaridad: "",
    ocupacion: "",
    estadoCivil: "",
    municipio: "",
    aldea: "",
    embarazo: "", // Puede ser "Menor de 14" o valor booleano
    referido: false,
    institucion: "",
    motivo: "",
    fecha: "", // Fecha de referencia
    observaciones: "",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [sigsa, setSigsa] = useState(null); 

  // Función unificada para manejar cambios
  const handleChange = (key) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
  };

  // Calcular edad y actualizar CUI cuando cambia DPI
  function handleFechaNacimiento(val) {
    const fechaNac = new Date(val);
    const hoy = new Date();
    let edad = hoy.getFullYear() - fechaNac.getFullYear();
    const m = hoy.getMonth() - fechaNac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) edad--;
    setForm((f) => ({ ...f, fechaNacimiento: val, edad: isNaN(edad) ? "" : edad }));
  }
  
  // Sincronizar DPI con CUI (si son el mismo campo)
  const handleDPIChange = (e) => {
    const dpi = e.target.value;
    setForm((f) => ({ ...f, dpi: dpi })); // Quitamos 'cui: dpi' ya que DPI es la fuente
  };

  // Cargar SIGSA al montar
  useEffect(() => {
    (async () => {
      try {
        const data = await getSigsaInfo(); 
        setSigsa(data);
      } catch (e) {
        console.error("SIGSA:", e);
      }
    })();
  }, []);

  // Guardar / actualizar paciente
  async function guardarPaciente() {
    if (!form.nombre || !form.sexo || !form.tipoConsulta || !form.patologia || !form.codigo || !form.tipoTerapia) {
      setMsg("Completa los campos obligatorios.");
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const nowISO = new Date().toISOString();
      const ageStr = String(form.edad);
      const isAdult = ageStr && Number(ageStr) >= 18;
      const isMenor15 = ageStr && Number(ageStr) < 15;
      
      // ✅ CORRECCIÓN FINAL: Payload con la estructura de objetos anidados requerida
      const payload = {
        // REQUERIDO: Usamos ref_patient como uid (asumiendo que es el ID del paciente/usuario)
        "uid": form.ref_patient || form.dpi || "temp_id",
        
        "new_info": {
            "nombre": form.nombre,
            "apellido": form.apellido || "N/A", 
            "fecha_consulta": nowISO,
            "estado_paciente": "Activo"
        },

        "sigsa_info": {
            "fecha_consulta": nowISO,
            "nombre": form.nombre,
            "apellido": form.apellido || "Pérez", 
            "cui": form.dpi || "N/A", 
            "fecha_nacimiento": form.fechaNacimiento,
            "edad": ageStr,
            "ninio_menor_15": isMenor15, 
            "adulto": isAdult,
            "genero": form.sexo,
            "municipio": form.municipio,
            "aldea": form.aldea,
            "embarazo": form.sexo === "F" ? (form.embarazo === "Menor de 14" || form.embarazo === ">= edad") : false,
            "consulta": form.tipoConsulta === "Primera" ? "Primera vez" : "Reconsulta",
            "diagnostico": form.patologia,
            "cie_10": form.codigo,
            "terapia": form.tipoTerapia
        },

        "ficha_medica_info": {
            "patologia": form.patologia,
            "cui": form.dpi || "N/A", 
            "escolaridad": form.escolaridad,
            "edad": ageStr,
            "ocupacion": form.ocupacion,
            "aldea": form.aldea,
            "estado_civil": form.estadoCivil,
            "paciente_referido": form.referido,
            "sexo": form.sexo,
            "municipio": form.municipio,
            "cei10": form.codigo, // Usamos cei10 para coincidir con tu estructura
            "tipo_consulta": form.tipoConsulta === "Primera" ? "Primera vez" : "Control",
            "tipo_terapia": form.tipoTerapia,
            "embarazo": form.embarazo || "N/A"
        }
      };

      await upsertPatient(payload);
      setMsg("✅ Paciente guardado/actualizado.");
    } catch (err) {
      setMsg(`❌ Error: ${err.message}. Revise la consola. (Error probable de autenticación en la API)`);
    } finally {
      setLoading(false);
    }
  }

  // Buscar y rellenar por DPI
  async function cargarPacientePorDpi() {
    if (!form.dpi) {
      setMsg("Ingresa un DPI para buscar.");
      return;
    }
    setMsg("");
    try {
        // Enviar DPI para buscar
      const data = await getPacienteInfo({ dpi: form.dpi }); 
      if (!data) {
        setMsg("No se encontró paciente con ese DPI.");
        return;
      }
      setForm((f) => ({
        ...f,
        nombre: data?.nombre ?? f.nombre,
        ref_patient: data?.ref_patient ?? f.ref_patient, 
        fechaNacimiento: data?.fecha_nacimiento ?? f.fechaNacimiento,
        edad: data?.edad ?? f.edad,
        sexo: data?.sexo ?? f.sexo,
        tipoConsulta: data?.tipo_consulta ?? f.tipoConsulta,
        patologia: data?.patologia ?? f.patologia,
        codigo: data?.cie10 ?? f.codigo,
        tipoTerapia: data?.terapia ?? f.tipoTerapia,
        escolaridad: data?.escolaridad ?? f.escolaridad,
        ocupacion: data?.ocupacion ?? f.ocupacion,
        estadoCivil: data?.estado_civil ?? f.estadoCivil,
        municipio: data?.municipio ?? f.municipio,
        aldea: data?.aldea ?? f.aldea,
        embarazo: data?.embarazo ?? f.embarazo,
        referido: !!data?.referido ?? f.referido,
        institucion: data?.institucion ?? f.institucion,
        motivo: data?.motivo ?? f.motivo,
        fecha: data?.fecha ?? f.fecha,
        observaciones: data?.observaciones ?? f.observaciones,
      }));
      if (data?.fecha_nacimiento) {
        handleFechaNacimiento(data.fecha_nacimiento);
      }
      setMsg("✅ Datos cargados desde el servidor.");
    } catch (e) {
      setMsg(`❌ Error buscando paciente: ${e.message}`);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-6 pt-24">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">🧾 Registro de Paciente</h1>
          <ThemeToggle />
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
          {/* DPI + Buscar */}
          <div className="sm:col-span-2 flex gap-2">
            <input
              placeholder="DPI"
              value={form.dpi}
              onChange={handleDPIChange} // Usar el handler de DPI
              className="flex-1 px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
            />
            <button
              type="button"
              onClick={cargarPacientePorDpi}
              className="px-4 py-2 rounded bg-slate-600 hover:bg-slate-700 text-white"
            >
              Buscar por DPI
            </button>
          </div>

          {/* ✅ CORRECCIÓN 4: Campo de entrada para ref_patient */}
          <input
            placeholder="Referencia ID (ref_patient / uid)"
            value={form.ref_patient}
            onChange={handleChange("ref_patient")}
            className="px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
          />

          <input
            placeholder="Nombre completo"
            value={form.nombre}
            onChange={handleChange("nombre")}
            className="px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900 sm:col-span-2"
          />

          {/* Fecha Nacimiento + Edad */}
          <div>
            <label className="text-sm font-semibold block mb-1">Fecha de nacimiento</label>
            <input
              type="date"
              value={form.fechaNacimiento}
              onChange={(e) => handleFechaNacimiento(e.target.value)}
              className="w-full px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
            />
          </div>
          <div className="px-3 py-2 border rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100">
            Edad: <strong>{form.edad || "—"} años</strong>{" "}
            <span className={form.edad ? (form.edad < 18 ? "text-amber-600" : "text-emerald-600") : ""}>
              {form.edad ? (form.edad < 18 ? "Menor de edad" : "Mayor de edad") : ""}
            </span>
          </div>

          <select
            value={form.sexo}
            onChange={handleChange("sexo")}
            className="px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
          >
            <option value="">Sexo</option>
            <option value="M">Mujer</option>
            <option value="H">Hombre</option>
          </select>

          <select
            value={form.tipoConsulta}
            onChange={handleChange("tipoConsulta")}
            className="px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
          >
            <option value="">Tipo de consulta</option>
            <option value="Primera">Primera</option>
            <option value="Reconsulta">Reconsulta</option>
          </select>

          <input
            placeholder="Patología"
            value={form.patologia}
            onChange={handleChange("patologia")}
            className="px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
          />

          <input
            placeholder="Código CIE-10"
            value={form.codigo}
            onChange={handleChange("codigo")}
            className="px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
          />

          <input
            placeholder="Tipo de terapia"
            value={form.tipoTerapia}
            onChange={handleChange("tipoTerapia")}
            className="px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
          />

          <input
            placeholder="Municipio"
            value={form.municipio}
            onChange={handleChange("municipio")}
            className="px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
          />

          <input
            placeholder="Aldea"
            value={form.aldea}
            onChange={handleChange("aldea")}
            className="px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
          />

          <input
            placeholder="Escolaridad"
            value={form.escolaridad}
            onChange={handleChange("escolaridad")}
            className="px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
          />

          <input
            placeholder="Ocupación"
            value={form.ocupacion}
            onChange={handleChange("ocupacion")}
            className="px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
          />

          <input
            placeholder="Estado civil"
            value={form.estadoCivil}
            onChange={handleChange("estadoCivil")}
            className="px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
          />

          {form.sexo !== "H" && (
            <select
              value={form.embarazo}
              onChange={handleChange("embarazo")}
              className="px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
            >
              <option value="">Embarazo</option>
              <option value="< 14 años">Menor de 14 años</option>
              <option value=">= edad">Mayor de edad</option>
            </select>
          )}

          <div className="sm:col-span-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.referido}
                onChange={handleChange("referido")}
              />
              Paciente referido
            </label>
          </div>

          {form.referido && (
            <>
              <input
                placeholder="Institución referida"
                value={form.institucion}
                onChange={handleChange("institucion")}
                className="px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
              />
              <input
                placeholder="Motivo"
                value={form.motivo}
                onChange={handleChange("motivo")}
                className="px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
              />
              <input
                type="date"
                value={form.fecha}
                onChange={handleChange("fecha")}
                className="px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900"
              />
              <textarea
                placeholder="Observaciones"
                value={form.observaciones}
                onChange={handleChange("observaciones")}
                className="px-3 py-2 rounded border dark:border-gray-600 bg-white dark:bg-gray-900 sm:col-span-2"
              />
            </>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={guardarPaciente}
            disabled={loading}
            className="px-5 py-2.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Guardar paciente"}
          </button>
          <button
            onClick={cargarPacientePorDpi}
            className="px-5 py-2.5 rounded bg-slate-600 hover:bg-slate-700 text-white"
          >
            Buscar por DPI
          </button>
        </div>

        {msg && <p className="text-sm">{msg}</p>}
      </div>
    </div>
  );
}