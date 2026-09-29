import { prisma } from '../src/db.js';
import bcrypt from 'bcrypt';

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 16) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 16 characters)');
  // Re-running bootstrap does not reset an existing account or change its role.
  await prisma.user.upsert({ where: { email }, update: {}, create: {
    email, password: await bcrypt.hash(password, 12), name: 'Администратор', role: 'ADMIN',
  } });
  console.log('Administrator provisioned');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
