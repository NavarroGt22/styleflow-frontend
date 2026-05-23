import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- SALONS ---');
  const salons = await prisma.salon.findMany();
  console.log(salons.map(s => ({ id: s.id, name: s.name, slug: s.slug, queueMode: s.queueMode })));

  console.log('--- APPOINTMENTS ---');
  const appointments = await prisma.appointment.findMany({
    include: {
      professional: {
        include: { user: true }
      }
    }
  });
  console.log(appointments.map(a => ({
    id: a.id,
    salonId: a.salonId,
    status: a.status,
    startTime: a.startTime,
    endTime: a.endTime,
    professionalName: a.professional?.user?.name
  })));
}

main().then(() => prisma.$disconnect());
