/**
 * DeiviTech - Configuração Gemini API
 * Sistema de rotação de chaves com proteção
 * 
 * IMPORTANTE: Para uso em produção, considere:
 * 1. Proxy server-side (Vercel Functions, Cloudflare Workers)
 * 2. Variáveis de ambiente em build-time
 * 3. Rate limiting no cliente
 * 
 * Para GitHub Pages (estático), as chaves precisam estar no código
 * mas com rotação automática para distribuir rate limits.
 */

(function() {
    'use strict';
    
    // Configuração privada - não acessível globalmente
    const API_CONFIG = {
        keys: [
            'AIzaSyAIUt2JDq3Ocunp3kpD-VfSW_INXBl66HU',
            'AIzaSyAOUeRBKLT076PokGzarjEbZBZ7bjuUfMI',
            'AIzaSyAqPGBQf9dMhebgo3ZP7i7sp0OYu5PlMNg'
        ],
        currentIndex: 0,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
        rateLimit: {
            requestsPerMinute: 5,
            requestsPerDay: 25,
            lastRequest: 0,
            requestCount: 0,
            resetTime: Date.now() + (24 * 60 * 60 * 1000)
        }
    };

    /**
     * Obtém a próxima chave de API (rotação automática)
     */
    function getNextApiKey() {
        const key = API_CONFIG.keys[API_CONFIG.currentIndex];
        API_CONFIG.currentIndex = (API_CONFIG.currentIndex + 1) % API_CONFIG.keys.length;
        return key;
    }

    /**
     * Verifica rate limit antes de fazer requisição
     */
    function checkRateLimit() {
        const now = Date.now();
        
        // Reset diário
        if (now > API_CONFIG.rateLimit.resetTime) {
            API_CONFIG.rateLimit.requestCount = 0;
            API_CONFIG.rateLimit.resetTime = now + (24 * 60 * 60 * 1000);
        }

        // Verifica limite diário
        if (API_CONFIG.rateLimit.requestCount >= API_CONFIG.rateLimit.requestsPerDay) {
            throw new Error('Limite diário de requisições atingido. Tente novamente amanhã.');
        }

        // Verifica limite por minuto
        const timeSinceLastRequest = now - API_CONFIG.rateLimit.lastRequest;
        const minInterval = (60 * 1000) / API_CONFIG.rateLimit.requestsPerMinute;
        
        if (timeSinceLastRequest < minInterval) {
            const waitTime = Math.ceil((minInterval - timeSinceLastRequest) / 1000);
            throw new Error(`Aguarde ${waitTime} segundos antes de fazer nova requisição.`);
        }

        API_CONFIG.rateLimit.lastRequest = now;
        API_CONFIG.rateLimit.requestCount++;
    }

    /**
     * Faz requisição para a API Gemini com tratamento de erros
     */
    async function callGeminiAPI(prompt, options = {}) {
        try {
            checkRateLimit();

            const payload = {
                contents: [{
                    role: "user",
                    parts: [{ text: prompt }]
                }]
            };

            // Merge com opções customizadas
            if (options.generationConfig) {
                payload.generationConfig = options.generationConfig;
            }

            const apiKey = getNextApiKey();
            const url = `${API_CONFIG.endpoint}?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({ 
                    error: { message: response.statusText } 
                }));
                
                // Se chave inválida, tenta próxima
                if (response.status === 403 || response.status === 401) {
                    console.warn('Chave API inválida, tentando próxima...');
                    if (API_CONFIG.currentIndex !== 0) {
                        return callGeminiAPI(prompt, options);
                    }
                }
                
                throw new Error(errorBody?.error?.message || response.statusText);
            }

            const result = await response.json();

            if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
                return {
                    success: true,
                    text: result.candidates[0].content.parts[0].text,
                    raw: result
                };
            } else {
                throw new Error("Resposta inválida da API");
            }

        } catch (error) {
            console.error('Erro na API Gemini:', error);
            return {
                success: false,
                error: error.message,
                suggestion: getErrorSuggestion(error.message)
            };
        }
    }

    /**
     * Sugestões de erro para o usuário
     */
    function getErrorSuggestion(errorMessage) {
        if (errorMessage.includes('limite')) {
            return 'Tente novamente em alguns minutos ou reformule sua consulta.';
        }
        if (errorMessage.includes('API_KEY')) {
            return 'As chaves de API precisam ser atualizadas. Entre em contato com o suporte.';
        }
        if (errorMessage.includes('rede') || errorMessage.includes('network')) {
            return 'Verifique sua conexão com a internet.';
        }
        return 'Tente novamente ou entre em contato com o suporte.';
    }

    /**
     * Reseta contadores de rate limit (uso em debug)
     */
    function resetRateLimit() {
        API_CONFIG.rateLimit.requestCount = 0;
        API_CONFIG.rateLimit.lastRequest = 0;
        console.log('Rate limit resetado');
    }

    // Exporta funções públicas
    window.GeminiAPI = {
        call: callGeminiAPI,
        resetRateLimit: resetRateLimit, // Apenas para debug
        getStatus: () => ({
            requestsToday: API_CONFIG.rateLimit.requestCount,
            requestsRemaining: API_CONFIG.rateLimit.requestsPerDay - API_CONFIG.rateLimit.requestCount,
            resetTime: new Date(API_CONFIG.rateLimit.resetTime)
        })
    };

    // Função legada para compatibilidade
    window.getApiKey = function() {
        console.warn('getApiKey() está deprecated. Use GeminiAPI.call() diretamente.');
        return getNextApiKey();
    };

})();
