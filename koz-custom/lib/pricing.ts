const HOURLY_RATE = 100

export function calculateQuote(
  hours: number,
  materialCost: number,
  complexityMultiplier: number
): number {
  return hours * HOURLY_RATE * complexityMultiplier + materialCost
}
