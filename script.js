let bancoDeDados = JSON.parse(localStorage.getItem('fitai_pro_data')) || { fichas: {} };
let diasTreinados = JSON.parse(localStorage.getItem('frequenciaTreino')) || [];
let usuariosCadastrados = JSON.parse(localStorage.getItem('fitai_users')) || [];
let fichaAtiva = null;

const dicionarioExercicios = {
    "Peito": ["Supino Reto (Barra)", "Supino Inclinado (Halter)", "Crucifixo Máquina (Peck Deck)", "Crossover Polia Alta", "Supino Declinado", "Flexão de Braços (Push-up)", "Dips (Paralelas - Foco Peito)"],
    "Costas": ["Puxada Alta (Lat Pulldown)", "Remada Baixa Sentado", "Remada Curvada (Barra)", "Pull Down Corda", "Levantamento Terra (Deadlift)", "Barra Fixa (Pull-up)", "Remada Unilateral (Serrote)"],
    "Pernas": ["Agachamento Livre (Back Squat)", "Leg Press 45°", "Cadeira Extensora", "Mesa Flexora", "Afundo / Passada", "Hack Squat", "Elevação de Gêmeos (Panturrilha)", "Stiff (Peso Morto Romeno)"],
    "Ombros": ["Desenvolvimento Militar (Overhead Press)", "Elevação Lateral (Halter)", "Elevação Frontal", "Crucifixo Inverso (Posterior de Ombro)", "Desenvolvimento Arnold", "Encolhimento (Trapézio)"],
    "Braços": ["Rosca Direta (Barra W)", "Tríceps Pulley (Corda)", "Rosca Martelo", "Tríceps Testa", "Rosca Concentrada", "Tríceps Coice (Halter)", "Rosca Scott"],
    "Core": ["Prancha Abdominal (Plank)", "Abdominal Supra (Crunch)", "Elevação de Pernas (Infra)", "Abdominal Roda (Ab Wheel)", "Prancha Lateral", "Russian Twist"]
};

// --- NAVEGAÇÃO ---

function showView(viewName) {
    const views = ['view-login', 'view-lobby', 'view-registro', 'view-calendario', 'view-blog', 'view-planilhas'];
    
    // Esconde todas as telas
    views.forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.add('hidden');
    });

    // Mostra a tela desejada
    const target = document.getElementById('view-' + viewName);
    if (target) target.classList.remove('hidden');
    
    // Gerencia o App Shell (Menu superior)
    const shell = document.getElementById('app-shell');
    if (viewName === 'login') {
        if (shell) shell.classList.add('hidden');
    } else {
        if (shell) shell.classList.remove('hidden');
    }

    // Atualiza dados específicos se necessário
    if (viewName === 'planilhas') renderizarFichas();
    if (viewName === 'registro') renderizarTreino();
}

// --- SISTEMA DE AUTENTICAÇÃO ---

function toggleAuthTab(tab) {
    const selector = document.getElementById('auth-tab-selector');
    const loginForm = document.getElementById('form-login');
    const cadastroForm = document.getElementById('form-cadastro');
    
    if (tab === 'login') {
        selector.classList.remove('cadastro-active');
        loginForm.classList.remove('hidden');
        cadastroForm.classList.add('hidden');
    } else {
        selector.classList.add('cadastro-active');
        loginForm.classList.add('hidden');
        cadastroForm.classList.remove('hidden');
    }
}

function handleCadastro() {
    const nome = document.getElementById('reg-nome').value;
    const email = document.getElementById('reg-email').value;
    const tel = document.getElementById('reg-tel').value;
    const pass = document.getElementById('reg-pass').value;
    const passConf = document.getElementById('reg-pass-conf').value;

    if (!nome || !email || !pass) return alert("Preencha os campos obrigatórios!");
    if (pass !== passConf) return alert("As senhas não coincidem!");
    
    if (usuariosCadastrados.find(u => u.email === email)) {
        return alert("Este e-mail já está cadastrado!");
    }

    const novoUsuario = { nome, email, tel, pass };
    usuariosCadastrados.push(novoUsuario);
    localStorage.setItem('fitai_users', JSON.stringify(usuariosCadastrados));

    alert("Conta criada com sucesso! Agora é só entrar.");
    toggleAuthTab('login');
}

function handleLogin() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;

    const user = usuariosCadastrados.find(u => u.email === email && u.pass === pass);

    if (user) {
        localStorage.setItem('fitai_session', JSON.stringify(user));
        showView('lobby');
    } else {
        alert("E-mail ou senha incorretos!");
    }
}

function handleRecuperar() {
    const email = prompt("Digite seu e-mail cadastrado para recuperação:");
    const user = usuariosCadastrados.find(u => u.email === email);

    if (user) {
        alert(`Recuperação de conta para: ${user.nome}\nSua senha é: ${user.pass}`);
    } else if (email) {
        alert("E-mail não encontrado na base de dados.");
    }
}

function logout() {
    localStorage.removeItem('fitai_session');
    location.reload();
}

// --- GESTÃO DE FICHAS (PLANILHAS) ---

function renderizarFichas() {
    const container = document.getElementById('lista-fichas');
    if (!container) return;
    container.innerHTML = "";

    const nomesFichas = Object.keys(bancoDeDados.fichas);

    if (nomesFichas.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center text-gray-500 py-10 italic">Nenhuma ficha criada. Comece no botão acima!</p>`;
        return;
    }

    nomesFichas.forEach(nome => {
        container.innerHTML += `
            <div class="bg-[#0b0f1a] border border-gray-800 p-6 rounded-2xl flex justify-between items-center group hover:border-blue-500 transition-all">
                <div>
                    <h4 class="font-black text-white italic uppercase">${nome}</h4>
                    <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest">${bancoDeDados.fichas[nome].length} Exercícios</p>
                </div>
                <div class="flex gap-2">
                    <button onclick="abrirFicha('${nome}')" class="bg-blue-600/10 text-blue-500 p-2 rounded-lg hover:bg-blue-600 hover:text-white transition-all">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    </button>
                    <button onclick="excluirFicha('${nome}')" class="text-gray-700 hover:text-red-500 p-2 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </div>`;
    });
}

function criarNovaFicha() {
    const nome = prompt("Nome do Treino (ex: Treino A - Pernas):");
    if (nome && !bancoDeDados.fichas[nome]) {
        bancoDeDados.fichas[nome] = [];
        salvarBanco();
        renderizarFichas();
    } else if (bancoDeDados.fichas[nome]) {
        alert("Este nome já existe!");
    }
}

function abrirFicha(nomeDaFicha) {
    // Muda para a tela de registro
    showView('registro');
    
    // Atualiza o título da página de registro com o nome da ficha selecionada
    const titulo = document.getElementById('nome-ficha-ativa');
    if(titulo) titulo.innerText = "TREINO: " + nomeDaFicha.toUpperCase();
    
    // Aqui você carregaria os exercícios dessa ficha específica
    renderizarListaTreino(); 
}

function excluirFicha(nome) {
    if (confirm(`Excluir permanentemente o ${nome}?`)) {
        delete bancoDeDados.fichas[nome];
        salvarBanco();
        renderizarFichas();
    }
}

function salvarBanco() {
    localStorage.setItem('fitai_pro_data', JSON.stringify(bancoDeDados));
}

// --- GESTÃO DE EXERCÍCIOS ---

function atualizarListaExercicios() {
    const grupo = document.getElementById('select-grupo').value;
    const selectEx = document.getElementById('select-exercicio');
    if (!selectEx) return;
    selectEx.innerHTML = "";
    dicionarioExercicios[grupo].forEach(ex => {
        let option = document.createElement("option");
        option.value = ex;
        option.textContent = ex;
        selectEx.appendChild(option);
    });
}

function adicionarExercicio() {
    if (!fichaAtiva) return alert("Selecione uma ficha primeiro!");

    const grupo = document.getElementById('select-grupo').value;
    const nome = document.getElementById('select-exercicio').value;
    const series = document.getElementById('series-ex').value;
    const reps = document.getElementById('reps-ex').value;
    const carga = document.getElementById('carga-ex').value;

    if (!series || !reps) return alert("Preencha Séries e Repetições!");

    const novo = {
        id: Date.now(),
        grupo, nome, series, reps,
        carga: carga || 0,
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    bancoDeDados.fichas[fichaAtiva].unshift(novo);
    salvarBanco();
    
    document.getElementById('series-ex').value = "";
    document.getElementById('reps-ex').value = "";
    document.getElementById('carga-ex').value = "";
    
    renderizarTreino();
}

function renderizarListaTreino() {
    const container = document.getElementById('lista-treino');
    container.innerHTML = ''; // Limpa a lista antes de desenhar

    // Exemplo de como o loop deve montar o HTML interno
    // treinosLogados é o seu array de exercícios realizados
    treinosLogados.forEach((ex, index) => {
        container.innerHTML += `
            <div class="treino-item fade-in">
                <div class="treino-info">
                    <h4>${ex.nome}</h4>
                    <p>${ex.grupo} • <span class="treino-stats">${ex.sets}x${ex.reps} — ${ex.carga}kg</span></p>
                </div>
                <button onclick="removerExercicio(${index})" class="btn-delete" title="Excluir Exercício">
                    🗑️
                </button>
            </div>
        `;
    });
}

// IMPORTANTE: Esta função faz o "pulo" da ficha para o registro
function abrirFicha(idFicha) {
    // 1. Lógica para carregar os dados da ficha pelo ID (sua lógica atual)
    // 2. Muda a tela
    showView('registro'); 
    // 3. Atualiza o título na tela de registro
    document.getElementById('nome-ficha-ativa').innerText = "Treino: " + idFicha;
}

    exercicios.forEach(ex => {
        lista.innerHTML += `
            <div class="bg-[#0b0f1a] border border-gray-800 p-4 rounded-2xl flex items-center justify-between group mb-3">
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


function removerExercicio(id) {
    bancoDeDados.fichas[fichaAtiva] = bancoDeDados.fichas[fichaAtiva].filter(t => t.id !== id);
    salvarBanco();
    renderizarTreino();
}

function limparTreino() {
    if (confirm(`Limpar todos os exercícios da ficha ${fichaAtiva}?`)) {
        bancoDeDados.fichas[fichaAtiva] = [];
        salvarBanco();
        renderizarTreino();
    }
}

// --- CALENDÁRIO ---

function gerarCalendario() {
    const calEl = document.getElementById('calendario');
    if (!calEl) return;
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

// --- INICIALIZAÇÃO ---

window.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('fitai_session');
    const elData = document.getElementById('data-atual');
    if (elData) elData.innerText = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

    if (session) {
        showView('lobby');
    } else {
        showView('login');
    }
    
    atualizarListaExercicios();
    gerarCalendario();
});
