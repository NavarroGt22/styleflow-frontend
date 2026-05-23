import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- SERVICES ---');
  const services = await prisma.service.findMany();
  console.log(JSON.stringify(services, null, 2));

  console.log('--- PROFESSIONAL SERVICES ---');
  const professionals = await prisma.professionalProfile.findMany({
    include: {
      user: true,
      services: true
    }
  });
  console.log(JSON.stringify(professionals.map(p => ({
    id: p.id,
    name: p.user.name,
    services: p.services.map(s => s.name)
  })), null, 2));
}

main().then(() => prisma.$disconnect());
