import { supabase } from "../lib/supabase";
import { PRODUCTOS } from "../store/useStore";

export const api = {
  crearPedido: async (data) => {
    // 1. Buscar o crear usuario por teléfono
    let usuarioId;
    const { data: existente } = await supabase
      .from("usuarios")
      .select("id")
      .eq("telefono", data.cliente_telefono)
      .maybeSingle();

    if (existente) {
      usuarioId = existente.id;
    } else {
      const { data: nuevo, error: errUsuario } = await supabase
        .from("usuarios")
        .insert({ nombre: data.cliente_nombre, telefono: data.cliente_telefono, rol: "cliente" })
        .select("id")
        .single();
      if (errUsuario) throw new Error(errUsuario.message);
      usuarioId = nuevo.id;
    }

    // 2. Crear dirección
    const dirPayload = {
      usuario_id: usuarioId,
      direccion_texto: data.direccion_texto,
      es_principal: true,
    };
    if (data.coordenadas) {
      dirPayload.coordenadas = `POINT(${data.coordenadas.lng} ${data.coordenadas.lat})`;
    }
    const { data: dir, error: errDir } = await supabase
      .from("direcciones")
      .insert(dirPayload)
      .select("id")
      .single();
    if (errDir) throw new Error(errDir.message);

    // 3. Calcular total
    const preciosPorId = Object.fromEntries(PRODUCTOS.map((p) => [p.id, p.precio]));
    const total = data.items.reduce(
      (acc, item) => acc + (preciosPorId[item.producto_id] || 0) * item.cantidad,
      0
    );

    // 4. Crear pedido
    const { data: pedido, error: errPedido } = await supabase
      .from("pedidos")
      .insert({ cliente_id: usuarioId, direccion_id: dir.id, total, origen: "app" })
      .select("id, total")
      .single();
    if (errPedido) throw new Error(errPedido.message);

    // 5. Crear items del pedido
    const items = data.items.map((item) => ({
      pedido_id: pedido.id,
      producto_id: item.producto_id,
      cantidad: item.cantidad,
      precio_unitario: preciosPorId[item.producto_id] || 0,
    }));
    const { error: errItems } = await supabase.from("pedido_items").insert(items);
    if (errItems) throw new Error(errItems.message);

    return pedido;
  },

  listarPedidos: async (params = {}) => {
    let query = supabase
      .from("pedidos")
      .select(`
        *,
        items:pedido_items(*),
        cliente:usuarios!pedidos_cliente_id_fkey(nombre, telefono),
        direccion:direcciones!pedidos_direccion_id_fkey(direccion_texto)
      `)
      .order("creado_at", { ascending: false });

    if (params.estado) query = query.eq("estado", params.estado);
    if (params.repartidor_id) query = query.eq("repartidor_id", params.repartidor_id);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  },

  actualizarEstado: async (id, data) => {
    const { data: pedido, error } = await supabase
      .from("pedidos")
      .update({ estado: data.estado, actualizado_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, estado, total")
      .single();
    if (error) throw new Error(error.message);
    return pedido;
  },

  listarProductos: async () => {
    const { data, error } = await supabase
      .from("productos")
      .select("*")
      .eq("activo", true);
    if (error) throw new Error(error.message);
    return data;
  },
};
