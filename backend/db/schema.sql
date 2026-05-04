CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE negocios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  whatsapp TEXT,
  whatsapp_phone_id TEXT UNIQUE,
  google_calendar_id TEXT,
  google_credentials JSONB,
  horarios JSONB,
  prompt_personalizado TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  negocio_id UUID REFERENCES negocios(id) ON DELETE CASCADE,
  nombre TEXT,
  whatsapp TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(negocio_id, whatsapp)
);

CREATE TABLE citas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  negocio_id UUID REFERENCES negocios(id) ON DELETE CASCADE,
  cliente_nombre TEXT,
  cliente_whatsapp TEXT,
  servicio TEXT,
  fecha_hora TIMESTAMPTZ,
  google_event_id TEXT,
  estado TEXT DEFAULT 'confirmada',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  negocio_id UUID REFERENCES negocios(id) ON DELETE CASCADE,
  cliente_whatsapp TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('user', 'assistant')),
  contenido TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_citas_negocio ON citas(negocio_id);
CREATE INDEX idx_citas_fecha ON citas(fecha_hora);
CREATE INDEX idx_conversaciones_cliente ON conversaciones(negocio_id, cliente_whatsapp);
