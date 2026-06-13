export type MetalPrices = {
  gold: number | null
  silver: number | null
  platinum: number | null
  fetchedAt: string
}

export async function fetchMetalPrices(): Promise<MetalPrices> {
  const apiKey = process.env.METALS_API_KEY
  try {
    const res = await fetch(
      `https://api.metals.dev/v1/latest?api_key=${apiKey}&currency=USD&unit=toz`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) throw new Error('metals api error')
    const data = await res.json()
    const metals = data.metals ?? {}
    return {
      gold: metals.gold ?? null,
      silver: metals.silver ?? null,
      platinum: metals.platinum ?? null,
      fetchedAt: new Date().toISOString(),
    }
  } catch {
    // Return null prices if the API is unreachable (demo key limited)
    return { gold: null, silver: null, platinum: null, fetchedAt: new Date().toISOString() }
  }
}
