import { ErrorDatos } from './errors.js';

export const limiteFotografia = 5 * 1024 * 1024;
export const extensionesFotografia: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export function validarFotografia(contenido: Uint8Array, tipo: string): void {
  if (!extensionesFotografia[tipo]) throw new ErrorDatos('Elige una imagen JPEG, PNG o WebP.', 'VALIDACION');
  if (!contenido.length || contenido.length > limiteFotografia) throw new ErrorDatos('La imagen debe pesar entre 1 byte y 5 MiB.', 'VALIDACION');
  const coincide = (valores: number[], inicio = 0) => valores.every((valor, indice) => contenido[inicio + indice] === valor);
  const valida = tipo === 'image/jpeg' ? coincide([255, 216, 255])
    : tipo === 'image/png' ? coincide([137, 80, 78, 71, 13, 10, 26, 10])
    : coincide([82, 73, 70, 70]) && coincide([87, 69, 66, 80], 8);
  if (!valida) throw new ErrorDatos('El contenido del archivo no coincide con el formato de imagen.', 'VALIDACION');
}
