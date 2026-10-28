begin;
alter table public.articulos add column activo boolean not null default true;
alter table public.articulos alter column categoria_id set not null;
alter table public.variantes add column activo boolean not null default true;
alter table public.variantes add column recargo numeric(10,2) not null default 0 check(recargo>=0);
create unique index variantes_talla_normalizada on public.variantes(articulo_id,lower(btrim(talla_medida)));
create table public.historial_precios(
 id bigint generated always as identity primary key,articulo_id bigint not null references public.articulos(id),
 variante_id bigint references public.variantes(id),importe numeric(10,2) not null,tipo text not null check(tipo in('BASE','RECARGO')),
 fecha timestamptz not null default now(),creado_por uuid default auth.uid()
);
create index historial_precios_articulo_idx on public.historial_precios(articulo_id,fecha desc);
create index historial_precios_variante_idx on public.historial_precios(variante_id);
insert into public.historial_precios(articulo_id,importe,tipo) select id,precio_base,'BASE' from public.articulos;
create function private.historial_precio() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='articulos' then
  if tg_op='INSERT' or new.precio_base is distinct from old.precio_base then insert into public.historial_precios(articulo_id,importe,tipo) values(new.id,new.precio_base,'BASE');end if;
 else
  if tg_op='INSERT' or new.recargo is distinct from old.recargo then insert into public.historial_precios(articulo_id,variante_id,importe,tipo) values(new.articulo_id,new.id,new.recargo,'RECARGO');end if;
 end if;return new;
end;$$;
revoke all on function private.historial_precio() from public,anon,authenticated,service_role;
create trigger historial_precio_base after insert or update on public.articulos for each row execute function private.historial_precio();
create trigger historial_recargo after insert or update on public.variantes for each row execute function private.historial_precio();
create trigger auditar_articulo after insert or update on public.articulos for each row execute function private.auditar_ficha();
create trigger auditar_variante after insert or update on public.variantes for each row execute function private.auditar_ficha();
alter table public.historial_precios enable row level security;
create policy historial_precio_personal on public.historial_precios for select to authenticated using((select public.es_personal()));
revoke all on public.historial_precios from public,anon,authenticated,service_role;
grant select on public.historial_precios to authenticated;
create function private.gestionar_variante(p_articulo_id bigint,p_id bigint,p_talla text,p_recargo numeric,p_activo boolean) returns bigint
language plpgsql security definer set search_path='' as $$
declare a public.articulos%rowtype;v_id bigint;
begin
 if not public.es_personal() then raise exception 'Acceso de personal requerido.' using errcode='42501';end if;
 select * into a from public.articulos where id=p_articulo_id for update;
 if not found then raise exception 'Artículo no encontrado.' using errcode='P0002';end if;
 if p_talla is null or length(btrim(p_talla)) not between 1 and 80 or p_recargo is null or p_recargo<0 or p_recargo<>round(p_recargo,2) or a.precio_base+p_recargo>99999999.99 or p_activo is null then raise exception 'Talla, recargo o estado inválidos.' using errcode='22023';end if;
 if p_id is null then insert into public.variantes(articulo_id,talla_medida,recargo,activo,existencia) values(p_articulo_id,btrim(p_talla),p_recargo,p_activo,0) returning id into v_id;
 else update public.variantes set talla_medida=btrim(p_talla),recargo=p_recargo,activo=p_activo where id=p_id and articulo_id=p_articulo_id returning id into v_id;
 end if;
 if v_id is null then raise exception 'La variante no pertenece al artículo.' using errcode='P0002';end if;return v_id;
end;$$;
create function public.gestionar_variante(p_articulo_id bigint,p_id bigint,p_talla text,p_recargo numeric,p_activo boolean) returns bigint
language sql security invoker set search_path='' as $$select private.gestionar_variante(p_articulo_id,p_id,p_talla,p_recargo,p_activo);$$;
revoke all on function private.gestionar_variante(bigint,bigint,text,numeric,boolean),public.gestionar_variante(bigint,bigint,text,numeric,boolean) from public,anon,authenticated,service_role;
grant execute on function private.gestionar_variante(bigint,bigint,text,numeric,boolean),public.gestionar_variante(bigint,bigint,text,numeric,boolean) to authenticated;
create or replace function private.obtener_catalogo(p_articulo_id bigint default null,p_limite integer default 100,p_desde integer default 0)
returns table(articulo_id bigint,nombre text,categoria text,precio_base numeric,fotografia text,sobre_pedido boolean,variantes jsonb)
language plpgsql stable security definer set search_path='' as $$begin
 if p_limite is null or p_desde is null or p_limite<1 or p_limite>100 or p_desde<0 then raise exception 'Página inválida.' using errcode='22023';end if;
 return query select a.id,a.nombre,a.categoria,case when a.sobre_pedido then null else a.precio_base end,a.fotografia,a.sobre_pedido,
 (select jsonb_agg(jsonb_build_object('id',v.id,'talla_medida',v.talla_medida,'existencia',v.existencia,'recargo',case when a.sobre_pedido then null else v.recargo end) order by v.id) from public.variantes v where v.articulo_id=a.id and v.activo)
 from public.articulos a join public.categorias c on c.id=a.categoria_id and c.activo
 where a.activo and (p_articulo_id is null or a.id=p_articulo_id) and exists(select 1 from public.variantes v where v.articulo_id=a.id and v.activo and v.existencia>0)
 order by a.nombre,a.id limit p_limite offset p_desde;
end;$$;
create function private.validar_linea_activa() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.variantes v join public.articulos a on a.id=v.articulo_id join public.categorias c on c.id=a.categoria_id where v.id=new.variante_id and (not v.activo or not a.activo or not c.activo)) then raise exception 'El artículo, variante o categoría está inactivo.' using errcode='22023';end if;
 return new;
end;$$;
revoke all on function private.validar_linea_activa() from public,anon,authenticated,service_role;
create trigger validar_item_activo before insert or update on public.items_carrito for each row execute function private.validar_linea_activa();
create trigger validar_pedido_activo before insert on public.items_pedido for each row execute function private.validar_linea_activa();
create or replace function private.registrar_pedido_publico(p_clave uuid, p_items jsonb)
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
    where (not a.activo or not v.activo or not exists(select 1 from public.categorias c where c.id=a.categoria_id and c.activo) or (not a.sobre_pedido and i.cantidad>v.existencia))
      or not exists(select 1 from public.variantes disponible where disponible.articulo_id=a.id and disponible.activo and disponible.existencia>0)) then
    raise exception 'La disponibilidad cambió. Revisa las cantidades de tu solicitud.' using errcode='22023';
  end if;
  if (select sum((a.precio_base+v.recargo)*i.cantidad*100) from jsonb_to_recordset(v_items) as i(variante_id bigint,cantidad integer)
      join public.variantes v on v.id=i.variante_id join public.articulos a on a.id=v.articulo_id) > 9007199254740991 then
    raise exception 'El total supera el importe permitido.' using errcode='22023';
  end if;
  insert into public.carritos(cliente_id) values(null) returning id into v_carrito;
  insert into public.items_carrito(carrito_id,variante_id,cantidad,precio_unitario)
    select v_carrito,v.id,i.cantidad,(a.precio_base+v.recargo) from jsonb_to_recordset(v_items) as i(variante_id bigint,cantidad integer)
      join public.variantes v on v.id=i.variante_id join public.articulos a on a.id=v.articulo_id;
  v_fecha:=clock_timestamp();
  select jsonb_agg(jsonb_build_object('articuloId',a.id,'varianteId',v.id,'cantidad',i.cantidad,'nombre',a.nombre,'categoria',a.categoria,
    'tallaMedida',v.talla_medida,'fotografia',a.fotografia,'precioUnitario',case when a.sobre_pedido then null else (a.precio_base+v.recargo) end,
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

create or replace function private.confirmar_pedido(p_id bigint,p_confirmaciones bigint[] default '{}')
returns bigint language plpgsql security definer set search_path=''
as $$
declare v_pedido public.pedidos%rowtype;
begin
  if not public.es_personal() then raise exception 'Solo el personal puede confirmar pedidos.' using errcode='42501'; end if;
  select * into v_pedido from public.pedidos where id=p_id for update;
  if not found then raise exception 'El pedido no existe; pudo haber vencido.' using errcode='P0002'; end if;
  if v_pedido.estado='CONFIRMADO' then return p_id; end if;
  if v_pedido.estado<>'PENDIENTE' then raise exception 'Solo puedes confirmar pedidos pendientes.' using errcode='55000'; end if;
  if v_pedido.origen='PUBLICO' and v_pedido.vence_en<=clock_timestamp() then raise exception 'El pedido venció y ya no puede confirmarse.' using errcode='55000'; end if;
  perform v.id from public.items_pedido i join public.variantes v on v.id=i.variante_id join public.articulos a on a.id=v.articulo_id
    where i.pedido_id=p_id order by v.id for share of v,a;
  if exists(select 1 from public.items_pedido i join public.variantes v on v.id=i.variante_id join public.articulos a on a.id=v.articulo_id join public.categorias c on c.id=a.categoria_id
    where i.pedido_id=p_id and (not a.activo or not v.activo or not c.activo or (not a.sobre_pedido and i.cantidad>v.existencia))) then
    raise exception 'La disponibilidad cambió. Ajusta las existencias antes de confirmar.' using errcode='22023';
  end if;
  if exists(select 1 from public.items_pedido i join public.variantes v on v.id=i.variante_id join public.articulos a on a.id=v.articulo_id
    where i.pedido_id=p_id and a.sobre_pedido and not (i.variante_id=any(coalesce(p_confirmaciones,'{}'::bigint[])))) then
    raise exception 'Confirma con el proveedor las variantes sobre pedido.' using errcode='22023';
  end if;
  update public.pedidos set estado='CONFIRMADO' where id=p_id;
  return p_id;
end;
$$;

create function private.validar_precio_total() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if exists(select 1 from public.variantes where articulo_id=new.id and new.precio_base+recargo>99999999.99) then raise exception 'El precio base más el recargo supera el importe permitido.' using errcode='22023';end if;return new;
end;$$;
revoke all on function private.validar_precio_total() from public,anon,authenticated,service_role;
create trigger validar_precio_total before update of precio_base on public.articulos for each row execute function private.validar_precio_total();
revoke insert,update on public.variantes from authenticated;
grant insert(articulo_id,talla_medida,existencia),update(existencia) on public.variantes to authenticated;
notify pgrst,'reload schema';
commit;
