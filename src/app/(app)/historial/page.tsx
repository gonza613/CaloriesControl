import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FoodLog, listPersonalFoods } from '@/lib/queries'
import HistorialClient from '@/components/HistorialClient'
import { getArgentinaDaysAgoStart } from '@/lib/timezone'
import { BookOpen } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Historial — CaloriesControl',
  description: 'Tu historial de comidas y diccionario de alimentos',
}

async function getRecentLogs(userId: string): Promise<FoodLog[]> {
  const supabase = await createClient()

  // Corte de 7 días en Argentina timezone (UTC-3)
  const sevenDaysAgo = getArgentinaDaysAgoStart(7)

  const { data } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('fecha', sevenDaysAgo.toISOString())
    .order('fecha', { ascending: false })

  return (data ?? []) as FoodLog[]
}

export default async function HistorialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [logs, personalFoods] = await Promise.all([
    getRecentLogs(user.id),
    listPersonalFoods(user.id),
  ])

  return (
    <main className="page-content-no-input">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen size={18} style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <div>
            <h1>Historial</h1>
            <p className="text-muted" style={{ fontSize: '0.75rem' }}>Últimos 7 días · Diccionario personal</p>
          </div>
        </div>
      </div>

      <HistorialClient logs={logs} personalFoods={personalFoods} />
    </main>
  )
}
