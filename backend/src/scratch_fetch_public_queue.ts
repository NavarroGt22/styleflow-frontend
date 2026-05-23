export {};

async function run() {
  const res = await fetch('http://localhost:3333/api/v1/queue/public/teste-barbearia');
  const json = await res.json();
  console.log("PUBLIC QUEUE RESPONSE:", JSON.stringify(json, null, 2));
  process.exit(0);
}
run().catch(console.error);
