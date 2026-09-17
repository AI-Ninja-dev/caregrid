import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { AppError, Store, field, type User } from './store.ts';
import { migrateClinicalPillars } from './schema.ts';
import { legacyProgrammeForPillar, migrationDefaults, validateClinicalPillar, validateProgramme } from './clinical.ts';

function clinicalPillar(value: unknown) {
  try { return validateClinicalPillar(value); }
  catch { throw new AppError('Choose a valid clinical pillar.'); }
}

function clinicalProgramme(pillar: ReturnType<typeof clinicalPillar>, value: unknown) {
  try { return validateProgramme(pillar, value); }
  catch { throw new AppError('Choose a programme that belongs to the selected clinical pillar.'); }
}

function nextReview(value: unknown) {
  const date = field(value, 'Next review date', 10);
  if (!/^\d{4}-\d\d-\d\d$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new AppError('Enter a valid review date.');
  return date;
}

export class ClinicalStore extends Store {
  constructor(path: string) {
    super(path);
    migrateClinicalPillars(this.db);
  }

  mutate(user: User, data: Record<string, unknown>) {
    if (data.action === 'person') {
      if (user.role !== 'admin') throw new AppError('Administrator access is required.', 403);
      return this.transaction(() => {
        if (data.consent !== true) throw new AppError('Record monitoring consent before enrolling a person.');
        const defaults = migrationDefaults();
        const pillar = clinicalPillar(data.pillar ?? defaults.pillar);
        const programme = clinicalProgramme(pillar, data.programme ?? legacyProgrammeForPillar(pillar));
        const id = randomUUID();
        const now = new Date().toISOString();
        this.db.prepare('INSERT INTO people(id,name,town,consent_at,active,pillar,programme) VALUES(?,?,?,?,1,?,?)').run(id, field(data.name, 'Name'), field(data.town, 'Town'), now, pillar, programme);
        this.audit(user.id, 'person', id);
        return {};
      });
    }

    if (data.action === 'person-clinical') {
      if (user.role !== 'admin') throw new AppError('Administrator access is required.', 403);
      return this.transaction(() => {
        const id = field(data.id, 'Person');
        const pillar = clinicalPillar(data.pillar);
        const programme = clinicalProgramme(pillar, data.programme ?? legacyProgrammeForPillar(pillar));
        if (!this.db.prepare('UPDATE people SET pillar=?,programme=? WHERE id=?').run(pillar, programme, id).changes) throw new AppError('Person not found.', 404);
        this.audit(user.id, 'person-clinical', id);
        return {};
      });
    }

    if (data.action === 'plan' || data.action === 'plan-update') {
      return this.transaction(() => {
        const id = randomUUID();
        const now = new Date().toISOString();
        const existing = data.action === 'plan-update' ? this.planVersion(data.id, data.version) : null;
        const personId = existing ? String(existing.person_id) : field(data.personId, 'Person');
        if (!existing || data.status !== 'Paused') this.activePerson(personId);
        const person = this.db.prepare('SELECT pillar FROM people WHERE id=?').get(personId) as { pillar?: string } | undefined;
        const pillar = clinicalPillar(data.pillar ?? existing?.pillar ?? person?.pillar ?? migrationDefaults().pillar);
        const owner = field(data.owner, 'Plan owner');
        if (!this.db.prepare('SELECT id FROM users WHERE id=? AND active=1').get(owner)) throw new AppError('Select an active plan owner.');
        if (!['Active', 'Needs review', 'Paused'].includes(String(data.status))) throw new AppError('Choose a valid plan status.');
        const values = [field(data.focus, 'Plan focus'), pillar, owner, field(data.cadence, 'Review cadence'), field(data.goals, 'Goals', 2000), nextReview(data.nextReview), String(data.status)];
        let subject: string = id;
        if (existing) {
          subject = String(existing.id);
          this.db.prepare('UPDATE care_plans SET focus=?,pillar=?,owner=?,cadence=?,goals=?,next_review=?,status=?,version=version+1,updated_at=? WHERE id=?').run(...values, now, subject);
        } else {
          this.db.prepare('INSERT INTO care_plans(id,person_id,focus,pillar,owner,cadence,goals,next_review,status,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,1,?,?)').run(id, personId, ...values, now, now);
        }
        this.audit(user.id, String(data.action), subject);
        return {};
      });
    }

    return super.mutate(user, data);
  }
}

let singleton: ClinicalStore | undefined;
export function store() {
  return singleton ||= new ClinicalStore(process.env.CAREGRID_DB_PATH || resolve('data/caregrid.sqlite'));
}
