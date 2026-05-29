import React, { useEffect, useState, useCallback } from "react";
import {
  Truck,
  MapPin,
  Phone,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Package,
} from "lucide-react";
import { api } from "../api/client";

// ID del repartidor logueado (en producción vendría de auth). Coincide con el seed.
const REPARTIDOR_ID = 2;

export default function RepartidorRutas() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizandoId, setActualizandoId] = useState(null);
  const [error, setError] = useState(null);

  const cargarPedidos = useCallback(async () => {
    try {
      setError(null);
      // Pedidos asignados al repartidor en estado "en_camino"
      const data = await api.listarPedidos({
        estado: "en_camino",
        repartidor_id: REPARTIDOR_ID,
      });
      setPedidos(data);
    } catch (e) {
      setError(e.message || "No se pudieron cargar los pedidos.");
    } finally {
      setCargando(false);
    }
  }, []);

  // Carga inicial + polling cada 15s (tiempo real)
  useEffect(() => {
    cargarPedidos();
    const intervalo = setInterval(cargarPedidos, 15000);
    return () => clearInterval(intervalo);
  }, [cargarPedidos]);

  const marcarEntregado = async (id) => {
    setActualizandoId(id);
    try {
      await api.actualizarEstado(id, { estado: "entregado" });
      // Quitar de la lista inmediatamente (optimista)
      setPedidos((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e.message || "Error al actualizar el estado.");
    } finally {
      setActualizandoId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-slate-800 text-white px-5 py-5 shadow-md sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-7 h-7" /> Mis Rutas
          </h1>
          <button
            onClick={cargarPedidos}
            className="w-11 h-11 rounded-full bg-slate-700 flex items-center justify-center active:scale-90"
          >
            <RefreshCw className={`w-5 h-5 ${cargando ? "animate-spin" : ""}`} />
          </button>
        </div>
        <p className="text-slate-300 text-sm mt-1">
          {pedidos.length} pedido(s) en camino
        </p>
      </header>

      <main className="px-4 py-5 space-y-4 max-w-md mx-auto">
        {error && (
          <div className="rounded-xl p-4 bg-red-100 text-red-800 text-sm font-medium">
            {error}
          </div>
        )}

        {cargando && pedidos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin mb-3" />
            <p>Cargando pedidos...</p>
          </div>
        )}

        {!cargando && pedidos.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Package className="w-12 h-12 mb-3" />
            <p className="text-lg font-medium">Sin pedidos pendientes</p>
            <p className="text-sm">Todo entregado por ahora 👍</p>
          </div>
        )}

        {/* Tarjetas grandes scannables */}
        {pedidos.map((pedido) => (
          <div
            key={pedido.id}
            className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden"
          >
            {/* Encabezado tarjeta */}
            <div className="bg-agua-light/50 px-5 py-3 flex items-center justify-between">
              <span className="font-bold text-agua-dark text-lg">
                Pedido #{pedido.id}
              </span>
              <span className="bg-agua text-white text-xs font-bold px-3 py-1 rounded-full">
                EN CAMINO
              </span>
            </div>

            <div className="px-5 py-4 space-y-3">
              {/* Cliente */}
              <div>
                <p className="text-xs uppercase text-slate-400 font-semibold">
                  Cliente
                </p>
                <p className="text-xl font-bold text-slate-800">
                  {pedido.cliente.nombre}
                </p>
              </div>

              {/* Dirección */}
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-gas mt-0.5 flex-shrink-0" />
                <p className="text-base text-slate-700 leading-snug">
                  {pedido.direccion.direccion_texto}
                </p>
              </div>

              {/* Productos */}
              <div className="flex flex-wrap gap-2">
                {pedido.items.map((it, idx) => (
                  <span
                    key={idx}
                    className="bg-slate-100 text-slate-700 text-sm font-medium px-3 py-1 rounded-lg"
                  >
                    {it.cantidad}× producto #{it.producto_id}
                  </span>
                ))}
                <span className="bg-green-100 text-green-800 text-sm font-bold px-3 py-1 rounded-lg">
                  Total: S/ {Number(pedido.total).toFixed(2)}
                </span>
              </div>

              {/* Teléfono (enlace tel:) */}
              <a
                href={`tel:${pedido.cliente.telefono}`}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-700 text-white font-semibold active:scale-[0.98]"
              >
                <Phone className="w-5 h-5" />
                Llamar: {pedido.cliente.telefono}
              </a>

              {/* Botón Entregado (prominente) */}
              <button
                onClick={() => marcarEntregado(pedido.id)}
                disabled={actualizandoId === pedido.id}
                className="w-full flex items-center justify-center gap-2 py-5 rounded-xl bg-green-600 text-white font-bold text-xl active:scale-[0.98] disabled:opacity-60"
              >
                {actualizandoId === pedido.id ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-7 h-7" />
                )}
                Marcar como Entregado
              </button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
