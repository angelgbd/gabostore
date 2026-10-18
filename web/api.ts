export class ErrorAPI extends Error {
  constructor(mensaje: string, readonly estado: number) { super(mensaje); }
}

export async function solicitar<T>(ruta: string, token?: string, metodo = 'GET', datos?: unknown): Promise<T> {
  const respuesta = await fetch(`/api/${ruta}`, {
    method: metodo,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(datos !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    ...(datos !== undefined ? { body: JSON.stringify(datos) } : {}),
  });
  const contenido = await respuesta.json() as T & { error?: string };
  if (!respuesta.ok) throw new ErrorAPI(contenido.error ?? 'No se pudo completar la operación.', respuesta.status);
  return contenido;
}

export function mensajeError(error: unknown): string {
  return error instanceof TypeError ? 'No hay conexión con el servidor. Revisa la conexión e intenta nuevamente.'
    : error instanceof Error ? error.message : 'No se pudo completar la operación.';
}
