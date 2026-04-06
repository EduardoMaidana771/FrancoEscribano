---
description: "Use when working on AI document extraction, the extract API route, Gemini integration, or adding file upload UI to FileManager. Covers extraction types, Gemini prompts, and the planned extraction workflow."
applyTo: "**/extract*,**/FileManager*"
---

# AI Extraction Guidelines

## Overview

The app uses Google Gemini 2.0-Flash to extract structured data from images of identity documents (cédulas), vehicle registries (libretas), and plain text (WhatsApp messages). The API is at `POST /api/extract`.

## API Route: `/api/extract`

### Input (FormData)

Three extraction modes:

| Mode | Fields | Description |
|---|---|---|
| `type: "cedula"` | `file` (image) | Extract person data from cédula de identidad photo |
| `type: "libreta"` | `file` (image) | Extract vehicle data from libreta de propiedad photo |
| `type: "text"` | `text` (string) | Extract transaction data from plain text (WhatsApp, email) |

### Output

JSON object with extracted fields matching the app's data model:
- **Cedula**: `full_name`, `ci_number`, `nationality`, `birth_date`, `address`
- **Libreta**: `brand`, `model`, `year`, `plate`, `padron`, `motor_number`, `chassis_number`
- **Text**: Any combination of person + vehicle + price fields

### Storage

If `fileId` is provided in the request, the extracted data is saved to the `files` table's `extracted_data` JSON column.

## Gemini Configuration

- **Model**: `gemini-2.0-flash`
- **API Key**: `GEMINI_API_KEY` (server-only env var)
- **Client**: `@google/generative-ai` package
- **Response parsing**: Strips markdown backticks from JSON response

## Pending: Extraction UI in FileManager

The API exists but there is NO UI to trigger it. The planned workflow:

1. User uploads a file (image/PDF) in FileManager → file is stored in Supabase Storage
2. After upload, show an "Extract data" button next to the file
3. Clicking it calls `POST /api/extract` with the file and type
4. Show extracted data in a preview panel
5. User reviews and clicks "Use in form" to pre-fill TransactionForm
6. If `extracted_data` is saved to the file record, show a "Processed" badge (already implemented in FileManager)

### Implementation Notes

- FileManager already shows a green "Procesado" badge for files with `extracted_data`
- The extraction should work inline (no page navigation)
- Support drag-and-drop extraction: drop image → auto-detect type (cedula vs libreta) → extract
- Allow re-extraction if first attempt produces bad results
- The extracted JSON should map directly to TransactionForm field names
