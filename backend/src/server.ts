import { buildApp } from './app';
import { startWhatsAppNotificationScheduler } from './services/whatsapp-scheduler.service';

const PORT = Number(process.env.PORT) || 3333;
const app = buildApp();

async function start() {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(`[SERVER] 🚀 Servidor SaaS Barbearia rodando na porta ${PORT}`);
    
    // Inicializa o agendador automático de WhatsApp em background
    startWhatsAppNotificationScheduler();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
