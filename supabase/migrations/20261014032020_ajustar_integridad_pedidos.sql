begin;

-- Índice para cubrir la relación compuesta con el carrito y el cliente.
create index pedidos_carrito_cliente_idx on public.pedidos(carrito_id, cliente_id);

-- El subtotal siempre se calcula a partir de dos columnas obligatorias.
-- Declararlo NOT NULL también mantiene correctos los tipos generados.
alter table public.items_carrito alter column subtotal set not null;
alter table public.items_pedido alter column subtotal set not null;

notify pgrst, 'reload schema';
commit;
