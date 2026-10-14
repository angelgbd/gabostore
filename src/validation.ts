import { ErrorDatos } from './errors.js';

export function identificador(valor: number, campo = 'id'): void {
  if (!Number.isSafeInteger(valor) || valor <= 0) {
    throw new ErrorDatos(`${campo} debe ser un entero positivo seguro.`, 'VALIDACION');
  }
}

export function entero(valor: number, minimo: number, campo: string): void {
  if (!Number.isInteger(valor) || valor < minimo || valor > 2_147_483_647) {
    throw new ErrorDatos(`${campo} debe ser un entero entre ${minimo} y 2147483647.`, 'VALIDACION');
  }
}

export function importe(valor: number): void {
  const centavos = valor * 100;
  if (!Number.isFinite(valor) || valor < 0 || valor > 99_999_999.99
      || Math.abs(centavos - Math.round(centavos)) > 0.00001) {
    throw new ErrorDatos('El precio debe ser positivo o cero y tener hasta dos decimales.', 'VALIDACION');
  }
}

export function texto(valor: string, campo: string): string {
  if (!valor.trim()) throw new ErrorDatos(`${campo} no puede estar vacío.`, 'VALIDACION');
  return valor.trim();
}

export function correo(valor: string): string {
  const normalizado = texto(valor, 'correoCliente').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizado)) {
    throw new ErrorDatos('correoCliente debe ser un correo válido.', 'VALIDACION');
  }
  return normalizado;
}

export function paginacion(limite: number, desde: number): void {
  entero(limite, 1, 'limite');
  entero(desde, 0, 'desde');
  if (limite > 100 || desde + limite - 1 > 2_147_483_647) {
    throw new ErrorDatos('La consulta admite como máximo 100 registros por página.', 'VALIDACION');
  }
}
