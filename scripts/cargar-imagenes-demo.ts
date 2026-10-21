import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/database.types.js';

async function main() {
  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url?.startsWith('https://nugyfjtbfhtllgomlnob.supabase.co') || !clave) throw new Error('Esta carga corresponde al proyecto GaboStore existente y requiere su clave privada en .env.');
  const db = createClient<Database>(url, clave, { auth: { persistSession: false, autoRefreshToken: false } });
  const asignaciones = [{ id: 2, sufijo: ' - Camisa básica', imagen: 'camisa-basica' }, { id: 3, sufijo: ' - Gorra', imagen: 'gorra' },
    { id: 4, sufijo: ' - Camisa', imagen: 'camisa' }, { id: 5, sufijo: ' - Camisa', imagen: 'camisa' }];
  const { data, error } = await db.from('articulos').select('id,nombre,fotografia').in('id', asignaciones.map(a => a.id));
  if (error) throw error;
  const subidas = new Set<string>(); const actualizados: number[] = []; const conservados: number[] = [];
  for (const a of asignaciones) {
    const articulo = data.find(item => item.id === a.id);
    if (!articulo?.nombre.startsWith('DEMO ') || !articulo.nombre.endsWith(a.sufijo)) throw new Error(`El artículo ${a.id} no coincide con la demo esperada. No se modificó.`);
    const ruta = `demo/${a.imagen}.webp`;
    const fotografia = db.storage.from('catalogo').getPublicUrl(ruta).data.publicUrl;
    if (articulo.fotografia) { conservados.push(a.id); continue; }
    if (!subidas.has(ruta)) {
      const archivo = await readFile(new URL(`../assets/productos-demo/${a.imagen}.webp`, import.meta.url));
      const carga = await db.storage.from('catalogo').upload(ruta, archivo, { contentType: 'image/webp', upsert: false, cacheControl: '31536000' });
      if (carga.error && !('statusCode' in carga.error && String(carga.error.statusCode) === '409')) throw carga.error;
      subidas.add(ruta);
    }
    // No sustituir una fotografía agregada por el personal durante esta ejecución.
    const cambio = await db.from('articulos').update({ fotografia }).eq('id', a.id).eq('fotografia', '').select('id');
    if (cambio.error) throw cambio.error;
    if (cambio.data.length) actualizados.push(a.id); else conservados.push(a.id);
  }
  console.log(JSON.stringify({ resultado: 'OK', actualizados, conservados, tipo: 'Imágenes ilustrativas de demo' }, null, 2));
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Falló la carga de imágenes.'); process.exitCode = 1; });
