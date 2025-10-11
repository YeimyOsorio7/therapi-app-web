// src/services/api.js
// Usar SIEMPRE rutas relativas para que el proxy elimine CORS en desarrollo.

const ENDPOINTS = {
  CREATE_USER: "/api/create_user",
  PACIENTE_INFO: "/api/paciente_info",
  SIGSA_INFO: "/api/sigsa_info",
  GET_FICHA_MEDICA: "/api/ficha_medica_info",
  UPDATE_PATIENT: "/api/update_patient",
  GET_ALL_PATIENTS: "/api/get_all_patients", 
  GET_ESTADISTICAS: "/api/get_dashboard_data", 
  CREAR_CITA: "/api/crear_cita_consultorio",
  ACTUALIZAR_CITA: "/api/actualizar_cita_consultorio",
  ELIMINAR_CITA: "/api/eliminar_cita_consultorio",
};

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const ct = res.headers.get("content-type") || "";
  const parse = async () =>
    ct.includes("application/json") ? res.json() : res.text();

  const data = await parse().catch(() => null);

  if (!res.ok) {
    const msg =
      typeof data === "string" ? data : data ? JSON.stringify(data) : `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

// === Endpoints ===

export function createUser({ usuario, contrasenia, admin = false }) {
  return postJson(ENDPOINTS.CREATE_USER, { usuario, contrasenia, admin });
}

export function getPacienteInfo({ uid, dpi }) { 
  return postJson(ENDPOINTS.PACIENTE_INFO, { uid, dpi });
}

export function getSigsaInfo({ uid }) { 
  return postJson(ENDPOINTS.SIGSA_INFO, { uid });
}

export function getFichaMedica({ uid }) {
    return postJson(ENDPOINTS.GET_FICHA_MEDICA, { uid });
}

export function getAllPacientes(payload = {}) {
  // ⚠️ La petición falla con 404 porque el servidor no tiene esta ruta POST
  return postJson(ENDPOINTS.GET_ALL_PATIENTS, payload);
}

export function upsertPatient(payload) {
  return postJson(ENDPOINTS.UPDATE_PATIENT, payload);
}

export function getEstadisticas(payload = {}) {
  return postJson(ENDPOINTS.GET_ESTADISTICAS, payload);
}

export function crearCita(citaPayload) {
    return postJson(ENDPOINTS.CREAR_CITA, citaPayload);
}

export function actualizarCita(citaPayload) {
    return postJson(ENDPOINTS.ACTUALIZAR_CITA, citaPayload);
}

export function eliminarCita(id_evento) {
    return postJson(ENDPOINTS.ELIMINAR_CITA, { id_evento });
}