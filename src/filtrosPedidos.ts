import { EstadoPedido } from './models.js';
import { ErrorDatos } from './errors.js';
import { identificador } from './validation.js';

export interface FiltrosListadoPedidos {
  numero?: number;
  estado?: EstadoPedido;
  fechaDesde?: string;
  fechaHasta?: string;
}

/** Fechas de calendario de GaboStore (Hermosillo, UTC−07:00 todo el año). */
export function validarFiltrosPedidos(filtro: FiltrosListadoPedidos) {
  if (filtro.numero !== undefined) identificador(filtro.numero, 'El número de pedido');
  if (filtro.estado !== undefined && !Object.values(EstadoPedido).includes(filtro.estado)) {
    throw new ErrorDatos('Selecciona un estado de pedido válido.', 'VALIDACION');
  }
  for (const valor of [filtro.fechaDesde, filtro.fechaHasta]) {
    if (valor === undefined) continue;
    const fecha = typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)
      ? new Date(`${valor}T00:00:00Z`) : new Date(NaN);
    if (!Number.isFinite(fecha.getTime()) || fecha.getUTCFullYear() < 1 || fecha.toISOString().slice(0, 10) !== valor) {
      throw new ErrorDatos('Introduce una fecha válida con formato AAAA-MM-DD.', 'VALIDACION');
    }
  }
  if (filtro.fechaDesde && filtro.fechaHasta && filtro.fechaDesde > filtro.fechaHasta) {
    throw new ErrorDatos('La fecha inicial no puede ser posterior a la fecha final.', 'VALIDACION');
  }
  return {
    inicio: filtro.fechaDesde ? `${filtro.fechaDesde}T00:00:00-07:00` : undefined,
    fin: filtro.fechaHasta ? `${filtro.fechaHasta}T23:59:59.999999-07:00` : undefined,
  };
}
