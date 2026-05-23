import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const notifiedAppointments = new Set<string>();

// Helper para formatar a hora (HH:MM) no padrão local de Brasília (ou UTC do banco)
function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatNotificationMessage(
  template: string,
  cliente: string,
  posicao: number | string,
  tempo: string,
  estabelecimento: string
): string {
  return template
    .replace(/{cliente}/g, cliente)
    .replace(/{posicao}/g, String(posicao))
    .replace(/{tempo}/g, tempo)
    .replace(/{estabelecimento}/g, estabelecimento);
}

async function checkAndSendNotifications() {
  try {
    const now = new Date();
    
    // Define a janela de agendamentos de interesse (entre daqui a 4 minutos e daqui a 6 minutos)
    const minTime = new Date(now.getTime() + 4 * 60000);
    const maxTime = new Date(now.getTime() + 6 * 60000);

    // 1. Busca todos os salões que tenham gateway configurado e notificações ativas
    const salons = await prisma.salon.findMany({
      where: {
        whatsappGatewayUrl: { not: null },
        queueNotifyClient: true
      }
    });

    if (salons.length === 0) return;

    for (const salon of salons) {
      if (!salon.whatsappGatewayUrl) continue;

      // 2. Busca agendamentos CONFIRMED na janela de tempo deste salão
      const appointments = await prisma.appointment.findMany({
        where: {
          salonId: salon.id,
          status: 'PENDING', // PENDING ou CONFIRMED dependendo do uso da fila/agenda
          startTime: {
            gte: minTime,
            lte: maxTime
          }
        },
        include: {
          customer: {
            include: {
              user: true
            }
          },
          queueEntry: true
        }
      });

      for (const apt of appointments) {
        // Evita enviar notificações duplicadas na mesma sessão do servidor
        if (notifiedAppointments.has(apt.id)) continue;

        const customerPhone = apt.customer?.user?.phone;
        const customerName = apt.customer?.user?.name || 'Cliente';
        
        if (!customerPhone) continue;

        const phoneClean = customerPhone.replace(/\D/g, '');
        if (phoneClean.length < 10) continue;

        // Se for celular brasileiro sem o 55, adiciona
        const formattedPhone = phoneClean.startsWith('55') ? phoneClean : `55${phoneClean}`;

        // Obtém a posição na fila (caso exista), senão usa "1" ou "N/A"
        const position = apt.queueEntry?.position || 1;
        const timeStr = formatTime(apt.startTime);
        
        const template = salon.whatsappTemplate || 'Olá {cliente}, seu atendimento no {estabelecimento} está chegando! Você é o {posicao}º da fila com previsão para as {tempo}.';
        
        const textMessage = formatNotificationMessage(
          template,
          customerName,
          position,
          timeStr,
          salon.name
        );

        // Dispara para o gateway do salão de forma assíncrona
        console.log(`[AUTOMAÇÃO WHATSAPP] ⚡ Disparando notificação automática do salão "${salon.name}" para o cliente "${customerName}" (${formattedPhone})`);
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (salon.whatsappGatewayToken) {
          headers['apikey'] = salon.whatsappGatewayToken;
          headers['Authorization'] = `Bearer ${salon.whatsappGatewayToken}`;
          headers['X-API-Key'] = salon.whatsappGatewayToken;
        }

        const payload = {
          number: formattedPhone,
          message: textMessage,
          to: formattedPhone,
          text: textMessage
        };

        // Dispara em background sem travar o loop do scheduler
        fetch(salon.whatsappGatewayUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        })
        .then(async (res) => {
          if (!res.ok) {
            console.error(`[AUTOMAÇÃO WHATSAPP] ❌ Erro ao enviar mensagem via Gateway (Status ${res.status}):`, await res.text());
          } else {
            console.log(`[AUTOMAÇÃO WHATSAPP] ✅ Mensagem enviada com sucesso para ${customerName} (${formattedPhone}) via Gateway.`);
            notifiedAppointments.add(apt.id);
          }
        })
        .catch((err) => {
          console.error(`[AUTOMAÇÃO WHATSAPP] ❌ Falha de conexão com o Gateway de WhatsApp do salão "${salon.name}":`, err.message);
        });
      }
    }
  } catch (error: any) {
    console.error('[AUTOMAÇÃO WHATSAPP] Erro crítico no loop do scheduler:', error.message);
  }
}

export function startWhatsAppNotificationScheduler() {
  console.log('[AUTOMAÇÃO WHATSAPP] 🕒 Scheduler de Notificações Automáticas ativado e rodando a cada 60s.');
  
  // Executa uma vez na inicialização e depois a cada 60 segundos
  checkAndSendNotifications();
  setInterval(checkAndSendNotifications, 60000);
}
