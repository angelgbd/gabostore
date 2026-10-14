import type { PostgrestError } from '@supabase/supabase-js';

export class ErrorDatos extends Error {
  readonly codigo: string;
  readonly detalle: string | undefined;

  constructor(mensaje: string, codigo: string, detalle?: string) {
    super(mensaje);
    this.name = 'ErrorDatos';
    this.codigo = codigo;
    this.detalle = detalle;
  }
}

export function comprobarError(error: PostgrestError | null): void {
  if (error) throw new ErrorDatos(error.message, error.code, error.details);
}

export function requerido<T>(valor: T | null, mensaje: string): T {
  if (valor === null) throw new ErrorDatos(mensaje, 'NO_ENCONTRADO');
  return valor;
}
