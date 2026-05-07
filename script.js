let bancoDeDados = JSON.parse(localStorage.getItem('fitai_pro_data')) || { fichas: {} };
let diasTreinados = JSON.parse(localStorage.getItem('frequenciaTreino')) || [];
let usuariosCadastrados = JSON.parse(localStorage.getItem('fitai_users')) || [];
let lembretes = JSON.parse(localStorage.getItem('fitai_lembretes')) || [];
let feedEvolucao = JSON.parse(localStorage.getItem('fitai_feed')) || []; 
let midiaAnexada = null; // Controle de anexo do blog
let cronometrosAtivos = {}; // Armazena os intervalos de cada exercício
let tempoMestreAtivo = null;
let milisegundosAcumulados = 0;
let timestampInicio = null;

const salvarDados = salvarBanco;
const series = parseInt(document.getElementById('series-ex').value) || 0;
const reps = parseInt(document.getElementById('reps-ex').value) || 0;
const carga = parseFloat(document.getElementById('carga-ex').value) || 0;

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
    
    // 1. Alterna a visibilidade das abas
    if (tab === 'login') {
        selector.classList.remove('cadastro-active');
        loginForm.classList.remove('hidden');
        cadastroForm.classList.add('hidden');
    } else {
        selector.classList.add('cadastro-active');
        loginForm.classList.add('hidden');
        cadastroForm.classList.remove('hidden');
    }

    // 2. Limpeza inteligente dos campos
    const todosInputs = document.querySelectorAll('.auth-card .input-field');
    const emailSalvo = localStorage.getItem('fitai_remember_email');

    todosInputs.forEach(input => {
        // Se estivermos voltando para o Login e este for o campo de e-mail com dado salvo, não limpa
        if (tab === 'login' && input.id === 'login-email' && emailSalvo) {
            input.value = emailSalvo;
            return;
        }
        
        // Limpa todos os outros campos (senhas, nomes, campos de cadastro, etc)
        input.value = '';
    });
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
    const rememberMe = document.getElementById('remember-me').checked; // Captura o checkbox
    
    const user = usuariosCadastrados.find(u => u.email === email && u.pass === pass);
    
    if (user) {
        // Lógica de Sessão
        localStorage.setItem('fitai_session', JSON.stringify(user));
        
        // Lógica de "Lembrar de Mim"
        if (rememberMe) {
            localStorage.setItem('fitai_remember_email', email);
        } else {
            localStorage.removeItem('fitai_remember_email');
        }
        
        showView('lobby');
    } else {
        mostrarAviso("E-mail ou senha incorretos!");
    }
}

function logout() {
    // Cria o modal de confirmação com o estilo platinado
    const modalSair = document.createElement('div');
    modalSair.style = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(2, 6, 23, 0.9); backdrop-filter: blur(12px);
        display: flex; align-items: center; justify-content: center;
        z-index: 100000; padding: 20px;
    `;

    modalSair.innerHTML = `
        <div class="glass-panel fade-in" style="max-width: 320px; width: 100%; padding: 35px; text-align: center; border: 1px solid rgba(255,255,255,0.1); background: var(--bg-card); border-radius: 28px;">
            <div style="width: 60px; height: 60px; background: rgba(255, 255, 255, 0.05); border: 2px solid var(--text-secondary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: var(--text-secondary);">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </div>
            <h3 class="italic-bold" style="color: white; margin-bottom: 10px; font-size: 1.1rem; letter-spacing: 1px;">ENCERRAR SESSÃO?</h3>
            <p style="color: var(--text-secondary); margin-bottom: 25px; font-size: 13px; line-height: 1.5;">Você voltará para a tela de login.</p>
            
            <div style="display: flex; gap: 10px;">
                <button id="btn-cancelar-sair" style="flex: 1; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 12px; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 12px;">VOLTAR</button>
                <button id="btn-confirmar-sair" style="flex: 1; background: var(--text-primary); color: #020617; border: none; padding: 12px; border-radius: 12px; font-weight: 900; cursor: pointer; font-size: 12px; box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1);">SAIR</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalSair);

    // Lógica dos botões
    document.getElementById('btn-cancelar-sair').onclick = () => modalSair.remove();

    document.getElementById('btn-confirmar-sair').onclick = () => {
        // Agora sim, executa a sua lógica original
        localStorage.removeItem('fitai_session');
        location.reload();
    };
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
                <button onclick="event.stopPropagation(); confirmarAcaoOriginal('EXCLUIR FICHA?', 'Deseja remover toda a ficha ${nome}?', () => excluirFicha('${nome}'))" class="btn-action btn-delete-action">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>`;
    });
}

function criarNovaFicha() {
    // Chamamos o modal moderno em vez do prompt
    solicitarNomeFichaCustom((nome) => {
        // Esta parte só executa quando o usuário clica em "CRIAR" no modal
        if (nome && !bancoDeDados.fichas[nome]) {
            bancoDeDados.fichas[nome] = [];
            salvarBanco();
            renderizarFichas();
            mostrarAviso(`Treino ${nome} criado com sucesso!`);
        } else if (bancoDeDados.fichas[nome]) {
            mostrarAviso("Este nome de treino já existe.");
        }
    });
}

function solicitarNomeFichaCustom(callback) {
    const modalInput = document.createElement('div');
    modalInput.style = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(2, 6, 23, 0.9); backdrop-filter: blur(12px);
        display: flex; align-items: center; justify-content: center;
        z-index: 100000; padding: 20px;
    `;

    modalInput.innerHTML = `
        <div class="glass-panel fade-in" style="max-width: 400px; width: 100%; padding: 35px; border: 1px solid var(--accent-blue); background: var(--bg-card); border-radius: 28px;">
            <div class="card-icon" style="margin: 0 auto 20px; background: rgba(56, 189, 248, 0.1); border-color: var(--accent-blue);">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
            <h3 class="italic-bold" style="color: white; text-align: center; margin-bottom: 10px; font-size: 1.2rem;">NOVA FICHA</h3>
            <p style="color: var(--text-secondary); text-align: center; margin-bottom: 25px; font-size: 13px;">Como você quer chamar este novo treino?</p>
            
            <div class="form-group" style="margin-bottom: 25px;">
                <input type="text" id="input-nome-ficha" placeholder="Ex: TREINO A - SUPERIORES" class="input-field" style="text-align: center; text-transform: uppercase; font-weight: 800;">
            </div>

            <div style="display: flex; gap: 12px;">
                <button id="btn-cancelar-nome" style="flex: 1; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 14px; border-radius: 14px; font-weight: 700; cursor: pointer;">CANCELAR</button>
                <button id="btn-confirmar-nome" style="flex: 1; background: var(--accent-blue); color: #020617; border: none; padding: 14px; border-radius: 14px; font-weight: 900; cursor: pointer; box-shadow: 0 4px 15px rgba(56, 189, 248, 0.3);">CRIAR</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalInput);
    
    const inputField = document.getElementById('input-nome-ficha');
    inputField.focus();

    // Fecha ao cancelar
    document.getElementById('btn-cancelar-nome').onclick = () => modalInput.remove();

    // Lógica de confirmação
    document.getElementById('btn-confirmar-nome').onclick = () => {
        const nome = inputField.value.trim().toUpperCase();
        if (nome) {
            callback(nome);
            modalInput.remove();
        } else {
            inputField.style.borderColor = "#ef4444";
        }
    };

    // Confirmar com a tecla Enter
    inputField.onkeydown = (e) => {
        if (e.key === 'Enter') document.getElementById('btn-confirmar-nome').click();
    };
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
        const infoExibicao = ex.tipo === 'tempo' 
            ? `<span style="color: #10b981; font-weight:bold;">⏱️ ${formatarTempoParaExibicao(ex.tempo)}</span>`
            : `<span style="color: #94a3b8; font-size: 12px;">${ex.series}x${ex.reps} — <span style="color: #3b82f6; font-weight:bold;">${ex.carga}kg</span></span>`;

        container.innerHTML += `
            <div id="item-resumo-${ex.id}" style="background:rgba(255,255,255,0.05); padding:15px; border-radius:15px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <div style="flex: 1;">
                    <h4 class="italic-bold" style="color: white; text-transform: uppercase; margin: 0; font-size: 14px;">${ex.nome}</h4>
                    <div id="dados-resumo-${ex.id}" style="margin-top: 5px;">${infoExibicao}</div>
                </div>
                <div id="acoes-resumo-${ex.id}" style="display: flex; gap: 10px;">
                    <button class="btn-action" onclick="ativarEdicaoInline(${ex.id}, 'resumo')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-action btn-delete-action" onclick="confirmarAcaoOriginal('REMOVER EXERCÍCIO?', 'Remover este item da sua ficha?', () => removerExercicio(${ex.id}, 'resumo'))">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>`;
    });
}

function excluirFicha(nome) {
    // 1. Remove a ficha do objeto local
    if (bancoDeDados.fichas[nome]) {
        delete bancoDeDados.fichas[nome];
        
        // 2. CHAMA O NOME CORRETO: salvarBanco (que você já usa em outras partes)
        salvarBanco(); 
        
        // 3. Atualiza a tela para a ficha sumir da lista
        renderizarFichas();
        
        // 4. Feedback visual para o usuário
        mostrarAviso("Ficha excluída com sucesso!");
    } else {
        console.error("Ficha não encontrada para exclusão:", nome);
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
        const infoEsquerda = ex.tipo === 'tempo' 
            ? `<p style="color:#10b981; font-weight:900; margin:0;">${formatarTempoParaExibicao(ex.tempo)}</p>`
            : `<p style="color:white; font-weight:900; margin:0;">${ex.series}x${ex.reps} <span style="color:gray; font-size:10px;">${ex.carga}KG</span></p>`;

        return `
        <div class="glass-panel" style="margin-bottom: 12px; padding: 15px; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border-radius: 15px;">
            <div style="flex: 1;">
                <h4 style="color:white; margin:0; text-transform: uppercase; font-size: 13px;">${ex.nome}</h4>
                ${infoEsquerda}
                <small id="last-time-${ex.id}" style="color: #3b82f6; font-size: 10px; font-weight: bold;">Último: --</small>
            </div>

            <div style="display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 12px;">
                <span id="timer-set-${ex.id}" style="font-family: monospace; color: #10b981; font-weight: bold; font-size: 18px; min-width: 40px; text-align: center;">0s</span>
                <button id="btn-timer-set-${ex.id}" onclick="controlarCronometroSet(${ex.id})" 
                    style="background: #3b82f6; border: none; border-radius: 8px; width: 35px; height: 35px; cursor: pointer; color: white; display: flex; align-items: center; justify-content: center; font-size: 12px;">
                    ▶️
                </button>
            </div>
        </div>`;
    }).join('') || "<p style='color:gray; text-align:center;'>Vazio.</p>";
    setTimeout(recuperarCronometrosAtivos, 100);
}

// Cronometro página de consulta 
function controlarCronometroSet(id) {
    const display = document.getElementById(`timer-set-${id}`);
    const btn = document.getElementById(`btn-timer-set-${id}`);
    const lastDisplay = document.getElementById(`last-time-${id}`);

    // Se NÃO está rodando, vamos INICIAR
    if (!cronometrosAtivos[id]) {
        const startTime = Date.now();
        localStorage.setItem(`timer_start_${id}`, startTime);
        
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12"></rect></svg>`;
        btn.style.background = "#ef4444";

        cronometrosAtivos[id] = setInterval(() => {
            const passados = Date.now() - startTime;
            
            const h = Math.floor(passados / 3600000);
            const m = Math.floor((passados % 3600000) / 60000);
            const s = Math.floor((passados % 60000) / 1000);
            const ms = Math.floor((passados % 1000) / 10);

            let texto = "";
            if (h > 0) texto += (h < 10 ? "0"+h : h) + ":";
            texto += (m < 10 ? "0"+m : m) + ":";
            texto += (s < 10 ? "0"+s : s) + ".";
            texto += (ms < 10 ? "0"+ms : ms);
            
            if (display) display.innerText = texto;
        }, 40);

    } else {
        // --- A ORDEM AQUI É CRUCIAL PARA NÃO ZERAR ---
        
        // 1. Primeiro, capturamos o tempo que está no visor AGORA
        const tempoCapturado = display.innerText; 

        // 2. Paramos o relógio
        clearInterval(cronometrosAtivos[id]);
        
        // 3. Deletamos o registro de atividade
        delete cronometrosAtivos[id];
        localStorage.removeItem(`timer_start_${id}`);

        // 4. Atualizamos o ícone
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        btn.style.background = "var(--accent-blue)";
        
        // 5. Só agora jogamos o valor capturado para o "Último"
        if(lastDisplay && tempoCapturado !== "00:00.00") {
            lastDisplay.innerText = "Último: " + tempoCapturado;
        }

        // 6. Por fim, limpamos o visor principal para o próximo set
        display.innerText = "00:00.00";
    }
}

function recuperarCronometrosAtivos() {
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('timer_start_')) {
            const id = key.replace('timer_start_', '');
            // Se o elemento existe na tela, clica nele para retomar a contagem automaticamente
            // Ou simplesmente chamamos a função novamente passando o ID
            const startTimeOriginal = parseInt(localStorage.getItem(key));
            const display = document.getElementById(`timer-set-${id}`);
            const btn = document.getElementById(`btn-timer-set-${id}`);

            if (display && btn) {
                // Reinicia a interface sem criar um novo tempo de início
                btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12"></rect></svg>`;
                btn.style.background = "#ef4444";

                cronometrosAtivos[id] = setInterval(() => {
                    const passados = Date.now() - startTimeOriginal;
                    const h = Math.floor(passados / 3600000);
                    const m = Math.floor((passados % 3600000) / 60000);
                    const s = Math.floor((passados % 60000) / 1000);
                    const ms = Math.floor((passados % 1000) / 10);
                    
                    let texto = "";
                    if (h > 0) texto += (h < 10 ? "0"+h : h) + ":";
                    texto += (m < 10 ? "0"+m : m) + ":";
                    texto += (s < 10 ? "0"+s : s) + ".";
                    texto += (ms < 10 ? "0"+ms : ms);
                    display.innerText = texto;
                }, 40);
            }
        }
    });
}

// Função auxiliar que cuida apenas da atualização do texto na tela
function executarRelogio(id, startTime) {
    const display = document.getElementById(`timer-set-${id}`);
    
    cronometrosAtivos[id] = setInterval(() => {
        const agora = Date.now();
        const passados = agora - startTime;
        
        const h = Math.floor(passados / 3600000);
        const m = Math.floor((passados % 3600000) / 60000);
        const s = Math.floor((passados % 60000) / 1000);
        const ms = Math.floor((passados % 1000) / 10);

        let texto = "";
        if (h > 0) texto += (h < 10 ? "0"+h : h) + ":";
        texto += (m < 10 ? "0"+m : m) + ":";
        texto += (s < 10 ? "0"+s : s) + ".";
        texto += (ms < 10 ? "0"+ms : ms);
        
        if (display) display.innerText = texto;
    }, 40);
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
        let infoBadge = ex.tipo === 'tempo' 
            ? `<span style="color: #10b981; font-weight:bold; font-size: 12px;">⏱️ ${formatarTempoParaExibicao(ex.tempo)}</span>`
            : `<span style="color: #94a3b8; font-size: 12px;">${ex.series}x${ex.reps} — <span style="color: #3b82f6; font-weight:bold;">${ex.carga}kg</span></span>`;

        container.innerHTML += `
            <div id="item-log-${ex.id}" class="treino-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 10px;">
                <div style="flex: 1;">
                    <h4 class="italic-bold" style="color: white; text-transform: uppercase; margin: 0; font-size: 14px;">${ex.nome}</h4>
                    <div id="dados-log-${ex.id}" style="margin-top: 5px;">${infoBadge}</div>
                </div>
                <div id="acoes-log-${ex.id}" style="display: flex; gap: 10px;">
                    <button class="btn-action" onclick="ativarEdicaoInline(${ex.id}, 'log')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-action btn-delete-action" onclick="confirmarAcaoOriginal('REMOVER EXERCÍCIO?', 'Remover ${ex.nome} do treino atual?', () => removerExercicio(${ex.id}, 'log'))">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
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

function removerExercicio(id, contexto) {
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    if (!ativa) return;

    // Filtra o exercício para remover
    bancoDeDados.fichas[ativa] = bancoDeDados.fichas[ativa].filter(ex => ex.id !== id);
    
    // CORREÇÃO AQUI: de salvarDados() para salvarBanco()
    salvarBanco(); 

    if (contexto === 'resumo') {
        renderizarResumoFicha(ativa);
    } else {
        renderizarLogTreino();
    }
    mostrarAviso("Exercício removido.");
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

// --- 7 - FUNÇÕES PAGINA BLOG EVOLUÇÕES

function renderizarBlog() {
    const container = document.getElementById('view-blog');
    if (!container) return;

    container.innerHTML = `
        <div class="glass-panel" style="padding: 20px; min-height: 85vh; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <button onclick="showView('lobby')" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 10px 15px; border-radius: 12px; cursor: pointer; font-size: 0.7rem; font-weight: bold; letter-spacing: 1px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-right: 5px; vertical-align: middle;"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>VOLTAR
                </button>
                <div style="text-align: right;">
                    <h2 class="italic-bold" style="color: white; margin: 0; font-size: 1.1rem; letter-spacing: 2px; text-transform: uppercase;">FEED</h2>
                    <p style="color: #3b82f6; font-size: 9px; margin: 0; font-weight: 900; letter-spacing: 1px;">EVOLUÇÃO PRO</p>
                </div>
            </div>

            <div class="glass-panel" style="background: rgba(255,255,255,0.05); padding: 18px; border-radius: 20px; margin-bottom: 30px; border: 1px solid rgba(59,130,246,0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                <textarea id="post-texto" placeholder="Como foi o treino hoje? Relate sua evolução..." 
                    style="width: 100%; background: transparent; border: none; color: white; font-family: inherit; resize: none; outline: none; margin-bottom: 15px; font-size: 14px; min-height: 60px;"></textarea>
                
                <div id="preview-midia" style="margin-bottom: 15px; display: flex; flex-wrap: wrap; gap: 10px;"></div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
                    <div style="display: flex; gap: 12px;">
                        <label style="cursor: pointer; background: rgba(255,255,255,0.05); width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1); transition: 0.3s;">
                            <input type="file" accept="image/*" onchange="anexarMidia(this)" style="display: none;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        </label>
                        <button id="btn-mic" onclick="toggleGravacaoAudio()" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); width: 40px; height: 40px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                        </button>
                    </div>
                    <button onclick="postarNoFeed()" style="background: #3b82f6; color: white; border: none; padding: 10px 25px; border-radius: 12px; font-weight: 900; font-size: 12px; cursor: pointer; box-shadow: 0 4px 15px rgba(59,130,246,0.4); text-transform: uppercase; letter-spacing: 1px;">POSTAR</button>
                </div>
            </div>

            <div id="feed-container" style="display: flex; flex-direction: column; gap: 20px;"></div>
        </div>
    `;
    atualizarFeedUI();
}

function anexarMidia(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            midiaAnexada = { tipo: 'foto', data: e.target.result };
            document.getElementById('preview-midia').innerHTML = `
                <div style="position: relative; display: inline-block;">
                    <img src="${e.target.result}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 10px; border: 2px solid #3b82f6;">
                    <button onclick="midiaAnexada = null; document.getElementById('preview-midia').innerHTML = ''" 
                        style="position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 10px;">X</button>
                </div>`;
        };
        reader.readAsDataURL(file);
    }
}

async function toggleGravacaoAudio() {
    const btn = document.getElementById('btn-mic');
    if (!gravando) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
            const reader = new FileReader();
            reader.onload = (e) => {
                midiaAnexada = { tipo: 'audio', data: e.target.result };
                document.getElementById('preview-midia').innerHTML = `
                    <div style="background: #1e293b; padding: 10px; border-radius: 10px; color: #3b82f6; display: flex; align-items: center; gap: 10px;">
                        🎙️ Áudio Gravado <button onclick="midiaAnexada = null; document.getElementById('preview-midia').innerHTML = ''" style="color: red; border: none; background: none; cursor: pointer;">Remover</button>
                    </div>`;
            };
            reader.readAsDataURL(audioBlob);
        };
        mediaRecorder.start();
        gravando = true;
        btn.style.background = "#ef4444";
        btn.innerHTML = "⏹️";
    } else {
        mediaRecorder.stop();
        gravando = false;
        btn.style.background = "rgba(59,130,246,0.1)";
        btn.innerHTML = "🎙️";
    }
}

function postarNoFeed() {
    const texto = document.getElementById('post-texto').value;
    if (!texto && !midiaAnexada) return mostrarAviso("O post não pode estar vazio!");

    const novoPost = {
        id: Date.now(),
        data: new Date().toLocaleString('pt-BR'),
        texto: texto,
        midia: midiaAnexada
    };

    feedEvolucao.unshift(novoPost);
    localStorage.setItem('fitai_feed', JSON.stringify(feedEvolucao));
    
    midiaAnexada = null;
    document.getElementById('post-texto').value = "";
    document.getElementById('preview-midia').innerHTML = "";
    atualizarFeedUI();
    mostrarAviso("Postagem realizada!");
}

function atualizarFeedUI() {
    const container = document.getElementById('feed-container');
    if (!container) return;

    container.innerHTML = feedEvolucao.map(post => `
        <div class="glass-panel" style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 22px; border: 1px solid rgba(255,255,255,0.08); position: relative; overflow: hidden;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 35px; height: 35px; border-radius: 10px; background: linear-gradient(45deg, #3b82f6, #1d4ed8); display: flex; align-items: center; justify-content: center; font-weight: 900; color: white; font-size: 14px;">F</div>
                    <div>
                        <p style="color: white; font-size: 12px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Atleta FitAI</p>
                        <p style="color: #64748b; font-size: 9px; margin: 0;">${post.data}</p>
                    </div>
                </div>
                <button onclick="excluirPost(${post.id})" style="background: rgba(239, 68, 68, 0.1); border: none; width: 28px; height: 28px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
            
            <p style="color: #e2e8f0; margin: 0 0 15px 0; font-size: 14px; line-height: 1.6; font-weight: 400;">${post.texto}</p>
            
            ${post.midia ? (post.midia.tipo === 'foto' ? 
                `<div style="border-radius: 15px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); margin-top: 10px;">
                    <img src="${post.midia.data}" style="width: 100%; display: block;">
                </div>` : 
                `<div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 15px; margin-top: 10px; display: flex; align-items: center; gap: 10px; border: 1px solid rgba(59,130,246,0.2);">
                    <div style="background: #3b82f6; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </div>
                    <audio controls src="${post.midia.data}" style="flex: 1; height: 30px; filter: invert(1);"></audio>
                </div>`) : ''}
        </div>
    `).join('') || `<p style="color: #64748b; text-align: center; margin-top: 40px; font-size: 12px; letter-spacing: 1px;">AINDA NÃO HÁ ATIVIDADES NO FEED</p>`;
}

function excluirPost(id) {
    if (confirm("Deseja remover esta postagem?")) {
        feedEvolucao = feedEvolucao.filter(p => p.id !== id);
        localStorage.setItem('fitai_feed', JSON.stringify(feedEvolucao));
        atualizarFeedUI();
    }
}
// --- FUNÇÕES DE ÁUDIO (PARA O BOTÃO DE MICROFONE NO HTML) ---

async function toggleGravacao() {
    const btn = document.getElementById('btn-mic');
    const timer = document.getElementById('timer-gravacao');

    if (!gravando) {
        try {
            // Limpa chunks anteriores antes de começar
            audioChunks = []; 
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    // Vincula o áudio gravado à variável de mídia do post
                    midiaAnexada = { tipo: 'audio', data: reader.result };
                    atualizarPreviewMidia(); // Mostra para o usuário que o áudio está pronto
                };
                reader.readAsDataURL(audioBlob);

                // Desliga o microfone (libera o hardware)
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            gravando = true;
            
            // Estilo visual de gravando
            btn.style.background = "#ef4444"; 
            btn.classList.add('mic-gravando');
            if(timer) timer.classList.remove('hidden');
            mostrarAviso("Gravando áudio...");

        } catch (err) {
            console.error("Erro ao capturar áudio:", err);
            if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                mostrarAviso("Nenhum microfone foi detectado no seu dispositivo.");
            } else {
                mostrarAviso("Erro ao acessar microfone. Verifique as permissões.");
            }
        }
    } else {
        // Para a gravação
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        gravando = false;
        
        // Restaura o visual original
        btn.style.background = "rgba(255,255,255,0.05)"; 
        btn.classList.remove('mic-gravando');
        if(timer) timer.classList.add('hidden');
        mostrarAviso("Gravação finalizada e anexada.");
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
    // Cria um modal de confirmação customizado e platinado
    const modalConfirm = document.createElement('div');
    modalConfirm.id = 'modal-confirmacao-exclusao';
    modalConfirm.style = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(2, 6, 23, 0.9); backdrop-filter: blur(10px);
        display: flex; align-items: center; justify-content: center;
        z-index: 100000; padding: 20px;
    `;

    modalConfirm.innerHTML = `
        <div class="glass-panel" style="max-width: 340px; width: 100%; padding: 30px; text-align: center; border: 1px solid #ef4444; background: var(--bg-card); border-radius: 28px; box-shadow: 0 0 40px rgba(239, 68, 68, 0.2);">
            <div style="width: 60px; height: 60px; background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: #ef4444;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </div>
            <h3 class="italic-bold" style="color: white; margin-bottom: 10px; font-size: 1.1rem; letter-spacing: 1px;">EXCLUIR POST?</h3>
            <p style="color: var(--text-secondary); margin-bottom: 25px; font-size: 13px; line-height: 1.5;">Essa ação não pode ser desfeita e removerá este momento da sua história.</p>
            
            <div style="display: flex; gap: 10px;">
                <button id="btn-cancelar-exclusao" style="flex: 1; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 12px; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 12px;">CANCELAR</button>
                <button id="btn-confirmar-exclusao" style="flex: 1; background: #ef4444; color: white; border: none; padding: 12px; border-radius: 12px; font-weight: 900; cursor: pointer; font-size: 12px; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);">EXCLUIR</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalConfirm);

    // Lógica dos botões do modal
    document.getElementById('btn-cancelar-exclusao').onclick = () => modalConfirm.remove();

    document.getElementById('btn-confirmar-exclusao').onclick = () => {
        // 1. Filtra o array
        feedEvolucao = feedEvolucao.filter(p => p.id !== id);
        
        // 2. Salva no LocalStorage
        localStorage.setItem('fitai_feed', JSON.stringify(feedEvolucao));
        
        // 3. Remove o modal
        modalConfirm.remove();
        
        // 4. Atualiza a tela INSTANTANEAMENTE (usando o nome correto da função)
        atualizarFeedUI(); 
        
        // 5. Aviso de sucesso
        mostrarAviso("Post removido com sucesso.");
    };
}

function confirmarAcaoOriginal(titulo, mensagem, callback) {
    const modalConfirm = document.createElement('div');
    modalConfirm.style = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(2, 6, 23, 0.9); backdrop-filter: blur(10px);
        display: flex; align-items: center; justify-content: center;
        z-index: 100000; padding: 20px;
    `;

    modalConfirm.innerHTML = `
        <div class="glass-panel" style="max-width: 340px; width: 100%; padding: 30px; text-align: center; border: 1px solid #ef4444;">
            <div style="width: 60px; height: 60px; background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: #ef4444;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </div>
            <h3 class="italic-bold" style="color: white; margin-bottom: 10px; font-size: 1.1rem;">${titulo}</h3>
            <p style="color: var(--text-secondary); margin-bottom: 25px; font-size: 13px;">${mensagem}</p>
            <div style="display: flex; gap: 10px;">
                <button id="confirm-cancel" style="flex: 1; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 12px; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 12px;">VOLTAR</button>
                <button id="confirm-ok" style="flex: 1; background: #ef4444; color: white; border: none; padding: 12px; border-radius: 12px; font-weight: 900; cursor: pointer; font-size: 12px;">EXCLUIR</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalConfirm);

    document.getElementById('confirm-cancel').onclick = () => modalConfirm.remove();
    document.getElementById('confirm-ok').onclick = () => {
        callback();
        modalConfirm.remove();
    };
}

window.addEventListener('load', () => {
    const emailSalvo = localStorage.getItem('fitai_remember_email');
    const campoEmail = document.getElementById('login-email');
    const checkbox = document.getElementById('remember-me');

    if (emailSalvo && campoEmail) {
        campoEmail.value = emailSalvo;
        if (checkbox) checkbox.checked = true;
    }
});
