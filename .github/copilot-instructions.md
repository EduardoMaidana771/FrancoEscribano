# FrancoEscribano — Copilot Project Instructions

## What This App Does

Web application for a Uruguayan notary (escribano) to manage **compraventas de vehículos** (vehicle bill of sale transactions). Allows creating transaction records with full legal detail, generating Word documents, managing files, and integrating with DGR (Dirección General de Registros).

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling**: Tailwind CSS 4 (via `@tailwindcss/postcss`)
- **Database & Auth**: Supabase (PostgreSQL 15 + Auth + Storage)
- **AI**: Google Gemini 2.0-Flash (document extraction)
- **Documents**: Docxtemplater + PizZip (Word generation)
- **Icons**: Lucide React
- **Validation**: Zod
- **Deployment**: Vercel via GitHub Actions CI/CD

## Project Structure

```
FrancoEscribano/              # Root (monorepo)
├── app/                      # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── (dashboard)/  # Authenticated route group (has Sidebar layout)
│   │   │   │   ├── archivos/           # File manager
│   │   │   │   ├── compraventas/       # Transaction list
│   │   │   │   ├── compraventa/nueva/  # New transaction form
│   │   │   │   ├── configuracion/      # Settings (notary info + DGR session)
│   │   │   │   └── carpeta/[id]/       # Dynamic folder view
│   │   │   ├── api/
│   │   │   │   ├── generate-word/      # POST: Generate .docx from transaction
│   │   │   │   ├── extract/            # POST: AI extraction from images/text
│   │   │   │   └── dgr/               # DGR session + catalogs API
│   │   │   ├── login/
│   │   │   ├── register/              # Disabled (registration blocked)
│   │   │   └── page.tsx               # Root redirect → /compraventas
│   │   ├── components/
│   │   │   ├── TransactionForm.tsx    # Main form (~1000 lines, collapsible sections)
│   │   │   ├── CompraventasList.tsx   # Transaction table with search
│   │   │   ├── FileManager.tsx        # File/folder CRUD with drag-n-drop
│   │   │   ├── DgrSessionPanel.tsx    # DGR cookie capture UI
│   │   │   ├── ConfigForm.tsx         # Notary settings form
│   │   │   └── Sidebar.tsx            # Navigation sidebar
│   │   ├── lib/
│   │   │   ├── dgr-client.ts         # DGR API client (catalogs, sessions)
│   │   │   ├── types.ts              # All TypeScript interfaces
│   │   │   └── supabase/             # client.ts, server.ts, middleware.ts
│   │   └── middleware.ts             # Auth guard (redirects to /login)
│   ├── templates/                    # Word templates (.docx) — NEEDS CREATION
│   ├── package.json
│   └── tsconfig.json
├── .github/
│   ├── workflows/vercel-deploy.yml   # CI/CD: master→prod, develop→preview
│   ├── copilot-instructions.md       # This file
│   ├── instructions/                 # Area-specific instructions
│   ├── prompts/                      # Reusable task prompts
│   └── agents/                       # Custom agents
└── [Python scripts]                  # DGR research/testing scripts (not part of app)
```

## Database Schema (8 tables in Supabase)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | Notary info + counters | full_name, next_matriz_number, next_folio_number, city |
| `clients` | People or companies in transactions | full_name, ci_number, civil_status, company_name, rut |
| `vehicles` | Vehicle records | brand, model, year, plate, padron, motor_number, chassis_number |
| `transactions` | Core business record | seller_id, buyer_id, vehicle_id, price, payment, tax, insurance, status |
| `folders` | File organization | name, parent_id, user_id |
| `files` | Uploaded documents | file_name, file_path, extracted_data (JSON) |
| `dgr_sessions` | DGR authentication cookies | cookies (JSON), status, dgr_ci |
| `dgr_cache` | Cached DGR catalog data | catalog_key, data (JSON), expires_at |

All tables have RLS (Row Level Security) enabled — queries filter by `user_id`.

## Conventions

- **Server Components** by default. Use `"use client"` only when needed (forms, event handlers, hooks).
- **Supabase client**: Use `createClient()` from `@/lib/supabase/client` in client components, from `@/lib/supabase/server` in server components and API routes.
- **API routes**: Use Next.js Route Handlers (`route.ts`) in `app/api/`.
- **Styling**: Tailwind utility classes inline. No CSS modules. Color palette: blue-600 primary, gray-50/100/200 neutrals.
- **Icons**: Import from `lucide-react`. Size 16-20 for UI elements.
- **Types**: All interfaces in `@/lib/types.ts`. Import from there, don't duplicate.
- **State**: Local React state (`useState`). No global state management library.
- **Forms**: Controlled components with `useState` for each field group.

## Environment Variables (5 required)

```
NEXT_PUBLIC_SUPABASE_URL        # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Supabase anonymous key (public)
SUPABASE_SERVICE_ROLE_KEY       # Supabase admin key (server-only)
GEMINI_API_KEY                  # Google Gemini API key (server-only)
DGR_SHARED_COOKIE_STRING        # Fallback DGR session cookies (server-only)
```

## Commands

```bash
cd app && npm run dev      # Local development (port 3000)
cd app && npm run build    # Production build
cd app && npm run lint     # ESLint check
cd app && npm run start    # Start production server
```

## CI/CD

- Push to `master` → GitHub Actions → Vercel production deploy (`escribanofranco.vercel.app`)
- Push to `develop` → GitHub Actions → Vercel preview deploy
- Workflow: `.github/workflows/vercel-deploy.yml`

## Known Pending Features

These features are planned but not yet implemented:

1. **DGR Dropdowns**: Connect `dgr-client.ts` catalog fetching to `TransactionForm` (brand→model cascading selects)
2. **AI Extraction UI**: Add file upload interface in FileManager that calls `/api/extract` and pre-fills form data
3. **Edit/Delete Transactions**: Transaction edit page + functional delete button
4. **Word Template**: Create `app/templates/compraventa.docx` with 70+ Docxtemplater variables
5. **Form Validation**: Zod schemas for required fields in TransactionForm

## Security Rules

- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` to the client
- All Supabase queries on the server must use the authenticated user's context (not service role) unless explicitly needed
- Registration is disabled — only pre-created accounts can log in
- DGR cookies are sensitive session data — never log or expose them in responses
