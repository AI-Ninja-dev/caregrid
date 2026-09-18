import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { router, json, error, db } from '@appdeploy/sdk';

type Role = 'platform_admin' | 'tenant_admin' | 'caregiver' | 'patient' | 'viewer';
type Tenant = { name: string; status: string; createdAt: string };
type Branding = { tenantId: string; organizationName: string; primaryColor: string; secondaryColor: string; accentColor: string; supportContact: string; poweredByCareGrid: boolean; updatedAt: string };
type DashboardConfig = { tenantId: string; defaultPreset: string; enabledOptional: string[]; updatedAt: string };
type User = { tenantId?: string; email: string; passwordHash: string; salt: string; role: Role | 'admin'; personId?: string; name?: string; createdAt: string };
type Session = { userId: string; tenantId: string; email: string; role: Role; personId?: string; createdAt: string };
type Person = { tenantId?: string; name: string; program: string; phone: string; status: string; createdAt: string; dateOfBirth?: string; heightCm?: number; weightKg?: number; address?: string; allergies?: string; medicalHistory?: string; medications?: string; emergencyContact?: string; demo?: boolean };
type Device = { tenantId?: string; personId: string; type: string; manufacturer: string; model: string; serial: string; status: string; createdAt: string; demo?: boolean };
type Reading = { tenantId?: string; personId: string; type: string; value: number; secondaryValue?: number; unit: string; recordedAt: string; source?: string; demo?: boolean };
type Task = { tenantId?: string; personId: string; title: string; dueDate: string; status: string; createdAt: string; demo?: boolean };
type Share = { tenantId: string; personId: string; patientUserId: string; viewerUserId: string; viewerEmail: string; label: string; expiresAt: string; status: string; createdAt: string };
type Audit = { tenantId: string; actorUserId: string; actorEmail: string; action: string; entityType: string; entityId: string; personId?: string; detail: string; createdAt: string };

const PROGRAMS = ['Diabetes management', 'Hypertension management', 'Cardiovascular health', 'Stroke prevention'];
const ADMIN_ROLES: Role[] = ['platform_admin', 'tenant_admin'];
const DEFAULT_BRANDING = { organizationName: 'CareGrid', primaryColor: '#173b4f', secondaryColor: '#2f7896', accentColor: '#55a184', supportContact: '', poweredByCareGrid: true };
const CORE_DASHBOARDS = ['care_operations', 'diabetes', 'hypertension', 'cardiovascular', 'stroke_prevention'];
const OPTIONAL_DASHBOARDS = ['assisted_living', 'fitness'];
const DEFAULT_DASHBOARD_CONFIG = { defaultPreset: 'care_operations', enabledOptional: [] as string[] };

function normalizeEmail(value: unknown) { return String(value || '').trim().toLowerCase(); }
function hashPassword(password: string, salt: string) { return scryptSync(password, salt, 64).toString('hex'); }
function validPassword(password: string) { return password.length >= 12; }
function safeEqual(a: string, b: string) {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}
function tokenFrom(query: Record<string, string>) { return query.token || ''; }
function requestedTenant(bodyOrQuery: Record<string, unknown>) { return String(bodyOrQuery.tenantId || ''); }
function isAdmin(role: Role) { return ADMIN_ROLES.includes(role); }
function canCareWrite(role: Role) { return isAdmin(role) || role === 'caregiver'; }

async function configured() {
  const { items } = await db.list<User>('users', { limit: 1 });
  return items.length > 0;
}
async function findUser(email: string) {
  const { items } = await db.list<User>('users', { limit: 200 });
  return items.find(item => item.email === email) || null;
}
async function findTenant(tenantId: string) {
  if (!tenantId) return null;
  const [tenant] = await db.get<Tenant>('tenants', [tenantId]);
  return tenant ? { id: tenantId, ...tenant } : null;
}
async function ensureLegacyMigration() {
  const users = await db.list<User>('users', { limit: 200 });
  if (!users.items.length) return;
  const tenants = await db.list<Tenant>('tenants', { limit: 10 });
  let tenantId = tenants.items[0]?.id;
  if (!tenantId) {
    const [created] = await db.add('tenants', [{ name: 'Primary CareGrid Organization', status: 'Active', createdAt: new Date().toISOString() }]);
    if (!created) return;
    tenantId = created;
    await db.add('branding', [{ tenantId, ...DEFAULT_BRANDING, organizationName: 'Primary CareGrid Organization', updatedAt: new Date().toISOString() }]);
  }
  for (let i = 0; i < users.items.length; i += 1) {
    const user = users.items[i];
    if (!user.tenantId || user.role === 'admin') {
      await db.update('users', [{ id: user.id, record: { ...user, tenantId, role: i === 0 ? 'platform_admin' : 'tenant_admin' } }]);
    }
  }
  for (const table of ['people', 'devices', 'readings', 'tasks']) {
    const page = await db.list<Record<string, unknown>>(table, { limit: 500 });
    for (const item of page.items) {
      if (!item.tenantId) await db.update(table, [{ id: item.id, record: { ...item, tenantId } }]);
    }
  }
}
async function requireSession(token: string) {
  if (!token) return null;
  const [session] = await db.get<Session>('sessions', [token]);
  return session ? { id: token, ...session } : null;
}
async function resolveTenant(session: Session & { id: string }, requested?: string) {
  const tenantId = requested || session.tenantId;
  if (session.role !== 'platform_admin' && tenantId !== session.tenantId) return null;
  return await findTenant(tenantId);
}
async function audit(session: Session & { id: string }, tenantId: string, action: string, entityType: string, entityId: string, detail: string, personId?: string) {
  await db.add('audit', [{ tenantId, actorUserId: session.userId, actorEmail: session.email, action, entityType, entityId, personId: personId || '', detail, createdAt: new Date().toISOString() }]);
}
async function tenantBranding(tenantId: string) {
  const { items } = await db.list<Branding>('branding', { limit: 200 });
  return items.find(item => item.tenantId === tenantId) || { id: '', tenantId, ...DEFAULT_BRANDING, updatedAt: new Date().toISOString() };
}
async function tenantDashboardConfig(tenantId: string) {
  const { items } = await db.list<DashboardConfig>('dashboard_configs', { limit: 200 });
  return items.find(item => item.tenantId === tenantId) || { id: '', tenantId, ...DEFAULT_DASHBOARD_CONFIG, updatedAt: new Date().toISOString() };
}
function visiblePersonIds(session: Session & { id: string }, people: Array<Person & { id: string }>) {
  if (session.role === 'patient' || session.role === 'viewer') return people.filter(person => person.id === session.personId).map(person => person.id);
  return people.map(person => person.id);
}
async function snapshot(session: Session & { id: string }, tenantId: string) {
  const [peoplePage, devicesPage, readingsPage, tasksPage, usersPage, sharesPage, auditPage, tenantsPage] = await Promise.all([
    db.list<Person>('people', { limit: 300 }),
    db.list<Device>('devices', { limit: 300 }),
    db.list<Reading>('readings', { limit: 500 }),
    db.list<Task>('tasks', { limit: 300 }),
    db.list<User>('users', { limit: 300 }),
    db.list<Share>('shares', { limit: 300 }),
    db.list<Audit>('audit', { limit: 500 }),
    db.list<Tenant>('tenants', { limit: 100 }),
  ]);
  const tenantPeople = peoplePage.items.filter(item => item.tenantId === tenantId);
  const personIds = new Set(visiblePersonIds(session, tenantPeople));
  const people = tenantPeople.filter(item => personIds.has(item.id));
  const devices = devicesPage.items.filter(item => item.tenantId === tenantId && personIds.has(item.personId));
  const readings = readingsPage.items.filter(item => item.tenantId === tenantId && personIds.has(item.personId));
  const tasks = tasksPage.items.filter(item => item.tenantId === tenantId && personIds.has(item.personId));
  const users = isAdmin(session.role) ? usersPage.items.filter(item => item.tenantId === tenantId).map(({ passwordHash: _p, salt: _s, ...item }) => item) : usersPage.items.filter(item => item.id === session.userId).map(({ passwordHash: _p, salt: _s, ...item }) => item);
  const shares = session.role === 'viewer' ? [] : sharesPage.items.filter(item => item.tenantId === tenantId && (isAdmin(session.role) || item.personId === session.personId));
  const history = auditPage.items.filter(item => item.tenantId === tenantId && (isAdmin(session.role) || session.role === 'caregiver' || item.personId === session.personId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 150);
  const branding = await tenantBranding(tenantId);
  const dashboardConfig = await tenantDashboardConfig(tenantId);
  const tenants = session.role === 'platform_admin' ? tenantsPage.items : tenantsPage.items.filter(item => item.id === tenantId);
  return { people, devices, readings, tasks, users, shares, history, branding, dashboardConfig, tenants };
}
async function ensurePersonAccess(session: Session & { id: string }, tenantId: string, personId: string) {
  const [person] = await db.get<Person>('people', [personId]);
  if (!person || person.tenantId !== tenantId) return null;
  if ((session.role === 'patient' || session.role === 'viewer') && session.personId !== personId) return null;
  return { id: personId, ...person };
}
async function deleteDemoRows(table: string, tenantId: string) {
  const page = await db.list<Record<string, unknown>>(table, { limit: 500 });
  const ids = page.items.filter(item => item.tenantId === tenantId && item.demo === true).map(item => item.id);
  if (ids.length) await db.delete(table, ids);
}

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ ok: true })],
  'GET /api/config': [async () => { await ensureLegacyMigration(); return json({ configured: await configured() }); }],
  'POST /api/setup': [async ({ body }) => {
    if (await configured()) return error('CareGrid is already configured', 409);
    const data = body as { email?: string; password?: string; organizationName?: string };
    const email = normalizeEmail(data.email);
    const password = String(data.password || '');
    const organizationName = String(data.organizationName || 'Primary CareGrid Organization').trim();
    if (!email.includes('@')) return error('Enter a valid email address', 400);
    if (!validPassword(password)) return error('Password must be at least 12 characters', 400);
    const [tenantId] = await db.add('tenants', [{ name: organizationName, status: 'Active', createdAt: new Date().toISOString() }]);
    if (!tenantId) return error('Unable to create tenant', 500);
    await db.add('branding', [{ tenantId, ...DEFAULT_BRANDING, organizationName, updatedAt: new Date().toISOString() }]);
    const salt = randomBytes(16).toString('hex');
    const [userId] = await db.add('users', [{ tenantId, email, passwordHash: hashPassword(password, salt), salt, role: 'platform_admin', createdAt: new Date().toISOString() }]);
    if (!userId) return error('Unable to create administrator', 500);
    const [token] = await db.add('sessions', [{ userId, tenantId, email, role: 'platform_admin', createdAt: new Date().toISOString() }]);
    if (!token) return error('Unable to create session', 500);
    return json({ token, tenantId, email, role: 'platform_admin' });
  }],
  'POST /api/login': [async ({ body }) => {
    await ensureLegacyMigration();
    const data = body as { email?: string; password?: string };
    const email = normalizeEmail(data.email);
    const user = await findUser(email);
    if (!user || !user.tenantId) return error('Invalid credentials', 401);
    const actual = hashPassword(String(data.password || ''), user.salt);
    if (!safeEqual(actual, user.passwordHash)) return error('Invalid credentials', 401);
    const role = (user.role === 'admin' ? 'tenant_admin' : user.role) as Role;
    const [token] = await db.add('sessions', [{ userId: user.id, tenantId: user.tenantId, email: user.email, role, personId: user.personId || '', createdAt: new Date().toISOString() }]);
    if (!token) return error('Unable to create session', 500);
    const session = { id: token, userId: user.id, tenantId: user.tenantId, email: user.email, role, personId: user.personId || '', createdAt: new Date().toISOString() };
    await audit(session, user.tenantId, 'login', 'user', user.id, 'Successful sign in', user.personId);
    return json({ token, tenantId: user.tenantId, email: user.email, role, personId: user.personId || '' });
  }],
  'GET /api/dashboard': [async ({ query }) => {
    const session = await requireSession(tokenFrom(query));
    if (!session) return error('Unauthorized', 401);
    const tenant = await resolveTenant(session, query.tenantId);
    if (!tenant) return error('Forbidden tenant access', 403);
    const data = await snapshot(session, tenant.id);
    const today = new Date().toISOString().slice(0, 10);
    const openTasks = data.tasks.filter(task => task.status !== 'Done');
    const pillars = PROGRAMS.map(name => ({ name, activePeople: data.people.filter(person => person.program === name).length, openTasks: openTasks.filter(task => data.people.find(person => person.id === task.personId)?.program === name).length }));
    const permissions = {
      manageTenants: session.role === 'platform_admin',
      manageUsers: isAdmin(session.role),
      manageBranding: isAdmin(session.role),
      manageDashboardConfig: isAdmin(session.role),
      managePeople: isAdmin(session.role),
      editPatientDetails: canCareWrite(session.role),
      manageDevices: isAdmin(session.role),
      addReadings: session.role !== 'viewer',
      manageTasks: canCareWrite(session.role),
      createShare: session.role === 'patient' || isAdmin(session.role),
      readOnly: session.role === 'viewer',
    };
    return json({
      session: { email: session.email, role: session.role, tenantId: session.tenantId, personId: session.personId || '' },
      tenant: { id: tenant.id, ...tenant },
      kpis: { activePeople: data.people.filter(person => person.status !== 'Inactive').length, enrolledDevices: data.devices.length, readingsToday: data.readings.filter(reading => reading.recordedAt.slice(0, 10) === today).length, openTasks: openTasks.length, users: data.users.length },
      pillars,
      permissions,
      ...data,
    });
  }],
  'POST /api/tenants': [async ({ body }) => {
    const data = body as { token?: string; name?: string; adminEmail?: string; adminPassword?: string };
    const session = await requireSession(String(data.token || ''));
    if (!session || session.role !== 'platform_admin') return error('Forbidden', 403);
    const name = String(data.name || '').trim();
    const email = normalizeEmail(data.adminEmail);
    const password = String(data.adminPassword || '');
    if (!name || !email.includes('@') || !validPassword(password)) return error('Tenant name, valid admin email and 12+ character password are required', 400);
    if (await findUser(email)) return error('Email already exists', 409);
    const [tenantId] = await db.add('tenants', [{ name, status: 'Active', createdAt: new Date().toISOString() }]);
    if (!tenantId) return error('Unable to create tenant', 500);
    await db.add('branding', [{ tenantId, ...DEFAULT_BRANDING, organizationName: name, updatedAt: new Date().toISOString() }]);
    const salt = randomBytes(16).toString('hex');
    const [userId] = await db.add('users', [{ tenantId, email, passwordHash: hashPassword(password, salt), salt, role: 'tenant_admin', createdAt: new Date().toISOString() }]);
    if (!userId) return error('Unable to create tenant admin', 500);
    await audit(session, tenantId, 'create', 'tenant', tenantId, `Tenant ${name} created`);
    return json({ tenantId, userId }, 201);
  }],
  'POST /api/users': [async ({ body }) => {
    const data = body as { token?: string; tenantId?: string; email?: string; password?: string; role?: Role; name?: string; personId?: string };
    const session = await requireSession(String(data.token || ''));
    if (!session || !isAdmin(session.role)) return error('Forbidden', 403);
    const tenant = await resolveTenant(session, requestedTenant(data) || session.tenantId);
    if (!tenant) return error('Forbidden tenant access', 403);
    const role = String(data.role || '') as Role;
    if (!['tenant_admin', 'caregiver', 'patient'].includes(role) && !(session.role === 'platform_admin' && role === 'platform_admin')) return error('Unsupported role', 400);
    const email = normalizeEmail(data.email);
    const password = String(data.password || '');
    if (!email.includes('@') || !validPassword(password)) return error('Valid email and 12+ character password are required', 400);
    if (await findUser(email)) return error('Email already exists', 409);
    if (role === 'patient' && !data.personId) return error('Patient role must be linked to a person', 400);
    if (data.personId && !await ensurePersonAccess(session, tenant.id, data.personId)) return error('Person not found', 404);
    const salt = randomBytes(16).toString('hex');
    const [id] = await db.add('users', [{ tenantId: tenant.id, email, passwordHash: hashPassword(password, salt), salt, role, personId: data.personId || '', name: String(data.name || ''), createdAt: new Date().toISOString() }]);
    if (!id) return error('Unable to create user', 500);
    await audit(session, tenant.id, 'create', 'user', id, `${role} account created`, data.personId);
    return json({ id }, 201);
  }],
  'DELETE /api/users/:id': [async ({ params, body }) => {
    const data = body as { token?: string; tenantId?: string };
    const session = await requireSession(String(data.token || ''));
    if (!session || !isAdmin(session.role) || params.id === session.userId) return error('Forbidden', 403);
    const tenant = await resolveTenant(session, requestedTenant(data) || session.tenantId);
    if (!tenant) return error('Forbidden tenant access', 403);
    const [target] = await db.get<User>('users', [params.id]);
    if (!target || target.tenantId !== tenant.id) return error('User not found', 404);
    const [ok] = await db.delete('users', [params.id]);
    if (ok) await audit(session, tenant.id, 'delete', 'user', params.id, 'User removed', target.personId);
    return ok ? json({ ok: true }) : error('Unable to remove user', 500);
  }],
  'PUT /api/branding': [async ({ body }) => {
    const data = body as { token?: string; tenantId?: string; organizationName?: string; primaryColor?: string; secondaryColor?: string; accentColor?: string; supportContact?: string; poweredByCareGrid?: boolean };
    const session = await requireSession(String(data.token || ''));
    if (!session || !isAdmin(session.role)) return error('Forbidden', 403);
    const tenant = await resolveTenant(session, requestedTenant(data) || session.tenantId);
    if (!tenant) return error('Forbidden tenant access', 403);
    const branding = await tenantBranding(tenant.id);
    const record = { tenantId: tenant.id, organizationName: String(data.organizationName || branding.organizationName || tenant.name), primaryColor: String(data.primaryColor || branding.primaryColor), secondaryColor: String(data.secondaryColor || branding.secondaryColor), accentColor: String(data.accentColor || branding.accentColor), supportContact: String(data.supportContact ?? branding.supportContact), poweredByCareGrid: data.poweredByCareGrid ?? branding.poweredByCareGrid, updatedAt: new Date().toISOString() };
    if (branding.id) await db.update('branding', [{ id: branding.id, record }]); else await db.add('branding', [record]);
    await audit(session, tenant.id, 'update', 'branding', tenant.id, 'Tenant branding updated');
    return json(record);
  }],
  'PUT /api/dashboard-config': [async ({ body }) => {
    const data = body as { token?: string; tenantId?: string; defaultPreset?: string; enabledOptional?: string[] };
    const session = await requireSession(String(data.token || ''));
    if (!session || !isAdmin(session.role)) return error('Forbidden', 403);
    const tenant = await resolveTenant(session, requestedTenant(data) || session.tenantId);
    if (!tenant) return error('Forbidden tenant access', 403);
    const enabledOptional = Array.isArray(data.enabledOptional) ? data.enabledOptional.filter(item => OPTIONAL_DASHBOARDS.includes(item)) : [];
    const defaultPreset = String(data.defaultPreset || 'care_operations');
    const allowed = [...CORE_DASHBOARDS, ...enabledOptional];
    if (!allowed.includes(defaultPreset)) return error('Default dashboard must be an enabled dashboard option', 400);
    const current = await tenantDashboardConfig(tenant.id);
    const record = { tenantId: tenant.id, defaultPreset, enabledOptional, updatedAt: new Date().toISOString() };
    if (current.id) await db.update('dashboard_configs', [{ id: current.id, record }]); else await db.add('dashboard_configs', [record]);
    await audit(session, tenant.id, 'update', 'dashboard_config', tenant.id, `Default dashboard changed to ${defaultPreset}`);
    return json(record);
  }],
  'POST /api/people': [async ({ body }) => {
    const data = body as { token?: string; tenantId?: string; name?: string; program?: string; phone?: string };
    const session = await requireSession(String(data.token || ''));
    if (!session || !isAdmin(session.role)) return error('Forbidden', 403);
    const tenant = await resolveTenant(session, requestedTenant(data) || session.tenantId);
    if (!tenant) return error('Forbidden tenant access', 403);
    const name = String(data.name || '').trim();
    const program = String(data.program || '');
    if (!name || !PROGRAMS.includes(program)) return error('Name and clinical program are required', 400);
    const [id] = await db.add('people', [{ tenantId: tenant.id, name, program, phone: String(data.phone || '').trim(), status: 'Active', createdAt: new Date().toISOString() }]);
    if (!id) return error('Unable to add person', 500);
    await audit(session, tenant.id, 'create', 'person', id, `Person added to ${program}`, id);
    return json({ id }, 201);
  }],
  'PUT /api/people/:id': [async ({ params, body }) => {
    const data = body as { token?: string; tenantId?: string; phone?: string; dateOfBirth?: string; heightCm?: number | string; weightKg?: number | string; address?: string; allergies?: string; medicalHistory?: string; medications?: string; emergencyContact?: string };
    const session = await requireSession(String(data.token || ''));
    if (!session || !canCareWrite(session.role)) return error('Forbidden', 403);
    const tenant = await resolveTenant(session, requestedTenant(data) || session.tenantId);
    if (!tenant || !await ensurePersonAccess(session, tenant.id, params.id)) return error('Person not found', 404);
    const [current] = await db.get<Person>('people', [params.id]);
    if (!current) return error('Person not found', 404);
    const optionalNumber = (value: number | string | undefined) => value === undefined || value === '' ? undefined : Number(value);
    const heightCm = optionalNumber(data.heightCm);
    const weightKg = optionalNumber(data.weightKg);
    if ((heightCm !== undefined && !Number.isFinite(heightCm)) || (weightKg !== undefined && !Number.isFinite(weightKg))) return error('Height and weight must be valid numbers', 400);
    const record: Person = { ...current, phone: String(data.phone ?? current.phone ?? '').trim(), dateOfBirth: String(data.dateOfBirth ?? current.dateOfBirth ?? '').trim() || undefined, heightCm, weightKg, address: String(data.address ?? current.address ?? '').trim() || undefined, allergies: String(data.allergies ?? current.allergies ?? '').trim() || undefined, medicalHistory: String(data.medicalHistory ?? current.medicalHistory ?? '').trim() || undefined, medications: String(data.medications ?? current.medications ?? '').trim() || undefined, emergencyContact: String(data.emergencyContact ?? current.emergencyContact ?? '').trim() || undefined };
    const [ok] = await db.update('people', [{ id: params.id, record }]);
    if (!ok) return error('Unable to update patient details', 500);
    await audit(session, tenant.id, 'update', 'person', params.id, 'Optional patient profile details updated', params.id);
    return json({ ok: true });
  }],
  'DELETE /api/people/:id': [async ({ params, body }) => {
    const data = body as { token?: string; tenantId?: string };
    const session = await requireSession(String(data.token || ''));
    if (!session || !isAdmin(session.role)) return error('Forbidden', 403);
    const tenant = await resolveTenant(session, requestedTenant(data) || session.tenantId);
    if (!tenant || !await ensurePersonAccess(session, tenant.id, params.id)) return error('Person not found', 404);
    const [ok] = await db.delete('people', [params.id]);
    if (ok) await audit(session, tenant.id, 'delete', 'person', params.id, 'Person removed', params.id);
    return ok ? json({ ok: true }) : error('Unable to remove person', 500);
  }],
  'POST /api/devices': [async ({ body }) => {
    const data = body as { token?: string; tenantId?: string; personId?: string; type?: string; manufacturer?: string; model?: string; serial?: string };
    const session = await requireSession(String(data.token || ''));
    if (!session || !isAdmin(session.role)) return error('Forbidden', 403);
    const tenant = await resolveTenant(session, requestedTenant(data) || session.tenantId);
    if (!tenant || !data.personId || !await ensurePersonAccess(session, tenant.id, data.personId)) return error('Person not found', 404);
    if (!data.type) return error('Device type is required', 400);
    const [id] = await db.add('devices', [{ tenantId: tenant.id, personId: data.personId, type: data.type, manufacturer: String(data.manufacturer || ''), model: String(data.model || ''), serial: String(data.serial || ''), status: 'Active', createdAt: new Date().toISOString() }]);
    if (!id) return error('Unable to add device', 500);
    await audit(session, tenant.id, 'assign', 'device', id, `${data.type} enrolled`, data.personId);
    return json({ id }, 201);
  }],
  'DELETE /api/devices/:id': [async ({ params, body }) => {
    const data = body as { token?: string; tenantId?: string };
    const session = await requireSession(String(data.token || ''));
    if (!session || !isAdmin(session.role)) return error('Forbidden', 403);
    const tenant = await resolveTenant(session, requestedTenant(data) || session.tenantId);
    if (!tenant) return error('Forbidden tenant access', 403);
    const [device] = await db.get<Device>('devices', [params.id]);
    if (!device || device.tenantId !== tenant.id) return error('Device not found', 404);
    const [ok] = await db.delete('devices', [params.id]);
    if (ok) await audit(session, tenant.id, 'delete', 'device', params.id, 'Device removed', device.personId);
    return ok ? json({ ok: true }) : error('Unable to remove device', 500);
  }],
  'POST /api/readings': [async ({ body }) => {
    const data = body as { token?: string; tenantId?: string; personId?: string; type?: string; value?: number; secondaryValue?: number; unit?: string; recordedAt?: string; source?: string };
    const session = await requireSession(String(data.token || ''));
    if (!session || session.role === 'viewer') return error('Forbidden', 403);
    const tenant = await resolveTenant(session, requestedTenant(data) || session.tenantId);
    if (!tenant || !data.personId || !await ensurePersonAccess(session, tenant.id, data.personId)) return error('Person not found', 404);
    if (!data.type || !Number.isFinite(Number(data.value))) return error('Reading type and value are required', 400);
    const record: Record<string, unknown> = { tenantId: tenant.id, personId: data.personId, type: data.type, value: Number(data.value), unit: String(data.unit || ''), recordedAt: data.recordedAt || new Date().toISOString(), source: String(data.source || 'Manual') };
    if (data.secondaryValue !== undefined && Number.isFinite(Number(data.secondaryValue))) record.secondaryValue = Number(data.secondaryValue);
    const [id] = await db.add('readings', [record]);
    if (!id) return error('Unable to add reading', 500);
    await audit(session, tenant.id, 'create', 'reading', id, `${data.type} reading recorded`, data.personId);
    return json({ id }, 201);
  }],
  'POST /api/tasks': [async ({ body }) => {
    const data = body as { token?: string; tenantId?: string; personId?: string; title?: string; dueDate?: string };
    const session = await requireSession(String(data.token || ''));
    if (!session || !canCareWrite(session.role)) return error('Forbidden', 403);
    const tenant = await resolveTenant(session, requestedTenant(data) || session.tenantId);
    if (!tenant || !data.personId || !await ensurePersonAccess(session, tenant.id, data.personId)) return error('Person not found', 404);
    if (!String(data.title || '').trim()) return error('Task title is required', 400);
    const [id] = await db.add('tasks', [{ tenantId: tenant.id, personId: data.personId, title: String(data.title).trim(), dueDate: String(data.dueDate || ''), status: 'To do', createdAt: new Date().toISOString() }]);
    if (!id) return error('Unable to add task', 500);
    await audit(session, tenant.id, 'create', 'task', id, 'Care task created', data.personId);
    return json({ id }, 201);
  }],
  'PUT /api/tasks/:id': [async ({ params, body }) => {
    const data = body as { token?: string; tenantId?: string; status?: string };
    const session = await requireSession(String(data.token || ''));
    if (!session || !canCareWrite(session.role)) return error('Forbidden', 403);
    const tenant = await resolveTenant(session, requestedTenant(data) || session.tenantId);
    if (!tenant) return error('Forbidden tenant access', 403);
    const [current] = await db.get<Task>('tasks', [params.id]);
    if (!current || current.tenantId !== tenant.id || !await ensurePersonAccess(session, tenant.id, current.personId)) return error('Task not found', 404);
    const status = String(data.status || current.status);
    if (!['To do', 'In progress', 'Done'].includes(status)) return error('Invalid task status', 400);
    const [ok] = await db.update('tasks', [{ id: params.id, record: { ...current, status } }]);
    if (ok) await audit(session, tenant.id, 'update', 'task', params.id, `Task changed to ${status}`, current.personId);
    return ok ? json({ ok: true }) : error('Unable to update task', 500);
  }],
  'POST /api/shares': [async ({ body }) => {
    const data = body as { token?: string; tenantId?: string; personId?: string; viewerEmail?: string; label?: string; expiresAt?: string };
    const session = await requireSession(String(data.token || ''));
    if (!session || !(session.role === 'patient' || isAdmin(session.role))) return error('Forbidden', 403);
    const tenant = await resolveTenant(session, requestedTenant(data) || session.tenantId);
    if (!tenant) return error('Forbidden tenant access', 403);
    const personId = session.role === 'patient' ? String(session.personId || '') : String(data.personId || '');
    if (!personId || !await ensurePersonAccess(session, tenant.id, personId)) return error('Person not found', 404);
    const viewerEmail = normalizeEmail(data.viewerEmail);
    if (!viewerEmail.includes('@')) return error('Enter a valid loved-one email', 400);
    if (await findUser(viewerEmail)) return error('Email already has a CareGrid account', 409);
    const temporaryPassword = `CG-${randomBytes(8).toString('base64url')}!9`;
    const salt = randomBytes(16).toString('hex');
    const [viewerUserId] = await db.add('users', [{ tenantId: tenant.id, email: viewerEmail, passwordHash: hashPassword(temporaryPassword, salt), salt, role: 'viewer', personId, name: String(data.label || 'Loved one'), createdAt: new Date().toISOString() }]);
    if (!viewerUserId) return error('Unable to create viewer', 500);
    const [shareId] = await db.add('shares', [{ tenantId: tenant.id, personId, patientUserId: session.userId, viewerUserId, viewerEmail, label: String(data.label || 'Loved one'), expiresAt: String(data.expiresAt || ''), status: 'Active', createdAt: new Date().toISOString() }]);
    if (!shareId) return error('Unable to create share', 500);
    await audit(session, tenant.id, 'share', 'person', personId, `Read-only loved-one access created for ${viewerEmail}`, personId);
    return json({ shareId, viewerEmail, temporaryPassword }, 201);
  }],
  'DELETE /api/shares/:id': [async ({ params, body }) => {
    const data = body as { token?: string; tenantId?: string };
    const session = await requireSession(String(data.token || ''));
    if (!session || !(session.role === 'patient' || isAdmin(session.role))) return error('Forbidden', 403);
    const tenant = await resolveTenant(session, requestedTenant(data) || session.tenantId);
    if (!tenant) return error('Forbidden tenant access', 403);
    const [share] = await db.get<Share>('shares', [params.id]);
    if (!share || share.tenantId !== tenant.id || (session.role === 'patient' && share.patientUserId !== session.userId)) return error('Share not found', 404);
    await db.delete('shares', [params.id]);
    await db.delete('users', [share.viewerUserId]);
    await audit(session, tenant.id, 'revoke', 'share', params.id, `Read-only access revoked for ${share.viewerEmail}`, share.personId);
    return json({ ok: true });
  }],
  'POST /api/demo/seed': [async ({ body }) => {
    const data = body as { token?: string; tenantId?: string };
    const session = await requireSession(String(data.token || ''));
    if (!session || !isAdmin(session.role)) return error('Forbidden', 403);
    const tenant = await resolveTenant(session, requestedTenant(data) || session.tenantId);
    if (!tenant) return error('Forbidden tenant access', 403);
    const now = Date.now();
    const personIds = await db.add('people', [
      { tenantId: tenant.id, name: 'Fictional Amina D.', program: 'Diabetes management', phone: '', status: 'Active', createdAt: new Date().toISOString(), demo: true },
      { tenantId: tenant.id, name: 'Fictional Sipho M.', program: 'Hypertension management', phone: '', status: 'Active', createdAt: new Date().toISOString(), demo: true },
    ]);
    const p1 = personIds[0]; const p2 = personIds[1];
    if (p1) {
      await db.add('devices', [{ tenantId: tenant.id, personId: p1, type: 'CGM', manufacturer: 'Demo Device Co.', model: 'CGM-1', serial: 'DEMO-CGM-01', status: 'Active', createdAt: new Date().toISOString(), demo: true }]);
      const readings = Array.from({ length: 18 }, (_, i) => ({ tenantId: tenant.id, personId: p1, type: 'Glucose', value: 5.6 + ((i * 7) % 13) / 10, unit: 'mmol/L', recordedAt: new Date(now - (17 - i) * 3 * 60 * 60 * 1000).toISOString(), source: 'Demo CGM', demo: true }));
      await db.add('readings', readings);
      await db.add('tasks', [{ tenantId: tenant.id, personId: p1, title: 'Review weekly glucose trend', dueDate: '', status: 'In progress', createdAt: new Date().toISOString(), demo: true }]);
    }
    if (p2) {
      await db.add('devices', [{ tenantId: tenant.id, personId: p2, type: 'Blood pressure monitor', manufacturer: 'Demo Device Co.', model: 'BP-1', serial: 'DEMO-BP-01', status: 'Active', createdAt: new Date().toISOString(), demo: true }]);
      const readings = Array.from({ length: 12 }, (_, i) => ({ tenantId: tenant.id, personId: p2, type: 'Blood pressure', value: 122 + ((i * 5) % 18), secondaryValue: 76 + ((i * 3) % 10), unit: 'mmHg', recordedAt: new Date(now - (11 - i) * 12 * 60 * 60 * 1000).toISOString(), source: 'Demo BP monitor', demo: true }));
      await db.add('readings', readings);
    }
    await audit(session, tenant.id, 'seed', 'demo', tenant.id, 'Interactive fictional demo data added');
    return json({ ok: true });
  }],
  'POST /api/demo/reset': [async ({ body }) => {
    const data = body as { token?: string; tenantId?: string };
    const session = await requireSession(String(data.token || ''));
    if (!session || !isAdmin(session.role)) return error('Forbidden', 403);
    const tenant = await resolveTenant(session, requestedTenant(data) || session.tenantId);
    if (!tenant) return error('Forbidden tenant access', 403);
    await deleteDemoRows('readings', tenant.id);
    await deleteDemoRows('tasks', tenant.id);
    await deleteDemoRows('devices', tenant.id);
    await deleteDemoRows('people', tenant.id);
    await audit(session, tenant.id, 'reset', 'demo', tenant.id, 'Fictional demo data removed');
    return json({ ok: true });
  }],
});
