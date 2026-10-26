import { resolve } from 'node:path';
import { crearServidor } from '../src/servidor/aplicacion.js';

const url = process.env.SUPABASE_URL;
const clavePublica = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !clavePublica) throw new Error('Configura SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY en .env.');
const puerto = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) throw new Error('PORT no es un puerto válido.');
const servidor = crearServidor({ url, clavePublica, carpetaWeb: resolve('web-dist'), ...(process.env.GABOSTORE_WHATSAPP ? { whatsappNumero: process.env.GABOSTORE_WHATSAPP } : {}),
  ...(process.env.SUPABASE_SECRET_KEY ? { claveServidor: process.env.SUPABASE_SECRET_KEY } : {}) });
servidor.on('error', error => { console.error(error.message); process.exitCode = 1; });
servidor.listen(puerto, '127.0.0.1', () => console.log(`GaboStore: http://127.0.0.1:${puerto} · Catálogo público y acceso del personal.`));
for (const senal of ['SIGINT', 'SIGTERM'] as const) process.on(senal, () => { servidor.close(); });
