from sqlalchemy import (
    Column, Integer, String, Text, Numeric, Boolean,
    ForeignKey, TIMESTAMP, Enum as SAEnum, func,
)
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
import enum

from database import Base


class RolUsuario(str, enum.Enum):
    cliente = "cliente"
    repartidor = "repartidor"
    admin = "admin"


class TipoProducto(str, enum.Enum):
    agua = "agua"
    gas = "gas"


class EstadoPedido(str, enum.Enum):
    pendiente = "pendiente"
    en_camino = "en_camino"
    entregado = "entregado"
    cancelado = "cancelado"


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    telefono = Column(String(20), nullable=False, unique=True, index=True)
    rol = Column(
        SAEnum(RolUsuario, name="rol_usuario", create_type=False),
        nullable=False,
        default=RolUsuario.cliente,
    )
    creado_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    direcciones = relationship("Direccion", back_populates="usuario", cascade="all, delete")
    pedidos_cliente = relationship(
        "Pedido", foreign_keys="Pedido.cliente_id", back_populates="cliente"
    )
    pedidos_repartidor = relationship(
        "Pedido", foreign_keys="Pedido.repartidor_id", back_populates="repartidor"
    )


class Direccion(Base):
    __tablename__ = "direcciones"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    direccion_texto = Column(Text, nullable=False)
    coordenadas = Column(Geometry(geometry_type="POINT", srid=4326), nullable=True)
    es_principal = Column(Boolean, nullable=False, default=False)
    creado_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    usuario = relationship("Usuario", back_populates="direcciones")
    pedidos = relationship("Pedido", back_populates="direccion")


class Producto(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    tipo = Column(SAEnum(TipoProducto, name="tipo_producto", create_type=False), nullable=False)
    precio = Column(Numeric(10, 2), nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    activo = Column(Boolean, nullable=False, default=True)


class Pedido(Base):
    __tablename__ = "pedidos"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    repartidor_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    direccion_id = Column(Integer, ForeignKey("direcciones.id", ondelete="RESTRICT"), nullable=False)
    total = Column(Numeric(10, 2), nullable=False, default=0)
    estado = Column(
        SAEnum(EstadoPedido, name="estado_pedido", create_type=False),
        nullable=False,
        default=EstadoPedido.pendiente,
    )
    origen = Column(String(20), nullable=False, default="app")
    creado_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    actualizado_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    cliente = relationship("Usuario", foreign_keys=[cliente_id], back_populates="pedidos_cliente")
    repartidor = relationship("Usuario", foreign_keys=[repartidor_id], back_populates="pedidos_repartidor")
    direccion = relationship("Direccion", back_populates="pedidos")
    items = relationship("PedidoItem", back_populates="pedido", cascade="all, delete")


class PedidoItem(Base):
    __tablename__ = "pedido_items"

    id = Column(Integer, primary_key=True, index=True)
    pedido_id = Column(Integer, ForeignKey("pedidos.id", ondelete="CASCADE"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id", ondelete="RESTRICT"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=False)

    pedido = relationship("Pedido", back_populates="items")
    producto = relationship("Producto")
