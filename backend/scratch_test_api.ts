import { PrismaClient } from '@prisma/client';

async function main() {
  const salonId = '561b8a24-6377-471e-99c6-55c5020fbabd';
  const urlQueue = 'http://localhost:3333/api/v1/queue/public/teste-barbearia';
  const urlServices = `http://localhost:3333/api/v1/services/${salonId}`;
  
  console.log(`Fetching ${urlQueue}...`);
  try {
    const res = await fetch(urlQueue);
    console.log('Queue Status:', res.status);
    const json = await res.json();
    console.log('Queue Body:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Queue Fetch error:', err);
  }

  console.log(`\nFetching ${urlServices}...`);
  try {
    const res = await fetch(urlServices);
    console.log('Services Status:', res.status);
    const json = await res.json();
    console.log('Services Body:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Services Fetch error:', err);
  }
}

main();

