'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { deleteFoodLog as deleteFoodLogQuery } from '@/lib/queries'

export type ActionResult = { success: true } | { success: false; error: string }

export async function deleteFoodLog(logId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const ok = await deleteFoodLogQuery(user.id, logId)
  if (!ok) return { success: false, error: 'Error al eliminar el registro' }

  revalidatePath('/dashboard')
  return { success: true }
}
