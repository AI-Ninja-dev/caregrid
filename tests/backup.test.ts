import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createBackup} from '../lib/server/backup.ts';
import {Store} from '../lib/server/store.ts';
test('online backup restores accounts and records without changing the running store',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'caregrid-backup-test-'));
 const source=join(directory,'source.sqlite');const live=new Store(source);
 try{
  const user=live.setup('backup@example.test','backup-test-password');
  live.mutate(user,{action:'person',name:'Backup Test',town:'Cape Town',consent:true});
  const target=await createBackup(source,join(directory,'backups'));
  const restored=new Store(target);
  try{assert.equal(restored.snapshot(user).people[0].name,'Backup Test');assert.ok(restored.login(user.email,'backup-test-password'));}finally{restored.db.close();}
  assert.equal(live.snapshot(user).people.length,1);
  assert.notEqual(await createBackup(source,join(directory,'backups')),target);
  await assert.rejects(createBackup(join(directory,'missing.sqlite'),join(directory,'backups')));
 }finally{live.db.close();rmSync(directory,{recursive:true,force:true});}
});
