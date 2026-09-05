-- Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- 1. Tabla de Perfiles / Ajustes
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  settings jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS en perfiles
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using ( auth.uid() = id );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

create policy "Users can insert own profile"
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can delete own profile"
  on profiles for delete
  using ( auth.uid() = id );

-- 2. Tabla de Registros Diarios
create table public.daily_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date text not null,
  is_period boolean default false,
  flow text,
  symptoms jsonb default '[]'::jsonb not null,
  recorded_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);

-- Habilitar RLS en daily_logs
alter table public.daily_logs enable row level security;

create policy "Users can view own logs"
  on daily_logs for select
  using ( auth.uid() = user_id );

create policy "Users can insert own logs"
  on daily_logs for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own logs"
  on daily_logs for update
  using ( auth.uid() = user_id );

create policy "Users can delete own logs"
  on daily_logs for delete
  using ( auth.uid() = user_id );

-- 3. Trigger para crear perfil automáticamente al registrar usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, settings)
  values (new.id, '{}'::jsonb);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
