-- GaboStore: datos ficticios PERSISTENTES para presentar en Supabase.
-- Ejecutar como administrador en SQL Editor, después de las migraciones.
-- No elimina datos. Repetir este archivo no duplica la demo.
begin;

-- Contexto sintético solo para esta transacción administrativa.
-- No crea usuarios de Auth, tokens válidos ni permisos nuevos.
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"rol":"ADMIN"}}', true);
set local role authenticated;

do $demo$
declare
  v_camisa bigint;
  v_gorra bigint;
  v_talla_m bigint;
  v_variante_gorra bigint;
  v_cliente bigint;
  v_carrito bigint;
  v_pedido bigint;
  v_nuevo bigint;
begin
  perform pg_advisory_xact_lock(hashtext('gabostore_demo_supabase_v1'));

  if exists (select 1 from public.clientes
             where nombre='DEMO GaboStore - Cliente' and telefono='0000000000') then
    if not exists (
      select 1 from public.pedidos p join public.clientes c on c.id=p.cliente_id
      where c.nombre='DEMO GaboStore - Cliente' and c.telefono='0000000000'
        and p.correo_cliente='demo.gabostore@example.com'
    ) then
      raise exception 'Hay un cliente DEMO previo sin pedido. Revisar antes de volver a cargar.';
    end if;
    raise notice 'La demo ya está cargada. Los datos existentes se conservan.';
    return;
  end if;
  if exists (select 1 from public.articulos where nombre like 'DEMO GaboStore - %') then
    raise exception 'Hay productos DEMO previos. Revisar antes de volver a cargar.';
  end if;

  v_camisa := public.crear_articulo('DEMO GaboStore - Camisa básica','Ropa',149.90,'',false,
    '[{"talla_medida":"M","existencia":5},{"talla_medida":"L","existencia":0}]'::jsonb);
  v_gorra := public.crear_articulo('DEMO GaboStore - Gorra','Accesorios',199.00,'',false,
    '[{"talla_medida":"Única","existencia":3}]'::jsonb);
  select id into v_talla_m from public.variantes where articulo_id=v_camisa and talla_medida='M';
  select id into v_variante_gorra from public.variantes where articulo_id=v_gorra and talla_medida='Única';

  insert into public.clientes(nombre,telefono)
    values ('DEMO GaboStore - Cliente','0000000000') returning id into v_cliente;
  v_carrito := public.abrir_carrito(v_cliente,'demo.gabostore@example.com');
  perform public.guardar_item_carrito(v_carrito,v_talla_m,2);
  perform public.guardar_item_carrito(v_carrito,v_variante_gorra,1);

  if (select sum(subtotal) from public.items_carrito where carrito_id=v_carrito) is distinct from 498.80 then
    raise exception 'El total de la demo debe ser 498.80.';
  end if;
  v_pedido := public.crear_pedido_desde_carrito(v_carrito);
  if public.crear_pedido_desde_carrito(v_carrito) <> v_pedido then
    raise exception 'La creación repetida no debe duplicar el pedido.';
  end if;
  update public.pedidos set estado='CONFIRMADO' where id=v_pedido;

  -- El precio actual es distinto del precio guardado en el pedido.
  update public.articulos set precio_base=169.90 where id=v_camisa;
  if (select precio_unitario from public.items_pedido
      where pedido_id=v_pedido and variante_id=v_talla_m) is distinct from 149.90 then
    raise exception 'El pedido debe conservar el precio original.';
  end if;
  v_nuevo := public.abrir_carrito(v_cliente,'demo.gabostore@example.com');
  if v_nuevo=v_carrito then raise exception 'La siguiente compra necesita otro carrito.'; end if;
end;
$demo$;

commit;

-- Resultado visible: el pedido queda guardado, con total 498.80.
select p.id as pedido_id, c.nombre as cliente, p.estado, p.carrito_id,
       p.fecha_creacion, sum(i.subtotal) as total
from public.pedidos p
join public.clientes c on c.id=p.cliente_id
join public.items_pedido i on i.pedido_id=p.id
where c.nombre='DEMO GaboStore - Cliente' and c.telefono='0000000000'
  and p.correo_cliente='demo.gabostore@example.com'
group by p.id,c.nombre order by p.id;
