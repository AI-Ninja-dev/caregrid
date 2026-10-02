// Paste into a ThingsBoard JavaScript Script Transformation node.
// First enrich metadata with server attribute caregridDeviceId (ss_ prefix).
// This branch must receive only POST_TELEMETRY_REQUEST messages.
if (msgType !== 'POST_TELEMETRY_REQUEST') throw new Error('Telemetry messages only.');
if (!metadata.ss_caregridDeviceId || !metadata.ts) throw new Error('Missing trusted device mapping or timestamp.');
return {
  msg: { deviceId: metadata.ss_caregridDeviceId, ts: Number(metadata.ts), values: msg },
  metadata: metadata,
  msgType: msgType
};
