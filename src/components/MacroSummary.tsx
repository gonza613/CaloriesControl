'use client'

import { UserProfile, DayTotals } from '@/lib/queries'

type MacroBarProps = {
  label: string
  current: number
  goal: number
  unit: string
  color: string
  fillClass: string
}

function MacroBar({ label, current, unit, goal, color, fillClass }: MacroBarProps) {
  const pct = Math.min((current / goal) * 100, 100)
  const isOver = current > goal

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      <div className="flex-between">
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
          {label}
        </span>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color }}>
          {Math.round(current)}<span style={{ fontWeight: 400, opacity: 0.6 }}>/{goal}{unit}</span>
        </span>
      </div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${fillClass} ${isOver ? 'danger' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// Circular progress ring for calories
function CalorieRing({ current, goal }: { current: number; goal: number }) {
  const size = 120
  const stroke = 10
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min((current / goal) * 100, 100)
  const offset = circ - (pct / 100) * circ
  const isOver = current > goal

  return (
    <div className="calorie-ring-wrapper">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={isOver ? 'var(--color-danger)' : 'var(--color-primary)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
      </svg>
      <div className="calorie-ring-text">
        <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
          {Math.round(current)}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
          de {goal} kcal
        </div>
        <div style={{ fontSize: '0.6rem', color: isOver ? 'var(--color-danger)' : 'var(--color-primary)', fontWeight: 700, marginTop: '0.15rem' }}>
          {isOver ? `+${Math.round(current - goal)}` : `${Math.round(goal - current)} restantes`}
        </div>
      </div>
    </div>
  )
}

type Props = {
  profile: UserProfile
  totals: DayTotals
}

export default function MacroSummary({ profile, totals }: Props) {
  const today = new Date()
  const TZ = 'America/Argentina/Buenos_Aires'
  const dayName = today.toLocaleDateString('es-AR', { weekday: 'long', timeZone: TZ })
  const dateStr = today.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', timeZone: TZ })

  return (
    <div className="card animate-fade-in" style={{ marginBottom: '1.25rem' }}>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', textTransform: 'capitalize' }}>
            {dayName}
          </div>
          <h2 style={{ fontSize: '1.1rem', marginTop: '0.1rem' }}>{dateStr}</h2>
        </div>
        {totals.cantidad_comidas > 0 && (
          <div className="badge badge-green">
            {totals.cantidad_comidas} {totals.cantidad_comidas === 1 ? 'comida' : 'comidas'}
          </div>
        )}
      </div>

      {/* Ring + Macros */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
        <CalorieRing current={totals.total_calorias} goal={profile.meta_calorias} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <MacroBar
            label="Proteínas"
            current={totals.total_proteinas}
            goal={profile.meta_proteinas}
            unit="g"
            color="var(--color-protein)"
            fillClass="protein"
          />
          <MacroBar
            label="Carbohidratos"
            current={totals.total_carbohidratos}
            goal={profile.meta_carbohidratos}
            unit="g"
            color="var(--color-carbs)"
            fillClass="carbs"
          />
          <MacroBar
            label="Grasas"
            current={totals.total_grasas}
            goal={profile.meta_grasas}
            unit="g"
            color="var(--color-fat)"
            fillClass="fat"
          />
        </div>
      </div>
    </div>
  )
}
