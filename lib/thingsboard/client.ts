import { telemetryKeys } from './telemetry.ts';

export class ThingsBoardClient {
  private token = '';
  private base: string;
  private config: { url: string; username: string; password: string };
  private transport: typeof fetch;
  constructor(config: { url: string; username: string; password: string }, transport: typeof fetch = fetch) {
    this.config = config; this.transport = transport;
    const url = new URL(config.url);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('ThingsBoard URL must be an origin without credentials.');
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('Use HTTPS for ThingsBoard (HTTP is allowed only on loopback).');
    this.base = url.origin;
  }
  private async login() {
    const response = await this.transport(`${this.base}/api/auth/login`, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: this.config.username, password: this.config.password }) });
    if (!response.ok) throw new Error(`ThingsBoard authentication failed (${response.status}).`);
    const data = await response.json();
    if (typeof data.token !== 'string' || !data.token) throw new Error('ThingsBoard did not return a token.');
    this.token = data.token;
  }
  private async get(path: string, retry = true): Promise<unknown> {
    if (!this.token) await this.login();
    const response = await this.transport(`${this.base}${path}`, { redirect: 'error', signal: AbortSignal.timeout(15000), headers: { 'X-Authorization': `Bearer ${this.token}` } });
    if (response.status === 401 && retry) { this.token = ''; return this.get(path, false); }
    if (!response.ok) throw new Error(`ThingsBoard request failed (${response.status}).`);
    return response.json();
  }
  async readings(deviceId: string, startTs: number, endTs: number) {
    const query = new URLSearchParams({ keys: telemetryKeys.join(','), startTs: String(startTs), endTs: String(endTs), limit: '10000', agg: 'NONE', orderBy: 'ASC' });
    const data = await this.get(`/api/plugins/telemetry/DEVICE/${encodeURIComponent(deviceId)}/values/timeseries?${query}`);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid ThingsBoard telemetry response.');
    const rows = data as Record<string, { ts: number; value: unknown }[]>;
    for (const key of telemetryKeys) {
      if (rows[key] !== undefined && (!Array.isArray(rows[key]) || rows[key].some(point => !point || !Number.isSafeInteger(point.ts) || point.ts < startTs || point.ts > endTs))) throw new Error('Invalid ThingsBoard time series.');
      if ((rows[key]?.length || 0) >= 10000) throw new Error('Telemetry page may be truncated. Use a smaller sync window.');
    }
    return rows;
  }
}
