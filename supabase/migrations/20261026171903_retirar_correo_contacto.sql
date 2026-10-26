begin;
-- Las columnas se conservan exclusivamente para el historial anterior.
alter table public.carritos alter column correo_cliente drop not null;
alter table public.pedidos alter column correo_cliente drop not null;
create or replace function private.guardar_pedido(
  p_cliente_id bigint, p_carrito_id bigint, p_correo_cliente text, p_items jsonb,
  p_estado public.estado_pedido default 'PENDIENTE'
)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare
  v_carrito public.carritos%rowtype;
  v_pedido public.pedidos%rowtype;
  v_items jsonb;
  v_guardados jsonb;
  v_id bigint;
  v_correo text := lower(btrim(p_correo_cliente));
begin
  -- El rol SQL lo establece PostgREST después de autenticar la petición.
  if not (coalesce(current_setting('role', true), '') = 'service_role' or public.es_personal()) then
    raise exception 'Solo el personal o el backend autorizado pueden guardar pedidos.' using errcode = '42501';
  end if;
  if p_cliente_id is null or p_cliente_id <= 0 or p_cliente_id > 9007199254740991
     or p_carrito_id is null or p_carrito_id <= 0 or p_carrito_id > 9007199254740991
     or p_estado is null
     or (v_correo is not null and v_correo !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception 'El cliente, carrito y estado deben ser válidos.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'items debe ser una lista.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido debe contener al menos un artículo.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) i
    where jsonb_typeof(i) is distinct from 'object'
       or jsonb_typeof(i -> 'variante_id') is distinct from 'number'
       or (i ->> 'variante_id') !~ '^[0-9]+$'
       or jsonb_typeof(i -> 'cantidad') is distinct from 'number'
       or (i ->> 'cantidad') !~ '^[0-9]+$'
       or jsonb_typeof(i -> 'precio_unitario') is distinct from 'number') then
    raise exception 'Cada línea requiere variante, cantidad entera y precio numérico.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) i
    where (i ->> 'variante_id')::numeric not between 1 and 9007199254740991
       or (i ->> 'cantidad')::numeric not between 1 and 2147483647
       or (i ->> 'precio_unitario')::numeric not between 0 and 99999999.99
       or (i ->> 'precio_unitario')::numeric <> round((i ->> 'precio_unitario')::numeric, 2)) then
    raise exception 'Variante, cantidad o precio fuera del rango permitido.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_items) as i(variante_id bigint)
    group by i.variante_id having count(*) > 1) then
    raise exception 'Una variante no puede aparecer dos veces en el pedido.' using errcode = '22023';
  end if;

  select * into v_carrito from public.carritos where id = p_carrito_id for update;
  if not found then
    raise exception 'El carrito no existe.' using errcode = 'P0002';
  end if;
  if v_carrito.cliente_id is distinct from p_cliente_id then
    raise exception 'El carrito no pertenece al cliente indicado.' using errcode = '22023';
  end if;
  select jsonb_agg(jsonb_build_object('variante_id', i.variante_id,
    'cantidad', i.cantidad, 'precio_unitario', i.precio_unitario) order by i.variante_id)
    into v_items from jsonb_to_recordset(p_items)
      as i(variante_id bigint, cantidad integer, precio_unitario numeric);

  -- Un reintento idéntico devuelve el pedido existente. Nunca modifica el historial.
  select * into v_pedido from public.pedidos where carrito_id = p_carrito_id;
  if found then
    select jsonb_agg(jsonb_build_object('variante_id', i.variante_id,
      'cantidad', i.cantidad, 'precio_unitario', i.precio_unitario) order by i.variante_id)
      into v_guardados from public.items_pedido i where i.pedido_id = v_pedido.id;
    if (v_correo is not null and v_pedido.correo_cliente is distinct from v_correo) or v_guardados is distinct from v_items then
      raise exception 'El carrito ya tiene un pedido con otro contenido.' using errcode = '55000';
    end if;
    return v_pedido.id;
  end if;
  if v_carrito.cerrado then
    raise exception 'El carrito ya está cerrado.' using errcode = '55000';
  end if;

  -- Se sincroniza el carrito con el objeto recibido y se conserva una copia histórica.
  -- Una FK, restricción o trigger fallido revierte también estos cambios del carrito.
  delete from public.items_carrito where carrito_id = p_carrito_id;
  insert into public.items_carrito(carrito_id, variante_id, cantidad, precio_unitario)
    select p_carrito_id, i.variante_id, i.cantidad, i.precio_unitario
      from jsonb_to_recordset(v_items) as i(variante_id bigint, cantidad integer, precio_unitario numeric);
  if v_correo is not null then update public.carritos set correo_cliente = v_correo where id = p_carrito_id; end if;
  insert into public.pedidos(cliente_id, carrito_id, correo_cliente, estado)
    values (p_cliente_id, p_carrito_id, v_correo, p_estado) returning id into v_id;
  insert into public.items_pedido(pedido_id, variante_id, cantidad, precio_unitario)
    select v_id, i.variante_id, i.cantidad, i.precio_unitario
      from jsonb_to_recordset(v_items) as i(variante_id bigint, cantidad integer, precio_unitario numeric);
  update public.carritos set cerrado = true where id = p_carrito_id;
  return v_id;
end;
$$;
create function public.abrir_carrito(p_cliente_id bigint)
returns bigint language sql volatile security invoker set search_path = ''
as $$ select public.abrir_carrito(p_cliente_id, null); $$;
revoke all on function public.abrir_carrito(bigint) from public, anon, authenticated;
grant execute on function public.abrir_carrito(bigint) to authenticated, service_role;
create function public.guardar_pedido(p_cliente_id bigint, p_carrito_id bigint, p_items jsonb,
  p_estado public.estado_pedido default 'PENDIENTE')
returns bigint language sql volatile security invoker set search_path = ''
as $$ select private.guardar_pedido(p_cliente_id, p_carrito_id, null, p_items, p_estado); $$;
revoke all on function public.guardar_pedido(bigint,bigint,jsonb,public.estado_pedido) from public, anon, authenticated;
grant execute on function public.guardar_pedido(bigint,bigint,jsonb,public.estado_pedido) to authenticated, service_role;
notify pgrst, 'reload schema';
commit;
