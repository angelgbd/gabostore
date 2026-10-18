export class ErrorNegocio extends Error {
  constructor(mensaje: string, readonly codigo = 'VALIDACION') {
    super(mensaje);
    this.name = 'ErrorNegocio';
  }
}

export function idValido(id: number): void {
  if (!Number.isSafeInteger(id) || id <= 0) throw new ErrorNegocio('El identificador no es válido.');
}

export function cantidadValida(cantidad: number): void {
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 2_147_483_647) {
    throw new ErrorNegocio('La cantidad debe ser un entero mayor que cero.');
  }
}
