import {createBackup} from '../lib/server/backup.ts';
const destination=process.argv[2]||'data/backups';
try{const path=await createBackup(process.env.CAREGRID_DB_PATH||'data/caregrid.sqlite',destination);console.log(`Verified database backup: ${path}`);}
catch(error){console.error(error instanceof Error?error.message:'Backup failed.');process.exitCode=1;}
