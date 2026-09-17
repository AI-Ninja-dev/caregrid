import type { AutomaticReading } from '../../lib/ingestion/reading';
import { buildTrendSeries } from '../../lib/trends';

type Reading = {
  measured_at: string;
  payload: AutomaticReading;
};

function TrendChart({ label, unit, points }: { label: string; unit: string; points: { measuredAt: string; value: number }[] }) {
  const width = 460;
  const height = 150;
  const padX = 18;
  const padY = 18;
  const values = points.map(point => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const usableWidth = width - padX * 2;
  const usableHeight = height - padY * 2;
  const coordinates = points.map((point, index) => ({
    x: points.length === 1 ? width / 2 : padX + (index / (points.length - 1)) * usableWidth,
    y: padY + ((max - point.value) / range) * usableHeight,
  }));
  const polyline = coordinates.map(point => `${point.x},${point.y}`).join(' ');
  const latest = points.at(-1)!;

  return <article className="reading-trend-card">
    <div className="panel-heading">
      <div><span className="eyebrow">STORED MEASUREMENTS</span><h3>{label}</h3></div>
      <strong>{latest.value} <small>{unit}</small></strong>
    </div>
    <svg className="reading-trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} stored measurement trend with ${points.length} points in ${unit}`}>
      <path d={`M${padX} ${padY}H${width-padX}M${padX} ${height/2}H${width-padX}M${padX} ${height-padY}H${width-padX}`} className="trend-grid"/>
      {points.length > 1 && <polyline points={polyline} className="trend-line"/>}
      {coordinates.map((point, index) => <circle key={`${points[index].measuredAt}-${index}`} cx={point.x} cy={point.y} r="3.5" className="trend-point"/>)}
    </svg>
    <div className="trend-meta"><span>{points.length} stored point{points.length === 1 ? '' : 's'}</span><span>{new Intl.DateTimeFormat('en-ZA',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Johannesburg'}).format(new Date(latest.measuredAt))} SAST</span></div>
  </article>;
}

export default function ReadingTrends({ readings }: { readings: Reading[] }) {
  const series = buildTrendSeries(readings);
  if (!series.length) return null;
  return <section className="panel context">
    <div className="panel-heading"><div><span className="eyebrow">LONGITUDINAL VIEW</span><h2>Stored measurement trends</h2></div><span className="badge">Last 30 readings</span></div>
    <p className="muted">Charts show stored device measurements over time. CareGrid does not apply clinical thresholds or interpret these values in this view.</p>
    <div className="reading-trends">{series.map(item => <TrendChart key={item.id} label={item.label} unit={item.unit} points={item.points}/>)}</div>
  </section>;
}
