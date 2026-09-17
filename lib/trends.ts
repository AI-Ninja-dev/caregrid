import type { AutomaticReading } from './ingestion/reading.ts';

export type TrendPoint = { measuredAt: string; value: number };
export type TrendSeries = {
  id: string;
  label: string;
  unit: string;
  points: TrendPoint[];
};

type StoredReading = {
  measured_at: string;
  payload: AutomaticReading;
};

/** Builds display series only. No thresholds, clinical labels or risk interpretation are applied. */
export function buildTrendSeries(readings: readonly StoredReading[], limit = 30): TrendSeries[] {
  if (!Number.isInteger(limit) || limit < 2 || limit > 500) throw new Error('Trend limit must be an integer from 2 to 500.');
  const ordered = [...readings]
    .filter(reading => Number.isFinite(Date.parse(reading.measured_at)))
    .sort((a, b) => Date.parse(a.measured_at) - Date.parse(b.measured_at))
    .slice(-limit);

  const series = new Map<string, TrendSeries>();
  const append = (id: string, label: string, unit: string, point: TrendPoint) => {
    const current = series.get(id) ?? { id, label, unit, points: [] };
    current.points.push(point);
    series.set(id, current);
  };

  for (const reading of ordered) {
    const measurement = reading.payload.measurement;
    if (measurement.kind === 'blood-pressure') {
      append('blood-pressure-systolic', 'Blood pressure · systolic', measurement.unit, { measuredAt: reading.measured_at, value: measurement.systolic });
      append('blood-pressure-diastolic', 'Blood pressure · diastolic', measurement.unit, { measuredAt: reading.measured_at, value: measurement.diastolic });
      if (measurement.pulse !== undefined) append('blood-pressure-pulse', 'Blood pressure · pulse', 'bpm', { measuredAt: reading.measured_at, value: measurement.pulse });
      continue;
    }
    if (measurement.kind === 'glucose') {
      append('glucose', 'Glucose', measurement.unit, { measuredAt: reading.measured_at, value: measurement.value });
      continue;
    }
    append('spo2', 'SpO2', measurement.unit, { measuredAt: reading.measured_at, value: measurement.value });
    if (measurement.pulse !== undefined) append('spo2-pulse', 'SpO2 · pulse', 'bpm', { measuredAt: reading.measured_at, value: measurement.pulse });
  }

  return [...series.values()];
}
