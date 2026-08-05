'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { analyzeTextInput, analyzeNutritionLabel } from '@/lib/gemini'
import { searchPersonalFood, saveFoodLog, savePersonalFood, getUserProfile, getTodayTotals } from '@/lib/queries'
import { searchOpenFoodFacts } from '@/lib/openFoodFacts'

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
export async function processTextInput(
  text: string,
  history: { role: string; parts: { text: string }[] }[] = []
): Promise<ProcessInputResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'No autenticado' }

  if (!text.trim()) return { status: 'error', message: 'Escribí algo primero' }

  // Obtener contexto del usuario (metas y consumo del día)
  const profile = await getUserProfile(user.id)
  const totals = await getTodayTotals(user.id)

  // ─── PASO A: Gemini analiza la intención ───────────────────────────────────
  let geminiResult
  try {
    geminiResult = await analyzeTextInput(text, profile, totals, history)
  } catch (err) {
    console.error('Gemini error:', err)
    return { status: 'error', message: '⚠️ Error al conectar con la IA. Intentá de nuevo.' }
  }

  if (geminiResult.intent !== 'log_food') {
    return { status: 'info', message: geminiResult.response_text }
  }

  const foodName = geminiResult.extracted_food_name

  // ─── PASO B: Buscar en diccionario personal ────────────────────────────────
  const personalFood = await searchPersonalFood(user.id, foodName)

  if (personalFood) {
    // ✅ Encontrado en memoria — usar macros exactos guardados
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
      message: `🧠 **${personalFood.nombre_alimento}** — ${Math.round(personalFood.calorias)} kcal (de tu diccionario)`,
      foodName: personalFood.nombre_alimento,
    }
  }

  // ─── PASO C: Alimento genérico → Gemini estima fresco (no guarda en memoria) ─
  // Para genéricos (manzana, pollo, arroz) Gemini ya calculó los macros según
  // la cantidad mencionada. NO los guardamos en el diccionario porque la próxima
  // vez puede ser una cantidad diferente.
  if (geminiResult.is_generic_food && geminiResult.data) {
    const { calorias, proteinas, carbohidratos, grasas, porcion_gramos } = geminiResult.data

    await saveFoodLog(user.id, {
      nombre_alimento: foodName,
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
      message: geminiResult.response_text || `✅ **${foodName}** — ~${Math.round(calorias)} kcal estimadas`,
      foodName,
    }
  }

  // ─── PASO D: Producto de marca → buscar en Open Food Facts ────────────────
  const offResult = await searchOpenFoodFacts(foodName)

  if (offResult.found) {
    const { nombre_alimento, nutriments } = offResult
    const { calorias, proteinas, carbohidratos, grasas, porcion_gramos } = nutriments

    // Guardar en diccionario personal para futuras búsquedas
    await savePersonalFood(user.id, {
      nombre_alimento,
      calorias,
      proteinas,
      carbohidratos,
      grasas,
      porcion_gramos,
      fuente: 'openfoodfacts',
    })

    // Registrar en el diario
    await saveFoodLog(user.id, {
      nombre_alimento,
      calorias,
      proteinas,
      carbohidratos,
      grasas,
      porcion_gramos,
      fuente: 'openfoodfacts',
    })

    revalidatePath('/dashboard')
    return {
      status: 'logged',
      message: `🌐 **${nombre_alimento}** — ${Math.round(calorias)} kcal (Open Food Facts). Guardado en tu diccionario.`,
      foodName: nombre_alimento,
    }
  }

  // ─── PASO E: No encontrado en ninguna fuente → pedir foto ─────────────────
  return {
    status: 'need_photo',
    message: `📸 No encontré **${foodName}** en tu diccionario ni en internet. ¿Podés subir la foto de la tabla nutricional?`,
    foodName,
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

  // Convertir File a base64 — usar arrayBuffer con manejo explícito
  let base64: string
  let mimeType: string
  try {
    const arrayBuffer = await file.arrayBuffer()
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return { status: 'error', message: '❌ La imagen está vacía o no se pudo leer. Intentá de nuevo.' }
    }
    base64 = Buffer.from(arrayBuffer).toString('base64')
    mimeType = file.type || 'image/jpeg'
  } catch (err) {
    console.error('Error leyendo imagen:', err)
    return { status: 'error', message: '❌ No se pudo leer la imagen. Intentá con otra foto.' }
  }

  // Analizar la foto con Gemini Vision
  let labelResult
  try {
    labelResult = await analyzeNutritionLabel(base64, mimeType, foodNameHint ?? undefined)
  } catch (err) {
    console.error('Gemini Vision error:', err)
    return { status: 'error', message: '⚠️ Error al analizar la imagen. Verificá tu conexión e intentá de nuevo.' }
  }

  if (!labelResult.success) {
    return {
      status: 'error',
      message: labelResult.error_message ?? '❌ No se pudo leer la tabla nutricional. Tomá la foto de frente y con buena luz.',
    }
  }

  const { nombre_alimento, calorias, proteinas, carbohidratos, grasas, porcion_gramos } = labelResult

  // Guardar en el diccionario personal (para siempre, hace upsert si ya existe)
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
    message: `✅ **${nombre_alimento}** — ${Math.round(calorias)} kcal por porción. Guardado en tu diccionario.`,
    foodName: nombre_alimento,
  }
}
