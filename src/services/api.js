// src/services/api.js

const BASE_URL = "https://us-central1-tera-bot-1ba7c.cloudfunctions.net/";

// ==================== ENDPOINTS ====================
const ENDPOINTS = {
  // --- Autenticación ---
  CREAR_USUARIO: "create_user",
  INICIAR_SESION: "login_user",

  // --- Pacientes ---
  OBTENER_INFO_PACIENTE: "paciente_info",
  OBTENER_INFO_SIGSA: "sigsa_info",
  OBTENER_FICHA_MEDICA: "ficha_medica_info",
  ACTUALIZAR_PACIENTE: "update_patient",

  // --- Citas ---
  OBTENER_CITAS: "listar_citas_consultorio",
  CREAR_CITA: "crear_cita_consultorio",
  ACTUALIZAR_CITA: "actualizar_cita_consultorio",
  ELIMINAR_CITA: "eliminar_cita_consultorio",

  // --- Notas clínicas ---
  OBTENER_NOTAS_CLINICAS: "obtener_notas_clinicas",
  OBTENER_NOTA_CLINICA_ID: "obtener_nota_clinica_por_id",
  AGREGAR_NOTA_CLINICA: "agregar_nota_clinica",
};

// ==================== MÉTODOS BASE ====================

// --- GET ---
async function getJson(url, params = {}) {
  let finalUrl = `${BASE_URL}${url}`;
  if (params && Object.keys(params).length > 0) {
    const queryParams = new URLSearchParams(params).toString();
    finalUrl += `?${queryParams}`;
  }

  const res = await fetch(finalUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    const msg =
      typeof data === "string"
        ? data
        : data?.error || `Error ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// --- POST ---
async function postJson(url, body = {}) {
  const finalUrl = `${BASE_URL}${url}`;

  const res = await fetch(finalUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    const msg =
      typeof data === "string"
        ? data
        : data?.error || `Error ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// ==================== EXPORTS ====================

// --- Autenticación ---
export function createUser(payload) {
  return postJson(ENDPOINTS.CREAR_USUARIO, payload);
}

export function loginUser(payload) {
  return postJson(ENDPOINTS.INICIAR_SESION, payload);
}

// --- Pacientes ---
export function getPacienteInfo(payload) {
  return getJson(ENDPOINTS.OBTENER_INFO_PACIENTE, payload);
}

export function getSigsaInfo(payload) {
  return getJson(ENDPOINTS.OBTENER_INFO_SIGSA, payload);
}

export function getFichaMedica(payload) {
  return getJson(ENDPOINTS.OBTENER_FICHA_MEDICA, payload);
}

export function upsertPatient(payload) {
  return postJson(ENDPOINTS.ACTUALIZAR_PACIENTE, payload);
}

// --- Citas ---
export function listarCitas() {
  return getJson(ENDPOINTS.OBTENER_CITAS);
}

export function crearCita(payload) {
  return postJson(ENDPOINTS.CREAR_CITA, payload);
}

export function actualizarCita(payload) {
  return postJson(ENDPOINTS.ACTUALIZAR_CITA, payload);
}

export function eliminarCita(payload) {
  return postJson(ENDPOINTS.ELIMINAR_CITA, payload);
}

// --- Notas clínicas ---
export function getAllNotasClinicas() {
  return getJson(ENDPOINTS.OBTENER_NOTAS_CLINICAS);
}

export function getNotaClinicaById(payload) {
  // payload: { uid: 'idNota' }
  return getJson(ENDPOINTS.OBTENER_NOTA_CLINICA_ID, payload);
}

export function agregarNotaClinica(payload) {
  // payload:
  // {
  //   user_id,
  //   contenido_reporte,
  //   recomendaciones_reporte,
  //   transtorno_posible,
  //   fecha_generacion,
  //   tipo_reporte
  // }
  return postJson(ENDPOINTS.AGREGAR_NOTA_CLINICA, payload);
}
