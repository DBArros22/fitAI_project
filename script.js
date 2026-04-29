Sim, este é o seu app.js completo e revisado. Eu organizei a lógica para que ele gerencie a criação de exercícios, a exclusão e o salvamento automático no navegador.

Pode copiar e colar no seu arquivo:

JavaScript
/**
 * FitAI - Logica de Gestão de Treinos
 * Funcionalidades: Adicionar, Listar, Remover e Persistência Local
 */

// 1. Exibir data atual formatada no topo
const campoData = document.getElementById('data-atual');
if (campoData) {
    campoData.innerText = new Date().toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
    });
}

// 2. Inicializar lista de treinos buscando do LocalStorage (ou vazio se for a primeira vez)
let treinos = JSON.parse(localStorage.getItem('meuTreino')) || [];

/**
 * Renderiza a lista de exercícios na tela
 */
function renderizarTreino() {
    const lista = document.getElementById('lista-treino');
    if (!lista) return;

    lista.innerHTML = "";

    if (treinos.length === 0) {
        lista.innerHTML = `
            <div class="text-center py-10">
                <p class="text-gray-500 italic">Nenhum exercício na lista.</p>
                <p class="text-gray-600 text-xs mt-2">Adicione seu primeiro exercício ao lado!</p>
            </div>`;
        return;
    }

    treinos.forEach((item, index) => {
        lista.innerHTML += `
            <div class="flex justify-between items-center bg-gray-900 p-4 rounded-lg border-l-4 border-blue-500 hover:border-blue-400 transition-all shadow-sm">
                <div>
                    <h4 class="font-bold text-white uppercase text-sm tracking-wide">${item.nome}</h4>
                    <p class="text-gray-400 text-xs">
                        ${item.series} Séries x ${item.reps} Reps | 
                        Carga: <span class="text-blue-400 font-bold">${item.carga || '0'}kg</span>
                    </p>
                </div>
                <button onclick="removerExercicio(${index})" class="text-gray-600 hover:text-red-500 transition-colors p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        `;
    });

    // Salva a lista atualizada no navegador
    localStorage.setItem('meuTreino', JSON.stringify(treinos));
}

/**
 * Captura os dados do formulário e adiciona ao array
 */
function adicionarExercicio() {
    const inputNome = document.getElementById('nome-ex');
    const inputSeries = document.getElementById('series-ex');
    const inputReps = document.getElementById('reps-ex');
    const inputCarga = document.getElementById('carga-ex');

    // Validação básica
    if (!inputNome.value || !inputSeries.value || !inputReps.value) {
        alert("Ops! Preencha pelo menos o Nome, Séries e Repetições.");
        return;
    }

    const novoExercicio = {
        nome: inputNome.value,
        series: inputSeries.value,
        reps: inputReps.value,
        carga: inputCarga.value || "0"
    };

    // Adiciona ao início da lista
    treinos.unshift(novoExercicio);
    
    // Limpar os campos do formulário
    inputNome.value = "";
    inputSeries.value = "";
    inputReps.value = "";
    inputCarga.value = "";

    renderizarTreino();
}

/**
 * Remove um exercício específico pelo índice
 */
window.removerExercicio = function(index) {
    treinos.splice(index, 1);
    renderizarTreino();
};

/**
 * Apaga todos os exercícios salvos
 */
window.limparTreino = function() {
    if (confirm("Tem certeza que deseja apagar todo o treino?")) {
        treinos = [];
        renderizarTreino();
    }
};

// Inicialização automática ao carregar o script
renderizarTreino();
console.log("FitAI: Sistema de gestão local carregado.");
