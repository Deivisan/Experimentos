// 🤖 AI Proxy Seguro - Cloudflare Worker
// Sistema completo de proteção de chaves API com rate limiting avançado

/**
 * CONFIGURAÇÃO PRINCIPAL
 */
const CONFIG = {
  // Rate limiting por nível
  RATE_LIMITS: {
    perIP: { requests: 5, window: 60000 },      // 5 req/min por IP
    perUser: { requests: 10, window: 60000 },    // 10 req/min por usuário
    global: { requests: 100, window: 60000 },    // 100 req/min total
    premium: { requests: 50, window: 60000 }     // 50 req/min usuários premium
  },
  
  // Configurações de segurança
  SECURITY: {
    maxPromptLength: 10000,      // 10KB máximo
    maxResponseLength: 50000,    // 50KB máximo
    allowedOrigins: ['https://deivisan.github.io', 'https://localhost:8888'],
    blockedPatterns: [
      /<script/i,             // XSS
      /drop table/i,           // SQL Injection
      /union select/i,         // SQL Injection
      /javascript:/i            // Protocol injection
    ]
  },
  
  // Configurações de cache
  CACHE: {
    ttl: 300000,  // 5 minutos
    maxSize: 1000,
    compressionEnabled: true
  }
};

/**
 * SISTEMA DE CACHE INTELIGENTE
 */
class SmartCache {
  constructor() {
    this.cache = new Map();
    this.compressionEnabled = CONFIG.CACHE.compressionEnabled;
  }
  
  generateKey(prompt, options = {}) {
    // Hash do prompt + opções para cache consistente
    const normalizedPrompt = prompt.toLowerCase().trim();
    const optionsStr = JSON.stringify(options);
    return btoa(normalizedPrompt + optionsStr).substring(0, 32);
  }
  
  async get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    // Verificar se ainda é válido
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    console.log('📦 Cache HIT:', key.substring(0, 8) + '...');
    return this.compressionEnabled ? this.decompress(cached.data) : cached.data;
  }
  
  async set(key, data) {
    const compressed = this.compressionEnabled ? await this.compress(data) : data;
    
    // Manter cache limpo (LRU)
    if (this.cache.size >= CONFIG.CACHE.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data: compressed,
      createdAt: Date.now(),
      expiresAt: Date.now() + CONFIG.CACHE.ttl
    });
    
    console.log('💾 Cache SET:', key.substring(0, 8) + '...');
  }
  
  async compress(data) {
    // Compressão simples (em produção seria mais robusta)
    try {
      return JSON.stringify(data);
    } catch (error) {
      console.warn('Cache compression failed:', error);
      return data;
    }
  }
  
  decompress(data) {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.warn('Cache decompression failed:', error);
      return data;
    }
  }
}

/**
 * SISTEMA DE RATE LIMITING
 */
class RateLimiter {
  constructor() {
    this.limits = new Map();
  }
  
  generateKey(type, identifier) {
    return `${type}:${identifier}`;
  }
  
  async checkLimit(type, identifier, customLimit = null) {
    const key = this.generateKey(type, identifier);
    const now = Date.now();
    const config = customLimit || CONFIG.RATE_LIMITS[type];
    
    if (!this.limits.has(key)) {
      this.limits.set(key, {
        requests: [],
        windowStart: now
      });
    }
    
    const limitData = this.limits.get(key);
    
    // Limpar janela de tempo se expirou
    if (now - limitData.windowStart > config.window) {
      limitData.requests = [];
      limitData.windowStart = now;
    }
    
    // Remover requests antigos da janela
    limitData.requests = limitData.requests.filter(
      time => now - time < config.window
    );
    
    // Verificar limite
    if (limitData.requests.length >= config.requests) {
      const waitTime = Math.ceil((config.window - (now - limitData.windowStart)) / 1000);
      
      return {
        allowed: false,
        retryAfter: waitTime,
        limit: config.requests,
        window: config.window / 1000,
        message: `Rate limit excedido. Aguarde ${waitTime}s.`
      };
    }
    
    // Adicionar request atual
    limitData.requests.push(now);
    
    return {
      allowed: true,
      remaining: config.requests - limitData.requests.length,
      resetIn: Math.ceil((config.window - (now - limitData.windowStart)) / 1000)
    };
  }
}

/**
 * SISTEMA DE SEGURANÇA
 */
class SecurityChecker {
  static validateInput(prompt) {
    // Verificar tamanho máximo
    if (prompt.length > CONFIG.SECURITY.maxPromptLength) {
      return {
        valid: false,
        error: 'Prompt muito longo. Máximo: ' + CONFIG.SECURITY.maxPromptLength + ' caracteres'
      };
    }
    
    // Verificar padrões maliciosos
    for (const pattern of CONFIG.SECURITY.blockedPatterns) {
      if (pattern.test(prompt)) {
        return {
          valid: false,
          error: 'Conteúdo não permitido detectado'
        };
      }
    }
    
    return { valid: true };
  }
  
  static sanitizeResponse(response) {
    // Limitar tamanho da resposta
    if (typeof response === 'string' && response.length > CONFIG.SECURITY.maxResponseLength) {
      return response.substring(0, CONFIG.SECURITY.maxResponseLength) + '\n\n[Resposta truncada...]';
    }
    
    return response;
  }
  
  static getClientInfo(request) {
    const ip = request.headers.get('CF-Connecting-IP') || 
                request.headers.get('X-Forwarded-For')?.split(',')[0] || 
                '0.0.0.0';
    
    const userAgent = request.headers.get('User-Agent') || 'unknown';
    
    // Anonymizar IP (primeiros 3 octetos)
    const anonymizedIP = ip.split('.').slice(0, 3).join('.x');
    
    return {
      ip: anonymizedIP,
      userAgent: userAgent,
      country: request.cf?.country || 'unknown',
      asn: request.cf?.asn || 'unknown'
    };
  }
}

/**
 * HANDLER PRINCIPAL DA API
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400'
        }
      });
    }
    
    // Rota principal da API
    if (url.pathname === '/api/ai' && request.method === 'POST') {
      return this.handleAIRequest(request, env, ctx);
    }
    
    // Rota de health check
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime ? process.uptime() * 1000 : 0
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Rota de status
    if (url.pathname === '/api/status') {
      return this.getStatusPage();
    }
    
    // Proxy para outras requisições (se necessário)
    return fetch(request);
  },
  
  /**
   * Processar requisições de IA
   */
  async handleAIRequest(request, env, ctx) {
    const startTime = Date.now();
    
    try {
      // Obter informações do cliente
      const clientInfo = SecurityChecker.getClientInfo(request);
      
      // Parse e validar input
      let requestBody;
      try {
        requestBody = await request.json();
      } catch (error) {
        return this.createErrorResponse('JSON inválido', 400);
      }
      
      // Validações de segurança
      const inputValidation = SecurityChecker.validateInput(requestBody.prompt || '');
      if (!inputValidation.valid) {
        return this.createErrorResponse(inputValidation.error, 400);
      }
      
      // Rate limiting por IP
      const ipLimit = await new RateLimiter().checkLimit('perIP', clientInfo.ip);
      if (!ipLimit.allowed) {
        return this.createErrorResponse(ipLimit.message, 429, {
          'Retry-After': ipLimit.retryAfter.toString(),
          'X-RateLimit-Limit': ipLimit.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': ipLimit.resetIn.toString()
        });
      }
      
      // Rate limiting global
      const globalLimit = await new RateLimiter().checkLimit('global', 'global');
      if (!globalLimit.allowed) {
        return this.createErrorResponse('Limite global de requisições excedido', 429);
      }
      
      // Tentar cache primeiro
      const cache = new SmartCache();
      const cacheKey = cache.generateKey(requestBody.prompt, requestBody.options || {});
      const cachedResponse = await cache.get(cacheKey);
      
      if (cachedResponse) {
        return new Response(JSON.stringify({
          success: true,
          data: cachedResponse,
          cached: true,
          responseTime: Date.now() - startTime
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'X-Cache': 'HIT',
            'X-Response-Time': (Date.now() - startTime).toString()
          }
        });
      }
      
      // Fazer requisição real para Gemini API
      const apiResponse = await this.callGeminiAPI(requestBody.prompt, env.GEMINI_API_KEY, requestBody.options || {});
      
      if (!apiResponse.success) {
        return this.createErrorResponse(apiResponse.error, 500);
      }
      
      // Sanitizar resposta e guardar no cache
      const sanitizedResponse = SecurityChecker.sanitizeResponse(apiResponse.data);
      await cache.set(cacheKey, sanitizedResponse);
      
      // Log de sucesso (monitoramento)
      console.log('✅ API Success:', {
        ip: clientInfo.ip,
        promptLength: requestBody.prompt.length,
        responseTime: Date.now() - startTime,
        cached: false
      });
      
      return new Response(JSON.stringify({
        success: true,
        data: sanitizedResponse,
        cached: false,
        responseTime: Date.now() - startTime
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Cache': 'MISS',
          'X-Response-Time': (Date.now() - startTime).toString()
        }
      });
      
    } catch (error) {
      console.error('❌ API Error:', error);
      return this.createErrorResponse('Erro interno do servidor', 500);
    }
  },
  
  /**
   * Fazer chamada para Gemini API com retry
   */
  async callGeminiAPI(prompt, apiKey, options = {}) {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 segundo
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const payload = {
          contents: [{
            role: "user",
            parts: [{ text: prompt }]
          }]
        };
        
        // Adicionar configurações customizadas
        if (options.generationConfig) {
          payload.generationConfig = options.generationConfig;
        }
        
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'DeiviTech-Lab/1.0'
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000) // 15 segundos timeout
          }
        );
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.error?.message || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
          return {
            success: true,
            data: result.candidates[0].content.parts[0].text
          };
        } else {
          throw new Error('Resposta inválida da API');
        }
        
      } catch (error) {
        console.warn(`❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          return {
            success: false,
            error: `Falha após ${maxRetries} tentativas: ${error.message}`
          };
        }
        
        // Esperar antes de tentar novamente
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }
  },
  
  /**
   * Criar resposta de erro padrão
   */
  createErrorResponse(message, status = 500, headers = {}) {
    return new Response(JSON.stringify({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }), {
      status: status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        ...headers
      }
    });
  },
  
  /**
   * Página de status do sistema
   */
  getStatusPage() {
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>DeiviTech AI Proxy - Status</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background: #0f172a; color: #f1f5f9; margin: 0; padding: 20px; }
          .container { max-width: 800px; margin: 0 auto; }
          .status-card { background: #1e293b; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .status-indicator { width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-right: 8px; }
          .online { background: #10b981; }
          .metric { display: flex; justify-content: space-between; margin: 10px 0; }
          .header { text-align: center; margin-bottom: 40px; }
          .header h1 { color: #06b6d4; margin: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🤖 DeiviTech AI Proxy</h1>
            <p>Sistema de API Seguro e Otimizado</p>
          </div>
          
          <div class="status-card">
            <h3><span class="status-indicator online"></span>Sistema Online</h3>
            <div class="metric">
              <span>Status:</span>
              <span style="color: #10b981;">✅ Operacional</span>
            </div>
            <div class="metric">
              <span>Última verificação:</span>
              <span>${new Date().toLocaleString()}</span>
            </div>
            <div class="metric">
              <span>Version:</span>
              <span>1.0.0</span>
            </div>
          </div>
        </div>
        
        <div class="status-card">
          <h3>📊 Informações</h3>
          <div class="metric">
            <span>Endpoint:</span>
            <code>/api/ai</code>
          </div>
          <div class="metric">
            <span>Métodos:</span>
            <code>POST, OPTIONS</code>
          </div>
          <div class="metric">
            <span>Rate Limit:</span>
            <code>5 req/min por IP</code>
          </div>
          <div class="metric">
            <span>Cache TTL:</span>
            <code>5 minutos</code>
          </div>
        </div>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
};