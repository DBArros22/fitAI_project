let bancoDeDados = JSON.parse(localStorage.getItem('fitai_pro_data')) || { fichas: {} };
let diasTreinados = JSON.parse(localStorage.getItem('frequenciaTreino')) || [];
let usuariosCadastrados = JSON.parse(localStorage.getItem('fitai_users')) || [];
let lembretes = JSON.parse(localStorage.getItem('fitai_lembretes')) || [];
let fichaAtivaNoMomento = "";
let fichaAtiva = null;

// Variáveis do Cronômetro Multi-Função
let timerInterval;
let timerSeconds = 0;
let isTimerRunning = false;
let isCountdownMode = false; // Alterna entre Cronômetro e Temporizador

const dicionarioExercicios = {
    "Peito": ["Supino Reto (Barra)", "Supino Inclinado (Halter)", "Crucifixo Máquina (Peck Deck)", "Crossover Polia Alta", "Supino Declinado", "Flexão de Braços (Push-up)", "Dips (Paralelas - Foco Peito)"],
    "Costas": ["Puxada Alta (Lat Pulldown)", "Remada Baixa Sentado", "Remada Curvada (Barra)", "Pull Down Corda", "Levantamento Terra (Deadlift)", "Barra Fixa (Pull-up)", "Remada Unilateral (Serrote)"],
    "Pernas": ["Agachamento Livre (Back Squat)", "Leg Press 45°", "Cadeira Extensora", "Mesa Flexora", "Afundo / Passada", "Hack Squat", "Elevação de Gêmeos (Panturrilha)", "Stiff (Peso Morto Romeno)"],
    "Ombros": ["Desenvolvimento Militar (Overhead Press)", "Elevação Lateral (Halter)", "Elevação Frontal", "Crucifixo Inverso (Posterior de Ombro)", "Desenvolvimento Arnold", "Encolhimento (Trapézio)"],
    "Braços": ["Rosca Direta (Barra W)", "Tríceps Pulley (Corda)", "Rosca Martelo", "Tríceps Testa", "Rosca Concentrada", "Tríceps Coice (Halter)", "Rosca Scott"],
    "Core": ["Prancha Abdominal (Plank)", "Abdominal Supra (Crunch)", "Elevação de Pernas (Infra)", "Abdominal Roda (Ab Wheel)", "Prancha Lateral", "Russian Twist"]
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

function renderizarResumoFicha(nome) {
    const container = document.getElementById('lista-exercicios-estaticos');
    if(!container) return;
    container.innerHTML = "";
    const exercicios = bancoDeDados.fichas[nome] || [];

    exercicios.forEach(ex => {
        container.innerHTML += `
            <div id="item-resumo-${ex.id}" style="background:rgba(255,255,255,0.05); padding:15px; border-radius:15px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                <div style="flex: 1;">
                    <h4 class="italic-bold" style="color: white; text-transform: uppercase; margin: 0; font-size: 14px;">${ex.nome}</h4>
                    <div id="dados-resumo-${ex.id}" style="margin-top: 5px;">
                        <span style="color: #94a3b8; font-size: 12px;">
                            ${ex.series}x${ex.reps} — <span style="color: #3b82f6; font-weight:bold;">${ex.carga}kg</span>
                        </span>
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
    containerDetalhes.innerHTML = exercicios.map(ex => `
        <div style="background:rgba(255,255,255,0.03); padding:15px; border-radius:15px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
            <div><h4 style="color:white; margin:0;">${ex.nome}</h4></div>
            <div style="text-align:right;">
                <p style="color:white; font-weight:900; margin:0;">${ex.series}x${ex.reps}</p>
                <p style="color:gray; font-size:10px; margin:0;">${ex.carga} KG</p>
            </div>
        </div>`).join('') || "<p style='color:gray; text-align:center;'>Vazio.</p>";
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
    if (!ativa) return mostrarAviso("Selecione uma ficha!");

    const novo = {
        id: Date.now(),
        grupo: document.getElementById('select-grupo').value,
        nome: document.getElementById('select-exercicio').value,
        series: document.getElementById('series-ex').value,
        reps: document.getElementById('reps-ex').value,
        carga: document.getElementById('carga-ex').value || 0
    };

    if (!novo.series || !novo.reps) return mostrarAviso("Preencha séries e repetições!");

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
            <div id="item-log-${ex.id}" class="treino-item" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 10px;">
                <div style="flex: 1;">
                    <h4 class="italic-bold" style="color: white; text-transform: uppercase; margin: 0; font-size: 14px;">${ex.nome}</h4>
                    <div id="dados-log-${ex.id}" style="margin-top: 5px;">
                        <span style="color: #94a3b8; font-size: 12px;">${ex.series}x${ex.reps} — <span style="color: #3b82f6; font-weight:bold;">${ex.carga}kg</span></span>
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
                <h3 style="color: white; font-size: 12px; margin-bottom: 12px;" class="italic-bold uppercase">Frequência da Semana</h3>
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
    const calEl = document.getElementById('calendario-semanal');
    if (!calEl) return;
    
    const diasSiglas = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    const hoje = new Date();
    const diaAtualSemana = hoje.getDay();
    
    calEl.innerHTML = "";

    for (let i = 0; i < 7; i++) {
        // Calcula a data de cada dia da semana atual (de Domingo a Sábado)
        const dataDia = new Date();
        dataDia.setDate(hoje.getDate() - (diaAtualSemana - i));
        
        const dataString = dataDia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const idUnico = dataDia.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        const jaTreinou = diasTreinados.includes(idUnico);
        const ehHoje = i === diaAtualSemana;

        calEl.innerHTML += `
            <div onclick="toggleDia('${idUnico}')" style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                <span style="font-size: 9px; color: ${ehHoje ? '#3b82f6' : 'gray'}; margin-bottom: 4px; font-weight: bold;">${diasSiglas[i]}</span>
                <div style="width: 100%; aspect-ratio: 1/1; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid ${jaTreinou ? '#3b82f6' : (ehHoje ? 'rgba(59,130,246,0.5)' : '#1e293b')}; background: ${jaTreinou ? 'rgba(59,130,246,0.2)' : 'transparent'}; transition: 0.2s;">
                    <span style="font-size: 9px; color: ${jaTreinou ? 'white' : 'gray'}; font-weight: bold;">${dataDia.getDate()}</span>
                    ${jaTreinou ? '<span style="font-size: 10px; margin-top: 2px;">🔥</span>' : ''}
                </div>
            </div>`;
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
    if (session) {
        showView('lobby');
    } else {
        showView('login');
    }
    
    atualizarListaExercicios();
    // Inicia o calendário caso o elemento já exista (fallback)
    gerarCalendario();
});
