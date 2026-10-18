begin;

-- Dato técnico de trazabilidad. El UID viene del JWT validado por Supabase,
-- nunca de un campo enviado por el navegador. No se inventa un autor para el historial.
alter table public.pedidos add column creado_por uuid default auth.uid();
comment on column public.pedidos.creado_por is
  'UID del personal autenticado que registra el pedido. Nulo en cargas administrativas sin identidad de usuario.';

notify pgrst, 'reload schema';
commit;
