begin;
create table public.ventas(
 id bigint generated always as identity primary key check(id<=9007199254740991),clave uuid not null unique,
 pedido_id bigint unique references public.pedidos(id),fecha timestamptz not null default now(),creado_por uuid not null,
 metodo_pago text not null check(metodo_pago in('EFECTIVO','TRANSFERENCIA','OTRO')),
 total numeric(14,2) not null check(total>=0),importe_pagado numeric(14,2) not null check(importe_pagado=total),solicitud jsonb not null
);
create index ventas_fecha_idx on public.ventas(fecha desc,id desc);
create table public.detalle_venta(
 venta_id bigint not null references public.ventas(id),variante_id bigint not null references public.variantes(id),articulo_id bigint not null references public.articulos(id),
 nombre text not null,talla_medida text not null,cantidad integer not null check(cantidad>0),precio_unitario numeric(10,2) not null check(precio_unitario>=0),
 subtotal numeric(14,2) generated always as(cantidad::numeric*precio_unitario) stored not null,primary key(venta_id,variante_id)
);
create index detalle_venta_variante_idx on public.detalle_venta(variante_id);
create index detalle_venta_articulo_idx on public.detalle_venta(articulo_id);
alter table public.ventas enable row level security;alter table public.detalle_venta enable row level security;
create policy ventas_lectura on public.ventas for select to authenticated using((select public.es_personal()));
create policy detalle_venta_lectura on public.detalle_venta for select to authenticated using((select public.es_personal()));
revoke all on public.ventas,public.detalle_venta from public,anon,authenticated,service_role;
grant select on public.ventas,public.detalle_venta to authenticated;
create function private.proteger_venta() returns trigger language plpgsql security invoker set search_path='' as $$begin raise exception 'Las ventas concretadas y sus detalles no pueden modificarse ni cancelarse.' using errcode='55000';end;$$;
revoke all on function private.proteger_venta() from public,anon,authenticated,service_role;
create trigger proteger_venta before update or delete on public.ventas for each row execute function private.proteger_venta();
create trigger proteger_detalle_venta before update or delete on public.detalle_venta for each row execute function private.proteger_venta();
create function private.validar_pedido_vendido() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.estado not in('CONFIRMADO','ENVIADO','ENTREGADO') and exists(select 1 from public.ventas where pedido_id=old.id) then raise exception 'Este pedido ya tiene una venta concretada.' using errcode='55000';end if;return new;end;$$;
revoke all on function private.validar_pedido_vendido() from public,anon,authenticated,service_role;
create trigger validar_pedido_vendido before update of estado on public.pedidos for each row execute function private.validar_pedido_vendido();
create function private.registrar_venta(p_clave uuid,p_pedido_id bigint,p_items jsonb,p_importe numeric,p_metodo text,p_confirmaciones bigint[]) returns bigint
language plpgsql security definer set search_path='' as $$
declare anterior public.ventas%rowtype;pedido public.pedidos%rowtype;solicitud jsonb;lineas jsonb;i jsonb;v public.variantes%rowtype;a public.articulos%rowtype;
 cantidad integer;precio numeric;v_total numeric:=0;venta bigint;
begin
 if not public.es_personal() then raise exception 'Acceso de personal requerido.' using errcode='42501';end if;
 if p_clave is null or p_importe is null or p_importe<0 or p_importe<>round(p_importe,2) or p_metodo not in('EFECTIVO','TRANSFERENCIA','OTRO')
 or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)>100 then raise exception 'Datos de venta inválidos.' using errcode='22023';end if;
 solicitud:=jsonb_build_object('pedidoId',p_pedido_id,'items',p_items,'importePagado',p_importe,'metodoPago',p_metodo,'confirmacionesProveedor',coalesce(p_confirmaciones,'{}'::bigint[]));
 perform pg_advisory_xact_lock(hashtextextended(p_clave::text,2804));
 select * into anterior from public.ventas where clave=p_clave;
 if found then
  if anterior.creado_por<>auth.uid() then raise exception 'Solicitud no accesible.' using errcode='42501';end if;
  if anterior.solicitud is distinct from solicitud then raise exception 'Esta solicitud ya fue registrada con otro contenido.' using errcode='55000';end if;return anterior.id;
 end if;
 if p_pedido_id is not null then
  if jsonb_array_length(p_items)<>0 then raise exception 'Los artículos del pedido se obtienen del servidor.' using errcode='22023';end if;
  select * into pedido from public.pedidos where id=p_pedido_id for update;
  if not found or pedido.estado<>'CONFIRMADO' then raise exception 'Selecciona un pedido confirmado antes de registrar su venta.' using errcode='22023';end if;
  if exists(select 1 from public.ventas where pedido_id=p_pedido_id) then raise exception 'El pedido ya tiene una venta registrada.' using errcode='55000';end if;
  select jsonb_agg(jsonb_build_object('varianteId',i2.variante_id,'cantidad',i2.cantidad,'precio',i2.precio_unitario) order by i2.variante_id) into lineas from public.items_pedido i2 where i2.pedido_id=p_pedido_id;
 else
  if jsonb_array_length(p_items)=0 then raise exception 'Agrega al menos un artículo.' using errcode='22023';end if;
  lineas:=p_items;
 end if;
 perform pg_advisory_xact_lock(2802001);
 if exists(select 1 from jsonb_array_elements(lineas) x where jsonb_typeof(x) is distinct from 'object' or jsonb_typeof(x->'varianteId') is distinct from 'number'
 or (coalesce(x->>'varianteId',''))!~'^[1-9][0-9]*$' or jsonb_typeof(x->'cantidad') is distinct from 'number' or (coalesce(x->>'cantidad',''))!~'^[1-9][0-9]*$' or (x->>'cantidad')::numeric>2147483647) then raise exception 'Detalle de venta inválido.' using errcode='22023';end if;
 if p_pedido_id is null and exists(select 1 from jsonb_array_elements(lineas) x,jsonb_object_keys(x) k where k not in('varianteId','cantidad')) then raise exception 'Envía únicamente variante y cantidad; el servidor obtiene los precios.' using errcode='22023';end if;
 if (select count(distinct (x->>'varianteId')::bigint) from jsonb_array_elements(lineas) x)<>jsonb_array_length(lineas) then raise exception 'Una variante no puede repetirse.' using errcode='22023';end if;
 perform v2.id from public.variantes v2 join jsonb_array_elements(lineas) x on v2.id=(x->>'varianteId')::bigint order by v2.id for update of v2;
 for i in select value from jsonb_array_elements(lineas) loop
  select * into v from public.variantes where id=(i->>'varianteId')::bigint and activo for update;
  if not found then raise exception 'Una variante está inactiva o no existe.' using errcode='22023';end if;
  select a2.* into a from public.articulos a2 join public.categorias c on c.id=a2.categoria_id and c.activo where a2.id=v.articulo_id and a2.activo for share of a2;
  if not found then raise exception 'Un artículo o categoría está inactivo.' using errcode='22023';end if;
  cantidad:=(i->>'cantidad')::integer;precio:=case when p_pedido_id is null then a.precio_base+v.recargo else (i->>'precio')::numeric end;
  if cantidad>v.existencia then raise exception 'No hay existencias suficientes para concretar la venta.' using errcode='22023';end if;
  if p_pedido_id is null and a.sobre_pedido and not(v.id=any(coalesce(p_confirmaciones,'{}'::bigint[]))) then raise exception 'Confirma la disponibilidad del proveedor para los artículos sobre pedido.' using errcode='22023';end if;
  v_total:=v_total+cantidad*precio;
 end loop;
 if v_total>999999999999.99 then raise exception 'El total supera el importe permitido.' using errcode='22023';end if;
 if p_importe<>v_total then raise exception 'El pago completo debe coincidir con el total vigente de % MXN. Actualiza los precios y revisa el importe.',v_total using errcode='22023';end if;
 insert into public.ventas(clave,pedido_id,creado_por,metodo_pago,total,importe_pagado,solicitud) values(p_clave,p_pedido_id,auth.uid(),p_metodo,v_total,p_importe,solicitud) returning id into venta;
 insert into public.detalle_venta(venta_id,variante_id,articulo_id,nombre,talla_medida,cantidad,precio_unitario)
 select venta,v2.id,a2.id,a2.nombre,v2.talla_medida,(x->>'cantidad')::integer,case when p_pedido_id is null then a2.precio_base+v2.recargo else (x->>'precio')::numeric end
 from jsonb_array_elements(lineas) x join public.variantes v2 on v2.id=(x->>'varianteId')::bigint join public.articulos a2 on a2.id=v2.articulo_id;
 update public.variantes v2 set existencia=v2.existencia-(x->>'cantidad')::integer from jsonb_array_elements(lineas) x where v2.id=(x->>'varianteId')::bigint;
 insert into private.auditoria(actor,operacion,entidad,entidad_id) values(auth.uid(),'REGISTRAR','VENTA',venta::text);
 return venta;
end;$$;
create function public.registrar_venta(p_clave uuid,p_pedido_id bigint,p_items jsonb,p_importe numeric,p_metodo text,p_confirmaciones bigint[] default '{}') returns bigint
language sql security invoker set search_path='' as $$select private.registrar_venta(p_clave,p_pedido_id,p_items,p_importe,p_metodo,p_confirmaciones);$$;
revoke all on function private.registrar_venta(uuid,bigint,jsonb,numeric,text,bigint[]),public.registrar_venta(uuid,bigint,jsonb,numeric,text,bigint[]) from public,anon,authenticated,service_role;
grant execute on function private.registrar_venta(uuid,bigint,jsonb,numeric,text,bigint[]),public.registrar_venta(uuid,bigint,jsonb,numeric,text,bigint[]) to authenticated;
create policy auditoria_sin_acceso on private.auditoria as restrictive for all to anon,authenticated,service_role using(false) with check(false);
notify pgrst,'reload schema';
commit;
