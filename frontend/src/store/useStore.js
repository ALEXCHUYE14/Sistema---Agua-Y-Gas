import { create } from "zustand";

// Catálogo fijo (alineado con los IDs del seed SQL)
export const PRODUCTOS = [
  {
    id: 1,
    nombre: "Bidón de Agua 20L",
    tipo: "agua",
    precio: 7.0,
  },
  {
    id: 2,
    nombre: "Balón de Gas 10kg",
    tipo: "gas",
    precio: 45.0,
  },
];

export const useStore = create((set, get) => ({
  // Carrito: { [productoId]: cantidad }
  carrito: {},

  // Datos del cliente
  cliente: { nombre: "", telefono: "" },
  direccion: { texto: "", coordenadas: null },

  setCliente: (cliente) => set({ cliente: { ...get().cliente, ...cliente } }),
  setDireccion: (direccion) =>
    set({ direccion: { ...get().direccion, ...direccion } }),

  incrementar: (id) =>
    set((s) => ({
      carrito: { ...s.carrito, [id]: (s.carrito[id] || 0) + 1 },
    })),

  decrementar: (id) =>
    set((s) => {
      const actual = s.carrito[id] || 0;
      const nuevo = Math.max(0, actual - 1);
      const carrito = { ...s.carrito };
      if (nuevo === 0) delete carrito[id];
      else carrito[id] = nuevo;
      return { carrito };
    }),

  resetCarrito: () => set({ carrito: {} }),

  totalCarrito: () => {
    const { carrito } = get();
    return Object.entries(carrito).reduce((acc, [id, cant]) => {
      const prod = PRODUCTOS.find((p) => p.id === Number(id));
      return acc + (prod ? prod.precio * cant : 0);
    }, 0);
  },

  itemsCarrito: () => {
    const { carrito } = get();
    return Object.entries(carrito).map(([id, cantidad]) => ({
      producto_id: Number(id),
      cantidad,
    }));
  },
}));
