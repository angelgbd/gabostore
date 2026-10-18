import type { ClienteSupabase } from '../supabase.js';
import { EstadoPedido, type Pedido, type PedidoNuevo } from '../models.js';
import { comprobarError, ErrorDatos, requerido } from '../errors.js';
import { convertirPedido } from '../mappers.js';
import { correo, entero, identificador, importe, paginacion } from '../validation.js';

export interface FiltroPedidos {
  clienteId?: number;
  estado?: EstadoPedido;
  limite?: number;
  desde?: number;
}

function comprobarEstado(estado: EstadoPedido): void {
  if (!Object.values(EstadoPedido).includes(estado)) throw new ErrorDatos('Estado de pedido inválido.', 'VALIDACION');
}

export class PedidoRepository {
  constructor(private readonly db: ClienteSupabase) {}

  /** Guarda la cabecera y todo el detalle en una transacción, cerrando su carrito. */
  async guardar(pedido: PedidoNuevo): Promise<Pedido> {
    identificador(pedido.clienteId, 'clienteId');
    identificador(pedido.carritoId, 'carritoId');
    const estado = pedido.estado ?? EstadoPedido.PENDIENTE;
    comprobarEstado(estado);
    const correoCliente = correo(pedido.correoCliente);
    if (!Array.isArray(pedido.items) || pedido.items.length === 0) {
      throw new ErrorDatos('El pedido debe contener al menos un artículo.', 'VALIDACION');
    }
    const variantes = new Set<number>();
    const items = pedido.items.map(item => {
      identificador(item.varianteId, 'varianteId');
      entero(item.cantidad, 1, 'cantidad');
      importe(item.precioUnitario);
      if (variantes.has(item.varianteId)) {
        throw new ErrorDatos('Una variante no puede aparecer dos veces en el pedido.', 'VALIDACION');
      }
      variantes.add(item.varianteId);
      return { variante_id: item.varianteId, cantidad: item.cantidad, precio_unitario: item.precioUnitario };
    });
    const { data, error } = await this.db.rpc('guardar_pedido', {
      p_cliente_id: pedido.clienteId, p_carrito_id: pedido.carritoId,
      p_correo_cliente: correoCliente, p_estado: estado, p_items: items,
    });
    comprobarError(error);
    return requerido(await this.obtenerPorId(requerido(data, 'No se obtuvo el pedido guardado.')),
      'El pedido se guardó, pero no fue posible recuperarlo. Reintentar con el mismo carrito.');
  }

  async crearDesdeCarrito(carritoId: number): Promise<Pedido> {
    identificador(carritoId, 'carritoId');
    const { data, error } = await this.db.rpc('crear_pedido_desde_carrito', { p_carrito_id: carritoId });
    comprobarError(error);
    return requerido(await this.obtenerPorId(requerido(data, 'No se obtuvo el pedido.')), 'No se encontró el pedido.');
  }

  async obtenerPorId(id: number): Promise<Pedido | null> {
    identificador(id);
    const { data, error } = await this.db.from('pedidos').select('*, items_pedido(*)').eq('id', id).maybeSingle();
    comprobarError(error);
    return data ? convertirPedido(data) : null;
  }

  async obtenerPorCarrito(carritoId: number): Promise<Pedido | null> {
    identificador(carritoId, 'carritoId');
    const { data, error } = await this.db.from('pedidos').select('*, items_pedido(*)').eq('carrito_id', carritoId).maybeSingle();
    comprobarError(error);
    return data ? convertirPedido(data) : null;
  }

  async listar(filtro: FiltroPedidos = {}): Promise<Pedido[]> {
    const limite = filtro.limite ?? 100;
    const desde = filtro.desde ?? 0;
    paginacion(limite, desde);
    let consulta = this.db.from('pedidos').select('*, items_pedido(*)')
      .order('fecha_creacion', { ascending: false }).order('id', { ascending: false })
      .range(desde, desde + limite - 1);
    if (filtro.clienteId !== undefined) {
      identificador(filtro.clienteId, 'clienteId'); consulta = consulta.eq('cliente_id', filtro.clienteId);
    }
    if (filtro.estado !== undefined) {
      comprobarEstado(filtro.estado); consulta = consulta.eq('estado', filtro.estado);
    }
    const { data, error } = await consulta;
    comprobarError(error);
    return (data ?? []).map(convertirPedido);
  }

  /** La capa de control decide cuándo corresponde cada cambio de estado. */
  async actualizarEstado(id: number, estado: EstadoPedido): Promise<Pedido> {
    identificador(id); comprobarEstado(estado);
    const { error } = await this.db.from('pedidos').update({ estado }).eq('id', id).select('id').single();
    comprobarError(error);
    return requerido(await this.obtenerPorId(id), 'El pedido no existe o no es accesible.');
  }
}
