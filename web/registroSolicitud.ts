import { claveSolicitudValida, type PedidoPublicoRegistrado } from '../src/negocio/ControlPedidoPublico.js';
import type { SeleccionConsulta } from '../src/negocio/SolicitudConsulta.js';
export interface IntentoSolicitud { claveSolicitud: string; firma: string; registro: PedidoPublicoRegistrado | null }
export const firmaSolicitud = (items: SeleccionConsulta[]) => JSON.stringify([...items].sort((a, b) => a.varianteId - b.varianteId));
export const nuevoIntento = (items: SeleccionConsulta[]): IntentoSolicitud => ({ claveSolicitud: crypto.randomUUID(), firma: firmaSolicitud(items), registro: null });
export function restaurarIntento(valor: string | null, items: SeleccionConsulta[]): IntentoSolicitud {
  try {
    const dato = JSON.parse(valor ?? 'null') as IntentoSolicitud | null;
    if (!dato || !claveSolicitudValida(dato.claveSolicitud) || dato.firma !== firmaSolicitud(items)) return nuevoIntento(items);
    const r = dato.registro;
    const registro = r && Number.isSafeInteger(r.id) && r.id > 0 && ['PENDIENTE', 'CONFIRMADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'].includes(r.estado)
      && typeof r.mensaje === 'string' && r.mensaje.length < 65536 && Number.isFinite(Date.parse(r.venceEn)) && Number.isFinite(Date.parse(r.fechaCreacion)) ? r : null;
    return { claveSolicitud: dato.claveSolicitud, firma: dato.firma, registro };
  } catch { return nuevoIntento(items); }
}
