-- ============================================================
-- Migration: unique constraint en personal_foods
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ============================================================

-- Primero eliminar duplicados existentes (si los hay), quedarse con el más reciente
DELETE FROM public.personal_foods pf1
WHERE EXISTS (
  SELECT 1 FROM public.personal_foods pf2
  WHERE pf2.user_id = pf1.user_id
    AND LOWER(pf2.nombre_alimento) = LOWER(pf1.nombre_alimento)
    AND pf2.created_at > pf1.created_at
);

-- Agregar constraint único (user_id + nombre_alimento normalizado a lowercase)
-- Para hacer el upsert funcionar correctamente
ALTER TABLE public.personal_foods
  ADD CONSTRAINT personal_foods_user_nombre_unique
  UNIQUE (user_id, nombre_alimento);

-- También agregar fuente 'openfoodfacts' como valor posible (solo documentativo)
-- 'manual' | 'gemini_estimado' | 'gemini_foto' | 'openfoodfacts'
COMMENT ON COLUMN public.personal_foods.fuente IS 'Origen del dato: manual | gemini_estimado | gemini_foto | openfoodfacts';
