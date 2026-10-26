import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import {
  crearCapaDatos, crearClienteSupabase, ErrorDatos, EstadoPedido,
  type ClienteSupabase, type Database, type PedidoNuevo,
} from '../src/index.js';

function conectar(): ClienteSupabase {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error('Falta SUPABASE_URL en .env.');
  const secreto = process.env.SUPABASE_SECRET_KEY;
  const clavePublica = process.env.SUPABASE_PUBLISHABLE_KEY;
  const tokenUsuario = process.env.SUPABASE_USER_TOKEN;
  if (secreto) {
    // Solo en esta terminal/backend. No usar una clave secreta en una interfaz web.
    return createClient<Database>(url, secreto, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  if (clavePublica && tokenUsuario) return crearClienteSupabase({ url, clavePublica, tokenUsuario });
  throw new Error('Para guardar datos reales configura SUPABASE_SECRET_KEY en .env, o la clave pública y SUPABASE_USER_TOKEN de un ADMIN/EMPLEADO. La conexión MCP no autentica este programa.');
}

async function main(): Promise<void> {
  const conexion = conectar();
  const datos = crearCapaDatos(conexion);
  // Comprobar la autenticación antes de crear los datos ficticios.
  const permiso = await conexion.from('clientes').select('id').limit(1);
  if (permiso.error) throw new ErrorDatos(permiso.error.message, permiso.error.code);

  const marca = `DEMO TS ${new Date().toISOString()}`;
  const articulo = await datos.articulos.crear({
    nombre: `${marca} - Camisa`, categoria: 'Ropa', precioBase: 149.90,
    variantes: [{ tallaMedida: 'M', existencia: 10 }, { tallaMedida: 'L', existencia: 5 }],
  });
  const cliente = await datos.carritos.crearCliente({ nombre: `${marca} - Cliente`, telefono: '0000000000' });
  const carrito = await datos.carritos.abrir(cliente.id);
  const mediana = articulo.variantes.find(v => v.tallaMedida === 'M');
  const grande = articulo.variantes.find(v => v.tallaMedida === 'L');
  assert.ok(mediana && grande, 'Se deben recuperar las dos variantes creadas.');

  // Este es el objeto que recibe la capa de datos. No se insertan sus líneas por separado.
  const pedido: PedidoNuevo = {
    clienteId: cliente.id,
    carritoId: carrito.id,
    estado: EstadoPedido.PENDIENTE,
    items: [
      { varianteId: mediana.id, cantidad: 2, precioUnitario: 149.90 },
      { varianteId: grande.id, cantidad: 1, precioUnitario: 159.90 },
    ],
  };
  console.log('\n1. Objeto entregado a PedidoRepository.guardar(pedido):');
  console.log(JSON.stringify(pedido, null, 2));

  const guardado = await datos.pedidos.guardar(pedido);

  // Una conexión nueva recupera la cabecera y las líneas desde la base remota.
  const consulta = crearCapaDatos(conectar());
  const recuperado = await consulta.pedidos.obtenerPorId(guardado.id);
  assert.ok(recuperado, 'El pedido debe existir en Supabase.');
  assert.deepEqual(recuperado, guardado);
  assert.equal(recuperado.clienteId, pedido.clienteId);
  assert.equal(recuperado.carritoId, pedido.carritoId);
  assert.equal(recuperado.estado, pedido.estado);
  const esperados = pedido.items.map(item => ({
    ...item, subtotal: Math.round(item.cantidad * item.precioUnitario * 100) / 100,
  })).sort((a, b) => a.varianteId - b.varianteId);
  assert.deepEqual(recuperado.items, esperados);
  assert.equal((await consulta.carritos.obtenerPorId(carrito.id))?.cerrado, true);

  // Reintentar el mismo objeto no genera otro pedido.
  assert.equal((await datos.pedidos.guardar(pedido)).id, recuperado.id);

  console.log('\n2. Pedido recuperado desde Supabase (incluye ID, fecha y subtotales):');
  console.log(JSON.stringify(recuperado, null, 2));
  console.log('\nOK: cabecera y 2 detalles persistidos. Total: 459.70. Carrito cerrado. Reintento sin duplicados.');
  console.log(`En Table Editor: pedidos.id = ${recuperado.id}; items_pedido.pedido_id = ${recuperado.id}.`);
  console.log(`Datos de esta ejecución: ${marca}. Permanecen guardados en Supabase.`);
}

main().catch((error: unknown) => {
  // No imprimir el objeto de conexión, cabeceras ni valores de las credenciales.
  console.error(error instanceof Error ? error.message : 'No fue posible ejecutar la demo.');
  process.exitCode = 1;
});
