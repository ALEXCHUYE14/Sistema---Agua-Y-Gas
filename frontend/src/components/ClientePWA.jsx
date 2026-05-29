import React, { useState } from "react";
import {
  Droplet,
  Flame,
  Plus,
  Minus,
  MapPin,
  Loader2,
  CheckCircle2,
  ShoppingCart,
} from "lucide-react";
import { useStore, PRODUCTOS } from "../store/useStore";
import { api } from "../api/client";

const ICONOS = { agua: Droplet, gas: Flame };

export default function ClientePWA() {
  const {
    carrito,
    cliente,
    direccion,
    setCliente,
    setDireccion,
    incrementar,
    decrementar,
    resetCarrito,
    totalCarrito,
    itemsCarrito,
  } = useStore();

  const [geoLoading, setGeoLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tipo, texto }

  const total = totalCarrito();
  const hayItems = Object.keys(carrito).length > 0;

  const detectarUbicacion = () => {
    if (!navigator.geolocation) {
      setMensaje({ tipo: "error", texto: "Tu dispositivo no soporta geolocalización." });
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setDireccion({
          coordenadas: { lat: latitude, lng: longitude },
          texto:
            direccion.texto ||
            `Ubicación detectada (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`,
        });
        setGeoLoading(false);
        setMensaje({ tipo: "ok", texto: "Ubicación detectada correctamente." });
      },
      (err) => {
        setGeoLoading(false);
        setMensaje({
          tipo: "error",
          texto: "No se pudo obtener la ubicación. Activa el GPS y los permisos.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const confirmarPedido = async () => {
    setMensaje(null);

    if (!hayItems) {
      setMensaje({ tipo: "error", texto: "Agrega al menos un producto." });
      return;
    }
    if (!cliente.nombre.trim() || !cliente.telefono.trim()) {
      setMensaje({ tipo: "error", texto: "Completa tu nombre y teléfono." });
      return;
    }
    if (!direccion.texto.trim()) {
      setMensaje({ tipo: "error", texto: "Ingresa o detecta tu dirección." });
      return;
    }

    const payload = {
      cliente_nombre: cliente.nombre.trim(),
      cliente_telefono: cliente.telefono.trim(),
      direccion_texto: direccion.texto.trim(),
      coordenadas: direccion.coordenadas,
      items: itemsCarrito(),
    };

    try {
      setEnviando(true);
      const res = await api.crearPedido(payload);
      setMensaje({
        tipo: "ok",
        texto: `¡Pedido #${res.id} confirmado! Total: S/ ${Number(res.total).toFixed(2)}`,
      });
      resetCarrito();
    } catch (e) {
      setMensaje({ tipo: "error", texto: e.message || "Error al crear el pedido." });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-40">
      {/* Header */}
      <header className="bg-agua text-white px-5 py-5 shadow-md">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Droplet className="w-7 h-7" /> AquaGas
        </h1>
        <p className="text-agua-light text-sm">Agua y gas a tu puerta</p>
      </header>

      <main className="px-4 py-5 space-y-6 max-w-md mx-auto">
        {/* Catálogo */}
        <section>
          <h2 className="text-lg font-semibold text-slate-700 mb-3">
            Elige tus productos
          </h2>
          <div className="space-y-4">
            {PRODUCTOS.map((prod) => {
              const Icono = ICONOS[prod.tipo];
              const cantidad = carrito[prod.id] || 0;
              const esAgua = prod.tipo === "agua";
              return (
                <div
                  key={prod.id}
                  className={`rounded-2xl p-4 shadow-sm border-2 ${
                    esAgua
                      ? "bg-agua-light/40 border-agua/30"
                      : "bg-gas-light/40 border-gas/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                        esAgua ? "bg-agua" : "bg-gas"
                      }`}
                    >
                      <Icono className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{prod.nombre}</p>
                      <p className="text-slate-600 text-sm">
                        S/ {prod.precio.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Contador */}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-slate-500">Cantidad</span>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => decrementar(prod.id)}
                        disabled={cantidad === 0}
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow active:scale-95 disabled:opacity-30 ${
                          esAgua ? "bg-agua-dark" : "bg-gas-dark"
                        }`}
                      >
                        <Minus className="w-6 h-6" />
                      </button>
                      <span className="text-2xl font-bold w-8 text-center text-slate-800">
                        {cantidad}
                      </span>
                      <button
                        onClick={() => incrementar(prod.id)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow active:scale-95 ${
                          esAgua ? "bg-agua" : "bg-gas"
                        }`}
                      >
                        <Plus className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Datos del cliente */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-700">Tus datos</h2>
          <input
            type="text"
            placeholder="Nombre completo"
            value={cliente.nombre}
            onChange={(e) => setCliente({ nombre: e.target.value })}
            className="w-full px-4 py-4 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-agua outline-none"
          />
          <input
            type="tel"
            placeholder="Teléfono (ej. +51999000003)"
            value={cliente.telefono}
            onChange={(e) => setCliente({ telefono: e.target.value })}
            className="w-full px-4 py-4 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-agua outline-none"
          />
        </section>

        {/* Dirección */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-700">Entrega</h2>
          <input
            type="text"
            placeholder="Dirección de entrega"
            value={direccion.texto}
            onChange={(e) => setDireccion({ texto: e.target.value })}
            className="w-full px-4 py-4 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-agua outline-none"
          />
          <button
            onClick={detectarUbicacion}
            disabled={geoLoading}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-agua-dark text-white font-semibold text-base active:scale-[0.98] disabled:opacity-60"
          >
            {geoLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <MapPin className="w-5 h-5" />
            )}
            {geoLoading ? "Detectando..." : "Detectar mi ubicación"}
          </button>
          {direccion.coordenadas && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              GPS: {direccion.coordenadas.lat.toFixed(5)},{" "}
              {direccion.coordenadas.lng.toFixed(5)}
            </p>
          )}
        </section>

        {/* Mensaje de estado */}
        {mensaje && (
          <div
            className={`rounded-xl p-4 text-sm font-medium ${
              mensaje.tipo === "ok"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {mensaje.texto}
          </div>
        )}
      </main>

      {/* Barra fija de confirmación */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 shadow-2xl">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 flex items-center gap-1">
              <ShoppingCart className="w-5 h-5" /> Total
            </span>
            <span className="text-2xl font-bold text-slate-800">
              S/ {total.toFixed(2)}
            </span>
          </div>
          <button
            onClick={confirmarPedido}
            disabled={enviando || !hayItems}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-green-600 text-white font-bold text-lg active:scale-[0.98] disabled:opacity-50"
          >
            {enviando ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
            {enviando ? "Enviando..." : "Confirmar Pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}
