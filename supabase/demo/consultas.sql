-- Ejecutar las consultas por separado en SQL Editor de GaboStore.
-- Solo muestran datos; no insertan, actualizan ni borran registros.

-- 1. Productos y variantes: precio actual y existencias por talla.
select a.id as articulo_id,a.nombre,a.precio_base,v.id as variante_id,v.talla_medida,v.existencia
from public.articulos a join public.variantes v on v.articulo_id=a.id
where a.nombre like 'DEMO GaboStore - %' order by a.id,v.id;

-- 2. Un carrito cerrado y otro abierto para el mismo cliente.
select c.id as cliente_id,c.nombre,ca.id as carrito_id,ca.correo_cliente,ca.cerrado,
       count(i.variante_id) as lineas,coalesce(sum(i.subtotal),0) as total
from public.clientes c join public.carritos ca on ca.cliente_id=c.id
left join public.items_carrito i on i.carrito_id=ca.id
where c.nombre='DEMO GaboStore - Cliente' and c.telefono='0000000000'
group by c.id,ca.id order by ca.id;

-- 3. Pedido confirmado y copia de sus cantidades y precios.
select p.id as pedido_id,p.estado,p.fecha_creacion,a.nombre,v.talla_medida,
       i.cantidad,i.precio_unitario,i.subtotal
from public.pedidos p join public.clientes c on c.id=p.cliente_id
join public.items_pedido i on i.pedido_id=p.id
join public.variantes v on v.id=i.variante_id join public.articulos a on a.id=v.articulo_id
where c.nombre='DEMO GaboStore - Cliente' and c.telefono='0000000000'
  and p.correo_cliente='demo.gabostore@example.com'
order by p.id,v.id;

-- 4. La camisa vale 169.90 ahora; en el pedido conserva 149.90.
select a.nombre,a.precio_base as precio_actual,i.precio_unitario as precio_en_pedido
from public.items_pedido i join public.pedidos p on p.id=i.pedido_id
join public.clientes c on c.id=p.cliente_id
join public.variantes v on v.id=i.variante_id join public.articulos a on a.id=v.articulo_id
where c.nombre='DEMO GaboStore - Cliente' and c.telefono='0000000000'
  and p.correo_cliente='demo.gabostore@example.com'
order by a.id;
