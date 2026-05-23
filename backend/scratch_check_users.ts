import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      ownedSalons: true,
      professionalProfile: true,
    }
  });

  console.log('--- USERS ---');
  for (const u of users) {
    console.log(`User: ${u.name} (${u.email}) - ID: ${u.id} - Role: ${u.role}`);
    if (u.ownedSalons.length > 0) {
      console.log(`  Owned Salons: ${u.ownedSalons.map(s => s.name).join(', ')}`);
    }
    if (u.professionalProfile) {
      console.log(`  Professional Profile: ${u.professionalProfile.id} - Commission: ${u.professionalProfile.commissionRate}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
