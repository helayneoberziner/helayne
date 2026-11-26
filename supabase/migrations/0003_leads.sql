-- Formulario de contato do site: tabela leads (aba "Contatos" do painel /feca).
-- Rodar uma vez no SQL Editor do projeto Supabase (depois da 0001).
-- Insercao: so pela funcao api/lead.ts, que usa a chave de servico (ela ignora o RLS).
-- Ninguem de fora le ou escreve; so admin le e marca como lido.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 255),
  brand text check (char_length(brand) <= 120),
  message text not null check (char_length(message) between 1 and 2000),
  phone text check (char_length(phone) <= 40),
  source text check (char_length(source) <= 40),
  lido boolean not null default false
);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
alter table public.leads enable row level security;

-- sem politica de insert: anon e authenticated nao conseguem inserir
drop policy if exists "admin le leads" on public.leads;
create policy "admin le leads" on public.leads
  for select to authenticated using (public.is_admin());

drop policy if exists "admin marca lead como lido" on public.leads;
create policy "admin marca lead como lido" on public.leads
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- o admin so muda o campo "lido"
revoke update on public.leads from authenticated;
grant update (lido) on public.leads to authenticated;
revoke all on public.leads from anon;
