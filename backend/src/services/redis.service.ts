import Redis from 'ioredis';
import { env } from '../config/env';

let redisClient: Redis | null = null;
const memoryBlacklist = new Set<string>();

if (env.REDIS_URL) {
  try {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000 // 2 segundos de limite para rápida resiliência local
    });
    
    redisClient.on('error', (err) => {
      // Registrar aviso sem derrubar o processo
      console.warn('⚠️ [REDIS CLUSTER WARNING] Erro na conexão do Redis. Ativando fallback em memória:', err.message);
    });
  } catch (err: any) {
    console.warn('⚠️ [REDIS INITIALIZATION ERROR] Falha ao inicializar o cliente Redis. Ativando fallback em memória:', err.message);
  }
}

export const redisService = {
  async blacklistToken(token: string, ttlSeconds: number) {
    if (redisClient && redisClient.status === 'ready') {
      try {
        await redisClient.set(`blacklist:${token}`, 'true', 'EX', Math.max(1, Math.floor(ttlSeconds)));
      } catch (err: any) {
        console.warn('⚠️ [REDIS SAVE ERROR] Falha ao gravar no Redis. Gravando no fallback em memória:', err.message);
        this.blacklistInMemory(token, ttlSeconds);
      }
    } else {
      this.blacklistInMemory(token, ttlSeconds);
    }
  },

  blacklistInMemory(token: string, ttlSeconds: number) {
    memoryBlacklist.add(token);
    setTimeout(() => {
      memoryBlacklist.delete(token);
    }, Math.max(1, Math.floor(ttlSeconds)) * 1000);
  },

  async isTokenBlacklisted(token: string): Promise<boolean> {
    if (redisClient && redisClient.status === 'ready') {
      try {
        const res = await redisClient.get(`blacklist:${token}`);
        return res === 'true';
      } catch (err: any) {
        console.warn('⚠️ [REDIS READ ERROR] Falha ao consultar o Redis. Consultando fallback em memória:', err.message);
        return memoryBlacklist.has(token);
      }
    }
    return memoryBlacklist.has(token);
  }
};
