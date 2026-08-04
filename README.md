# CaloriesControl

MVP de control nutricional con IA (Google Gemini 1.5 Flash) + Supabase + Next.js.

## Setup

```bash
npm install
cp .env.local.example .env.local
# Completar variables de entorno
npm run dev
```

## Variables de Entorno

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

## Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS v4
- **Backend**: Supabase (Auth + PostgreSQL)
- **IA**: Google Gemini 1.5 Flash
