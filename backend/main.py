import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import engine, Base
from routers import orders, whatsapp

load_dotenv()

# Crea las tablas si no existen (en producción usar el schema.sql / migraciones)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="API Delivery Agua & Gas",
    description="Backend para PWA de clientes, módulo de repartidores y webhook de WhatsApp.",
    version="1.0.0",
)

# CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(orders.router)
app.include_router(whatsapp.router)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "delivery-agua-gas"}
