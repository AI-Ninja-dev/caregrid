import {backup,DatabaseSync} from 'node:sqlite';
import {existsSync,mkdirSync,mkdtempSync,renameSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';

/** Operator-only online backup. Uses a unique directory and never overwrites a prior backup. */
export async function createBackup(source:string,destination:string){
 const sourcePath=resolve(source),root=resolve(destination);
 if(!existsSync(sourcePath))throw new Error('Source database does not exist.');
 mkdirSync(root,{recursive:true});
 const directory=mkdtempSync(join(root,'caregrid-'));
 const partial=join(directory,'incomplete.sqlite'),target=join(directory,'workspace.sqlite');
 const db=new DatabaseSync(sourcePath,{readOnly:true});
 try{await backup(db,partial);}finally{db.close();}
 const check=new DatabaseSync(partial,{readOnly:true});
 try{
  const integrity=check.prepare('PRAGMA integrity_check').all();
  if(integrity.length!==1||Object.values(integrity[0])[0]!=='ok')throw new Error('Backup failed integrity validation. The incomplete file was retained for investigation.');
 }finally{check.close();}
 renameSync(partial,target);
 writeFileSync(join(directory,'manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),sha256:createHash('sha256').update(readFileSync(target)).digest('hex'),file:'workspace.sqlite'},null,2));
 return target;
}
