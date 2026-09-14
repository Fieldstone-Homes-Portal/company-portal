// Operator-run registration; existing applications and staff policies are preserved.
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const facilitiesUrl = process.env.CORNERSTONE_PREVIEW === '1' ? 'http://127.0.0.1:3110/facilities' : 'https://request-center-production.up.railway.app/facilities';
const managers = ['tonyal@fieldstonehomes.com','tim@fieldstonehomes.com','skyler@fieldstonehomes.com'];
const definitions = [
  {id:'facilities-management',name:'Facilities Management',url:facilitiesUrl,description:'Track office maintenance and repairs, assign owners, and follow requests through completion.',isActive:true,icon:'Building2',tags:['office-facilities','tool'],emails:managers},
  {id:'ice-dashboard',name:'ICE Dashboard',url:'https://ice-dashboard-production.up.railway.app',description:'ICE dashboard. Retained app available to Tim.',isActive:false,icon:'BarChart3',tags:['reports'],emails:[managers[1]]},
  {id:'plat-studio-original',name:'Plat Studio (Original)',url:'https://plat-studio-production.up.railway.app',description:'Original Plat Studio mapping app, retained alongside the current Map Tool.',isActive:false,icon:'Map',tags:['construction'],emails:[managers[1]]},
  {id:'marketing-preferences',name:'Marketing Preferences',url:'https://optout.fieldstonehomes.com',description:'Customer text and email opt-in / opt-out form.',isActive:false,icon:'Mail',tags:['marketing'],emails:[managers[1]]},
];
try {
  await db.$transaction(async tx => {
    const users = await tx.user.findMany({where:{email:{in:managers,mode:'insensitive'}},select:{id:true,email:true}});
    for (const email of managers) if (!users.some(u=>u.email.toLowerCase()===email)) throw new Error(`Missing manager: ${email}`);
    for (const item of definitions) {
      const existing = await tx.portalApp.findFirst({where:{OR:[{id:item.id},{url:item.url},{name:item.name}]}});
      if (existing) {
        if(existing.id!==item.id || existing.url!==item.url) throw new Error(`Existing app requires review: ${item.name}`);
        console.log(`Already registered: ${item.name}`); continue;
      }
      const tags = await tx.tag.findMany({where:{name:{in:item.tags}},select:{id:true}});
      await tx.portalApp.create({data:{id:item.id,name:item.name,url:item.url,description:item.description,icon:item.icon,isActive:item.isActive,allStaff:false,stage:'DEPLOYED',tags:{connect:tags},grants:{create:users.filter(u=>item.emails.includes(u.email.toLowerCase())).map(u=>({userId:u.id,grantedBy:'tim@fieldstonehomes.com'}))}}});
      console.log(`Registered: ${item.name}`);
    }
  });
} finally {await db.$disconnect();}
