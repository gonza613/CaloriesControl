'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { analyzeTextInput, analyzeNutritionLabel } from '@/lib/gemini'
import { searchPersonalFood, saveFoodLog, savePersonalFood } from '@/lib/queries'

// ============================================================
// TIPOS
// ============================================================
export type ProcessInputResult =
  | { status: 'logged'; message: string; foodName: string }
  | { status: 'need_photo'; message: string; foodName: string }
  | { status: 'info'; message: string }
  | { status: 'error'; message: string }

// ============================================================
// ACTION: Procesar texto del Input Universal
// ============================================================
export async function processTextInput(text: string): Promise<ProcessInputResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'No autenticado' }

  if (!text.trim()) return { status: 'error', message: 'Escribí algo primero' }

  // PASO A: Enviar a Gemini para analizar la intención
  let geminiResult
  try {
    geminiResult = await analyzeTextInput(text)
  } catch (err) {
    console.error('Gemini error:', err)
    return { status: 'error', message: '⚠️ Error al conectar con la IA. Intentá de nuevo.' }
  }

  // Si no es log_food, devolver el mensaje de Gemini
  if (geminiResult.intent !== 'log_food') {
    return { status: 'info', message: geminiResult.response_text }
  }

  // PASO B: Buscar el alimento en el diccionario personal del usuario
  const personalFood = await searchPersonalFood(user.id, geminiResult.extracted_food_name)

  if (personalFood) {
    // ✅ CASO 1: Encontrado en memoria — usar esos macros exactos
    await saveFoodLog(user.id, {
      nombre_alimento: personalFood.nombre_alimento,
      calorias: personalFood.calorias,
      proteinas: personalFood.proteinas,
      carbohidratos: personalFood.carbohidratos,
      grasas: personalFood.grasas,
      porcion_gramos: personalFood.porcion_gramos,
      fuente: 'memoria',
    })

    revalidatePath('/dashboard')
    return {
      status: 'logged',
      message: `🧠 Registrado desde tu memoria: **${personalFood.nombre_alimento}** — ${Math.round(personalFood.calorias)} kcal`,
      foodName: personalFood.nombre_alimento,
    }
  }

  // PASO C: No encontrado en memoria
  if (geminiResult.is_generic_food && geminiResult.data) {
    // ✅ CASO 2: Alimento genérico — usar estimación de Gemini
    const { calorias, proteinas, carbohidratos, grasas, porcion_gramos } = geminiResult.data

    await saveFoodLog(user.id, {
      nombre_alimento: geminiResult.extracted_food_name,
      calorias,
      proteinas,
      carbohidratos,
      grasas,
      porcion_gramos,
      fuente: 'gemini_estimado',
    })

    // También guardar en el diccionario personal para futuras búsquedas
    await savePersonalFood(user.id, {
      nombre_alimento: geminiResult.extracted_food_name,
      calorias,
      proteinas,
      carbohidratos,
      grasas,
      porcion_gramos,
      fuente: 'gemini_estimado',
    })

    revalidatePath('/dashboard')
    return {
      status: 'logged',
      message: geminiResult.response_text || `✅ Registrado: **${geminiResult.extracted_food_name}** — ~${Math.round(calorias)} kcal estimadas`,
      foodName: geminiResult.extracted_food_name,
    }
  }

  // ❌ CASO 3: Producto empaquetado específico sin datos — pedir foto
  return {
    status: 'need_photo',
    message: `📸 No tengo guardado **${geminiResult.extracted_food_name}** en tu diccionario. ¿Podés subir una foto de la tabla nutricional para guardarlo para siempre?`,
    foodName: geminiResult.extracted_food_name,
  }
}

// ============================================================
// ACTION: Procesar foto de tabla nutricional
// ============================================================
export async function processNutritionLabelPhoto(
  formData: FormData
): Promise<ProcessInputResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'No autenticado' }

  const file = formData.get('image') as File | null
  const foodNameHint = formData.get('food_name') as string | null

  if (!file || file.size === 0) {
    return { status: 'error', message: 'No se recibió imagen' }
  }

  // Convertir File a base64
  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')
  const mimeType = file.type || 'image/jpeg'

  // Analizar la foto con Gemini Vision
  let labelResult
  try {
    labelResult = await analyzeNutritionLabel(base64, mimeType, foodNameHint ?? undefined)
  } catch (err) {
    console.error('Gemini Vision error:', err)
    return { status: 'error', message: '⚠️ Error al analizar la imagen. Intentá de nuevo.' }
  }

  if (!labelResult.success) {
    return {
      status: 'error',
      message: labelResult.error_message ?? '❌ No se pudo leer la tabla nutricional. Tomá la foto de frente y con buena luz.',
    }
  }

  const { nombre_alimento, calorias, proteinas, carbohidratos, grasas, porcion_gramos } = labelResult

  // Guardar en el diccionario personal (para siempre)
  await savePersonalFood(user.id, {
    nombre_alimento,
    calorias,
    proteinas,
    carbohidratos,
    grasas,
    porcion_gramos,
    fuente: 'gemini_foto',
  })

  // Guardar en el diario de hoy
  await saveFoodLog(user.id, {
    nombre_alimento,
    calorias,
    proteinas,
    carbohidratos,
    grasas,
    porcion_gramos,
    fuente: 'gemini_foto',
  })

  revalidatePath('/dashboard')
  return {
    status: 'logged',
    message: `✅ ¡**${nombre_alimento}** guardado en tu diccionario! — ${Math.round(calorias)} kcal por porción. Registrado en tu diario.`,
    foodName: nombre_alimento,
  }
}
