'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Leaf, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    router.push('/dashboard')
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

        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.375rem' }}>Bienvenido de nuevo</h1>
        <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '2rem' }}>
          Ingresá a tu cuenta para continuar
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

        <form onSubmit={handleLogin}>
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
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
            id="btn-login"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Ingresando...</>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          ¿No tenés cuenta?{' '}
          <Link
            href="/register"
            style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}
          >
            Registrate gratis
          </Link>
        </div>
      </div>
    </div>
  )
}
