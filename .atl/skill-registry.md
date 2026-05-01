# Skill Registry — FrancoEscribano
_Generated: 2026-04-21_

## Project Context
Next.js 16 app for Uruguayan notary. Automates vehicle compraventa document generation from AI-extracted document data.

## Stack Triggers
- Files: `*.tsx`, `*.ts` in `app/src/`
- APIs: Supabase, Google Gemini AI, docxtemplater
- Framework: Next.js App Router, React 19

## User Skills (auto-loaded by context)

| Trigger Context | Skill |
|----------------|-------|
| Go tests, Bubbletea TUI | `go-testing` |
| Creating new AI skills | `skill-creator` |
| Claude API / Anthropic SDK | `claude-api` |
| PR creation | `branch-pr` |
| GitHub issue | `issue-creation` |
| Adversarial review | `judgment-day` |

## Compact Rules

### TypeScript / Next.js
- No `any` — use `unknown` or proper types
- Prefer `Record<string, unknown>` over `object`
- API routes: always check `user` auth before processing
- Never build after changes (per CLAUDE.md)

### AI Extraction (extract/route.ts)
- 5-model fallback chain: gemini-2.0-flash → gemini-2.5-flash-lite → gemini-2.0-flash-001 → gemini-flash-lite-latest → gemini-2.5-flash
- Always use `callGeminiWithRetry` wrapper
- Return `{ data: null, type: "unknown" }` only for truly unclassifiable docs
- Supported types: cedula, libreta, antecedente, carta_poder, text

### FileManager / Bulk Extraction
- `personRoles` index maps into `bulkResults.filter(r => r.type === "cedula")`
- If antecedente present → auto-assign cedulas as "comprador" (not vendedor)
- From antecedente: `buyer` → seller prefill (if no explicit cedula vendedor)
- From carta_poder: `apoderado` → `seller_rep_*` + `seller_has_representative = true`

### Word Generation (generate-word/route.ts)
- Uses docxtemplater with `compraventa.docx` template
- Text blocks: `buildParteVendedora`, `buildParteCompradora`, `buildPrecio`, `buildCertificoQue`, `buildFirmasTexto`
- `buildCertificoQue` generates sections II (antecedente), III (apoderado), IV+ (insurance, BPS, CUD)

### Domain Rules
- Uruguay: CI format `X.XXX.XXX-X`
- Civil status: soltero | casado | divorciado | viudo | separado_bienes
- Nupcias: unicas | primeras | segundas | terceras
- BPS/IRAE/IMEBA: no | si | no_controlado
- Payment: contado | contado_cheque | contado_transferencia | saldo_precio | mixto | letra_cambio | cesion_tercero
- Power types: poder_especial | carta_poder | submandato
