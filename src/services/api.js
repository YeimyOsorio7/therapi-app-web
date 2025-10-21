// src/services/api.js
// Usar SIEMPRE rutas relativas para que el proxy funcione en desarrollo.

const ENDPOINTS = {
  // Autenticación y Usuarios
  CREATE_USER: "/api/create_user",
  // Información Paciente (Detalles)
  PACIENTE_INFO: "/api/paciente_info",
  SIGSA_INFO: "/api/sigsa_info",
  GET_FICHA_MEDICA: "/api/ficha_medica_info",
  UPDATE_PATIENT: "/api/update_patient", // Para guardar/actualizar paciente
  // Listas Generales
  GET_ALL_PATIENTS: "/api/listar_todos_pacientes",
  GET_ESTADISTICAS: "/api/get_dashboard_data",
  // --- CITAS ---
  LISTAR_CITAS: "/api/listar_citas_consultorio",   // GET (asumido)
  CREAR_CITA: "/api/crear_cita_consultorio",       // POST
  ACTUALIZAR_CITA: "/api/actualizar_cita_consultorio", // POST
  ELIMINAR_CITA: "/api/eliminar_cita_consultorio",   // POST
};

// --- Función GET ---
async function getJson(url) {
  const res = await fetch(url, {
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
  return data;
}

// --- Función POST ---
async function postJson(url, payload) {
  const res = await fetch(url, {
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
export function createUser(payload) { return postJson(ENDPOINTS.CREATE_USER, payload); }
export function getPacienteInfo(payload) { return postJson(ENDPOINTS.PACIENTE_INFO, payload); }
export function getSigsaInfo(payload) { return postJson(ENDPOINTS.SIGSA_INFO, payload); }
export function getFichaMedica(payload) { return postJson(ENDPOINTS.GET_FICHA_MEDICA, payload); }
export function getAllPacientes() { return getJson(ENDPOINTS.GET_ALL_PATIENTS); }
export function upsertPatient(payload) { return postJson(ENDPOINTS.UPDATE_PATIENT, payload); }
export function getEstadisticas() { return postJson(ENDPOINTS.GET_ESTADISTICAS, {}); }

// --- CITAS ---
// ✅ Nuevas funciones para Citas
export function listarCitas() {
  return getJson(ENDPOINTS.LISTAR_CITAS); // Llama a la función GET
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