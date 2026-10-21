import bcrypt from 'bcryptjs';

/** Cria o administrador inicial (SEED_ADMIN_*) se ainda não existir. Idempotente. */
export async function ensureAdmin(prisma) {
  const email = String(process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.SEED_ADMIN_PASSWORD || '');
  if (!email || !password) {
    console.warn('SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD não definidos: admin inicial não criado.');
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== 'admin') await prisma.user.update({ where: { id: existing.id }, data: { role: 'admin' } });
    return;
  }
  await prisma.user.create({
    data: {
      name: process.env.SEED_ADMIN_NAME || 'Administrador',
      email,
      role: 'admin',
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  console.log(`Admin inicial criado: ${email}`);
}
