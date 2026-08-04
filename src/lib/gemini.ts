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
export async function analyzeTextInput(text: string, profile: UserProfile, totals: DayTotals): Promise<GeminiAnalysisResult> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: foodAnalysisSchema,
    },
  })

  const systemPrompt = `Eres un asistente experto en nutrición integrado en una app de control calórico.
Tu trabajo es analizar el texto del usuario y determinar su intención.

CONTEXTO DEL USUARIO:
- Metas Diarias: ${profile.meta_calorias} kcal, ${profile.meta_proteinas}g proteína, ${profile.meta_carbohidratos}g carbohidratos, ${profile.meta_grasas}g grasas.
- Consumo de Hoy: ${Math.round(totals.total_calorias)} kcal consumidas (${Math.round(profile.meta_calorias - totals.total_calorias)} kcal restantes).
Ten en cuenta este contexto al dar respuestas, consejos o responder preguntas sobre si algo es "mucho" o "poco".

REGLAS:
1. Si el usuario menciona que comió/bebió algo → intent: "log_food"
2. Si menciona querer escanear o leer una etiqueta nutricional → intent: "read_label"
3. Si pide recomendaciones o consejos → intent: "recommendation"
4. Si el mensaje no es claro → intent: "need_more_info"

Para intent "log_food":
- Extrae el nombre del alimento en español, limpio y conciso (ej: "barra de cereal Granix", "manzana", "pollo a la plancha")
- is_generic_food = true SOLO si es un alimento genérico sin marca (manzana, arroz, pollo, huevo, banana, yogur natural, etc.)
- is_generic_food = false si es un producto empaquetado con marca o nombre específico
- Si is_generic_food = true, estima los macros razonablemente para la porción mencionada o una porción estándar
- Si is_generic_food = false, NO estimes macros (data = null)
- response_text debe ser amigable, confirmar el registro con un emoji, y puede mencionar sutilmente el impacto en las metas de hoy.

Para otros intents, response_text debe ser un mensaje útil y amigable en español.
Las cantidades de macros deben ser números realistas y razonables.`

  const result = await model.generateContent([systemPrompt, text])
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

  const prompt = `Analiza esta imagen de tabla nutricional y extrae la información.
${foodNameHint ? `El alimento debería ser: ${foodNameHint}` : ''}

Extrae:
1. Nombre del producto
2. Calorías por porción (en kcal)
3. Proteínas por porción (en gramos)
4. Carbohidratos totales por porción (en gramos)  
5. Grasas totales por porción (en gramos)
6. Tamaño de porción (en gramos)

Si no podés leer claramente la tabla nutricional, indica success: false con un mensaje explicativo.
Si la imagen no es una tabla nutricional, indica success: false.
Usa los valores POR PORCIÓN, no por 100g.`

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
