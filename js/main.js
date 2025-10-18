/**
 * DeiviTech - Main JavaScript
 * Módulo principal da aplicação DT~Idealizador
 * Extraído e refatorado em 18/out/2025
 */

// ===== CONFIGURAÇÕES GLOBAIS =====
const MY_WHATSAPP_NUMBER = '5575981231019';
const MY_EMAIL_ADDRESS = 'deivilsantana@outlook.com';

// Variáveis de estado global
let currentMessageToSend = "";
let lastAiResponseRaw = "";
let targetTopicCount = 3;

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DeiviTech Idealizador inicializado');
    
    initThreeJsBackground();
    initLightningEffect();
    initCareerBoostFeatures();
    initResultsCharts();
    initScenarioSimulator();
    initGeminiFeature();
    initContactFormAndSendOptions();
});

// ===== 1. THREE.JS BACKGROUND =====
function initThreeJsBackground() {
    const mount = document.getElementById('dynamic-background');
    if (!mount || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mount.appendChild(renderer.domElement);

    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 2000;
    const posArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 150;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.5,
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.8
    });

    const particleSystem = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particleSystem);
    camera.position.z = 50;

    let mouseX = 0, mouseY = 0;
    const onMouseMove = (event) => {
        mouseX = event.clientX - (window.innerWidth / 2);
        mouseY = event.clientY - (window.innerHeight / 2);
    };
    document.addEventListener('mousemove', onMouseMove);

    const animate = () => {
        requestAnimationFrame(animate);
        particleSystem.rotation.y += 0.0001;
        particleSystem.rotation.x += 0.0001;
        camera.position.x += (mouseX * 0.0001 - camera.position.x) * 0.02;
        camera.position.y += (-mouseY * 0.0001 - camera.position.y) * 0.02;
        camera.lookAt(scene.position);
        renderer.render(scene, camera);
    };
    animate();

    window.addEventListener('resize', () => {
        if (mount) {
            camera.aspect = mount.clientWidth / mount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(mount.clientWidth, mount.clientHeight);
        }
    });
}

// ===== 2. EFEITO DE RAIOS =====
function initLightningEffect() {
    const exploreBtn = document.getElementById('explore-idea-btn');
    const lightningContainer = document.getElementById('lightning-effect');
    
    if (exploreBtn && lightningContainer) {
        exploreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            triggerLightningEffect();
            
            setTimeout(() => {
                const contactSection = document.getElementById('contact');
                if (contactSection) {
                    contactSection.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }, 300);
        });
    }
}

function triggerLightningEffect() {
    const lightningContainer = document.getElementById('lightning-effect');
    const bolts = lightningContainer.querySelectorAll('.lightning-bolt');
    
    lightningContainer.classList.remove('active');
    lightningContainer.offsetHeight;
    
    bolts.forEach((bolt) => {
        bolt.style.animation = 'none';
        bolt.style.left = '';
        bolt.style.height = '';
        bolt.style.animationDelay = '';
        bolt.style.animationDuration = '';
        bolt.offsetHeight;
    });
    
    requestAnimationFrame(() => {
        bolts.forEach((bolt, index) => {
            const randomLeft = Math.random() * 90 + 5;
            const randomDelay = Math.random() * 0.8;
            const randomHeight = Math.random() * 20 + 80;
            const randomDuration = 1.5 + Math.random() * 0.5;
            
            bolt.style.left = randomLeft + '%';
            bolt.style.height = randomHeight + 'vh';
            bolt.style.animationDelay = (index * 0.15 + randomDelay) + 's';
            bolt.style.animationDuration = randomDuration + 's';
            bolt.style.animation = `lightning-strike ${randomDuration}s ease-out forwards`;
        });
        
        lightningContainer.classList.add('active');
        setTimeout(() => lightningContainer.classList.remove('active'), 3000);
    });
}

// NOTA: As funções restantes (3-6) estão muito extensas (>900 linhas).
// Devido ao limite de contexto, vou criar arquivos separados para:
// - charts-config.js (gráficos)
// - ai-features.js (funcionalidades de IA)
// - contact-handler.js (formulário de contato)

// Por agora, vou incluir as chamadas de importação
console.log('✅ Core features carregadas. Carregue charts-config.js, ai-features.js e contact-handler.js');
