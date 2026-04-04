/**
 * DGR API Client — Handles all calls to digital.dgr.gub.uy
 *
 * The DGR system (Dirección General de Registros) uses GeneXus-based dynamic forms.
 * Auth is via gub.uy ID (SAML2 SSO) which sets session cookies.
 * All API calls need: JSESSIONID, GX_CLIENT_ID, GX_SESSION_ID, ROUTEID, GxTZOffset.
 */

const DGR_BASE =
  "https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/com.tramitesenlinea.";

export interface DgrCookies {
  GX_CLIENT_ID: string;
  GX_SESSION_ID: string;
  JSESSIONID: string;
  ROUTEID: string;
  GxTZOffset: string;
}

export interface DgrContext {
  DFFormInstId: string;
  DFFormId: number;
  DFFormVer: number;
  DFElemId: number;
  DFElemVer: number;
  Mode: string;
}

export interface DgrCatalogItem {
  Id: string;
  Value: string;
}

// ────────────────────────────────────────────────────────────────
// Cookie helpers
// ────────────────────────────────────────────────────────────────

export function cookiesToString(c: DgrCookies): string {
  return [
    `GX_CLIENT_ID=${c.GX_CLIENT_ID}`,
    `GX_SESSION_ID=${c.GX_SESSION_ID}`,
    `JSESSIONID=${c.JSESSIONID}`,
    `ROUTEID=${c.ROUTEID}`,
    `GxTZOffset=${c.GxTZOffset}`,
  ].join("; ");
}

export function parseCookies(raw: string): DgrCookies {
  const map: Record<string, string> = {};
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k) map[k.trim()] = rest.join("=").trim();
  }
  return {
    GX_CLIENT_ID: map.GX_CLIENT_ID ?? "",
    GX_SESSION_ID: map.GX_SESSION_ID ?? "",
    JSESSIONID: map.JSESSIONID ?? "",
    ROUTEID: map.ROUTEID ?? "",
    GxTZOffset: map.GxTZOffset ?? "America/Montevideo",
  };
}

// ────────────────────────────────────────────────────────────────
// Low-level request helpers
// ────────────────────────────────────────────────────────────────

function makeContext(
  elemId: number,
  formInstId: string,
  formId = 66,
): string {
  return JSON.stringify({
    DFFormInstId: formInstId,
    DFFormId: formId,
    DFFormVer: 1,
    DFElemId: elemId,
    DFElemVer: 1,
    Mode: "edit",
  });
}

function headers(cookies: DgrCookies, dynFormKey?: string): HeadersInit {
  const h: Record<string, string> = {
    Accept: "*/*",
    "Content-Type": "application/x-www-form-urlencoded",
    GxAjaxRequest: "2",
    Origin: "https://digital.dgr.gub.uy",
    Referer: `${DGR_BASE}dynformexecutedynformfrontend`,
    Cookie: cookiesToString(cookies),
  };
  if (dynFormKey) h.DynFormKey = dynFormKey;
  return h;
}

// ────────────────────────────────────────────────────────────────
// API methods
// ────────────────────────────────────────────────────────────────

/**
 * Call a catalog endpoint (returns JSON array of {Id,Value}).
 * These work without an active form instance.
 */
export async function fetchCatalog(
  cookies: DgrCookies,
  endpoint: string,
  elemId: number,
  queryPrefix = "",
  formInstId = "0",
): Promise<DgrCatalogItem[]> {
  const ts = Date.now();
  const qs = queryPrefix
    ? `${queryPrefix}gx-no-cache=${ts}`
    : `gx-no-cache=${ts}`;
  const url = `${DGR_BASE}${endpoint}?${qs}`;
  const body = `context=${encodeURIComponent(makeContext(elemId, formInstId))}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: headers(cookies),
    body,
  });

  if (!resp.ok) {
    throw new Error(`DGR ${endpoint}: HTTP ${resp.status}`);
  }
  return resp.json();
}

/**
 * Call an execute sub-function (via adynformexecute).
 * These need an active form instance (DFFormInstId from an open tramite).
 */
export async function executeFunction(
  cookies: DgrCookies,
  funcName: string,
  params: string,
  elemId: number,
  formInstId: string,
  dynFormKey?: string,
  extraBody?: string,
): Promise<string> {
  const ts = Date.now();
  const execQuery = encodeURIComponent(params);
  const url = `${DGR_BASE}adynformexecute?${execQuery},gx-no-cache=${ts}`;
  const bodyParts = [
    `context=${encodeURIComponent(makeContext(elemId, formInstId))}`,
  ];
  if (extraBody) bodyParts.push(extraBody);

  const resp = await fetch(url, {
    method: "POST",
    headers: headers(cookies, dynFormKey),
    body: bodyParts.join("&"),
  });

  if (!resp.ok) {
    throw new Error(`DGR execute ${funcName}: HTTP ${resp.status}`);
  }
  return resp.text();
}

/**
 * Test if the session cookies are still valid.
 * Tries a lightweight catalog call.
 */
export async function testSession(cookies: DgrCookies): Promise<boolean> {
  try {
    const data = await fetchCatalog(
      cookies,
      "adgr_dscargarestadocivil",
      57,
    );
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Check if we get redirected to login (session fully expired).
 */
export async function isSessionExpired(cookies: DgrCookies): Promise<boolean> {
  try {
    const resp = await fetch(
      `${DGR_BASE}bandejaciudadano`,
      {
        method: "GET",
        headers: { Cookie: cookiesToString(cookies) },
        redirect: "manual",
      },
    );
    // 301/302 → redirect to login = expired
    return resp.status >= 300 && resp.status < 400;
  } catch {
    return true;
  }
}

// ────────────────────────────────────────────────────────────────
// DGR Login URL chain
// ────────────────────────────────────────────────────────────────

/**
 * The DGR login flow:
 * 1. bandejaciudadano → 301 → gamssoagesiclogin
 * 2. gamssoagesiclogin → 301 → /servlet/sso
 * 3. /servlet/sso → 302 → auth.iduruguay.gub.uy (SAML2 SSO)
 * 4. auth.iduruguay → 302 → mi.iduruguay.gub.uy/login (user confirms on phone)
 * 5. After confirm → redirects back through auth → DGR with session cookies
 *
 * We can't automate step 4 (requires physical phone confirmation).
 * Strategy: open DGR login in popup, user authenticates, we capture cookies.
 */
export const DGR_LOGIN_URL = `${DGR_BASE}bandejaciudadano`;

// ────────────────────────────────────────────────────────────────
// Catalog endpoint definitions
// ────────────────────────────────────────────────────────────────

export const CATALOG_ENDPOINTS = {
  paises: { endpoint: "adgr_dscargarpaises", elemId: 629 },
  nacionalidades: { endpoint: "adgr_cargarnacionalidades", elemId: 1459 },
  estado_civil: { endpoint: "adgr_dscargarestadocivil", elemId: 57 },
  departamentos: { endpoint: "adgr_dscargardepartamento", elemId: 17 },
  localidades: { endpoint: "adgr_dscargarlocalidades", elemId: 16 },
  naturaleza_juridica: {
    endpoint: "adgr_6462_dscargarnaturalezajuridica",
    elemId: 1736,
  },
  actos: { endpoint: "adgr_6462_dscargaractos", elemId: 1728 },
  marcas: { endpoint: "adgr_6462_dscargarmarcasvehiculo", elemId: 1683 },
  tipos_vehiculo: {
    endpoint: "adgr_6462_dscargartiposvehiculo",
    elemId: 1677,
  },
  modelos: { endpoint: "adgr_6462_dscargarmodelosvehiculo", elemId: 1686 },
} as const;
