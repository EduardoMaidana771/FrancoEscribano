-- =============================================================
-- AutomatizacionEscribano — Supabase Database Schema
-- Run this in Supabase SQL Editor
-- =============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================================
-- PROFILES (extends Supabase auth.users)
-- =============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null,
  -- Notary-specific config
  next_matriz_number int not null default 133,
  next_folio_number int not null default 293,
  city text not null default 'Maldonado',
  notary_name text not null default '',
  notary_initials text not null default '',
  paper_series_proto text not null default '',
  paper_number_proto text not null default '',
  paper_series_testimony text not null default '',
  paper_numbers_testimony text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, notary_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- CLIENTS (personas / empresas)
-- =============================================================
create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  -- Person data
  full_name text not null,
  ci_number text,
  nationality text default 'oriental',
  birth_date date,
  birth_place text,
  civil_status text default 'soltero', -- soltero, casado, divorciado, viudo, separado_bienes
  gender text check (gender in ('M', 'F')),
  civil_status_detail text, -- "en únicas nupcias", "en segundas nupcias", etc.
  nupcias_type text, -- unicas, primeras, segundas, terceras
  spouse_name text,
  divorce_ficha text,
  divorce_year text,
  divorce_court text,
  address text,
  department text default 'Maldonado',
  phone text,
  -- Company data
  is_company boolean not null default false,
  company_name text,
  company_type text, -- SA, SRL, SAS
  rut text,
  company_registry_number text,
  company_registry_folio text,
  company_registry_book text,
  company_business_purpose text,
  company_law_19484 boolean not null default false,
  -- Representative (apoderado)
  representative_name text,
  representative_ci text,
  representative_role text, -- representante, presidente, apoderado
  representative_address text,
  --
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients enable row level security;

create policy "Users can CRUD own clients"
  on public.clients for all using (auth.uid() = user_id);

-- =============================================================
-- VEHICLES
-- =============================================================
create table public.vehicles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  brand text,
  brand_dgr_id text, -- DGR catalog ID for future minuta submission
  model text,
  model_dgr_id text,
  year int,
  type text, -- CAMIONETA CAB.DOB. C/CAJA, HATCH 5 PUERTAS, etc.
  type_dgr_id text,
  fuel text default 'NAFTA',
  fuel_dgr_id text,
  cylinders int,
  motor_number text,
  chassis_number text,
  plate text, -- matrícula (AAQ 9133)
  padron text, -- 903095282
  padron_department text, -- CANELONES, MALDONADO
  national_code text,
  affectation text default 'PARTICULAR',
  owner_name text,
  owner_ci text,
  created_at timestamptz not null default now()
);

alter table public.vehicles enable row level security;

create policy "Users can CRUD own vehicles"
  on public.vehicles for all using (auth.uid() = user_id);

-- =============================================================
-- TRANSACTIONS (compraventas)
-- =============================================================
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  -- Parties
  seller_id uuid references public.clients(id),
  seller2_id uuid references public.clients(id), -- spouse as co-seller
  buyer_id uuid references public.clients(id),
  buyer2_id uuid references public.clients(id), -- spouse as co-buyer
  vehicle_id uuid references public.vehicles(id),
  -- Seller representative
  seller_has_representative boolean not null default false,
  seller_representative_name text,
  seller_representative_ci text,
  seller_representative_address text,
  seller_representative_power_date text,
  seller_representative_power_notary text,
  seller_representative_power_protocol_date text,
  seller_representative_power_type text, -- poder_especial, carta_poder, submandato
  seller_representative_can_substitute boolean not null default false,
  -- Buyer representative
  buyer_has_representative boolean not null default false,
  buyer_representative_name text,
  buyer_representative_ci text,
  buyer_representative_address text,
  buyer_representative_power_date text,
  buyer_representative_power_notary text,
  buyer_representative_power_protocol_date text,
  buyer_representative_power_type text,
  buyer_representative_can_substitute boolean not null default false,
  -- Price
  price_amount decimal(12,2),
  price_currency text default 'USD', -- USD, UYU, etc.
  price_in_words text,
  payment_type text default 'contado', -- contado, saldo_precio, transferencia_bancaria, letra_cambio, mixto, cesion_tercero
  payment_detail text, -- extra info
  payment_installments_count int,
  payment_installment_amount decimal(12,2),
  payment_installment_dates text, -- JSON array of date strings
  payment_cash_amount decimal(12,2), -- cash portion for mixed payments
  payment_bank_name text,
  payment_third_party_name text,
  payment_third_party_ci text,
  -- Tax declarations (no, si, no_controlado)
  bps_status text not null default 'no',
  irae_status text not null default 'no',
  imeba_status text not null default 'no',
  bps_cert_number text,
  bps_cert_date text,
  cud_number text,
  cud_date text,
  -- Title
  previous_owner_name text,
  previous_title_date text,
  previous_title_notary text,
  previous_title_same_notary boolean not null default false,
  previous_title_registry text,
  previous_title_number text,
  previous_title_registry_date text,
  -- Insurance
  insurance_policy_number text,
  insurance_company text,
  insurance_expiry text,
  insurance_separate_cert boolean not null default false,
  -- Previous title details
  previous_title_type text, -- documento_privado, escritura_publica, sucesion
  previous_title_is_first_registration boolean not null default false,
  -- Vehicle history (antecedentes matrícula)
  has_plate_history boolean not null default false,
  plate_history_entries text, -- JSON array: [{department, padron, matricula, date}]
  -- Extra clauses
  election_declaration text,
  has_traffic_responsibility_clause boolean not null default false,
  traffic_responsibility_date text,
  -- Protocolización
  matriz_number int,
  folio_start int,
  folio_end int,
  folio_end_is_vuelto boolean not null default true,
  previous_matriz_number int,
  previous_matriz_type text, -- "compraventa automotor", "carta poder", "prenda automotor"
  previous_matriz_folio_start int,
  previous_matriz_folio_end int,
  -- Notarial paper
  paper_series_proto text,
  paper_number_proto text,
  paper_series_testimony text,
  paper_numbers_testimony text,
  -- Protocolización date (may differ from transaction date)
  protocolization_date date,
  -- Meta
  transaction_date date not null default current_date,
  status text not null default 'borrador', -- borrador, completado
  folder_name text, -- MARCA-MODELO-MATRICULA
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "Users can CRUD own transactions"
  on public.transactions for all using (auth.uid() = user_id);

-- =============================================================
-- FOLDERS (Google Drive-like)
-- =============================================================
create table public.folders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  parent_id uuid references public.folders(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.folders enable row level security;

create policy "Users can CRUD own folders"
  on public.folders for all using (auth.uid() = user_id);

-- =============================================================
-- FILES
-- =============================================================
create table public.files (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  folder_id uuid references public.folders(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  file_name text not null,
  file_path text not null, -- path in Supabase Storage
  file_type text, -- image/jpeg, application/pdf, etc.
  file_size bigint,
  extracted_data jsonb, -- AI-extracted structured data
  uploaded_at timestamptz not null default now(),
  expires_at timestamptz default (now() + interval '30 days')
);

alter table public.files enable row level security;

create policy "Users can CRUD own files"
  on public.files for all using (auth.uid() = user_id);

-- =============================================================
-- DGR SESSIONS (stores DGR cookies per user)
-- =============================================================
create table public.dgr_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  cookies jsonb not null, -- {GX_CLIENT_ID, GX_SESSION_ID, JSESSIONID, ROUTEID, GxTZOffset}
  status text not null default 'active', -- active, expired
  dgr_ci text, -- CI used to login (e.g. 47086104)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.dgr_sessions enable row level security;

create policy "Users can CRUD own dgr_sessions"
  on public.dgr_sessions for all using (auth.uid() = user_id);

-- =============================================================
-- DGR CACHE
-- =============================================================
create table public.dgr_cache (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  cache_key text not null, -- e.g. "brands", "models_5", "fuels"
  data jsonb not null,
  fetched_at timestamptz not null default now(),
  unique(user_id, cache_key)
);

alter table public.dgr_cache enable row level security;

create policy "Users can CRUD own dgr_cache"
  on public.dgr_cache for all using (auth.uid() = user_id);

-- =============================================================
-- STORAGE BUCKET
-- =============================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false);

create policy "Users can upload own documents"
  on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can view own documents"
  on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own documents"
  on storage.objects for delete
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
