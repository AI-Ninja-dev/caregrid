'use client';

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Activity,
  FileSpreadsheet,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Radio,
  RefreshCw,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import LiveCarePlans, { type PlanReview, type StoredPlan } from './components/LiveCarePlans';
import type { AutomaticReading } from '../lib/ingestion/reading';
import { csvCell } from '../lib/report';
import { clinicalPillars, type ClinicalPillar } from '../lib/care-plans';

type Person = {
  id: string;
  name: string;
  town: string;
  active: number;
  consent_at: string;
  pillar: ClinicalPillar;
  programme: string;
};

type Device = {
  id: string;
  label: string;
  person_id: string;
  adapter_id: string;
  kind: string;
  enabled: number;
};

type Integration = {
  id: string;
  name: string;
  enabled: number;
};

type User = {
  id: string;
  email: string;
  role: string;
  active?: number;
};

type Reading = {
  event_key: string;
  person_id: string;
  device_id: string;
  measured_at: string;
  received_at: string;
  payload: AutomaticReading;
};

type Task = {
  id: string;
  person_id: string;
  title: string;
  owner: string | null;
  stage: string;
};

type Snapshot = {
  plans: StoredPlan[];
  planReviews: PlanReview[];
  planTasks: { plan_id: string; version: number; task_id: string }[];
  user: User;
  people: Person[];
  devices: Device[];
  integrations: Integration[];
  readings: Reading[];
  tasks: Task[];
  users: User[];
  audit: { id: number; actor: string; action: string; subject: string; at: string }[];
};

const navigation = [
  ['Overview', LayoutDashboard],
  ['People', Users],
  ['Devices', Radio],
  ['Tasks', ListChecks],
  ['Care plans', ShieldCheck],
  ['Reports', FileSpreadsheet],
  ['Workspace', Settings],
] as const;

type View = (typeof navigation)[number][0];

const date = (value: string) =>
  new Intl.DateTimeFormat('en-ZA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Johannesburg',
  }).format(new Date(value));

function readingValue(reading: Reading) {
  const measurement = reading.payload.measurement;
  if (measurement.kind === 'blood-pressure') {
    return `${measurement.systolic}/${measurement.diastolic} ${measurement.unit}${
      measurement.pulse === undefined ? '' : ` · Pulse ${measurement.pulse} bpm`
    }`;
  }

  return `${measurement.value} ${measurement.unit}${
    measurement.kind === 'spo2' && measurement.pulse !== undefined
      ? ` · Pulse ${measurement.pulse} bpm`
      : ''
  }`;
}

async function api(path: string, method = 'GET', data?: unknown) {
  const response = await fetch(`/api/${path}/`, {
    method,
    cache: 'no-store',
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}

function Input({
  name,
  label,
  type = 'text',
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className='field'>
      {label}
      <input
        name={name}
        type={type}
        required={required}
        maxLength={type === 'password' ? 256 : 160}
        minLength={type === 'password' ? 14 : undefined}
        autoComplete={type === 'password' ? 'new-password' : undefined}
      />
    </label>
  );
}

function Form({
  children,
  label,
  onSubmit,
  busy,
}: {
  children: ReactNode;
  label: string;
  onSubmit: (data: Record<string, unknown>) => Promise<boolean>;
  busy: boolean;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    if (await onSubmit(fields)) form.reset();
  }

  return (
    <form className='live-form' onSubmit={submit}>
      {children}
      <button className='primary' disabled={busy}>
        {busy ? 'Saving…' : label}
      </button>
    </form>
  );
}

export default function CareGrid() {
  const [auth, setAuth] = useState<{ configured: boolean; user: User | null } | null>(null);
  const [data, setData] = useState<Snapshot | null>(null);
  const [view, setView] = useState<View>('Overview');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [personId, setPersonId] = useState('');
  const [secret, setSecret] = useState<{ secret: string; adapterId: string } | null>(null);
  const [recoveryLink, setRecoveryLink] = useState('');

  const refresh = useCallback(async () => {
    const nextAuth = await api('auth');
    setAuth(nextAuth);
    if (nextAuth.user) {
      setData(await api('workspace'));
    } else {
      setData(null);
      setSecret(null);
      setRecoveryLink('');
    }
  }, []);

  useEffect(() => {
    refresh().catch((error) => setMessage(error.message));
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refresh().catch(() =>
          setMessage('Connection lost. Displayed records may be out of date. Use Refresh to retry.'),
        );
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const sync = () => {
      const found = navigation.find(
        ([name]) => `#/${name.toLowerCase().replace(/ /g, '-')}` === location.hash,
      );
      setView(found?.[0] || 'Overview');
    };

    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  function go(next: View) {
    setView(next);
    location.hash = `/${next.toLowerCase().replace(/ /g, '-')}`;
    setPersonId('');
    setMessage('');
  }

  async function mutate(payload: Record<string, unknown>) {
    setBusy(true);
    setMessage('');
    try {
      const result = await api('workspace', 'POST', payload);
      if (result.secret) setSecret(result);
      if (result.recoveryToken) {
        setRecoveryLink(`${location.origin}/recover/#${result.recoveryToken}`);
      }
      await refresh();
      setMessage('Changes saved.');
      return true;
    } catch (error) {
      setMessage((error as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const notice = (
    <p role='status' className='live-notice'>
      {message}
    </p>
  );

  if (!auth) {
    return (
      <main className='auth-page'>
        <div className='panel'>
          <Activity />
          <h1>Opening CareGrid</h1>
          {notice}
          <button className='secondary' onClick={() => refresh().catch((error) => setMessage(error.message))}>
            Retry connection
          </button>
        </div>
      </main>
    );
  }

  if (!auth.user || !data) {
    return (
      <main className='auth-page'>
        <section className='panel auth-panel'>
          <span className='brand'>
            <Activity /> CareGrid
          </span>
          <span className='eyebrow'>NEXT-GEN HEALTHCARE AT HOME</span>
          <h1>{auth.configured ? 'Welcome back.' : 'Your care workspace starts here.'}</h1>
          <p>
            {auth.configured
              ? 'Sign in to your connected-care workspace.'
              : 'Create the first administrator account using only an email address and password.'}
          </p>
          {notice}
          <Form
            busy={busy}
            label={auth.configured ? 'Sign in' : 'Create administrator'}
            onSubmit={async (fields) => {
              setBusy(true);
              try {
                await api('auth', 'POST', {
                  ...fields,
                  action: auth.configured ? 'login' : 'setup',
                });
                await refresh();
                setMessage('');
                return true;
              } catch (error) {
                setMessage((error as Error).message);
                return false;
              } finally {
                setBusy(false);
              }
            }}
          >
            <Input name='email' label='Email' type='email' />
            <Input name='password' label='Password · at least 14 characters' type='password' />
          </Form>
          <p className='muted'>
            {auth.configured
              ? 'Accounts are managed by your workspace administrator.'
              : 'Keep your administrator password in a password manager.'}
          </p>
          <Link href='/demo/'>Explore the separate fictional demo</Link>
        </section>
      </main>
    );
  }

  const admin = data.user.role === 'admin';
  const personName = (id: string) => data.people.find((person) => person.id === id)?.name || id;
  const personOptions = (
    <>
      <option value=''>Choose a person</option>
      {data.people
        .filter((person) => person.active)
        .map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
    </>
  );
  const personSelect = (
    <label className='field'>
      Person
      <select name='personId' required>
        {personOptions}
      </select>
    </label>
  );
  const readings = personId
    ? data.readings.filter((reading) => reading.person_id === personId)
    : data.readings;

  function readingTable(rows: Reading[]) {
    if (!rows.length) {
      return (
        <div className='empty'>
          <Radio />
          <h3>No automatic readings yet</h3>
          <p>Enrol a device and configure its gateway or cloud connector to send readings.</p>
        </div>
      );
    }

    return (
      <div className='table-scroll'>
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Measurement</th>
              <th>Reading</th>
              <th>Measured · SAST</th>
              <th>Source device</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((reading) => (
              <tr key={reading.event_key}>
                <td>{personName(reading.person_id)}</td>
                <td>{reading.payload.measurement.kind}</td>
                <td>{readingValue(reading)}</td>
                <td>{date(reading.measured_at)}</td>
                <td>{reading.device_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function download() {
    const rows = [
      ['Person', 'Device', 'Measurement', 'Value', 'Measured at', 'Received at', 'Source event'],
      ...readings.map((reading) => [
        personName(reading.person_id),
        reading.device_id,
        reading.payload.measurement.kind,
        readingValue(reading),
        reading.measured_at,
        reading.received_at,
        reading.payload.sourceEventId,
      ]),
    ];

    const csv = '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'caregrid-readings.csv';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function signOut() {
    try {
      await api('auth', 'DELETE');
      setSecret(null);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className='shell'>
      <a className='skip' href='#main'>
        Skip to workspace
      </a>

      <aside className='sidebar'>
        <Link href='/' className='brand'>
          <span className='brand-mark'>
            <Activity />
          </span>
          Care<span>Grid</span>
        </Link>

        <p className='workspace-label'>HOMECLINICSTORE / CARE TEAM</p>

        <nav aria-label='Main navigation'>
          {navigation.map(([name, Icon]) => (
            <button
              key={name}
              aria-current={view === name ? 'page' : undefined}
              onClick={() => go(name)}
            >
              <Icon size={19} />
              <span>{name}</span>
            </button>
          ))}
        </nav>

        <div className='sidebar-note'>
          <ShieldCheck />
          <strong>Connected devices. Clear context.</strong>
          <p>Automatic readings, with the people behind them.</p>
        </div>

        <div className='team'>
          <div>
            <strong>{data.user.email}</strong>
            <small>{data.user.role}</small>
            <button className='text-button' onClick={() => void signOut()}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className='workspace'>
        <header className='topbar'>
          <span>CareGrid / {view}</span>
          <button
            className='text-button'
            onClick={() =>
              refresh()
                .then(() => setMessage('Workspace refreshed.'))
                .catch((error) => setMessage(error.message))
            }
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </header>

        <main id='main'>
          <div className='page-heading'>
            <div>
              <span className='eyebrow'>CONNECTED CARE AT HOME</span>
              <h1>
                {view === 'Overview'
                  ? 'A clearer view of care.'
                  : view === 'People'
                    ? 'People, not just readings.'
                    : view === 'Devices'
                      ? 'The connections behind care.'
                      : view === 'Tasks'
                        ? 'Follow-through, made visible.'
                        : view === 'Reports'
                          ? 'A shared view of progress.'
                          : view === 'Care plans'
                            ? 'Plans with a clear owner.'
                            : 'Your care workspace.'}
              </h1>
              <p>Stored workspace · South Africa · SAST (UTC+2)</p>
            </div>
          </div>

          {notice}

          {view === 'Overview' && (
            <>
              <div className='metrics'>
                <article>
                  <span>Active people</span>
                  <strong>{data.people.filter((person) => person.active).length}</strong>
                  <small>{new Set(data.people.map((person) => person.pillar)).size} clinical pathways represented</small>
                </article>
                <article>
                  <span>Enrolled devices</span>
                  <strong>{data.devices.filter((device) => device.enabled).length}</strong>
                  <small>Enrolment does not confirm connectivity</small>
                </article>
                <article>
                  <span>Open tasks</span>
                  <strong>{data.tasks.filter((task) => task.stage !== 'Completed').length}</strong>
                </article>
              </div>

              <section className='panel'>
                <div className='panel-heading'>
                  <div>
                    <span className='eyebrow'>CLINICAL FOUNDATION</span>
                    <h2>Four connected-care pillars</h2>
                  </div>
                </div>
                <div className='pillar-grid'>
                  {clinicalPillars.map(({ name, description }) => (
                    <article className='pillar-card' key={name}>
                      <span className='eyebrow'>{name}</span>
                      <strong>
                        {data.people.filter((person) => person.pillar === name && person.active).length} active
                      </strong>
                      <p>{description}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className='panel'>
                <h2>Latest automatic readings</h2>
                {readingTable(data.readings.slice(0, 10))}
              </section>

              <section className='panel context'>
                <h2>Set up your connected-care workflow</h2>
                <p>Create people, register an integration, then enrol devices using the identifiers your connector sends.</p>
                <div className='actions'>
                  <button className='secondary' onClick={() => go('People')}>
                    Manage people
                  </button>
                  <button className='secondary' onClick={() => go('Workspace')}>
                    Manage integrations
                  </button>
                  <button className='secondary' onClick={() => go('Devices')}>
                    Enrol devices
                  </button>
                </div>
              </section>
            </>
          )}

          {view === 'People' && (
            <>
              <section className='panel'>
                <div className='filters'>
                  <label className='field'>
                    Find a person
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder='Name, town or pathway'
                    />
                  </label>
                </div>

                {data.people
                  .filter((person) =>
                    `${person.name} ${person.town} ${person.pillar} ${person.programme}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((person) => (
                    <article className='live-row' key={person.id}>
                      <div>
                        <button className='text-button' onClick={() => setPersonId(person.id)}>
                          {person.name}
                        </button>
                        <p>
                          {person.town} · {person.pillar} · {person.programme} ·{' '}
                          {person.active ? 'Monitoring consent recorded' : 'Monitoring paused'}
                        </p>
                      </div>
                      {admin && (
                        <button
                          disabled={busy}
                          className='secondary'
                          onClick={() =>
                            void mutate({
                              action: 'person-status',
                              id: person.id,
                              active: !person.active,
                            })
                          }
                        >
                          {person.active ? 'Pause monitoring' : 'Resume monitoring'}
                        </button>
                      )}
                    </article>
                  ))}

                {!data.people.length && <p>No people enrolled yet.</p>}
              </section>

              {personId && (
                <section className='panel'>
                  <h2>{personName(personId)} · Readings</h2>
                  {readingTable(readings)}
                </section>
              )}

              {admin && (
                <section className='panel'>
                  <h2>Enrol a person</h2>
                  <p>Assign the connected-care pathway used to organise monitoring and follow-up. This classification does not make a diagnosis.</p>
                  <Form
                    busy={busy}
                    label='Save person'
                    onSubmit={(fields) =>
                      mutate({
                        ...fields,
                        action: 'person',
                        consent: fields.consent === 'on',
                      })
                    }
                  >
                    <Input name='name' label='Full name' />
                    <Input name='town' label='Town' />
                    <label className='field'>
                      Clinical pillar
                      <select name='pillar' defaultValue='Diabetes management'>
                        {clinicalPillars.map(({ name }) => (
                          <option key={name}>{name}</option>
                        ))}
                      </select>
                    </label>
                    <label className='field'>
                      Programme
                      <select name='programme' defaultValue='Glucose monitoring'>
                        <option>Glucose monitoring</option>
                        <option>Blood pressure</option>
                        <option>Heart-health monitoring</option>
                        <option>Risk-factor monitoring</option>
                      </select>
                    </label>
                    <label className='check-field'>
                      <input name='consent' type='checkbox' required /> Monitoring consent has been obtained and documented.
                    </label>
                  </Form>
                </section>
              )}
            </>
          )}

          {view === 'Devices' && (
            <>
              <div className='device-grid'>
                {data.devices.map((device) => {
                  const last = data.readings.find((reading) => reading.device_id === device.id);
                  return (
                    <article className='panel' key={device.id}>
                      <Radio />
                      <h2>{device.label}</h2>
                      <p>{personName(device.person_id)}</p>
                      <dl>
                        <div>
                          <dt>Identifier</dt>
                          <dd>{device.id}</dd>
                        </div>
                        <div>
                          <dt>Measurement</dt>
                          <dd>{device.kind}</dd>
                        </div>
                        <div>
                          <dt>Adapter</dt>
                          <dd>{device.adapter_id}</dd>
                        </div>
                        <div>
                          <dt>Ingestion</dt>
                          <dd>{device.enabled ? 'Enabled' : 'Paused'}</dd>
                        </div>
                        <div>
                          <dt>Latest received measurement</dt>
                          <dd>{last ? date(last.measured_at) : 'Awaiting first reading'}</dd>
                        </div>
                      </dl>
                      {admin && (
                        <button
                          className='secondary'
                          disabled={busy}
                          onClick={() =>
                            void mutate({
                              action: 'device-status',
                              id: device.id,
                              enabled: !device.enabled,
                            })
                          }
                        >
                          {device.enabled ? 'Pause device' : 'Enable device'}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>

              {!data.devices.length && (
                <section className='panel'>
                  <h2>No devices enrolled</h2>
                  <p>First add a person and an integration, then register the device below.</p>
                </section>
              )}

              {admin && (
                <section className='panel'>
                  <h2>Enrol a device</h2>
                  <p>Use the device identifier reported by the connector. Assignments are fixed to preserve reading history.</p>
                  <Form
                    busy={busy}
                    label='Enrol device'
                    onSubmit={(fields) => mutate({ ...fields, action: 'device' })}
                  >
                    <Input name='id' label='Connector device ID' />
                    <Input name='label' label='Device label' />
                    {personSelect}
                    <label className='field'>
                      Integration
                      <select name='adapterId' required>
                        <option value=''>Choose an integration</option>
                        {data.integrations
                          .filter((integration) => integration.enabled)
                          .map((integration) => (
                            <option key={integration.id} value={integration.id}>
                              {integration.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label className='field'>
                      Measurement
                      <select name='kind'>
                        <option value='blood-pressure'>Blood pressure</option>
                        <option value='glucose'>Glucose / CGM</option>
                        <option value='spo2'>SpO2</option>
                      </select>
                    </label>
                  </Form>
                </section>
              )}
            </>
          )}

          {view === 'Care plans' && (
            <LiveCarePlans
              plans={data.plans}
              reviews={data.planReviews}
              links={data.planTasks}
              people={data.people}
              users={data.users}
              busy={busy}
              mutate={mutate}
              openTasks={() => go('Tasks')}
            />
          )}

          {view === 'Tasks' && (
            <>
              <section className='panel'>
                <h2>Care-team follow-ups</h2>
                {data.tasks.length ? (
                  data.tasks.map((task) => (
                    <article className='live-row' key={task.id}>
                      <div>
                        <h3>{task.title}</h3>
                        <p>{personName(task.person_id)}</p>
                        <span className='badge'>{task.stage}</span>
                      </div>
                      <form
                        className='task-edit'
                        onSubmit={(event) => {
                          event.preventDefault();
                          void mutate({
                            ...Object.fromEntries(new FormData(event.currentTarget)),
                            action: 'task-update',
                            id: task.id,
                          });
                        }}
                      >
                        <label className='field'>
                          Owner
                          <select name='owner' defaultValue={task.owner || ''} key={`owner-${task.owner}`}>
                            <option value=''>Unassigned</option>
                            {data.users
                              .filter((user) => user.active)
                              .map((user) => (
                                <option value={user.id} key={user.id}>
                                  {user.email}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label className='field'>
                          Stage
                          <select name='stage' defaultValue={task.stage} key={`stage-${task.stage}`}>
                            <option>To do</option>
                            <option>In progress</option>
                            <option>Completed</option>
                          </select>
                        </label>
                        <button className='secondary' disabled={busy}>
                          Save task
                        </button>
                      </form>
                    </article>
                  ))
                ) : (
                  <p>No follow-up tasks yet.</p>
                )}
              </section>

              <section className='panel'>
                <h2>Create a follow-up</h2>
                <Form
                  busy={busy}
                  label='Create task'
                  onSubmit={(fields) => mutate({ ...fields, action: 'task' })}
                >
                  {personSelect}
                  <Input name='title' label='What needs to happen?' />
                </Form>
              </section>
            </>
          )}

          {view === 'Reports' && (
            <section className='panel'>
              <h2>Automatic reading history</h2>
              <p>Latest 500 stored readings, ordered by measurement time. Exported files contain personal information; share them only with authorised recipients.</p>
              <label className='field'>
                Filter by person
                <select value={personId} onChange={(event) => setPersonId(event.target.value)}>
                  <option value=''>All people</option>
                  {data.people.map((person) => (
                    <option value={person.id} key={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className='secondary' disabled={!readings.length} onClick={download}>
                Download readings CSV
              </button>
              {readingTable(readings)}
            </section>
          )}

          {view === 'Workspace' && (
            <>
              <section className='panel'>
                <h2>Automatic integrations</h2>
                <p>BP, glucose / CGM and SpO2 across supported device brands. Registration creates credentials; a compatible gateway or cloud connector must still be configured.</p>

                {secret && (
                  <div className='credential'>
                    <h3>Save this integration credential now</h3>
                    <p>Shown only in this session. Treat it like a password.</p>
                    <label className='field'>
                      Bearer token
                      <input readOnly value={secret.secret} />
                    </label>
                    <p>Adapter: {secret.adapterId}</p>
                    <button className='secondary' onClick={() => setSecret(null)}>
                      I have saved it · dismiss
                    </button>
                  </div>
                )}

                {data.integrations.map((integration) => (
                  <article className='live-row' key={integration.id}>
                    <div>
                      <h3>{integration.name}</h3>
                      <p>
                        {integration.id} · {integration.enabled ? 'Enabled' : 'Paused'}
                      </p>
                    </div>
                    {admin && (
                      <div className='actions'>
                        <button
                          className='secondary'
                          disabled={busy}
                          onClick={() =>
                            void mutate({
                              action: 'integration-update',
                              id: integration.id,
                              enabled: !integration.enabled,
                            })
                          }
                        >
                          {integration.enabled ? 'Pause' : 'Enable'}
                        </button>
                        <button
                          className='secondary'
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                'Replace this credential? The current connector will stop sending until updated.',
                              )
                            ) {
                              void mutate({
                                action: 'integration-update',
                                id: integration.id,
                                rotate: true,
                              });
                            }
                          }}
                        >
                          Rotate credential
                        </button>
                      </div>
                    )}
                  </article>
                ))}

                {admin && (
                  <Form
                    busy={busy}
                    label='Register integration'
                    onSubmit={(fields) => mutate({ ...fields, action: 'integration' })}
                  >
                    <Input name='name' label='Integration name' />
                    <Input name='id' label='Adapter ID · e.g. clinic-gateway-adapter' />
                  </Form>
                )}

                <details>
                  <summary>Connector instructions</summary>
                  <p>
                    Send JSON to <code>POST /api/readings/</code> with{' '}
                    <code>Authorization: Bearer YOUR_TOKEN</code> and{' '}
                    <code>X-CareGrid-Adapter: YOUR_ADAPTER_ID</code>. The source must match that adapter ID. Use an enrolled device ID and a unique event ID. Readings before enrolment are rejected.
                  </p>
                  <pre>
                    {JSON.stringify(
                      {
                        source: 'clinic-gateway-adapter',
                        sourceEventId: 'unique-event-id',
                        deviceId: 'enrolled-device-id',
                        measuredAt: 'ISO timestamp with timezone',
                        measurement: { kind: 'spo2', value: 98, unit: '%' },
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </section>

              {admin && (
                <>
                  <section className='panel'>
                    <h2>Team access</h2>

                    {recoveryLink && (
                      <div className='credential'>
                        <h3>One-time recovery link</h3>
                        <p>Expires in 30 minutes. Share through your approved secure channel. No email has been sent.</p>
                        <label className='field'>
                          Recovery link
                          <input readOnly value={recoveryLink} />
                        </label>
                        <button className='secondary' onClick={() => setRecoveryLink('')}>
                          Dismiss recovery link
                        </button>
                      </div>
                    )}

                    {data.users.map((user) => (
                      <div className='live-row' key={user.id}>
                        <p>
                          {user.email} · {user.role} · {user.active ? 'Active' : 'Disabled'}
                        </p>
                        {user.id !== data.user.id && (
                          <button
                            className='secondary'
                            disabled={busy}
                            onClick={() =>
                              void mutate({
                                action: 'user-status',
                                id: user.id,
                                active: !user.active,
                              })
                            }
                          >
                            {user.active ? 'Disable access' : 'Enable access'}
                          </button>
                        )}
                      </div>
                    ))}

                    <Form
                      busy={busy}
                      label='Create team account'
                      onSubmit={(fields) => mutate({ ...fields, action: 'user' })}
                    >
                      <Input name='email' label='Email' type='email' />
                      <Input name='password' label='Initial password · at least 14 characters' type='password' />
                      <label className='field'>
                        Role
                        <select name='role'>
                          <option value='reviewer'>Care reviewer</option>
                          <option value='admin'>Administrator</option>
                        </select>
                      </label>
                    </Form>

                    <details>
                      <summary>Recover a team member’s account</summary>
                      <Form
                        busy={busy}
                        label='Create recovery link'
                        onSubmit={(fields) => mutate({ ...fields, action: 'recovery' })}
                      >
                        <label className='field'>
                          Account
                          <select name='id' required>
                            <option value=''>Choose an account</option>
                            {data.users
                              .filter((user) => user.active && user.id !== data.user.id)
                              .map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.email}
                                </option>
                              ))}
                          </select>
                        </label>
                        <Input name='currentPassword' label='Your administrator password' type='password' />
                      </Form>
                    </details>

                    <p>No invitation email is sent. Share access details through your approved secure channel.</p>
                  </section>

                  <section className='panel'>
                    <h2>Audit history</h2>
                    <p>Latest 100 workspace events.</p>
                    <div className='table-scroll'>
                      <table>
                        <thead>
                          <tr>
                            <th>Time · SAST</th>
                            <th>Action</th>
                            <th>Actor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.audit.map((entry) => (
                            <tr key={entry.id}>
                              <td>{date(entry.at)}</td>
                              <td>{entry.action}</td>
                              <td>{data.users.find((user) => user.id === entry.actor)?.email || entry.actor}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}

              <section className='panel'>
                <h2>Change your password</h2>
                <Form
                  busy={busy}
                  label='Change password and sign out'
                  onSubmit={(fields) => mutate({ ...fields, action: 'password' })}
                >
                  <Input name='currentPassword' label='Current password' type='password' />
                  <Input name='password' label='New password' type='password' />
                </Form>
              </section>

              <section className='panel'>
                <h2>Service boundaries</h2>
                <p>CareGrid records device readings and care-team tasks. Clinical alert thresholds, patient messaging and emergency response are not configured. Device status reports ingestion settings and recorded timestamps; it does not confirm that a device is currently online.</p>
              </section>
            </>
          )}

          <footer className='footer'>
            <span>CareGrid by HomeClinicStore</span>
            <span>Automatic readings · People first.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
