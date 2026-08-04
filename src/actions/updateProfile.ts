'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type UpdateProfileInput = {
  nombre?: string
  meta_calorias?: number
  meta_proteinas?: number
  meta_carbohidratos?: number
  meta_grasas?: number
}

export type ActionResult = { success: true } | { success: false; error: string }

export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('users_profile')
    .upsert({ id: user.id, ...input, updated_at: new Date().toISOString() })

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/perfil')
  return { success: true }
}
