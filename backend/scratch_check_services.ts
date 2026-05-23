import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const salonId = '561b8a24-6377-471e-99c6-55c5020fbabd';
  const salon = await prisma.salon.findUnique({ where: { id: salonId } });
  console.log('Salon name:', salon?.name);

  const services = await prisma.service.findMany({ where: { salonId } });
  console.log('Total services in salon:', services.length);
  for (const s of services) {
    console.log(`- ${s.name} (${s.id}) [isActive: ${s.isActive}]`);
  }

  const professionals = await prisma.professionalProfile.findMany({
    where: { salonId },
    include: {
      user: true,
      services: true
    }
  });

  console.log('\nTotal professionals in salon:', professionals.length);
  for (const p of professionals) {
    console.log(`- ${p.user.name} (${p.id}) [isActive: ${p.isActive}]`);
    console.log(`  Linked services (${p.services.length}):`, p.services.map(s => s.name));
  }
}

main().catch(err => {
  console.error(err);
});
