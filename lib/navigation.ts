import { patients } from './demo.ts';
export const views = ['Overview', 'People', 'Alerts', 'Devices', 'Tasks', 'Reports', 'Workspace'] as const;
export type View = typeof views[number];
export type Route = { view: View; personId: string | null; alertPersonId: string | null };
export function parseRoute(hash: string): Route {
 const [path, query=''] = hash.replace(/^#\/?/, '').split('?');
 const [section, id] = path.split('/');
 const view = views.find(v=>v.toLowerCase()===section) || 'Overview';
 const valid = (value: string | null | undefined) => patients.some(p=>p.id===value) ? value! : null;
 return { view, personId: view==='People' ? valid(id) : null, alertPersonId: view==='Alerts' ? valid(new URLSearchParams(query).get('person')) : null };
}
export function routeHash(route: Route): string {
 let hash = `#/${route.view.toLowerCase()}`;
 if(route.view==='People' && route.personId)hash+=`/${encodeURIComponent(route.personId)}`;
 if(route.view==='Alerts' && route.alertPersonId)hash+=`?person=${encodeURIComponent(route.alertPersonId)}`;
 return hash;
}
