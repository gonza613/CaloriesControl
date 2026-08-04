import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserProfile } from '@/lib/queries'
import ProfileForm from '@/components/ProfileForm'
import { createClient as createBrowserClient } from '@/lib/supabase/server'
import { LogOut, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Perfil — CaloriesControl',
  description: 'Editá tus metas nutricionales',
}

async function LogoutButton() {
  async function signOut() {
    'use server'
    const supabase = await createBrowserClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <form action={signOut}>
      <button type="submit" className="btn btn-ghost" style={{ gap: '0.5rem' }} id="btn-logout">
        <LogOut size={16} />
        Cerrar sesión
      </button>
    </form>
  )
}

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await getUserProfile(user.id)

  return (
    <main className="page-content-no-input">
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.8125rem',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              marginBottom: '0.375rem',
            }}
          >
            <ChevronLeft size={14} />
            Dashboard
          </Link>
          <h1>Mi Perfil</h1>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {user.email}
          </p>
        </div>
        <LogoutButton />
      </div>

      <ProfileForm profile={profile} />
    </main>
  )
}
