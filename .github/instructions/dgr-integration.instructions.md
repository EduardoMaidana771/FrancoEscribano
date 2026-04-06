---
description: "Use when working on DGR integration, catalog fetching, session management, or connecting DGR dropdowns to the transaction form. Covers DGR API endpoints, cookie handling, and catalog data structures."
applyTo: "**/dgr*,**/catalogs*"
---

# DGR Integration Guidelines

## Overview

DGR (Dirección General de Registros) is Uruguay's vehicle registry system at `digital.dgr.gub.uy`. The app integrates with DGR to fetch catalog data (brands, models, vehicle types) and will eventually submit minutas.

## Architecture

- **`lib/dgr-client.ts`** — Core client library with all DGR API methods. Already complete.
- **`api/dgr/session/route.ts`** — GET: check session status. POST: save new cookies.
- **`api/dgr/catalogs/route.ts`** — GET: fetch catalog data with caching in `dgr_cache` table.
- **`api/dgr/capture/route.ts`** — POST: receive cookies from bookmarklet.
- **`components/DgrSessionPanel.tsx`** — UI for session management (bookmarklet + manual paste).

## DGR Session Cookies

DGR requires 4 cookies for authentication:
```
JSESSIONID, GX_CLIENT_ID, GX_SESSION_ID, ROUTEID
```

Session flow:
1. User logs into DGR in their browser
2. Cookies are captured via bookmarklet or manual paste → POST `/api/dgr/capture`
3. Stored in `dgr_sessions` table
4. If user has no session, falls back to `DGR_SHARED_COOKIE_STRING` env var

## Catalog Endpoints

All catalogs use the same pattern — POST to the DGR endpoint with a specific function name:

| Function Name | Elemento ID | Returns |
|---|---|---|
| `adgr_6462_dscargarmarcasvehiculo` | 1683 | Vehicle brands `{Id, Value}[]` |
| `adgr_6462_dscargartiposvehiculo` | 1677 | Vehicle types `{Id, Value}[]` |
| `adgr_6462_dscargarcombustiblesvehiculo` | — | Fuel types |
| `adgr_6462_dscargarmodelosvehiculo` | 1686 | Models (depends on selected brand) |
| `adgr_6462_dscargarunidadcuotaparte` | — | Quota units |
| `adgr_dscargardepartamento` | — | Departments |
| `adgr_cargarnacionalidades` | — | Nationalities |

**Cascading dependency**: Models depend on the selected brand. When fetching models, the brand ID must be passed as a parameter.

## Caching Strategy

Catalog data is cached in the `dgr_cache` table:
- Key: catalog function name
- Data: JSON array of `{Id, Value}`
- Expiry: configurable (default 24h)
- Always check cache before hitting DGR API

## Pending: Connect DGR to TransactionForm

The main pending task is connecting catalog data to the form's dropdowns:

1. Create API route or use existing `/api/dgr/catalogs` to fetch brands on form load
2. When user selects a brand → fetch models for that brand (cascading)
3. Populate vehicle type and fuel type dropdowns from DGR catalogs
4. Handle DGR unavailability gracefully (allow manual text entry as fallback)
5. Store the DGR IDs alongside the text values for future minuta submission

## Request Format

DGR API requests use a specific format with `dynformexecute` servlet:
```
POST https://digital.dgr.gub.uy/DGR_FRONTEND/servlet/adgr_6462_dscargarmarcasvehiculo
Content-Type: application/json
Cookie: [session cookies]

{
  "parm": [{"s": "value"}]
}
```

Response is always a JSON array of `{Id: number, Value: string}` objects.
