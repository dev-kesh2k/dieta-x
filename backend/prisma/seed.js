// Idempotente: roda a cada publicação e também no start da API.
import { PrismaClient } from '@prisma/client';
import { ensureAdmin } from '../src/seed-admin.js';

const prisma = new PrismaClient();

ensureAdmin(prisma)
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
