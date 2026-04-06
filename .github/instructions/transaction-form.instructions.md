---
description: "Use when working on the transaction form, creating/editing compraventas, form validation, or buyer/seller data entry. Covers TransactionForm structure, field groups, save logic, and pending features."
applyTo: "**/TransactionForm*,**/compraventa/**"
---

# Transaction Form Guidelines

## Overview

`TransactionForm.tsx` is the main form component (~1000+ lines) for creating vehicle bill-of-sale transactions. It uses collapsible sections and controlled `useState` for each field group.

## Form Sections (in order)

1. **Seller (Vendedor)** — Person or company, with optional co-seller (spouse) and representative
2. **Buyer (Comprador)** — Same structure as seller, with optional co-buyer and representative
3. **Vehicle (Vehículo)** — Brand, model, year, type, fuel, motor/chassis numbers, plate, padron
4. **Price (Precio)** — Amount, currency (USD/$), words, payment type with conditional fields
5. **Tax Declarations (Declaraciones)** — BPS/IRAE/IMEBA status (no/sí/no_controlado) + cert numbers
6. **Previous Title (Título Anterior)** — Prior owner, notary, registry info, title type
7. **Insurance (Seguro)** — Policy number, company, expiry
8. **Plate History (Re-empadronamiento)** — Dynamic array of prior registrations
9. **Extra Clauses** — Election declaration, traffic responsibility
10. **Protocalization** — Matriz/folio numbers, paper series (auto-populated from profile)

## Key Patterns

### Party Toggling (Person vs Company)
Each seller/buyer has `is_company` boolean. When true, show company fields (name, type, RUT, registry). When false, show person fields (name, CI, nationality, birth date, civil status).

### Civil Status Branching
- `soltero` → no extra fields
- `casado` → show nupcias_type (únicas/primeras/segundas/terceras) + spouse_name
- `divorciado` → show divorce_ficha, divorce_year, divorce_court
- `viudo` → no extra fields
- `separado_bienes` → show nupcias_type + spouse_name

### Payment Type Branching
- `contado` → just amount
- `saldo_precio` → installment count, amount, dates
- `transferencia_bancaria` → bank name
- `letra_cambio` → bank name
- `mixto` → cash amount + payment detail
- `cesion_tercero` → third party name + CI

### swapBuyerSeller()
Button that swaps all seller↔buyer data. Useful when data was entered in wrong order.

### Two Save Modes
- **"Borrador" (draft)**: Saves with `status: "borrador"`, does NOT increment counters
- **"Completado"**: Saves with `status: "completado"`, auto-increments `next_matriz_number` and `next_folio_number` in profiles

## Data Flow

1. Form state → on save → INSERT into `clients` (seller, buyer) → INSERT into `vehicles` → INSERT into `transactions` (with foreign keys)
2. Profile's `next_matriz_number` and `next_folio_number` pre-populate protocalization fields
3. `folder_name` is auto-generated from vehicle details (brand-model-plate)

## Types

All interfaces are in `@/lib/types.ts`:
- `Client` — person or company
- `Vehicle` — vehicle data
- `Transaction` — the core record linking clients + vehicle + price + tax + insurance

## Pending Features

### Edit Transaction (Priority)
- Need a `/compraventa/[id]/editar` page
- Load existing transaction data into form
- Pre-fill all fields from clients + vehicle + transaction
- Handle update logic (UPDATE instead of INSERT)

### Delete Transaction
- CompraventasList has trash icon but no handler
- Need confirmation dialog + cascade delete (clients, vehicle if orphaned)

### Form Validation (Priority)
- Use Zod schemas to validate required fields before save
- Required: seller name + CI, buyer name + CI, vehicle plate + padron, price amount
- Show inline error messages per field
- Block save if validation fails

### DGR Dropdowns
- Vehicle brand/model/type/fuel should come from DGR catalogs
- Brand → Model cascading select
- Fallback to text input if DGR is unavailable
