'use client'

import { useState, useTransition } from 'react'
import { FoodLog, PersonalFood } from '@/lib/queries'
import { deleteFoodLog } from '@/actions/deleteFoodLog'
import { updateFoodLog } from '@/actions/updateFoodLog'
import { updatePersonalFood, deletePersonalFood } from '@/actions/personalFoodActions'
import { AR_TZ, getArgentinaDaysAgoStart, formatTimeAR, formatDayKeyAR } from '@/lib/timezone'
import {
  Brain, Camera, Sparkles, ChevronDown, ChevronUp,
  Trash2, Pencil, X, Check, Loader2, Search, BookOpen, Database
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Period = 'today' | '3d' | '7d'

type Props = {
  logs: FoodLog[]
  personalFoods: PersonalFood[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function SourceIcon({ fuente }: { fuente: string }) {
  if (fuente === 'memoria') return <Brain size={12} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
  if (fuente === 'gemini_foto') return <Camera size={12} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
  return <Sparkles size={12} style={{ color: 'var(--color-text-subtle)', flexShrink: 0 }} />
}

function dayTotals(logs: FoodLog[]) {
  return logs.reduce((acc, l) => ({
    kcal: acc.kcal + Number(l.calorias),
    prot: acc.prot + Number(l.proteinas),
    carbs: acc.carbs + Number(l.carbohidratos),
    fat: acc.fat + Number(l.grasas),
  }), { kcal: 0, prot: 0, carbs: 0, fat: 0 })
}

function groupByDay(logs: FoodLog[]): Record<string, FoodLog[]> {
  const groups: Record<string, FoodLog[]> = {}
  for (const log of logs) {
    const day = formatDayKeyAR(log.fecha)
    if (!groups[day]) groups[day] = []
    groups[day].push(log)
  }
  return groups
}

function filterByPeriod(logs: FoodLog[], period: Period): FoodLog[] {
  const cutoffs: Record<Period, number> = { today: 0, '3d': 3, '7d': 7 }
  const days = cutoffs[period]
  const cutoff = days === 0
    ? getArgentinaDaysAgoStart(0)  // inicio del día de hoy en Argentina
    : getArgentinaDaysAgoStart(days)
  return logs.filter(l => new Date(l.fecha) >= cutoff)
}

// ─── Edit Modal (shared) ──────────────────────────────────────────────────────
type EditFoodLogModalProps = {
  log: FoodLog
  onClose: () => void
}

function EditFoodLogModal({ log, onClose }: EditFoodLogModalProps) {
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
      if (result.success) { onClose() }
      else setError('error' in result ? result.error : 'Error al guardar')
    })
  }

  const fields = [
    { id: 'kcal', label: 'Calorías', value: calorias, set: setCalorias, unit: 'kcal', color: 'var(--color-calories)' },
    { id: 'prot', label: 'Proteínas', value: proteinas, set: setProteinas, unit: 'g', color: 'var(--color-protein)' },
    { id: 'carbs', label: 'Carbos', value: carbohidratos, set: setCarbohidratos, unit: 'g', color: 'var(--color-carbs)' },
    { id: 'fat', label: 'Grasas', value: grasas, set: setGrasas, unit: 'g', color: 'var(--color-fat)' },
    { id: 'porcion', label: 'Porción', value: porcion, set: setPorcion, unit: 'g', color: 'var(--color-text-muted)' },
  ]

  return (
    <>
      <div className="edit-modal-overlay" onClick={onClose} />
      <div className="edit-modal">
        <div className="edit-modal-header">
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>✏️ Editar comida</span>
          <button className="edit-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label className="edit-field-label">Nombre</label>
          <input className="edit-field-input" type="text" value={nombre} onChange={e => setNombre(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
          {fields.map(({ id, label, value, set, unit, color }) => (
            <div key={id}>
              <label className="edit-field-label" style={{ color }}>{label}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input className="edit-field-input" type="number" min="0" step="0.1" value={value} onChange={e => set(e.target.value)} style={{ flex: 1 }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', minWidth: '1.75rem' }}>{unit}</span>
              </div>
            </div>
          ))}
        </div>
        {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={isPending}>Cancelar</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Edit Personal Food Modal ─────────────────────────────────────────────────
type EditPersonalFoodModalProps = {
  food: PersonalFood
  onClose: () => void
}

function EditPersonalFoodModal({ food, onClose }: EditPersonalFoodModalProps) {
  const [nombre, setNombre] = useState(food.nombre_alimento)
  const [calorias, setCalorias] = useState(String(Math.round(food.calorias)))
  const [proteinas, setProteinas] = useState(String(Math.round(food.proteinas)))
  const [carbohidratos, setCarbohidratos] = useState(String(Math.round(food.carbohidratos)))
  const [grasas, setGrasas] = useState(String(Math.round(food.grasas)))
  const [porcion, setPorcion] = useState(String(Math.round(food.porcion_gramos)))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    startTransition(async () => {
      const result = await updatePersonalFood(food.id, {
        nombre_alimento: nombre.trim(),
        calorias: parseFloat(calorias) || 0,
        proteinas: parseFloat(proteinas) || 0,
        carbohidratos: parseFloat(carbohidratos) || 0,
        grasas: parseFloat(grasas) || 0,
        porcion_gramos: parseFloat(porcion) || 0,
      })
      if (result.success) { onClose() }
      else setError('error' in result ? result.error : 'Error al guardar')
    })
  }

  const fields = [
    { id: 'kcal', label: 'Calorías', value: calorias, set: setCalorias, unit: 'kcal', color: 'var(--color-calories)' },
    { id: 'prot', label: 'Proteínas', value: proteinas, set: setProteinas, unit: 'g', color: 'var(--color-protein)' },
    { id: 'carbs', label: 'Carbos', value: carbohidratos, set: setCarbohidratos, unit: 'g', color: 'var(--color-carbs)' },
    { id: 'fat', label: 'Grasas', value: grasas, set: setGrasas, unit: 'g', color: 'var(--color-fat)' },
    { id: 'porcion', label: 'Porción', value: porcion, set: setPorcion, unit: 'g', color: 'var(--color-text-muted)' },
  ]

  return (
    <>
      <div className="edit-modal-overlay" onClick={onClose} />
      <div className="edit-modal">
        <div className="edit-modal-header">
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>✏️ Editar alimento</span>
          <button className="edit-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label className="edit-field-label">Nombre</label>
          <input className="edit-field-input" type="text" value={nombre} onChange={e => setNombre(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
          {fields.map(({ id, label, value, set, unit, color }) => (
            <div key={id}>
              <label className="edit-field-label" style={{ color }}>{label}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input className="edit-field-input" type="number" min="0" step="0.1" value={value} onChange={e => set(e.target.value)} style={{ flex: 1 }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', minWidth: '1.75rem' }}>{unit}</span>
              </div>
            </div>
          ))}
        </div>
        {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={isPending}>Cancelar</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Log Item in Historial ────────────────────────────────────────────────────
function HistorialLogItem({ log }: { log: FoodLog }) {
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este registro?')) return
    setDeleting(true)
    await deleteFoodLog(log.id)
  }

  return (
    <>
      {editing && <EditFoodLogModal log={log} onClose={() => setEditing(false)} />}
      <div className="food-card" style={{ animation: 'none', opacity: deleting ? 0.4 : 1 }}>
        <SourceIcon fuente={log.fuente} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {log.nombre_alimento}
          </div>
          <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
            <span className="macro-chip calories">{Math.round(log.calorias)} kcal</span>
            {expanded && (
              <>
                <span className="macro-chip protein">P {Math.round(log.proteinas)}g</span>
                <span className="macro-chip carbs">C {Math.round(log.carbohidratos)}g</span>
                <span className="macro-chip fat">G {Math.round(log.grasas)}g</span>
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', flexShrink: 0 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)', marginRight: '0.25rem' }}>
            {formatTimeAR(log.fecha)}
          </span>
          <button className="food-action-btn" onClick={() => setExpanded(!expanded)} title="Expandir">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button className="food-action-btn" onClick={() => setEditing(true)} title="Editar">
            <Pencil size={13} />
          </button>
          <button className="food-action-btn danger" onClick={handleDelete} disabled={deleting} title="Eliminar">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Day Group ────────────────────────────────────────────────────────────────
function DayGroup({ day, logs }: { day: string; logs: FoodLog[] }) {
  const [expanded, setExpanded] = useState(false)
  const { kcal, prot, carbs, fat } = dayTotals(logs)

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: '0.625rem', padding: 0,
        }}
      >
        <span className="section-title" style={{ marginBottom: 0, textTransform: 'capitalize' }}>{day}</span>
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          <span className="macro-chip calories">{Math.round(kcal)} kcal</span>
          {expanded && (
            <>
              <span className="macro-chip protein">P {Math.round(prot)}g</span>
              <span className="macro-chip carbs">C {Math.round(carbs)}g</span>
              <span className="macro-chip fat">G {Math.round(fat)}g</span>
            </>
          )}
          {expanded ? <ChevronUp size={14} style={{ color: 'var(--color-text-subtle)' }} /> : <ChevronDown size={14} style={{ color: 'var(--color-text-subtle)' }} />}
        </div>
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {logs.map((log) => <HistorialLogItem key={log.id} log={log} />)}
      </div>
    </div>
  )
}

// ─── Personal Food Item ───────────────────────────────────────────────────────
function PersonalFoodItem({ food }: { food: PersonalFood }) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar "${food.nombre_alimento}" del diccionario?`)) return
    setDeleting(true)
    await deletePersonalFood(food.id)
  }

  const sourceLabel = food.fuente === 'gemini_foto' ? 'Foto' : food.fuente === 'memoria' ? 'Memoria' : 'IA'

  return (
    <>
      {editing && <EditPersonalFoodModal food={food} onClose={() => setEditing(false)} />}
      <div className="food-card" style={{ opacity: deleting ? 0.4 : 1, animation: 'none' }}>
        <div className="food-icon" style={{ background: 'var(--color-surface-2)', fontSize: '1rem' }}>
          🥫
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {food.nombre_alimento}
          </div>
          <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="macro-chip calories">{Math.round(food.calorias)} kcal</span>
            {expanded && (
              <>
                <span className="macro-chip protein">P {Math.round(food.proteinas)}g</span>
                <span className="macro-chip carbs">C {Math.round(food.carbohidratos)}g</span>
                <span className="macro-chip fat">G {Math.round(food.grasas)}g</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-subtle)' }}>
                  por {Math.round(food.porcion_gramos)}g
                </span>
              </>
            )}
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-subtle)', marginLeft: 'auto' }}>
              {sourceLabel}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem', flexShrink: 0 }}>
          <button className="food-action-btn" onClick={() => setExpanded(!expanded)} title="Ver nutrientes">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button className="food-action-btn" onClick={() => setEditing(true)} title="Editar">
            <Pencil size={13} />
          </button>
          <button className="food-action-btn danger" onClick={handleDelete} disabled={deleting} title="Eliminar">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HistorialClient({ logs, personalFoods }: Props) {
  const [period, setPeriod] = useState<Period>('7d')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'historial' | 'diccionario'>('historial')

  const filteredLogs = filterByPeriod(logs, period).filter(l =>
    l.nombre_alimento.toLowerCase().includes(search.toLowerCase())
  )
  const filteredFoods = personalFoods.filter(f =>
    f.nombre_alimento.toLowerCase().includes(search.toLowerCase())
  )

  const grouped = groupByDay(filteredLogs)
  const days = Object.keys(grouped)

  return (
    <>
      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setActiveTab('historial')}
          className={`tab-btn ${activeTab === 'historial' ? 'active' : ''}`}
          id="tab-historial"
        >
          <BookOpen size={14} />
          Historial
        </button>
        <button
          onClick={() => setActiveTab('diccionario')}
          className={`tab-btn ${activeTab === 'diccionario' ? 'active' : ''}`}
          id="tab-diccionario"
        >
          <Database size={14} />
          Diccionario
          {personalFoods.length > 0 && (
            <span className="tab-badge">{personalFoods.length}</span>
          )}
        </button>
      </div>

      {/* ── Search ── */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <Search size={15} style={{
          position: 'absolute', left: '0.875rem', top: '50%',
          transform: 'translateY(-50%)', color: 'var(--color-text-subtle)',
          pointerEvents: 'none',
        }} />
        <input
          className="universal-input"
          type="text"
          placeholder={activeTab === 'historial' ? 'Buscar comida...' : 'Buscar alimento...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '2.25rem', borderRadius: 'var(--radius-md)', width: '100%' }}
          id="input-search"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute', right: '0.75rem', top: '50%',
              transform: 'translateY(-50%)', background: 'none', border: 'none',
              cursor: 'pointer', color: 'var(--color-text-subtle)', display: 'flex',
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Historial Tab ── */}
      {activeTab === 'historial' && (
        <>
          {/* Period Filter */}
          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.25rem' }}>
            {([
              { value: 'today', label: 'Hoy' },
              { value: '3d', label: '3 días' },
              { value: '7d', label: '7 días' },
            ] as { value: Period; label: string }[]).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={`period-btn ${period === value ? 'active' : ''}`}
                id={`btn-period-${value}`}
              >
                {label}
              </button>
            ))}
          </div>

          {days.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><span style={{ fontSize: '2rem' }}>📋</span></div>
              <h3>{search ? 'Sin resultados' : 'Sin registros'}</h3>
              <p>{search ? `No se encontró "${search}"` : 'Empezá a registrar tus comidas desde el Dashboard.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {days.map(day => (
                <DayGroup key={day} day={day} logs={grouped[day]} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Diccionario Tab ── */}
      {activeTab === 'diccionario' && (
        <>
          {filteredFoods.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><span style={{ fontSize: '2rem' }}>🥫</span></div>
              <h3>{search ? 'Sin resultados' : 'Diccionario vacío'}</h3>
              <p>{search ? `No se encontró "${search}"` : 'Los alimentos que registrés se guardarán acá automáticamente.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredFoods.map(food => (
                <PersonalFoodItem key={food.id} food={food} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
