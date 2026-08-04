'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Leaf, Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre },
      },
    })

    if (authError) {
      setError(authError.message === 'User already registered'
        ? 'Ya existe una cuenta con ese email'
        : authError.message
      )
      setLoading(false)
      return
    }

    // Intentar iniciar sesión directamente (si email confirmation está deshabilitado)
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })

    if (!loginError) {
      router.push('/dashboard')
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card animate-fade-in" style={{ textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: 'var(--radius-xl)',
            background: 'var(--color-primary-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <CheckCircle2 size={32} color="var(--color-primary)" />
          </div>
          <h2 style={{ marginBottom: '0.75rem' }}>¡Revisá tu email!</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.75rem' }}>
            Te enviamos un link de confirmación a <strong style={{ color: 'var(--color-text)' }}>{email}</strong>.
            Confirmá tu cuenta y luego iniciá sesión.
          </p>
          <Link href="/login" className="btn btn-primary btn-full">
            Ir al Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <Leaf size={22} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
              CaloriesControl
            </div>
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Control nutricional con IA</div>
          </div>
        </div>

        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.375rem' }}>Crear cuenta gratis</h1>
        <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '2rem' }}>
          Empezá a registrar tus comidas hoy
        </p>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              background: 'var(--color-danger-bg)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-danger)',
              fontSize: '0.875rem',
              marginBottom: '1.25rem',
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label className="input-label" htmlFor="nombre">Nombre (opcional)</label>
            <div style={{ position: 'relative' }}>
              <User
                size={16}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-subtle)',
                }}
              />
              <input
                id="nombre"
                type="text"
                className="input"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="Tu nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="email">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-subtle)',
                }}
              />
              <input
                id="email"
                type="email"
                className="input"
                style={{ paddingLeft: '2.75rem' }}
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="password">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-subtle)',
                }}
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="input"
                style={{ paddingLeft: '2.75rem', paddingRight: '3rem' }}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-text-subtle)',
                  display: 'flex',
                }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: '0.5rem' }}
            id="btn-register"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Creando cuenta...</>
            ) : (
              'Crear cuenta gratis'
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          ¿Ya tenés cuenta?{' '}
          <Link
            href="/login"
            style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
          >
            Iniciá sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
