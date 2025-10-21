// src/services/api.js
// Usar SIEMPRE rutas relativas para que el proxy funcione en desarrollo.

// URL BASE PARA LAS PETICIONES A LA API
const BASE_URL = "https://us-central1-tera-bot-1ba7c.cloudfunctions.net/"

// RUTAS A LAS FUNCIONES DE LA API
const ENDPOINTS = {
  // Autenticación y Usuarios
  CREAR_USUARIO: "create_user",
  INICIAR_SESION: "login_user",

  // --- PACIENTES ---
  // Información Paciente (Detalles)
  OBTENER_INFO_PACIENTE: "paciente_info",
  OBTENER_INFO_SIGSA: "sigsa_info",
  OBTENER_FICHA_MEDICA: "ficha_medica_info",
  ACTUALIZAR_PACIENTE: "update_patient", // Para guardar/actualizar paciente
  // Listas Generales
  OBTENER_TODOS_PACIENTES: "listar_todos_pacientes",
  OBTENER_ESTADISTICAS: "get_dashboard_data",
  // --- CITAS ---
  OBTENER_CITAS: "listar_citas_consultorio",   // GET (asumido)
  CREAR_CITA: "crear_cita_consultorio",       // POST
  ACTUALIZAR_CITA: "actualizar_cita_consultorio", // POST
  ELIMINAR_CITA: "eliminar_cita_consultorio",   // POST
};

// --- Función GET ---
async function getJson(url, payload) {
  let finalUrl = `${BASE_URL}${url}`;
  if (payload && Object.keys(payload).length > 0) {
    const queryParams = new URLSearchParams(payload).toString();
    console.log("Query Params:", queryParams);
    finalUrl += `?${queryParams}`;
  }
  console.log("GET:", finalUrl);
  const res = await fetch(finalUrl, {
    method: "GET",
    headers: { "Accept": "application/json" },
  });
  const ct = res.headers.get("content-type") || "";
  const parse = async () => ct.includes("application/json") ? await res.json() : await res.text();
  const data = await parse().catch(() => null);
  if (!res.ok) {
    const msg = typeof data === "string" ? data : data ? JSON.stringify(data) : `HTTP ${res.status}`;
    const err = new Error(msg); err.status = res.status; throw err;
  }

  if (data.data !== null && data.data !== undefined) {
    console.log("GET Response Data:", data.data);
    console.log("GET Full Response:", data);
    return data.data;
  }

  console.log("GET Response Data:", data);
  return data;
}

// --- Función POST ---
async function postJson(url, payload) {
  console.log("POST:", `${BASE_URL}${url}`);
  const res = await fetch(`${BASE_URL}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get("content-type") || "";
  const parse = async () => ct.includes("application/json") ? await res.json() : await res.text();
  const data = await parse().catch(() => null);
  if (!res.ok) {
    const msg = typeof data === "string" ? data : data ? JSON.stringify(data) : `HTTP ${res.status}`;
    const err = new Error(msg); err.status = res.status; throw err;
  }
  return data;
}

// === Endpoints ===

// Usuarios y Pacientes
export function createUser(payload) { return postJson(ENDPOINTS.CREAR_USUARIO, payload); }
export function getPacienteInfo(payload) { return getJson(ENDPOINTS.OBTENER_INFO_PACIENTE, payload); }
export function getSigsaInfo(payload) { return getJson(ENDPOINTS.OBTENER_INFO_SIGSA, payload); }
export function getFichaMedica(payload) {
  try {
    return getJson(ENDPOINTS.OBTENER_FICHA_MEDICA, payload);
  } catch (error) {
    console.error("Error al obtener ficha médica:", error);
    throw error;
  }
}
export function getAllPacientes() { return getJson(ENDPOINTS.OBTENER_TODOS_PACIENTES); }
export function upsertPatient(payload) { return postJson(ENDPOINTS.ACTUALIZAR_PACIENTE, payload); }
export function getEstadisticas() { return postJson(ENDPOINTS.OBTENER_ESTADISTICAS, {}); }

// --- CITAS ---
// ✅ Nuevas funciones para Citas
export function listarCitas() {
  return getJson(ENDPOINTS.OBTENER_CITAS); // Llama a la función GET
}
export function crearCita(payload) {
  // Asegúrate de que el payload coincida con lo que espera tu backend
  return postJson(ENDPOINTS.CREAR_CITA, payload);
}
export function actualizarCita(payload) {
  // Asegúrate de que el payload coincida con lo que espera tu backend
  return postJson(ENDPOINTS.ACTUALIZAR_CITA, payload);
}
export function eliminarCita(payload) {
  // Asegúrate de que el payload coincida con lo que espera tu backend (ej: { uid: USER_UID, id_evento: '...' })
  return postJson(ENDPOINTS.ELIMINAR_CITA, payload);
}