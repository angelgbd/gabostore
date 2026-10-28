import type { ArticuloCatalogo } from './ControlCatalogo.js';

export interface SeleccionConsulta { articuloId: number; varianteId: number; cantidad: number }
/** Solicitud temporal de consulta. No es un Pedido ni se persiste en Supabase. */
export interface SolicitudConsulta { items: SeleccionConsulta[] }
export interface LineaConsulta extends SeleccionConsulta {
  nombre: string; categoria: string; tallaMedida: string; fotografia: string;
  precioUnitario: number | null; existencia: number; sobrePedido: boolean; problema: string;
}
export interface ResumenConsulta { items: LineaConsulta[]; subtotal: number; parcial: boolean; problemas: string[] }

export function cantidadValida(cantidad: number): boolean { return Number.isSafeInteger(cantidad) && cantidad > 0; }
export function leerSolicitud(almacenada: string | null): SolicitudConsulta {
  const vacia: SolicitudConsulta = { items: [] };
  if (!almacenada) return vacia;
  try {
    const valor: unknown = JSON.parse(almacenada);
    if (!valor || typeof valor !== 'object' || !('items' in valor) || !Array.isArray(valor.items)) return vacia;
    const items: SeleccionConsulta[] = [];
    for (const item of valor.items) {
      if (!item || typeof item !== 'object' || !cantidadValida(item.articuloId) || !cantidadValida(item.varianteId) || !cantidadValida(item.cantidad)) continue;
      const repetida = items.find(i => i.varianteId === item.varianteId);
      if (repetida) { if (repetida.articuloId === item.articuloId && cantidadValida(repetida.cantidad + item.cantidad)) repetida.cantidad += item.cantidad; }
      else items.push({ articuloId: item.articuloId, varianteId: item.varianteId, cantidad: item.cantidad });
    }
    return { items };
  } catch { return vacia; }
}

export function seleccionarConsulta(items: SeleccionConsulta[], articulo: ArticuloCatalogo, varianteId: number, cantidad: number): SeleccionConsulta[] {
  const variante = articulo.variantes.find(v => v.id === varianteId);
  if (!variante || articulo.activo===false || variante.activo===false || !cantidadValida(cantidad)) throw new Error('Selecciona una variante y una cantidad entera positiva.');
  const anterior = items.find(i => i.varianteId === varianteId);
  const suma = (anterior?.cantidad ?? 0) + cantidad;
  if (!cantidadValida(suma)) throw new Error('La cantidad es demasiado grande.');
  if (!articulo.sobrePedido && suma > variante.existencia) throw new Error(`Hay ${variante.existencia} unidades disponibles. Revisa la cantidad de tu solicitud.`);
  return anterior ? items.map(i => i.varianteId === varianteId ? { ...i, cantidad: suma } : i) : [...items, { articuloId: articulo.id, varianteId, cantidad }];
}

export function resumirConsulta(items: SeleccionConsulta[], articulos: ArticuloCatalogo[]): ResumenConsulta {
  const lineas = items.map(item => {
    const articulo = articulos.find(a => a.id === item.articuloId);
    const variante = articulo?.variantes.find(v => v.id === item.varianteId);
    const problema = !articulo || !variante || articulo.activo===false || variante.activo===false ? 'Este artículo o variante ya no está disponible. Quítalo de la solicitud.'
      : !cantidadValida(item.cantidad) ? 'La cantidad debe ser un entero positivo.'
      : !articulo.sobrePedido && item.cantidad > variante.existencia ? `Ahora hay ${variante.existencia} unidades disponibles. Ajusta la cantidad.` : '';
    return { ...item, nombre: articulo?.nombre ?? 'Artículo no disponible', categoria: articulo?.categoria ?? '',
      tallaMedida: variante?.tallaMedida ?? 'No disponible', fotografia: articulo?.fotografia ?? '',
      precioUnitario: articulo?.sobrePedido ? null : articulo?.precioBase != null ? Math.round((articulo.precioBase+(variante?.recargo??0))*100)/100 : null,
      existencia: variante?.existencia ?? 0, sobrePedido: articulo?.sobrePedido ?? false, problema };
  });
  let centavos = 0;
  for (const item of lineas) {
    if (item.precioUnitario !== null) centavos += Math.round(item.precioUnitario * 100) * item.cantidad;
  }
  const problemas = lineas.flatMap(i => i.problema ? [`${i.nombre}: ${i.problema}`] : []);
  if (!Number.isSafeInteger(centavos)) problemas.push('El importe es demasiado grande. Reduce las cantidades.');
  return { items: lineas, subtotal: Number.isSafeInteger(centavos) ? centavos / 100 : 0,
    parcial: lineas.some(i => i.precioUnitario === null), problemas };
}

const moneda = (valor: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(valor);
export function generarMensajeConsulta(_solicitud: SolicitudConsulta, resumen: ResumenConsulta): string {
  if (!resumen.items.length) throw new Error('Añade al menos un artículo a tu solicitud.');
  if (resumen.problemas.length) throw new Error('Revisa los artículos señalados antes de generar el mensaje.');
  const lineas = resumen.items.map(i => `• ${i.nombre.replace(/^DEMO TS \S+ - /, '').replace(/^DEMO GaboStore - /, '')}\n  Variante: ${i.tallaMedida} · ${i.cantidad} ${i.cantidad === 1 ? 'unidad' : 'unidades'} · ${i.precioUnitario === null ? 'Precio y disponibilidad por confirmar' : `${moneda(i.precioUnitario)} MXN c/u · ${moneda(Math.round(i.precioUnitario * 100) * i.cantidad / 100)} MXN`}`);
  return `Hola Gabo Store,\n\nQuiero consultar el siguiente pedido:\n\n${lineas.join('\n\n')}\n\n${resumen.parcial ? 'Total parcial estimado' : 'Total estimado'}: ${moneda(resumen.subtotal)} MXN${resumen.parcial ? '\nHay artículos con precio por confirmar.' : ''}\nEnvío: a confirmar\n\nQuedo en espera de confirmación. Esta solicitud no representa un pago ni reserva unidades.`;
}

export function numeroWhatsApp(valor?: string | null): string | null {
  const limpio = valor?.trim().replace(/^\+/, '');
  return limpio && /^[1-9]\d{7,14}$/.test(limpio) ? limpio : null;
}
export function enlaceWhatsApp(numero: string | null, mensaje: string): string | null {
  const valido = numeroWhatsApp(numero);
  return valido && mensaje ? `https://wa.me/${valido}?text=${encodeURIComponent(mensaje)}` : null;
}
