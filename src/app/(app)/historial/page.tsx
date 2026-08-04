import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FoodLog } from '@/lib/queries'
import { deleteFoodLog } from '@/actions/deleteFoodLog'
import { Brain, Camera, Sparkles, ChevronDown, ChevronUp, Trash2, BookOpen } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Historial — CaloriesControl',
  description: 'Tu historial de comidas de los últimos días',
}

async function getRecentLogs(userId: string): Promise<FoodLog[]> {
  const supabase = await createClient()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('fecha', sevenDaysAgo.toISOString())
    .order('fecha', { ascending: false })

  return (data ?? []) as FoodLog[]
}

function groupByDay(logs: FoodLog[]): Record<string, FoodLog[]> {
  const groups: Record<string, FoodLog[]> = {}
  for (const log of logs) {
    const day = new Date(log.fecha).toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long',
    })
    if (!groups[day]) groups[day] = []
    groups[day].push(log)
  }
  return groups
}

function dayTotals(logs: FoodLog[]) {
  return logs.reduce((acc, l) => ({
    kcal: acc.kcal + Number(l.calorias),
    prot: acc.prot + Number(l.proteinas),
  }), { kcal: 0, prot: 0 })
}

function SourceIcon({ fuente }: { fuente: string }) {
  if (fuente === 'memoria') return <Brain size={12} style={{ color: 'var(--color-primary)' }} />
  if (fuente === 'gemini_foto') return <Camera size={12} style={{ color: 'var(--color-accent)' }} />
  return <Sparkles size={12} style={{ color: 'var(--color-text-subtle)' }} />
}

export default async function HistorialPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const logs = await getRecentLogs(user.id)
  const grouped = groupByDay(logs)
  const days = Object.keys(grouped)

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
            <p className="text-muted" style={{ fontSize: '0.75rem' }}>Últimos 7 días</p>
          </div>
        </div>
      </div>

      {days.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><span style={{ fontSize: '2rem' }}>📋</span></div>
          <h3>Sin registros aún</h3>
          <p>Empezá a registrar tus comidas desde el Dashboard.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {days.map((day) => {
            const dayLogs = grouped[day]
            const { kcal, prot } = dayTotals(dayLogs)
            return (
              <div key={day}>
                <div className="flex-between" style={{ marginBottom: '0.625rem' }}>
                  <span className="section-title" style={{ marginBottom: 0, textTransform: 'capitalize' }}>{day}</span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span className="macro-chip calories">{Math.round(kcal)} kcal</span>
                    <span className="macro-chip protein">{Math.round(prot)}g P</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {dayLogs.map((log) => (
                    <div key={log.id} className="food-card" style={{ animation: 'none' }}>
                      <SourceIcon fuente={log.fuente} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.nombre_alimento}
                        </div>
                        <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                          <span className="macro-chip calories">{Math.round(log.calorias)} kcal</span>
                          <span className="macro-chip protein">P {Math.round(log.proteinas)}g</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)', flexShrink: 0 }}>
                        {new Date(log.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
