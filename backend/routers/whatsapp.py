import re
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from decimal import Decimal

from database import get_db
from models import Usuario, Direccion, Producto, Pedido, PedidoItem, RolUsuario, EstadoPedido, TipoProducto
import schemas

router = APIRouter(prefix="/webhook", tags=["WhatsApp"])


# Diccionario de palabras clave -> tipo de producto
KEYWORDS = {
    "agua": TipoProducto.agua,
    "bidon": TipoProducto.agua,
    "bidón": TipoProducto.agua,
    "botellon": TipoProducto.agua,
    "gas": TipoProducto.gas,
    "balon": TipoProducto.gas,
    "balón": TipoProducto.gas,
    "balones": TipoProducto.gas,
}


def parsear_mensaje(texto: str) -> tuple[list[tuple[TipoProducto, int]], str]:
    """
    Parsea el texto del mensaje de WhatsApp.
    Retorna: (lista de (tipo_producto, cantidad), direccion_detectada)

    Ejemplos soportados:
      "Quiero 2 bidones de agua y 1 gas para Av. Lima 123"
      "necesito 3 balones de gas, direccion Jr. Cusco 456"
    """
    texto_lower = texto.lower()
    detectados: dict[TipoProducto, int] = {}

    # Buscar patrones tipo "<numero> ... <keyword>" o "<keyword> ... <numero>"
    for palabra, tipo in KEYWORDS.items():
        for match in re.finditer(rf"(\d+)\s*\w*\s*{palabra}", texto_lower):
            cant = int(match.group(1))
            detectados[tipo] = detectados.get(tipo, 0) + cant
        # Si aparece la palabra sin número explícito y aún no se detectó, asumir 1
        if palabra in texto_lower and tipo not in detectados:
            detectados[tipo] = 1

    # Extraer dirección: heurística por palabras clave de dirección
    direccion = ""
    patron_dir = re.search(
        r"(?:direccion|dirección|direc|para|en|llevar a|entregar en)[:\s]+(.+)",
        texto,
        re.IGNORECASE,
    )
    if patron_dir:
        direccion = patron_dir.group(1).strip()
    else:
        # Fallback: buscar algo que parezca dirección (Av., Jr., Calle, Mz.)
        patron_via = re.search(
            r"((?:av\.?|jr\.?|calle|mz\.?|pasaje|psje\.?)\s+.+)",
            texto,
            re.IGNORECASE,
        )
        direccion = patron_via.group(1).strip() if patron_via else "Dirección no especificada (vía WhatsApp)"

    items = [(tipo, cant) for tipo, cant in detectados.items() if cant > 0]
    return items, direccion


@router.post("/whatsapp", response_model=schemas.WhatsAppWebhookOut)
def recibir_whatsapp(payload: schemas.WhatsAppWebhookIn, db: Session = Depends(get_db)):
    items_parseados, direccion_texto = parsear_mensaje(payload.message)

    if not items_parseados:
        return schemas.WhatsAppWebhookOut(
            success=False,
            detalle="No se detectaron productos en el mensaje. Solicite al cliente especificar agua o gas.",
            productos_detectados=[],
        )

    # 1. Buscar o crear cliente por teléfono
    cliente = db.execute(
        select(Usuario).where(Usuario.telefono == payload.phone)
    ).scalar_one_or_none()

    if cliente is None:
        cliente = Usuario(
            nombre=payload.profile_name or f"Cliente WhatsApp {payload.phone[-4:]}",
            telefono=payload.phone,
            rol=RolUsuario.cliente,
        )
        db.add(cliente)
        db.flush()

    # 2. Crear dirección (sin coordenadas; se geocodificará/confirmará luego)
    direccion = Direccion(
        usuario_id=cliente.id,
        direccion_texto=direccion_texto,
        coordenadas=None,
    )
    db.add(direccion)
    db.flush()

    # 3. Resolver productos por tipo y construir items
    total = Decimal("0.00")
    items_orm = []
    productos_detectados = []

    for tipo, cantidad in items_parseados:
        producto = db.execute(
            select(Producto)
            .where(Producto.tipo == tipo, Producto.activo == True)  # noqa: E712
            .order_by(Producto.precio.asc())
        ).scalars().first()

        if producto is None:
            continue

        cantidad_final = min(cantidad, producto.stock) if producto.stock > 0 else 0
        if cantidad_final == 0:
            continue

        subtotal = producto.precio * cantidad_final
        total += subtotal
        producto.stock -= cantidad_final

        items_orm.append(
            PedidoItem(
                producto_id=producto.id,
                cantidad=cantidad_final,
                precio_unitario=producto.precio,
            )
        )
        productos_detectados.append(
            {
                "producto": producto.nombre,
                "tipo": tipo.value,
                "cantidad": cantidad_final,
                "subtotal": float(subtotal),
            }
        )

    if not items_orm:
        db.rollback()
        return schemas.WhatsAppWebhookOut(
            success=False,
            detalle="Productos detectados pero sin stock disponible.",
            productos_detectados=productos_detectados,
        )

    # 4. Crear pedido pendiente
    pedido = Pedido(
        cliente_id=cliente.id,
        direccion_id=direccion.id,
        total=total,
        estado=EstadoPedido.pendiente,
        origen="whatsapp",
        items=items_orm,
    )
    db.add(pedido)
    db.commit()

    return schemas.WhatsAppWebhookOut(
        success=True,
        pedido_id=pedido.id,
        detalle=f"Pedido #{pedido.id} creado automáticamente. Total: S/ {total:.2f}. Dirección: {direccion_texto}",
        productos_detectados=productos_detectados,
    )
