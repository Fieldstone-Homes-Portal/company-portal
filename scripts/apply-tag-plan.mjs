// Explicit one-time operator command; never runs during app startup.
// DATABASE_URL selects the target database. TAG_BACKUP_PATH is required.
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
const plan = JSON.parse(fs.readFileSync(new URL('./tag-plan-20260914.json', import.meta.url), 'utf8'));
const db = new PrismaClient();
const slug = label => label.toLowerCase().replace(/&/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
async function main() {
  if (!process.env.DATABASE_URL || !process.env.TAG_BACKUP_PATH) throw new Error('DATABASE_URL and TAG_BACKUP_PATH required');
  const select = { id:true, name:true, isActive:true, allStaff:true, url:true, departments:{select:{id:true}}, grants:{select:{userId:true}}, tags:{select:{id:true,name:true,displayName:true}} };
  const before = await db.portalApp.findMany({where:{id:{in:plan.map(x=>x.id)}},select});
  if (before.length !== plan.length || plan.some(x=>!before.some(a=>a.id===x.id && a.name.trim()===x.name))) throw new Error('Catalogue changed; inspect before applying');
  fs.mkdirSync(path.dirname(process.env.TAG_BACKUP_PATH), { recursive:true });
  fs.writeFileSync(process.env.TAG_BACKUP_PATH, JSON.stringify(before.map(({id,name,tags})=>({id,name,tags})),null,2), {mode:0o600,flag:'wx'});
  await db.$transaction(async tx => {
    const tags = new Map();
    for (const label of new Set(plan.flatMap(x=>x.tags))) {
      const tag = await tx.tag.upsert({where:{name:slug(label)},create:{name:slug(label),displayName:label,sortOrder:['IT','Office & Facilities','Leadership'].includes(label)?9:20},update:{}});
      tags.set(label,tag.id);
    }
    for (const app of plan) await tx.portalApp.update({where:{id:app.id},data:{tags:{set:app.tags.map(t=>({id:tags.get(t)}))}}});
  },{timeout:30000});
  const after = await db.portalApp.findMany({where:{id:{in:plan.map(x=>x.id)}},select});
  for (const item of plan) {
    const a = after.find(x=>x.id===item.id); const b = before.find(x=>x.id===item.id);
    if (JSON.stringify(a.tags.map(x=>x.displayName).sort()) !== JSON.stringify([...item.tags].sort())) throw new Error('Tag verification failed');
    for (const k of ['isActive','allStaff','url']) if(a[k]!==b[k]) throw new Error('Unexpected policy change');
    for (const [key,field] of [['departments','id'],['grants','userId']]) if(JSON.stringify(a[key].map(x=>x[field]).sort())!==JSON.stringify(b[key].map(x=>x[field]).sort())) throw new Error('Unexpected grants change');
  }
  console.log('Verified approved tags on 20 apps; URLs, active flags and access policies preserved.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
