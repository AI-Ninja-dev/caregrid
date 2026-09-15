'use client';
import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { patients, alerts } from '../../lib/demo';
import { createDemoReport } from '../../lib/report';
import type { Workflow } from '../../lib/workflow';
export default function Reports({workflow, acknowledged}: {workflow: Workflow; acknowledged: string[]}) {
  const [message, setMessage] = useState('');
  function download() {
    try {
      const blob = new Blob([createDemoReport(workflow, acknowledged)], {type:'text/csv;charset=utf-8'});
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href=url;anchor.download='caregrid-demo-report.csv';document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      setMessage('Demo CSV download requested. Check your browser downloads.');
    } catch { setMessage('The download could not start. You can still review the summary below.'); }
  }
  return <div className="detail-grid"><section className="panel"><span className="device-icon"><FileSpreadsheet size={25}/></span><h2 className="report-heading">A snapshot of your demo session.</h2><p>Export fictional people, sample alerts, assigned tasks and the activity history as a spreadsheet-compatible CSV.</p><dl><div><dt>Fictional people</dt><dd>{patients.length}</dd></div><div><dt>Open sample alerts</dt><dd>{alerts.filter(a=>!acknowledged.includes(a.id)).length}</dd></div><div><dt>Open tasks</dt><dd>{workflow.tasks.filter(t=>t.stage!=='Completed').length}</dd></div><div><dt>Completed tasks</dt><dd>{workflow.tasks.filter(t=>t.stage==='Completed').length}</dd></div><div><dt>Recorded demo actions</dt><dd>{workflow.history.length}</dd></div></dl><button className="secondary" onClick={download}><Download size={17}/> Download demo report</button><p role="status" className="muted">{message}</p></section><section className="panel"><span className="eyebrow">KNOW WHAT YOU’RE EXPORTING</span><h2>Useful for review. Clearly a demo.</h2><ul className="readiness"><li>Only the fictional records visible in this app</li><li>Current session changes, not previous sessions</li><li>Sample dates and South African display units</li><li>No clinical interpretation or treatment guidance</li></ul><p className="muted">The file is created in your browser. It is not emailed or sent to a server. Exported copies remain on your device after the demo is reset.</p></section></div>;
}
