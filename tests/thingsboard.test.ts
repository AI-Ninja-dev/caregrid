import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from '../lib/server/store.ts';
import { normalizeTelemetry, telemetryFrames } from '../lib/thingsboard/telemetry.ts';
import { ingestThingsBoard } from '../lib/thingsboard/bridge.ts';
import { ingestAlarm } from '../lib/thingsboard/alarms.ts';
import { ThingsBoardClient } from '../lib/thingsboard/client.ts';
import { syncThingsBoard } from '../lib/thingsboard/sync.ts';
const deviceId='11111111-1111-1111-1111-111111111111';
function fixture(kind='blood-pressure') {
  const s=new Store(':memory:');const user=s.setup('tb@example.test','thingsboard-test-password');s.mutate(user,{action:'person',name:'Test patient',town:'Cape Town',consent:true});const person=s.snapshot(user).people[0];
  const integration=s.mutate(user,{action:'integration',id:'thingsboard-adapter',name:'ThingsBoard'});
  s.mutate(user,{action:'device',id:deviceId,label:'Home device',personId:person.id,adapterId:'thingsboard-adapter',kind});
  return {s,user,person,secret:String(integration.secret),frame:{deviceId,ts:Date.now(),values:{systolic:123,diastolic:81,pulse:70}}};
}
test('ThingsBoard readings authenticate, preserve identity, deduplicate and reject changed replay',()=>{
  const {s,secret,frame,user}=fixture();try {
    assert.throws(()=>ingestThingsBoard(s,'wrong',frame));assert.equal(ingestThingsBoard(s,secret,frame).duplicate,false);assert.equal(ingestThingsBoard(s,secret,frame).duplicate,true);
    assert.throws(()=>ingestThingsBoard(s,secret,{...frame,values:{...frame.values,systolic:124}}));assert.equal(s.snapshot(user).readings.length,1);
  }finally{s.db.close();}
});
test('disabled assignments, integrations and inactive patients block ThingsBoard ingestion',()=>{
  const {s,secret,frame,user,person}=fixture();try{
    s.mutate(user,{action:'person-status',id:person.id,active:false});assert.throws(()=>ingestThingsBoard(s,secret,frame));s.mutate(user,{action:'person-status',id:person.id,active:true});
    s.mutate(user,{action:'device-status',id:deviceId,enabled:false});assert.throws(()=>ingestThingsBoard(s,secret,frame));s.mutate(user,{action:'device-status',id:deviceId,enabled:true});
    s.mutate(user,{action:'integration-update',id:'thingsboard-adapter',enabled:false});assert.throws(()=>ingestThingsBoard(s,secret,frame));
  }finally{s.db.close();}
});
test('unit keys are explicit, invalid numbers fail and all supported metrics normalize',()=>{
  const frame={deviceId,ts:Date.now(),values:{glucose_mg_dl:'110'}};
  assert.equal(normalizeTelemetry(frame,'glucose').measurement.unit,'mg/dL');
  assert.throws(()=>normalizeTelemetry({...frame,values:{glucose:5.7}},'glucose'));
  assert.throws(()=>normalizeTelemetry({...frame,values:{glucose_mg_dl:110,glucose_mmol_l:6.1}},'glucose'));
  assert.throws(()=>normalizeTelemetry({...frame,values:{glucose_mg_dl:' '}},'glucose'));
  for(const [kind,values] of [['continuous-glucose',{cgm_mmol_l:6}],['weight',{weight_kg:76}],['pulse',{pulse:70}],['temperature',{temperature_c:36.5}],['spo2',{spo2:98}]] as const)assert.equal(normalizeTelemetry({...frame,values},kind).measurement.kind,kind);
  assert.throws(()=>normalizeTelemetry({...frame,ts:Infinity},'glucose'));
});
test('time series never pair BP measurements across timestamps',()=>{
  const frames=telemetryFrames(deviceId,{systolic:[{ts:1000,value:'120'}],diastolic:[{ts:2000,value:'80'}]});assert.equal(frames.length,2);assert.throws(()=>normalizeTelemetry(frames[0],'blood-pressure'));
});
test('ThingsBoard REST client reauthenticates once and sends credentials only to configured origin',async()=>{
  const calls:{url:string;init?:RequestInit}[]=[];let gets=0;
  const transport=(async(url,init)=>{calls.push({url:String(url),init});return String(url).endsWith('/login')?Response.json({token:'test-token'}):++gets===1?new Response('',{status:401}):Response.json({systolic:[{ts:1001,value:'120'}]});}) as typeof fetch;
  const client=new ThingsBoardClient({url:'https://tb.example.test',username:'service',password:'secret'},transport);
  await client.readings(deviceId,1000,2000);assert.equal(calls.length,4);assert.ok(calls.every(call=>call.url.startsWith('https://tb.example.test/')));assert.equal(calls[1].init?.redirect,'error');assert.ok(!calls[1].url.includes('secret'));
  assert.throws(()=>new ThingsBoardClient({url:'http://tb.example.test',username:'u',password:'p'}));
});
test('REST sync persists readings for existing patient assignments and replays safely',async()=>{
  const {s,user,secret,frame}=fixture();try {
    const transport=(async(url)=>String(url).endsWith('/login')?Response.json({token:'test'}):Response.json({systolic:[{ts:frame.ts,value:'123'}],diastolic:[{ts:frame.ts,value:'81'}],pulse:[{ts:frame.ts,value:'70'}]})) as typeof fetch;
    const client=new ThingsBoardClient({url:'https://tb.example.test',username:'service',password:'secret'},transport);
    assert.equal((await syncThingsBoard(s,client,secret)).accepted,1);assert.equal((await syncThingsBoard(s,client,secret)).duplicates,1);assert.equal(s.snapshot(user).readings.length,1);
  }finally{s.db.close();}
});
test('source alarms reject wrong credentials and stale/conflicting updates without changing patient assignment',()=>{
  const {s,secret,frame}=fixture();try{
    const alarm={alarmId:'22222222-2222-2222-2222-222222222222',deviceId,type:'Device offline',severity:'WARNING',status:'ACTIVE_UNACK',updatedTs:frame.ts};
    assert.throws(()=>ingestAlarm(s,'wrong',alarm));assert.equal(ingestAlarm(s,secret,alarm).duplicate,false);assert.equal(ingestAlarm(s,secret,alarm).duplicate,true);
    assert.throws(()=>ingestAlarm(s,secret,{...alarm,severity:'MAJOR'}));
    ingestAlarm(s,secret,{...alarm,status:'CLEARED_ACK',updatedTs:frame.ts+1});assert.equal(ingestAlarm(s,secret,alarm).stale,true);
    assert.equal(s.db.prepare('SELECT status FROM thingsboard_alarms').get()?.status,'CLEARED_ACK');
  }finally{s.db.close();}
});
