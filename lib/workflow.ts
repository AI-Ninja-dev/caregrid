export const owners = ['Unassigned', 'Care coordinator', 'Device support', 'Clinical reviewer'] as const;
export const stages = ['To do', 'In progress', 'Completed'] as const;
export type Stage = typeof stages[number];
export type Owner = typeof owners[number];
export type Task = { id: string; person: string; title: string; owner: Owner; stage: Stage };
export type Entry = { id: number; taskId: string; message: string };
export type Workflow = { tasks: Task[]; history: Entry[] };
export const initialWorkflow: Workflow = { tasks: [
  { id: 'T-001', person: 'Thandi Mokoena', title: 'Review sample measurement context', owner: 'Clinical reviewer', stage: 'To do' },
  { id: 'T-002', person: 'Naledi Dlamini', title: 'Check demo sensor connection', owner: 'Device support', stage: 'In progress' },
  { id: 'T-003', person: 'David Jacobs', title: 'Prepare a sample follow-up', owner: 'Unassigned', stage: 'To do' },
], history: [] };
export type Action = { type: 'assign'; id: string; owner: Owner } | { type: 'move'; id: string; stage: Stage };
export function updateWorkflow(state: Workflow, action: Action): Workflow {
  const task = state.tasks.find(t => t.id === action.id);
  if (!task) return state;
  if (action.type === 'assign' && (!owners.includes(action.owner) || task.owner === action.owner)) return state;
  if (action.type === 'move' && (!stages.includes(action.stage) || task.stage === action.stage || (action.stage !== 'To do' && task.owner === 'Unassigned'))) return state;
  const updated = action.type === 'assign' ? { ...task, owner: action.owner } : { ...task, stage: action.stage };
  // Completed or active tasks must retain an accountable demo owner.
  if (updated.owner === 'Unassigned' && updated.stage !== 'To do') return state;
  const message = action.type === 'assign' ? `Assigned to ${action.owner.toLowerCase()}` : `Moved from ${task.stage.toLowerCase()} to ${action.stage.toLowerCase()}`;
  return { tasks: state.tasks.map(t => t.id === task.id ? updated : t), history: [{ id: state.history.length + 1, taskId: task.id, message }, ...state.history] };
}
