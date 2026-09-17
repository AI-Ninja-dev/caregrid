/** Brand-independent CareGrid contract. Validation alone does not authenticate a sender. */
export type AutomaticReading = {
 source: string; sourceEventId: string; deviceId: string; measuredAt: string;
 measurement: {kind:'blood-pressure';systolic:number;diastolic:number;unit:'mmHg';pulse?:number} |
 {kind:'glucose';value:number;unit:'mmol/L'|'mg/dL'} |
 {kind:'spo2';value:number;unit:'%';pulse?:number} |
 {kind:'weight';value:number;unit:'kg'};
};
export type ReadingResult={ok:true;reading:AutomaticReading}|{ok:false;reason:string};
function validTimestamp(value: unknown): value is string {
 if (typeof value !== 'string') return false;
 const parts = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d{1,3})?(Z|([+-])(\d\d):(\d\d))$/.exec(value);
 if (!parts) return false;
 const [, year, month, day, hour, minute, second, zone, , offsetHour, offsetMinute] = parts;
 const days = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
 return Number(year) >= 1970 && Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= days
  && Number(hour) <= 23 && Number(minute) <= 59 && Number(second) <= 59
  && (zone === 'Z' || (Number(offsetHour) <= 14 && Number(offsetMinute) <= 59 && (Number(offsetHour) < 14 || Number(offsetMinute) === 0)))
  && Number.isFinite(Date.parse(value));
}
export function validateAutomaticReading(input:unknown):ReadingResult{
 const fail=(reason:string):ReadingResult=>({ok:false,reason});
 if(!input||typeof input!=='object')return fail('A reading object is required.');
 const data=input as Record<string,unknown>;
 if(typeof data.source!=='string'||! /^[a-z0-9]+(?:-[a-z0-9]+)*-adapter$/.test(data.source)||data.source.length>100)return fail('A named automatic adapter source is required.');
 for(const key of ['sourceEventId','deviceId'])if(typeof data[key]!=='string'||!data[key].trim()||data[key].length>200)return fail(`${key} is required and must be at most 200 characters.`);
 if(!validTimestamp(data.measuredAt))return fail('A valid timestamp with a timezone is required.');
 if(!data.measurement||typeof data.measurement!=='object')return fail('Measurement is required.');
 const m=data.measurement as Record<string,unknown>;
 const numeric=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
 if(m.pulse!==undefined&&!numeric(m.pulse))return fail('Pulse must be a non-negative finite number.');
 if(m.kind==='blood-pressure'){
  if(m.unit!=='mmHg'||!numeric(m.systolic)||!numeric(m.diastolic))return fail('Blood pressure requires systolic and diastolic values in mmHg.');
 }else if(m.kind==='glucose'){
  if(!['mmol/L','mg/dL'].includes(String(m.unit))||!numeric(m.value))return fail('Glucose requires a value and an explicit supported unit.');
 }else if(m.kind==='spo2'){
  if(m.unit!=='%'||!numeric(m.value)||(m.value as number)>100)return fail('SpO2 must be a percentage from 0 to 100.');
 }else if(m.kind==='weight'){
  if(m.unit!=='kg'||!numeric(m.value)||(m.value as number)>500)return fail('Weight must be a value in kilograms from 0 to 500.');
 }else return fail('Unsupported measurement kind.');
 // Structure validation is not authentication, device verification or clinical interpretation.
 const measurement: AutomaticReading['measurement'] = m.kind === 'blood-pressure'
  ? {kind:'blood-pressure',systolic:m.systolic as number,diastolic:m.diastolic as number,unit:'mmHg',...(m.pulse===undefined?{}:{pulse:m.pulse as number})}
  : m.kind === 'glucose'
  ? {kind:'glucose',value:m.value as number,unit:m.unit as 'mmol/L'|'mg/dL'}
  : m.kind === 'spo2'
  ? {kind:'spo2',value:m.value as number,unit:'%',...(m.pulse===undefined?{}:{pulse:m.pulse as number})}
  : {kind:'weight',value:m.value as number,unit:'kg'};
 return {ok:true,reading:{source:data.source,sourceEventId:data.sourceEventId as string,deviceId:data.deviceId as string,measuredAt:data.measuredAt,measurement}};
}
export function readingIdentity(reading:AutomaticReading):string{return JSON.stringify([reading.source,reading.deviceId,reading.sourceEventId]);}
