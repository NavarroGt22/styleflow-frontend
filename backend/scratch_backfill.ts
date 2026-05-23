import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function backfill() {
  const salons = await prisma.salon.findMany({ include: { professionals: true } });
  
  for (const salon of salons) {
    if (salon.professionals.length === 0) {
      console.log(`Backfilling professional for salon ${salon.name}...`);
      await prisma.professionalProfile.create({
        data: {
          userId: salon.ownerId,
          salonId: salon.id,
          commissionRate: 100
        }
      });
      console.log('Done!');
    }
  }
}

backfill().then(() => prisma.$disconnect());
