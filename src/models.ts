/** Estados del último diagrama de dominio aprobado. */
export const EstadoPedido = {
  PENDIENTE: 'PENDIENTE',
  ENVIADO: 'ENVIADO',
  ENTREGADO: 'ENTREGADO',
  CANCELADO: 'CANCELADO',
  CONFIRMADO: 'CONFIRMADO',
} as const;
export type EstadoPedido = typeof EstadoPedido[keyof typeof EstadoPedido];

export interface Variante {
  id: number;
  tallaMedida: string;
  existencia: number;
  activo?: boolean;
  recargo?: number;
}

export interface Articulo {
  id: number;
  nombre: string;
  categoria: string;
  precioBase: number;
  fotografia: string;
  sobrePedido: boolean;
  variantes: Variante[];
  activo?: boolean;
  categoriaId?: number;
}

export interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
}

export interface ItemCarrito {
  /** Identifica la asociación con Variante. */
  varianteId: number;
  cantidad: number;
  precioUnitario: number;
  readonly subtotal: number;
}

export interface Carrito {
  /** Identificador técnico para persistir y recuperar el carrito. */
  id: number;
  clienteId: number | null;
  cerrado: boolean;
  items: ItemCarrito[];
}

export interface Pedido {
  id: number;
  clienteId: number | null;
  carritoId: number;
  estado: EstadoPedido;
  fechaCreacion: string;
  origen: 'PERSONAL' | 'PUBLICO';
  venceEn: string | null;
  items: ItemCarrito[];
}

/** Datos de un pedido por guardar. PostgreSQL asigna ID, fecha y subtotales. */
export type PedidoNuevo = Pick<Pedido, 'carritoId'> & {
  clienteId: number;
  estado?: EstadoPedido;
  items: Omit<ItemCarrito, 'subtotal'>[];
};

export interface VarianteNueva {
  tallaMedida: string;
  existencia: number;
}

export interface ArticuloNuevo {
  nombre: string;
  categoria: string;
  precioBase: number;
  fotografia?: string;
  sobrePedido?: boolean;
  variantes?: VarianteNueva[];
}

export type CambiosArticulo = Partial<Omit<ArticuloNuevo, 'variantes'>> & {activo?:boolean};
export type ClienteNuevo = Omit<Cliente, 'id'>;
