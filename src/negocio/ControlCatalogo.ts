import type { Articulo } from '../models.js';
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

export class ControlCatalogo {
  constructor(private readonly articulos: ConsultaArticulos) {}

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
      existenciaTotal: articulo.variantes.reduce((suma, variante) => suma + variante.existencia, 0),
    };
  }
}
