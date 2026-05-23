import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env';
import { authRoutes } from './routes/auth.routes';
import { establishmentRoutes } from './routes/establishment.routes';
import { serviceRoutes } from './routes/service.routes';
import { appointmentRoutes } from './routes/appointment.routes';
import { professionalRoutes } from './routes/professional.routes';
import { financialRoutes } from './routes/financial.routes';
import { timecardRoutes } from './routes/timecard.routes';
import { productRoutes } from './routes/product.routes';
import { queueRoutes } from './routes/queue.routes';
import fastifyWebsocket from '@fastify/websocket';
import { registerQueueListener } from './services/queue.service';


export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: env.NODE_ENV === 'development',
  });

  // Tratar corpos vazios de JSON de forma resiliente para evitar FST_ERR_CTP_EMPTY_JSON_BODY
  app.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, done) {
    try {
      const rawBody = typeof body === 'string' ? body : (body as Buffer).toString('utf8');
      if (!rawBody || rawBody.trim() === '') {
        done(null, {});
        return;
      }
      const json = JSON.parse(rawBody);
      done(null, json);
    } catch (err: any) {
      err.statusCode = 400;
      done(err);
    }
  });

  // 1. Headers de Segurança (Mitiga XSS, Clickjacking, Sniffing)
  app.register(helmet);

  // Registrar WebSocket Plugin
  app.register(fastifyWebsocket);
  
  // 2. CORS super restrito
  app.register(cors, { 
    origin: [env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174'], 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });

  // 3. Rate Limit Global (Prevenção de DDoS)
  app.register(rateLimit, {
    max: env.NODE_ENV === 'development' ? 999999999 : 200000,
    timeWindow: '1 minute',
    allowList: () => env.NODE_ENV === 'development'
  });

  // 8. Error Handler Global (Oculta stack trace e infos sensíveis)
  app.setErrorHandler((error: any, request, reply) => {
    if (error.statusCode === 429) {
      return reply.status(429).send({ error: 'Muitas requisições (Rate Limit atingido). Tente novamente mais tarde.' });
    }

    if (error.name === 'ZodError') {
      return reply.status(400).send({
        error: 'Erro de validação nos dados enviados.',
        details: JSON.parse(error.message)
      });
    }

    if (error.code && error.code.startsWith('P')) {
       app.log.warn(`[PRISMA ERROR] ${error.code} - ${error.message}`);
       return reply.status(400).send({ error: 'Erro de integridade de dados no banco.' });
    }

    app.log.error(`[FATAL INTERNO] ${error.message}`);
    
    return reply.status(500).send({ 
      error: `Erro Interno: ${error.message}` 
    });
  });

  app.get('/api/v1/health', async () => {
    return { status: 'secure', timestamp: new Date().toISOString() };
  });

  // Registrando as rotas
  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(establishmentRoutes, { prefix: '/api/v1/establishments' });
  app.register(serviceRoutes, { prefix: '/api/v1/services' });
  app.register(appointmentRoutes, { prefix: '/api/v1/appointments' });
  app.register(professionalRoutes, { prefix: '/api/v1/professionals' });
  app.register(financialRoutes, { prefix: '/api/v1/financials' });
  app.register(timecardRoutes, { prefix: '/api/v1/timecards' });
  app.register(productRoutes, { prefix: '/api/v1/products' });
  app.register(queueRoutes, { prefix: '/api/v1/queue' });

  // Endpoint WebSocket para tempo real da fila
  app.get('/ws/queue', { websocket: true }, (connection, req) => {
    const urlObj = new URL(req.url || '', 'http://localhost');
    const salonId = urlObj.searchParams.get('salonId');

    if (!salonId) {
      connection.socket.close(1008, 'salonId_required');
      return;
    }

    const unsubscribe = registerQueueListener((updatedSalonId, eventType, data) => {
      if (updatedSalonId === salonId) {
        try {
          connection.socket.send(JSON.stringify({ event: eventType, type: eventType, data }));
        } catch (err) {
          // Socket fechado ou erro ao enviar
        }
      }
    });

    connection.socket.on('close', () => {
      unsubscribe();
    });
  });

  return app;
}
