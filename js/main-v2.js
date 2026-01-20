/**
 * DeiviTech - Main JavaScript Refatorado
 * Versão Modular e Otimizada - v2.0
 * Correções de bugs, performance e melhorias
 */

// ===== CONFIGURAÇÕES GLOBAIS =====
const CONFIG = {
    contact: {
        whatsapp: '5575981231019',
        email: 'deivilsantana@outlook.com'
    },
    animation: {
        particleCount: 1500, // Reduzido para performance
        maxFPS: 60,
        mouseInfluence: 0.0001
    },
    performance: {
        debounceTime: 300,
        throttleTime: 16, // ~60fps
        enableCache: true
    }
};

// ===== ESTADO GLOBAL OTIMIZADO =====
const state = {
    currentMessage: "",
    lastAiResponseRaw: "",
    targetTopicCount: 3,
    isProcessing: false,
    animationFrame: null,
    charts: new Map(),
    cache: new Map()
};

// ===== UTILITÁRIOS DE PERFORMANCE =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Safe DOM access com fallback
function safeGetElement(id, required = true) {
    const element = document.getElementById(id);
    if (!element && required) {
        console.warn(`⚠️ Elemento não encontrado: #${id}`);
        return null;
    }
    return element;
}

// ===== INICIALIZAÇÃO MELHORADA =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DeiviTech v2.0 inicializando...');
    
    // Verificar dependências
    if (!window.GeminiAPI) {
        console.error('❌ GeminiAPI não encontrado. Carregue gemini-config-v2.js primeiro.');
        return;
    }
    
    // Inicializar componentes
    initializeComponents()
        .then(() => {
            console.log('✅ Todos os componentes inicializados');
            setupEventListeners();
            startPerformanceMonitoring();
        })
        .catch(error => {
            console.error('❌ Erro na inicialização:', error);
        });
});

async function initializeComponents() {
    const components = [
        initThreeJsBackground,
        initLightningEffect,
        initCareerBoostFeatures,
        initResultsCharts,
        initScenarioSimulator,
        initGeminiFeature,
        initContactForm
    ];
    
    for (const component of components) {
        try {
            await component();
        } catch (error) {
            console.warn('⚠️ Componente falhou:', component.name, error);
        }
    }
}

// ===== 1. THREE.JS OTIMIZADO =====
function initThreeJsBackground() {
    return new Promise((resolve) => {
        const mount = safeGetElement('dynamic-background');
        if (!mount || typeof THREE === 'undefined') {
            resolve();
            return;
        }

        // Scene otimizada
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ 
            alpha: true, 
            antialias: true,
            powerPreference: 'high-performance'
        });
        
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limitar para performance
        mount.appendChild(renderer.domElement);

        // Sistema de partículas otimizado
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = CONFIG.animation.particleCount;
        const posArray = new Float32Array(particlesCount * 3);

        for (let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 100;
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.8,
            color: 0x22d3ee,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        const particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particleSystem);
        camera.position.z = 50;

        // Mouse movement otimizado
        let mouseX = 0, mouseY = 0;
        const handleMouseMove = throttle((event) => {
            mouseX = (event.clientX - window.innerWidth / 2) * CONFIG.animation.mouseInfluence;
            mouseY = (event.clientY - window.innerHeight / 2) * CONFIG.animation.mouseInfluence;
        }, CONFIG.animation.throttleTime);

        document.addEventListener('mousemove', handleMouseMove);

        // Animation loop otimizado
        let frameCount = 0;
        const animate = () => {
            state.animationFrame = requestAnimationFrame(animate);
            frameCount++;
            
            // Reduzir atualizações para performance
            if (frameCount % 2 === 0) {
                particleSystem.rotation.y += 0.0005;
                particleSystem.rotation.x += 0.0003;
                
                camera.position.x += (mouseX - camera.position.x) * 0.02;
                camera.position.y += (-mouseY - camera.position.y) * 0.02;
                camera.lookAt(scene.position);
            }
            
            renderer.render(scene, camera);
        };
        
        animate();

        // Resize handler otimizado
        const handleResize = debounce(() => {
            if (mount && mount.clientWidth > 0) {
                camera.aspect = mount.clientWidth / mount.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(mount.clientWidth, mount.clientHeight);
            }
        }, CONFIG.performance.debounceTime);
        
        window.addEventListener('resize', handleResize);
        
        // Cleanup
        state.charts.set('threejs', {
            scene, camera, renderer, particleSystem,
            cleanup: () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('resize', handleResize);
                mount.removeChild(renderer.domElement);
                renderer.dispose();
            }
        });
        
        console.log('🎨 Three.js background otimizado');
        resolve();
    });
}

// ===== 2. EFEITO DE RAIOS MELHORADO =====
function initLightningEffect() {
    const exploreBtn = safeGetElement('explore-idea-btn');
    const lightningContainer = safeGetElement('lightning-effect');
    
    if (!exploreBtn || !lightningContainer) return;

    exploreBtn.addEventListener('click', (e) => {
        e.preventDefault();
        triggerLightningEffect();
        
        setTimeout(() => {
            const contactSection = safeGetElement('contact');
            if (contactSection) {
                contactSection.scrollIntoView({ behavior: 'smooth' });
            }
        }, 800);
    });

    function triggerLightningEffect() {
        lightningContainer.classList.add('active');
        
        // Criar múltiplos raios
        const boltCount = 5;
        for (let i = 0; i < boltCount; i++) {
            setTimeout(() => createLightningBolt(i), i * 100);
        }
        
        setTimeout(() => {
            lightningContainer.classList.remove('active');
            lightningContainer.innerHTML = '';
        }, 1500);
    }

    function createLightningBolt(index) {
        const bolt = document.createElement('div');
        bolt.className = 'lightning-bolt';
        
        // Posição e direção aleatória
        const startX = Math.random() * 100;
        const height = 30 + Math.random() * 50;
        const angle = -30 + Math.random() * 60;
        
        bolt.style.cssText = `
            left: ${startX}%;
            height: ${height}%;
            transform: rotate(${angle}deg);
            opacity: ${0.6 + Math.random() * 0.4};
        `;
        
        lightningContainer.appendChild(bolt);
        
        // Animação
        setTimeout(() => {
            bolt.style.opacity = '0';
            bolt.style.transform += ' scale(0.5)';
        }, 100);
    }
}

// ===== 3. ANÁLISE DE PROFISSÃO MELHORADA =====
function initCareerBoostFeatures() {
    const analyzeBtn = safeGetElement('analyze-profession-btn');
    const professionInput = safeGetElement('profession-input');
    
    if (!analyzeBtn || !professionInput) return;

    analyzeBtn.addEventListener('click', handleProfessionAnalysis);
    
    async function handleProfessionAnalysis() {
        const profession = professionInput.value.trim();
        if (!profession) {
            showNotification('Por favor, digite uma profissão', 'warning');
            return;
        }
        
        if (state.isProcessing) {
            showNotification('Análise em andamento...', 'info');
            return;
        }
        
        state.isProcessing = true;
        analyzeBtn.disabled = true;
        analyzeBtn.textContent = 'Analisando...';
        
        try {
            showProfessionLoader();
            
            const response = await GeminiAPI.call(
                `Analise a profissão "${profession}" e como a tecnologia DeiviTech pode ajudar. 
                Responda em formato JSON: {
                    "technologies": ["Tecnologia 1", "Tecnologia 2", ...],
                    "impact": "Descrição do impacto",
                    "opportunities": ["Oportunidade 1", "Oportunidade 2", ...],
                    "growth_areas": ["Área 1", "Área 2", ...]
                }`,
                { generationConfig: { temperature: 0.7 } }
            );
            
            if (response.success) {
                displayProfessionAnalysis(response.text, profession);
            } else {
                throw new Error(response.error);
            }
            
        } catch (error) {
            console.error('Erro na análise:', error);
            showProfessionError(error.message);
        } finally {
            state.isProcessing = false;
            analyzeBtn.disabled = false;
            analyzeBtn.textContent = 'Analisar com I.A.';
            hideProfessionLoader();
        }
    }
}

function showProfessionLoader() {
    const elements = [
        'profession-loader',
        'profession-analysis-result'
    ];
    
    elements.forEach(id => {
        const el = safeGetElement(id);
        if (el) {
            el.classList.toggle('hidden', id.includes('result'));
        }
    });
    
    // Simular progresso
    simulateProfessionProgress();
}

function simulateProfessionProgress() {
    const progressText = safeGetElement('profession-analysis-text');
    const messages = [
        'Analisando mercado de trabalho...',
        'Identificando tendências tecnológicas...',
        'Gerando insights personalizados...',
        'Preparando recomendações...'
    ];
    
    let messageIndex = 0;
    const interval = setInterval(() => {
        if (progressText && messageIndex < messages.length) {
            progressText.textContent = messages[messageIndex];
            messageIndex++;
        } else {
            clearInterval(interval);
        }
    }, 800);
}

function hideProfessionLoader() {
    const loader = safeGetElement('profession-loader');
    if (loader) {
        loader.classList.add('hidden');
    }
}

function displayProfessionAnalysis(analysisText, profession) {
    let analysis;
    try {
        analysis = JSON.parse(analysisText);
    } catch (error) {
        console.warn('Resposta não é JSON, tentando extrair...');
        analysis = parseAnalysisFromText(analysisText);
    }
    
    const resultContainer = safeGetElement('profession-analysis-content');
    if (!resultContainer) return;
    
    resultContainer.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 class="text-2xl font-bold text-gradient mb-4">
                🎯 Análise: ${profession}
            </h3>
            
            ${analysis.impact ? `
                <div class="mb-6">
                    <h4 class="text-lg font-semibold text-cyan-400 mb-2">📈 Impacto Tecnológico</h4>
                    <p class="text-gray-300">${analysis.impact}</p>
                </div>
            ` : ''}
            
            ${analysis.technologies?.length ? `
                <div class="mb-6">
                    <h4 class="text-lg font-semibold text-purple-400 mb-3">🛠️ Tecnologias Recomendadas</h4>
                    <div class="flex flex-wrap gap-2">
                        ${analysis.technologies.map(tech => `
                            <span class="px-3 py-1 bg-purple-900 bg-opacity-30 border border-purple-400 rounded-full text-sm">
                                ${tech}
                            </span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${analysis.opportunities?.length ? `
                <div class="mb-6">
                    <h4 class="text-lg font-semibold text-green-400 mb-3">🚀 Oportunidades</h4>
                    <ul class="list-disc list-inside space-y-2 text-gray-300">
                        ${analysis.opportunities.map(opp => `
                            <li>${opp}</li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
            
            <div class="mt-6 text-center">
                <button onclick="scrollToContact()" class="bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold py-2 px-6 rounded-lg hover:from-cyan-600 hover:to-purple-700 transition-all duration-300">
                    💬 Falar com Especialista
                </button>
            </div>
        </div>
    `;
    
    // Mostrar resultado
    const resultElement = safeGetElement('profession-analysis-result');
    if (resultElement) {
        resultElement.classList.remove('hidden');
    }
    
    // Criar gráfico
    if (analysis.technologies?.length) {
        createProfessionChart(analysis.technologies);
    }
}

function parseAnalysisFromText(text) {
    // Fallback para extrair informações de texto não-estruturado
    return {
        impact: text.substring(0, 200) + '...',
        technologies: ['Automação', 'IA', 'Cloud Computing'],
        opportunities: ['Otimização de Processos', 'Novas Fontes de Receita'],
        growth_areas: ['Consultoria Digital', 'Desenvolvimento de Soluções']
    };
}

function showProfessionError(errorMessage) {
    const resultContainer = safeGetElement('profession-analysis-content');
    if (!resultContainer) return;
    
    resultContainer.innerHTML = `
        <div class="bg-red-900 bg-opacity-30 border border-red-400 rounded-lg p-6 text-center">
            <h4 class="text-xl font-bold text-red-400 mb-3">❌ Erro na Análise</h4>
            <p class="text-gray-300 mb-4">${errorMessage}</p>
            <button onclick="retryProfessionAnalysis()" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                🔄 Tentar Novamente
            </button>
        </div>
    `;
    
    const resultElement = safeGetElement('profession-analysis-result');
    if (resultElement) {
        resultElement.classList.remove('hidden');
    }
}

function retryProfessionAnalysis() {
    document.getElementById('analyze-profession-btn')?.click();
}

// ===== 4. GRÁFICOS OTIMIZADOS =====
function createProfessionChart(technologies) {
    const chartContainer = safeGetElement('professionImpactChart');
    if (!chartContainer) return;
    
    // Destruir gráfico anterior se existir
    const existingChart = state.charts.get('profession');
    if (existingChart) {
        existingChart.destroy();
    }
    
    const ctx = chartContainer.getContext('2d');
    const chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: technologies,
            datasets: [{
                data: technologies.map(() => Math.random() * 30 + 20), // Dados simulados
                backgroundColor: [
                    '#06b6d4', '#0891b2', '#22d3ee', '#67e8f9', '#a5f3fc',
                    '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#e5e7eb',
                        padding: 15,
                        font: { size: 12 }
                    }
                }
            }
        }
    });
    
    state.charts.set('profession', chart);
}

// ===== 5. SISTEMA DE NOTIFICAÇÕES =====
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const colors = {
        info: 'bg-blue-600',
        success: 'bg-green-600',
        warning: 'bg-yellow-600',
        error: 'bg-red-600'
    };
    
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Remover automaticamente
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 4000);
}

// ===== 6. EVENT LISTENERS GLOBAIS =====
function setupEventListeners() {
    // Formulário de contato
    const contactForm = safeGetElement('contact-form', false);
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }
    
    // Scroll suave para links internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = safeGetElement(this.getAttribute('href').substring(1));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Tecla Esc para fechar modais
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    console.log('🎧 Event listeners configurados');
}

function handleContactSubmit(e) {
    e.preventDefault();
    
    const name = safeGetElement('contact-name')?.value;
    const email = safeGetElement('contact-email')?.value;
    const phone = safeGetElement('contact-phone')?.value;
    const message = safeGetElement('message-input')?.value;
    
    if (!name || !email || !message) {
        showNotification('Preencha todos os campos obrigatórios', 'warning');
        return;
    }
    
    // Construir mensagem para WhatsApp
    const whatsappMessage = encodeURIComponent(
        `🚀 Contato via DeiviTech\n\n` +
        `👤 Nome: ${name}\n` +
        `📧 Email: ${email}\n` +
        `📱 Telefone: ${phone || 'Não informado'}\n` +
        `💬 Mensagem: ${message}`
    );
    
    window.open(`https://wa.me/${CONFIG.contact.whatsapp}?text=${whatsappMessage}`, '_blank');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

function scrollToContact() {
    const contact = safeGetElement('contact');
    if (contact) {
        contact.scrollIntoView({ behavior: 'smooth' });
    }
}

// ===== 7. MONITORAMENTO DE PERFORMANCE =====
function startPerformanceMonitoring() {
    if ('performance' in window) {
        setInterval(() => {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                console.log('📊 Performance:', {
                    loadTime: Math.round(perfData.loadEventEnd - perfData.loadEventStart),
                    domContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart)
                });
            }
        }, 30000); // A cada 30 segundos
    }
}

// ===== 8. LIMPEZA DE MEMÓRIA =====
window.addEventListener('beforeunload', () => {
    // Cancelar animações
    if (state.animationFrame) {
        cancelAnimationFrame(state.animationFrame);
    }
    
    // Destruir gráficos
    state.charts.forEach(chart => {
        if (chart.destroy) chart.destroy();
        if (chart.cleanup) chart.cleanup();
    });
    
    // Limpar cache
    state.cache.clear();
    
    console.log('🧹 Memória limpa');
});

// ===== EXPORTS GLOBAIS =====
window.DeiviTech = {
    state,
    showNotification,
    scrollToContact,
    retryProfessionAnalysis,
    CONFIG
};

console.log('✅ DeiviTech v2.0 carregado com sucesso!');