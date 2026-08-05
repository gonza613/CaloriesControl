'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { updatePersonalFood as updatePersonalFoodQuery, deletePersonalFood as deletePersonalFoodQuery } from '@/lib/queries'

export type PersonalFoodData = {
  nombre_alimento: string
  calorias: number
  proteinas: number
  carbohidratos: number
  grasas: number
  porcion_gramos: number
}

export type ActionResult = { success: true } | { success: false; error: string }

export async function updatePersonalFood(
  foodId: string,
  data: PersonalFoodData
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const ok = await updatePersonalFoodQuery(user.id, foodId, data)
  if (!ok) return { success: false, error: 'Error al actualizar el alimento' }

  revalidatePath('/historial')
  return { success: true }
}

export async function deletePersonalFood(foodId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const ok = await deletePersonalFoodQuery(user.id, foodId)
  if (!ok) return { success: false, error: 'Error al eliminar el alimento' }

  revalidatePath('/historial')
  return { success: true }
}
