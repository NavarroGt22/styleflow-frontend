import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const salon = await prisma.salon.findUnique({
    where: { slug: 'teste-barbearia' }
  });

  if (!salon) {
    console.log('Salon not found');
    return;
  }

  console.log('Salon:', salon.name, 'ID:', salon.id);

  const services = await prisma.service.findMany({
    where: { salonId: salon.id },
    include: { professionals: { include: { user: true } } }
  });

  console.log('\n--- SERVICES ---');
  for (const s of services) {
    console.log(`Service: ${s.name} (${s.id}) - Active: ${s.isActive}`);
    console.log(`  Professionals: ${s.professionals.map(p => p.user.name).join(', ')}`);
  }

  const professionals = await prisma.professionalProfile.findMany({
    where: { salonId: salon.id },
    include: { user: true, services: true }
  });

  console.log('\n--- PROFESSIONALS ---');
  for (const p of professionals) {
    console.log(`Professional: ${p.user.name} (${p.id})`);
    console.log(`  Services: ${p.services.map(s => s.name).join(', ')}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
