'use client'

import { useState, useTransition } from 'react'
import { FoodLog } from '@/lib/queries'
import { deleteFoodLog } from '@/actions/deleteFoodLog'
import { updateFoodLog } from '@/actions/updateFoodLog'
import { formatTimeAR } from '@/lib/timezone'
import { Trash2, Brain, Camera, Sparkles, ChevronDown, ChevronUp, Pencil, X, Check, Loader2 } from 'lucide-react'

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
  if (fuente === 'openfoodfacts') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.65rem', color: 'var(--color-carbs)', fontWeight: 600 }}>
        🌐 OFF
      </span>
    )
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.65rem', color: 'var(--color-text-subtle)', fontWeight: 600 }}>
      <Sparkles size={10} /> IA
    </span>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
type EditModalProps = {
  log: FoodLog
  onClose: () => void
  onSaved: () => void
}

function EditModal({ log, onClose, onSaved }: EditModalProps) {
  const [nombre, setNombre] = useState(log.nombre_alimento)
  const [calorias, setCalorias] = useState(String(Math.round(log.calorias)))
  const [proteinas, setProteinas] = useState(String(Math.round(log.proteinas)))
  const [carbohidratos, setCarbohidratos] = useState(String(Math.round(log.carbohidratos)))
  const [grasas, setGrasas] = useState(String(Math.round(log.grasas)))
  const [porcion, setPorcion] = useState(String(Math.round(log.porcion_gramos || 0)))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateFoodLog(log.id, {
        nombre_alimento: nombre.trim(),
        calorias: parseFloat(calorias) || 0,
        proteinas: parseFloat(proteinas) || 0,
        carbohidratos: parseFloat(carbohidratos) || 0,
        grasas: parseFloat(grasas) || 0,
        porcion_gramos: parseFloat(porcion) || 0,
      })
      if (result.success) {
        onSaved()
        onClose()
      } else {
        setError('error' in result ? result.error : 'Error al guardar')
      }
    })
  }

  const fields = [
    { id: 'kcal', label: 'Calorías', value: calorias, set: setCalorias, unit: 'kcal', color: 'var(--color-calories)' },
    { id: 'prot', label: 'Proteínas', value: proteinas, set: setProteinas, unit: 'g', color: 'var(--color-protein)' },
    { id: 'carbs', label: 'Carbohidratos', value: carbohidratos, set: setCarbohidratos, unit: 'g', color: 'var(--color-carbs)' },
    { id: 'grasas', label: 'Grasas', value: grasas, set: setGrasas, unit: 'g', color: 'var(--color-fat)' },
    { id: 'porcion', label: 'Porción', value: porcion, set: setPorcion, unit: 'g', color: 'var(--color-text-muted)' },
  ]

  return (
    <>
      {/* Overlay */}
      <div className="edit-modal-overlay" onClick={onClose} />
      {/* Modal */}
      <div className="edit-modal">
        <div className="edit-modal-header">
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>✏️ Editar comida</span>
          <button className="edit-modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Nombre */}
        <div style={{ marginBottom: '1rem' }}>
          <label className="edit-field-label">Nombre</label>
          <input
            className="edit-field-input"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del alimento"
          />
        </div>

        {/* Nutrientes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
          {fields.map(({ id, label, value, set, unit, color }) => (
            <div key={id}>
              <label className="edit-field-label" style={{ color }}>{label}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input
                  className="edit-field-input"
                  type="number"
                  min="0"
                  step="0.1"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', minWidth: '1.75rem' }}>{unit}</span>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Food Card ─────────────────────────────────────────────────────────────────
function FoodCard({ log, index }: { log: FoodLog; index: number }) {
  const [deleting, setDeleting] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [currentLog, setCurrentLog] = useState(log)

  const timeStr = formatTimeAR(currentLog.fecha)

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este registro?')) return
    setDeleting(true)
    await deleteFoodLog(currentLog.id)
  }

  return (
    <>
      {editing && (
        <EditModal
          log={currentLog}
          onClose={() => setEditing(false)}
          onSaved={() => {
            // The server revalidates; optimistically update display name
            setEditing(false)
          }}
        />
      )}

      <div
        className="food-card"
        style={{ animationDelay: `${index * 60}ms`, opacity: deleting ? 0.4 : 1 }}
      >
        {/* Emoji icon */}
        <div className="food-icon">
          <span style={{ fontSize: '1.4rem' }}>{getFoodEmoji(currentLog.nombre_alimento)}</span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex-between" style={{ marginBottom: '0.25rem' }}>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {currentLog.nombre_alimento}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: '0.5rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-calories)' }}>
                {Math.round(currentLog.calorias)} kcal
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <SourceBadge fuente={currentLog.fuente} />
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>{timeStr}</span>

            {expanded && (
              <div style={{ width: '100%', marginTop: '0.5rem', display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                <span className="macro-chip protein">P: {Math.round(currentLog.proteinas)}g</span>
                <span className="macro-chip carbs">C: {Math.round(currentLog.carbohidratos)}g</span>
                <span className="macro-chip fat">G: {Math.round(currentLog.grasas)}g</span>
                {currentLog.porcion_gramos > 0 && (
                  <span className="macro-chip" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-subtle)' }}>
                    {Math.round(currentLog.porcion_gramos)}g porción
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
          <button
            onClick={() => setExpanded(!expanded)}
            className="food-action-btn"
            title="Ver macros"
            aria-label="Ver macros"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={() => setEditing(true)}
            className="food-action-btn"
            title="Editar"
            aria-label="Editar registro"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="food-action-btn danger"
            title="Eliminar"
            aria-label="Eliminar registro"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </>
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
