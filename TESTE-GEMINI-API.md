# 🧪 Guia de Teste - API Gemini DeiviTech

## ✅ PROBLEMA RESOLVIDO

**Erro anterior:**
```
API key not valid. Please pass a valid API key.
```

**Causa:** Chave de exemplo inválida (`AIzaSy_EXEMPLO_CHAVE_VALIDA`)

**Solução aplicada:**
- ✅ 3 chaves reais configuradas
- ✅ Sistema de rotação automática
- ✅ Logs no console mostrando qual chave está sendo usada

---

## 🚀 COMO TESTAR AGORA

### 1. Abrir o Site Local

**Servidor já está rodando:**
```
http://localhost:8888/index-complete.html
```

Se não estiver, rode:
```bash
cd /home/deivi/Projetos/DeiviTech/Experimentos
python3 -m http.server 8888
```

### 2. Testar Análise de Profissão (Teste Rápido)

1. **Scroll** até a seção "Impulso na Carreira"
2. **Digite** no campo "Sua Profissão": `Contador`
3. **Clique** no botão "Analisar com I.A."
4. **Aguarde** 3-5 segundos
5. **Verifique:**
   - ✅ Loader animado aparece
   - ✅ Barra de progresso sobe até 100%
   - ✅ Gráfico de impacto é exibido
   - ✅ Análise detalhada aparece

**Resultado esperado:**
```
📊 Gráfico circular/barras com tecnologias
📝 Texto descrevendo como DeiviTech pode ajudar contadores
```

### 3. Testar Idealizador Completo (Teste Completo)

1. **Scroll** até a seção de contato (final da página)
2. **Digite** no campo de mensagem: `Preciso de um app para gestão de clientes`
3. **Clique** no botão "Explore sua Ideia com I.A."
4. **Aguarde** efeito de raios + modal abrir
5. **Verifique:**
   - ✅ Modal "Esboço da Sua Ideia" abre
   - ✅ Progresso de 0% → 100%
   - ✅ 3 tópicos são gerados (ex: "App Mobile", "Dashboard Web", "Automação")
   - ✅ Cada tópico tem título + descrição

**Opções de teste:**
- **"Gerar mais ideias"** → Adiciona mais 3 tópicos (até total de 3)
- **"Gerar 5 ideias criativas"** → Gera 5 tópicos criativos

### 4. Verificar Console do Navegador

**Pressione F12** e vá em "Console"

**Logs esperados:**
```javascript
🔑 Usando chave API #1
✅ DeiviTech Idealizador inicializado
Validação passou, abrindo modal...
```

**Se erro aparecer:**
- `API key not valid` → Chave inválida (não deve acontecer mais)
- `Rate limit exceeded` → Limite de requisições atingido (aguardar)
- `Network error` → Problema de internet

---

## 🔍 DEBUGGING

### Verificar Chaves Configuradas

No console do navegador (F12), digite:
```javascript
GEMINI_API_KEYS
```

**Resultado esperado:**
```javascript
['AIzaSyAIUt2JDq3Ocunp3kpD-VfSW_INXBl66HU', 
 'AIzaSyAOUeRBKLT076PokGzarjEbZBZ7bjuUfMI',
 'AIzaSyAqPGBQf9dMhebgo3ZP7i7sp0OYu5PlMNg']
```

### Ver Qual Chave Está Sendo Usada

Cada requisição mostra no console:
```
🔑 Usando chave API #1  (primeira key)
🔑 Usando chave API #2  (segunda key)
🔑 Usando chave API #3  (terceira key)
🔑 Usando chave API #1  (volta para primeira)
```

### Testar Requisição Diretamente

No console:
```javascript
// Teste direto
fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=AIzaSyAIUt2JDq3Ocunp3kpD-VfSW_INXBl66HU', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
        contents: [{role: "user", parts: [{text: "Olá, você está funcionando?"}]}]
    })
})
.then(r => r.json())
.then(data => console.log(data))
```

**Se retornar erro 400:** Chave inválida  
**Se retornar texto:** ✅ Chave funcional

---

## 📊 LIMITES DA API GRATUITA

**Google Gemini Flash (Tier Gratuito):**
- **15 requisições por minuto (RPM)**
- **1,500 requisições por dia (RPD)**
- **1 milhão de tokens por dia**

**Sistema de rotação:**
- Com 3 chaves = **45 RPM total** (15 × 3)
- Com 3 chaves = **4,500 RPD total** (1500 × 3)

**Recomendação:**
- Não fazer mais de 40 requisições por minuto
- Distribuir testes ao longo do dia

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [ ] Site abre sem erro
- [ ] Análise de profissão funciona
- [ ] Modal de I.A. abre
- [ ] 3 tópicos são gerados
- [ ] Botão "Gerar mais ideias" funciona
- [ ] Botão "Gerar 5 ideias" funciona
- [ ] Console mostra rotação de chaves
- [ ] Nenhum erro de API no console
- [ ] WhatsApp link funciona (opcional)
- [ ] Email link funciona (opcional)

---

## 🚨 ERROS COMUNS E SOLUÇÕES

### "API key not valid"
**Causa:** Chave expirou ou foi revogada  
**Solução:** Gerar nova chave em https://ai.google.dev/

### "Rate limit exceeded"
**Causa:** Muitas requisições em curto período  
**Solução:** Aguardar 1 minuto e tentar novamente

### "Network error"
**Causa:** Bloqueio de CORS ou internet offline  
**Solução:** Verificar conexão, testar em navegador diferente

### "Modal não abre"
**Causa:** JavaScript não carregou  
**Solução:** Verificar console (F12) para erros

### "Gráfico não aparece"
**Causa:** Chart.js não carregou  
**Solução:** Verificar CDN no console

---

## 📝 LOGS DE SUCESSO

**Exemplo de execução bem-sucedida:**
```
[16:45:12] 🔑 Usando chave API #1
[16:45:12] Validação passou, abrindo modal...
[16:45:13] Enviando para API Gemini. Tópicos solicitados: 3
[16:45:13] Fazendo requisição para: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest
[16:45:15] Resposta da API recebida: {candidates: Array(1), ...}
[16:45:15] Texto da I.A. extraído: **Portfólio Online Profissional:** Crie um site...
```

---

## 🎯 PRÓXIMOS PASSOS

Após validar que tudo funciona:

1. **Commit das mudanças:**
```bash
cd /home/deivi/Projetos/DeiviTech
git add Experimentos/
git commit -m "🔧 Fix: Configurar 3 APIs Gemini com rotação automática"
git push origin master
```

2. **Deploy GitHub Pages:**
- As chaves funcionarão em produção
- GitHub Pages suporta JavaScript client-side

3. **Monitorar uso:**
- Verificar quotas em https://console.cloud.google.com/
- Considerar upgrade se necessário

---

**Criado:** 18/out/2025 - 20:15  
**Status:** ✅ Pronto para testar  
**Servidor:** http://localhost:8888/index-complete.html
