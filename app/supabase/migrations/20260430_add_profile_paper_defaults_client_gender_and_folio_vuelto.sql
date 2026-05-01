begin;

alter table public.profiles
  add column if not exists paper_series_proto text;

alter table public.profiles
  add column if not exists paper_number_proto text;

alter table public.profiles
  add column if not exists paper_series_testimony text;

alter table public.profiles
  add column if not exists paper_numbers_testimony text;

update public.profiles
set
  paper_series_proto = coalesce(paper_series_proto, ''),
  paper_number_proto = coalesce(paper_number_proto, ''),
  paper_series_testimony = coalesce(paper_series_testimony, ''),
  paper_numbers_testimony = coalesce(paper_numbers_testimony, '')
where
  paper_series_proto is null
  or paper_number_proto is null
  or paper_series_testimony is null
  or paper_numbers_testimony is null;

alter table public.profiles
  alter column paper_series_proto set default '';

alter table public.profiles
  alter column paper_number_proto set default '';

alter table public.profiles
  alter column paper_series_testimony set default '';

alter table public.profiles
  alter column paper_numbers_testimony set default '';

alter table public.profiles
  alter column paper_series_proto set not null;

alter table public.profiles
  alter column paper_number_proto set not null;

alter table public.profiles
  alter column paper_series_testimony set not null;

alter table public.profiles
  alter column paper_numbers_testimony set not null;

alter table public.clients
  add column if not exists gender text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_gender_check'
      and conrelid = 'public.clients'::regclass
  ) then
    alter table public.clients
      add constraint clients_gender_check
      check (gender in ('M', 'F'));
  end if;
end $$;

alter table public.transactions
  add column if not exists folio_end_is_vuelto boolean;

update public.transactions
set folio_end_is_vuelto = true
where folio_end_is_vuelto is null;

alter table public.transactions
  alter column folio_end_is_vuelto set default true;

alter table public.transactions
  alter column folio_end_is_vuelto set not null;

commit;