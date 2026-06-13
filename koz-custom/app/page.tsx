import { supabase, type FacetCut } from '@/lib/supabase'
import InquiryForm from '@/app/components/InquiryForm'
import { Gem, Clock, Award } from 'lucide-react'

async function getFacetCuts(): Promise<FacetCut[]> {
  const { data } = await supabase.from('facet_cuts').select('*').order('name')
  return data ?? []
}

export default async function Home() {
  const facetCuts = await getFacetCuts()

  return (
    <div className="flex flex-col gap-16">
      {/* Hero */}
      <section className="text-center flex flex-col gap-4">
        <h1 className="text-5xl font-bold tracking-tight text-amber-400">
          Koz Custom
        </h1>
        <p className="text-xl text-stone-400 max-w-xl mx-auto">
          Bespoke jewelry crafted from rough stones. From faceting to final setting — entirely custom, entirely yours.
        </p>
        <div className="flex justify-center gap-8 mt-4 text-sm text-stone-500">
          <span className="flex items-center gap-1.5"><Gem className="w-4 h-4 text-amber-500" /> Rough-to-Finished</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-500" /> $100/hr Craftsmanship</span>
          <span className="flex items-center gap-1.5"><Award className="w-4 h-4 text-amber-500" /> Min. $200 Order</span>
        </div>
      </section>

      {/* Inquiry Form */}
      <section className="bg-stone-900 rounded-2xl p-8 border border-stone-800">
        <h2 className="text-2xl font-semibold mb-2">Start a Custom Order</h2>
        <p className="text-stone-400 text-sm mb-8">
          Tell us about your vision. All custom orders have a $200 minimum.
        </p>
        <InquiryForm facetCuts={facetCuts} />
      </section>

      {/* How It Works */}
      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-semibold">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: '01', title: 'Start a Project', desc: 'Submit your budget and vision. Every inquiry becomes a tracked project — minimum $200.' },
            { step: '02', title: 'Approve the Design', desc: 'A small deposit unlocks design renders with gemologist notes. Approve before any metal is cut.' },
            { step: '03', title: 'Pay by Milestone', desc: 'Deposit, materials, then final balance — each stage unlocks the next. Watch progress on your dashboard.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="bg-stone-900 border border-stone-800 rounded-xl p-6 flex flex-col gap-2">
              <span className="text-amber-500 text-xs font-mono font-bold">{step}</span>
              <h3 className="font-semibold text-stone-100">{title}</h3>
              <p className="text-stone-400 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
