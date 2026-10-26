import type { Carrito, Cliente, ClienteNuevo, ItemCarrito } from '../models.js';
import type { ArticuloRepository } from '../repositories/ArticuloRepository.js';
import type { CarritoRepository } from '../repositories/CarritoRepository.js';
import { cantidadValida, ErrorNegocio, idValido } from './ErrorNegocio.js';

export type DatosCarritos = Pick<CarritoRepository,
  'crearCliente' | 'obtenerCliente' | 'abrir' | 'obtenerPorId' | 'guardarItem' | 'quitarItem'>;
export type DatosArticulosCarrito = Pick<ArticuloRepository, 'obtenerPorId' | 'obtenerPorVariante'>;

export type ContactoCliente = ClienteNuevo;
export interface LineaCarrito extends ItemCarrito {
  articuloId: number;
  nombre: string;
  tallaMedida: string;
  existencia: number;
  sobrePedido: boolean;
  fotografia: string;
}
export interface CarritoDetalle extends Omit<Carrito, 'items'> {
  cliente: Cliente | null;
  items: LineaCarrito[];
  total: number;
}

export function totalPedido(items: ItemCarrito[]): number {
  const centavos = items.reduce((total, item) => total + Math.round(item.precioUnitario * 100) * item.cantidad, 0);
  if (!Number.isSafeInteger(centavos)) throw new ErrorNegocio('El total supera el importe permitido.');
  return centavos / 100;
}

export class ControlCarrito {
  constructor(private readonly carritos: DatosCarritos, private readonly articulos: DatosArticulosCarrito) {}

  async crear(contacto: ContactoCliente): Promise<CarritoDetalle> {
    const nombre = contacto.nombre?.trim();
    const telefono = contacto.telefono?.trim();
    if (!nombre || nombre.length < 2 || nombre.length > 120) throw new ErrorNegocio('Escribe el nombre del cliente (2 a 120 caracteres).');
    if (!telefono || !/^[+\d\s().-]+$/.test(telefono) || !/^\d{7,15}$/.test(telefono.replace(/\D/g, ''))) {
      throw new ErrorNegocio('Escribe un teléfono válido de 7 a 15 dígitos.');
    }
    const cliente = await this.carritos.crearCliente({ nombre, telefono });
    const carrito = await this.carritos.abrir(cliente.id);
    return this.detalle(carrito.id);
  }

  async detalle(carritoId: number): Promise<CarritoDetalle> {
    idValido(carritoId);
    const carrito = await this.carritos.obtenerPorId(carritoId);
    if (!carrito) throw new ErrorNegocio('No se encontró el carrito.', 'NO_ENCONTRADO');
    const cliente = carrito.clienteId === null ? null : await this.carritos.obtenerCliente(carrito.clienteId);
    if (carrito.clienteId !== null && !cliente) throw new ErrorNegocio('No se encontró el cliente del carrito.', 'NO_ENCONTRADO');
    const items = await Promise.all(carrito.items.map(async item => {
      const articulo = await this.articulos.obtenerPorVariante(item.varianteId);
      const variante = articulo?.variantes.find(v => v.id === item.varianteId);
      if (!articulo || !variante) throw new ErrorNegocio('Una variante del carrito ya no está disponible.', 'NO_ENCONTRADO');
      return { ...item, articuloId: articulo.id, nombre: articulo.nombre, tallaMedida: variante.tallaMedida,
        existencia: variante.existencia, sobrePedido: articulo.sobrePedido, fotografia: articulo.fotografia };
    }));
    return { ...carrito, cliente, items, total: totalPedido(items) };
  }

  async agregar(carritoId: number, articuloId: number, varianteId: number, cantidad: number): Promise<CarritoDetalle> {
    idValido(articuloId); idValido(varianteId); cantidadValida(cantidad);
    const carrito = await this.abierto(carritoId);
    const articulo = await this.articulos.obtenerPorId(articuloId);
    const variante = articulo?.variantes.find(v => v.id === varianteId);
    if (!articulo || !variante) throw new ErrorNegocio('La variante no pertenece al artículo seleccionado.', 'NO_ENCONTRADO');
    const anterior = carrito.items.find(item => item.varianteId === varianteId);
    const nuevaCantidad = (anterior?.cantidad ?? 0) + cantidad;
    this.comprobarExistencia(nuevaCantidad, variante.existencia, articulo.sobrePedido);
    await this.carritos.guardarItem(carritoId, varianteId, nuevaCantidad, anterior?.precioUnitario ?? articulo.precioBase);
    return this.detalle(carritoId);
  }

  async cambiarCantidad(carritoId: number, varianteId: number, cantidad: number): Promise<CarritoDetalle> {
    idValido(varianteId); cantidadValida(cantidad);
    const carrito = await this.abierto(carritoId);
    if (!carrito.items.some(item => item.varianteId === varianteId)) throw new ErrorNegocio('La variante no está en este carrito.', 'NO_ENCONTRADO');
    const articulo = await this.articulos.obtenerPorVariante(varianteId);
    const variante = articulo?.variantes.find(v => v.id === varianteId);
    if (!articulo || !variante) throw new ErrorNegocio('No se encontró la variante.', 'NO_ENCONTRADO');
    this.comprobarExistencia(cantidad, variante.existencia, articulo.sobrePedido);
    await this.carritos.guardarItem(carritoId, varianteId, cantidad);
    return this.detalle(carritoId);
  }

  async quitar(carritoId: number, varianteId: number): Promise<CarritoDetalle> {
    idValido(varianteId);
    await this.abierto(carritoId);
    await this.carritos.quitarItem(carritoId, varianteId);
    return this.detalle(carritoId);
  }

  private async abierto(id: number): Promise<Carrito> {
    idValido(id);
    const carrito = await this.carritos.obtenerPorId(id);
    if (!carrito) throw new ErrorNegocio('No se encontró el carrito.', 'NO_ENCONTRADO');
    if (carrito.cerrado) throw new ErrorNegocio('Este carrito ya pertenece a un pedido. Crea uno nuevo.', 'CONFLICTO');
    return carrito;
  }

  private comprobarExistencia(cantidad: number, existencia: number, sobrePedido: boolean): void {
    cantidadValida(cantidad);
    if (!sobrePedido && cantidad > existencia) throw new ErrorNegocio(`Solo hay ${existencia} unidades disponibles de esa variante.`, 'SIN_EXISTENCIA');
  }
}
