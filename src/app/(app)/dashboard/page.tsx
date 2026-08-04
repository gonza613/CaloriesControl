import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserProfile, getTodayFoodLogs, getTodayTotals } from '@/lib/queries'
import MacroSummary from '@/components/MacroSummary'
import FoodLogList from '@/components/FoodLogList'
import UniversalInput from '@/components/UniversalInput'
import { Leaf } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard — CaloriesControl',
  description: 'Tu resumen nutricional del día',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [profile, logs, totals] = await Promise.all([
    getUserProfile(user.id),
    getTodayFoodLogs(user.id),
    getTodayTotals(user.id),
  ])

  return (
    <>
      <main className="page-content">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
          <div style={{
            width: 36, height: 36,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-glow-green)',
            flexShrink: 0,
          }}>
            <Leaf size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem' }}>
              {profile.nombre ? `Hola, ${profile.nombre.split(' ')[0]} 👋` : 'Mi Dashboard'}
            </h1>
            <p className="text-muted" style={{ fontSize: '0.75rem' }}>
              Registrá tus comidas abajo
            </p>
          </div>
        </div>

        {/* Macro Summary */}
        <MacroSummary profile={profile} totals={totals} />

        {/* Food Log */}
        <div>
          <div className="section-title">Comidas de hoy</div>
          <FoodLogList logs={logs} />
        </div>
      </main>

      {/* Universal Input — fixed bottom */}
      <UniversalInput />
    </>
  )
}
