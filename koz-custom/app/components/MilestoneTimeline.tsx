'use client'

import { useState, useTransition } from 'react'
import { payMilestone } from '@/app/actions'
import type { Milestone } from '@/lib/supabase'
import { CheckCircle, Lock, CreditCard, Loader2 } from 'lucide-react'

function money(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)
}

export default function MilestoneTimeline({
  projectId,
  milestones,
}: {
  projectId: string
  milestones: Milestone[]
}) {
  const [pending, startTransition] = useTransition()
  const [payingId, setPayingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // The "current" milestone is the first unpaid one in order.
  const sorted = [...milestones].sort((a, b) => a.sort_order - b.sort_order)
  const currentId = sorted.find((m) => !m.is_paid)?.id ?? null

  function handlePay(milestoneId: string) {
    setError(null)
    setPayingId(milestoneId)
    startTransition(async () => {
      const res = await payMilestone(milestoneId, projectId)
      if (!res.ok) setError(res.error ?? 'Payment failed')
      setPayingId(null)
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      {sorted.map((m) => {
        const isCurrent = m.id === currentId
        const isLocked = !m.is_paid && !isCurrent
        return (
          <div
            key={m.id}
            className={`flex items-center gap-4 p-4 rounded-lg border-l-4 transition-all
              ${m.is_paid ? 'bg-emerald-950/40 border-emerald-500' : ''}
              ${isCurrent ? 'bg-stone-900 border-amber-500 shadow-md' : ''}
              ${isLocked ? 'bg-stone-900/40 border-stone-700 opacity-70' : ''}`}
          >
            <div className="shrink-0">
              {m.is_paid ? (
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              ) : isCurrent ? (
                <CreditCard className="w-6 h-6 text-amber-400" />
              ) : (
                <Lock className="w-6 h-6 text-stone-600" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-stone-100">{m.name}</p>
              <p className="text-sm text-stone-500">
                {money(m.amount)}
                {m.is_paid && m.paid_at && (
                  <span className="ml-2 text-emerald-500">
                    · Paid {new Date(m.paid_at).toLocaleDateString()}
                    {m.payment_method ? ` (${m.payment_method})` : ''}
                  </span>
                )}
              </p>
            </div>

            <div className="shrink-0">
              {m.is_paid ? (
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">Paid</span>
              ) : isCurrent ? (
                <button
                  onClick={() => handlePay(m.id)}
                  disabled={pending}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-stone-950 font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
                >
                  {pending && payingId === m.id ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                  ) : (
                    `Pay ${money(m.amount)}`
                  )}
                </button>
              ) : (
                <span className="text-xs text-stone-600 uppercase tracking-widest">Locked</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
