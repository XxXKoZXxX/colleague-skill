import { supabase, type Stone } from '@/lib/supabase'
import { Gem, FileBadge, ZoomIn } from 'lucide-react'

function money(v: number | null) {
  if (v === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)
}

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  reserved: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  sold: 'bg-stone-700/40 text-stone-400 border-stone-600',
}

async function getStones(): Promise<Stone[]> {
  const { data } = await supabase
    .from('koz_stones_inventory')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []) as Stone[]
}

export default async function VaultPage() {
  const stones = await getStones()

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold text-amber-400 flex items-center gap-2">
          <Gem className="w-7 h-7" /> The Gemologist&apos;s Vault
        </h1>
        <p className="text-stone-400 mt-1">
          Each stone is hand-selected and graded. Certified gemologist &amp; geologist —
          no dropshipped glass, ever.
        </p>
      </div>

      {stones.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-stone-600">
          <Gem className="w-10 h-10" />
          <p>No stones in the vault yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stones.map((stone) => (
            <div key={stone.id} className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden flex flex-col">
              <div className="relative group">
                {stone.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={stone.image_url} alt={stone.type} className="w-full h-48 object-cover" />
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center text-stone-600">
                    <Gem className="w-10 h-10" />
                  </div>
                )}
                {/* Gemologist's Loupe hint */}
                <div className="absolute top-2 right-2 bg-stone-950/80 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="w-4 h-4 text-amber-400" />
                </div>
                <span
                  className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[stone.status]}`}
                >
                  {stone.status}
                </span>
              </div>

              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-semibold text-stone-100">{stone.type}</h3>
                  <span className="text-amber-400 font-semibold">{money(stone.retail_price)}</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-stone-400">
                  {stone.weight_carats !== null && <span>{stone.weight_carats} ct</span>}
                  {stone.dimensions && <span>· {stone.dimensions}</span>}
                </div>
                {stone.origin && <p className="text-sm text-stone-500">Origin: {stone.origin}</p>}
                {stone.notes && <p className="text-sm text-stone-400 italic">{stone.notes}</p>}
                {stone.certificate_url && (
                  <a
                    href={stone.certificate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300"
                  >
                    <FileBadge className="w-3.5 h-3.5" /> View gemology certificate
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
