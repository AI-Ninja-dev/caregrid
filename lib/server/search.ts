import type { DatabaseSync } from 'node:sqlite';

export type SearchResult={type:string;id:string;title:string;detail:string;href:string};

function like(value:string){return `%${value.replaceAll('%','\\%').replaceAll('_','\\_')}%`;}
export function searchWorkspace(db:DatabaseSync, raw:string, limit=50):SearchResult[]{
  const query=raw.trim();
  if(query.length<2)return [];
  const pattern=like(query); const per=Math.max(2,Math.ceil(limit/7)); const results:SearchResult[]=[];
  const people=db.prepare(`SELECT id,name,town,pillar,programme FROM people WHERE name LIKE ? ESCAPE '\\' OR town LIKE ? ESCAPE '\\' OR pillar LIKE ? ESCAPE '\\' OR programme LIKE ? ESCAPE '\\' LIMIT ?`).all(pattern,pattern,pattern,pattern,per) as Record<string,unknown>[];
  for(const row of people)results.push({type:'person',id:String(row.id),title:String(row.name),detail:[row.town,row.pillar,row.programme].filter(Boolean).join(' · '),href:`/people/${row.id}/`});
  const devices=db.prepare(`SELECT id,label,kind FROM devices WHERE id LIKE ? ESCAPE '\\' OR label LIKE ? ESCAPE '\\' OR kind LIKE ? ESCAPE '\\' LIMIT ?`).all(pattern,pattern,pattern,per) as Record<string,unknown>[];
  for(const row of devices)results.push({type:'device',id:String(row.id),title:String(row.label),detail:`${row.kind} · ${row.id}`,href:'/#/devices'});
  const plans=db.prepare(`SELECT id,focus,pillar,status FROM care_plans WHERE focus LIKE ? ESCAPE '\\' OR goals LIKE ? ESCAPE '\\' OR pillar LIKE ? ESCAPE '\\' LIMIT ?`).all(pattern,pattern,pattern,per) as Record<string,unknown>[];
  for(const row of plans)results.push({type:'care-plan',id:String(row.id),title:String(row.focus),detail:[row.pillar,row.status].filter(Boolean).join(' · '),href:'/plans/'});
  const tasks=db.prepare(`SELECT id,title,stage FROM tasks WHERE title LIKE ? ESCAPE '\\' OR stage LIKE ? ESCAPE '\\' LIMIT ?`).all(pattern,pattern,per) as Record<string,unknown>[];
  for(const row of tasks)results.push({type:'task',id:String(row.id),title:String(row.title),detail:String(row.stage),href:'/#/tasks'});
  const providers=db.prepare(`SELECT id,name,provider_type FROM providers WHERE name LIKE ? ESCAPE '\\' OR provider_type LIKE ? ESCAPE '\\' LIMIT ?`).all(pattern,pattern,per) as Record<string,unknown>[];
  for(const row of providers)results.push({type:'provider',id:String(row.id),title:String(row.name),detail:String(row.provider_type||'Provider'),href:'/platform/operations/'});
  const sites=db.prepare(`SELECT id,name,town FROM sites WHERE name LIKE ? ESCAPE '\\' OR town LIKE ? ESCAPE '\\' LIMIT ?`).all(pattern,pattern,per) as Record<string,unknown>[];
  for(const row of sites)results.push({type:'site',id:String(row.id),title:String(row.name),detail:String(row.town||'Site'),href:'/platform/operations/'});
  const tickets=db.prepare(`SELECT id,summary,category,status FROM support_tickets WHERE summary LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\' OR status LIKE ? ESCAPE '\\' LIMIT ?`).all(pattern,pattern,pattern,per) as Record<string,unknown>[];
  for(const row of tickets)results.push({type:'support-ticket',id:String(row.id),title:String(row.summary),detail:`${row.category} · ${row.status}`,href:'/platform/operations/'});
  return results.slice(0,limit);
}
