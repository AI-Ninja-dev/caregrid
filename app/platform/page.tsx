import Link from 'next/link';
import { Activity, ArrowLeft, Layers3, ShieldCheck } from 'lucide-react';
import { careGridClinicalPillars, careGridExistingProgrammes, careGridMetrics, careGridPlatformModules, clinicalAlertSafetyBoundary } from '../../lib/platform-catalog';

export const dynamic = 'force-dynamic';

export default function PlatformPage() {
  const groups = [...new Set(careGridPlatformModules.map(module => module.group))];
  return <main className="clinical-page">
    <div className="clinical-shell">
      <header className="clinical-header">
        <Link className="clinical-back" href="/"><ArrowLeft size={16}/> CareGrid workspace</Link>
        <div className="clinical-brand"><Activity/> CareGrid</div>
      </header>
      <section className="clinical-hero">
        <span className="eyebrow">EXPANDED CONNECTED-CARE PLATFORM</span>
        <h1>One CareGrid. Full care operations.</h1>
        <p>The existing CareGrid programs and four clinical pillars remain the foundation. The platform now has an additive architecture for RPM, care operations, engagement, analytics, integrations, enterprise administration and patient experience.</p>
        <div className="actions"><Link className="primary" href="/platform/operations/">Open live operations console</Link><Link className="secondary" href="/platform/analytics/">Open analytics</Link><Link className="secondary" href="/platform/search/">Universal search</Link><Link className="secondary" href="/people/">People workspace</Link></div>
      </section>
      <section className="clinical-section">
        <div className="clinical-section-heading"><div><span className="eyebrow">FOUNDATION</span><h2>Existing CareGrid programs preserved</h2></div><ShieldCheck/></div>
        <div className="clinical-grid">{careGridClinicalPillars.map((pillar,index)=><article className="clinical-card" key={pillar}><span className="clinical-number">0{index+1}</span><h3>{pillar}</h3><p>{careGridExistingProgrammes[index]}</p></article>)}</div>
      </section>
      <section className="clinical-section">
        <div className="clinical-section-heading"><div><span className="eyebrow">MONITORING MODEL</span><h2>Extensible home-health measurements</h2></div><Layers3/></div>
        <div className="clinical-chip-row">{careGridMetrics.map(metric=><span className="clinical-chip" key={metric}>{metric.replaceAll('-',' ')}</span>)}</div>
      </section>
      {groups.map(group=><section className="clinical-section" key={group}>
        <div className="clinical-section-heading"><div><span className="eyebrow">{group.toUpperCase()}</span><h2>{group}</h2></div></div>
        <div className="clinical-grid">{careGridPlatformModules.filter(module=>module.group===group).map(module=><article className="clinical-card" key={module.key}><h3>{module.name}</h3><p>Integrated into the CareGrid platform architecture and designed to use the existing authenticated workspace, audit trail and clinical-pillar model.</p></article>)}</div>
      </section>)}
      <section className="clinical-section clinical-safety">
        <span className="eyebrow">CLINICAL SAFETY BOUNDARY</span>
        <h2>Clinical alert rules remain governed and off by default.</h2>
        <p>{clinicalAlertSafetyBoundary.statement}</p>
      </section>
    </div>
  </main>;
}
