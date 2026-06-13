import { supabase, type Inquiry, type FacetCut } from '@/lib/supabase'
import { fetchMetalPrices } from '@/lib/metals'
import { calculateQuote } from '@/lib/pricing'
import { TrendingUp, DollarSign, Gem, ClipboardList } from 'lucide-react'

async function getInquiries(): Promise<Inquiry[]> {
  const { data } = await supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
}

async function getFacetCuts(): Promise<Record<string, FacetCut>> {
  const { data } = await supabase.from('facet_cuts').select('*')
  const map: Record<string, FacetCut> = {}
  for (const cut of data ?? []) map[cut.id] = cut
  return map
}

function formatPrice(val: number | null) {
  if (val === null) return 'N/A'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(val)
}

export default async function AdminPage() {
  const [metals, inquiries, cutsMap] = await Promise.all([
    fetchMetalPrices(),
    getInquiries(),
    getFacetCuts(),
  ])

  const exampleQuote = calculateQuote(4, 150, 1.4)

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-3xl font-bold text-amber-400">Admin Dashboard</h1>
        <p className="text-stone-400 mt-1">Live metal prices, pricing calculator, and inquiries.</p>
      </div>

      {/* Metal Ticker */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-amber-400" /> Live Metal Prices
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Gold (XAU)', value: metals.gold },
            { label: 'Silver (XAG)', value: metals.silver },
            { label: 'Platinum (XPT)', value: metals.platinum },
          ].map(({ label, value }) => (
            <div key={label} className="bg-stone-900 border border-stone-800 rounded-xl p-5 flex flex-col gap-1">
              <span className="text-xs text-stone-500 uppercase tracking-widest">{label}</span>
              <span className="text-2xl font-bold text-amber-400">{formatPrice(value)}</span>
              <span className="text-xs text-stone-600">per troy oz · USD</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-600 mt-2">
          Fetched {new Date(metals.fetchedAt).toLocaleString()} · Refreshes every 5 min
          {metals.gold === null && ' · Set METALS_API_KEY env var for live data'}
        </p>
      </section>

      {/* Pricing Calculator Example */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-amber-400" /> Pricing Formula
        </h2>
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 font-mono text-sm">
          <p className="text-stone-400 mb-2">calculateQuote(hours, materialCost, complexityMultiplier)</p>
          <p className="text-stone-300">= hours × $100/hr × complexity + materialCost</p>
          <p className="text-stone-600 mt-3 text-xs">Example: 4h, $150 material, Portuguese cut (×1.4)</p>
          <p className="text-amber-400 text-xl font-bold mt-1">{formatPrice(exampleQuote)}</p>
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-stone-300 mb-2 flex items-center gap-1.5">
            <Gem className="w-4 h-4 text-amber-500" /> Cut Complexity Multipliers
          </h3>
          <div className="flex flex-wrap gap-3">
            {Object.values(cutsMap).map((cut) => (
              <div key={cut.id} className="bg-stone-800 rounded-lg px-3 py-1.5 text-sm">
                <span className="text-stone-200">{cut.name}</span>
                <span className="text-amber-400 ml-2">×{cut.difficulty_multiplier}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Inquiries */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-amber-400" /> Custom Inquiries ({inquiries.length})
        </h2>
        {inquiries.length === 0 ? (
          <p className="text-stone-500 py-8 text-center">No inquiries yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-900 text-stone-400 text-left">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Budget</th>
                  <th className="px-4 py-3 font-medium">Cut</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inq, i) => (
                  <tr key={inq.id} className={i % 2 === 0 ? 'bg-stone-950' : 'bg-stone-900/50'}>
                    <td className="px-4 py-3 text-stone-200">{inq.name}</td>
                    <td className="px-4 py-3 text-stone-400">{inq.email}</td>
                    <td className="px-4 py-3 text-amber-400">{formatPrice(inq.budget_usd)}</td>
                    <td className="px-4 py-3 text-stone-400">
                      {inq.facet_cut_id ? (cutsMap[inq.facet_cut_id]?.name ?? '—') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-stone-800 text-stone-300">
                        {inq.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {new Date(inq.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
