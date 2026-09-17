import { clinicalPillars, type ClinicalPillar } from './care-plans.ts';
import type { PersonSummary } from './person-summary.ts';

export type PathwaySummary = {
  pillar: ClinicalPillar;
  people: number;
  activePeople: number;
  enabledDevices: number;
  openTasks: number;
  unassignedTasks: number;
  activePlans: number;
  duePlans: number;
};

type Person = { id: string; active: number | boolean; pillar: ClinicalPillar };

export function buildPathwaySummaries(people: readonly Person[], summaries: readonly PersonSummary[]): PathwaySummary[] {
  return clinicalPillars.map(({ name }) => {
    const members = people.filter(person => person.pillar === name);
    const memberIds = new Set(members.map(person => person.id));
    const details = summaries.filter(summary => memberIds.has(summary.personId));
    return {
      pillar: name,
      people: members.length,
      activePeople: members.filter(person => Boolean(person.active)).length,
      enabledDevices: details.reduce((sum, item) => sum + item.devices.enabled, 0),
      openTasks: details.reduce((sum, item) => sum + item.tasks.open, 0),
      unassignedTasks: details.reduce((sum, item) => sum + item.tasks.unassigned, 0),
      activePlans: details.reduce((sum, item) => sum + item.plans.active, 0),
      duePlans: details.reduce((sum, item) => sum + item.plans.due, 0),
    };
  });
}
