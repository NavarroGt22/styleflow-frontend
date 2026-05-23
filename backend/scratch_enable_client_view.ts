import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  console.log('Updating all salons to have queueAllowClientView = true...');
  const result = await prisma.salon.updateMany({
    data: {
      queueAllowClientView: true
    }
  });
  console.log(`Updated ${result.count} salon(s).`);
}

run().then(() => prisma.$disconnect());
