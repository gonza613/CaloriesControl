'use client'

import { useState } from 'react'
import { FoodLog } from '@/lib/queries'
import { deleteFoodLog } from '@/actions/deleteFoodLog'
import { Trash2, Brain, Camera, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'

const FOOD_EMOJIS: Record<string, string> = {
  manzana: '🍎', banana: '🍌', naranja: '🍊', pera: '🍐', uva: '🍇',
  frutilla: '🍓', sandia: '🍉', durazno: '🍑', limon: '🍋',
  pollo: '🍗', carne: '🥩', pescado: '🐟', huevo: '🥚', cerdo: '🥓',
  arroz: '🍚', pasta: '🍝', pan: '🍞', avena: '🥣', fideos: '🍝',
  ensalada: '🥗', lechuga: '🥬', tomate: '🍅', zanahoria: '🥕',
  leche: '🥛', yogur: '🫙', queso: '🧀',
  chocolate: '🍫', galleta: '🍪', torta: '🎂', helado: '🍦',
  cafe: '☕', te: '🍵', jugo: '🥤', agua: '💧',
}

function getFoodEmoji(name: string): string {
  const lower = name.toLowerCase()
  for (const [key, emoji] of Object.entries(FOOD_EMOJIS)) {
    if (lower.includes(key)) return emoji
  }
  return '🍽️'
}

function SourceBadge({ fuente }: { fuente: string }) {
  if (fuente === 'memoria') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.65rem', color: 'var(--color-primary)', fontWeight: 600 }}>
        <Brain size={10} /> Memoria
      </span>
    )
  }
  if (fuente === 'gemini_foto') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.65rem', color: 'var(--color-accent)', fontWeight: 600 }}>
        <Camera size={10} /> Foto
      </span>
    )
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.65rem', color: 'var(--color-text-subtle)', fontWeight: 600 }}>
      <Sparkles size={10} /> IA
    </span>
  )
}

function FoodCard({ log, index }: { log: FoodLog; index: number }) {
  const [deleting, setDeleting] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const timeStr = new Date(log.fecha).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este registro?')) return
    setDeleting(true)
    await deleteFoodLog(log.id)
  }

  return (
    <div
      className="food-card"
      style={{ animationDelay: `${index * 60}ms`, opacity: deleting ? 0.4 : 1 }}
    >
      {/* Emoji icon */}
      <div className="food-icon">
        <span style={{ fontSize: '1.4rem' }}>{getFoodEmoji(log.nombre_alimento)}</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="flex-between" style={{ marginBottom: '0.25rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {log.nombre_alimento}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: '0.5rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-calories)' }}>
              {Math.round(log.calorias)} kcal
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <SourceBadge fuente={log.fuente} />
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>{timeStr}</span>

          {expanded && (
            <div style={{ width: '100%', marginTop: '0.5rem', display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              <span className="macro-chip protein">P: {Math.round(log.proteinas)}g</span>
              <span className="macro-chip carbs">C: {Math.round(log.carbohidratos)}g</span>
              <span className="macro-chip fat">G: {Math.round(log.grasas)}g</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-subtle)',
            padding: '0.375rem',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Ver macros"
          aria-label="Ver macros"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-subtle)',
            padding: '0.375rem',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s ease',
          }}
          title="Eliminar"
          aria-label="Eliminar registro"
          onMouseOver={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--color-danger)')}
          onMouseOut={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-subtle)')}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

type Props = {
  logs: FoodLog[]
}

export default function FoodLogList({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <span style={{ fontSize: '2rem' }}>🍽️</span>
        </div>
        <h3>Sin registros hoy</h3>
        <p>Usá el input de abajo para registrar tu primera comida del día.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {logs.map((log, i) => (
        <FoodCard key={log.id} log={log} index={i} />
      ))}
    </div>
  )
}
