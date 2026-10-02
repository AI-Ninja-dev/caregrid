import { store } from '../lib/server/live-store.ts';
import { ThingsBoardClient } from '../lib/thingsboard/client.ts';
import { syncThingsBoard } from '../lib/thingsboard/sync.ts';
const required = (key: string) => { const value = process.env[key]; if (!value) throw new Error(`Set ${key} on the server.`); return value; };
try {
  const client = new ThingsBoardClient({ url: required('THINGSBOARD_URL'), username: required('THINGSBOARD_USERNAME'), password: required('THINGSBOARD_PASSWORD') });
  const result = await syncThingsBoard(store(), client, required('CAREGRID_THINGSBOARD_SECRET'), Number(process.env.THINGSBOARD_SYNC_HOURS || 24));
  console.log(JSON.stringify(result));
  if (result.errors.length) process.exitCode = 1;
} catch (error) { console.error((error as Error).message); process.exitCode = 1; }
