import { notFound } from 'next/navigation'
import { supabase, type Project, type Milestone, type DesignIteration } from '@/lib/supabase'
import { STATUS_LABELS, progressPct } from '@/lib/projectFlow'
import MilestoneTimeline from '@/app/components/MilestoneTimeline'
import { Gem, ImageIcon, CheckCircle, MessageSquare } from 'lucide-react'

function money(v: number | null) {
  if (v === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)
}

export default async function ProjectDashboard({
  params,
}: {
  // Next.js 16: route params are async.
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: project } = await supabase
    .from('koz_projects')
    .select('*')
    .eq('id', id)
    .single<Project>()

  if (!project) notFound()

  const [{ data: milestones }, { data: iterations }] = await Promise.all([
    supabase.from('koz_milestones').select('*').eq('project_id', id).order('sort_order'),
    supabase.from('koz_design_iterations').select('*').eq('project_id', id).order('version_number', { ascending: false }),
  ])

  const ms = (milestones ?? []) as Milestone[]
  const iters = (iterations ?? []) as DesignIteration[]
  const paidTotal = ms.filter((m) => m.is_paid).reduce((s, m) => s + Number(m.amount), 0)
  const total = ms.reduce((s, m) => s + Number(m.amount), 0)
  const pct = progressPct(project.status)

  return (
    <div className="flex flex-col gap-10">
      {/* Header / status */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-100">{project.title}</h1>
            <p className="text-stone-500 text-sm font-mono mt-1">
              Project #{project.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <span className="px-4 py-2 rounded-full text-sm font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            {STATUS_LABELS[project.status]}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-stone-500">
            <span>Inquiry</span>
            <span>Design</span>
            <span>Fabrication</span>
            <span>Shipped</span>
          </div>
        </div>

        {project.description && (
          <p className="text-stone-400 text-sm mt-4">{project.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Milestones */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold text-stone-100">Payment Milestones</h2>
            <span className="text-sm text-stone-500">
              {money(paidTotal)} of {money(total)} paid
            </span>
          </div>
          {ms.length === 0 ? (
            <p className="text-stone-500 text-sm py-6">
              No milestones yet. We&apos;ll add a deposit and payment schedule once your
              quote is finalized.
            </p>
          ) : (
            <MilestoneTimeline projectId={project.id} milestones={ms} />
          )}
        </div>

        {/* Summary sidebar */}
        <aside className="flex flex-col gap-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-widest">Quote</h3>
            <Row label="Budget range" value={`${money(project.budget_min)} – ${money(project.budget_max)}`} />
            <Row label="Agreed price" value={money(project.final_agreed_price)} highlight />
          </div>
        </aside>
      </div>

      {/* Design iterations */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
          <Gem className="w-5 h-5 text-amber-400" /> Design Iterations
        </h2>
        {iters.length === 0 ? (
          <p className="text-stone-500 text-sm">No design renders shared yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {iters.map((it) => (
              <div key={it.id} className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
                {it.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.image_url} alt={`Version ${it.version_number}`} className="w-full h-56 object-cover" />
                ) : (
                  <div className="w-full h-56 bg-stone-800 flex items-center justify-center text-stone-600">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-100">Version {it.version_number}</span>
                    {it.is_approved && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" /> Approved
                      </span>
                    )}
                  </div>
                  {it.gemologist_notes && (
                    <p className="text-sm text-stone-400">{it.gemologist_notes}</p>
                  )}
                  {it.client_feedback && (
                    <p className="text-sm text-stone-500 flex items-start gap-1.5">
                      <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
                      {it.client_feedback}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-stone-500">{label}</span>
      <span className={highlight ? 'text-amber-400 font-semibold' : 'text-stone-300'}>{value}</span>
    </div>
  )
}
