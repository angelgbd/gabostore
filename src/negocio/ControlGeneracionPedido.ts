import { EstadoPedido, type Cliente, type Pedido } from '../models.js';
import type { PedidoRepository } from '../repositories/PedidoRepository.js';
import { paginacion } from '../validation.js';
import { ControlCarrito, type LineaCarrito, totalPedido } from './ControlCarrito.js';
import { ErrorNegocio, idValido } from './ErrorNegocio.js';

export interface PedidoDetalle extends Omit<Pedido, 'items'> {
  cliente: Cliente;
  items: LineaCarrito[];
  total: number;
}
export type DatosPedidos = Pick<PedidoRepository, 'guardar' | 'obtenerPorId' | 'obtenerPorCarrito' | 'listarResumen'>;

export class ControlGeneracionPedido {
  constructor(private readonly carritos: ControlCarrito, private readonly pedidos: DatosPedidos) {}

  async listar(desde = 0) {
    paginacion(21, desde);
    const pedidos = await this.pedidos.listarResumen(desde, 21);
    return { pedidos: pedidos.slice(0, 20), desde, hayMas: pedidos.length > 20 };
  }

  async generar(carritoId: number, confirmacionesProveedor: number[] = []): Promise<PedidoDetalle> {
    idValido(carritoId);
    if (!Array.isArray(confirmacionesProveedor)) throw new ErrorNegocio('La confirmación del proveedor no es válida.');
    confirmacionesProveedor.forEach(idValido);
    const carrito = await this.carritos.detalle(carritoId);
    if (carrito.cerrado) {
      const existente = await this.pedidos.obtenerPorCarrito(carritoId);
      if (!existente) throw new ErrorNegocio('El carrito está cerrado y no se encontró su pedido.', 'CONFLICTO');
      return this.obtener(existente.id);
    }
    if (!carrito.items.length) throw new ErrorNegocio('Agrega al menos un artículo antes de registrar el pedido.');
    for (const item of carrito.items) {
      if (item.sobrePedido && !confirmacionesProveedor.includes(item.varianteId)) {
        throw new ErrorNegocio(`Confirma con el proveedor la disponibilidad de ${item.nombre}, variante ${item.tallaMedida}.`, 'REQUIERE_CONFIRMACION');
      }
      if (!item.sobrePedido && item.cantidad > item.existencia) {
        throw new ErrorNegocio(`La disponibilidad de ${item.nombre}, variante ${item.tallaMedida}, cambió. Revisa el carrito.`, 'SIN_EXISTENCIA');
      }
    }
    const guardado = await this.pedidos.guardar({
      clienteId: carrito.clienteId, carritoId: carrito.id,
      estado: EstadoPedido.PENDIENTE,
      items: carrito.items.map(({ varianteId, cantidad, precioUnitario }) => ({ varianteId, cantidad, precioUnitario })),
    });
    return this.obtener(guardado.id);
  }

  async obtener(id: number): Promise<PedidoDetalle> {
    idValido(id);
    const pedido = await this.pedidos.obtenerPorId(id);
    if (!pedido) throw new ErrorNegocio('No se encontró el pedido.', 'NO_ENCONTRADO');
    const carrito = await this.carritos.detalle(pedido.carritoId);
    const descripciones = new Map(carrito.items.map(item => [item.varianteId, item]));
    const items = pedido.items.map(item => {
      const descripcion = descripciones.get(item.varianteId);
      if (!descripcion) throw new ErrorNegocio('No fue posible recuperar un detalle del pedido.', 'NO_ENCONTRADO');
      return { ...descripcion, ...item };
    });
    return { ...pedido, cliente: carrito.cliente, items, total: totalPedido(pedido.items) };
  }
}
