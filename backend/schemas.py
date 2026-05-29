from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from enum import Enum


# ---------- Enums ----------
class EstadoPedidoEnum(str, Enum):
    pendiente = "pendiente"
    en_camino = "en_camino"
    entregado = "entregado"
    cancelado = "cancelado"


# ---------- Items ----------
class ItemPedidoIn(BaseModel):
    producto_id: int = Field(..., gt=0)
    cantidad: int = Field(..., gt=0)


class ItemPedidoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    producto_id: int
    cantidad: int
    precio_unitario: Decimal


# ---------- Ubicación ----------
class Coordenadas(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


# ---------- Crear Pedido (desde App) ----------
class PedidoCreate(BaseModel):
    cliente_nombre: str = Field(..., min_length=2, max_length=150)
    cliente_telefono: str = Field(..., min_length=6, max_length=20)
    direccion_texto: str = Field(..., min_length=3)
    coordenadas: Optional[Coordenadas] = None
    items: List[ItemPedidoIn] = Field(..., min_length=1)


# ---------- Respuesta de Pedido ----------
class DireccionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    direccion_texto: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class ClienteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nombre: str
    telefono: str


class PedidoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    estado: EstadoPedidoEnum
    total: Decimal
    origen: str
    creado_at: datetime
    cliente: ClienteOut
    direccion: DireccionOut
    items: List[ItemPedidoOut]


# ---------- Actualizar Estado ----------
class EstadoUpdate(BaseModel):
    estado: EstadoPedidoEnum
    repartidor_id: Optional[int] = None


# ---------- Webhook WhatsApp ----------
class WhatsAppWebhookIn(BaseModel):
    """Payload simulado de la API de WhatsApp."""
    phone: str = Field(..., min_length=6, max_length=20, description="Número del remitente")
    message: str = Field(..., min_length=1, description="Texto del mensaje recibido")
    profile_name: Optional[str] = Field(None, description="Nombre del perfil de WhatsApp")


class WhatsAppWebhookOut(BaseModel):
    success: bool
    pedido_id: Optional[int] = None
    detalle: str
    productos_detectados: List[dict] = []
