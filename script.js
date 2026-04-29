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

// --- NAVEGAÇÃO ---

function showView(viewName) {
    const views = ['view-login', 'view-lobby', 'view-registro', 'view-calendario', 'view-blog', 'view-planilhas', 'view-consulta'];
    
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

if (!bancoDeDados.usuarios) {
    bancoDeDados.usuarios = [];
}

function handleCadastro() {
    const nome = document.getElementById('reg-nome').value;
    const email = document.getElementById('reg-email').value;
    const senha = document.getElementById('reg-pass').value;
    const confirmaSenha = document.getElementById('reg-pass-conf').value;

    if (!nome || !email || !senha) {
        alert("Preencha todos os campos!");
        return;
    }

    if (senha !== confirmaSenha) {
        alert("As senhas não coincidem!");
        return;
    }

    const usuarioExiste = bancoDeDados.usuarios.find(u => u.email === email);
    if (usuarioExiste) {
        alert("Este e-mail já está cadastrado!");
        return;
    }

    const novoUsuario = {
        nome: nome,
        email: email,
        pass: senha, // Mantendo pass conforme seu handleLogin
        fichas: {}
    };

    bancoDeDados.usuarios.push(novoUsuario);
    usuariosCadastrados.push(novoUsuario);
    localStorage.setItem('fitai_users', JSON.stringify(usuariosCadastrados));
    salvarBanco();
    
    alert("Conta criada com sucesso! Agora faça login.");
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

// --- GESTÃO DE FICHAS ---

function renderizarFichasConsulta() {
    const container = document.getElementById('lista-fichas-consulta');
    if (!container) return;
    container.innerHTML = "";

    const nomesFichas = Object.keys(bancoDeDados.fichas);

    nomesFichas.forEach(nome => {
        container.innerHTML += `
            <div onclick="verDetalhesConsulta('${nome}')" 
                 style="background: rgba(255,255,255,0.05); padding: 10px 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer; white-space: nowrap;">
                <span class="italic-bold uppercase" style="color: white; font-size: 0.8rem;">${nome}</span>
            </div>`;
    });
}

function verDetalhesConsulta(nome) {
    const container = document.getElementById('detalhes-treino-consulta');
    const exercicios = bancoDeDados.fichas[nome] || [];

    // Título do treino selecionado
    let html = `<h4 class="italic-bold uppercase" style="color: var(--accent-blue); margin-bottom: 15px;">Exercícios de ${nome}</h4>`;

    if (exercicios.length === 0) {
        html += `<p style="color: gray;">Nenhum exercício registrado para consulta.</p>`;
    } else {
        exercicios.forEach(ex => {
            html += `
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="font-size: 9px; color: var(--accent-blue); font-weight: bold; text-transform: uppercase;">${ex.grupo}</span>
                        <h4 style="color: white; margin: 2px 0; text-transform: uppercase; font-size: 0.9rem;">${ex.nome}</h4>
                    </div>
                    <div style="text-align: right;">
                        <p style="color: white; font-weight: 900; margin: 0;">${ex.series || ex.sets}x${ex.reps}</p>
                        <p style="color: gray; font-size: 10px; margin: 0; font-weight: bold;">${ex.carga} KG</p>
                    </div>
                </div>`;
        });
    }

    container.innerHTML = html;
}

function criarNovaFicha() {
    const nome = prompt("Nome do Treino:");
    if (nome && !bancoDeDados.fichas[nome]) {
        bancoDeDados.fichas[nome] = [];
        salvarBanco();
        renderizarFichas();
    } else if (bancoDeDados.fichas[nome]) {
        alert("Este nome já existe!");
    }
}

function abrirFicha(nome) {
    // 1. Define qual ficha está ativa para o sistema saber onde salvar
    fichaAtivaNoMomento = nome;
    fichaAtiva = nome; 

    // 2. Muda para a tela de REGISTRO (onde estão os campos de salvar e a lista)
    showView('registro'); 
    
    // 3. Atualiza o título para o usuário saber qual treino abriu
    const titulo = document.getElementById('nome-ficha-ativa');
    if (titulo) titulo.innerText = "TREINO: " + nome.toUpperCase();

    // 4. Carrega os exercícios que já foram salvos nessa ficha anteriormente
    renderizarLogTreino();
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
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    if (!ativa) return alert("Selecione uma ficha primeiro!");

    const grupo = document.getElementById('select-grupo').value;
    const nome = document.getElementById('select-exercicio').value;
    const series = document.getElementById('series-ex').value;
    const reps = document.getElementById('reps-ex').value;
    const carga = document.getElementById('carga-ex').value;

    if (!series || !reps) return alert("Preencha Séries e Repetições!");

    const novo = {
        id: Date.now(),
        grupo, nome, series, reps,
        sets: series, // Para compatibilidade com seus outros renders
        carga: carga || 0,
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    if (!bancoDeDados.fichas[ativa]) bancoDeDados.fichas[ativa] = [];
    bancoDeDados.fichas[ativa].unshift(novo);
    salvarBanco();
    
    document.getElementById('series-ex').value = "";
    document.getElementById('reps-ex').value = "";
    document.getElementById('carga-ex').value = "";
    
    renderizarLogTreino();
}

function renderizarLogTreino() {
    const container = document.getElementById('lista-treino');
    if(!container) return;
    container.innerHTML = ''; 

    const ativa = fichaAtivaNoMomento || fichaAtiva;
    const exercicios = bancoDeDados.fichas[ativa] || [];

    exercicios.forEach((ex, index) => {
        container.innerHTML += `
            <div class="treino-item fade-in">
                <div class="treino-info">
                    <h4>${ex.nome}</h4>
                    <p>${ex.grupo} • <span class="treino-stats">${ex.series || ex.sets}x${ex.reps} — ${ex.carga}kg</span></p>
                </div>
                <button onclick="removerExercicio(${ex.id})" class="btn-delete">🗑️</button>
            </div>`;
    });
}

function prepararRegistro() {
    showView('registro');
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    const titulo = document.getElementById('nome-ficha-ativa');
    if(titulo) titulo.innerText = "TREINANDO: " + ativa.toUpperCase();
    renderizarLogTreino();
}

function removerExercicio(id) {
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    bancoDeDados.fichas[ativa] = bancoDeDados.fichas[ativa].filter(t => t.id !== id);
    salvarBanco();
    renderizarLogTreino();
}

function limparTreino() {
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    if (confirm(`Limpar todos os exercícios da ficha ${ativa}?`)) {
        bancoDeDados.fichas[ativa] = [];
        salvarBanco();
        renderizarLogTreino();
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
                    ${jaTreinou ? 'bg-blue-600 border-blue-400' : 'bg-gray-900 border-gray-800'} 
                    ${i === hoje ? 'ring-2 ring-blue-500 ring-offset-2' : ''}">
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
