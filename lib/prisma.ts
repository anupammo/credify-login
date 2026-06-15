import 'dotenv/config'; // Required for Prisma 7 to load DATABASE_URL
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Ensure the DATABASE_URL environment variable exists
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not defined');
}

// Create a PostgreSQL connection pool using the pg driver
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
// Create the Prisma adapter using the pool
const adapter = new PrismaPg(pool);

// Instantiate PrismaClient with the required adapter
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: ["query", "info", "warn", "error"], // optional logging
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;