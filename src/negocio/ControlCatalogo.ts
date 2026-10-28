import type { Articulo, ArticuloNuevo, CambiosArticulo } from '../models.js';
import type { ArticuloRepository } from '../repositories/ArticuloRepository.js';
import { entero, importe, texto } from '../validation.js';
import { ErrorDatos } from '../errors.js';
import { ErrorNegocio, idValido } from './ErrorNegocio.js';

export interface ConsultaArticulos {
  listarCatalogo(limite?: number, desde?: number): Promise<Articulo[]>;
  listar(limite?: number, desde?: number): Promise<Articulo[]>;
  obtenerPublicoPorId(id: number): Promise<Articulo | null>;
  obtenerPorId(id: number): Promise<Articulo | null>;
}

export interface ArticuloCatalogo extends Omit<Articulo, 'precioBase'> {
  precioBase: number | null;
  existenciaTotal: number;
}
export type EscrituraArticulos = Pick<ArticuloRepository, 'crear' | 'actualizar' | 'ajustarExistencia' | 'subirFotografia'> & Partial<Pick<ArticuloRepository,'gestionarVariante'>>;

export class ControlCatalogo {
  constructor(private readonly articulos: ConsultaArticulos, private readonly escritura?: EscrituraArticulos) {}

  async crear(datos: ArticuloNuevo): Promise<ArticuloCatalogo> {
    const ficha = this.validarFicha(datos);
    if (!Array.isArray(datos.variantes) || !datos.variantes.length) throw new ErrorNegocio('Agrega al menos una variante; utiliza Única si no tiene talla.');
    const tallas = new Set<string>();
    const variantes = datos.variantes.map(variante => {
      const tallaMedida = texto(variante.tallaMedida, 'Talla / medida');
      const clave = tallaMedida.toLocaleLowerCase('es');
      if (tallas.has(clave)) throw new ErrorNegocio('Cada talla o medida debe aparecer una sola vez.');
      tallas.add(clave); entero(variante.existencia, 0, 'Existencia');
      return { tallaMedida, existencia: variante.existencia };
    });
    return this.presentar(await this.escribir().crear({ ...datos, ...ficha, variantes }), true);
  }

  async actualizar(id: number, cambios: CambiosArticulo): Promise<ArticuloCatalogo> {
    await this.detalle(id, true);
    const ficha = this.validarFicha(cambios);
    if (!Object.keys(ficha).length) throw new ErrorNegocio('No hay datos para actualizar.');
    return this.presentar(await this.escribir().actualizar(id, ficha), true);
  }

  async ajustarExistencia(id: number, varianteId: number, cambio: number): Promise<ArticuloCatalogo> {
    idValido(varianteId);
    if (!Number.isInteger(cambio) || !cambio || Math.abs(cambio) > 2147483647) throw new ErrorNegocio('El ajuste debe ser un entero distinto de cero.');
    const articulo = await this.detalle(id, true);
    if (!articulo.variantes.some(v => v.id === varianteId)) throw new ErrorNegocio('La variante no pertenece a este artículo.', 'NO_ENCONTRADO');
    try { await this.escribir().ajustarExistencia(varianteId, cambio); }
    catch (error) {
      if (error instanceof ErrorDatos && error.codigo === '23514') throw new ErrorNegocio('No puedes retirar más unidades de las disponibles. Actualiza la ficha y revisa el ajuste.');
      if (error instanceof ErrorDatos && error.codigo === '22003') throw new ErrorNegocio('El ajuste supera la cantidad máxima de existencias permitida.');
      throw error;
    }
    return this.detalle(id, true);
  }

  async subirFotografia(contenido: Uint8Array, tipo: string, usuarioId: string): Promise<string> {
    return this.escribir().subirFotografia(contenido, tipo, usuarioId);
  }

  async gestionarVariante(articuloId:number,id:number|null,talla:string,recargo:number,activo:boolean):Promise<ArticuloCatalogo>{
    await this.detalle(articuloId,true);if(id!==null)idValido(id);importe(recargo);
    const escritura=this.escribir();if(!escritura.gestionarVariante)throw new ErrorNegocio('La gestión de variantes no está disponible.');
    return this.presentar(await escritura.gestionarVariante(articuloId,id,talla,recargo,activo),true);
  }

  private escribir(): EscrituraArticulos {
    if (!this.escritura) throw new ErrorNegocio('Esta operación requiere el acceso del personal.');
    return this.escritura;
  }

  private validarFicha(datos: CambiosArticulo): CambiosArticulo {
    const ficha: CambiosArticulo = {};
    if(datos.activo!==undefined){if(typeof datos.activo!=='boolean')throw new ErrorNegocio('Estado del artículo inválido.');ficha.activo=datos.activo;}
    if (datos.nombre !== undefined) ficha.nombre = texto(datos.nombre, 'Nombre');
    if (datos.categoria !== undefined) ficha.categoria = texto(datos.categoria, 'Categoría');
    if (datos.precioBase !== undefined) { importe(datos.precioBase); ficha.precioBase = datos.precioBase; }
    if (datos.sobrePedido !== undefined) {
      if (typeof datos.sobrePedido !== 'boolean') throw new ErrorNegocio('Sobre pedido debe ser verdadero o falso.');
      ficha.sobrePedido = datos.sobrePedido;
    }
    if (datos.fotografia !== undefined) {
      const ruta = datos.fotografia.trim();
      if (ruta && !/^https:\/\/[^\s]+$/.test(ruta)) throw new ErrorNegocio('La fotografía debe ser una URL HTTPS válida.');
      ficha.fotografia = ruta;
    }
    return ficha;
  }

  async listar(personal = false, limite = 100, desde = 0): Promise<ArticuloCatalogo[]> {
    const resultados = personal
      ? await this.articulos.listar(limite, desde)
      : await this.articulos.listarCatalogo(limite, desde);
    return resultados.map(articulo => this.presentar(articulo, personal));
  }

  async detalle(id: number, personal = false): Promise<ArticuloCatalogo> {
    idValido(id);
    const articulo = personal
      ? await this.articulos.obtenerPorId(id)
      : await this.articulos.obtenerPublicoPorId(id);
    if (!articulo) throw new ErrorNegocio('No se encontró el artículo disponible.', 'NO_ENCONTRADO');
    return this.presentar(articulo, personal);
  }

  private presentar(articulo: Articulo, personal: boolean): ArticuloCatalogo {
    return {
      ...articulo,
      precioBase: !personal && articulo.sobrePedido ? null : articulo.precioBase,
      existenciaTotal: articulo.variantes.reduce((suma, variante) => suma + (variante.activo===false?0:variante.existencia), 0),
    };
  }
}
