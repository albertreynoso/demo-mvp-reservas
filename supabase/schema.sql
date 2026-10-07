-- Esquema de la demo "Reservas para negocios".
-- Se aplica una vez en Supabase → SQL Editor (revísalo antes de ejecutarlo).

create extension if not exists btree_gist; -- para impedir reservas que se pisen

create table public.negocios (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  nombre text not null,
  descripcion text not null default '',
  direccion text not null default '',
  whatsapp text not null default '',
  -- Horario por día de la semana (0 = domingo): {"1": [["09:00","13:00"],["15:00","19:00"]], ...}
  horario jsonb not null default '{}'::jsonb,
  -- ponytail: offset fijo (Perú no tiene horario de verano). Para países con cambio de hora, guardar la zona IANA y calcular con ella.
  utc_offset text not null default '-05:00',
  owner_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.servicios (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  nombre text not null,
  duracion_min int not null check (duracion_min between 10 and 480),
  precio numeric(10, 2) not null check (precio >= 0),
  activo boolean not null default true,
  orden int not null default 0
);

create table public.reservas (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios (id) on delete cascade,
  servicio_id uuid not null references public.servicios (id),
  inicio timestamptz not null,
  fin timestamptz not null,
  cliente_nombre text not null check (length(cliente_nombre) between 2 and 80),
  cliente_telefono text not null check (cliente_telefono ~ '^[0-9 +()-]{6,20}$'),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmada', 'cancelada', 'atendida')),
  created_at timestamptz not null default now(),
  -- Dos reservas activas del mismo negocio no pueden pisarse en el tiempo.
  constraint reservas_sin_choque exclude using gist (
    negocio_id with =, tstzrange(inicio, fin) with &&
  ) where (estado <> 'cancelada')
);

create index reservas_por_dia on public.reservas (negocio_id, inicio);

-- Seguridad por filas: el público ve negocios y servicios; las reservas solo el dueño.
alter table public.negocios enable row level security;
alter table public.servicios enable row level security;
alter table public.reservas enable row level security;

create policy "negocios visibles" on public.negocios for select using (true);
create policy "dueño edita su negocio" on public.negocios for update using (owner_id = auth.uid());
create policy "servicios visibles" on public.servicios for select using (activo or exists (
  select 1 from public.negocios n where n.id = negocio_id and n.owner_id = auth.uid()));
create policy "dueño gestiona servicios" on public.servicios for all using (exists (
  select 1 from public.negocios n where n.id = negocio_id and n.owner_id = auth.uid()));
create policy "dueño ve sus reservas" on public.reservas for select using (exists (
  select 1 from public.negocios n where n.id = negocio_id and n.owner_id = auth.uid()));
create policy "dueño cambia el estado" on public.reservas for update using (exists (
  select 1 from public.negocios n where n.id = negocio_id and n.owner_id = auth.uid()));

-- Horarios ocupados de un rango, sin datos de los clientes (lo usa la página pública).
create function public.horarios_ocupados(p_negocio uuid, p_desde timestamptz, p_hasta timestamptz)
returns table (inicio timestamptz, fin timestamptz)
language sql stable security definer set search_path = public as $$
  select r.inicio, r.fin from public.reservas r
  where r.negocio_id = p_negocio and r.estado <> 'cancelada' and r.inicio < p_hasta and r.fin > p_desde;
$$;

-- Crea una reserva validando el servicio y la fecha. El choque de horarios lo frena la restricción reservas_sin_choque.
-- ponytail: no valida que la hora caiga dentro del horario del negocio (lo hace la página). Para producción, validarlo aquí también.
create function public.reservar(p_servicio uuid, p_inicio timestamptz, p_nombre text, p_telefono text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_servicio public.servicios;
  v_id uuid;
begin
  select * into v_servicio from public.servicios where id = p_servicio and activo;
  if not found then raise exception 'Servicio no disponible'; end if;
  if p_inicio <= now() then raise exception 'La hora ya pasó'; end if;
  insert into public.reservas (negocio_id, servicio_id, inicio, fin, cliente_nombre, cliente_telefono)
  values (v_servicio.negocio_id, p_servicio, p_inicio, p_inicio + make_interval(mins => v_servicio.duracion_min), trim(p_nombre), trim(p_telefono))
  returning id into v_id;
  return v_id;
exception when exclusion_violation then
  raise exception 'Ese horario acaba de ocuparse';
end;
$$;

grant execute on function public.horarios_ocupados(uuid, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.reservar(uuid, timestamptz, text, text) to anon, authenticated;

-- Negocio de ejemplo para la demo. Después de crear tu usuario en /panel, asígnatelo:
--   update public.negocios set owner_id = '<tu user id>' where slug = 'barberia-don-lucho';
insert into public.negocios (slug, nombre, descripcion, direccion, whatsapp, horario) values (
  'barberia-don-lucho', 'Barbería Don Lucho', 'Cortes clásicos y modernos, barba y afeitado con toalla caliente.',
  'Jr. de la Unión 456, Cercado de Lima', '51987654321',
  '{"1":[["10:00","14:00"],["15:00","20:00"]],"2":[["10:00","14:00"],["15:00","20:00"]],"3":[["10:00","14:00"],["15:00","20:00"]],"4":[["10:00","14:00"],["15:00","20:00"]],"5":[["10:00","14:00"],["15:00","21:00"]],"6":[["09:00","18:00"]]}'
);
insert into public.servicios (negocio_id, nombre, duracion_min, precio, orden)
select id, s.nombre, s.duracion, s.precio, s.orden from public.negocios,
  (values ('Corte de cabello', 30, 25, 1), ('Corte + barba', 60, 40, 2), ('Perfilado de barba', 30, 18, 3), ('Afeitado clásico con toalla caliente', 45, 30, 4))
  as s (nombre, duracion, precio, orden)
where slug = 'barberia-don-lucho';
