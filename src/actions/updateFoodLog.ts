'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { updateFoodLog as updateFoodLogQuery } from '@/lib/queries'

export type UpdateFoodLogData = {
  nombre_alimento: string
  calorias: number
  proteinas: number
  carbohidratos: number
  grasas: number
  porcion_gramos?: number
}

export type ActionResult = { success: true } | { success: false; error: string }

export async function updateFoodLog(
  logId: string,
  data: UpdateFoodLogData
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const ok = await updateFoodLogQuery(user.id, logId, data)
  if (!ok) return { success: false, error: 'Error al actualizar el registro' }

  revalidatePath('/dashboard')
  revalidatePath('/historial')
  return { success: true }
}
