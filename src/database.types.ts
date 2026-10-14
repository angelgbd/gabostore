/** Tipos obtenidos del esquema real de Supabase mediante MCP. */
import type { Database } from './database.generated.js';
export type { Database, Json } from './database.generated.js';

export type ArticuloRow = Database['public']['Tables']['articulos']['Row'];
export type VarianteRow = Database['public']['Tables']['variantes']['Row'];
export type ClienteRow = Database['public']['Tables']['clientes']['Row'];
export type CarritoRow = Database['public']['Tables']['carritos']['Row'];
export type PedidoRow = Database['public']['Tables']['pedidos']['Row'];
export type ItemRow = Pick<Database['public']['Tables']['items_carrito']['Row'],
  'variante_id' | 'cantidad' | 'precio_unitario' | 'subtotal'>;
export type CatalogoRow = Database['public']['Functions']['obtener_catalogo']['Returns'][number];
