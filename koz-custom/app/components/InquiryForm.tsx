'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { submitInquiry, type ActionState } from '@/app/actions'
import type { FacetCut } from '@/lib/supabase'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

const initialState: ActionState = { success: false }

export default function InquiryForm({ facetCuts }: { facetCuts: FacetCut[] }) {
  const [state, action, pending] = useActionState(submitInquiry, initialState)

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <CheckCircle className="text-emerald-400 w-12 h-12" />
        <h2 className="text-2xl font-semibold text-emerald-400">Project Started!</h2>
        <p className="text-stone-400 max-w-sm">
          Your inquiry is logged as a project. We&apos;ll review the scope and send a
          quote with milestone options within 48 hours.
        </p>
        {state.projectId && (
          <Link
            href={`/projects/${state.projectId}`}
            className="mt-2 text-amber-400 hover:text-amber-300 underline underline-offset-4"
          >
            View your project dashboard →
          </Link>
        )}
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      {state.error && (
        <div className="flex items-center gap-2 bg-red-950 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field label="Full Name" name="name" type="text" placeholder="Jane Smith" errors={state.fieldErrors?.name} required />
        <Field label="Email" name="email" type="email" placeholder="jane@example.com" errors={state.fieldErrors?.email} required />
      </div>

      <Field
        label="What would you like made?"
        name="title"
        type="text"
        placeholder="Custom Opal Ring"
        errors={state.fieldErrors?.title}
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Field
          label="Budget — Low (USD)"
          name="budget_min"
          type="number"
          placeholder="400"
          hint="Optional"
          errors={state.fieldErrors?.budget_min}
        />
        <Field
          label="Budget — High (USD)"
          name="budget_max"
          type="number"
          placeholder="800"
          hint="Minimum $200"
          errors={state.fieldErrors?.budget_max}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-stone-300">Preferred Cut Style</label>
        <select
          name="facet_cut_id"
          defaultValue=""
          className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-2.5 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Select a cut (optional)</option>
          {facetCuts.map((cut) => (
            <option key={cut.id} value={cut.id}>
              {cut.name} (×{cut.difficulty_multiplier} complexity)
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-stone-300">
          Project Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          placeholder="Describe your vision — stone type, setting, occasion..."
          className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-2.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-stone-950 font-semibold rounded-lg px-6 py-3 transition-colors"
      >
        {pending ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Start My Custom Project'}
      </button>
    </form>
  )
}

function Field({
  label,
  name,
  type,
  placeholder,
  hint,
  errors,
  required,
}: {
  label: string
  name: string
  type: string
  placeholder?: string
  hint?: string
  errors?: string[]
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-stone-300">
        {label} {required && <span className="text-amber-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        step={type === 'number' ? 'any' : undefined}
        className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-2.5 text-stone-100 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
      {errors?.map((e) => (
        <p key={e} className="text-xs text-red-400">{e}</p>
      ))}
    </div>
  )
}
