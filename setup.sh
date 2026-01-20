#!/bin/bash

# 🚀 DeiviTech Experimentos - Setup Script
# Configuração rápida do ambiente de desenvolvimento

echo "🔧 Configurando DeiviTech Experimentos..."

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 não encontrado. Instale primeiro:"
    echo "sudo pacman -S python"
    exit 1
fi

# Verificar Node.js (opcional)
if command -v node &> /dev/null; then
    echo "✅ Node.js encontrado: $(node --version)"
else
    echo "⚠️ Node.js não encontrado (opcional para este projeto)"
fi

# Iniciar servidor de desenvolvimento
echo "🌐 Iniciando servidor local..."
echo "📱 Site disponível em: http://localhost:8888"
echo ""
echo "🎯 Links úteis:"
echo "   • Site Original: http://localhost:8888/DT~Idealizador.html"
echo "   • Versão V2: http://localhost:8888/index-v2.html"
echo "   • Teste API: http://localhost:8888/teste-api.html"
echo "   • Diagnóstico: http://localhost:8888/DIAGNOSTICO-COMPLETO.md"
echo ""
echo "🛠️ Comandos úteis:"
echo "   • Parar servidor: pkill -f 'python3 -m http.server'"
echo "   • Reiniciar: ./setup.sh"
echo "   • Logs: tail -f /dev/null 2>&1 | python3 -m http.server 8888"
echo ""

# Verificar se já está rodando
if lsof -i :8888 &> /dev/null; then
    echo "⚠️ Servidor já rodando na porta 8888"
    echo "🔄 Reiniciando..."
    pkill -f 'python3 -m http.server'
    sleep 2
fi

# Iniciar servidor
cd "$(dirname "$0")"
python3 -m http.server 8888 2>&1 | while read line; do
    echo "📡 $line"
done &

echo "✅ Servidor iniciado! Pressione Ctrl+C para parar."
echo ""
echo "🧪 TESTES RECOMENDADOS:"
echo "1. Teste API: Configure chaves válidas primeiro!"
echo "2. Teste responsividade: Abra no celular"
echo "3. Teste performance: DevTools > Performance"
echo "4. Teste acessibilidade: DevTools > Lighthouse"

# Abrir browser automaticamente (opcional)
if command -v xdg-open &> /dev/null; then
    sleep 2
    xdg-open http://localhost:8888/index-v2.html
fi

echo "🎯 Ready para desenvolvimento!"