import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CaloriesControl — Control Nutricional con IA',
  description: 'Registrá tus comidas con lenguaje natural o fotos. Control nutricional inteligente con Google Gemini.',
  keywords: ['nutrición', 'calorías', 'macros', 'dieta', 'control nutricional', 'IA'],
  authors: [{ name: 'CaloriesControl' }],
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  themeColor: '#10b981',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
