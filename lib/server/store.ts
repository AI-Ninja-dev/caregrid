import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes, randomUUID, createHash, scryptSync, timingSafeEqual } from 'node:crypto';
import { acceptAutomaticReading } from '../ingestion/accept.ts';
import type { AutomaticReading } from '../ingestion/reading.ts';

export type User = { id: string; email: string; role: 'admin' | 'reviewer' };
type Row = Record<string, string | number | null>;
export class AppError extends Error { status: number; constructor(message: string, status = 400) { super(message); this.status = status; } }
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
function passwordHash(password: string) {
  const salt = token();
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
function matches(password: string, stored: string) {
  const [salt, digest] = stored.split(':');
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(digest, 'hex'));
}
export function field(value: unknown, label: string, max = 160): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new AppError(`${label} is required (maximum ${max} characters).`);
  return value.trim();
}
export class Store {
  db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS people(id TEXT PRIMARY KEY,name TEXT NOT NULL,town TEXT NOT NULL,consent_at TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS integrations(id TEXT PRIMARY KEY,name TEXT NOT NULL,secret TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS devices(id TEXT PRIMARY KEY,label TEXT NOT NULL,person_id TEXT NOT NULL REFERENCES people(id),adapter_id TEXT NOT NULL REFERENCES integrations(id),kind TEXT NOT NULL,created_at TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS readings(event_key TEXT PRIMARY KEY,person_id TEXT NOT NULL REFERENCES people(id),device_id TEXT NOT NULL REFERENCES devices(id),measured_at TEXT NOT NULL,received_at TEXT NOT NULL,payload TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS readings_time ON readings(measured_at DESC);
      CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,person_id TEXT NOT NULL REFERENCES people(id),title TEXT NOT NULL,owner TEXT REFERENCES users(id),stage TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,action TEXT NOT NULL,subject TEXT NOT NULL,at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,until INTEGER NOT NULL);`);
    if (!this.db.prepare('PRAGMA table_info(users)').all().some(column => column.name === 'active')) this.db.exec('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1');
  }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  audit(actor: string, action: string, subject: string) { this.db.prepare('INSERT INTO audit(actor,action,subject,at) VALUES(?,?,?,?)').run(actor, action, subject, new Date().toISOString()); }
  configured() { return !!this.db.prepare('SELECT id FROM users LIMIT 1').get(); }
  createUser(emailValue: unknown, passwordValue: unknown, roleValue: unknown): User {
    const email = field(emailValue, 'Email').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('Enter a valid email address.');
    const password = field(passwordValue, 'Password', 256);
    if (password.length < 14) throw new AppError('Use a password of at least 14 characters.');
    if (roleValue !== 'admin' && roleValue !== 'reviewer') throw new AppError('Choose a valid role.');
    if (this.db.prepare('SELECT id FROM users WHERE email=?').get(email)) throw new AppError('This account already exists.', 409);
    const user = { id: randomUUID(), email, role: roleValue };
    this.db.prepare('INSERT INTO users(id,email,password,role) VALUES(?,?,?,?)').run(user.id, email, passwordHash(password), user.role);
    return user as User;
  }
  setup(email: unknown, password: unknown) {
    return this.transaction(() => {
      if (this.configured()) throw new AppError('Workspace already configured.', 409);
      const user = this.createUser(email, password, 'admin'); this.audit(user.id, 'workspace.setup', user.id); return user;
    });
  }
  limit(key: string, maximum: number, milliseconds: number) {
    const now = Date.now();
    this.db.prepare('DELETE FROM limits WHERE until < ?').run(now);
    const row = this.db.prepare('SELECT count FROM limits WHERE key=?').get(key) as Row | undefined;
    if (row && Number(row.count) >= maximum) throw new AppError('Too many requests. Please try again later.', 429);
    this.db.prepare('INSERT INTO limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key, now + milliseconds);
  }
  login(email: unknown, password: unknown) {
    const address = field(email, 'Email').toLowerCase();
    this.limit('login:global', 100, 15 * 60_000);
    this.limit(`login:${hash(address)}`, 8, 15 * 60_000);
    const row = this.db.prepare('SELECT * FROM users WHERE email=?').get(address) as Row | undefined;
    // A dummy hash keeps unknown-account verification on the same expensive path.
    const digest = row?.password as string || `caregrid-dummy:${'0'.repeat(128)}`;
    const valid = matches(field(password, 'Password', 256), digest);
    if (!row || !valid || !row.active) throw new AppError('Email or password is incorrect.', 401);
    const value = token();
    this.db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
    this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hash(value), row.id, Date.now() + 8 * 3600_000);
    this.audit(String(row.id), 'session.login', String(row.id));
    return value;
  }
  user(session: string): User | undefined {
    return this.db.prepare('SELECT users.id,email,role FROM users JOIN sessions ON users.id=sessions.user_id WHERE sessions.hash=? AND expires>? AND users.active=1').get(hash(session), Date.now()) as User | undefined;
  }
  logout(session: string) { this.db.prepare('DELETE FROM sessions WHERE hash=?').run(hash(session)); }
  snapshot(user: User) {
    return {
      user,
      people: this.db.prepare('SELECT * FROM people ORDER BY name').all(),
      devices: this.db.prepare('SELECT * FROM devices ORDER BY label').all(),
      integrations: this.db.prepare('SELECT id,name,enabled,created_at FROM integrations ORDER BY name').all(),
      readings: this.db.prepare('SELECT * FROM readings ORDER BY measured_at DESC LIMIT 500').all().map(row => ({ ...row, payload: JSON.parse(String(row.payload)) })),
      tasks: this.db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all(),
      users: this.db.prepare('SELECT id,email,role,active FROM users ORDER BY email').all(),
      audit: user.role === 'admin' ? this.db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 100').all() : [],
    };
  }
  mutate(user: User, data: Record<string, unknown>) {
    if (user.role !== 'admin' && !['task', 'task-update', 'password'].includes(String(data.action))) throw new AppError('Administrator access is required.', 403);
    return this.transaction(() => {
      const id = randomUUID(), now = new Date().toISOString();
      let subject: string = id;
      let result: Record<string, unknown> = {};
      if (data.action === 'person') {
        if (data.consent !== true) throw new AppError('Record monitoring consent before enrolling a person.');
        this.db.prepare('INSERT INTO people(id,name,town,consent_at) VALUES(?,?,?,?)').run(id, field(data.name, 'Name'), field(data.town, 'Town'), now);
      } else if (data.action === 'person-status') {
        subject = field(data.id, 'Person');
        if (typeof data.active !== 'boolean') throw new AppError('Choose a valid status.');
        if (!this.db.prepare('UPDATE people SET active=? WHERE id=?').run(Number(data.active), subject).changes) throw new AppError('Person not found.', 404);
      } else if (data.action === 'integration') {
        subject = field(data.id, 'Adapter ID', 100);
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*-adapter$/.test(subject)) throw new AppError('Use an adapter ID such as clinic-gateway-adapter.');
        if (this.db.prepare('SELECT id FROM integrations WHERE id=?').get(subject)) throw new AppError('Adapter ID already exists.', 409);
        const secret = token();
        this.db.prepare('INSERT INTO integrations VALUES(?,?,?,1,?)').run(subject, field(data.name, 'Name'), hash(secret), now);
        result = { secret, adapterId: subject };
      } else if (data.action === 'integration-update') {
        subject = field(data.id, 'Adapter ID');
        if (!this.db.prepare('SELECT id FROM integrations WHERE id=?').get(subject)) throw new AppError('Integration not found.', 404);
        if (data.rotate === true) { const secret = token(); this.db.prepare('UPDATE integrations SET secret=? WHERE id=?').run(hash(secret), subject); result = { secret, adapterId: subject }; }
        else { if (typeof data.enabled !== 'boolean') throw new AppError('Choose a valid status.'); this.db.prepare('UPDATE integrations SET enabled=? WHERE id=?').run(Number(data.enabled), subject); }
      } else if (data.action === 'device') {
        subject = field(data.id, 'Device ID', 200);
        this.activePerson(data.personId);
        if (!this.db.prepare('SELECT id FROM integrations WHERE id=? AND enabled=1').get(field(data.adapterId, 'Adapter'))) throw new AppError('Select an enabled integration.');
        if (!['blood-pressure', 'glucose', 'spo2'].includes(String(data.kind))) throw new AppError('Choose a supported measurement.');
        if (this.db.prepare('SELECT id FROM devices WHERE id=?').get(subject)) throw new AppError('Device ID already registered. Retire the existing assignment and use a new gateway device ID for reassignment.', 409);
        this.db.prepare('INSERT INTO devices VALUES(?,?,?,?,?,?,1)').run(subject, field(data.label, 'Device label'), String(data.personId), String(data.adapterId), String(data.kind), now);
      } else if (data.action === 'device-status') {
        subject = field(data.id, 'Device');
        if (typeof data.enabled !== 'boolean') throw new AppError('Choose a valid status.');
        if (!this.db.prepare('UPDATE devices SET enabled=? WHERE id=?').run(Number(data.enabled), subject).changes) throw new AppError('Device not found.', 404);
      } else if (data.action === 'task') {
        this.activePerson(data.personId);
        this.db.prepare('INSERT INTO tasks VALUES(?,?,?,NULL,?,?)').run(id, String(data.personId), field(data.title, 'Task', 500), 'To do', now);
      } else if (data.action === 'task-update') {
        subject = field(data.id, 'Task');
        if (!['To do', 'In progress', 'Completed'].includes(String(data.stage))) throw new AppError('Choose a valid task stage.');
        const owner = data.owner ? field(data.owner, 'Owner') : null;
        if (owner && !this.db.prepare('SELECT id FROM users WHERE id=? AND active=1').get(owner)) throw new AppError('Active owner not found.');
        if (data.stage !== 'To do' && !owner) throw new AppError('Assign an owner before progressing a task.');
        if (!this.db.prepare('UPDATE tasks SET owner=?,stage=? WHERE id=?').run(owner, String(data.stage), subject).changes) throw new AppError('Task not found.', 404);
      } else if (data.action === 'user') {
        const added = this.createUser(data.email, data.password, data.role); subject = added.id;
      } else if (data.action === 'user-status') {
        subject = field(data.id, 'Account');
        if (subject === user.id) throw new AppError('You cannot disable your own account.');
        if (typeof data.active !== 'boolean') throw new AppError('Choose a valid status.');
        if (!this.db.prepare('UPDATE users SET active=? WHERE id=?').run(Number(data.active), subject).changes) throw new AppError('Account not found.', 404);
        this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(subject);
      } else if (data.action === 'password') {
        subject = user.id;
        const row = this.db.prepare('SELECT password FROM users WHERE id=?').get(user.id)!;
        if (!matches(field(data.currentPassword, 'Current password', 256), String(row.password))) throw new AppError('Current password is incorrect.');
        const password = field(data.password, 'New password', 256);
        if (password.length < 14) throw new AppError('Use a password of at least 14 characters.');
        this.db.prepare('UPDATE users SET password=? WHERE id=?').run(passwordHash(password), user.id);
        this.db.prepare('DELETE FROM sessions WHERE user_id=?').run(user.id);
      } else throw new AppError('Unsupported action.');
      this.audit(user.id, String(data.action), subject);
      return result;
    });
  }
  activePerson(id: unknown) {
    if (!this.db.prepare('SELECT id FROM people WHERE id=? AND active=1').get(field(id, 'Person'))) throw new AppError('Select an active person with monitoring consent.');
  }
  ingest(adapterId: string, secret: string, input: unknown) {
    const integration = this.db.prepare('SELECT * FROM integrations WHERE id=? AND enabled=1').get(adapterId) as Row | undefined;
    if (!integration || !timingSafeEqual(Buffer.from(String(integration.secret), 'hex'), Buffer.from(hash(secret), 'hex'))) throw new AppError('Integration credentials are invalid.', 401);
    this.limit(`ingest:${adapterId}`, 600, 60_000);
    return this.transaction(() => {
      const devices = this.db.prepare('SELECT devices.* FROM devices JOIN people ON people.id=devices.person_id WHERE adapter_id=? AND enabled=1 AND people.active=1').all(adapterId);
      const accepted = acceptAutomaticReading(input, { organisationId: 'workspace', adapterId, enabled: true, devices: devices.map(d => ({ deviceId: String(d.id), personId: String(d.person_id), kinds: [String(d.kind) as AutomaticReading['measurement']['kind']] })) });
      if (!accepted.ok) throw new AppError(accepted.reason);
      const { reading, key, personId } = accepted;
      const payload = JSON.stringify(reading);
      const existing = this.db.prepare('SELECT payload FROM readings WHERE event_key=?').get(key);
      if (existing) {
        if (existing.payload !== payload) throw new AppError('Event ID already exists with different content.', 409);
        return { duplicate: true };
      }
      const device = devices.find(d => d.id === reading.deviceId)!;
      const measured = Date.parse(reading.measuredAt);
      if (measured > Date.now() + 5 * 60_000 || measured < Date.parse(String(device.created_at))) throw new AppError('Reading time must follow device enrolment and cannot be in the future.');
      this.db.prepare('INSERT INTO readings VALUES(?,?,?,?,?,?)').run(key, personId, reading.deviceId, new Date(measured).toISOString(), new Date().toISOString(), payload);
      this.audit(adapterId, 'reading.received', key);
      return { duplicate: false };
    });
  }
}
let singleton: Store | undefined;
export function store() { return singleton ||= new Store(process.env.CAREGRID_DB_PATH || resolve('data/caregrid.sqlite')); }
