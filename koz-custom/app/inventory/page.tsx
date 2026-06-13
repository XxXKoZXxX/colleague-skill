import { supabase, type RoughStone } from '@/lib/supabase'
import { Package } from 'lucide-react'

async function getInventory(): Promise<RoughStone[]> {
  const { data } = await supabase
    .from('rough_inventory')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function InventoryPage() {
  const stones = await getInventory()

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold text-amber-400">Rough Stone Inventory</h1>
        <p className="text-stone-400 mt-1">Available rough stones for custom orders.</p>
      </div>

      {stones.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-stone-600">
          <Package className="w-10 h-10" />
          <p>No stones in inventory yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stones.map((stone) => (
            <div key={stone.id} className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
              {stone.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={stone.image_url} alt={stone.origin} className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 bg-stone-800 flex items-center justify-center text-stone-600">
                  <Package className="w-8 h-8" />
                </div>
              )}
              <div className="p-4 flex flex-col gap-2">
                <h3 className="font-semibold text-stone-100">{stone.origin}</h3>
                <div className="flex flex-wrap gap-3 text-sm text-stone-400">
                  <span>{stone.weight_carats} ct</span>
                  {stone.estimated_yield_pct !== null && (
                    <span>~{stone.estimated_yield_pct}% yield</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
