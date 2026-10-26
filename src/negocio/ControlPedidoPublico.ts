import type { PedidoRepository } from '../repositories/PedidoRepository.js';
import type { EstadoPedido } from '../models.js';
import { ErrorNegocio, cantidadValida, idValido } from './ErrorNegocio.js';
import { generarMensajeConsulta, type LineaConsulta } from './SolicitudConsulta.js';

export interface SolicitudPedidoPublico { claveSolicitud: string; items: { varianteId: number; cantidad: number }[] }
export interface RegistroPublicoDatos {
  id: number; estado: EstadoPedido; fechaCreacion: string; venceEn: string; items: LineaConsulta[];
}
export interface PedidoPublicoRegistrado extends Omit<RegistroPublicoDatos, 'items'> { mensaje: string }
export const claveSolicitudValida = (valor: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor);

export class ControlPedidoPublico {
  constructor(private readonly pedidos: Pick<PedidoRepository, 'registrarPublico'>) {}

  async registrar(solicitud: SolicitudPedidoPublico): Promise<PedidoPublicoRegistrado> {
    if (!claveSolicitudValida(solicitud.claveSolicitud)) throw new ErrorNegocio('La clave de solicitud no es válida.');
    if (!Array.isArray(solicitud.items) || !solicitud.items.length || solicitud.items.length > 100) throw new ErrorNegocio('Agrega entre 1 y 100 variantes.');
    const variantes = new Set<number>();
    for (const item of solicitud.items) {
      idValido(item.varianteId); cantidadValida(item.cantidad);
      if (variantes.has(item.varianteId)) throw new ErrorNegocio('Una variante no puede repetirse.');
      variantes.add(item.varianteId);
    }
    const datos = await this.pedidos.registrarPublico(solicitud);
    const centavos = datos.items.reduce((s, i) => s + (i.precioUnitario === null ? 0 : Math.round(i.precioUnitario * 100) * i.cantidad), 0);
    if (!Number.isSafeInteger(centavos)) throw new ErrorNegocio('El total supera el importe permitido.');
    const texto = generarMensajeConsulta({ items: [] }, { items: datos.items, subtotal: centavos / 100,
      parcial: datos.items.some(i => i.precioUnitario === null), problemas: [] });
    const { items: _items, ...registro } = datos;
    return { ...registro, mensaje: `Pedido #${datos.id}\n\n${texto}\n\nRegistrado como ${datos.estado}. Plazo para confirmar: ${new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Hermosillo' }).format(new Date(datos.venceEn))} (Hermosillo).` };
  }
}
