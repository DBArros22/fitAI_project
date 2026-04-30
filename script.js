let bancoDeDados = JSON.parse(localStorage.getItem('fitai_pro_data')) || { fichas: {} };
let diasTreinados = JSON.parse(localStorage.getItem('frequenciaTreino')) || [];
let usuariosCadastrados = JSON.parse(localStorage.getItem('fitai_users')) || [];
let fichaAtivaNoMomento = "";
let fichaAtiva = null;

const dicionarioExercicios = {
    "Peito": ["Supino Reto (Barra)", "Supino Inclinado (Halter)", "Crucifixo Máquina (Peck Deck)", "Crossover Polia Alta", "Supino Declinado", "Flexão de Braços (Push-up)", "Dips (Paralelas - Foco Peito)"],
    "Costas": ["Puxada Alta (Lat Pulldown)", "Remada Baixa Sentado", "Remada Curvada (Barra)", "Pull Down Corda", "Levantamento Terra (Deadlift)", "Barra Fixa (Pull-up)", "Remada Unilateral (Serrote)"],
    "Pernas": ["Agachamento Livre (Back Squat)", "Leg Press 45°", "Cadeira Extensora", "Mesa Flexora", "Afundo / Passada", "Hack Squat", "Elevação de Gêmeos (Panturrilha)", "Stiff (Peso Morto Romeno)"],
    "Ombros": ["Desenvolvimento Militar (Overhead Press)", "Elevação Lateral (Halter)", "Elevação Frontal", "Crucifixo Inverso (Posterior de Ombro)", "Desenvolvimento Arnold", "Encolhimento (Trapézio)"],
    "Braços": ["Rosca Direta (Barra W)", "Tríceps Pulley (Corda)", "Rosca Martelo", "Tríceps Testa", "Rosca Concentrada", "Tríceps Coice (Halter)", "Rosca Scott"],
    "Core": ["Prancha Abdominal (Plank)", "Abdominal Supra (Crunch)", "Elevação de Pernas (Infra)", "Abdominal Roda (Ab Wheel)", "Prancha Lateral", "Russian Twist"]
};

// --- 1. NAVEGAÇÃO ---

function showView(viewName) {
    const views = ['view-login', 'view-lobby', 'view-registro', 'view-calendario', 'view-blog', 'view-planilhas', 'view-consulta', 'view-consulta-geral'];
    
    views.forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.add('hidden');
    });

    const target = document.getElementById('view-' + viewName);
    if (target) target.classList.remove('hidden');
    
    const shell = document.getElementById('app-shell');
    if (viewName === 'login') {
        if (shell) shell.classList.add('hidden');
    } else {
        if (shell) shell.classList.remove('hidden');
    }

    if (viewName === 'planilhas') renderizarFichas();
    if (viewName === 'registro') renderizarLogTreino();
    if (viewName === 'consulta-geral') renderizarFichasConsulta();
}

// --- 2. SISTEMA DE AUTENTICAÇÃO ---

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
    const senha = document.getElementById('reg-pass').value;
    const confirmaSenha = document.getElementById('reg-pass-conf').value;

    if (!nome || !email || !senha) return alert("Preencha todos os campos!");
    if (senha !== confirmaSenha) return alert("As senhas não coincidem!");

    const novoUsuario = { nome, email, tel, pass: senha, fichas: {} };
    usuariosCadastrados.push(novoUsuario);
    localStorage.setItem('fitai_users', JSON.stringify(usuariosCadastrados));
    alert("Conta criada com sucesso!");
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

function logout() {
    localStorage.removeItem('fitai_session');
    location.reload();
}

// --- 3. GESTÃO DE FICHAS ---

function renderizarFichas() {
    const container = document.getElementById('lista-fichas');
    if (!container) return;
    container.innerHTML = "";
    Object.keys(bancoDeDados.fichas).forEach(nome => {
        container.innerHTML += `
            <div class="ficha-item" onclick="abrirFicha('${nome}')">
                <div class="treino-info">
                    <h4 class="italic-bold" style="color:white; text-transform:uppercase;">${nome}</h4>
                    <p style="font-size:10px; color:gray;">${bancoDeDados.fichas[nome].length} Exercícios</p>
                </div>
                <button onclick="event.stopPropagation(); excluirFicha('${nome}')" class="btn-delete">🗑️</button>
            </div>`;
    });
}

function criarNovaFicha() {
    const nome = prompt("Nome do Treino:");
    if (nome && !bancoDeDados.fichas[nome]) {
        bancoDeDados.fichas[nome] = [];
        salvarBanco();
        renderizarFichas();
    }
}

function abrirFicha(nome) {
    fichaAtivaNoMomento = nome;
    fichaAtiva = nome;
    showView('consulta');
    const titulo = document.getElementById('titulo-consulta');
    if(titulo) titulo.innerText = nome.toUpperCase();
    renderizarResumoFicha(nome);
}

function renderizarResumoFicha(nome) {
    const container = document.getElementById('lista-exercicios-estaticos');
    if(!container) return;
    container.innerHTML = "";
    bancoDeDados.fichas[nome].forEach(ex => {
        container.innerHTML += `
            <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin-bottom:5px;">
                <strong style="color:white; display:block;">${ex.nome}</strong>
                <small style="color:gray;">${ex.series}x${ex.reps} — ${ex.carga}kg</small>
            </div>`;
    });
}

function excluirFicha(nome) {
    if (confirm(`Excluir permanentemente o ${nome}?`)) {
        delete bancoDeDados.fichas[nome];
        salvarBanco();
        renderizarFichas();
    }
}

// --- 4. SISTEMA DE CONSULTA ---

function renderizarFichasConsulta() {
    const containerLista = document.getElementById('lista-nomes-treinos');
    const containerDetalhes = document.getElementById('detalhes-treino-consulta');
    const btnVoltar = document.getElementById('btn-voltar-consulta');
    const btnSair = document.getElementById('btn-sair-consulta');
    const titulo = document.getElementById('cabecalho-consulta');

    if (!containerLista) return;

    containerLista.classList.remove('hidden');
    containerDetalhes.classList.add('hidden');
    if(btnVoltar) btnVoltar.classList.add('hidden');
    if(btnSair) btnSair.classList.remove('hidden');
    if(titulo) titulo.innerText = "Consultar Treinos";
    
    containerLista.innerHTML = "";
    Object.keys(bancoDeDados.fichas).forEach(nome => {
        containerLista.innerHTML += `
            <div onclick="verExerciciosConsulta('${nome}')" class="menu-card" style="margin:0; background:rgba(255,255,255,0.05);">
                <h3 class="italic-bold uppercase" style="color:white;">${nome}</h3>
                <p style="color:var(--accent-blue);">Ver exercícios</p>
            </div>`;
    });
}

function verExerciciosConsulta(nome) {
    const containerLista = document.getElementById('lista-nomes-treinos');
    const containerDetalhes = document.getElementById('detalhes-treino-consulta');
    const btnVoltar = document.getElementById('btn-voltar-consulta');
    const btnSair = document.getElementById('btn-sair-consulta');
    const titulo = document.getElementById('cabecalho-consulta');

    containerLista.classList.add('hidden');
    containerDetalhes.classList.remove('hidden');
    if(btnVoltar) btnVoltar.classList.remove('hidden');
    if(btnSair) btnSair.classList.add('hidden');
    if(titulo) titulo.innerText = nome.toUpperCase();

    const exercicios = bancoDeDados.fichas[nome] || [];
    containerDetalhes.innerHTML = exercicios.map(ex => `
        <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:15px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <span style="font-size:9px; color:var(--accent-blue); font-weight:bold; text-transform:uppercase;">${ex.grupo}</span>
                <h4 style="color:white; margin:2px 0;">${ex.nome}</h4>
            </div>
            <div style="text-align:right;">
                <p style="color:white; font-weight:900; margin:0;">${ex.series}x${ex.reps}</p>
                <p style="color:gray; font-size:10px; margin:0;">${ex.carga} KG</p>
            </div>
        </div>`).join('') || "<p style='color:gray; text-align:center;'>Nenhum exercício salvo.</p>";
}

function voltarListaConsulta() {
    renderizarFichasConsulta();
}

// --- 5. GESTÃO DE EXERCÍCIOS (LOG / REGISTRO) ---

function atualizarListaExercicios() {
    const grupo = document.getElementById('select-grupo').value;
    const selectEx = document.getElementById('select-exercicio');
    if (!selectEx) return;
    selectEx.innerHTML = dicionarioExercicios[grupo].map(ex => `<option value="${ex}">${ex}</option>`).join('');
}

function adicionarExercicio() {
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    if (!ativa) return alert("Selecione uma ficha!");

    const novo = {
        id: Date.now(),
        grupo: document.getElementById('select-grupo').value,
        nome: document.getElementById('select-exercicio').value,
        series: document.getElementById('series-ex').value,
        reps: document.getElementById('reps-ex').value,
        carga: document.getElementById('carga-ex').value || 0
    };

    if (!novo.series || !novo.reps) return alert("Preencha séries e repetições!");

    bancoDeDados.fichas[ativa].unshift(novo);
    salvarBanco();
    renderizarLogTreino();
}

function renderizarLogTreino() {
    const container = document.getElementById('lista-treino');
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    
    if(!container || !ativa) return;
    
    container.innerHTML = "";
    const exercicios = bancoDeDados.fichas[ativa] || [];

    exercicios.forEach(ex => {
        container.innerHTML += `
            <div class="treino-item" style="display: flex !important; justify-content: space-between !important; align-items: center !important; margin-bottom: 10px; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 10px;">
                <div class="treino-info">
                    <h4 class="italic-bold" style="color: white !important; text-transform: uppercase; margin: 0;">${ex.nome}</h4>
                    <p style="color: #64748b !important; font-size: 11px; margin-top: 4px;">
                        ${ex.series}x${ex.reps} — <span style="color: #3b82f6 !important; font-weight: bold;">${ex.carga}kg</span>
                    </p>
                </div>
                <div style="display: flex !important; gap: 15px !important; align-items: center !important;">
                    <button onclick="editarExercicio(${ex.id})" style="background: none !important; border: none !important; cursor: pointer !important; font-size: 1.2rem !important; display: inline-block !important;">✏️</button>
                    <button onclick="removerExercicio(${ex.id})" style="background: none !important; border: none !important; cursor: pointer !important; font-size: 1.2rem !important; display: inline-block !important;">🗑️</button>
                </div>
            </div>`;
    });
}

function editarExercicio(id) {
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    const index = bancoDeDados.fichas[ativa].findIndex(t => t.id === id);
    if (index === -1) return;

    const ex = bancoDeDados.fichas[ativa][index];

    const nS = prompt("Séries:", ex.series);
    if (nS === null) return;
    const nR = prompt("Reps:", ex.reps);
    if (nR === null) return;
    const nC = prompt("Carga (kg):", ex.carga);
    if (nC === null) return;

    bancoDeDados.fichas[ativa][index].series = nS;
    bancoDeDados.fichas[ativa][index].reps = nR;
    bancoDeDados.fichas[ativa][index].carga = nC;

    salvarBanco();
    renderizarLogTreino();
}

function prepararRegistro() {
    showView('registro');
    const titulo = document.getElementById('nome-ficha-ativa');
    if(titulo) titulo.innerText = "TREINANDO: " + (fichaAtivaNoMomento || "TREINO").toUpperCase();
    renderizarLogTreino();
}

function removerExercicio(id) {
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    if (confirm("Deseja excluir este registro?")) {
        bancoDeDados.fichas[ativa] = bancoDeDados.fichas[ativa].filter(t => t.id !== id);
        salvarBanco();
        renderizarLogTreino();
    }
}

function limparTreino() {
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    if (ativa && confirm(`Limpar todos os exercícios de ${ativa}?`)) {
        bancoDeDados.fichas[ativa] = [];
        salvarBanco();
        renderizarLogTreino();
    }
}

function salvarBanco() {
    localStorage.setItem('fitai_pro_data', JSON.stringify(bancoDeDados));
}

// --- 6. CALENDÁRIO ---

function gerarCalendario() {
    const calEl = document.getElementById('calendario');
    if (!calEl) return;
    const diasSemana = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    calEl.innerHTML = diasSemana.map((dia, i) => {
        const jaTreinou = diasTreinados.includes(i);
        return `
            <div onclick="toggleDia(${i})" class="flex flex-col items-center cursor-pointer">
                <span class="text-[10px] font-bold text-gray-500 mb-1">${dia}</span>
                <div class="w-10 h-10 rounded-xl flex items-center justify-center border-2 
                    ${jaTreinou ? 'bg-blue-600 border-blue-400' : 'bg-gray-900 border-gray-800'}">
                    ${jaTreinou ? '🔥' : ''}
                </div>
            </div>`;
    }).join('');
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

// --- 7. INICIALIZAÇÃO ---

window.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('fitai_session');
    if (session) showView('lobby');
    else showView('login');
    atualizarListaExercicios();
    gerarCalendario();
});
