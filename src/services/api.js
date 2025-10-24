// src/services/api.js

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
    console.log("Query Params:", queryParams); // Log query params
    finalUrl += `?${queryParams}`;
  }
  console.log("GET:", finalUrl); // Log final URL
  const res = await fetch(finalUrl, {
    method: "GET",
    headers: { "Accept": "application/json" },
  });
  const ct = res.headers.get("content-type") || "";
  const parse = async () => ct.includes("application/json") ? await res.json() : await res.text();
  const data = await parse().catch((err) => {
      console.error("Error parsing GET response:", err); // Log parsing error
      return null;
  });
  if (!res.ok) {
    console.error(`GET Error ${res.status}:`, data); // Log error status and data
    const msg = typeof data === "string" ? data : data ? JSON.stringify(data) : `HTTP ${res.status}`;
    const err = new Error(msg); err.status = res.status; throw err;
  }

  // Handle potential nested 'data' key if your API wraps responses
  if (data && data.data !== null && data.data !== undefined) {
    console.log("GET Response Data (nested):", data.data);
    return data.data;
  }

  console.log("GET Response Data:", data);
  return data;
}

// --- Función POST ---
async function postJson(url, payload) {
  const finalUrl = `${BASE_URL}${url}`;
  console.log("POST:", finalUrl);
  console.log("Payload:", JSON.stringify(payload, null, 2)); // Log payload for debugging
  const res = await fetch(finalUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get("content-type") || "";
  const parse = async () => ct.includes("application/json") ? await res.json() : await res.text();
  const data = await parse().catch((err) => {
      console.error("Error parsing POST response:", err); // Log parsing error
      return null;
  });
  if (!res.ok) {
    console.error(`POST Error ${res.status} Response:`, data); // Log error response from API
    const msg = typeof data === "string" ? data : data ? JSON.stringify(data) : `HTTP ${res.status}`;
    const err = new Error(msg); err.status = res.status; throw err;
  }
  console.log("POST Success Response:", data); // Log success response
  return data;
}

// === Funciones Exportadas ===

// Usuarios y Pacientes
export function createUser(payload) { return postJson(ENDPOINTS.CREAR_USUARIO, payload); }
export function loginUser(payload) { return postJson(ENDPOINTS.INICIAR_SESION, payload); } // Assuming login is POST
export function getPacienteInfo(payload) { return getJson(ENDPOINTS.OBTENER_INFO_PACIENTE, payload); } // Assuming GET with payload as query params
export function getSigsaInfo(payload) { return getJson(ENDPOINTS.OBTENER_INFO_SIGSA, payload); } // Assuming GET with payload as query params
export function getFichaMedica(payload) { return getJson(ENDPOINTS.OBTENER_FICHA_MEDICA, payload); } // Assuming GET with payload as query params
export function getAllPacientes() { return getJson(ENDPOINTS.OBTENER_TODOS_PACIENTES); } // Assuming GET, no payload needed
export function upsertPatient(payload) { return postJson(ENDPOINTS.ACTUALIZAR_PACIENTE, payload); }
export function getEstadisticas() { return getJson(ENDPOINTS.OBTENER_ESTADISTICAS, {}); } // Assuming GET for stats

// --- CITAS ---
export function listarCitas() {
  return getJson(ENDPOINTS.OBTENER_CITAS); // Calls GET function
}
export function crearCita(payload) {
  // Ensure payload matches backend expectations
  return postJson(ENDPOINTS.CREAR_CITA, payload);
}
export function actualizarCita(payload) {
  // Ensure payload matches backend expectations
  return postJson(ENDPOINTS.ACTUALIZAR_CITA, payload);
}
export function eliminarCita(payload) {
  // Ensure payload matches backend expectations (e.g., { uid: ..., id_evento: '...' })
  return postJson(ENDPOINTS.ELIMINAR_CITA, payload);
}