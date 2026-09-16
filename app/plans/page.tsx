'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, PauseCircle, RefreshCw } from 'lucide-react';
import { patients } from '../../lib/demo';
import { planCountByStatus, sampleCarePlans, updatePlanStatus, type CarePlan, type PlanStatus } from '../../lib/care-plans';

const statuses: PlanStatus[] = ['Active', 'Needs review', 'Paused'];

export default function CarePlansPage() {
  const [plans, setPlans] = useState<CarePlan[]>(sampleCarePlans);
  const [filter, setFilter] = useState<PlanStatus | 'All'>('All');
  const [message, setMessage] = useState('');
  const counts = useMemo(() => planCountByStatus(plans), [plans]);
  const visible = filter === 'All' ? plans : plans.filter((plan) => plan.status === filter);

  function setStatus(id: string, status: PlanStatus) {
    const previous = plans.find((plan) => plan.id === id);
    const next = updatePlanStatus(plans, id, status);
    if (next === plans) return;
    setPlans(next);
    setMessage(`${previous?.focus ?? 'Care plan'} marked ${status.toLowerCase()} in this demo only.`);
  }

  return <main className="shell" style={{ minHeight: '100vh', display: 'block', padding: 'clamp(1.25rem, 4vw, 4rem)', maxWidth: 1120, margin: '0 auto' }}>
    <Link className="text-button back" href="/"><ArrowLeft size={16} /> Back to CareGrid workspace</Link>
    <div className="page-heading" style={{ marginTop: '2rem' }}>
      <div><span className="eyebrow">CARE PLAN REVIEW</span><h1>Plans with a clear owner.</h1><p>Fictional care-plan summaries for the working demo. Changes stay only in this page until it is refreshed.</p></div>
      <span className="demo-pill">Demo environment</span>
    </div>
    <div className="demo-notice"><span className="dot" /><span>No clinical targets, interventions, or patient messaging are implemented. Do not use this page for real care decisions.</span></div>
    <div className="metrics" style={{ marginTop: '1.5rem' }}>
      <article><span>Active plans</span><strong>{String(counts.Active).padStart(2, '0')}</strong><small>Sample plans on track</small></article>
      <article><span>Need review</span><strong>{String(counts['Needs review']).padStart(2, '0')}</strong><small>Visible for team review</small></article>
      <article><span>Paused</span><strong>{String(counts.Paused).padStart(2, '0')}</strong><small>No active demo action</small></article>
    </div>
    <div className="tabs" aria-label="Filter care plans" style={{ margin: '2rem 0 1rem' }}>
      {(['All', ...statuses] as const).map((status) => <button key={status} aria-pressed={filter === status} onClick={() => setFilter(status)}>{status}</button>)}
    </div>
    <p className={message ? 'status' : 'sr-only'} role="status">{message}</p>
    <div className="device-grid">
      {visible.map((plan) => {
        const person = patients.find((patient) => patient.id === plan.patientId);
        return <article className="panel" key={plan.id}>
          <div className="panel-heading"><span className="eyebrow">{plan.id}</span><span className={`badge ${plan.status === 'Active' ? 'good' : 'amber'}`}>{plan.status}</span></div>
          <h2>{plan.focus}</h2>
          <p className="muted">{person?.name ?? plan.patientId} · {plan.cadence}</p>
          <dl><div><dt>Accountable role</dt><dd>{plan.owner}</dd></div><div><dt>Next review</dt><dd>{plan.nextReview}</dd></div></dl>
          <h3 style={{ fontSize: '0.95rem', marginTop: '1.5rem' }}>Sample focus</h3>
          <ul className="readiness">{plan.goals.map((goal) => <li key={goal}>{goal}</li>)}</ul>
          <div className="actions" style={{ marginTop: '1.5rem' }}>
            {plan.status !== 'Active' && <button className="secondary" onClick={() => setStatus(plan.id, 'Active')}><CheckCircle2 size={16} /> Mark active</button>}
            {plan.status !== 'Needs review' && <button className="secondary" onClick={() => setStatus(plan.id, 'Needs review')}><RefreshCw size={16} /> Needs review</button>}
            {plan.status !== 'Paused' && <button className="secondary" onClick={() => setStatus(plan.id, 'Paused')}><PauseCircle size={16} /> Pause</button>}
          </div>
        </article>;
      })}
    </div>
  </main>;
}