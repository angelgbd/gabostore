import type { crearCapaDatos } from '../index.js';
import { ControlCatalogo } from './ControlCatalogo.js';
import { ControlCarrito } from './ControlCarrito.js';
import { ControlGeneracionPedido } from './ControlGeneracionPedido.js';

export { ControlCatalogo, ControlCarrito, ControlGeneracionPedido };
export { ErrorNegocio } from './ErrorNegocio.js';
export * from './SolicitudConsulta.js';
export type { ArticuloCatalogo } from './ControlCatalogo.js';
export type { ContactoCliente, CarritoDetalle, LineaCarrito } from './ControlCarrito.js';
export type { PedidoDetalle } from './ControlGeneracionPedido.js';

export function crearCapaNegocio(datos: ReturnType<typeof crearCapaDatos>) {
  const carritos = new ControlCarrito(datos.carritos, datos.articulos);
  return { catalogo: new ControlCatalogo(datos.articulos), carritos,
    pedidos: new ControlGeneracionPedido(carritos, datos.pedidos) };
}
