/**
 * Open Food Facts API — cliente gratuito, sin API key
 * Docs: https://wiki.openfoodfacts.org/API
 */

export type OFFNutriments = {
  calorias: number
  proteinas: number
  carbohidratos: number
  grasas: number
  porcion_gramos: number
}

export type OFFResult = {
  found: true
  nombre_alimento: string
  nutriments: OFFNutriments
} | {
  found: false
}

/**
 * Busca un producto en Open Food Facts por nombre.
 * Retorna los macros por porción o null si no se encuentra.
 * Usa la API v2 con búsqueda por texto.
 */
export async function searchOpenFoodFacts(
  productName: string
): Promise<OFFResult> {
  try {
    const query = encodeURIComponent(productName)
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,nutriments,serving_size,serving_quantity`

    const res = await fetch(url, {
      headers: { 'User-Agent': 'CaloriesControl/1.0 (personal app)' },
      // Timeout de 5 segundos para no bloquear demasiado
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return { found: false }

    const data = await res.json()

    if (!data.products || data.products.length === 0) return { found: false }

    // Buscar el primer producto con datos nutricionales completos
    for (const product of data.products) {
      const n = product.nutriments
      if (!n) continue

      // Intentar obtener valores por porción primero, luego por 100g como fallback
      const servingQty = parseFloat(product.serving_quantity) || 100
      const factor = servingQty / 100

      const calorias = n['energy-kcal_serving'] || (n['energy-kcal_100g'] || 0) * factor
      const proteinas = n['proteins_serving'] ?? (n['proteins_100g'] || 0) * factor
      const carbohidratos = n['carbohydrates_serving'] ?? (n['carbohydrates_100g'] || 0) * factor
      const grasas = n['fat_serving'] ?? (n['fat_100g'] || 0) * factor

      // Descartar si los datos son claramente inválidos
      if (calorias <= 0 || calorias > 2000) continue
      if (proteinas < 0 || carbohidratos < 0 || grasas < 0) continue

      const nombre = product.product_name?.trim() || productName

      return {
        found: true,
        nombre_alimento: nombre,
        nutriments: {
          calorias: Math.round(calorias * 10) / 10,
          proteinas: Math.round(proteinas * 10) / 10,
          carbohidratos: Math.round(carbohidratos * 10) / 10,
          grasas: Math.round(grasas * 10) / 10,
          porcion_gramos: servingQty,
        },
      }
    }

    return { found: false }
  } catch (err) {
    // Si la API falla (timeout, red, etc.) simplemente devolvemos not found
    // para no bloquear el flujo principal
    console.error('Open Food Facts error:', err)
    return { found: false }
  }
}
