import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not defined');
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const defaultPasswordHash = await bcrypt.hash('Test123!', 10);
  const demoPasswordHash = await bcrypt.hash('Demo#1234?', 10);

  // Demo user
  await prisma.user.upsert({
    where: { email: 'demo@credifyfast.com' },
    update: { passwordHash: demoPasswordHash },
    create: {
      email: 'demo@credifyfast.com',
      firstName: 'Demo',
      lastName: 'User',
      company: 'Credify Demo',
      phoneRaw: '+1 (555) 123-4567',
      phoneDigits: '5551234567',
      source: 'search',
      sourceLabel: 'Google or web search',
      passwordHash: demoPasswordHash,
    },
  });

  // Admin user
  await prisma.user.upsert({
    where: { email: 'admin@credify.com' },
    update: {},
    create: {
      email: 'admin@credify.com',
      firstName: 'Admin',
      lastName: 'User',
      company: 'Credify Admin',
      phoneRaw: '+1 (555) 987-6543',
      phoneDigits: '5559876543',
      source: 'referral',
      sourceLabel: 'Referral from a colleague',
      passwordHash: defaultPasswordHash,
    },
  });

  console.log('🌱 Seeded database with sample users.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });