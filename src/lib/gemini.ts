import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import type { UserProfile, DayTotals } from '@/lib/queries'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// ============================================================
// TIPOS
// ============================================================
export type GeminiIntent =
  | 'log_food'
  | 'read_label'
  | 'recommendation'
  | 'need_more_info'

export type MacroData = {
  calorias: number
  proteinas: number
  carbohidratos: number
  grasas: number
  porcion_gramos: number
}

export type GeminiAnalysisResult = {
  intent: GeminiIntent
  extracted_food_name: string
  is_generic_food: boolean
  data: MacroData | null
  response_text: string
}

// ============================================================
// SCHEMA JSON para Structured Outputs
// ============================================================
const foodAnalysisSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    intent: {
      type: SchemaType.STRING,
      format: 'enum',
      enum: ['log_food', 'read_label', 'recommendation', 'need_more_info'],
      description: 'La intención del usuario',
    },
    extracted_food_name: {
      type: SchemaType.STRING,
      description: 'Nombre del alimento extraído del texto del usuario',
    },
    is_generic_food: {
      type: SchemaType.BOOLEAN,
      description: 'True si es un alimento genérico (manzana, pollo), false si es un producto empaquetado de marca específica',
    },
    data: {
      type: SchemaType.OBJECT,
      nullable: true,
      properties: {
        calorias: { type: SchemaType.NUMBER, description: 'Calorías totales en kcal' },
        proteinas: { type: SchemaType.NUMBER, description: 'Proteínas en gramos' },
        carbohidratos: { type: SchemaType.NUMBER, description: 'Carbohidratos en gramos' },
        grasas: { type: SchemaType.NUMBER, description: 'Grasas en gramos' },
        porcion_gramos: { type: SchemaType.NUMBER, description: 'Tamaño de porción en gramos' },
      },
      required: ['calorias', 'proteinas', 'carbohidratos', 'grasas', 'porcion_gramos'],
    },
    response_text: {
      type: SchemaType.STRING,
      description: 'Mensaje amigable para mostrar al usuario',
    },
  },
  required: ['intent', 'extracted_food_name', 'is_generic_food', 'response_text'],
}

// ============================================================
// ANALIZAR TEXTO — Gemini con Structured Output
// ============================================================
export async function analyzeTextInput(
  text: string,
  profile: UserProfile,
  totals: DayTotals,
  history: { role: string; parts: { text: string }[] }[] = []
): Promise<GeminiAnalysisResult> {
  const systemPrompt = `Eres un asistente de nutrición en una app de control calórico. Respondés en español, de forma MUY BREVE y directa. Máximo 1-2 oraciones en response_text. Sin introducciones ni frases de relleno.

CONTEXTO:
- Metas: ${profile.meta_calorias} kcal | ${profile.meta_proteinas}g prot | ${profile.meta_carbohidratos}g carbs | ${profile.meta_grasas}g grasas
- Hoy: ${Math.round(totals.total_calorias)} kcal consumidas, ${Math.round(profile.meta_calorias - totals.total_calorias)} restantes

REGLAS:
1. Usuario menciona que comió/bebió algo → intent: "log_food"
2. Quiere escanear etiqueta → intent: "read_label"
3. Pide recomendaciones/consejos → intent: "recommendation"
4. Mensaje no claro → intent: "need_more_info"

Para "log_food":
- Extrae nombre limpio y conciso del alimento
- is_generic_food = true solo si NO tiene marca específica (manzana, arroz, pollo, huevo, etc.)
- Si is_generic_food = true → estima macros para la porción mencionada o porción estándar
- Si is_generic_food = false → data = null
- response_text: MUY CORTO. Ej: "✅ Manzana registrada — ~95 kcal" o "✅ 2 huevos registrados — ~140 kcal, te quedan ${Math.round(profile.meta_calorias - totals.total_calorias)} kcal"

Para otros intents, response_text breve y útil. Sin emojis en exceso.`

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: foodAnalysisSchema,
    },
  })

  const chat = model.startChat({ history })
  const result = await chat.sendMessage(text)
  const responseText = result.response.text()

  try {
    return JSON.parse(responseText) as GeminiAnalysisResult
  } catch {
    return {
      intent: 'need_more_info',
      extracted_food_name: '',
      is_generic_food: false,
      data: null,
      response_text: '🤔 No entendí bien. ¿Podrías decirme qué comiste con más detalle?',
    }
  }
}

// ============================================================
// ANALIZAR FOTO DE TABLA NUTRICIONAL — Gemini Vision
// ============================================================
const nutritionLabelSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    nombre_alimento: { type: SchemaType.STRING, description: 'Nombre del producto en la etiqueta' },
    calorias: { type: SchemaType.NUMBER, description: 'Calorías por porción' },
    proteinas: { type: SchemaType.NUMBER, description: 'Proteínas en gramos por porción' },
    carbohidratos: { type: SchemaType.NUMBER, description: 'Carbohidratos totales en gramos por porción' },
    grasas: { type: SchemaType.NUMBER, description: 'Grasas totales en gramos por porción' },
    porcion_gramos: { type: SchemaType.NUMBER, description: 'Gramos por porción indicados en la etiqueta' },
    success: { type: SchemaType.BOOLEAN, description: 'True si se pudo leer la tabla nutricional correctamente' },
    error_message: { type: SchemaType.STRING, nullable: true, description: 'Mensaje de error si no se pudo leer' },
  },
  required: ['nombre_alimento', 'calorias', 'proteinas', 'carbohidratos', 'grasas', 'porcion_gramos', 'success'],
}

export type NutritionLabelResult = {
  nombre_alimento: string
  calorias: number
  proteinas: number
  carbohidratos: number
  grasas: number
  porcion_gramos: number
  success: boolean
  error_message?: string | null
}

export async function analyzeNutritionLabel(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  foodNameHint?: string
): Promise<NutritionLabelResult> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: nutritionLabelSchema,
    },
  })

  const prompt = `Analizá esta imagen de tabla nutricional y extraé la información nutricional.
${foodNameHint ? `El alimento es: ${foodNameHint}` : ''}

Necesito:
1. Nombre del producto
2. Calorías POR PORCIÓN (kcal)
3. Proteínas POR PORCIÓN (g)
4. Carbohidratos totales POR PORCIÓN (g)
5. Grasas totales POR PORCIÓN (g)
6. Tamaño de porción (g)

Si la imagen no es legible o no es una tabla nutricional → success: false con error_message explicativo.
Usá siempre valores POR PORCIÓN, nunca por 100g.`

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
  ])

  const responseText = result.response.text()

  try {
    return JSON.parse(responseText) as NutritionLabelResult
  } catch {
    return {
      nombre_alimento: foodNameHint ?? 'Producto',
      calorias: 0,
      proteinas: 0,
      carbohidratos: 0,
      grasas: 0,
      porcion_gramos: 100,
      success: false,
      error_message: 'No se pudo procesar la imagen. Intentá con una foto más clara.',
    }
  }
}
