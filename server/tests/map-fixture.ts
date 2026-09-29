import { prisma } from '../src/db.js';
import bcrypt from 'bcrypt';
if (!process.env.DATABASE_URL?.includes('moscollector_acceptance')) throw new Error('Isolated acceptance database required');
async function main() {
 const password = await bcrypt.hash('fixture-map-only', 10);
 await prisma.user.upsert({ where: { email: 'map-fixture@test.local' }, create: { email: 'map-fixture@test.local', name: 'Map acceptance fixture', password, role: 'DISPATCHER' }, update: { password } });
 const count=3000; const base=1800000000; const stamp=new Date();
 for (let offset=0;offset<count;offset+=500) {
  const rows=Array.from({length:Math.min(500,count-offset)},(_,i)=>({id:base+offset+i,level:1,objectKind:'fixture',dispatcherName:`TEST Map ${offset+i}`,address:`Test address ${offset+i}`,latitude:55.65+((offset+i)%60)*.003,longitude:37.4+Math.floor((offset+i)/60)*.005}));
  await prisma.systemObject.createMany({data:rows,skipDuplicates:true});
  await prisma.sensorChannel.createMany({data:rows.map(v=>({id:v.id,systemObjectId:v.id,sensorName:'Fixture pump',systemTag:`MAP-${v.id}`,systemType:'water',sensorType:'pressure'})),skipDuplicates:true});
  await prisma.forecast.createMany({data:rows.map(v=>({systemObjectId:v.id,evaluatedAt:stamp,probability:v.id%3===0?90:v.id%3===1?50:10,threshold:30,isIncidentPredicted:v.id%3!==2,horizonHours:24,modelVersion:'UI-TEST-FIXTURE',scenario:'Synthetic test',reason:'Synthetic test only',recommendation:'Synthetic test only'}))});
  await prisma.incident.createMany({data:rows.filter(v=>v.id%3===0).map(v=>({id:`map-fixture-${v.id}`,systemObjectId:v.id,scenario:'Synthetic test',reason:'Synthetic test only',horizon:'24 часа',probability:90})),skipDuplicates:true});
 }
 console.log('Prepared 3000 isolated map fixtures');
}
main().finally(()=>prisma.$disconnect());
