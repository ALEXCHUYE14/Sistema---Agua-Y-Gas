from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import Point
from decimal import Decimal

from database import get_db
from models import Usuario, Direccion, Producto, Pedido, PedidoItem, RolUsuario, EstadoPedido
import schemas

router = APIRouter(prefix="/orders", tags=["Pedidos"])


def _serializar_pedido(pedido: Pedido) -> dict:
    """Convierte un Pedido ORM a un dict compatible con PedidoOut (extrae lat/lng del geometry)."""
    lat = lng = None
    if pedido.direccion and pedido.direccion.coordenadas is not None:
        punto = to_shape(pedido.direccion.coordenadas)
        lng, lat = punto.x, punto.y

    return {
        "id": pedido.id,
        "estado": pedido.estado.value,
        "total": pedido.total,
        "origen": pedido.origen,
        "creado_at": pedido.creado_at,
        "cliente": {
            "id": pedido.cliente.id,
            "nombre": pedido.cliente.nombre,
            "telefono": pedido.cliente.telefono,
        },
        "direccion": {
            "id": pedido.direccion.id,
            "direccion_texto": pedido.direccion.direccion_texto,
            "lat": lat,
            "lng": lng,
        },
        "items": [
            {
                "producto_id": it.producto_id,
                "cantidad": it.cantidad,
                "precio_unitario": it.precio_unitario,
            }
            for it in pedido.items
        ],
    }


def _cargar_pedido_completo(db: Session, pedido_id: int) -> Pedido:
    stmt = (
        select(Pedido)
        .options(
            selectinload(Pedido.cliente),
            selectinload(Pedido.direccion),
            selectinload(Pedido.items),
        )
        .where(Pedido.id == pedido_id)
    )
    return db.execute(stmt).scalar_one_or_none()


@router.post("", response_model=schemas.PedidoOut, status_code=status.HTTP_201_CREATED)
def crear_pedido(payload: schemas.PedidoCreate, db: Session = Depends(get_db)):
    # 1. Buscar o crear cliente por teléfono
    cliente = db.execute(
        select(Usuario).where(Usuario.telefono == payload.cliente_telefono)
    ).scalar_one_or_none()

    if cliente is None:
        cliente = Usuario(
            nombre=payload.cliente_nombre,
            telefono=payload.cliente_telefono,
            rol=RolUsuario.cliente,
        )
        db.add(cliente)
        db.flush()

    # 2. Crear dirección
    geom = None
    if payload.coordenadas:
        geom = from_shape(
            Point(payload.coordenadas.lng, payload.coordenadas.lat), srid=4326
        )

    direccion = Direccion(
        usuario_id=cliente.id,
        direccion_texto=payload.direccion_texto,
        coordenadas=geom,
    )
    db.add(direccion)
    db.flush()

    # 3. Validar productos y calcular total
    total = Decimal("0.00")
    items_orm = []
    for item in payload.items:
        producto = db.get(Producto, item.producto_id)
        if producto is None or not producto.activo:
            raise HTTPException(
                status_code=400, detail=f"Producto {item.producto_id} no disponible"
            )
        if producto.stock < item.cantidad:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para '{producto.nombre}' (disponible: {producto.stock})",
            )
        subtotal = producto.precio * item.cantidad
        total += subtotal
        producto.stock -= item.cantidad  # descuento de stock
        items_orm.append(
            PedidoItem(
                producto_id=producto.id,
                cantidad=item.cantidad,
                precio_unitario=producto.precio,
            )
        )

    # 4. Crear pedido
    pedido = Pedido(
        cliente_id=cliente.id,
        direccion_id=direccion.id,
        total=total,
        estado=EstadoPedido.pendiente,
        origen="app",
        items=items_orm,
    )
    db.add(pedido)
    db.commit()

    pedido = _cargar_pedido_completo(db, pedido.id)
    return _serializar_pedido(pedido)


@router.get("", response_model=list[schemas.PedidoOut])
def listar_pedidos(
    estado: schemas.EstadoPedidoEnum | None = None,
    repartidor_id: int | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(Pedido).options(
        selectinload(Pedido.cliente),
        selectinload(Pedido.direccion),
        selectinload(Pedido.items),
    )
    if estado:
        stmt = stmt.where(Pedido.estado == EstadoPedido(estado.value))
    if repartidor_id is not None:
        stmt = stmt.where(Pedido.repartidor_id == repartidor_id)

    stmt = stmt.order_by(Pedido.creado_at.desc())
    pedidos = db.execute(stmt).scalars().all()
    return [_serializar_pedido(p) for p in pedidos]


@router.patch("/{pedido_id}/status", response_model=schemas.PedidoOut)
def actualizar_estado(
    pedido_id: int, payload: schemas.EstadoUpdate, db: Session = Depends(get_db)
):
    pedido = db.get(Pedido, pedido_id)
    if pedido is None:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    # Asignar repartidor si viene en el payload
    if payload.repartidor_id is not None:
        repartidor = db.get(Usuario, payload.repartidor_id)
        if repartidor is None or repartidor.rol != RolUsuario.repartidor:
            raise HTTPException(status_code=400, detail="Repartidor inválido")
        pedido.repartidor_id = payload.repartidor_id

    pedido.estado = EstadoPedido(payload.estado.value)
    db.commit()

    pedido = _cargar_pedido_completo(db, pedido_id)
    return _serializar_pedido(pedido)
