import type { ClienteSupabase } from '../supabase.js';
import type { Carrito, Cliente, ClienteNuevo } from '../models.js';
import { comprobarError, requerido } from '../errors.js';
import { convertirCarrito } from '../mappers.js';
import { identificador, entero, importe, texto, correo } from '../validation.js';

/** Incluye persistencia de los datos de contacto del cliente, sin crear cuentas. */
export class CarritoRepository {
  constructor(private readonly db: ClienteSupabase) {}

  async crearCliente(datos: ClienteNuevo): Promise<Cliente> {
    const { data, error } = await this.db.from('clientes').insert({
      nombre: texto(datos.nombre, 'nombre'), telefono: texto(datos.telefono, 'telefono'),
    }).select('*').single();
    comprobarError(error);
    return requerido(data, 'No se obtuvo el cliente creado.');
  }

  async obtenerCliente(id: number): Promise<Cliente | null> {
    identificador(id);
    const { data, error } = await this.db.from('clientes').select('*').eq('id', id).maybeSingle();
    comprobarError(error);
    return data;
  }

  async actualizarCliente(id: number, cambios: Partial<ClienteNuevo>): Promise<Cliente> {
    identificador(id);
    const valores = {
      ...(cambios.nombre !== undefined ? { nombre: texto(cambios.nombre, 'nombre') } : {}),
      ...(cambios.telefono !== undefined ? { telefono: texto(cambios.telefono, 'telefono') } : {}),
    };
    if (Object.keys(valores).length) {
      const { data, error } = await this.db.from('clientes').update(valores).eq('id', id).select('*').single();
      comprobarError(error);
      return requerido(data, 'El cliente no existe o no es accesible.');
    }
    return requerido(await this.obtenerCliente(id), 'El cliente no existe o no es accesible.');
  }

  /** Recupera el abierto o crea otro si el anterior ya tiene un pedido. */
  async abrir(clienteId: number, correoCliente: string): Promise<Carrito> {
    identificador(clienteId, 'clienteId');
    const { data, error } = await this.db.rpc('abrir_carrito', {
      p_cliente_id: clienteId, p_correo_cliente: correo(correoCliente),
    });
    comprobarError(error);
    return requerido(await this.obtenerPorId(requerido(data, 'No se obtuvo el carrito.')), 'No se encontró el carrito.');
  }

  async obtenerPorId(id: number): Promise<Carrito | null> {
    identificador(id);
    const { data, error } = await this.db.from('carritos').select('*, items_carrito(*)').eq('id', id).maybeSingle();
    comprobarError(error);
    return data ? convertirCarrito(data) : null;
  }

  async obtenerAbierto(clienteId: number): Promise<Carrito | null> {
    identificador(clienteId, 'clienteId');
    const { data, error } = await this.db.from('carritos').select('*, items_carrito(*)')
      .eq('cliente_id', clienteId).eq('cerrado', false).maybeSingle();
    comprobarError(error);
    return data ? convertirCarrito(data) : null;
  }

  /** Si se omite el precio, conserva el existente o toma el precio base al añadir. */
  async guardarItem(carritoId: number, varianteId: number, cantidad: number, precioUnitario?: number): Promise<Carrito> {
    identificador(carritoId, 'carritoId'); identificador(varianteId, 'varianteId');
    entero(cantidad, 1, 'cantidad');
    if (precioUnitario !== undefined) importe(precioUnitario);
    const { error } = await this.db.rpc('guardar_item_carrito', {
      p_carrito_id: carritoId, p_variante_id: varianteId, p_cantidad: cantidad,
      ...(precioUnitario !== undefined ? { p_precio_unitario: precioUnitario } : {}),
    });
    comprobarError(error);
    return requerido(await this.obtenerPorId(carritoId), 'El carrito no existe o no es accesible.');
  }

  async quitarItem(carritoId: number, varianteId: number): Promise<Carrito> {
    identificador(carritoId, 'carritoId'); identificador(varianteId, 'varianteId');
    const { error } = await this.db.from('items_carrito').delete().eq('carrito_id', carritoId).eq('variante_id', varianteId);
    comprobarError(error);
    return requerido(await this.obtenerPorId(carritoId), 'El carrito no existe o no es accesible.');
  }

  async actualizarCorreo(carritoId: number, correoCliente: string): Promise<Carrito> {
    identificador(carritoId, 'carritoId');
    const { error } = await this.db.from('carritos').update({ correo_cliente: correo(correoCliente) })
      .eq('id', carritoId).select('id').single();
    comprobarError(error);
    return requerido(await this.obtenerPorId(carritoId), 'El carrito no existe o no es accesible.');
  }
}
