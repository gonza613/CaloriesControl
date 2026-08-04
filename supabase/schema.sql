-- ============================================================
-- CaloriesControl — Supabase Schema
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABLA: users_profile
-- Perfil nutricional del usuario (uno por usuario)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users_profile (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre              TEXT,
  meta_calorias       INTEGER     NOT NULL DEFAULT 2400,
  meta_proteinas      INTEGER     NOT NULL DEFAULT 180,
  meta_carbohidratos  INTEGER     NOT NULL DEFAULT 250,
  meta_grasas         INTEGER     NOT NULL DEFAULT 70,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para users_profile
CREATE POLICY "users_profile_select" ON public.users_profile
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_profile_insert" ON public.users_profile
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_profile_update" ON public.users_profile
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_profile_delete" ON public.users_profile
  FOR DELETE USING (auth.uid() = id);

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users_profile (id, nombre)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'nombre')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. TABLA: personal_foods
-- El "Diccionario Personal" de alimentos del usuario
-- ============================================================
CREATE TABLE IF NOT EXISTS public.personal_foods (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_alimento  TEXT        NOT NULL,
  calorias         NUMERIC     NOT NULL,
  proteinas        NUMERIC     NOT NULL,
  carbohidratos    NUMERIC     NOT NULL,
  grasas           NUMERIC     NOT NULL,
  porcion_gramos   NUMERIC     NOT NULL DEFAULT 100,
  fuente           TEXT        DEFAULT 'manual',  -- 'manual' | 'gemini_estimado' | 'gemini_foto'
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_foods ENABLE ROW LEVEL SECURITY;

-- Índice para búsquedas ILIKE rápidas
CREATE INDEX IF NOT EXISTS personal_foods_nombre_idx
  ON public.personal_foods USING gin(to_tsvector('spanish', nombre_alimento));

CREATE INDEX IF NOT EXISTS personal_foods_user_id_idx
  ON public.personal_foods (user_id);

-- Políticas RLS para personal_foods
CREATE POLICY "personal_foods_select" ON public.personal_foods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "personal_foods_insert" ON public.personal_foods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "personal_foods_update" ON public.personal_foods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "personal_foods_delete" ON public.personal_foods
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 3. TABLA: food_logs
-- El diario diario de comidas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.food_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_alimento  TEXT        NOT NULL,
  calorias         NUMERIC     NOT NULL,
  proteinas        NUMERIC     NOT NULL,
  carbohidratos    NUMERIC     NOT NULL,
  grasas           NUMERIC     NOT NULL,
  porcion_gramos   NUMERIC     DEFAULT 100,
  fuente           TEXT        DEFAULT 'gemini_estimado',  -- 'memoria' | 'gemini_estimado' | 'gemini_foto'
  fecha            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;

-- Índice para consultas por fecha
CREATE INDEX IF NOT EXISTS food_logs_user_fecha_idx
  ON public.food_logs (user_id, fecha DESC);

-- Políticas RLS para food_logs
CREATE POLICY "food_logs_select" ON public.food_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "food_logs_insert" ON public.food_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "food_logs_update" ON public.food_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "food_logs_delete" ON public.food_logs
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Vista de resumen diario (opcional, útil para analytics)
-- ============================================================
CREATE OR REPLACE VIEW public.daily_summary AS
SELECT
  user_id,
  DATE(fecha AT TIME ZONE 'America/Argentina/Buenos_Aires') AS dia,
  SUM(calorias)      AS total_calorias,
  SUM(proteinas)     AS total_proteinas,
  SUM(carbohidratos) AS total_carbohidratos,
  SUM(grasas)        AS total_grasas,
  COUNT(*)           AS cantidad_comidas
FROM public.food_logs
GROUP BY user_id, dia;
