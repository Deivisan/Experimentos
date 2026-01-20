/**
 * DeiviTech - Configuração Gemini API - PRODUÇÃO
 * Sistema robusto com múltiplas chaves e tratamento avançado
 * Versão: 2.0 - Corrigida e Otimizada
 */

(function() {
    'use strict';
    
    // Configuração principal
    const API_CONFIG = {
        // ⚠️ ATUALIZAR COM CHAVES VÁLIDAS
        keys: [
            'AIzaSyAIUt2JDq3Ocunp3kpD-VfSW_INXBl66HU', // ❌ INVÁLIDA - Substituir
            'AIzaSyAOUeRBKLT076PokGzarjEbZBZ7bjuUfMI', // ❌ EXPIRADA - Substituir  
            'AIzaSyAqPGBQf9dMhebgo3ZP7i7sp0OYu5PlMNg'  // ❌ SUSPENSA - Substituir
        ],
        currentIndex: 0,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
        
        // Rate limiting configurável
        rateLimit: {
            requestsPerMinute: 10,
            requestsPerDay: 100,
            minInterval: 3000, // 3 segundos entre requisições
            lastRequest: 0,
            requestCount: 0,
            resetTime: Date.now() + (24 * 60 * 60 * 1000),
            consecutiveErrors: 0,
            maxConsecutiveErrors: 3
        }
    };

    // Cache de respostas para evitar requisições duplicadas
    const responseCache = new Map();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

    /**
     * Gera hash simples para cache
     */
    function hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    /**
     * Verifica cache
     */
    function getCachedResponse(prompt) {
        const hash = hashString(prompt);
        const cached = responseCache.get(hash);
        
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log('📦 Retornando resposta em cache');
            return cached.response;
        }
        
        return null;
    }

    /**
     * Armazena resposta em cache
     */
    function setCachedResponse(prompt, response) {
        const hash = hashString(prompt);
        responseCache.set(hash, {
            response,
            timestamp: Date.now()
        });
        
        // Limpar cache antigo se ficar muito grande
        if (responseCache.size > 50) {
            const oldestKey = responseCache.keys().next().value;
            responseCache.delete(oldestKey);
        }
    }

    /**
     * Obtém próxima chave com retry inteligente
     */
    function getNextApiKey() {
        // Se houve muitos erros consecutivos, tentar chave diferente
        if (API_CONFIG.rateLimit.consecutiveErrors > 0) {
            const skipCount = Math.min(API_CONFIG.rateLimit.consecutiveErrors, API_CONFIG.keys.length - 1);
            API_CONFIG.currentIndex = (API_CONFIG.currentIndex + skipCount) % API_CONFIG.keys.length;
        }
        
        const key = API_CONFIG.keys[API_CONFIG.currentIndex];
        API_CONFIG.currentIndex = (API_CONFIG.currentIndex + 1) % API_CONFIG.keys.length;
        
        console.log(`🔑 Usando chave API #${API_CONFIG.currentIndex} (Erros consecutivos: ${API_CONFIG.rateLimit.consecutiveErrors})`);
        return key;
    }

    /**
     * Rate limit avançado
     */
    async function checkRateLimit() {
        const now = Date.now();
        
        // Reset diário
        if (now > API_CONFIG.rateLimit.resetTime) {
            API_CONFIG.rateLimit.requestCount = 0;
            API_CONFIG.rateLimit.resetTime = now + (24 * 60 * 60 * 1000);
            console.log('📅 Rate limit diário resetado');
        }

        // Verificar limite diário
        if (API_CONFIG.rateLimit.requestCount >= API_CONFIG.rateLimit.requestsPerDay) {
            throw new Error(`Limite diário atingido (${API_CONFIG.rateLimit.requestsPerDay}). Tente amanhã.`);
        }

        // Verificar intervalo mínimo
        const timeSinceLastRequest = now - API_CONFIG.rateLimit.lastRequest;
        if (timeSinceLastRequest < API_CONFIG.rateLimit.minInterval) {
            const waitTime = API_CONFIG.rateLimit.minInterval - timeSinceLastRequest;
            console.log(`⏱️ Rate limit: aguardando ${Math.ceil(waitTime/1000)}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        API_CONFIG.rateLimit.lastRequest = now;
        API_CONFIG.rateLimit.requestCount++;
    }

    /**
     * Tratamento avançado de erros
     */
    function handleApiError(error, keyUsed) {
        API_CONFIG.rateLimit.consecutiveErrors++;
        
        console.error(`❌ Erro na API (chave #${API_CONFIG.currentIndex}):`, error);
        
        // Se for erro de chave inválida, tentar próxima
        if (error.status === 401 || error.status === 403 || error.message?.includes('API_KEY_INVALID')) {
            console.warn('🔄 Chave inválida, tentando próxima...');
            
            // Reset contador de erros se conseguir usar outra chave
            if (API_CONFIG.rateLimit.consecutiveErrors < API_CONFIG.keys.length) {
                return { shouldRetry: true, error: null };
            }
        }
        
        // Se for rate limit, aguardar mais tempo
        if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
            return { 
                shouldRetry: false, 
                error: 'Rate limit atingido. Aguarde alguns segundos e tente novamente.' 
            };
        }
        
        // Reset contador se for erro temporário
        if (error.status >= 500) {
            API_CONFIG.rateLimit.consecutiveErrors = 0;
        }
        
        return { 
            shouldRetry: false, 
            error: `Erro na API: ${error.message || 'Erro desconhecido'}` 
        };
    }

    /**
     * Chamada principal da API com retry e cache
     */
    async function callGeminiAPI(prompt, options = {}) {
        try {
            // Verificar cache primeiro
            const cachedResponse = getCachedResponse(prompt);
            if (cachedResponse && !options.skipCache) {
                return cachedResponse;
            }
            
            await checkRateLimit();

            const payload = {
                contents: [{ role: "user", parts: [{ text: prompt }] }]
            };

            // Configurações customizadas
            if (options.generationConfig) {
                payload.generationConfig = options.generationConfig;
            }

            let lastError = null;
            let attempts = 0;
            const maxAttempts = Math.min(3, API_CONFIG.keys.length);

            // Retry loop
            while (attempts < maxAttempts) {
                attempts++;
                const apiKey = getNextApiKey();
                const url = `${API_CONFIG.endpoint}?key=${apiKey}`;

                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        signal: AbortSignal.timeout(15000) // 15 segundos timeout
                    });

                    if (!response.ok) {
                        const errorBody = await response.json().catch(() => ({ error: { message: response.statusText } }));
                        const error = new Error(errorBody?.error?.message || response.statusText);
                        error.status = response.status;
                        
                        const handling = handleApiError(error, apiKey);
                        if (handling.shouldRetry && attempts < maxAttempts) {
                            lastError = handling.error;
                            continue; // Tentar próxima chave
                        }
                        
                        throw new Error(handling.error);
                    }

                    // Sucesso! Reset contador de erros
                    API_CONFIG.rateLimit.consecutiveErrors = 0;
                    
                    const result = await response.json();

                    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
                        const response = {
                            success: true,
                            text: result.candidates[0].content.parts[0].text,
                            raw: result,
                            cached: false
                        };
                        
                        // Armazenar em cache
                        setCachedResponse(prompt, response);
                        
                        return response;
                    } else {
                        throw new Error('Resposta inválida da API');
                    }

                } catch (fetchError) {
                    lastError = fetchError;
                    console.error(`Tentativa ${attempts} falhou:`, fetchError);
                    
                    if (attempts >= maxAttempts) {
                        throw lastError;
                    }
                }
            }

            throw lastError;

        } catch (error) {
            console.error('❌ Erro final na API Gemini:', error);
            return {
                success: false,
                error: error.message,
                suggestion: getErrorSuggestion(error.message),
                cached: false
            };
        }
    }

    /**
     * Sugestões amigáveis de erro
     */
    function getErrorSuggestion(errorMessage) {
        const suggestions = {
            'limite': 'Tente novamente em alguns minutos ou reformule sua consulta.',
            'API_KEY': 'As chaves de API precisam ser atualizadas. Entre em contato com o suporte.',
            'rede': 'Verifique sua conexão com a internet.',
            'timeout': 'O servidor demorou para responder. Tente novamente.',
            'inválida': 'Há um problema com as chaves de API. Contate o suporte técnico.'
        };
        
        for (const [key, suggestion] of Object.entries(suggestions)) {
            if (errorMessage.toLowerCase().includes(key)) {
                return suggestion;
            }
        }
        
        return 'Tente novamente ou entre em contato com o suporte.';
    }

    /**
     * Limpa cache e reseta contadores
     */
    function resetSystem() {
        responseCache.clear();
        API_CONFIG.rateLimit.requestCount = 0;
        API_CONFIG.rateLimit.lastRequest = 0;
        API_CONFIG.rateLimit.consecutiveErrors = 0;
        API_CONFIG.currentIndex = 0;
        console.log('🔄 Sistema resetado');
    }

    // Exportar funções públicas
    window.GeminiAPI = {
        call: callGeminiAPI,
        resetSystem: resetSystem,
        getStatus: () => ({
            requestsToday: API_CONFIG.rateLimit.requestCount,
            requestsRemaining: API_CONFIG.rateLimit.requestsPerDay - API_CONFIG.rateLimit.requestCount,
            resetTime: new Date(API_CONFIG.rateLimit.resetTime),
            cacheSize: responseCache.size,
            consecutiveErrors: API_CONFIG.rateLimit.consecutiveErrors,
            keysConfigured: API_CONFIG.keys.length
        }),
        clearCache: () => {
            responseCache.clear();
            console.log('🗑️ Cache limpo');
        }
    };

    // Função legada para compatibilidade
    window.getApiKey = function() {
        console.warn('getApiKey() está deprecated. Use GeminiAPI.call() diretamente.');
        return getNextApiKey();
    };

    // Logs informativos
    console.log('🚀 Gemini API v2.0 inicializada');
    console.log(`📊 Configuração: ${API_CONFIG.keys.length} chaves, ${API_CONFIG.rateLimit.requestsPerDay} req/dia limite`);
    
})();