import type { ClienteSupabase } from './supabase.js';
import { ArticuloRepository } from './repositories/ArticuloRepository.js';
import { CarritoRepository } from './repositories/CarritoRepository.js';
import { PedidoRepository } from './repositories/PedidoRepository.js';

export * from './models.js';
export * from './database.types.js';
export * from './errors.js';
export * from './supabase.js';
export { ArticuloRepository, CarritoRepository, PedidoRepository };
export type { FiltroPedidos, PedidoResumen } from './repositories/PedidoRepository.js';
export * from './negocio/index.js';

export function crearCapaDatos(cliente: ClienteSupabase) {
  return {
    articulos: new ArticuloRepository(cliente),
    carritos: new CarritoRepository(cliente),
    pedidos: new PedidoRepository(cliente),
  };
}
