import { validateAutomaticReading, type AutomaticReading } from '../ingestion/reading.ts';

export const adapterId = 'thingsboard-adapter';
export const telemetryKeys = ['systolic', 'diastolic', 'pulse', 'glucose_mmol_l', 'glucose_mg_dl', 'cgm_mmol_l', 'cgm_mg_dl', 'spo2', 'weight_kg', 'weight_lb', 'temperature_c', 'temperature_f'];
export const supportedKinds = ['blood-pressure', 'glucose', 'continuous-glucose', 'spo2', 'pulse', 'weight', 'temperature'] as const;
export type Kind = typeof supportedKinds[number];
export type Telemetry = { deviceId: string; ts: number; values: Record<string, unknown> };
export function normalizeTelemetry(input: unknown, kind: Kind): AutomaticReading {
  if (!input || typeof input !== 'object') throw new Error('Telemetry object is required.');
  const { deviceId, ts, values } = input as Telemetry;
  if (typeof deviceId !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(deviceId)) throw new Error('Use the ThingsBoard device UUID.');
  if (!Number.isSafeInteger(ts) || ts < 0 || ts > 8640000000000000) throw new Error('Measurement timestamp must be Unix milliseconds.');
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Telemetry values are required.');
  const number = (key: string): number => {
    const value = values[key];
    if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '' || !Number.isFinite(Number(value))) throw new Error(`Missing or invalid telemetry: ${key}.`);
    return Number(value);
  };
  const choose = (first: string, second: string) => {
    if (values[first] !== undefined && values[second] !== undefined) throw new Error('Send one explicit unit per measurement.');
    return values[first] !== undefined ? first : second;
  };
  let measurement: AutomaticReading['measurement'];
  if (kind === 'blood-pressure') measurement = { kind, systolic: number('systolic'), diastolic: number('diastolic'), unit: 'mmHg', ...(values.pulse === undefined ? {} : { pulse: number('pulse') }) };
  else if (kind === 'glucose' || kind === 'continuous-glucose') {
    const prefix = kind === 'glucose' ? 'glucose' : 'cgm';
    const key = choose(`${prefix}_mmol_l`, `${prefix}_mg_dl`);
    measurement = { kind, value: number(key), unit: key.endsWith('mmol_l') ? 'mmol/L' : 'mg/dL' };
  } else if (kind === 'spo2') measurement = { kind, value: number('spo2'), unit: '%', ...(values.pulse === undefined ? {} : { pulse: number('pulse') }) };
  else if (kind === 'pulse') measurement = { kind, value: number('pulse'), unit: 'bpm' };
  else if (kind === 'weight') { const key = choose('weight_kg', 'weight_lb'); measurement = { kind, value: number(key), unit: key.endsWith('kg') ? 'kg' : 'lb' }; }
  else if (kind === 'temperature') { const key = choose('temperature_c', 'temperature_f'); measurement = { kind, value: number(key), unit: key.endsWith('_c') ? '°C' : '°F' }; }
  else throw new Error('Unsupported ThingsBoard measurement.');
  const result = validateAutomaticReading({ source: adapterId, sourceEventId: `${kind}:${ts}`, deviceId, measuredAt: new Date(ts).toISOString(), measurement });
  if (!result.ok) throw new Error(result.reason);
  return result.reading;
}

/** Pair measurements only at identical timestamps; never combine unrelated BP values. */
export function telemetryFrames(deviceId: string, data: Record<string, { ts: number; value: unknown }[]>): Telemetry[] {
  const frames = new Map<number, Record<string, unknown>>();
  for (const key of telemetryKeys) for (const point of data[key] || []) {
    const values = frames.get(point.ts) || {}; values[key] = point.value; frames.set(point.ts, values);
  }
  return [...frames].sort(([a], [b]) => a - b).map(([ts, values]) => ({ deviceId, ts, values }));
}
