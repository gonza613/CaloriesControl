'use client'

import { useState, useTransition } from 'react'
import { UserProfile } from '@/lib/queries'
import { updateProfile } from '@/actions/updateProfile'
import { Save, Loader2, CheckCircle2, AlertCircle, Target, Zap, Beef, Droplets, Flame } from 'lucide-react'

type Props = {
  profile: UserProfile
}

export default function ProfileForm({ profile }: Props) {
  const [nombre, setNombre] = useState(profile.nombre ?? '')
  const [calorias, setCalorias] = useState(String(profile.meta_calorias))
  const [proteinas, setProteinas] = useState(String(profile.meta_proteinas))
  const [carbohidratos, setCarbohidratos] = useState(String(profile.meta_carbohidratos))
  const [grasas, setGrasas] = useState(String(profile.meta_grasas))
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await updateProfile({
        nombre: nombre.trim() || undefined,
        meta_calorias: parseInt(calorias),
        meta_proteinas: parseInt(proteinas),
        meta_carbohidratos: parseInt(carbohidratos),
        meta_grasas: parseInt(grasas),
      })
      setResult({
        success: res.success,
        message: res.success ? '¡Perfil actualizado exitosamente!' : ('error' in res ? res.error : 'Error desconocido'),
      })
      setTimeout(() => setResult(null), 3000)
    })
  }

  const macroInputs = [
    {
      id: 'calorias', label: 'Meta de Calorías', value: calorias,
      set: setCalorias, unit: 'kcal', icon: Flame,
      color: 'var(--color-primary)', min: 1000, max: 5000,
    },
    {
      id: 'proteinas', label: 'Meta de Proteínas', value: proteinas,
      set: setProteinas, unit: 'g/día', icon: Beef,
      color: 'var(--color-protein)', min: 30, max: 400,
    },
    {
      id: 'carbohidratos', label: 'Meta de Carbohidratos', value: carbohidratos,
      set: setCarbohidratos, unit: 'g/día', icon: Zap,
      color: 'var(--color-carbs)', min: 50, max: 600,
    },
    {
      id: 'grasas', label: 'Meta de Grasas', value: grasas,
      set: setGrasas, unit: 'g/día', icon: Droplets,
      color: 'var(--color-fat)', min: 20, max: 200,
    },
  ]

  return (
    <form onSubmit={handleSubmit}>
      {/* Nombre */}
      <div
        className="card"
        style={{ marginBottom: '1rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
          <Target size={18} color="var(--color-primary)" />
          <h3>Información Personal</h3>
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label className="input-label" htmlFor="nombre">Tu nombre</label>
          <input
            id="nombre"
            type="text"
            className="input"
            placeholder="¿Cómo te llamás?"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>
      </div>

      {/* Macros */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
          <Target size={18} color="var(--color-primary)" />
          <h3>Metas Nutricionales Diarias</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {macroInputs.map(({ id, label, value, set, unit, icon: Icon, color, min, max }) => (
            <div key={id}>
              <label className="input-label" htmlFor={id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Icon size={12} style={{ color }} />
                {label}
              </label>
              <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                <input
                  id={id}
                  type="number"
                  className="input"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  min={min}
                  max={max}
                  required
                  style={{ flex: 1 }}
                />
                <span style={{
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-muted)',
                  fontWeight: 600,
                  minWidth: '3.5rem',
                  textAlign: 'right',
                }}>
                  {unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Result feedback */}
      {result && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: result.success ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
            border: `1px solid ${result.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
            borderRadius: 'var(--radius-md)',
            color: result.success ? 'var(--color-success)' : 'var(--color-danger)',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          {result.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {result.message}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary btn-full btn-lg"
        disabled={isPending}
        id="btn-save-profile"
      >
        {isPending ? (
          <><Loader2 size={18} className="animate-spin" /> Guardando...</>
        ) : (
          <><Save size={18} /> Guardar cambios</>
        )}
      </button>
    </form>
  )
}
