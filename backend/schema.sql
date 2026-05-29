-- ============================================
-- Sistema Delivery Agua & Gas - Schema PostgreSQL + PostGIS
-- ============================================

-- Habilitar extensión PostGIS para geolocalización
CREATE EXTENSION IF NOT EXISTS postgis;

-- Limpieza (orden inverso por dependencias FK)
DROP TABLE IF EXISTS pedido_items CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS direcciones CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

DROP TYPE IF EXISTS rol_usuario CASCADE;
DROP TYPE IF EXISTS tipo_producto CASCADE;
DROP TYPE IF EXISTS estado_pedido CASCADE;

-- ENUM types
CREATE TYPE rol_usuario AS ENUM ('cliente', 'repartidor', 'admin');
CREATE TYPE tipo_producto AS ENUM ('agua', 'gas');
CREATE TYPE estado_pedido AS ENUM ('pendiente', 'en_camino', 'entregado', 'cancelado');

-- ============================================
-- TABLA: usuarios
-- ============================================
CREATE TABLE usuarios (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(150) NOT NULL,
    telefono    VARCHAR(20)  NOT NULL UNIQUE,
    rol         rol_usuario  NOT NULL DEFAULT 'cliente',
    creado_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_telefono ON usuarios(telefono);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);

-- ============================================
-- TABLA: direcciones
-- ============================================
CREATE TABLE direcciones (
    id              SERIAL PRIMARY KEY,
    usuario_id      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    direccion_texto TEXT    NOT NULL,
    coordenadas     GEOMETRY(Point, 4326),
    es_principal    BOOLEAN NOT NULL DEFAULT FALSE,
    creado_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice espacial para consultas de proximidad
CREATE INDEX idx_direcciones_coordenadas ON direcciones USING GIST(coordenadas);
CREATE INDEX idx_direcciones_usuario ON direcciones(usuario_id);

-- ============================================
-- TABLA: productos
-- ============================================
CREATE TABLE productos (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(150) NOT NULL,
    tipo    tipo_producto NOT NULL,
    precio  NUMERIC(10,2) NOT NULL CHECK (precio >= 0),
    stock   INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    activo  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_productos_tipo ON productos(tipo);

-- ============================================
-- TABLA: pedidos
-- ============================================
CREATE TABLE pedidos (
    id            SERIAL PRIMARY KEY,
    cliente_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    repartidor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    direccion_id  INTEGER NOT NULL REFERENCES direcciones(id) ON DELETE RESTRICT,
    total         NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    estado        estado_pedido NOT NULL DEFAULT 'pendiente',
    origen        VARCHAR(20) NOT NULL DEFAULT 'app', -- 'app' | 'whatsapp'
    creado_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_repartidor ON pedidos(repartidor_id);
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);

-- ============================================
-- TABLA: pedido_items (detalle de productos por pedido)
-- ============================================
CREATE TABLE pedido_items (
    id              SERIAL PRIMARY KEY,
    pedido_id       INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id     INTEGER NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad        INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0)
);

CREATE INDEX idx_pedido_items_pedido ON pedido_items(pedido_id);

-- ============================================
-- DATOS SEMILLA (SEED)
-- ============================================
INSERT INTO productos (nombre, tipo, precio, stock) VALUES
    ('Bidón de Agua 20L', 'agua', 7.00, 500),
    ('Balón de Gas 10kg', 'gas', 45.00, 200);

INSERT INTO usuarios (nombre, telefono, rol) VALUES
    ('Admin Central', '+51999000001', 'admin'),
    ('Carlos Repartidor', '+51999000002', 'repartidor'),
    ('Cliente Demo', '+51999000003', 'cliente');

-- Dirección demo del cliente (Lima centro)
INSERT INTO direcciones (usuario_id, direccion_texto, coordenadas, es_principal) VALUES
    (3, 'Av. Arequipa 123, Lince, Lima',
     ST_SetSRID(ST_MakePoint(-77.0428, -12.0464), 4326), TRUE);
