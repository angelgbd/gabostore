import type { ClienteSupabase } from '../supabase.js';
import type { Articulo, ArticuloNuevo, CambiosArticulo, Variante, VarianteNueva } from '../models.js';
import { comprobarError, requerido, ErrorDatos } from '../errors.js';
import { convertirArticulo, convertirCatalogo, convertirVariante } from '../mappers.js';
import { identificador, entero, importe, texto, paginacion } from '../validation.js';
import { validarFotografia, extensionesFotografia } from '../fotografias.js';

export class ArticuloRepository {
  constructor(private readonly db: ClienteSupabase) {}

  async listarCatalogo(limite = 100, desde = 0): Promise<Articulo[]> {
    paginacion(limite, desde);
    const { data, error } = await this.db.rpc('obtener_catalogo', { p_limite: limite, p_desde: desde });
    comprobarError(error);
    return convertirCatalogo(data ?? []);
  }

  async obtenerPublicoPorId(id: number): Promise<Articulo | null> {
    identificador(id);
    const { data, error } = await this.db.rpc('obtener_catalogo', { p_articulo_id: id });
    comprobarError(error);
    return convertirCatalogo(data ?? [])[0] ?? null;
  }

  /** Incluye agotados y artículos sin variantes; requiere rol de personal. */
  async listar(limite = 100, desde = 0): Promise<Articulo[]> {
    paginacion(limite, desde);
    const { data, error } = await this.db.from('articulos').select('*, variantes(*)')
      .order('id').range(desde, desde + limite - 1);
    comprobarError(error);
    return (data ?? []).map(convertirArticulo);
  }

  async obtenerPorId(id: number): Promise<Articulo | null> {
    identificador(id);
    const { data, error } = await this.db.from('articulos').select('*, variantes(*)').eq('id', id).maybeSingle();
    comprobarError(error);
    return data ? convertirArticulo(data) : null;
  }

  async obtenerPorVariante(varianteId: number): Promise<Articulo | null> {
    identificador(varianteId, 'varianteId');
    const { data, error } = await this.db.from('variantes').select('articulo_id').eq('id', varianteId).maybeSingle();
    comprobarError(error);
    return data ? this.obtenerPorId(data.articulo_id) : null;
  }

  async crear(datos: ArticuloNuevo): Promise<Articulo> {
    importe(datos.precioBase);
    const variantes = (datos.variantes ?? []).map(v => {
      entero(v.existencia, 0, 'existencia');
      return { talla_medida: texto(v.tallaMedida, 'tallaMedida'), existencia: v.existencia };
    });
    const { data, error } = await this.db.rpc('crear_articulo', {
      p_nombre: texto(datos.nombre, 'nombre'), p_categoria: texto(datos.categoria, 'categoria'),
      p_precio_base: datos.precioBase, p_fotografia: datos.fotografia ?? '',
      p_sobre_pedido: datos.sobrePedido ?? false, p_variantes: variantes,
    });
    comprobarError(error);
    return requerido(await this.obtenerPorId(requerido(data, 'No se obtuvo el artículo creado.')), 'No se encontró el artículo creado.');
  }

  async actualizar(id: number, cambios: CambiosArticulo): Promise<Articulo> {
    identificador(id);
    if (cambios.precioBase !== undefined) importe(cambios.precioBase);
    const valores = {
      ...(cambios.activo !== undefined ? {activo:cambios.activo} : {}),
      ...(cambios.nombre !== undefined ? { nombre: texto(cambios.nombre, 'nombre') } : {}),
      ...(cambios.categoria !== undefined ? { categoria: texto(cambios.categoria, 'categoria') } : {}),
      ...(cambios.precioBase !== undefined ? { precio_base: cambios.precioBase } : {}),
      ...(cambios.fotografia !== undefined ? { fotografia: cambios.fotografia } : {}),
      ...(cambios.sobrePedido !== undefined ? { sobre_pedido: cambios.sobrePedido } : {}),
    };
    if (Object.keys(valores).length) {
      const { error } = await this.db.from('articulos').update(valores).eq('id', id).select('id').single();
      comprobarError(error);
    }
    return requerido(await this.obtenerPorId(id), 'El artículo no existe o no es accesible.');
  }

  async crearVariante(articuloId: number, datos: VarianteNueva): Promise<Variante> {
    identificador(articuloId, 'articuloId');
    entero(datos.existencia, 0, 'existencia');
    const { data, error } = await this.db.from('variantes').insert({
      articulo_id: articuloId, talla_medida: texto(datos.tallaMedida, 'tallaMedida'), existencia: datos.existencia,
    }).select('*').single();
    comprobarError(error);
    return convertirVariante(requerido(data, 'No se obtuvo la variante creada.'));
  }

  async gestionarVariante(articuloId:number,id:number|null,tallaMedida:string,recargo:number,activo:boolean):Promise<Articulo>{
    identificador(articuloId);if(id!==null)identificador(id);importe(recargo);
    if(typeof tallaMedida!=='string'||!tallaMedida.trim()||tallaMedida.trim().length>80||typeof activo!=='boolean')throw new ErrorDatos('Revisa talla, recargo y estado de la variante.','VALIDACION');
    // PostgreSQL admite NULL en p_id para el alta; los tipos generados omiten esa nulabilidad.
    const{error}=await this.db.rpc('gestionar_variante',{p_articulo_id:articuloId,p_id:id as number,p_talla:tallaMedida.trim(),p_recargo:recargo,p_activo:activo});
    if(error?.code==='23505')throw new ErrorDatos('Ya existe una variante con esa talla o medida.','VALIDACION');comprobarError(error);
    return requerido(await this.obtenerPorId(articuloId),'Artículo no encontrado.');
  }

  async ajustarExistencia(varianteId: number, cambio: number): Promise<Variante> {
    identificador(varianteId, 'varianteId');
    if (cambio < 0) entero(-cambio, 1, 'cambio'); else entero(cambio, 0, 'cambio');
    const { data, error } = await this.db.rpc('ajustar_existencia', { p_variante_id: varianteId, p_cambio: cambio }).single();
    comprobarError(error);
    return convertirVariante(requerido(data, 'No se obtuvo la variante actualizada.'));
  }

  async subirFotografia(contenido: Uint8Array, tipo: string, usuarioId: string): Promise<string> {
    validarFotografia(contenido, tipo);
    if (!/^[\da-f-]{36}$/i.test(usuarioId)) throw new Error('La identidad del personal no es válida.');
    const ruta = `productos/${usuarioId}/${crypto.randomUUID()}.${extensionesFotografia[tipo]}`;
    const { error } = await this.db.storage.from('catalogo').upload(ruta, contenido, {
      contentType: tipo, upsert: false, cacheControl: '31536000',
    });
    if (error) throw new ErrorDatos('No se pudo subir la imagen. Intenta nuevamente.', 'STORAGE', error.message);
    return this.db.storage.from('catalogo').getPublicUrl(ruta).data.publicUrl;
  }
}
