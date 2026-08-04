'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, User } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/historial', label: 'Historial', icon: BookOpen },
  { href: '/perfil', label: 'Perfil', icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={pathname.startsWith(href) ? 'active' : ''}
          aria-label={label}
        >
          <Icon size={22} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}
