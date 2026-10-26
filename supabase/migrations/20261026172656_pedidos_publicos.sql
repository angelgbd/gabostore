begin;
alter table public.carritos alter column cliente_id drop not null;
alter table public.pedidos alter column cliente_id drop not null;
alter table public.pedidos add constraint pedidos_carrito_id_fkey foreign key (carrito_id) references public.carritos(id) on delete restrict;
alter table public.pedidos add column origen text not null default 'PERSONAL' check (origen in ('PERSONAL','PUBLICO'));
alter table public.pedidos add column vence_en timestamptz;
alter table public.pedidos add column clave_solicitud uuid unique;
alter table public.pedidos add column resumen_publico jsonb;
alter table public.pedidos add constraint pedidos_publicos_coherentes check (
  (origen='PERSONAL' and cliente_id is not null and clave_solicitud is null and vence_en is null and resumen_publico is null)
  or (origen='PUBLICO' and cliente_id is null and clave_solicitud is not null and vence_en is not null and vence_en=fecha_creacion+interval '120 hours' and resumen_publico is not null));
create index pedidos_publicos_vencimiento_idx on public.pedidos(vence_en) where origen='PUBLICO' and estado='PENDIENTE';

create function private.registrar_pedido_publico(p_clave uuid, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_items jsonb; v_guardados jsonb; v_pedido public.pedidos%rowtype;
  v_carrito bigint; v_id bigint; v_fecha timestamptz; v_resumen jsonb;
begin
  if coalesce(current_setting('role',true),'') <> 'service_role' then
    raise exception 'Solo el backend puede registrar pedidos públicos.' using errcode='42501';
  end if;
  if p_clave is null or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'La solicitud no es válida.' using errcode='22023';
  end if;
  if jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'Agrega entre 1 y 100 variantes.' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_array_elements(p_items) i where jsonb_typeof(i) is distinct from 'object'
    or (i - 'variante_id' - 'cantidad') <> '{}'::jsonb
    or jsonb_typeof(i->'variante_id') is distinct from 'number' or (i->>'variante_id') !~ '^[0-9]+$'
    or jsonb_typeof(i->'cantidad') is distinct from 'number' or (i->>'cantidad') !~ '^[0-9]+$') then
    raise exception 'Envía únicamente variantes y cantidades enteras.' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_array_elements(p_items) i where (i->>'variante_id')::numeric not between 1 and 9007199254740991
    or (i->>'cantidad')::numeric not between 1 and 2147483647)
    or exists(select 1 from jsonb_to_recordset(p_items) as i(variante_id bigint) group by variante_id having count(*)>1) then
    raise exception 'Las variantes y cantidades deben ser válidas y no repetirse.' using errcode='22023';
  end if;
  select jsonb_agg(jsonb_build_object('variante_id',i.variante_id,'cantidad',i.cantidad) order by i.variante_id)
    into v_items from jsonb_to_recordset(p_items) as i(variante_id bigint,cantidad integer);
  perform pg_advisory_xact_lock(hashtextextended(p_clave::text,0));
  select * into v_pedido from public.pedidos where clave_solicitud=p_clave for update;
  if found then
    select jsonb_agg(jsonb_build_object('variante_id',variante_id,'cantidad',cantidad) order by variante_id)
      into v_guardados from public.items_pedido where pedido_id=v_pedido.id;
    if v_guardados is distinct from v_items then raise exception 'Esta solicitud ya tiene otro contenido.' using errcode='55000'; end if;
    if v_pedido.estado='PENDIENTE' and v_pedido.vence_en<=clock_timestamp() then raise exception 'El pedido venció. Prepara una nueva solicitud.' using errcode='55000'; end if;
    return jsonb_build_object('id',v_pedido.id,'estado',v_pedido.estado,'fechaCreacion',v_pedido.fecha_creacion,'venceEn',v_pedido.vence_en,'items',v_pedido.resumen_publico);
  end if;
  -- Bloquear fuentes antes de comprobar disponibilidad y copiar precios.
  perform v.id from public.variantes v join public.articulos a on a.id=v.articulo_id
    join jsonb_to_recordset(v_items) as i(variante_id bigint,cantidad integer) on i.variante_id=v.id
    order by v.id for share of v,a;
  if (select count(*) from public.variantes v join jsonb_to_recordset(v_items) as i(variante_id bigint) on i.variante_id=v.id) <> jsonb_array_length(v_items) then
    raise exception 'Una variante ya no está disponible.' using errcode='P0002';
  end if;
  if exists(select 1 from public.variantes v join public.articulos a on a.id=v.articulo_id
    join jsonb_to_recordset(v_items) as i(variante_id bigint,cantidad integer) on i.variante_id=v.id
    where (not a.sobre_pedido and i.cantidad>v.existencia)
      or not exists(select 1 from public.variantes disponible where disponible.articulo_id=a.id and disponible.existencia>0)) then
    raise exception 'La disponibilidad cambió. Revisa las cantidades de tu solicitud.' using errcode='22023';
  end if;
  if (select sum(a.precio_base*i.cantidad*100) from jsonb_to_recordset(v_items) as i(variante_id bigint,cantidad integer)
      join public.variantes v on v.id=i.variante_id join public.articulos a on a.id=v.articulo_id) > 9007199254740991 then
    raise exception 'El total supera el importe permitido.' using errcode='22023';
  end if;
  insert into public.carritos(cliente_id) values(null) returning id into v_carrito;
  insert into public.items_carrito(carrito_id,variante_id,cantidad,precio_unitario)
    select v_carrito,v.id,i.cantidad,a.precio_base from jsonb_to_recordset(v_items) as i(variante_id bigint,cantidad integer)
      join public.variantes v on v.id=i.variante_id join public.articulos a on a.id=v.articulo_id;
  v_fecha:=clock_timestamp();
  select jsonb_agg(jsonb_build_object('articuloId',a.id,'varianteId',v.id,'cantidad',i.cantidad,'nombre',a.nombre,'categoria',a.categoria,
    'tallaMedida',v.talla_medida,'fotografia',a.fotografia,'precioUnitario',case when a.sobre_pedido then null else a.precio_base end,
    'existencia',v.existencia,'sobrePedido',a.sobre_pedido,'problema','') order by v.id) into v_resumen
    from jsonb_to_recordset(v_items) as i(variante_id bigint,cantidad integer) join public.variantes v on v.id=i.variante_id join public.articulos a on a.id=v.articulo_id;
  insert into public.pedidos(cliente_id,carrito_id,origen,fecha_creacion,vence_en,clave_solicitud,resumen_publico)
    values(null,v_carrito,'PUBLICO',v_fecha,v_fecha+interval '120 hours',p_clave,v_resumen) returning id into v_id;
  insert into public.items_pedido(pedido_id,variante_id,cantidad,precio_unitario)
    select v_id,variante_id,cantidad,precio_unitario from public.items_carrito where carrito_id=v_carrito;
  update public.carritos set cerrado=true where id=v_carrito;
  return jsonb_build_object('id',v_id,'estado','PENDIENTE','fechaCreacion',v_fecha,'venceEn',v_fecha+interval '120 hours','items',v_resumen);
end;
$$;
revoke all on function private.registrar_pedido_publico(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.registrar_pedido_publico(uuid,jsonb) to service_role;
create function public.registrar_pedido_publico(p_clave uuid,p_items jsonb)
returns jsonb language sql volatile security invoker set search_path=''
as $$ select private.registrar_pedido_publico(p_clave,p_items); $$;
revoke all on function public.registrar_pedido_publico(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.registrar_pedido_publico(uuid,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
