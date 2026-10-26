import type { ArticuloRow, VarianteRow, ItemRow, CarritoRow, PedidoRow, CatalogoRow } from './database.types.js';
import type { Articulo, Variante, ItemCarrito, Carrito, Pedido } from './models.js';
import { ErrorDatos } from './errors.js';

export const convertirVariante = (fila: VarianteRow): Variante => ({
  id: fila.id, tallaMedida: fila.talla_medida, existencia: fila.existencia,
});
export const convertirItem = (fila: ItemRow): ItemCarrito => ({
  varianteId: fila.variante_id, cantidad: fila.cantidad,
  precioUnitario: fila.precio_unitario, subtotal: fila.subtotal,
});
export function convertirArticulo(fila: ArticuloRow & { variantes: VarianteRow[] }): Articulo {
  return {
    id: fila.id, nombre: fila.nombre, categoria: fila.categoria, precioBase: fila.precio_base,
    fotografia: fila.fotografia, sobrePedido: fila.sobre_pedido,
    variantes: fila.variantes.map(convertirVariante).sort((a, b) => a.id - b.id),
  };
}
export function convertirCarrito(fila: CarritoRow & { items_carrito: ItemRow[] }): Carrito {
  return {
    id: fila.id, clienteId: fila.cliente_id,
    cerrado: fila.cerrado, items: fila.items_carrito.map(convertirItem).sort((a, b) => a.varianteId - b.varianteId),
  };
}
export function convertirPedido(fila: PedidoRow & { items_pedido: ItemRow[] }): Pedido {
  return {
    id: fila.id, clienteId: fila.cliente_id, carritoId: fila.carrito_id,
    estado: fila.estado, fechaCreacion: fila.fecha_creacion, origen: fila.origen as Pedido['origen'], venceEn: fila.vence_en,
    items: fila.items_pedido.map(convertirItem).sort((a, b) => a.varianteId - b.varianteId),
  };
}
export function convertirCatalogo(filas: CatalogoRow[]): Articulo[] {
  return filas.map(fila => {
    if (!Array.isArray(fila.variantes)) throw new ErrorDatos('Formato de catálogo inesperado.', 'FORMATO');
    const variantes: Variante[] = fila.variantes.map(v => {
      if (!v || typeof v !== 'object' || Array.isArray(v)
          || typeof v.id !== 'number' || typeof v.talla_medida !== 'string' || typeof v.existencia !== 'number') {
        throw new ErrorDatos('Formato de variante inesperado.', 'FORMATO');
      }
      return { id: v.id, tallaMedida: v.talla_medida, existencia: v.existencia };
    });
    return {
      id: fila.articulo_id, nombre: fila.nombre, categoria: fila.categoria,
      precioBase: fila.precio_base, fotografia: fila.fotografia,
      sobrePedido: fila.sobre_pedido, variantes,
    };
  });
}
