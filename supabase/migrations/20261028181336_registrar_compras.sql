begin;
create table public.compras(
 id bigint generated always as identity primary key check(id<=9007199254740991),
 clave uuid not null unique,proveedor_id bigint not null references public.proveedores(id),proveedor_nombre text not null,
 fecha_recepcion date not null,fecha_registro timestamptz not null default now(),referencia text not null default '',
 total numeric(14,2) not null check(total>=0),creado_por uuid not null,solicitud jsonb not null
);
create index compras_proveedor_idx on public.compras(proveedor_id);
create index compras_fecha_idx on public.compras(fecha_registro desc,id desc);
create table public.detalle_compra(
 compra_id bigint not null references public.compras(id),variante_id bigint not null references public.variantes(id),
 articulo_id bigint not null references public.articulos(id),nombre text not null,talla_medida text not null,
 cantidad integer not null check(cantidad>0),costo_unitario numeric(10,2) not null check(costo_unitario>=0),
 subtotal numeric(14,2) generated always as(cantidad::numeric*costo_unitario) stored not null,
 primary key(compra_id,variante_id)
);
create index detalle_compra_variante_idx on public.detalle_compra(variante_id);
create index detalle_compra_articulo_idx on public.detalle_compra(articulo_id);
alter table public.compras enable row level security;alter table public.detalle_compra enable row level security;
create policy compras_lectura on public.compras for select to authenticated using((select public.es_personal()));
create policy detalle_compra_lectura on public.detalle_compra for select to authenticated using((select public.es_personal()));
revoke all on public.compras,public.detalle_compra from public,anon,authenticated,service_role;
grant select on public.compras,public.detalle_compra to authenticated;
create function private.registrar_compra(p_clave uuid,p_proveedor_id bigint,p_fecha date,p_referencia text,p_items jsonb) returns bigint
language plpgsql security definer set search_path='' as $$
declare anterior public.compras%rowtype;proveedor public.proveedores%rowtype;i jsonb;n jsonb;v public.variantes%rowtype;a public.articulos%rowtype;c public.categorias%rowtype;
 cantidad integer;costo numeric;v_total numeric:=0;compra bigint;solicitud jsonb;
begin
 if not public.es_personal() then raise exception 'Acceso de personal requerido.' using errcode='42501';end if;
 if p_clave is null or p_proveedor_id is null or p_fecha is null or p_fecha>(clock_timestamp() at time zone 'America/Hermosillo')::date or p_referencia is null or length(p_referencia)>200
 or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Revisa los datos de la compra.' using errcode='22023';end if;
 solicitud:=jsonb_build_object('proveedorId',p_proveedor_id,'fechaRecepcion',p_fecha,'referencia',btrim(p_referencia),'items',p_items);
 perform pg_advisory_xact_lock(hashtextextended(p_clave::text,2803));
 select * into anterior from public.compras where clave=p_clave;
 if found then
  if anterior.creado_por<>auth.uid() then raise exception 'Solicitud no accesible.' using errcode='42501';end if;
  if anterior.solicitud is distinct from solicitud then raise exception 'Esta solicitud ya fue registrada con otro contenido.' using errcode='55000';end if;return anterior.id;
 end if;
 select * into proveedor from public.proveedores where id=p_proveedor_id and activo for share;
 if not found then raise exception 'Selecciona un proveedor activo.' using errcode='22023';end if;
 -- Orden común en compras/ventas para evitar pérdidas de inventario y sobreventas concurrentes.
 perform pg_advisory_xact_lock(2802001);
 perform v2.id from public.variantes v2 join jsonb_array_elements(p_items) x on (x->>'varianteId')~'^[1-9][0-9]*$' and v2.id=(x->>'varianteId')::bigint order by v2.id for update of v2;
 insert into public.compras(clave,proveedor_id,proveedor_nombre,fecha_recepcion,referencia,total,creado_por,solicitud)
 values(p_clave,proveedor.id,proveedor.nombre,p_fecha,btrim(p_referencia),0,auth.uid(),solicitud) returning id into compra;
 for i in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(i)<>'object' or exists(select 1 from jsonb_object_keys(i) k where k not in('varianteId','cantidad','costoUnitario','nuevoArticulo'))
   or jsonb_typeof(i->'cantidad') is distinct from 'number' or (i->>'cantidad')!~'^[1-9][0-9]*$' or (i->>'cantidad')::numeric>2147483647
   or jsonb_typeof(i->'costoUnitario') is distinct from 'number' then raise exception 'Detalle de compra inválido.' using errcode='22023';end if;
  cantidad:=(i->>'cantidad')::integer;costo:=(i->>'costoUnitario')::numeric;
  if costo<0 or costo>99999999.99 or costo<>round(costo,2) or v_total+cantidad*costo>999999999999.99 then raise exception 'Costo o total de compra inválido.' using errcode='22023';end if;
  if i ? 'nuevoArticulo' then
   n:=i->'nuevoArticulo';
   if i ? 'varianteId' or jsonb_typeof(n) is distinct from 'object' or exists(select 1 from jsonb_object_keys(n) k where k not in('nombre','categoriaId','precioBase','tallaMedida'))
    or length(btrim(coalesce(n->>'nombre',''))) not between 1 and 120 or length(btrim(coalesce(n->>'tallaMedida',''))) not between 1 and 80
    or jsonb_typeof(n->'precioBase') is distinct from 'number' or (n->>'precioBase')::numeric not between 0 and 99999999.99 or (n->>'precioBase')::numeric<>round((n->>'precioBase')::numeric,2)
    or (coalesce(n->>'categoriaId',''))!~'^[1-9][0-9]*$' then raise exception 'Ficha del artículo nuevo inválida.' using errcode='22023';end if;
   select * into c from public.categorias where id=(n->>'categoriaId')::bigint and activo for share;
   if not found then raise exception 'Selecciona una categoría activa.' using errcode='22023';end if;
   insert into public.articulos(nombre,categoria_id,categoria,precio_base) values(btrim(n->>'nombre'),c.id,c.nombre,(n->>'precioBase')::numeric) returning * into a;
   insert into public.variantes(articulo_id,talla_medida,existencia) values(a.id,btrim(n->>'tallaMedida'),0) returning * into v;
  else
   if jsonb_typeof(i->'varianteId') is distinct from 'number' or (coalesce(i->>'varianteId',''))!~'^[1-9][0-9]*$' then raise exception 'Selecciona una variante válida.' using errcode='22023';end if;
   select * into v from public.variantes where id=(i->>'varianteId')::bigint and activo for update;
   if not found then raise exception 'Una variante está inactiva o no existe.' using errcode='22023';end if;
   select a2.* into a from public.articulos a2 join public.categorias c2 on c2.id=a2.categoria_id and c2.activo where a2.id=v.articulo_id and a2.activo for share of a2;
   if not found then raise exception 'El artículo o categoría está inactivo.' using errcode='22023';end if;
  end if;
  if v.existencia::bigint+cantidad>2147483647 then raise exception 'La cantidad excede las existencias máximas permitidas.' using errcode='22023';end if;
  insert into public.detalle_compra(compra_id,variante_id,articulo_id,nombre,talla_medida,cantidad,costo_unitario) values(compra,v.id,a.id,a.nombre,v.talla_medida,cantidad,costo);
  update public.variantes set existencia=existencia+cantidad where id=v.id;
  v_total:=v_total+cantidad*costo;
 end loop;
 update public.compras set total=v_total where id=compra;
 insert into private.auditoria(actor,operacion,entidad,entidad_id) values(auth.uid(),'REGISTRAR','COMPRA',compra::text);
 return compra;
end;$$;
create function public.registrar_compra(p_clave uuid,p_proveedor_id bigint,p_fecha date,p_referencia text,p_items jsonb) returns bigint
language sql security invoker set search_path='' as $$select private.registrar_compra(p_clave,p_proveedor_id,p_fecha,p_referencia,p_items);$$;
revoke all on function private.registrar_compra(uuid,bigint,date,text,jsonb),public.registrar_compra(uuid,bigint,date,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.registrar_compra(uuid,bigint,date,text,jsonb),public.registrar_compra(uuid,bigint,date,text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
