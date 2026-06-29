import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { cpf: '000.000.000-00' },
    update: {},
    create: {
      name: 'Admin FastFeet',
      cpf: '000.000.000-00',
      email: 'admin@fastfeet.com',
      passwordHash: hash,
      role: 'ADMIN',
    },
  });

  console.log('Seed OK — Admin created:', admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
