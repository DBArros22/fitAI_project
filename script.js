const dicionarioExercicios = {
    "Peito": [
        "Supino Reto (Barra)", 
        "Supino Inclinado (Halter)", 
        "Crucifixo Máquina (Peck Deck)", 
        "Crossover Polia Alta", 
        "Supino Declinado", 
        "Flexão de Braços (Push-up)",
        "Dips (Paralelas - Foco Peito)"
    ],
    "Costas": [
        "Puxada Alta (Lat Pulldown)", 
        "Remada Baixa Sentado", 
        "Remada Curvada (Barra)", 
        "Pull Down Corda", 
        "Levantamento Terra (Deadlift)", 
        "Barra Fixa (Pull-up)",
        "Remada Unilateral (Serrote)"
    ],
    "Pernas": [
        "Agachamento Livre (Back Squat)", 
        "Leg Press 45°", 
        "Cadeira Extensora", 
        "Mesa Flexora", 
        "Afundo / Passada", 
        "Hack Squat",
        "Elevação de Gêmeos (Panturrilha)",
        "Stiff (Peso Morto Romeno)"
    ],
    "Ombros": [
        "Desenvolvimento Militar (Overhead Press)", 
        "Elevação Lateral (Halter)", 
        "Elevação Frontal", 
        "Crucifixo Inverso (Posterior de Ombro)",
        "Desenvolvimento Arnold",
        "Encolhimento (Trapézio)"
    ],
    "Braços": [
        "Rosca Direta (Barra W)", 
        "Tríceps Pulley (Corda)", 
        "Rosca Martelo", 
        "Tríceps Testa", 
        "Rosca Concentrada",
        "Tríceps Coice (Halter)",
        "Rosca Scott"
    ],
    "Core": [
        "Prancha Abdominal (Plank)", 
        "Abdominal Supra (Crunch)", 
        "Elevação de Pernas (Infra)", 
        "Abdominal Roda (Ab Wheel)",
        "Prancha Lateral",
        "Russian Twist"
    ]
};

let treinos = JSON.parse(localStorage.getItem('meuTreinoPro')) || [];
let diasTreinados = JSON.parse(localStorage.getItem('frequenciaTreino')) || [];

/**
 * Popula o select de exercícios com base no grupo selecionado
 */
function atualizarListaExercicios() {
    const grupo = document.getElementById('select-grupo').value;
    const selectEx = document.getElementById('select-exercicio');
    
    if (!selectEx) return;

    // Limpa a lista atual
    selectEx.innerHTML = "";
    
    // Adiciona os exercícios reais do dicionário
    dicionarioExercicios[grupo].forEach(ex => {
        let option = document.createElement("option");
        option.value = ex;
        option.textContent = ex;
        selectEx.appendChild(option);
    });
}

/**
 * Salva o exercício no Log e no LocalStorage
 */
function adicionarExercicio() {
    const grupo = document.getElementById('select-grupo').value;
    const nome = document.getElementById('select-exercicio').value;
    const series = document.getElementById('series-ex').value;
    const reps = document.getElementById('reps-ex').value;
    const carga = document.getElementById('carga-ex').value;

    if (!series || !reps) {
        alert("Por favor, preencha Séries e Repetições!");
        return;
    }

    const novo = {
        id: Date.now(),
        grupo,
        nome,
        series,
        reps,
        carga: carga || 0,
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    treinos.unshift(novo);
    localStorage.setItem('meuTreinoPro', JSON.stringify(treinos));
    
    // Limpa apenas os campos numéricos após adicionar
    document.getElementById('series-ex').value = "";
    document.getElementById('reps-ex').value = "";
    document.getElementById('carga-ex').value = "";
    
    renderizarTreino();
}

/**
 * Desenha o Log de Treino na tela
 */
function renderizarTreino() {
    const lista = document.getElementById('lista-treino');
    if (!lista) return;

    lista.innerHTML = "";

    if (treinos.length === 0) {
        lista.innerHTML = `<div class="text-center py-20 text-gray-600 text-sm italic font-medium">Log vazio. Pronto para o próximo set?</div>`;
        return;
    }

    treinos.forEach(ex => {
        lista.innerHTML += `
            <div class="bg-[#0b0f1a] border border-gray-800 p-4 rounded-2xl flex items-center justify-between group animate-in fade-in duration-300">
                <div class="flex items-center gap-4">
                    <div class="w-1.5 h-10 bg-blue-600 rounded-full"></div>
                    <div>
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded-md tracking-wider">${ex.grupo}</span>
                            <span class="text-[10px] text-gray-600 font-mono italic">${ex.hora}</span>
                        </div>
                        <h4 class="font-bold text-gray-100 uppercase text-xs sm:text-sm tracking-tight">${ex.nome}</h4>
                    </div>
                </div>
                
                <div class="flex items-center gap-6">
                    <div class="text-right">
                        <p class="text-lg font-black text-white leading-none">${ex.series}<span class="text-blue-500 text-xs mx-0.5">x</span>${ex.reps}</p>
                        <p class="text-[10px] font-bold text-gray-500 tracking-widest uppercase mt-1">${ex.carga} KG</p>
                    </div>
                    <button onclick="removerExercicio(${ex.id})" class="p-2 text-gray-700 hover:text-red-500 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </div>`;
    });
}

/**
 * Controle do Calendário de Frequência
 */
function gerarCalendario() {
    const calEl = document.getElementById('calendario');
    const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    const hoje = new Date().getDay();
    calEl.innerHTML = "";

    diasSemana.forEach((dia, i) => {
        const jaTreinou = diasTreinados.includes(i);
        calEl.innerHTML += `
            <div onclick="toggleDia(${i})" class="flex flex-col items-center cursor-pointer group">
                <span class="text-[10px] font-bold text-gray-500 mb-1">${dia}</span>
                <div class="w-10 h-10 rounded-xl flex items-center justify-center transition-all border-2 
                    ${jaTreinou ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/40' : 'bg-gray-900 border-gray-800 hover:border-gray-600'} 
                    ${i === hoje ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0b0f1a]' : ''}">
                    ${jaTreinou ? '🔥' : ''}
                </div>
            </div>`;
    });
}

function toggleDia(index) {
    if (diasTreinados.includes(index)) {
        diasTreinados = diasTreinados.filter(d => d !== index);
    } else {
        diasTreinados.push(index);
    }
    localStorage.setItem('frequenciaTreino', JSON.stringify(diasTreinados));
    gerarCalendario();
}

function removerExercicio(id) {
    treinos = treinos.filter(t => t.id !== id);
    localStorage.setItem('meuTreinoPro', JSON.stringify(treinos));
    renderizarTreino();
}

function limparTreino() {
    if (confirm("Deseja apagar os registros de hoje?")) {
        treinos = [];
        localStorage.setItem('meuTreinoPro', JSON.stringify(treinos));
        renderizarTreino();
    }
}

// Inicialização de UI
document.addEventListener('DOMContentLoaded', () => {
    const elData = document.getElementById('data-atual');
    if (elData) elData.innerText = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    
    atualizarListaExercicios(); // Garante que a lista não comece vazia
    gerarCalendario();
    renderizarTreino();
});
