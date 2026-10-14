-- Modelo aprobado: Articulo, Variante, Cliente, Carrito, ItemCarrito y Pedido.
-- Ejecutar en un proyecto Supabase nuevo. Toda la migración es atómica.
begin;

-- Funciones internas fuera del esquema expuesto por la API.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create type public.estado_pedido as enum (
  'PENDIENTE', 'ENVIADO', 'ENTREGADO', 'CANCELADO', 'CONFIRMADO'
);

create table public.articulos (
  id bigint generated always as identity primary key check (id <= 9007199254740991),
  nombre text not null check (btrim(nombre) <> ''),
  categoria text not null check (btrim(categoria) <> ''),
  precio_base numeric(10,2) not null check (precio_base >= 0),
  fotografia text not null default '',
  sobre_pedido boolean not null default false
);

create table public.variantes (
  id bigint generated always as identity primary key check (id <= 9007199254740991),
  articulo_id bigint not null references public.articulos(id) on delete restrict,
  talla_medida text not null check (btrim(talla_medida) <> ''),
  existencia integer not null default 0 check (existencia >= 0),
  unique (articulo_id, talla_medida)
);

create table public.clientes (
  id bigint generated always as identity primary key check (id <= 9007199254740991),
  nombre text not null check (btrim(nombre) <> ''),
  telefono text not null check (btrim(telefono) <> '')
);

create table public.carritos (
  id bigint generated always as identity primary key check (id <= 9007199254740991),
  cliente_id bigint not null references public.clientes(id) on delete restrict,
  correo_cliente text not null check (correo_cliente ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  cerrado boolean not null default false,
  unique (id, cliente_id)
);

-- Un carrito abierto por cliente; los anteriores permanecen como historial.
create unique index carritos_un_abierto_por_cliente on public.carritos(cliente_id) where not cerrado;
create index carritos_cliente_idx on public.carritos(cliente_id);

create table public.items_carrito (
  carrito_id bigint not null references public.carritos(id) on delete cascade,
  variante_id bigint not null references public.variantes(id) on delete restrict,
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0),
  subtotal numeric(14,2) generated always as (cantidad::numeric * precio_unitario) stored,
  primary key (carrito_id, variante_id)
);
create index items_carrito_variante_idx on public.items_carrito(variante_id);

create table public.pedidos (
  id bigint generated always as identity primary key check (id <= 9007199254740991),
  cliente_id bigint not null,
  carrito_id bigint not null unique,
  correo_cliente text not null check (correo_cliente ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  estado public.estado_pedido not null default 'PENDIENTE',
  fecha_creacion timestamptz not null default now(),
  foreign key (carrito_id, cliente_id) references public.carritos(id, cliente_id) on delete restrict
);
create index pedidos_cliente_idx on public.pedidos(cliente_id, fecha_creacion desc);
create index pedidos_fecha_idx on public.pedidos(fecha_creacion desc, id desc);

-- Copia independiente: los cambios futuros del catálogo no alteran el pedido.
create table public.items_pedido (
  pedido_id bigint not null references public.pedidos(id) on delete restrict,
  variante_id bigint not null references public.variantes(id) on delete restrict,
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0),
  subtotal numeric(14,2) generated always as (cantidad::numeric * precio_unitario) stored,
  primary key (pedido_id, variante_id)
);
create index items_pedido_variante_idx on public.items_pedido(variante_id);

-- Autorización basada en app_metadata, que el usuario no puede editar.
create function public.es_personal()
returns boolean language sql stable security invoker set search_path = ''
as $$
  select auth.uid() is not null
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'rol', '') in ('ADMIN', 'EMPLEADO');
$$;
revoke all on function public.es_personal() from public, anon, authenticated;
grant execute on function public.es_personal() to authenticated;

-- Los carritos cerrados y sus líneas no pueden modificarse ni eliminarse.
create function public.proteger_carrito()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if tg_table_name = 'carritos' then
    if old.cerrado then
      raise exception 'El carrito está cerrado y forma parte del historial.' using errcode = '55000';
    end if;
    if tg_op = 'DELETE' then return old; end if;
    if new.cliente_id <> old.cliente_id then
      raise exception 'El cliente del carrito no se puede cambiar.' using errcode = '55000';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and new.carrito_id <> old.carrito_id then
    raise exception 'No se puede mover una línea a otro carrito.' using errcode = '55000';
  end if;
  -- Todas las escrituras de líneas se serializan sobre su carrito.
  perform 1 from public.carritos
    where id = case when tg_op = 'DELETE' then old.carrito_id else new.carrito_id end
      and not cerrado for update;
  if not found then
    raise exception 'El carrito no existe, no es accesible o está cerrado.' using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.proteger_carrito() from public, anon, authenticated;
create trigger proteger_carrito before update or delete on public.carritos
  for each row execute function public.proteger_carrito();
create trigger proteger_items_carrito before insert or update or delete on public.items_carrito
  for each row execute function public.proteger_carrito();

-- El pedido solo admite cambios de estado; sus líneas son inmutables.
create function public.proteger_pedido()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if tg_table_name = 'items_pedido' or tg_op = 'DELETE' then
    raise exception 'El contenido y el historial del pedido no se pueden modificar.' using errcode = '55000';
  end if;
  if (to_jsonb(new) - 'estado') is distinct from (to_jsonb(old) - 'estado') then
    raise exception 'Solo se permite actualizar el estado del pedido.' using errcode = '55000';
  end if;
  return new;
end;
$$;
revoke all on function public.proteger_pedido() from public, anon, authenticated;
create trigger proteger_pedido before update or delete on public.pedidos
  for each row execute function public.proteger_pedido();
create trigger proteger_items_pedido before update or delete on public.items_pedido
  for each row execute function public.proteger_pedido();

-- Acceso interno. Sin rol de personal, authenticated no obtiene filas privadas.
alter table public.articulos enable row level security;
alter table public.variantes enable row level security;
alter table public.clientes enable row level security;
alter table public.carritos enable row level security;
alter table public.items_carrito enable row level security;
alter table public.pedidos enable row level security;
alter table public.items_pedido enable row level security;

create policy personal_articulos on public.articulos for all to authenticated
  using ((select public.es_personal())) with check ((select public.es_personal()));
create policy personal_variantes on public.variantes for all to authenticated
  using ((select public.es_personal())) with check ((select public.es_personal()));
create policy personal_clientes on public.clientes for all to authenticated
  using ((select public.es_personal())) with check ((select public.es_personal()));
create policy personal_carritos on public.carritos for all to authenticated
  using ((select public.es_personal())) with check ((select public.es_personal()));
create policy personal_items_carrito on public.items_carrito for all to authenticated
  using ((select public.es_personal())) with check ((select public.es_personal()));
create policy personal_pedidos on public.pedidos for all to authenticated
  using ((select public.es_personal())) with check ((select public.es_personal()));
create policy personal_items_pedido on public.items_pedido for all to authenticated
  using ((select public.es_personal())) with check ((select public.es_personal()));

revoke all on public.articulos, public.variantes, public.clientes, public.carritos,
  public.items_carrito, public.pedidos, public.items_pedido from public, anon, authenticated;
grant select, insert, update on public.articulos, public.variantes, public.clientes, public.carritos to authenticated;
grant select, insert, update, delete on public.items_carrito to authenticated;
grant select on public.pedidos, public.items_pedido to authenticated;
grant update (estado) on public.pedidos to authenticated;
grant usage, select on sequence public.articulos_id_seq, public.variantes_id_seq,
  public.clientes_id_seq, public.carritos_id_seq, public.pedidos_id_seq to authenticated;

-- Única entrada pública: proyección del catálogo sin datos de clientes.
-- Mantiene variantes agotadas si el artículo tiene alguna con existencia.
create function private.obtener_catalogo(
  p_articulo_id bigint default null, p_limite integer default 100, p_desde integer default 0
)
returns table (
  articulo_id bigint, nombre text, categoria text, precio_base numeric,
  fotografia text, sobre_pedido boolean, variantes jsonb
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_limite is null or p_desde is null or p_limite < 1 or p_limite > 100 or p_desde < 0 then
    raise exception 'La página requiere un límite de 1 a 100 y un desplazamiento no negativo.' using errcode = '22023';
  end if;
  return query
    select a.id, a.nombre, a.categoria, a.precio_base, a.fotografia, a.sobre_pedido,
      (select jsonb_agg(jsonb_build_object('id', v.id, 'talla_medida', v.talla_medida,
                                         'existencia', v.existencia) order by v.id)
       from public.variantes v where v.articulo_id = a.id)
    from public.articulos a
    where (p_articulo_id is null or a.id = p_articulo_id)
      and exists (select 1 from public.variantes disponible
                  where disponible.articulo_id = a.id and disponible.existencia > 0)
    order by a.nombre, a.id limit p_limite offset p_desde;
end;
$$;
revoke all on function private.obtener_catalogo(bigint,integer,integer) from public, anon, authenticated;
grant execute on function private.obtener_catalogo(bigint,integer,integer) to anon, authenticated;

-- La entrada pública solo delega en una proyección de lectura del catálogo.
create function public.obtener_catalogo(
  p_articulo_id bigint default null, p_limite integer default 100, p_desde integer default 0
)
returns table (
  articulo_id bigint, nombre text, categoria text, precio_base numeric,
  fotografia text, sobre_pedido boolean, variantes jsonb
)
language sql stable security invoker set search_path = ''
as $$
  select * from private.obtener_catalogo(p_articulo_id, p_limite, p_desde);
$$;
revoke all on function public.obtener_catalogo(bigint,integer,integer) from public, anon, authenticated;
grant execute on function public.obtener_catalogo(bigint,integer,integer) to anon, authenticated;

-- Ajuste atómico: evita perder movimientos por leer/sumar/escribir en el cliente.
create function public.ajustar_existencia(p_variante_id bigint, p_cambio integer)
returns setof public.variantes language plpgsql security invoker set search_path = ''
as $$
begin
  return query update public.variantes set existencia = existencia + p_cambio
    where id = p_variante_id returning *;
  if not found then
    raise exception 'La variante no existe o no es accesible.' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.ajustar_existencia(bigint,integer) from public, anon, authenticated;
grant execute on function public.ajustar_existencia(bigint,integer) to authenticated;

-- Inserción compuesta para evitar artículos creados a medias.
create function public.crear_articulo(
  p_nombre text, p_categoria text, p_precio_base numeric,
  p_fotografia text default '', p_sobre_pedido boolean default false,
  p_variantes jsonb default '[]'::jsonb
)
returns bigint language plpgsql security invoker set search_path = ''
as $$
declare v_id bigint;
begin
  if jsonb_typeof(p_variantes) is distinct from 'array' then
    raise exception 'variantes debe ser una lista.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_variantes) v
             where jsonb_typeof(v) <> 'object'
                or jsonb_typeof(v -> 'existencia') is distinct from 'number'
                or (v ->> 'existencia') !~ '^[0-9]+$'
                or jsonb_typeof(v -> 'talla_medida') is distinct from 'string') then
    raise exception 'Cada variante requiere talla_medida y existencia entera no negativa.' using errcode = '22023';
  end if;
  if p_precio_base <> round(p_precio_base, 2) then
    raise exception 'El precio admite hasta dos decimales.' using errcode = '22023';
  end if;
  insert into public.articulos(nombre, categoria, precio_base, fotografia, sobre_pedido)
    values (btrim(p_nombre), btrim(p_categoria), p_precio_base, p_fotografia, p_sobre_pedido)
    returning id into v_id;
  insert into public.variantes(articulo_id, talla_medida, existencia)
    select v_id, btrim(v.talla_medida), v.existencia
    from jsonb_to_recordset(p_variantes) as v(talla_medida text, existencia integer);
  return v_id;
end;
$$;
revoke all on function public.crear_articulo(text,text,numeric,text,boolean,jsonb) from public, anon, authenticated;
grant execute on function public.crear_articulo(text,text,numeric,text,boolean,jsonb) to authenticated;

-- Crea o recupera el único carrito abierto. El siguiente pedido usa otro carrito.
create function public.abrir_carrito(p_cliente_id bigint, p_correo_cliente text)
returns bigint language plpgsql security invoker set search_path = ''
as $$
declare v_id bigint;
begin
  perform 1 from public.clientes where id = p_cliente_id for update;
  if not found then
    raise exception 'El cliente no existe o no es accesible.' using errcode = 'P0002';
  end if;
  select id into v_id from public.carritos where cliente_id = p_cliente_id and not cerrado for update;
  if found then return v_id; end if;
  insert into public.carritos(cliente_id, correo_cliente)
    values (p_cliente_id, lower(btrim(p_correo_cliente))) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.abrir_carrito(bigint,text) from public, anon, authenticated;
grant execute on function public.abrir_carrito(bigint,text) to authenticated;

-- Guardar una línea no reserva ni descuenta existencias.
create function public.guardar_item_carrito(
  p_carrito_id bigint, p_variante_id bigint, p_cantidad integer,
  p_precio_unitario numeric default null
)
returns void language plpgsql security invoker set search_path = ''
as $$
declare v_precio numeric;
begin
  perform 1 from public.carritos where id = p_carrito_id and not cerrado for update;
  if not found then
    raise exception 'El carrito no existe, no es accesible o está cerrado.' using errcode = '55000';
  end if;
  select a.precio_base into v_precio from public.variantes v
    join public.articulos a on a.id = v.articulo_id where v.id = p_variante_id;
  if not found then
    raise exception 'La variante no existe o no es accesible.' using errcode = 'P0002';
  end if;
  v_precio := coalesce(p_precio_unitario,
    (select precio_unitario from public.items_carrito where carrito_id = p_carrito_id and variante_id = p_variante_id),
    v_precio);
  if v_precio <> round(v_precio, 2) then
    raise exception 'El precio admite hasta dos decimales.' using errcode = '22023';
  end if;
  insert into public.items_carrito(carrito_id, variante_id, cantidad, precio_unitario)
    values (p_carrito_id, p_variante_id, p_cantidad, v_precio)
    on conflict (carrito_id, variante_id) do update
      set cantidad = excluded.cantidad, precio_unitario = excluded.precio_unitario;
end;
$$;
revoke all on function public.guardar_item_carrito(bigint,bigint,integer,numeric) from public, anon, authenticated;
grant execute on function public.guardar_item_carrito(bigint,bigint,integer,numeric) to authenticated;

-- Cierre, pedido y copia de líneas en una misma transacción.
-- Repetir la llamada con el mismo carrito devuelve el mismo pedido.
create function private.crear_pedido_desde_carrito(p_carrito_id bigint)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare v_carrito public.carritos%rowtype; v_id bigint;
begin
  -- Esta función escribe las tablas que no admiten INSERT directo.
  if auth.uid() is null or not public.es_personal() then
    raise exception 'Solo el personal puede generar pedidos.' using errcode = '42501';
  end if;
  select * into v_carrito from public.carritos where id = p_carrito_id for update;
  if not found then
    raise exception 'El carrito no existe o no es accesible.' using errcode = 'P0002';
  end if;
  select id into v_id from public.pedidos where carrito_id = p_carrito_id;
  if found then return v_id; end if;
  if v_carrito.cerrado then
    raise exception 'El carrito ya está cerrado.' using errcode = '55000';
  end if;
  if not exists (select 1 from public.items_carrito where carrito_id = p_carrito_id) then
    raise exception 'No se puede crear un pedido sin artículos.' using errcode = '22023';
  end if;
  insert into public.pedidos(cliente_id, carrito_id, correo_cliente)
    values (v_carrito.cliente_id, v_carrito.id, v_carrito.correo_cliente) returning id into v_id;
  insert into public.items_pedido(pedido_id, variante_id, cantidad, precio_unitario)
    select v_id, variante_id, cantidad, precio_unitario
    from public.items_carrito where carrito_id = p_carrito_id;
  update public.carritos set cerrado = true where id = p_carrito_id;
  return v_id;
end;
$$;
revoke all on function private.crear_pedido_desde_carrito(bigint) from public, anon, authenticated;
grant execute on function private.crear_pedido_desde_carrito(bigint) to authenticated;

create function public.crear_pedido_desde_carrito(p_carrito_id bigint)
returns bigint language sql volatile security invoker set search_path = ''
as $$
  select private.crear_pedido_desde_carrito(p_carrito_id);
$$;
revoke all on function public.crear_pedido_desde_carrito(bigint) from public, anon, authenticated;
grant execute on function public.crear_pedido_desde_carrito(bigint) to authenticated;

commit;
