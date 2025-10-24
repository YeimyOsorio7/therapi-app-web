// src/services/api.js

// URL BASE PARA LAS PETICIONES A LA API
const BASE_URL = "https://us-central1-tera-bot-1ba7c.cloudfunctions.net/"

// RUTAS A LAS FUNCIONES DE LA API
const ENDPOINTS = {
  // Autenticación y Usuarios
  CREAR_USUARIO: "create_user",
  INICIAR_SESION: "login_user",

  // --- PACIENTES ---
  OBTENER_INFO_PACIENTE: "paciente_info",
  OBTENER_INFO_SIGSA: "sigsa_info",
  OBTENER_FICHA_MEDICA: "ficha_medica_info",
  ACTUALIZAR_PACIENTE: "update_patient",
  OBTENER_TODOS_PACIENTENTES: "listar_todos_pacientes", // Note: Original had typo
  OBTENER_ESTADISTICAS: "get_dashboard_data",

  // --- CITAS ---
  OBTENER_CITAS: "listar_citas_consultorio",
  CREAR_CITA: "crear_cita_consultorio",
  ACTUALIZAR_CITA: "actualizar_cita_consultorio",
  ELIMINAR_CITA: "eliminar_cita_consultorio",

  // --- ✅ NOTAS CLÍNICAS ---
  OBTENER_NOTAS_CLINICAS: "obtener_notas_clinicas",      // GET All
  OBTENER_NOTA_CLINICA_ID: "obtener_nota_clinica_por_id", // GET by ID (requires UID query param)
  AGREGAR_NOTA_CLINICA: "agregar_nota_clinica",        // POST
};

// --- Función GET ---
async function getJson(url, payload) {
  let finalUrl = `${BASE_URL}${url}`;
  // Handle query parameters for GET requests (like getting note by ID)
  if (payload && Object.keys(payload).length > 0) {
    const queryParams = new URLSearchParams(payload).toString();
    finalUrl += `?${queryParams}`;
  }
  console.log("GET:", finalUrl);
  const res = await fetch(finalUrl, {
    method: "GET",
    headers: { "Accept": "application/json" }, // Content-Type not needed for GET with no body
  });
  const ct = res.headers.get("content-type") || "";
  const parse = async () => ct.includes("application/json") ? await res.json() : await res.text();
  const data = await parse().catch(() => null);
  if (!res.ok) {
    console.error(`GET Error ${res.status}:`, data);
    const msg = typeof data === "string" ? data : data ? JSON.stringify(data) : `HTTP ${res.status}`;
    const err = new Error(msg); err.status = res.status; throw err;
  }
  // Handle potential nested 'data' key if your API wraps responses
  // if (data && data.data !== null && data.data !== undefined) {
  //   console.log("GET Response Data (nested):", data.data);
  //   return data.data;
  // }
  console.log("GET Response Data:", data);
  return data; // Return the whole response object for flexibility
}

// --- Función POST ---
async function postJson(url, payload) {
  const finalUrl = `${BASE_URL}${url}`;
  console.log("POST:", finalUrl);
  console.log("Payload:", JSON.stringify(payload, null, 2));
  const res = await fetch(finalUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(payload),
  });
  const ct = res.headers.get("content-type") || "";
  const parse = async () => ct.includes("application/json") ? await res.json() : await res.text();
  const data = await parse().catch(() => null);
  if (!res.ok) {
    console.error(`POST Error ${res.status} Response:`, data);
    const msg = typeof data === "string" ? data : data ? JSON.stringify(data) : `HTTP ${res.status}`;
    const err = new Error(msg); err.status = res.status; throw err;
  }
  console.log("POST Success Response:", data);
  return data;
}

// === Funciones Exportadas ===

// Usuarios y Pacientes
export function createUser(payload) { return postJson(ENDPOINTS.CREAR_USUARIO, payload); }
export function loginUser(payload) { return postJson(ENDPOINTS.INICIAR_SESION, payload); }
export function getPacienteInfo(payload) { return getJson(ENDPOINTS.OBTENER_INFO_PACIENTE, payload); }
export function getSigsaInfo(payload) { return getJson(ENDPOINTS.OBTENER_INFO_SIGSA, payload); }
export function getFichaMedica(payload) { return getJson(ENDPOINTS.OBTENER_FICHA_MEDICA, payload); }
export function getAllPacientes() { return getJson(ENDPOINTS.OBTENER_TODOS_PACIENTENTES); } // Corrected endpoint name
export function upsertPatient(payload) { return postJson(ENDPOINTS.ACTUALIZAR_PACIENTE, payload); }
export function getEstadisticas() { return getJson(ENDPOINTS.OBTENER_ESTADISTICAS, {}); }

// Citas
export function listarCitas() { return getJson(ENDPOINTS.OBTENER_CITAS); }
export function crearCita(payload) { return postJson(ENDPOINTS.CREAR_CITA, payload); }
export function actualizarCita(payload) { return postJson(ENDPOINTS.ACTUALIZAR_CITA, payload); }
export function eliminarCita(payload) { return postJson(ENDPOINTS.ELIMINAR_CITA, payload); }

// --- ✅ NOTAS CLÍNICAS ---
export function getAllNotasClinicas() {
  // Calls GET endpoint for all notes
  return getJson(ENDPOINTS.OBTENER_NOTAS_CLINICAS);
}
export function getNotaClinicaById(payload) {
  // Calls GET endpoint, expects payload like { uid: 'abc123xyz' }
  // getJson handles adding the payload as query parameter "?uid=abc123xyz"
  return getJson(ENDPOINTS.OBTENER_NOTA_CLINICA_ID, payload);
}
export function agregarNotaClinica(payload) {
  // Calls POST endpoint, expects payload like { user_id: '...', contenido_reporte: '...', ... }
  return postJson(ENDPOINTS.AGREGAR_NOTA_CLINICA, payload);
}