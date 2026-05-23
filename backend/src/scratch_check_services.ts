import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export {};

async function run() {
  const salons = await prisma.salon.findMany({
    include: {
      services: true
    }
  });
  console.log("SALONS AND THEIR SERVICES:");
  for (const s of salons) {
    console.log(`Salon: ${s.name} (Slug: ${s.slug}, ID: ${s.id})`);
    console.log("Services:", s.services.map(sv => ({ id: sv.id, name: sv.name, isActive: sv.isActive })));
  }
  process.exit(0);
}

run().catch(console.error);
