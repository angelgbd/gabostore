import assert from 'node:assert/strict';
import { crearClienteSupabase, crearCapaDatos } from '../dist/index.js';

// Solo usa la clave pública. No crea registros ni requiere iniciar sesión.
const cliente = crearClienteSupabase({
  url: process.env.SUPABASE_URL ?? '',
  clavePublica: process.env.SUPABASE_PUBLISHABLE_KEY ?? '',
});
const datos = crearCapaDatos(cliente);
const catalogo = await datos.articulos.listarCatalogo(10);

const privado = await cliente.from('clientes').select('id').limit(1);
assert.equal(privado.error?.code, '42501', 'El acceso público a clientes debe estar bloqueado.');

const escritura = await cliente.rpc('crear_pedido_desde_carrito', { p_carrito_id: 1 });
assert.equal(escritura.error?.code, '42501', 'El acceso público no debe generar pedidos.');

const objeto = await cliente.rpc('guardar_pedido', {
  p_cliente_id: 1, p_carrito_id: 1, p_correo_cliente: 'prueba@example.com',
  p_items: [{ variante_id: 1, cantidad: 1, precio_unitario: 1 }],
});
assert.equal(objeto.error?.code, '42501', 'El acceso público tampoco debe guardar objetos de pedido.');

console.log(JSON.stringify({
  conexion: 'OK',
  articulosEnLaPagina: catalogo.length,
  clientesProtegidos: true,
  escriturasProtegidas: true,
}, null, 2));
