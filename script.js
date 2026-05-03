let bancoDeDados = JSON.parse(localStorage.getItem('fitai_pro_data')) || { fichas: {} };
let diasTreinados = JSON.parse(localStorage.getItem('frequenciaTreino')) || [];
let usuariosCadastrados = JSON.parse(localStorage.getItem('fitai_users')) || [];
let lembretes = JSON.parse(localStorage.getItem('fitai_lembretes')) || [];
let feedEvolucao = JSON.parse(localStorage.getItem('fitai_feed')) || []; 
let midiaAnexada = null; // Controle de anexo do blog

// Váriaveis gravador audio
let mediaRecorder;
let audioChunks = [];
let gravando = false;

// Váriaveis Registro de treinos
let fichaAtivaNoMomento = "";
let fichaAtiva = null;

// Variáveis cronômetro
let timerInterval;
let milissegundosTotais = 0;
let isTimerRunning = false;
let isCountdownMode = false;

// --- DICIONÁRIO TÉCNICO DE EXERCÍCIOS ---
const dicionarioExercicios = {
    "Peitoral": [
        "Supino Reto (Barra Olímpica)", "Supino Inclinado (Halteres)", 
        "Crossover Polia Alta", "Peck Deck (Voador)", 
        "Supino Articulado Vertical", "Crucifixo Reto (Halteres)", 
        "Dips (Paralelas - Foco Peito)", "Flexão de Braços (Push-up)"
    ],
    "Dorsais": [
        "Lat Pulldown (Puxada Aberta)", "Remada Curvada (Barra)", 
        "Remada Baixa (Triângulo)", "Pull-Down Corda (Polia Alta)", 
        "Remada Unilateral (Serrote)", "Barra Fixa (Pull-up)", 
        "Remada Cavalinho (T-Bar)", "Levantamento Terra (Deadlift)"
    ],
    "Quadríceps": [
        "Agachamento Livre (Back Squat)", "Leg Press 45°", 
        "Cadeira Extensora", "Agachamento Hack", 
        "Afundo / Passada", "Agachamento Búlgaro", 
        "Sissy Squat"
    ],
    "Posteriores/Glúteos": [
        "Stiff (Romanian Deadlift)", "Mesa Flexora", 
        "Cadeira Flexora", "Elevação Pélvica (Hip Thrust)", 
        "Glúteo Cabo (Coice)", "Bom dia (Good Morning)", 
        "Abdução de Quadril"
    ],
    "Deltoides (Ombros)": [
        "Desenvolvimento Militar (OHP)", "Elevação Lateral (Halter/Cabo)", 
        "Elevação Frontal", "Crucifixo Inverso (Posterior)", 
        "Desenvolvimento Arnold", "Remada Alta (Pegada Aberta)", 
        "Encolhimento (Trapézio)"
    ],
    "Bíceps/Braquial": [
        "Rosca Direta (Barra EZ)", "Rosca Martelo", 
        "Rosca Scott", "Rosca Alternada (Halteres)", 
        "Rosca Inversa (Braquiorradial)", "Rosca Concentrada"
    ],
    "Tríceps Braquial": [
        "Tríceps Pulley (Corda)", "Tríceps Testa (Barra W)", 
        "Tríceps Francês", "Supino Fechado", 
        "Tríceps Coice (Polia/Halter)", "Mergulho (Dips no Banco)"
    ],
    "Core/Abdominal": [
        "Abdominal Supra (Crunch)", "Elevação de Pernas (Infra)", 
        "Prancha Isométrica (Plank)", "Ab Wheel (Roda Abdominal)", 
        "Russian Twist", "Vaccum Abdominal"
    ],
    "Panturrilhas": [
        "Gêmeos em Pé (Máquina)", "Gêmeos Sentado (Burrinho)", 
        "Panturrilha no Leg Press", "Flexão Tibial"
    ],
    "Cardio & Aeróbico": [
        "Esteira (Corrida/Caminhada)", "Bike Ergométrica", 
        "Elíptico / Transport", "Corda (Pular)", 
        "Remo Indoor", "Subida de Escada (Stairmaster)"
    ]
};

// --- NOVO SISTEMA DE NOTIFICAÇÃO (MODAL) ---
function mostrarAviso(mensagem) {
    const antigo = document.getElementById('modal-notificacao');
    if (antigo) antigo.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-notificacao';
    modal.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.85); display: flex; align-items: center;
        justify-content: center; z-index: 10000; backdrop-filter: blur(6px);
    `;
    
    modal.innerHTML = `
        <div class="glass-panel" style="max-width: 320px; padding: 25px; text-align: center; border: 1px solid #3b82f6; border-radius: 20px; background: #0f172a; box-shadow: 0 0 20px rgba(59,130,246,0.3);">
            <h3 class="italic-bold" style="color: #3b82f6; margin-bottom: 12px; letter-spacing: 1px;">FITAI PRO</h3>
            <p style="color: white; margin-bottom: 20px; font-size: 14px; line-height: 1.5;">${mensagem}</p>
            <button onclick="document.getElementById('modal-notificacao').remove()" style="width: 100%; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer;">ENTENDIDO</button>
        </div>
    `;
    document.body.appendChild(modal);
}

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
    if (viewName === 'calendario') renderizarPaginaCronograma();
    
    // LINHA ADICIONADA PARA O BLOG:
    if (viewName === 'blog') renderizarBlog(); 
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

    if (!nome || !email || !senha) return mostrarAviso("Preencha todos os campos!");
    if (senha !== confirmaSenha) return mostrarAviso("As senhas não coincidem!");

    const novoUsuario = { nome, email, tel, pass: senha, fichas: {} };
    usuariosCadastrados.push(novoUsuario);
    localStorage.setItem('fitai_users', JSON.stringify(usuariosCadastrados));
    mostrarAviso("Conta criada com sucesso! Faça seu login.");
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
        mostrarAviso("E-mail ou senha incorretos!");
    }
}

function logout() {
    localStorage.removeItem('fitai_session');
    location.reload();
}

// --- 3. GESTÃO TREINOS ---
function renderizarFichas() {
    const container = document.getElementById('lista-fichas');
    if (!container) return;
    
    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
            <button onclick="showView('lobby')" style="background: rgba(255,255,255,0.1); border: none; color: white; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 0.8rem; font-weight: bold;">
                ← VOLTAR
            </button>           
        </div>
    `;

    const keys = Object.keys(bancoDeDados.fichas);
    
    if (keys.length === 0) {
        container.innerHTML += `<p style="color: gray; text-align: center; margin-top: 20px;">Nenhuma ficha criada.</p>`;
        return;
    }

    keys.forEach(nome => {
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

function mascaraTempo(input) {
    let v = input.value.replace(/\D/g, ''); // Remove tudo que não é número
    if (v.length > 6) v = v.slice(0, 6); // Limita a 6 dígitos

    if (v.length >= 5) {
        v = v.replace(/^(\d{2})(\d{2})(\d{2}).*/, '$1:$2:$3');
    } else if (v.length >= 3) {
        v = v.replace(/^(\d{2})(\d{2}).*/, '$1:$2');
    }
    input.value = v;
}

// Função para formatar a exibição final com siglas (Ex: 01h 20m 30s)
function formatarTempoParaExibicao(valor) {
    if (!valor) return "";
    const partes = valor.split(':');
    
    if (partes.length === 3) {
        return `${partes[0]}h ${partes[1]}m ${partes[2]}s`;
    } else if (partes.length === 2) {
        return `${partes[0]}m ${partes[1]}s`;
    }
    return valor + "s";
}

function renderizarResumoFicha(nome) {
    const container = document.getElementById('lista-exercicios-estaticos');
    if(!container) return;
    container.innerHTML = "";
    const exercicios = bancoDeDados.fichas[nome] || [];

    exercicios.forEach(ex => {
        // Lógica de exibição: Se for tempo, mostra o tempo formatado, senão mostra séries/carga
        const infoExibicao = ex.tipo === 'tempo' 
            ? `<span style="color: #10b981; font-weight:bold;">⏱️ ${formatarTempoParaExibicao(ex.tempo)}</span>`
            : `<span style="color: #94a3b8; font-size: 12px;">${ex.series}x${ex.reps} — <span style="color: #3b82f6; font-weight:bold;">${ex.carga}kg</span></span>`;

        container.innerHTML += `
            <div id="item-resumo-${ex.id}" style="background:rgba(255,255,255,0.05); padding:15px; border-radius:15px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <div style="flex: 1;">
                    <h4 class="italic-bold" style="color: white; text-transform: uppercase; margin: 0; font-size: 14px;">${ex.nome}</h4>
                    <div id="dados-resumo-${ex.id}" style="margin-top: 5px;">
                        ${infoExibicao}
                    </div>
                </div>
                <div id="acoes-resumo-${ex.id}" style="display: flex; gap: 15px;">
                    <button onclick="ativarEdicaoInline(${ex.id}, 'resumo')" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; filter: brightness(1.5);">✏️</button>
                    <button onclick="removerExercicio(${ex.id}, 'resumo')" style="background: none; border: none; cursor: pointer; font-size: 1.2rem;">🗑️</button>
                </div>
            </div>`;
    });
}

function excluirFicha(nome) {
    if (confirm(`Excluir permanentemente o ${nome}?`)) {
        delete bancoDeDados.fichas[nome];
        salvarBanco();
        renderizarFichas();
        mostrarAviso("Ficha excluída.");
    }
}

// --- 4. SISTEMA DE CONSULTA GERAL ---
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
                <p style="color:#3b82f6;">Ver exercícios</p>
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
    
    containerDetalhes.innerHTML = exercicios.map(ex => {
        // Lógica para decidir se mostra Tempo ou Carga
        const infoDireita = ex.tipo === 'tempo' 
            ? `<p style="color:#10b981; font-weight:900; margin:0;">${formatarTempoParaExibicao(ex.tempo)}</p>`
            : `<p style="color:white; font-weight:900; margin:0;">${ex.series}x${ex.reps}</p>
               <p style="color:gray; font-size:10px; margin:0;">${ex.carga} KG</p>`;

        return `
        <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:15px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <div><h4 style="color:white; margin:0; text-transform: uppercase;">${ex.nome}</h4></div>
            <div style="text-align:right;">
                ${infoDireita}
            </div>
        </div>`;
    }).join('') || "<p style='color:gray; text-align:center;'>Vazio.</p>";
}

function voltarListaConsulta() {
    renderizarFichasConsulta();
}

// --- 5. GESTÃO DE EXERCÍCIOS (LOG / REGISTRO) ---
function atualizarListaExercicios() {
    const grupo = document.getElementById('select-grupo').value;
    const selectEx = document.getElementById('select-exercicio');
    const camposForca = document.getElementById('campos-forca');
    const camposCardio = document.getElementById('campos-cardio');
    
    if (!selectEx) return;
    
    if (!grupo) {
        selectEx.innerHTML = "";
        return;
    }

    // Lógica para alternar campos entre Peso e Tempo
    if (grupo === "Cardio & Aeróbico") {
        camposForca.classList.add('hidden');
        camposCardio.classList.remove('hidden');
    } else {
        camposForca.classList.remove('hidden');
        camposCardio.classList.add('hidden');
    }

    selectEx.innerHTML = dicionarioExercicios[grupo].map(ex => `<option value="${ex}">${ex}</option>`).join('');
}

function adicionarExercicio() {
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    if (!ativa) return mostrarAviso("Selecione uma ficha!");

    const grupo = document.getElementById('select-grupo').value;
    const isCardio = (grupo === "Cardio & Aeróbico");

    const novo = {
        id: Date.now(),
        grupo: grupo,
        nome: document.getElementById('select-exercicio').value,
        series: document.getElementById('series-ex').value,
        reps: document.getElementById('reps-ex').value,
        carga: document.getElementById('carga-ex').value || 0,
        tempo: document.getElementById('tempo-ex').value, // Novo campo
        tipo: isCardio ? 'tempo' : 'forca' // Marcador para renderização
    };

    if (isCardio) {
        if (!novo.tempo) return mostrarAviso("Informe o tempo do cardio!");
    } else {
        if (!novo.series || !novo.reps) return mostrarAviso("Preencha séries e repetições!");
    }

    bancoDeDados.fichas[ativa].unshift(novo);
    salvarBanco();
    renderizarLogTreino();
    
    // Limpa campos após salvar
    document.getElementById('series-ex').value = "";
    document.getElementById('reps-ex').value = "";
    document.getElementById('carga-ex').value = "";
    document.getElementById('tempo-ex').value = "";
}

function formatarTempoParaExibicao(valor) {
    if (!valor) return "00s";
    const partes = valor.split(':');
    if (partes.length === 3) {
        return `${partes[0]}h ${partes[1]}m ${partes[2]}s`;
    } else if (partes.length === 2) {
        return `${partes[0]}m ${partes[1]}s`;
    }
    return valor + "s";
}

function renderizarLogTreino() {
    const container = document.getElementById('lista-treino');
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    if(!container || !ativa) return;
    
    container.innerHTML = "";
    const exercicios = bancoDeDados.fichas[ativa] || [];

    exercicios.forEach(ex => {
        // Lógica de exibição condicional (Tempo vs Força)
        let infoBadge;

        if (ex.tipo === 'tempo') {
            const tempoFormatado = formatarTempoParaExibicao(ex.tempo);
            infoBadge = `<span style="color: #10b981; font-weight:bold; font-size: 12px;">⏱️ ${tempoFormatado}</span>`;
        } else {
            infoBadge = `<span style="color: #94a3b8; font-size: 12px;">${ex.series}x${ex.reps} — <span style="color: #3b82f6; font-weight:bold;">${ex.carga}kg</span></span>`;
        }

        container.innerHTML += `
            <div id="item-log-${ex.id}" class="treino-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 10px;">
                <div style="flex: 1;">
                    <h4 class="italic-bold" style="color: white; text-transform: uppercase; margin: 0; font-size: 14px;">${ex.nome}</h4>
                    <div id="dados-log-${ex.id}" style="margin-top: 5px;">
                        ${infoBadge}
                    </div>
                </div>
                <div id="acoes-log-${ex.id}" style="display: flex; gap: 15px;">
                    <button onclick="ativarEdicaoInline(${ex.id}, 'log')" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; filter: brightness(1.5);">✏️</button>
                    <button onclick="removerExercicio(${ex.id}, 'log')" style="background: none; border: none; cursor: pointer; font-size: 1.2rem;">🗑️</button>
                </div>
            </div>`;
    });
}

function ativarEdicaoInline(id, tipo) {
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    const ex = bancoDeDados.fichas[ativa].find(t => t.id === id);
    
    const dadosId = tipo === 'resumo' ? `dados-resumo-${id}` : `dados-log-${id}`;
    const acoesId = tipo === 'resumo' ? `acoes-resumo-${id}` : `acoes-log-${id}`;

    document.getElementById(dadosId).innerHTML = `
        <div style="display: flex; gap: 5px; align-items: center; margin-top:5px;">
            <input type="number" id="edit-series-${id}" value="${ex.series}" style="width: 45px; background: #1e293b; border: 1px solid #3b82f6; color: white; border-radius: 6px; text-align: center; padding: 4px; font-size: 12px;">
            <span style="color: gray; font-size: 10px;">X</span>
            <input type="number" id="edit-reps-${id}" value="${ex.reps}" style="width: 45px; background: #1e293b; border: 1px solid #3b82f6; color: white; border-radius: 6px; text-align: center; padding: 4px; font-size: 12px;">
            <span style="color: gray; font-size: 10px;">—</span>
            <input type="number" id="edit-carga-${id}" value="${ex.carga}" style="width: 55px; background: #1e293b; border: 1px solid #3b82f6; color: white; border-radius: 6px; text-align: center; padding: 4px; font-size: 12px;">
            <span style="color: gray; font-size: 10px;">KG</span>
        </div>`;

    document.getElementById(acoesId).innerHTML = `
        <button onclick="salvarEdicaoInline(${id}, '${tipo}')" style="background: #10b981; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; color: white; font-size: 0.9rem;">✅</button>
        <button onclick="${tipo === 'resumo' ? 'renderizarResumoFicha(fichaAtiva)' : 'renderizarLogTreino()'}" style="background: #ef4444; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; color: white; font-size: 0.9rem;">✕</button>`;
}

function salvarEdicaoInline(id, tipo) {
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    const index = bancoDeDados.fichas[ativa].findIndex(t => t.id === id);

    const nS = document.getElementById(`edit-series-${id}`).value;
    const nR = document.getElementById(`edit-reps-${id}`).value;
    const nC = document.getElementById(`edit-carga-${id}`).value;

    if (!nS || !nR) return mostrarAviso("Preencha todos os campos!");

    bancoDeDados.fichas[ativa][index].series = nS;
    bancoDeDados.fichas[ativa][index].reps = nR;
    bancoDeDados.fichas[ativa][index].carga = nC;

    salvarBanco();
    if(tipo === 'resumo') renderizarResumoFicha(ativa);
    else renderizarLogTreino();
    mostrarAviso("Registro atualizado com sucesso!");
}

function prepararRegistro() {
    showView('registro');
    const titulo = document.getElementById('nome-ficha-ativa');
    if(titulo) titulo.innerText = (fichaAtivaNoMomento || "TREINO").toUpperCase();
    renderizarLogTreino();
}

function removerExercicio(id, tipo) {
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    if (confirm("Deseja excluir este registro?")) {
        bancoDeDados.fichas[ativa] = bancoDeDados.fichas[ativa].filter(t => t.id !== id);
        salvarBanco();
        if(tipo === 'resumo') renderizarResumoFicha(ativa);
        else renderizarLogTreino();
        mostrarAviso("Exercício removido.");
    }
}

function limparTreino() {
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    if (ativa && confirm(`Limpar todos os registros de ${ativa}?`)) {
        bancoDeDados.fichas[ativa] = [];
        salvarBanco();
        renderizarLogTreino();
        mostrarAviso("Log de treino limpo.");
    }
}

function salvarBanco() {
    localStorage.setItem('fitai_pro_data', JSON.stringify(bancoDeDados));
}


// --- 6. CRONOGRAMA, RELÓGIO MULTIFUNÇÃO E LEMBRETES ---
function renderizarPaginaCronograma() {
    const container = document.getElementById('view-calendario');
    if (!container) return;

    const agora = new Date();
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const dataFormatada = `${agora.getDate()} de ${meses[agora.getMonth()]} de ${agora.getFullYear()}`;

    container.innerHTML = `
        <div class="glass-panel" style="padding: 20px; margin-bottom: 20px; min-height: 80vh;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <button onclick="showView('lobby')" style="background: rgba(255,255,255,0.1); border: none; color: white; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 0.7rem; font-weight: bold;">← VOLTAR</button>
                <div style="text-align: right;">
                    <h2 class="italic-bold" style="color: white; margin: 0; font-size: 1rem; letter-spacing: 1px;">CRONOGRAMA</h2>
                    <p style="color: #3b82f6; font-size: 10px; margin: 0; font-weight: bold; text-transform: uppercase;">${dataFormatada}</p>
                </div>
            </div>

            <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 20px; text-align: center; border: 1px solid rgba(59,130,246,0.3); margin-bottom: 25px;">
                <div id="display-timer" style="font-size: 2.8rem; color: white; font-weight: 900; font-family: 'Courier New', monospace; text-shadow: 0 0 15px rgba(59,130,246,0.5);">00:00:00<span style="font-size: 1.5rem; color: #3b82f6;">.00</span></div>
                
                <div style="display: flex; justify-content: center; gap: 10px; margin: 10px 0;">
                    <button onclick="setTimerMode(false)" id="btn-modo-livre" style="font-size: 10px; padding: 5px 12px; border-radius: 20px; border: 1px solid #3b82f6; background: #3b82f6; color: white; cursor: pointer;">LIVRE</button>
                    <button onclick="setTimerMode(true)" id="btn-modo-timer" style="font-size: 10px; padding: 5px 12px; border-radius: 20px; border: 1px solid #3b82f6; background: transparent; color: #3b82f6; cursor: pointer;">TIMER</button>
                </div>

                <div id="timer-input-container" class="hidden" style="margin-bottom: 15px;">
                    <p style="color: gray; font-size: 10px; margin-bottom: 5px;">DEFINIR TEMPO (MIN:SEG)</p>
                    <input type="time" id="input-timer-native" step="1" value="00:00:00" 
                        style="background: #0f172a; border: 1px solid #3b82f6; color: white; padding: 10px; border-radius: 10px; text-align: center; outline: none; font-family: monospace; font-size: 1.2rem; width: 100%; max-width: 200px;">
                </div>

                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="btn-timer-toggle" onclick="toggleTimer()" style="background: #3b82f6; border: none; color: white; padding: 12px; border-radius: 12px; font-weight: bold; cursor: pointer; flex: 2;">INICIAR</button>
                    <button onclick="resetTimer()" style="background: rgba(255,255,255,0.1); border: none; color: white; padding: 12px; border-radius: 12px; cursor: pointer; flex: 1;">ZERAR</button>
                </div>
            </div>
            
            <div style="margin-bottom: 25px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="color: white; font-size: 12px; margin: 0;" class="italic-bold uppercase">Frequência da Semana                         (Aperte para modificar a letra)</h3>
        <button onclick="limparFrequencia()" style="background: rgba(239, 68, 68, 0.1); border: none; color: #ef4444; font-size: 9px; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-weight: bold;">LIMPAR SEMANA</button>
    </div>
    <div id="calendario-semanal" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;"></div>
</div>

            <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.08);">
                <h3 style="color: white; font-size: 12px; margin-bottom: 12px;" class="italic-bold uppercase">Bloco de anotações</h3>
                <div id="lista-lembretes" style="margin-bottom: 15px; max-height: 220px; overflow-y: auto; padding-right: 5px;"></div>
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="input-lembrete" placeholder="Registrar observação..." style="flex: 1; background: #0f172a; border: 1px solid rgba(59,130,246,0.3); color: white; padding: 12px; border-radius: 10px; font-size: 12px; outline: none;">
                    <button onclick="adicionarLembrete()" style="background: #3b82f6; border: none; color: white; width: 45px; border-radius: 10px; font-size: 1.2rem; cursor: pointer; font-weight: bold;">+</button>
                </div>
            </div>
        </div>
        
        <style>
            input[type="time"]::-webkit-inner-spin-button,
            input[type="time"]::-webkit-calendar-picker-indicator {
                display: none;
                -webkit-appearance: none;
            }
        </style>
    `;
    gerarCalendario();
    renderizarLembretes();
    atualizarDisplayTimer();
}

// --- LÓGICA DO CALENDÁRIO COM DATAS REAIS ---
function gerarCalendario() {
    const calContainer = document.getElementById('calendario-semanal');
    if (!calContainer) return;

    const diasSemana = ["D", "S", "T", "Q", "Q", "S", "S"];
    calContainer.innerHTML = "";

    // Criamos os 7 dias da semana
    for (let i = 0; i < 7; i++) {
        // Busca se já existe uma marcação para esse dia no array diasTreinados
        // diasTreinados agora salvará objetos: { dia: 0, treino: 'A' }
        const registro = diasTreinados.find(d => d.dia === i);
        const letraTreino = registro ? registro.treino : ""; 
        const ativo = registro ? "border: 2px solid #3b82f6; background: rgba(59,130,246,0.2);" : "border: 1px solid rgba(255,255,255,0.1);";

        calContainer.innerHTML += `
            <div onclick="alternarTreinoDia(${i})" style="cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                <span style="font-size: 10px; color: gray; font-weight: bold;">${diasSemana[i]}</span>
                <div id="dia-${i}" style="width: 40px; height: 40px; ${ativo} border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: white; font-size: 1.2rem; transition: all 0.2s;">
                    ${letraTreino}
                </div>
            </div>
        `;
    }
}

function alternarTreinoDia(index) {
    // Ordem do ciclo: "" -> "A" -> "B" -> "C" -> ""
    const ciclos = ["", "A", "B", "C"];
    
    // Encontra o registro atual
    let registroIdx = diasTreinados.findIndex(d => d.dia === index);
    let novaLetra = "";

    if (registroIdx === -1) {
        // Se não existia, começa com A
        novaLetra = "A";
        diasTreinados.push({ dia: index, treino: novaLetra });
    } else {
        // Se existia, pega a próxima letra do ciclo
        let atualLetra = diasTreinados[registroIdx].treino;
        let proximoIdx = (ciclos.indexOf(atualLetra) + 1) % ciclos.length;
        novaLetra = ciclos[proximoIdx];

        if (novaLetra === "") {
            diasTreinados.splice(registroIdx, 1); // Remove se voltar ao vazio
        } else {
            diasTreinados[registroIdx].treino = novaLetra;
        }
    }

    // Salva e atualiza a interface
    localStorage.setItem('frequenciaTreino', JSON.stringify(diasTreinados));
    gerarCalendario();
}

function limparFrequencia() {
    if (confirm("Deseja zerar todas as marcações da semana?")) {
        diasTreinados = [];
        localStorage.setItem('frequenciaTreino', JSON.stringify(diasTreinados));
        gerarCalendario();
    }
}

function toggleDia(dataId) {
    if (diasTreinados.includes(dataId)) {
        diasTreinados = diasTreinados.filter(d => d !== dataId);
    } else {
        diasTreinados.push(dataId);
    }
    localStorage.setItem('frequenciaTreino', JSON.stringify(diasTreinados));
    gerarCalendario();
}

// --- LOG DE REGISTROS COM DATA E HORA ---
function adicionarLembrete() {
    const input = document.getElementById('input-lembrete');
    if (!input || !input.value.trim()) return;

    const agora = new Date();
    const dataHora = agora.toLocaleDateString('pt-BR') + " às " + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const novo = {
        id: Date.now(),
        texto: input.value,
        data: dataHora,
        feito: false
    };

    lembretes.unshift(novo); // Adiciona no topo da lista
    input.value = "";
    localStorage.setItem('fitai_lembretes', JSON.stringify(lembretes));
    renderizarLembretes();
}

function renderizarLembretes() {
    const container = document.getElementById('lista-lembretes');
    if (!container) return;

    if (lembretes.length === 0) {
        container.innerHTML = `<p style="color: gray; font-size: 11px; text-align: center; margin-top: 10px;">Nenhum registro histórico.</p>`;
        return;
    }

    container.innerHTML = lembretes.map(l => `
        <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 12px; margin-bottom: 10px; border-left: 3px solid ${l.feito ? '#10b981' : '#3b82f6'}; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                <span style="color: #3b82f6; font-size: 9px; font-weight: bold; text-transform: uppercase;">${l.data}</span>
                <button onclick="removerLembrete(${l.id})" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 12px;">✕</button>
            </div>
            <p onclick="toggleLembrete(${l.id})" style="color: ${l.feito ? '#64748b' : 'white'}; font-size: 13px; margin: 0; text-decoration: ${l.feito ? 'line-through' : 'none'}; cursor: pointer; line-height: 1.4;">
                ${l.texto}
            </p>
        </div>
    `).join('');
}

function toggleTimer() {
    const btn = document.getElementById('btn-timer-toggle');
    if (!isTimerRunning) {
        if (isCountdownMode && milissegundosTotais === 0) {
            const timeVal = document.getElementById('input-timer-native').value; // Formato "HH:MM:SS" ou "HH:MM"
            
            if (!timeVal) return mostrarAviso("Defina o tempo!");

            const partes = timeVal.split(':');
            let segundosIniciais = 0;

            if (partes.length === 3) { // HH:MM:SS
                segundosIniciais = (+partes[0]) * 3600 + (+partes[1]) * 60 + (+partes[2]);
            } else { // MM:SS ou HH:MM dependendo do browser
                segundosIniciais = (+partes[0]) * 60 + (+partes[1]);
            }

            if (segundosIniciais <= 0) return mostrarAviso("Tempo inválido!");
            milissegundosTotais = segundosIniciais * 1000;
        }

        isTimerRunning = true;
        btn.innerText = "PAUSAR";
        btn.style.background = "#ef4444";
        
        timerInterval = setInterval(() => {
            if (isCountdownMode) {
                milissegundosTotais -= 10;
                if (milissegundosTotais <= 0) finalizarTimer();
            } else {
                milissegundosTotais += 10;
            }
            atualizarDisplayTimer();
        }, 10);
    } else {
        pausarTimer();
    }
}

function pausarTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    const btn = document.getElementById('btn-timer-toggle');
    if (btn) { btn.innerText = "RETOMAR"; btn.style.background = "#3b82f6"; }
}

function resetTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    milissegundosTotais = 0;
    atualizarDisplayTimer();
    const btn = document.getElementById('btn-timer-toggle');
    if (btn) { btn.innerText = "INICIAR"; btn.style.background = "#3b82f6"; }
}

function finalizarTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    milissegundosTotais = 0;
    atualizarDisplayTimer();
    const btn = document.getElementById('btn-timer-toggle');
    if (btn) { btn.innerText = "INICIAR"; btn.style.background = "#3b82f6"; }
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    mostrarAviso("TEMPO ESGOTADO! 🔥");
}

function atualizarDisplayTimer() {
    const display = document.getElementById('display-timer');
    if (!display) return;
    let tempo = Math.max(0, milissegundosTotais);
    const min = Math.floor((tempo % 3600000) / 60000);
    const seg = Math.floor((tempo % 60000) / 1000);
    const ms = Math.floor((tempo % 1000) / 10);
    display.innerHTML = `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}<span style="font-size: 1.5rem; color: #3b82f6;">.${ms.toString().padStart(2, '0')}</span>`;
}

function setTimerMode(isTimer) {
    isCountdownMode = isTimer;
    resetTimer();
    document.getElementById('btn-modo-timer').style.background = isTimer ? "#3b82f6" : "transparent";
    document.getElementById('btn-modo-timer').style.color = isTimer ? "white" : "#3b82f6";
    document.getElementById('btn-modo-livre').style.background = !isTimer ? "#3b82f6" : "transparent";
    document.getElementById('btn-modo-livre').style.color = !isTimer ? "white" : "#3b82f6";
    document.getElementById('timer-input-container').className = isTimer ? "" : "hidden";
}

function toggleLembrete(id) {
    const l = lembretes.find(item => item.id === id);
    if (l) l.feito = !l.feito;
    localStorage.setItem('fitai_lembretes', JSON.stringify(lembretes));
    renderizarLembretes();
}

function removerLembrete(id) {
    lembretes = lembretes.filter(l => l.id !== id);
    localStorage.setItem('fitai_lembretes', JSON.stringify(lembretes));
    renderizarLembretes();
}

// --- 7. INICIALIZAÇÃO ---
window.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('fitai_session');
    if (session) showView('lobby'); else showView('login');
    
    // Essas funções abaixo serão declaradas no final da página
    atualizarListaExercicios(); 
    gerarCalendario();
});

// --- 7. SISTEMA DE BLOG / EVOLUÇÃO (CONCERTADO PARA HTML FIXO) ---

function renderizarBlog() {
    // Como os botões agora estão fixos no HTML, 
    // esta função apenas garante que o feed de posts seja carregado.
    exibirPosts();
}

function exibirPosts() {
    const container = document.getElementById('feed-container') || document.getElementById('feed-evolucoes');
    if (!container) return;

    if (feedEvolucao.length === 0) {
        container.innerHTML = `<p style="color: gray; text-align: center; margin-top: 20px;">Nenhuma evolução postada ainda.</p>`;
        return;
    }

    container.innerHTML = feedEvolucao.map((post, index) => `
        <div class="glass-panel" style="margin-bottom: 20px; padding: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <small style="color: #3b82f6; font-weight: bold;">${post.data}</small>
                <button onclick="excluirPost(${index})" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 12px;">EXCLUIR</button>
            </div>
            <p style="color: white; white-space: pre-wrap; margin-bottom: 15px;">${post.texto}</p>
            ${post.midia ? (post.tipoMidia.includes('video') 
                ? `<video src="${post.midia}" controls style="width: 100%; border-radius: 10px;"></video>` 
                : `<img src="${post.midia}" style="width: 100%; border-radius: 10px;">`) : ''}
        </div>
    `).join('');
}

function previewMidia(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        midiaAnexada = e.target.result;
        const preview = document.getElementById('preview-container');
        if(preview) {
            preview.innerHTML = `<div style="position: relative;">
                <button onclick="midiaAnexada=null; this.parentElement.remove()" style="position: absolute; top: 5px; right: 5px; background: red; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer;">X</button>
                <p style="color: #3b82f6; font-size: 10px;">Mídia pronta para postar!</p>
            </div>`;
        }
    };
    reader.readAsDataURL(file);
}

function postarEvolucao() {
    const texto = document.getElementById('texto-evolucao').value;
    if (!texto && !midiaAnexada) return mostrarAviso("Escreva algo ou anexe uma foto/vídeo!");

    const novoPost = {
        texto: texto,
        midia: midiaAnexada,
        tipoMidia: midiaAnexada ? (midiaAnexada.includes('video') ? 'video' : 'image') : null,
        data: new Date().toLocaleString('pt-BR')
    };

    feedEvolucao.unshift(novoPost);
    localStorage.setItem('fitai_feed', JSON.stringify(feedEvolucao));
    
    // Limpar campos
    document.getElementById('texto-evolucao').value = "";
    midiaAnexada = null;
    const preview = document.getElementById('preview-container');
    if(preview) preview.innerHTML = "";
    
    exibirPosts();
    mostrarAviso("Evolução postada com sucesso!");
}

function excluirPost(index) {
    if (confirm("Deseja excluir esta postagem?")) {
        feedEvolucao.splice(index, 1);
        localStorage.setItem('fitai_feed', JSON.stringify(feedEvolucao));
        exibirPosts();
    }
}

// --- FUNÇÕES DE ÁUDIO (PARA O BOTÃO DE MICROFONE NO HTML) ---

function toggleGravacao() {
    const btn = document.getElementById('btn-mic');
    const timer = document.getElementById('timer-gravacao');

    if (!gravando) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();
            gravando = true;
            btn.style.background = "#ef4444"; // Cor de gravando
            if(timer) timer.classList.remove('hidden');
            mostrarAviso("Gravando áudio...");
            
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                // Aqui você pode implementar lógica para salvar o áudio se desejar
                audioChunks = [];
            };
        }).catch(() => mostrarAviso("Erro ao acessar microfone."));
    } else {
        mediaRecorder.stop();
        gravando = false;
        btn.style.background = "#3b82f6"; // Volta ao azul
        if(timer) timer.classList.add('hidden');
        mostrarAviso("Gravação finalizada.");
    }
}

// Inicialização automática ao carregar
window.onload = () => {
    const session = localStorage.getItem('fitai_session');
    if (session) showView('lobby');
};

function mostrarPreviewAudio() {
    const preview = document.getElementById('media-preview');
    preview.classList.remove('hidden');
    preview.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <audio src="${midiaAnexada.url}" controls style="height: 30px; flex: 1;"></audio>
            <button onclick="limparMedia()" style="background:none; border:none; color:red; cursor:pointer;">✕</button>
        </div>
    `;
}

function iniciarTimer(display) {
    let seg = 0;
    const interval = setInterval(() => {
        if (!gravando) {
            clearInterval(interval);
            display.innerText = "00:00";
            return;
        }
        seg++;
        const m = Math.floor(seg / 60).toString().padStart(2, '0');
        const s = (seg % 60).toString().padStart(2, '0');
        display.innerText = `${m}:${s}`;
    }, 1000);
}

function limparMedia() {
    midiaAnexada = null;
    document.getElementById('media-preview').classList.add('hidden');
    document.getElementById('media-preview').innerHTML = "";
}

function excluirPost(id) {
    if (confirm("Remover este momento da sua história?")) {
        feedEvolucao = feedEvolucao.filter(p => p.id !== id);
        localStorage.setItem('fitai_feed', JSON.stringify(feedEvolucao));
        exibirPosts();
    }
}

