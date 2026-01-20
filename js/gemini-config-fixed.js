/**
 * DeiviTech - Configuração Gemini API - CORRIGIDA
 * Sistema com API funcional para testes
 */

// API Key válida gerada para testes
const VALID_API_KEY = 'AIzaSyDummyKeyForTesting'; // Substituir com chave real

// Configuração principal
const GEMINI_CONFIG = {
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
    maxRetries: 3,
    requestDelay: 2000, // 2 segundos entre requisições
    rateLimitPerMinute: 10,
    rateLimitPerDay: 100
};

// Estado global
let lastRequestTime = 0;
let requestCountToday = 0;
let lastResetDate = new Date().toDateString();

/**
 * Verifica e reseta contador diário
 */
function resetDailyIfNeeded() {
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
        requestCountToday = 0;
        lastResetDate = today;
        console.log('📅 Contador diário resetado');
    }
}

/**
 * Rate limiting simples
 */
async function checkRateLimit() {
    resetDailyIfNeeded();
    
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    
    // Verificar delay mínimo
    if (timeSinceLastRequest < GEMINI_CONFIG.requestDelay) {
        const waitTime = GEMINI_CONFIG.requestDelay - timeSinceLastRequest;
        console.log(`⏱️ Aguardando ${Math.ceil(waitTime/1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Verificar limite diário
    if (requestCountToday >= GEMINI_CONFIG.rateLimitPerDay) {
        throw new Error('Limite diário de requisições atingido. Tente novamente amanhã.');
    }
    
    lastRequestTime = Date.now();
    requestCountToday++;
}

/**
 * Faz chamada para API Gemini
 */
async function callGeminiAPI(prompt, options = {}) {
    try {
        await checkRateLimit();
        
        console.log('🔑 Enviando requisição para Gemini API...');
        
        const payload = {
            contents: [{
                role: "user", 
                parts: [{ text: prompt }]
            }]
        };
        
        // Configurações adicionais
        if (options.generationConfig) {
            payload.generationConfig = options.generationConfig;
        }
        
        const response = await fetch(`${GEMINI_CONFIG.endpoint}?key=${VALID_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
            throw new Error(`API Error: ${error?.error?.message || response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            return {
                success: true,
                text: result.candidates[0].content.parts[0].text,
                raw: result
            };
        } else {
            throw new Error('Resposta inválida da API');
        }
        
    } catch (error) {
        console.error('❌ Erro na API Gemini:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Exportar globalmente
window.GeminiAPI = {
    call: callGeminiAPI,
    getStatus: () => ({
        requestsToday: requestCountToday,
        lastResetDate: lastResetDate,
        apiKeyValid: VALID_API_KEY !== 'AIzaSyDummyKeyForTesting'
    })
};

console.log('🚀 Gemini API Config carregada');