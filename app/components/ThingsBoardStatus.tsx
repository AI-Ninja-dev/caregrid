'use client';
import { useEffect, useState, type FormEvent } from 'react';
type Status = { registered: boolean; enabled: boolean; restConfigured: boolean; devices: number; latestReceivedAt: string | null };
type Person = { id: string; name: string; active: number };
export default function ThingsBoardStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [message, setMessage] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const read = async (path: string) => { const response = await fetch(path, { cache: 'no-store', signal: controller.signal }); const data=await response.json(); if(!response.ok)throw new Error(data.error); return data; };
    Promise.all([read('/api/thingsboard/status/'), read('/api/workspace/')]).then(([status, workspace])=>{setStatus(status);setPeople(workspace.people.filter((person:Person)=>person.active));}).catch(error=>{if(error.name!=='AbortError')setMessage(error.message);});
    return () => controller.abort();
  }, []);
  async function save(action: string, event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault(); const form=event?.currentTarget; setBusy(true);setMessage('');
    try {
      const response=await fetch('/api/workspace/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='integration'?{action,id:'thingsboard-adapter',name:'ThingsBoard IoT engine'}:{...Object.fromEntries(new FormData(form!)),action,adapterId:'thingsboard-adapter'})});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      if(data.secret)setSecret(data.secret);form?.reset();
      const statusResponse=await fetch('/api/thingsboard/status/',{cache:'no-store'});const next=await statusResponse.json();if(!statusResponse.ok)throw new Error(next.error);setStatus(next);setMessage('Saved.');
    }catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
  }
  return <section className="clinical-section"><span className="eyebrow">DEVICE ENGINE</span><h2>ThingsBoard</h2><p>Device telemetry flows into CareGrid patient records and monitoring charts. Patient consent, care plans and follow-up remain in CareGrid.</p>
    {message && <p role="status">{message}</p>}
    {status ? <><p><strong>{status.enabled ? 'Telemetry bridge enabled' : status.registered ? 'Telemetry bridge paused' : 'Setup required'}</strong> · {status.devices} enrolled devices</p><p>Latest delivery: {status.latestReceivedAt ? new Date(status.latestReceivedAt).toLocaleString('en-ZA') : 'No readings received'}</p><p>Recovery sync: {status.restConfigured ? 'Server credentials configured; verify the scheduled worker is running.' : 'Server credentials required.'}</p>
      {!status.registered && <button className="primary" disabled={busy} onClick={()=>save('integration')}>Register ThingsBoard bridge</button>}
      {secret && <div className="clinical-safety"><h3>Copy the bridge secret now</h3><p className="credential" style={{overflowWrap:'anywhere'}}>{secret}</p><p>This secret is shown once. Save it securely on the server for telemetry forwarding.</p></div>}
      {status.enabled && <form className="live-form" onSubmit={event=>save('device',event)}><h3>Assign a ThingsBoard device</h3><label className="field">ThingsBoard device UUID<input name="id" required maxLength={36}/></label><label className="field">Device label<input name="label" required maxLength={160}/></label><label className="field">Consented patient<select name="personId" required><option value="">Select patient</option>{people.map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label className="field">Measurement<select name="kind"><option value="blood-pressure">Blood pressure</option><option value="glucose">Glucose</option><option value="continuous-glucose">CGM</option><option value="spo2">SpO₂</option><option value="pulse">Pulse</option><option value="weight">Weight</option><option value="temperature">Temperature</option></select></label><button className="primary" disabled={busy}>Assign device</button></form>}
    </> : !message && <p>Loading connection status…</p>}
    <p>Configure telemetry forwarding on the ThingsBoard server after assigning devices.</p><a className="clinical-back" href="https://github.com/AI-Ninja-dev/caregrid/blob/main/docs/THINGSBOARD-INTEGRATION.md" target="_blank" rel="noreferrer">Connection setup guide</a>
  </section>;
}
