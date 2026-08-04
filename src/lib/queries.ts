import { createClient } from '@/lib/supabase/server'

// ============================================================
// TIPOS
// ============================================================
export type UserProfile = {
  id: string
  nombre: string | null
  meta_calorias: number
  meta_proteinas: number
  meta_carbohidratos: number
  meta_grasas: number
}

export type PersonalFood = {
  id: string
  user_id: string
  nombre_alimento: string
  calorias: number
  proteinas: number
  carbohidratos: number
  grasas: number
  porcion_gramos: number
  fuente: string
}

export type FoodLog = {
  id: string
  user_id: string
  nombre_alimento: string
  calorias: number
  proteinas: number
  carbohidratos: number
  grasas: number
  porcion_gramos: number
  fuente: string
  fecha: string
}

export type DayTotals = {
  total_calorias: number
  total_proteinas: number
  total_carbohidratos: number
  total_grasas: number
  cantidad_comidas: number
}

// ============================================================
// USERS PROFILE
// ============================================================

/**
 * Obtiene el perfil nutricional del usuario.
 * Si no existe, crea uno con los valores por defecto.
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users_profile')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) {
    // Crear perfil con valores por defecto
    const { data: newProfile, error: insertError } = await supabase
      .from('users_profile')
      .insert({ id: userId })
      .select()
      .single()

    if (insertError || !newProfile) {
      return {
        id: userId,
        nombre: null,
        meta_calorias: 2400,
        meta_proteinas: 180,
        meta_carbohidratos: 250,
        meta_grasas: 70,
      }
    }
    return newProfile as UserProfile
  }

  return data as UserProfile
}

// ============================================================
// PERSONAL FOODS — Diccionario Personal
// ============================================================

/**
 * Busca un alimento en el diccionario personal del usuario.
 * Usa ILIKE para búsqueda insensible a mayúsculas/minúsculas.
 * Retorna el primer match o null si no encuentra.
 */
export async function searchPersonalFood(
  userId: string,
  foodName: string
): Promise<PersonalFood | null> {
  const supabase = await createClient()

  // Búsqueda ILIKE para flexibilidad
  const { data } = await supabase
    .from('personal_foods')
    .select('*')
    .eq('user_id', userId)
    .ilike('nombre_alimento', `%${foodName}%`)
    .order('created_at', { ascending: false })
    .limit(1)

  return (data && data.length > 0) ? data[0] as PersonalFood : null
}

/**
 * Guarda un alimento en el diccionario personal.
 * Si ya existe uno con el mismo nombre, lo actualiza.
 */
export async function savePersonalFood(
  userId: string,
  food: Omit<PersonalFood, 'id' | 'user_id'>
): Promise<PersonalFood | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('personal_foods')
    .insert({ user_id: userId, ...food })
    .select()
    .single()

  if (error) {
    console.error('Error saving personal food:', error)
    return null
  }

  return data as PersonalFood
}

/**
 * Lista todos los alimentos del diccionario personal del usuario.
 */
export async function listPersonalFoods(userId: string): Promise<PersonalFood[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('personal_foods')
    .select('*')
    .eq('user_id', userId)
    .order('nombre_alimento', { ascending: true })

  return (data ?? []) as PersonalFood[]
}

// ============================================================
// FOOD LOGS — Diario Diario
// ============================================================

/**
 * Obtiene todos los registros de comidas del día actual.
 */
export async function getTodayFoodLogs(userId: string): Promise<FoodLog[]> {
  const supabase = await createClient()

  // Rango del día en UTC (ajustar si se necesita timezone específico)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('fecha', today.toISOString())
    .lt('fecha', tomorrow.toISOString())
    .order('fecha', { ascending: false })

  return (data ?? []) as FoodLog[]
}

/**
 * Calcula los totales de macros del día actual.
 */
export async function getTodayTotals(userId: string): Promise<DayTotals> {
  const logs = await getTodayFoodLogs(userId)

  return logs.reduce(
    (acc, log) => ({
      total_calorias: acc.total_calorias + Number(log.calorias),
      total_proteinas: acc.total_proteinas + Number(log.proteinas),
      total_carbohidratos: acc.total_carbohidratos + Number(log.carbohidratos),
      total_grasas: acc.total_grasas + Number(log.grasas),
      cantidad_comidas: acc.cantidad_comidas + 1,
    }),
    { total_calorias: 0, total_proteinas: 0, total_carbohidratos: 0, total_grasas: 0, cantidad_comidas: 0 }
  )
}

/**
 * Guarda un registro en el diario de comidas.
 */
export async function saveFoodLog(
  userId: string,
  food: {
    nombre_alimento: string
    calorias: number
    proteinas: number
    carbohidratos: number
    grasas: number
    porcion_gramos?: number
    fuente?: string
  }
): Promise<FoodLog | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('food_logs')
    .insert({ user_id: userId, ...food })
    .select()
    .single()

  if (error) {
    console.error('Error saving food log:', error)
    return null
  }

  return data as FoodLog
}

/**
 * Elimina un registro del diario.
 */
export async function deleteFoodLog(userId: string, logId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('food_logs')
    .delete()
    .eq('id', logId)
    .eq('user_id', userId)

  return !error
}
