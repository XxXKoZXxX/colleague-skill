'use client'

import { useState, useTransition } from 'react'
import { markMilestonePaid } from '@/app/actions'
import type { Milestone } from '@/lib/supabase'
import { CheckCircle, Loader2 } from 'lucide-react'

function money(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)
}

export default function AdminMilestoneRow({ milestone }: { milestone: Milestone }) {
  const [pending, startTransition] = useTransition()
  const [method, setMethod] = useState('Stripe')

  function settle() {
    startTransition(async () => {
      await markMilestonePaid(milestone.id, milestone.project_id, method)
    })
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="text-stone-300">{milestone.name}</span>
      <div className="flex items-center gap-2">
        <span className="text-stone-400">{money(Number(milestone.amount))}</span>
        {milestone.is_paid ? (
          <span className="flex items-center gap-1 text-emerald-400 text-xs">
            <CheckCircle className="w-3.5 h-3.5" />
            {milestone.payment_method ?? 'Paid'}
          </span>
        ) : (
          <>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="bg-stone-800 border border-stone-700 rounded px-1.5 py-1 text-xs text-stone-200"
            >
              <option>Stripe</option>
              <option>BTC</option>
              <option>USDC</option>
              <option>Cash</option>
              <option>Wire</option>
            </select>
            <button
              onClick={settle}
              disabled={pending}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-stone-950 font-medium rounded px-2.5 py-1 text-xs"
            >
              {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Mark paid'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
