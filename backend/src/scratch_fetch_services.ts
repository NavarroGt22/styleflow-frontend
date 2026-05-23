export {};

async function run() {
  const res = await fetch('http://localhost:3333/api/v1/services/561b8a24-6377-471e-99c6-55c5020fbabd');
  console.log("STATUS:", res.status);
  const json = await res.json();
  console.log("SERVICES RESPONSE:", JSON.stringify(json, null, 2));
  process.exit(0);
}
run().catch(console.error);
