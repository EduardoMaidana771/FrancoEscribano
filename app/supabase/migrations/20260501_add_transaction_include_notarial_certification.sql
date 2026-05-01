alter table public.transactions
  add column if not exists include_notarial_certification boolean not null default true;