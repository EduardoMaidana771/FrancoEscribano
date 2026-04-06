---
description: "Use when working on Word document generation, creating or modifying the compraventa.docx template, or updating template variables. Covers Docxtemplater usage, template variable list, and date/text formatting logic."
applyTo: "**/generate-word*,**/templates/**"
---

# Word Generation Guidelines

## Overview

The app generates `.docx` files from transaction data using **Docxtemplater** + **PizZip**. The API route is `POST /api/generate-word` and accepts `{ transactionId }`.

## How It Works

1. Fetch transaction with all joins (seller, seller2, buyer, buyer2, vehicle, profile)
2. Load template from `app/templates/compraventa.docx`
3. Build a variables object with 70+ fields
4. Render with Docxtemplater
5. Return binary `.docx` with `Content-Disposition: attachment`

## Template Syntax (Docxtemplater)

- **Simple variable**: `{variable_name}`
- **Conditional section**: `{#condition}content shown if truthy{/condition}`
- **Inverted condition**: `{^condition}content shown if falsy{/condition}`
- **Loop**: `{#array}{field1} {field2}{/array}`

## Date Formatting

All dates are formatted as Spanish text: `"15 de febrero de 2026"`

Helper function converts date strings to this format using Spanish month names:
```
enero, febrero, marzo, abril, mayo, junio, julio, agosto, septiembre, octubre, noviembre, diciembre
```

## Key Template Variables

### Transaction Info
- `{transaction_date}` — formatted date
- `{matriz_number}`, `{folio_start}`, `{folio_end}`
- `{paper_series_proto}`, `{paper_number_proto}`

### Seller
- `{seller_name}`, `{seller_ci}`, `{seller_nationality}`, `{seller_address}`
- `{seller_civil_status_text}` — full text: "de estado civil soltero/a" or "de estado civil casado/a en únicas nupcias con [spouse]"
- `{seller_is_company}`, `{seller_company_name}`, `{seller_company_rut}`
- `{seller_has_representative}`, `{seller_rep_name}`, `{seller_rep_ci}`

### Buyer (same pattern as seller with `buyer_` prefix)

### Vehicle
- `{vehicle_brand}`, `{vehicle_model}`, `{vehicle_year}`
- `{vehicle_type}`, `{vehicle_fuel}`, `{vehicle_cylinders}`
- `{vehicle_motor}`, `{vehicle_chassis}`
- `{vehicle_plate}`, `{vehicle_padron}`, `{vehicle_padron_department}`

### Price & Payment
- `{price_amount}`, `{price_currency}`, `{price_in_words}`
- `{payment_text}` — human-readable: "al contado, en efectivo" or "saldo de precio de 12 cuotas mensuales de USD 500"

### Tax
- `{bps_text}`, `{irae_text}`, `{imeba_text}`
- `{cud_text}` — CUD number and date if applicable

### Previous Title
- `{prev_owner}`, `{prev_title_date}`, `{prev_notary}`
- `{prev_registry}`, `{prev_registry_number}`, `{prev_registry_date}`

### Insurance
- `{insurance_company}`, `{insurance_policy}`, `{insurance_expiry}`

### Notary
- `{notary_name}`, `{notary_city}`

## CRITICAL: Template File Missing

**The template file `app/templates/compraventa.docx` does not exist yet.** It must be created:

1. Create a Word document with the legal structure of a Uruguayan vehicle compraventa
2. Insert Docxtemplater variables (`{variable_name}`) where dynamic data goes
3. Use conditional sections for optional parts (representative, co-seller, company, plate history)
4. Save as `app/templates/compraventa.docx`

Without this file, `/api/generate-word` returns a 500 error.

## Text Generation Logic

The route handler builds complex text from data:
- **Civil status**: Combines status + nupcias type + spouse name
- **Payment terms**: Builds descriptive text based on payment type
- **Plate history**: Formats array of `{department, padron, matricula, date}` entries
- **Tax declarations**: "Declara ser / no ser contribuyente de..." with cert details
