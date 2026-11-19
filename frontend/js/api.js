export const HTTP_UNAUTHORIZED = 401;
export const HTTP_NO_CONTENT   = 204;


const USE_MOCKS = false;

const GATEWAY = "https://localhost:8443";

// Which mock port answers which path (same ports as docs/openapi/README.md).
const MOCK_PORTS = {
  "/auth": 4010, "/me": 4010,
  "/collection": 4011, "/teams": 4011,
  "/monsters": 4012,
  "/encounters": 4013, "/runs": 4013,
  "/history": 4014,
};

function baseUrl(path) {
  if (!USE_MOCKS) return GATEWAY;
  const prefix = Object.keys(MOCK_PORTS).find((p) => path.startsWith(p));
  return `http://127.0.0.1:${MOCK_PORTS[prefix]}`;
}

let token = sessionStorage.getItem("token");

export function isLoggedIn() {
  return token !== null;
}

function forgetToken() {
  token = null;
  sessionStorage.removeItem("token");
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Turns any error body into one sentence a player can read.
function errorMessage(status, data) {
  if (data && Array.isArray(data.violations)) {
    return data.violations.map((v) => v.message).join(" ");     // team rule errors
  }
  if (data && data.message) return data.message;                 // our {error, message}
  if (data && data.error_description) return data.error_description; // OAuth2 errors
  if (data && typeof data.detail === "string") return data.detail;   // FastAPI default
  if (status === HTTP_UNAUTHORIZED) return "Please log in again.";
  return `Something went wrong (error ${status}).`;
}

async function request(method, path, { json, form } = {}) {
  const headers = {};
  let body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }
  if (form !== undefined) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(form);
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(baseUrl(path) + path, { method, headers, body });
  } catch {
    throw new ApiError(0, "Can't reach the server. Is the backend running and the certificate trusted?");
  }

  if (response.status === HTTP_UNAUTHORIZED) forgetToken();
  if (response.status === HTTP_NO_CONTENT) return null;

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, errorMessage(response.status, data));
  return data;
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------
export async function login(username, password) {
  const data = await request("POST", "/auth/token", {
    form: { grant_type: "password", username, password },
  });
  token = data.access_token;
  sessionStorage.setItem("token", token);
}

export function register(username, password) {
  return request("POST", "/auth/register", { json: { username, password } });
}

export async function logout() {
  try {
    await request("POST", "/auth/logout");
  } finally {
    forgetToken();
  }
}

export function getProfile() {
  return request("GET", "/me")
}

//changeProfile() GREEN

// ---------------------------------------------------------------------------
// Bestiary
// ---------------------------------------------------------------------------
export function getMonsters() {
  return request("GET", "/monsters");
}

export function getMonster(id) {
  return request("GET", `/monsters/${id}`)
}

export function getImage(id) {
  return request("GET", `/monsters/${id}/image`)
}

// ---------------------------------------------------------------------------
// Enocunters
// ---------------------------------------------------------------------------
export function getEncounters() {
  return request("GET", "/encounters")
}

export function getEncounter(id) {
  return request("GET", `/encounter/${id}`)
}

export function startEncounter(id, { team_id }) {
  return request("POST", `/encounter/${id}/runs`, {json: { team_id }})
}

export function getRun(id) {
  return request("GET", `/runs/${id}`)
}

export function resolveRun(id) {
  return request("POST", `/runs/${id}/resolve`)
}

export function abandonRun(id) {
  return request("POST", `/runs/${id}/abandon`)
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------
export function getHistory() {
  return request("GET", `/history`)
}

export function getHistoryElement(id) {
  return request("GET", `/history/${id}`)
}

// ---------------------------------------------------------------------------
// Ownership
// ---------------------------------------------------------------------------
export function getCollection() {
  return request("GET", `/collection`)
}

export function getTeams() {
  return request("GET", `/teams`)
}

export function createTeam({name, members}) {
  return request("POST", "/teams", {json: {name, members}})
}

export function getTeam(id) {
  return request("GET", `/teams/${id}`)
}

export function editTeam(id, {name, members}) {
  return request("PUT", `/teams/${id}`, {json: {name, members}})
}

export function deleteTeam(id) {
  return request("DELETE", `/teams/${id}`)
}

export function validateTeam({name, members}) {
  return request("POST", "/teams/validate", {json: {name, members}})
}