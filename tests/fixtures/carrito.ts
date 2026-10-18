import type { Articulo, Carrito } from '../../src/models.js';
import { ControlCarrito, type DatosCarritos } from '../../src/negocio/ControlCarrito.js';

export function escenarioCarrito() {
  const articulo: Articulo = { id: 1, nombre: 'Camisa', categoria: 'Ropa', precioBase: 149.9, fotografia: '', sobrePedido: false,
    variantes: [{ id: 2, tallaMedida: 'M', existencia: 5 }] };
  const carrito: Carrito = { id: 4, clienteId: 3, correoCliente: 'ana@example.com', cerrado: false, items: [] };
  const cliente = { id: 3, nombre: 'Ana', telefono: '6621234567' };
  const escrituras: unknown[][] = [];
  const repositorio: DatosCarritos = {
    crearCliente: async contacto => { escrituras.push(['cliente', contacto]); return { id: 3, ...contacto }; },
    obtenerCliente: async () => cliente, abrir: async () => carrito, obtenerPorId: async () => structuredClone(carrito),
    guardarItem: async (_carritoId, varianteId, cantidad, precio) => {
      escrituras.push(['item', varianteId, cantidad, precio]);
      const anterior = carrito.items.find(i => i.varianteId === varianteId);
      const precioUnitario = precio ?? anterior?.precioUnitario ?? articulo.precioBase;
      carrito.items = [{ varianteId, cantidad, precioUnitario, subtotal: Math.round(cantidad * precioUnitario * 100) / 100 }];
      return carrito;
    },
    quitarItem: async () => { carrito.items = []; return carrito; },
  };
  const control = new ControlCarrito(repositorio, {
    obtenerPorId: async id => id === articulo.id ? articulo : null,
    obtenerPorVariante: async id => id === 2 ? articulo : null,
  });
  return { articulo, carrito, escrituras, control };
}

