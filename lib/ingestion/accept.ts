import { validateAutomaticReading, readingIdentity, type AutomaticReading } from './reading.ts';

/** Supplied by the trusted server after authentication, never from request JSON. */
export type IntegrationContext = {
  organisationId: string;
  adapterId: string;
  enabled: boolean;
  devices: readonly { deviceId: string; personId: string; kinds: readonly AutomaticReading['measurement']['kind'][] }[];
};

export type Acceptance =
  | { ok: false; reason: string }
  | { ok: true; organisationId: string; personId: string; key: string; reading: AutomaticReading };

/** Pure acceptance gate. The caller must persist key uniquely in a database transaction. */
export function acceptAutomaticReading(input: unknown, context: IntegrationContext): Acceptance {
  if (!context.enabled || !context.organisationId.trim()) return { ok: false, reason: 'Integration is inactive.' };
  const result = validateAutomaticReading(input);
  if (!result.ok) return result;
  const { reading } = result;
  if (reading.source !== context.adapterId) return { ok: false, reason: 'Source does not match the authenticated integration.' };
  const assignments = context.devices.filter(device => device.deviceId === reading.deviceId);
  if (assignments.length !== 1 || !assignments[0].personId.trim()) return { ok: false, reason: 'Device needs one active person assignment.' };
  if (!assignments[0].kinds.includes(reading.measurement.kind)) return { ok: false, reason: 'Measurement is not enabled for this device.' };
  return { ok: true, organisationId: context.organisationId, personId: assignments[0].personId,
    key: JSON.stringify([context.organisationId, readingIdentity(reading)]), reading };
}
