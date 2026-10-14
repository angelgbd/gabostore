import type { ClienteSupabase } from '../supabase.js';
import { EstadoPedido, type Pedido } from '../models.js';
import { comprobarError, ErrorDatos, requerido } from '../errors.js';
import { convertirPedido } from '../mappers.js';
import { identificador, paginacion } from '../validation.js';

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
