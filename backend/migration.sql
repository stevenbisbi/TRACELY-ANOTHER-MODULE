-- ============================================================
-- TRACELY — Migración de Base de Datos v2.0
-- Sistema de Seguimiento Académico — UNICATÓLICA
-- Ejecutar en PostgreSQL con: psql -U postgres -d tracely -f migration.sql
-- ============================================================

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. ENUM types ─────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE enum_usuario_rol      AS ENUM ('estudiante', 'docente', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE enum_inscripcion_estado AS ENUM ('activa', 'finalizada');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE enum_alerta_tipo      AS ENUM ('advertencia', 'critica');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE enum_alerta_estado    AS ENUM ('activa', 'resuelta');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── 2. USUARIO ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuario (
  id_institucional    VARCHAR(255)         PRIMARY KEY,
  nombre              VARCHAR(255)         NOT NULL,
  correo              VARCHAR(255)         NOT NULL UNIQUE,
  contrasena_hash     VARCHAR(255)         NOT NULL,
  rol                 enum_usuario_rol     NOT NULL DEFAULT 'estudiante',
  reset_token         VARCHAR(255),
  reset_token_expira  TIMESTAMP,
  "createdAt"         TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

-- ── 3. CARRERA ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carrera (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre          VARCHAR(255)  NOT NULL,
  codigo          VARCHAR(255)  NOT NULL UNIQUE,
  total_creditos  INTEGER       NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── 4. SEMESTRE ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS semestre (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo        VARCHAR(10)   NOT NULL UNIQUE,
  nombre        VARCHAR(255)  NOT NULL,
  fecha_inicio  DATE          NOT NULL,
  fecha_fin     DATE          NOT NULL,
  activo        BOOLEAN       DEFAULT false,
  "createdAt"   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── 5. ESTUDIANTE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estudiante (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id       VARCHAR(255)  NOT NULL UNIQUE REFERENCES usuario(id_institucional) ON DELETE CASCADE ON UPDATE CASCADE,
  carrera_id       UUID          NOT NULL REFERENCES carrera(id) ON DELETE CASCADE ON UPDATE CASCADE,
  semestre_actual  INTEGER       NOT NULL DEFAULT 1,
  "createdAt"      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── 6. DOCENTE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS docente (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id  VARCHAR(255)  NOT NULL UNIQUE REFERENCES usuario(id_institucional) ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── 7. PENSUM ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pensum (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  carrera_id        UUID          NOT NULL REFERENCES carrera(id) ON DELETE CASCADE ON UPDATE CASCADE,
  nombre_asignatura VARCHAR(255)  NOT NULL,
  semestre          INTEGER       NOT NULL,
  creditos          INTEGER       NOT NULL DEFAULT 3,
  "createdAt"       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── 8. ASIGNATURA ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asignatura (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  docente_id          UUID          NOT NULL REFERENCES docente(id) ON DELETE CASCADE ON UPDATE CASCADE,
  pensum_id           UUID          NOT NULL REFERENCES pensum(id) ON DELETE CASCADE ON UPDATE CASCADE,
  nombre              VARCHAR(255)  NOT NULL,
  "NRC"               VARCHAR(255)  NOT NULL UNIQUE,
  semestre_academico  VARCHAR(255)  NOT NULL,
  umbral_advertencia  FLOAT         NOT NULL DEFAULT 3.0,
  "createdAt"         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── 9. CORTE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS corte (
  id               UUID     PRIMARY KEY DEFAULT uuid_generate_v4(),
  asignatura_id    UUID     NOT NULL REFERENCES asignatura(id) ON DELETE CASCADE ON UPDATE CASCADE,
  numero_corte     INTEGER  NOT NULL,
  peso_porcentual  FLOAT    NOT NULL DEFAULT 33.33,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (asignatura_id, numero_corte)
);

-- ── 10. ACTIVIDAD ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS actividad (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  corte_id            UUID          NOT NULL REFERENCES corte(id) ON DELETE CASCADE ON UPDATE CASCADE,
  nombre              VARCHAR(255)  NOT NULL,
  tipo                VARCHAR(255)  NOT NULL DEFAULT 'taller',
  porcentaje_en_corte FLOAT         NOT NULL DEFAULT 100,
  "createdAt"         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── 11. INSCRIPCION ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inscripcion (
  id               UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
  estudiante_id    UUID                    NOT NULL REFERENCES estudiante(id) ON DELETE CASCADE ON UPDATE CASCADE,
  asignatura_id    UUID                    NOT NULL REFERENCES asignatura(id) ON DELETE CASCADE ON UPDATE CASCADE,
  estado           enum_inscripcion_estado NOT NULL DEFAULT 'activa',
  nota_definitiva  FLOAT,
  aprobada         BOOLEAN,
  "createdAt"      TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  UNIQUE (estudiante_id, asignatura_id)
);

-- ── 12. CALIFICACION ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calificacion (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  inscripcion_id  UUID          NOT NULL REFERENCES inscripcion(id) ON DELETE CASCADE ON UPDATE CASCADE,
  actividad_id    UUID          NOT NULL REFERENCES actividad(id) ON DELETE CASCADE ON UPDATE CASCADE,
  nota            FLOAT         CHECK (nota >= 0 AND nota <= 5),
  fecha_registro  TIMESTAMPTZ   DEFAULT NOW(),
  "createdAt"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (inscripcion_id, actividad_id)
);

-- ── 13. ASISTENCIA ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asistencia (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  inscripcion_id  UUID          NOT NULL REFERENCES inscripcion(id) ON DELETE CASCADE ON UPDATE CASCADE,
  fecha           DATE          NOT NULL,
  presente        BOOLEAN       NOT NULL DEFAULT false,
  registrado_por  VARCHAR(255),
  observacion     VARCHAR(255),
  "createdAt"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (inscripcion_id, fecha)
);

-- ── 14. ALERTA ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerta (
  id                    UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  inscripcion_id        UUID               NOT NULL REFERENCES inscripcion(id) ON DELETE CASCADE ON UPDATE CASCADE,
  tipo                  enum_alerta_tipo   NOT NULL,
  estado                enum_alerta_estado NOT NULL DEFAULT 'activa',
  nota_minima_requerida FLOAT,
  es_recuperable        BOOLEAN            NOT NULL DEFAULT true,
  "createdAt"           TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

-- ── Índices de rendimiento ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inscripcion_estudiante ON inscripcion(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_inscripcion_asignatura ON inscripcion(asignatura_id);
CREATE INDEX IF NOT EXISTS idx_calificacion_inscripcion ON calificacion(inscripcion_id);
CREATE INDEX IF NOT EXISTS idx_asistencia_inscripcion ON asistencia(inscripcion_id);
CREATE INDEX IF NOT EXISTS idx_asistencia_fecha ON asistencia(fecha);
CREATE INDEX IF NOT EXISTS idx_alerta_inscripcion ON alerta(inscripcion_id);
CREATE INDEX IF NOT EXISTS idx_asignatura_semestre ON asignatura(semestre_academico);
CREATE INDEX IF NOT EXISTS idx_corte_asignatura ON corte(asignatura_id);

-- ============================================================
-- Migración completada.
-- Para poblar con datos de prueba (usuarios, carreras, materias,
-- notas y asistencia reales de ejemplo), ejecutar:
--   psql -U postgres -d tracely -f seed_data.sql
-- ============================================================
