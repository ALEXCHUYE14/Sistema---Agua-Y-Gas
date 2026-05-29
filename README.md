# AquaGas Delivery 🚰🔥

Sistema completo de delivery de agua de mesa y gas:
- **PWA para Clientes** (React + Vite + Tailwind)
- **Módulo de Repartidores** en tiempo real
- **Webhook de WhatsApp** para pedidos automáticos
- **Backend** FastAPI + PostgreSQL/PostGIS

---

## Estructura

```
proyecto-delivery/
├── backend/      → API FastAPI (Python)
└── frontend/     → PWA React (Vite)
```

---

## 1. Requisitos previos

- **Python 3.11+**
- **Node.js 18+**
- **PostgreSQL 14+** con extensión **PostGIS**

---

## 2. Configurar la Base de Datos

Crea la base de datos y ejecuta el schema:

```bash
# Crear base de datos
createdb delivery_db

# Cargar tablas + datos de prueba (seed)
psql -U postgres -d delivery_db -f backend/schema.sql
```

> Si tu usuario/clave de PostgreSQL es distinto, edita `backend/.env`.

---

## 3. Levantar el Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate     # En Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend disponible en: **http://localhost:8000**
Documentación interactiva (Swagger): **http://localhost:8000/docs**

---

## 4. Levantar el Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend disponible en: **http://localhost:5173**

- Vista Cliente: `http://localhost:5173/`
- Vista Repartidor: `http://localhost:5173/repartidor`

> Usa el botón flotante arriba a la derecha para cambiar entre vistas.

---

## 5. Probar el flujo completo

### a) Crear un pedido desde la app
Abre la vista Cliente, agrega productos, completa tus datos y confirma.
El pedido se crea con estado `pendiente`.

### b) Asignar repartidor y poner "en camino"
El módulo de repartidor muestra pedidos en estado `en_camino`. Para mover un
pedido de `pendiente` a `en_camino` con repartidor (normalmente desde un panel
admin), usa el endpoint desde Swagger o curl:

```bash
curl -X PATCH http://localhost:8000/orders/1/status \
  -H "Content-Type: application/json" \
  -d '{"estado":"en_camino","repartidor_id":2}'
```

Ahora aparecerá en la Vista Repartidor.

### c) Probar el webhook de WhatsApp
```bash
curl -X POST http://localhost:8000/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+51987654321","message":"Quiero 2 bidones de agua y 1 gas, direccion Av. Brasil 450","profile_name":"Juan"}'
```

Esto crea automáticamente un pedido `pendiente` con origen `whatsapp`.

---

## 6. Notas

- **Iconos PWA:** agrega `icon-192.png` e `icon-512.png` dentro de `frontend/public/`
  para que la instalación de la PWA sea completa.
- **Variables de entorno:** `backend/.env` y `frontend/.env` ya vienen configurados
  para desarrollo local.
- **Paleta de colores:** cyan = agua, naranja/rojo = gas, verde = éxito/WhatsApp.

---

## Stack

| Capa       | Tecnología                          |
|------------|-------------------------------------|
| Frontend   | React, Vite, Tailwind, Zustand      |
| Iconos     | lucide-react                        |
| Backend    | Python, FastAPI, SQLAlchemy         |
| Base datos | PostgreSQL + PostGIS                 |
