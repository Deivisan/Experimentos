// 🧠 Cliente IA Otimizado - Frontend Seguro
// Comunicação inteligente com proxy de API sem expor chaves

/**
 * CONFIGURAÇÃO DO CLIENTE
 */
const CLIENT_CONFIG = {
  // Endpoints do proxy (rotativo para balanceamento)
  API_ENDPOINTS: [
    'https://deivitech-ai-proxy.deivisan.workers.dev/api/ai',
    'https://deivitech-ai-proxy-2.deivisan.workers.dev/api/ai',
    'https://deivitech-ai-proxy-3.deivisan.workers.dev/api/ai'
  ],
  
  // Configurações de retry e fallback
  RETRY: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 8000,
    backoffFactor: 2
  },
  
  // Cache local (complementar ao cache do servidor)
  CACHE: {
    enabled: true,
    ttl: 240000,    // 4 minutos (um pouco menos que o servidor)
    maxSize: 100,
    storageKey: 'deivitech-ai-cache'
  },
  
  // Rate limiting local (respeita limites do servidor)
  RATE_LIMITING: {
    enabled: true,
    localWindow: 60000,  // 1 minuto
    maxRequestsPerMinute: 4  // Conservador: 4 vs 5 do servidor
  }
};

/**
 * GERENCIADOR DE CACHE LOCAL
 */
class LocalCache {
  constructor() {
    this.cache = new Map();
    this.requestTimes = [];
    this.storageKey = CLIENT_CONFIG.CACHE.storageKey;
    
    // Carregar cache do localStorage
    this.loadFromStorage();
  }
  
  generateKey(prompt, options = {}) {
    const normalizedPrompt = prompt.toLowerCase().trim();
    const optionsStr = JSON.stringify(options);
    return btoa(normalizedPrompt + ':' + optionsStr).substring(0, 32);
  }
  
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    // Verificar se expirou
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }
    
    console.log('📦 Local cache HIT:', key.substring(0, 8) + '...');
    return cached.data;
  }
  
  set(key, data) {
    this.cache.set(key, {
      data: data,
      createdAt: Date.now(),
      expiresAt: Date.now() + CLIENT_CONFIG.CACHE.ttl
    });
    
    // Manter cache limpo (LRU)
    if (this.cache.size > CLIENT_CONFIG.CACHE.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.saveToStorage();
    console.log('💾 Local cache SET:', key.substring(0, 8) + '...');
  }
  
  saveToStorage() {
    try {
      const cacheData = {};
      this.cache.forEach((value, key) => {
        cacheData[key] = value;
      });
      localStorage.setItem(this.storageKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }
  
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const cacheData = JSON.parse(stored);
        const now = Date.now();
        
        Object.entries(cacheData).forEach(([key, value]) => {
          if (value.expiresAt > now) {
            this.cache.set(key, value);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }
  
  clear() {
    this.cache.clear();
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('Failed to clear cache from localStorage:', error);
    }
  }
}

/**
 * GERENCIADOR DE RATE LIMITING LOCAL
 */
class LocalRateLimiter {
  constructor() {
    this.requestTimes = [];
  }
  
  async checkLimit() {
    if (!CLIENT_CONFIG.RATE_LIMITING.enabled) {
      return { allowed: true };
    }
    
    const now = Date.now();
    const windowStart = now - CLIENT_CONFIG.RATE_LIMITING.localWindow;
    
    // Limpar requests antigos da janela
    this.requestTimes = this.requestTimes.filter(time => time > windowStart);
    
    // Verificar limite
    if (this.requestTimes.length >= CLIENT_CONFIG.RATE_LIMITING.maxRequestsPerMinute) {
      const oldestRequest = Math.min(...this.requestTimes);
      const waitTime = Math.ceil((oldestRequest + CLIENT_CONFIG.RATE_LIMITING.localWindow - now) / 1000);
      
      return {
        allowed: false,
        retryAfter: waitTime,
        message: `Aguarde ${waitTime}s antes de fazer outra requisição.`
      };
    }
    
    this.requestTimes.push(now);
    return { allowed: true };
  }
  
  reset() {
    this.requestTimes = [];
  }
}

/**
 * GERENCIADOR DE RETRY INTELIGENTE
 */
class RetryManager {
  static async executeWithRetry(operation, context = {}) {
    const config = CLIENT_CONFIG.RETRY;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        // Sucesso! Resetar falhas
        if (context.onSuccess) {
          context.onSuccess(result);
        }
        
        return {
          success: true,
          data: result,
          attempts: attempt
        };
        
      } catch (error) {
        console.warn(`❌ Attempt ${attempt} failed:`, error.message);
        
        // Tentar próximo endpoint (load balancing)
        if (attempt < config.maxAttempts && context.endpointIndex !== undefined) {
          context.endpointIndex = (context.endpointIndex + 1) % CLIENT_CONFIG.API_ENDPOINTS.length;
        }
        
        // Calcular delay exponencial com jitter
        const baseDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
        const jitter = Math.random() * 1000; // Até 1s de jitter
        const delay = Math.min(baseDelay + jitter, config.maxDelay);
        
        if (attempt < config.maxAttempts) {
          if (context.onRetry) {
            context.onRetry(error, attempt, delay);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Todas as tentativas falharam
    if (context.onFailure) {
      context.onFailure(new Error(`Falha após ${config.maxAttempts} tentativas`));
    }
    
    return {
      success: false,
      error: `Falha após ${config.maxAttempts} tentativas`,
      attempts: config.maxAttempts
    };
  }
}

/**
 * CLIENTE IA PRINCIPAL
 */
class AIClient {
  constructor() {
    this.cache = new LocalCache();
    this.rateLimiter = new LocalRateLimiter();
    this.currentEndpointIndex = 0;
    this.requestId = this.generateRequestId();
  }
  
  generateRequestId() {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  }
  
  /**
   * Obter próximo endpoint (load balancing)
   */
  getNextEndpoint() {
    const endpoint = CLIENT_CONFIG.API_ENDPOINTS[this.currentEndpointIndex];
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % CLIENT_CONFIG.API_ENDPOINTS.length;
    return endpoint;
  }
  
  /**
   * Query principal para IA
   */
  async query(prompt, options = {}) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      // 1. Rate limiting local
      const rateLimitCheck = await this.rateLimiter.checkLimit();
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: rateLimitCheck.message,
          rateLimited: true,
          retryAfter: rateLimitCheck.retryAfter
        };
      }
      
      // 2. Tentar cache local primeiro
      const cacheKey = this.cache.generateKey(prompt, options);
      const cachedResponse = this.cache.get(cacheKey);
      
      if (cachedResponse) {
        console.log('🚀 Query completed from cache:', {
          requestId,
          responseTime: Date.now() - startTime,
          cached: true
        });
        
        return {
          success: true,
          data: cachedResponse,
          cached: true,
          responseTime: Date.now() - startTime,
          requestId
        };
      }
      
      // 3. Fazer requisição via proxy com retry
      const context = {
        endpointIndex: this.currentEndpointIndex,
        onRetry: (error, attempt, delay) => {
          console.log(`🔄 Retry ${attempt} for request ${requestId} after ${delay}ms:`, error.message);
        },
        onSuccess: (response) => {
          // Salvar no cache local em caso de sucesso
          this.cache.set(cacheKey, response);
          
          console.log('✅ Query completed via API:', {
            requestId,
            endpoint: CLIENT_CONFIG.API_ENDPOINTS[this.currentEndpointIndex],
            responseTime: Date.now() - startTime,
            cached: false
          });
        },
        onFailure: (error) => {
          console.error('❌ Query failed permanently:', {
            requestId,
            error: error.message
          });
        }
      };
      
      const result = await RetryManager.executeWithRetry(async () => {
        const endpoint = this.getNextEndpoint();
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'DeiviTech-Lab-Client/1.0',
            'X-Request-ID': requestId,
            'X-Client-Version': '1.0.0',
            'Accept': 'application/json',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
          },
          body: JSON.stringify({
            prompt: prompt,
            options: options,
            requestId: requestId,
            timestamp: Date.now()
          }),
          signal: AbortSignal.timeout(20000) // 20 segundos timeout
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.error || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'API Error');
        }
        
        return result.data;
      }, context);
      
      if (result.success) {
        return {
          success: true,
          data: result.data,
          cached: false,
          responseTime: Date.now() - startTime,
          requestId,
          endpoint: CLIENT_CONFIG.API_ENDPOINTS[(this.currentEndpointIndex - 1 + CLIENT_CONFIG.API_ENDPOINTS.length) % CLIENT_CONFIG.API_ENDPOINTS.length],
          attempts: result.attempts
        };
      } else {
        return {
          success: false,
          error: result.error,
          responseTime: Date.now() - startTime,
          requestId,
          attempts: result.attempts
        };
      }
      
    } catch (error) {
      console.error('❌ Query error:', {
        requestId,
        error: error.message
      });
      
      return {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime,
        requestId
      };
    }
  }
  
  /**
   * Query para análise de profissão
   */
  async analyzeProfession(profession) {
    const prompt = `Analise a profissão "${profession}" e como a tecnologia DeiviTech pode ajudar. 
Forneça uma análise estruturada com:
1. Tecnologias recomendadas (lista)
2. Impacto tecnológico (descrição)
3. Oportunidades (lista)
4. Áreas de crescimento (lista)
5. Recomendações específicas

Responda em formato JSON válido.`;
    
    return this.query(prompt, {
      category: 'profession-analysis',
      maxLength: 2000,
      temperature: 0.7
    });
  }
  
  /**
   * Query para geração de ideias
   */
  async generateIdeas(idea, count = 3) {
    const prompt = `Você é um consultor de inovação da DeiviTech. 
Baseado na ideia "${idea}", gere ${count} sugestões práticas e inovadoras de projetos.

Cada sugestão deve incluir:
1. Título curto e impactante
2. Descrição detalhada (2-3 frases)
3. Tecnologias necessárias
4. Estimativa de complexidade
5. Potencial mercado

Formato: Array de objetos JSON.`;
    
    return this.query(prompt, {
      category: 'idea-generation',
      count: count,
      maxLength: 3000,
      temperature: 0.8
    });
  }
  
  /**
   * Status do cliente
   */
  getStatus() {
    return {
      cache: {
        size: this.cache.cache.size,
        maxSize: CLIENT_CONFIG.CACHE.maxSize,
        enabled: CLIENT_CONFIG.CACHE.enabled
      },
      rateLimiting: {
        enabled: CLIENT_CONFIG.RATE_LIMITING.enabled,
        currentWindow: this.rateLimiter.requestTimes.length,
        maxRequests: CLIENT_CONFIG.RATE_LIMITING.maxRequestsPerMinute
      },
      endpoints: {
        available: CLIENT_CONFIG.API_ENDPOINTS.length,
        current: this.currentEndpointIndex
      }
    };
  }
  
  /**
   * Limpar caches e resetar estado
   */
  clear() {
    this.cache.clear();
    this.rateLimiter.reset();
    this.currentEndpointIndex = 0;
    console.log('🧹 Cliente IA resetado');
  }
}

/**
 * EXPORTAÇÃO GLOBAL
 */
window.DeiviTechAI = new AIClient();

/**
 * FUNÇÕES LEGADAS PARA COMPATIBILIDADE
 */
window.AIClient = {
  query: (prompt, options) => window.DeiviTechAI.query(prompt, options),
  analyzeProfession: (profession) => window.DeiviTechAI.analyzeProfession(profession),
  generateIdeas: (idea, count) => window.DeiviTechAI.generateIdeas(idea, count),
  getStatus: () => window.DeiviTechAI.getStatus(),
  clear: () => window.DeiviTechAI.clear()
};

console.log('🤖 DeiviTech AI Client initialized');
console.log('📊 Status:', window.DeiviTechAI.getStatus());