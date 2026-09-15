import { alerts, toggleAcknowledgement } from './demo.ts';
import { initialWorkflow, updateWorkflow, owners, stages, type Action, type Workflow } from './workflow.ts';
export const SESSION_KEY = 'caregrid-demo-session-v1';
export type DemoEvent = { type: 'workflow'; action: Action } | { type: 'acknowledge'; id: string };
export type DemoSession = { events: DemoEvent[]; workflow: Workflow; acknowledged: string[] };
export function emptySession(): DemoSession { return { events: [], workflow: initialWorkflow, acknowledged: [] }; }
export function applyEvent(session: DemoSession, event: DemoEvent): DemoSession {
 if (event.type === 'acknowledge') {
  if (!alerts.some(a=>a.id===event.id)) return session;
  return {...session, events:[...session.events,event], acknowledged:toggleAcknowledgement(session.acknowledged,event.id)};
 }
 if (event.action.type === 'reset') return emptySession();
 const workflow=updateWorkflow(session.workflow,event.action);
 return workflow===session.workflow ? session : {...session, workflow, events:[...session.events,event]};
}
function validEvent(value: unknown): value is DemoEvent {
 if (!value || typeof value!=='object') return false;
 const e=value as Record<string,unknown>;
 if(e.type==='acknowledge') return typeof e.id==='string' && alerts.some(a=>a.id===e.id);
 if(e.type!=='workflow' || !e.action || typeof e.action!=='object')return false;
 const a=e.action as Record<string,unknown>;
 if(a.type==='reset')return true;
 if(a.type==='from-alert')return typeof a.alertId==='string' && alerts.some(item=>item.id===a.alertId);
 if(typeof a.id!=='string' || !/^T-\d{3}$/.test(a.id))return false;
 return (a.type==='assign' && owners.some(owner=>owner===a.owner)) || (a.type==='move' && stages.some(stage=>stage===a.stage));
}
export function restoreSession(raw: string | null): {session:DemoSession; recovered:boolean} {
 if(raw===null)return {session:emptySession(),recovered:false};
 try {
  if(raw.length>500000)throw new Error('Too large');
  const data=JSON.parse(raw);
  if(data.version!==1 || !Array.isArray(data.events) || data.events.length>2000 || !data.events.every(validEvent))throw new Error('Invalid demo session');
  return {session:(data.events as DemoEvent[]).reduce(applyEvent,emptySession()),recovered:false};
 } catch { return {session:emptySession(),recovered:true}; }
}
export function encodeSession(session:DemoSession):string{return JSON.stringify({version:1,events:session.events});}
