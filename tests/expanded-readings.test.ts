import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAutomaticReading } from '../lib/ingestion/reading.ts';

const base={source:'test-adapter',sourceEventId:'evt-1',deviceId:'dev-1',measuredAt:'2026-09-17T14:00:00+02:00'};
const accepted=[
 {kind:'continuous-glucose',value:6.2,unit:'mmol/L'},
 {kind:'weight',value:76.4,unit:'kg'},
 {kind:'temperature',value:36.8,unit:'°C'},
 {kind:'pulse',value:72,unit:'bpm'},
 {kind:'spirometry',value:3.1,unit:'L',metric:'FEV1'},
 {kind:'ecg',value:70,unit:'bpm',rhythm:'device-summary'},
 {kind:'medication-adherence',value:100,unit:'%'},
 {kind:'activity-adherence',value:85,unit:'%'}
];

test('expanded automatic measurement kinds validate',()=>{
  for(const measurement of accepted){
    const result=validateAutomaticReading({...base,sourceEventId:`evt-${measurement.kind}`,measurement});
    assert.equal(result.ok,true,measurement.kind);
  }
});

test('percentage measurements reject impossible values',()=>{
  const result=validateAutomaticReading({...base,measurement:{kind:'medication-adherence',value:120,unit:'%'}});
  assert.equal(result.ok,false);
});
