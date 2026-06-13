import Link from 'next/link'
import { supabase, type Project, type Milestone, type FacetCut } from '@/lib/supabase'
import { fetchMetalPrices } from '@/lib/metals'
import { calculateQuote } from '@/lib/pricing'
import { STATUS_LABELS } from '@/lib/projectFlow'
import { activeProvider } from '@/lib/payments'
import AdminMilestoneRow from '@/app/components/AdminMilestoneRow'
import { TrendingUp, DollarSign, Gem, FolderKanban } from 'lucide-react'

function money(v: number | null) {
  if (v === null) return 'N/A'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v)
}

export default async function AdminPage() {
  const [metals, projectsRes, milestonesRes, cutsRes] = await Promise.all([
    fetchMetalPrices(),
    supabase.from('koz_projects').select('*').order('created_at', { ascending: false }),
    supabase.from('koz_milestones').select('*').order('sort_order'),
    supabase.from('facet_cuts').select('*'),
  ])

  const projects = (projectsRes.data ?? []) as Project[]
  const milestones = (milestonesRes.data ?? []) as Milestone[]
  const cuts = (cutsRes.data ?? []) as FacetCut[]
  const milestonesByProject = milestones.reduce<Record<string, Milestone[]>>((acc, m) => {
    ;(acc[m.project_id] ??= []).push(m)
    return acc
  }, {})

  const exampleQuote = calculateQuote(4, 150, 1.4)
  const provider = activeProvider()

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="text-3xl font-bold text-amber-400">Admin Dashboard</h1>
        <p className="text-stone-400 mt-1">
          Project pipeline, milestone payments, live metal prices, and pricing.
        </p>
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
              <span className="text-2xl font-bold text-amber-400">{money(value)}</span>
              <span className="text-xs text-stone-600">per troy oz · USD</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-600 mt-2">
          Fetched {new Date(metals.fetchedAt).toLocaleString()} · Refreshes every 5 min
          {metals.gold === null && ' · Set METALS_API_KEY env var for live data'}
        </p>
      </section>

      {/* Project Pipeline */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-amber-400" /> Project Pipeline ({projects.length})
        </h2>
        {projects.length === 0 ? (
          <p className="text-stone-500 py-8 text-center">No projects yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {projects.map((p) => (
              <div key={p.id} className="bg-stone-900 border border-stone-800 rounded-xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/projects/${p.id}`} className="font-semibold text-stone-100 hover:text-amber-400">
                      {p.title}
                    </Link>
                    <p className="text-sm text-stone-500">
                      {p.client_name} · {p.client_email}
                    </p>
                    <p className="text-xs text-stone-600 mt-1">
                      Budget {money(p.budget_min)} – {money(p.budget_max)}
                      {p.final_agreed_price !== null && ` · Agreed ${money(p.final_agreed_price)}`}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    {STATUS_LABELS[p.status]}
                  </span>
                </div>

                {milestonesByProject[p.id]?.length ? (
                  <div className="mt-4 border-t border-stone-800 pt-2 divide-y divide-stone-800/60">
                    {milestonesByProject[p.id].map((m) => (
                      <AdminMilestoneRow key={m.id} milestone={m} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-stone-600 mt-3">No milestones set for this project yet.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pricing Calculator */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-amber-400" /> Pricing Formula
        </h2>
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-6 font-mono text-sm">
          <p className="text-stone-400 mb-2">calculateQuote(hours, materialCost, complexityMultiplier)</p>
          <p className="text-stone-300">= hours × $100/hr × complexity + materialCost</p>
          <p className="text-stone-600 mt-3 text-xs">Example: 4h, $150 material, Portuguese cut (×1.4)</p>
          <p className="text-amber-400 text-xl font-bold mt-1">{money(exampleQuote)}</p>
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-stone-300 mb-2 flex items-center gap-1.5">
            <Gem className="w-4 h-4 text-amber-500" /> Cut Complexity Multipliers
          </h3>
          <div className="flex flex-wrap gap-3">
            {cuts.map((cut) => (
              <div key={cut.id} className="bg-stone-800 rounded-lg px-3 py-1.5 text-sm">
                <span className="text-stone-200">{cut.name}</span>
                <span className="text-amber-400 ml-2">×{cut.difficulty_multiplier}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <p className="text-xs text-stone-600">
        Payment provider: <span className="text-stone-400 font-mono">{provider}</span>
        {provider === 'mock' && ' — set STRIPE_SECRET_KEY (or a crypto provider key) to enable real checkout.'}
      </p>
    </div>
  )
}
