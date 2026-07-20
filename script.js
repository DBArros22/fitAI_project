const firebaseConfig = {
  apiKey: "AIzaSyCQcfeMAGcGFp1MTZTpAevihoSsg57M2U8",
  authDomain: "assisfit-pro.firebaseapp.com",
  projectId: "assisfit-pro",
  storageBucket: "assisfit-pro.firebasestorage.app",
  messagingSenderId: "859765965750",
  appId: "1:859765965750:web:e23c5fe1ec54a7d62df717",
  measurementId: "G-0V4XD960QL"
};

// Inicializa o Firebase Core
firebase.initializeApp(firebaseConfig);

// Atalhos globais para os serviços do Firebase
const auth = firebase.auth();
const db = firebase.firestore();

// Ativa a persistência offline básica do Firestore (opcional, para apps fitness em rede instável)
db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });
db.enablePersistence().catch(err => console.warn("Persistência offline desativada:", err.code));

// ============================================================================================================
// VARIÁVEIS GLOBAIS DE ESTADO (Substituindo o LocalStorage direto)
// ============================================================================================================

let usuarioAtualId = null;         // ID único (UID) do atleta logado no Firebase Auth
let bancoDeDados = { fichas: {} }; // Carregado de /usuarios/{UID}/treinos/fichas
let diasTreinados = [];            // Carregado de /usuarios/{UID}/historico/frequencia
let lembretes = [];                // Carregado de /usuarios/{UID}/lembretes
let feedEvolucao = [];             // Carregado da coleção global /feed
let assisData = null;              // Carregado do documento de perfil /usuarios/{UID}

// --- CONTROLES DE INTERFACE, CRONÔMETROS E MÍDIA (Mantidos Locais) ---
let midiaAnexada = null; 
let cronometrosAtivos = {}; 
let tempoMestreAtivo = null;
let milisegundosAcumulados = 0;
let timestampInicio = null;
window.cfIsPaused = false;
let fluxoTrocaEmailPendente = null;

// Variáveis de timers WOD e gravação de áudio
let cfTimerInterval = null;
let cfStartTime = 0; 
let cfLimitSeconds = 600; 
let cfModo = 'AMRAP';
let mediaRecorder;
let audioChunks = [];
let gravando = false;
let fichaAtivaNoMomento = "";
let fichaAtiva = null;
let timerInterval;
let milissegundosTotais = 0;
let isTimerRunning = false;
let isCountdownMode = false;

// Helpers auxiliares de input
const getSeries = () => parseInt(document.getElementById('series-ex')?.value) || 0;
const getReps = () => parseInt(document.getElementById('reps-ex')?.value) || 0;
const getCarga = () => parseFloat(document.getElementById('carga-ex')?.value) || 0;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Equivalências do Plano B (Estáticas)
const equivalencias = {
    "Supino": ["Supino Reto (Barra Olímpica)", "Supino Reto (Halteres)", "Supino Reto (Máquina Articulada)", "Chest Press Machine", "Flexão de Braços (Push-up)"],
    "Inclinado": ["Supino Inclinado (Halteres)", "Supino Inclinado (Barra)", "Supino Inclinado (Máquina)"],
    "Puxada": ["Lat Pulldown (Puxada Aberta)", "Puxada Triângulo", "Barra Fixa (Pull-up)"],
    "Remada": ["Remada Curvada (Barra)", "Remada Baixa (Triângulo)", "Remada Unilateral (Serrote)", "Remada Articulada (Máquina)"],
    "Agachamento": ["Agachamento Livre (Back Squat)", "Agachamento no Smith", "Leg Press 45°", "Agachamento Hack", "Goblet Squat (Halter)"],
    "Extensora": ["Cadeira Extensora", "Sissy Squat"],
    "Posterior": ["Mesa Flexora", "Cadeira Flexora", "Stiff (Romanian Deadlift)"],
    "Desenvolvimento": ["Desenvolvimento Militar (OHP)", "Desenvolvimento (Halteres)", "Desenvolvimento (Máquina)", "Desenvolvimento Arnold"]
};


async function carregarDadosDoAtleta(uid) {
    try {
        const doc = await db.collection("usuarios").doc(uid).get();
        if (doc.exists) {
            const dados = doc.data();
            // Atribui os dados carregados para as suas variáveis globais do sistema
            if (dados.bancoDeDados) bancoDeDados = dados.bancoDeDados;
            if (dados.treinos) bancoDeDados = dados.treinos; // Adapte para sua variável global
            console.log("Dados do atleta carregados com sucesso!");
        } else {
            console.log("Nenhum dado prévio encontrado para este atleta no Firestore.");
        }
    } catch (error) {
        console.error("Erro interno ao ler Firestore:", error);
    }
}

// Funções do perfil 

function carregarDadosPerfil() {
    const emailAtivo = localStorage.getItem('user_email');
    const usuarios = JSON.parse(localStorage.getItem('fitai_users')) || [];
    const user = usuarios.find(u => u.email === emailAtivo);

    if (user) {
        if (document.getElementById('perfil-nome')) document.getElementById('perfil-nome').value = user.nome || "";
        if (document.getElementById('perfil-tel')) document.getElementById('perfil-tel').value = user.tel || "";
        if (document.getElementById('perfil-email')) document.getElementById('perfil-email').value = user.email || "";
    }

    // Foto do Perfil
    const foto = localStorage.getItem('user_foto');
    if (foto) {
        const imgHtml = `<img src="${foto}" style="width:100%; height:100%; object-fit:cover;">`;
        const preview = document.getElementById('perfil-foto-preview');
        const navIcon = document.getElementById('nav-perfil-icon');
        if (preview) preview.innerHTML = imgHtml;
        if (navIcon) navIcon.innerHTML = imgHtml;
    }
}

function atualizarFotoPerfil(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const fotoUrl = e.target.result;
            localStorage.setItem('user_foto', fotoUrl);

            const imgHtml = `<img src="${fotoUrl}" style="width:100%; height:100%; object-fit:cover;">`;
            
            if (document.getElementById('perfil-foto-preview')) document.getElementById('perfil-foto-preview').innerHTML = imgHtml;
            if (document.getElementById('nav-perfil-icon')) document.getElementById('nav-perfil-icon').innerHTML = imgHtml;
            
            if (typeof atualizarFeedUI === "function") atualizarFeedUI();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

/**
 * 2. Salva Dados (Fluxo inteligente com labels dinâmicas em parênteses)
 */
async function salvarDadosPerfil(event) {
    const nome = document.getElementById('perfil-nome').value;
    const tel = document.getElementById('perfil-tel').value;
    const novoEmail = document.getElementById('perfil-email').value.trim();
    const emailAntigo = localStorage.getItem('user_email');
    
    const btn = event.currentTarget;

    if (novoEmail !== emailAntigo) {
        let usuarios = JSON.parse(localStorage.getItem('fitai_users')) || [];
        const emailJaExiste = usuarios.some(u => u.email === novoEmail);
        if (emailJaExiste) {
            mostrarAvisoNotificacao("Este e-mail já está sendo utilizado por outra conta!", "erro");
            return;
        }

        const codAntigo = Math.floor(100000 + Math.random() * 900000).toString();
        const codNovo = Math.floor(100000 + Math.random() * 900000).toString();

        fluxoTrocaEmailPendente = {
            nome: nome,
            tel: tel,
            emailAntigo: emailAntigo,
            novoEmail: novoEmail,
            codigoAntigoGerado: codAntigo,
            codigoNovoGerado: codNovo,
            btnAlvo: btn
        };

        async function carregarDadosDoUsuarioDoBanco() {
    if (typeof usuarioAtualId !== 'undefined' && usuarioAtualId) {
        await carregarDadosDoAtleta(usuarioAtualId);
    } else if (typeof auth !== 'undefined' && auth.currentUser) {
        await carregarDadosDoAtleta(auth.currentUser.uid);
    } else {
        console.warn("Tentativa de carregar dados, mas nenhum ID de usuário foi encontrado.");
    }
}

function atualizarListaExercicios() {
    // 1. Buscamos o elemento usando o ID REAL do seu HTML ('select-grupo-sub')
    const campoGrupo = document.getElementById('select-grupo-sub');
    
    // TRAVA DE SEGURANÇA: Se o campo não existir na tela atual (como no logout), para aqui e não quebra!
    if (!campoGrupo) return;

    // 2. Captura o valor selecionado
    const grupo = campoGrupo.value;
    const selectEx = document.getElementById('select-exercicio');
    const camposForca = document.getElementById('campos-forca');
    const camposCardio = document.getElementById('campos-cardio');

    if (!selectEx) return;
    if (!grupo) {
        selectEx.innerHTML = '<option value="">Selecione o Exercício...</option>';
        return;
    }

    // Alternar campos entre Peso (Força) e Tempo (Cardio)
    if (grupo === "Cardio & Aeróbico") {
        if (camposForca) camposForca.classList.add('hidden');
        if (camposCardio) camposCardio.classList.remove('hidden');
    } else {
        if (camposForca) camposForca.classList.remove('hidden');
        if (camposCardio) camposCardio.classList.add('hidden');
    }

    const lista = dicionarioExercicios[grupo] || [];

    selectEx.innerHTML = '<option value="">Selecione o Exercício...</option>' +
        lista.map(ex => `<option value="${ex}">${ex}</option>`).join('');
}atua
        // Atualiza dinamicamente as labels inserindo os e-mails entre parênteses
        const lblAntigo = document.getElementById('label-email-antigo');
        const lblNovo = document.getElementById('label-email-novo');
        if (lblAntigo) lblAntigo.innerText = `Código no E-mail Antigo (${emailAntigo}):`;
        if (lblNovo) lblNovo.innerText = `Código no Novo E-mail (${novoEmail}):`;

        console.log(`[BACKEND MOCK] Código para o e-mail antigo (${emailAntigo}): ${codAntigo}`);
        console.log(`[BACKEND MOCK] Código para o novo e-mail (${novoEmail}): ${codNovo}`);

        mostrarAvisoNotificacao("Códigos de segurança enviados!", "sucesso");
        abrirModalEmail();
        return; 
    }

    localStorage.setItem('user_nome', nome);
    localStorage.setItem('user_tel', tel);

    let usuarios = JSON.parse(localStorage.getItem('fitai_users')) || [];
    const index = usuarios.findIndex(u => u.email === emailAntigo);
    if (index !== -1) {
        usuarios[index].nome = nome;
        usuarios[index].tel = tel;
        localStorage.setItem('fitai_users', JSON.stringify(usuarios));
    }

    exibirFeedbackSucessoBotao(btn);
    if (typeof atualizarFeedUI === "function") atualizarFeedUI();
}

/**
 * Função para reenviar o código de verificação individualmente por canal
 */
function reenviarTokenSeguranca(tipo) {
    if (!fluxoTrocaEmailPendente) return;

    const novoCodigo = Math.floor(100000 + Math.random() * 900000).toString();

    if (tipo === 'antigo') {
        fluxoTrocaEmailPendente.codigoAntigoGerado = novoCodigo;
        console.log(`[BACKEND REENVIO] Novo código para e-mail antigo (${fluxoTrocaEmailPendente.emailAntigo}): ${novoCodigo}`);
        mostrarAvisoNotificacao(`Código reenviado para o e-mail antigo!`, "sucesso");
    } else {
        fluxoTrocaEmailPendente.codigoNovoGerado = novoCodigo;
        console.log(`[BACKEND REENVIO] Novo código para e-mail novo (${fluxoTrocaEmailPendente.novoEmail}): ${novoCodigo}`);
        mostrarAvisoNotificacao(`Código reenviado para o novo e-mail!`, "sucesso");
    }
}

function abrirModalEmail() {
    const modal = document.getElementById('modal-verificar-email');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
}

function fecharModalEmail() {
    const modal = document.getElementById('modal-verificar-email');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    document.getElementById('codigo-email-antigo').value = "";
    document.getElementById('codigo-email-novo').value = "";
    fluxoTrocaEmailPendente = null;
}

async function processarTrocaEmail() {
    if (!fluxoTrocaEmailPendente) return;

    const codAntigoDigitado = document.getElementById('codigo-email-antigo').value.trim();
    const codNovoDigitado = document.getElementById('codigo-email-novo').value.trim();

    if (codAntigoDigitado !== fluxoTrocaEmailPendente.codigoAntigoGerado) {
        mostrarAvisoNotificacao("Código do e-mail antigo incorreto!", "erro");
        return;
    }

    if (codNovoDigitado !== fluxoTrocaEmailPendente.codigoNovoGerado) {
        mostrarAvisoNotificacao("Código do novo e-mail incorreto!", "erro");
        return;
    }

    const f = fluxoTrocaEmailPendente;
    
    localStorage.setItem('user_nome', f.nome);
    localStorage.setItem('user_tel', f.tel);
    localStorage.setItem('user_email', f.novoEmail);

    let usuarios = JSON.parse(localStorage.getItem('fitai_users')) || [];
    const index = usuarios.findIndex(u => u.email === f.emailAntigo);
    
    if (index !== -1) {
        usuarios[index].nome = f.nome;
        usuarios[index].tel = f.tel;
        usuarios[index].email = f.novoEmail;
        localStorage.setItem('fitai_users', JSON.stringify(usuarios));
    }

    if (typeof salvarDados === 'function') salvarDados();

    exibirFeedbackSucessoBotao(f.btnAlvo);
    fecharModalEmail();
    mostrarAvisoNotificacao("Perfil e dados de login atualizados com sucesso!", "sucesso");
    
    if (typeof atualizarFeedUI === "function") atualizarFeedUI();
}

function exibirFeedbackSucessoBotao(btn) {
    if (!btn) return;
    const originalContent = btn.innerHTML;
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="3" fill="none" style="margin-right:8px"><polyline points="20 6 9 17 4 12"></polyline></svg> SALVO COM SUCESSO!`;
    btn.style.background = "#22c55e"; 
    btn.style.transform = "scale(0.98)";

    setTimeout(() => {
        btn.innerHTML = originalContent;
        btn.style.background = "";
        btn.style.transform = "";
    }, 2000);
}

function alterarSenhaPerfil() {
    const nova = document.getElementById('pass-nova').value;
    const confirmar = document.getElementById('pass-confirmar') ? document.getElementById('pass-confirmar').value : "";

    if (nova.length < 4) {
        mostrarAvisoNotificacao("A nova senha precisa ter no mínimo 4 caracteres!", "erro");
        return;
    }

    if (nova !== confirmar) {
        mostrarAvisoNotificacao("As senhas digitadas não coincidem!", "erro");
        return;
    }

    document.getElementById('modal-confirmar-senha').classList.remove('hidden');
    document.getElementById('modal-confirmar-senha').style.display = 'flex';
    document.getElementById('confirm-pass-atual').focus();
}

function fecharModalSenha() {
    document.getElementById('modal-confirmar-senha').classList.add('hidden');
    document.getElementById('modal-confirmar-senha').style.display = 'none';
    document.getElementById('confirm-pass-atual').value = "";
}

async function processarTrocaSenha() {
    const senhaAtualDigitada = document.getElementById('confirm-pass-atual').value;
    const novaSenha = document.getElementById('pass-nova').value;
    const emailAtivo = localStorage.getItem('user_email');
    
    let usuarios = JSON.parse(localStorage.getItem('fitai_users')) || [];
    const index = usuarios.findIndex(u => u.email === emailAtivo);

    if (index === -1) return;

    if (usuarios[index].pass !== senhaAtualDigitada) {
        const inputModal = document.getElementById('confirm-pass-atual');
        inputModal.style.border = "1px solid #ef4444";
        inputModal.value = "";
        inputModal.placeholder = "SENHA INCORRETA!";
        setTimeout(() => { inputModal.style.border = ""; inputModal.placeholder = "Senha Atual"; }, 2000);
        return;
    }

    usuarios[index].pass = novaSenha;
    localStorage.setItem('fitai_users', JSON.stringify(usuarios));
    
    if (typeof salvarDados === 'function') salvarDados();

    fecharModalSenha();
    const btnPrincipal = document.getElementById('btn-senha-perfil');
    if (btnPrincipal) {
        btnPrincipal.innerHTML = "✅ SENHA ATUALIZADA";
        btnPrincipal.style.background = "#22c55e";
        setTimeout(() => {
            btnPrincipal.innerHTML = "ALTERAR SENHA";
            btnPrincipal.style.background = "";
        }, 3000);
    }
    
    document.getElementById('pass-nova').value = "";
    if (document.getElementById('pass-confirmar')) document.getElementById('pass-confirmar').value = "";
    mostrarAvisoNotificacao("Senha modificada com sucesso!", "sucesso");
}

function mostrarAvisoNotificacao(mensagem, tipo = 'erro') {
    const existente = document.getElementById('toast-notificacao');
    if (existente) existente.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-notificacao';
    toast.className = tipo; 

    const icone = tipo === 'sucesso' 
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

    toast.innerHTML = `
        ${icone}
        <span>${mensagem}</span>
    `;

    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '1'; }, 10);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => toast.remove(), 500);
    }, 3500);
}

window.reenviarTokenSeguranca = reenviarTokenSeguranca;

// --- DICIONÁRIO TÉCNICO DE EXERCÍCIOS ---
const dicionarioExercicios = {
    "Peitoral": [
        "Supino Reto (Barra)", "Supino Reto (Halteres)", "Supino Reto (Máquina)", "Supino Reto Articulado Convergente", "Supino Reto Articulado Unilateral", "Supino Reto no Smith",
        "Supino Inclinado (Barra)", "Supino Inclinado (Halteres)", "Supino Inclinado (Máquina)", "Supino Inclinado Articulado Convergente", "Supino Inclinado Articulado Unilateral", "Supino Inclinado no Smith",
        "Supino Declinado (Barra)", "Supino Declinado (Halteres)", "Supino Declinado (Máquina)", "Supino Declinado Articulado",
        "Chest Press Vertical (Máquina)", "Chest Press Vertical Unilateral", "Chest Press Inclinado (Máquina)",
        "Peck Deck (Voador)", "Peck Deck Inclinado", "Peck Deck com Braços Estendidos",
        "Crucifixo Reto (Halteres)", "Crucifixo Inclinado (Halteres)", "Crucifixo Declinado (Halteres)",
        "Crucifixo Reto (Cabo)", "Crucifixo Inclinado (Cabo)", "Crucifixo Declinado (Cabo)", "Crucifixo na Máquina Articulada",
        "Crossover Polia Alta (Foco Inferior)", "Crossover Polia Baixa (Foco Superior)", "Crossover Polia Média (Foco Medial)", "Crossover Unilateral",
        "Dips (Paralelas Asas)", "Dips (Paralelas) Assistido no Graviton", "Dips com Carga (Cinturão)",
        "Flexão de Braços (Push-up Solo)", "Flexão de Braços Inclinada (Mãos no Banco)", "Flexão de Braços Declinada (Pés no Banco)", "Flexão de Braços com Joelhos no Solo", "Flexão Diamante (Foco Trípeps/Peito)", "Flexão Espartana", "Flexão de Braços com Pegada Aberta",
        "Pull-over (Halter)", "Pull-over (Barra)", "Pull-over na Polia Alta", "Pull-over na Máquina",
        "Press Around Unilateral (Cabo)", "Floor Press (Supino no Chão com Halteres)", "Squeeze Press (Halteres Juntos)", "Landmine Chest Press (Barra Guiada no Canto)"
    ],
    "Dorsais": [
        "Puxada Aberta (Polia)", "Puxada Triângulo (Polia Alta)", "Puxada Supinada (Polia)", "Puxada Romana (Pegada Neutra)", "Puxada Unilateral (Cabo)", "Puxada Aberta Máquina Articulada", "Puxada Articulada Supinada", "Puxada Articulada Neutra", "Puxada Atrás da Nuca", "Puxada com Barra Reta (Braços Estendidos)",
        "Remada Curvada (Barra Pronada)", "Remada Curvada (Barra Supinada)", "Remada Curvada (Halteres)", "Remada Unilateral (Serrote com Halter)", "Remada Unilateral no Banco Inclinado",
        "Remada Baixa (Triângulo)", "Remada Baixa (Barra Reta Pronada)", "Remada Baixa (Barra Reta Supinada)", "Remada Baixa Romana (Pegada Neutra)", "Remada Baixa Unilateral",
        "Remada Cavalinho (Barra T Livre)", "Remada Cavalinho (Aparelho Apoiado)",
        "Remada Articulada Baixa", "Remada Articulada Alta", "Remada Articulada Unilateral", "Remada Máquina Convergente",
        "Remada Smith (Pronada/Supinada)", "Remada Pendlay (Barra Morta no Solo)", "Remada Meadows (Unilateral com Barra Livre)", "Remada Invertida (Peso Corporal na Barra)",
        "Pull-Down (Corda)", "Pull-Down (Barra Reta)", "Pull-Down (Barra W)", "Pull-Down Unilateral",
        "Barra Fixa Aberta (Pull-up)", "Barra Fixa Supinada (Chin-up)", "Barra Fixa Neutra", "Barra Fixa Assistida (Graviton)",
        "Levantamento Terra Tradicional", "Levantamento Terra Sumo", "Levantamento Terra com Barra Hexagonal", "Meio Terra (Rack Pull)",
        "Crucifixo Inverso (Halteres no Banco Inclinado)", "Crucifixo Inverso (Halteres em Pé)", "Crucifixo Inverso (Cabo)", "Crucifixo Inverso (Peck Deck/Voador Inverso)",
        "Face Pull (Corda na Polia Alta)", "Hyperextension (Extensão Lombar Banco 45°)", "Extensão Lombar no Solo (Super-homem)"
    ],
    "Trapézio": [
        "Encolhimento de Ombros (Halteres)", "Encolhimento de Ombros (Barra Frente)", "Encolhimento de Ombros (Barra Trás)", "Encolhimento de Ombros (Máquina/Smith)",
        "Encolhimento de Ombros Sentado (Halteres)", "Encolhimento no Cabo (Polia Baixa)", "Remada Alta Aberta (Barra)", "Remada Alta Aberta (Cabo)",
        "Crucifixo Inverso Y (Halteres)", "Encolhimento Unilateral (Halter)"
    ],
    "Deltoides (Ombros)": [
        "Desenvolvimento (Halteres Sentado)", "Desenvolvimento (Halteres em Pé)", "Desenvolvimento Militar (Barra em Pé)", "Desenvolvimento (Barra Sentado)", "Desenvolvimento na Máquina Articulada", "Desenvolvimento Máquina Convergente",
        "Desenvolvimento Arnold (Halteres)", "Desenvolvimento no Smith (Frente)", "Desenvolvimento no Smith (Trás da Nuca)",
        "Elevação Lateral (Halteres em Pé)", "Elevação Lateral (Halteres Sentado)", "Elevação Lateral (Cabo/Polia Baixa)", "Elevação Lateral Unilateral (Cabo)", "Elevação Lateral na Máquina", "Elevação Lateral Inclinada (Banco 45° de Lado)", "Elevação Lateral Y (Halteres/Cabo)",
        "Elevação Frontal (Halteres Alternada)", "Elevação Frontal (Halteres Simultânea)", "Elevação Frontal (Barra Pronada)", "Elevação Frontal (Barra Supinada)", "Elevação Frontal (Cabo com Corda)", "Elevação Frontal (Cabo com Barra)", "Elevação Frontal com Anilha"
    ],
    "Quadríceps": [
        "Agachamento Livre (Barra Costas)", "Agachamento Livre (Barra Frente - Front Squat)", "Agachamento Smith (Barra Guiada)", "Agachamento Smith com Pés Avançados",
        "Agachamento Hack (Linear)", "Agachamento Hack Invertido", "Agachamento Hack Unilateral",
        "Leg Press 45° Tradicional", "Leg Press 45° Unilateral", "Leg Press 45° com Pés Baixos", "Leg Press Horizontal", "Leg Press Horizontal Unilateral", "Leg Press Vertical (90°)",
        "Cadeira Extensora Bilateral", "Cadeira Extensora Unilateral", "Cadeira Extensora com Isometria",
        "Agachamento Búlgaro (Halteres)", "Agachamento Búlgaro (Barra)", "Agachamento Búlgaro no Smith", "Agachamento Búlgaro com Deficit (Pé da frente elevado)",
        "Afundo com Halteres", "Afundo com Barra Costas", "Afundo no Smith", "Afundo Reverso (Passada para trás)",
        "Passada Dinâmica (Walking Lunges com Halteres)", "Passada Dinâmica (Barra)", "Passada no Lugar",
        "Goblet Squat (Halter)", "Goblet Squat (Kettlebell)", "Sissy Squat Livre", "Sissy Squat na Máquina/Suporte",
        "Agachamento Belt Squat (Cinto com Carga Inferior)", "Agachamento Sumô (Halter)", "Agachamento Zercher (Barra nas Dobras dos Cotovelos)",
        "Subida no Banco (Step-up com Halteres)", "Agachamento Pistol (Unilateral Peso Corporal)"
    ],
    "Posteriores de Coxa": [
        "Mesa Flexora Bilateral", "Mesa Flexora Unilateral", "Cadeira Flexora Bilateral", "Cadeira Flexora Unilateral",
        "Flexora Vertical em Pé (Máquina)", "Flexora em Pé com Caneleira", "Flexora com Bola Suíça",
        "Stiff (Barra)", "Stiff (Halteres)", "Stiff no Smith", "Stiff Unilateral (Halteres)", "Stiff Unilateral (Cabo)",
        "Good Morning / Bom Dia (Barra)", "Good Morning / Bom Dia (Cabo)",
        "Levantamento Terra RDL (Romanian Deadlift Barra)", "Levantamento Terra RDL (Halteres)", "Glute Ham Raise (GHR)"
    ],
    "Glúteos": [
        "Elevação Pélvica (Barra Livre)", "Elevação Pélvica na Máquina Articulada", "Elevação Pélvica no Smith", "Elevação Pélvica Unilateral", "Elevação Pélvica com Elástico (Mini-band)",
        "Glúteo Coice Cruzado (Cabo)", "Glúteo Coice Reto (Cabo)", "Glúteo Coice na Máquina Articulada", "Glúteo Quatro Apoios (Caneleira Joelho Flexionado)", "Glúteo Quatro Apoios (Caneleira Perna Estendida)",
        "Abdução de Quadril (Máquina Sentado)", "Abdução de Quadril (Máquina Inclinado para Frente)", "Abdução no Cabo/Polia Baixa", "Abdução de Quadril em Pé (Caneleira)", "Abdução de Quadril (Elástico Mini-band)",
        "Extensão de Quadril (Banco Romano 45°)", "Frog Pump (Elevação Pélvica com Solas dos Pés Juntas)", "Kettlebell Swing (Balanço com Kettlebell)"
    ],
    "Bíceps/Braquial": [
        "Rosca Direta (Barra EZ/W)", "Rosca Direta (Barra Reta)", "Rosca Direta (Cabo/Polia Baixa)", "Rosca Direta Unilateral (Cabo)",
        "Rosca Alternada (Halteres em Pé)", "Rosca Alternada (Halteres Sentado)", "Rosca Simultânea (Halteres)",
        "Rosca Alternada Inclinada (Banco 45°)", "Rosca Simultânea Inclinada (Banco 45°)",
        "Rosca Martelo (Halteres em Pé)", "Rosca Martelo (Halteres Sentado)", "Rosca Martelo (Corda na Polia)", "Rosca Martelo Alternada", "Rosca Martelo Cruzada",
        "Rosca Scott (Barra W)", "Rosca Scott (Barra Reta)", "Rosca Scott (Máquina)", "Rosca Scott Unilateral (Halter)", "Rosca Scott no Cabo",
        "Rosca Concentrada (Sentado com Apoio na Coxa)", "Rosca Concentrada (Estilo Arnold/Livre)",
        "Rosca 21 (Barra EZ)", "Rosca Spider / Rosca Aranha (De bruços no Banco Inclinado)", "Rosca Drag (Barra Rastejando pelo Corpo)"
    ],
    "Tríceps Braquial": [
        "Tríceps Pulley / Barra Reta (Polia Alta)", "Tríceps Pulley / Barra V (Polia Alta)", "Tríceps Pulley / Corda (Polia Alta)", "Tríceps Pulley Unilateral (Pegada Inversa/Supinada)", "Tríceps Pulley Unilateral (Pegada Pronada)",
        "Tríceps Testa (Barra W)", "Tríceps Testa (Barra Reta)", "Tríceps Testa (Halteres)", "Tríceps Testa (Cabo/Polia)", "Tríceps Testa Inclinado (Banco 45°)", "Tríceps Testa Declinado",
        "Tríceps Francês (Halter - Duas Mãos Sentado)", "Tríceps Francês Unilateral (Halter Sentado)", "Tríceps Francês Unilateral (Halter em Pé)", "Tríceps Francês (Corda na Polia Baixa)", "Tríceps Francês (Barra W)",
        "Supino Fechado / Supino Pegada Estreita (Barra)", "Supino Fechado (Smith)",
        "Dips no Banco (Mergulho entre Bancos)", "Dips no Banco com Carga nas Coxas",
        "Tríceps Coice / Kickback (Halteres)", "Tríceps Coice / Kickback (Cabo/Polia)", "Tríceps Coice Unilateral",
        "Flexão de Braço Fechada (Diamante)", "Flexão de Braço Archer (Arqueiro focado)", "Tríceps Extensão Corporal"
    ],
    "Antebraço": [
        "Flexão de Punho (Barra)", "Flexão de Punho (Halteres)", "Extensão de Punho (Barra)", "Extensão de Punho (Halteres)",
        "Rosca Inversa (Barra EZ)", "Rosca Inversa (Barra Reta)", "Rosca Inversa (Cabo)", "Rosca Zottman (Sobe Supinado, Desce Pronado)",
        "Rolamento de Punho (Wrist Roller)", "Caminhada do Fazendeiro (Farmer's Walk)", "Sustentação de Discos (Pinch Grip)"
    ],
    "Core/Abdominal": [
        "Abdominal Supra Tradicional (Crunch Solo)", "Abdominal Supra com Pés Elevados", "Abdominal Supra na Máquina", "Abdominal Supra com Carga (Anilha/Halter)", "Abdominal Supra na Polia (Ajoelhado com Corda)",
        "Abdominal Infra Solo (Elevação de Quadril)", "Abdominal Infra Tesoura", "Abdominal Infra no Banco Inclinado",
        "Elevação de Pernas Suspenso (Barra Fixa)", "Elevação de Joelhos Suspenso (Barra Fixa)", "Elevação de Pernas nas Paralelas (Suporte Abdominal)", "Elevação de Joelhos nas Paralelas",
        "Prancha Isométrica Frontal (Cotovelos)", "Prancha Isométrica Frontal (Braços Estendidos)", "Prancha Lateral (Cotovelo)", "Prancha Lateral com Elevação de Quadril", "Prancha Dinâmica (Movimentando Braços/Pés)",
        "Ab Wheel (Roda Abdominal de Joelhos)", "Ab Wheel (Roda Abdominal em Pé Avançado)",
        "Russian Twist (Giro Russo sem Carga)", "Russian Twist com Carga (Anilha/Halter/Kettlebell)",
        "Stomach Vacuum (Vácuo Abdominal LPF)", "Abdominal Oblíquo Solo (Cruzando Knee)", "Abdominal Oblíquo Toque nos Calcanhares", "Abdominal Oblíquo na Polia Alta (Woodchopper)",
        "Abdominal Canivete Bilateral (V-up)", "Abdominal Canivete Unilateral", "Abdominal Bicicleta (Air Bike Crunch)", "Flexão Lateral de Tronco (Halter em Pé)", "Flexão Lateral de Tronco (Banco Romano)"
    ],
    "Panturrilhas": [
        "Gêmeos em Pé (Máquina)", "Gêmeos em Pé Unilateral (Máquina)", "Gêmeos Sentado (Burrinho)", "Gêmeos Sentado Unilateral",
        "Panturrilha no Leg Press 45°", "Panturrilha no Leg Press Horizontal", "Panturrilha Hack Machine",
        "Gêmeos Unilateral no Degrau (Peso Corporal)", "Gêmeos Unilateral no Degrau (Com Halter)",
        "Panturrilha no Smith (Com Bloco/Step nos Pés)", "Panturrilha em Pé Livre (Solo)", "Panturrilha Sentado com Barra Livre nas Coxas", "Tíbial Anterior (Elevação dos Dedos do Pé)"
    ],
    "Cardio & Aeróbico": [
        "Esteira (Caminhada Plana)", "Esteira (Caminhada com Inclinação)", "Esteira (Corrida/Trote)", "Esteira (Treino de Sprints/HIIT)",
        "Bike Ergométrica Vertical (Tradicional)", "Bike Ergométrica Horizontal (Com Encosto)", "Spinning (Bike de Ciclismo Indoor)",
        "Elíptico / Transport (Ritmo Moderado)", "Elíptico / Transport (Alta Intensidade)",
        "Pular Corda (Salto Simples)", "Pular Corda (Double Under/Salto Duplo)",
        "Escada Rolante (Simulador de Degraus)", "Remo Indoor (Ergômetro)", "Air Bike / Assault Bike (Resistência a Ar)",
        "Polichinelos Tradicionais", "Burpees Completos (Com Flexão e Salto)", "Burpees Simples (Sem Flexão)", "Mountain Climber (Corrida na Prancha)", "Jump / Mini Trampolim", "Corrida Estacionária (No lugar)"
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
    // Registra a visualização atual globalmente para o controle do widget
    window.currentView = viewName;

    const views = [
        'view-login', 'view-lobby', 'view-registro', 'view-calendario',
        'view-blog', 'view-planilhas', 'view-consulta', 'view-consulta-geral',
        'view-aparelho-ocupado', 'view-perfil', 
        'view-crossfit-lobby', 'view-crossfit-timers', 'view-crossfit-strength-calc'
    ];

    views.forEach(v => {
        const el = document.getElementById(v);
        if (el) el.classList.add('hidden');
    });

    const target = document.getElementById('view-' + viewName);
    if (target) target.classList.remove('hidden');

    const shell = document.getElementById('app-shell');
    if (shell) {
        // CORREÇÃO DIRETA NO DOM: Força a ocultação total ou exibição do esqueleto do app
        if (viewName === 'login' || viewName === 'registro') {
            shell.style.setProperty('display', 'none', 'important');
        } else {
            shell.style.setProperty('display', 'flex', 'important');
        }
    }

    // Gatilhos de renderização originais preservados
    if (viewName === 'perfil') carregarDadosPerfil(); 
    if (viewName === 'planilhas') renderizarFichas();
    if (viewName === 'registro') renderizarLogTreino();
    if (viewName === 'consulta-geral') renderizarFichasConsulta();
    if (viewName === 'calendario') renderizarPaginaCronograma();
    if (viewName === 'blog') renderizarBlog();

    // Atualiza imediatamente a visibilidade do mini-timer ao trocar de tela
    if (typeof atualizarMiniTimerWidget === 'function') {
        atualizarMiniTimerWidget("");
    }
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

async function handleCadastro() {
    const nome = document.getElementById('reg-nome').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const tel = document.getElementById('reg-tel').value.trim();
    const senha = document.getElementById('reg-pass').value;
    const confirmaSenha = document.getElementById('reg-pass-conf').value;

    if (!nome || !email || !senha) {
        return mostrarAviso("Preencha todos os campos obrigatórios!");
    }
    if (senha !== confirmaSenha) {
        return mostrarAviso("As senhas não coincidem!");
    }

    try {
        // 1. Cria a conta no Firebase Authentication
        const credenciais = await auth.createUserWithEmailAndPassword(email, senha);
        const user = credenciais.user;

        // 2. Cria o documento de perfil complementar do usuário no Firestore
        await db.collection("usuarios").doc(user.uid).set({
            nome: nome,
            email: email,
            tel: tel,
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 3. Mantém compatibilidade temporária de sessão local caso outros módulos usem
        localStorage.setItem('user_email', email); 
        localStorage.setItem('user_nome', nome);
        localStorage.setItem('user_tel', tel);

        mostrarAviso("Conta criada com sucesso!");
        toggleAuthTab('login');
    } catch (error) {
        console.error("Erro ao cadastrar:", error);
        let mensagemErro = "Erro ao cadastrar usuário.";
        if (error.code === 'auth/email-already-in-use') {
            mensagemErro = "Este e-mail já está em uso.";
        } else if (error.code === 'auth/weak-password') {
            mensagemErro = "A senha deve ter pelo menos 6 caracteres.";
        } else if (error.code === 'auth/invalid-email') {
            mensagemErro = "Formato de e-mail inválido.";
        }
        mostrarAviso(mensagemErro);
    }
}

// ============================================================================================================
// LOGIN DE USUÁRIO INTEGRADO AO FIREBASE
// ============================================================================================================
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value;
    const rememberMe = document.getElementById('remember-me').checked;

    if (!email || !pass) {
        return mostrarAvisoNotificacao("Preencha o e-mail e a senha!");
    }

    try {
        // 1. Autentica no Firebase Auth
        const credenciais = await auth.signInWithEmailAndPassword(email, pass);
        const user = credenciais.user;

        // 2. Busca os dados de perfil salvos no Firestore
        const docPerfil = await db.collection("usuarios").doc(user.uid).get();
        let nomeUsuario = "Atleta";
        let telUsuario = "";

        if (docPerfil.exists) {
            const dados = docPerfil.data();
            nomeUsuario = dados.nome || "Atleta";
            telUsuario = dados.tel || "";
        }

        // 3. Salva sessão local para compatibilidade com o resto do código
        localStorage.setItem('fitai_session', JSON.stringify({ email, nome: nomeUsuario, tel: telUsuario }));
        localStorage.setItem('user_email', email);
        localStorage.setItem('user_nome', nomeUsuario);
        localStorage.setItem('user_tel', telUsuario);

        // 4. Lógica de "Lembrar de Mim"
        if (rememberMe) {
            localStorage.setItem('fitai_remember_email', email);
        } else {
            localStorage.removeItem('fitai_remember_email');
        }

        // 5. Entra no App
        showView('lobby');
        mostrarAvisoNotificacao("SEJA BEM-VINDO AO ASSISFIT", "sucesso");

    } catch (error) {
        console.error("Erro ao fazer login:", error);
        
        // Mantém a UX original tratando erros específicos
        if (error.code === 'auth/user-not-found') {
            mostrarAvisoNotificacao("E-mail não cadastrado!");
        } else if (error.code === 'auth/wrong-password') {
            mostrarAvisoNotificacao("Senha incorreta!");
        } else if (error.code === 'auth/invalid-email') {
            mostrarAvisoNotificacao("Formato de e-mail inválido!");
        } else {
            mostrarAvisoNotificacao("Erro ao conectar. Tente novamente!");
        }
    }
}

function mostrarAvisoNotificacao(mensagem, tipo = 'erro') {
    const existente = document.getElementById('toast-notificacao');
    if (existente) existente.remove();

    const toast = document.createElement('div');
    toast.id = 'toast-notificacao';
    
    // Cores do padrão Assist Fit
    const corDestaque = tipo === 'sucesso' ? '#22c55e' : '#ef4444';
    
    // Estilo Ultra-Moderno via JS (Garante que o visual mude agora!)
    toast.style.cssText = `
        position: fixed;
        top: 30px;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);
        opacity: 0;
        background: rgba(15, 23, 42, 0.9);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-left: 4px solid ${corDestaque};
        padding: 16px 25px;
        border-radius: 20px;
        z-index: 1000000;
        display: flex;
        align-items: center;
        gap: 12px;
        color: white;
        font-family: 'Inter', sans-serif;
        font-weight: 800;
        font-size: 10px;
        letter-spacing: 1.2px;
        text-transform: uppercase;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        transition: all 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        pointer-events: none;
        white-space: nowrap;
    `;

    const icone = tipo === 'sucesso' 
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${corDestaque}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${corDestaque}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;

    toast.innerHTML = `
        ${icone}
        <span style="margin-top: 2px;">${mensagem}</span>
    `;

    document.body.appendChild(toast);

    // Animação de entrada (Desliza e aparece)
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 50);

    // Saída automática
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => toast.remove(), 500);
    }, 3500);
}

function logout() {
    // Cria o modal de confirmação
    const modalSair = document.createElement('div');
    // Ajuste UX: position fixed + 100vh/100vw garante que cubra a tela visível no mobile
    modalSair.style = `
        position: fixed; 
        top: 0; left: 0; 
        width: 100%; height: 100%;
        background: rgba(2, 6, 23, 0.85); 
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px); /* Suporte para iOS */
        display: flex; align-items: center; justify-content: center;
        z-index: 100000; 
        padding: 20px;
    `;

    modalSair.innerHTML = `
        <div class="glass-panel fade-in" style="max-width: 320px; width: 100%; padding: 35px; text-align: center; border: 1px solid rgba(255,255,255,0.1); background: #0f172a; border-radius: 28px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
            <div style="width: 60px; height: 60px; background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: #ef4444;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </div>
            <h3 class="italic-bold" style="color: white; margin-bottom: 10px; font-size: 1.1rem; letter-spacing: 1px;">ENCERRAR SESSÃO?</h3>
            <p style="color: #94a3b8; margin-bottom: 25px; font-size: 13px; line-height: 1.5;">Você voltará para a tela de login e seus dados locais serão preservados.</p>
            
            <div style="display: flex; gap: 10px;">
                <button id="btn-cancelar-sair" style="flex: 1; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 14px; border-radius: 14px; font-weight: 700; cursor: pointer; font-size: 12px;">VOLTAR</button>
                <button id="btn-confirmar-sair" style="flex: 1; background: #ef4444; color: white; border: none; padding: 14px; border-radius: 14px; font-weight: 900; cursor: pointer; font-size: 12px; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2);">SAIR</button>
            </div>
        </div>
    `;

    document.body.appendChild(modalSair);

    document.getElementById('btn-cancelar-sair').onclick = () => modalSair.remove();

    document.getElementById('btn-confirmar-sair').onclick = () => {
        // Limpa a sessão específica
        localStorage.removeItem('user_email'); // Importante para a circulação de dados que fizemos
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

    // Criamos uma variável para acumular o HTML e evitar múltiplos reflows
    let htmlGerado = "";

    Object.keys(bancoDeDados.fichas).forEach(nome => {
        // Puxa a quantidade exata de exercícios registrados nessa ficha
        const qtdExercicios = bancoDeDados.fichas[nome].length;

        htmlGerado += `
            <div onclick="verExerciciosConsulta('${nome}')" class="menu-card"
                 style="margin-bottom: 15px; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 18px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                
                <div>
                    <h3 class="italic-bold uppercase" style="color: white; margin: 0; font-size: 1.1rem;">${nome}</h3>
                    <p style="font-size: 10px; color: gray; margin: 5px 0 0 0;">${qtdExercicios} Exercícios</p>
                </div>

                <p style="color: #3b82f6; margin: 0; font-size: 0.9rem; font-weight: bold;">VER EXERCÍCIOS →</p>

            </div>`;
    });
    containerLista.innerHTML = htmlGerado || `<p style="color: #64748b; text-align: center;">Nenhum treino encontrado.</p>`;
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
    // Recupera o histórico de tempos salvos permanentemente
    const historicoTempos = JSON.parse(localStorage.getItem('assistfit_historico_cronometros')) || {};
    containerDetalhes.innerHTML = exercicios.map(ex => {

        const infoEsquerda = ex.tipo === 'tempo'

            ? `<p style="color:#10b981; font-weight:900; margin:0;">${formatarTempoParaExibicao(ex.tempo)}</p>`

            : `<p style="color:white; font-weight:900; margin:0;">${ex.series}x${ex.reps} <span style="color:gray; font-size:10px;">${ex.carga}KG</span></p>`;

        // Busca o histórico permanentemente para o ID do exercício

        const registroSalvo = historicoTempos[ex.id];
        const textoUltimoTempo = registroSalvo

            ? `Último tempo: ${registroSalvo.tempo} <span style="color: rgba(255,255,255,0.4); font-weight: normal; margin-left: 4px;">(${registroSalvo.data} às ${registroSalvo.hora})</span>`

            : `Último tempo: --`;

        return `

        <div class="glass-panel" style="margin-bottom: 12px; padding: 15px; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border-radius: 15px; border: 1px solid rgba(255,255,255,0.05);">

            <div style="flex: 1; padding-right: 10px;">

                <h4 style="color:white; margin:0; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px;">${ex.nome}</h4>

                ${infoEsquerda}

                <small id="last-time-${ex.id}" style="color: #3b82f6; font-size: 10px; font-weight: bold; display: block; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">

                    ${textoUltimoTempo}
                </small>
            </div>



            <div style="display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.25); padding: 8px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.03);">

                <span id="timer-set-${ex.id}" style="font-family: monospace; color: #10b981; font-weight: bold; font-size: 18px; min-width: 45px; text-align: center; letter-spacing: 0.5px;">0s</span>

               

                <button id="btn-timer-set-${ex.id}" onclick="controlarCronometroSet(${ex.id})"

                    style="background: transparent; border: none; border-radius: 8px; width: 40px; height: 40px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; -webkit-tap-highlight-color: transparent;">

                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#f8fafc" style="filter: drop-shadow(0 0 4px rgba(248, 250, 252, 0.6)); transition: transform 0.2s;"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>

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

    if (!cronometrosAtivos[id]) {
        const startTime = Date.now();
        localStorage.setItem(`timer_start_${id}`, startTime);
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12"></rect></svg>`;
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
        const tempoCapturado = display.innerText;
        // 2. Paramos o relógio
        clearInterval(cronometrosAtivos[id]);

        delete cronometrosAtivos[id];
        localStorage.removeItem(`timer_start_${id}`);
        // 4. Retorna para o formato moderno ampliado com brilho platinado
        btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="#f8fafc" style="filter: drop-shadow(0 0 4px rgba(248, 250, 252, 0.6));"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>`;

        btn.style.background = "transparent";
        if (tempoCapturado && tempoCapturado !== "00:00.00" && tempoCapturado !== "0s") {

            const agora = new Date();
            const dia = String(agora.getDate()).padStart(2, '0');
            const mes = String(agora.getMonth() + 1).padStart(2, '0');
            const ano = agora.getFullYear();
            const dataFormatada = `${dia}/${mes}/${ano}`;
            const hora = String(agora.getHours()).padStart(2, '0');
            const minuto = String(agora.getMinutes()).padStart(2, '0');
            const horaFormatada = `${hora}:${minuto}`;

            // Salva no banco de histórico do LocalStorage
            const historicoTempos = JSON.parse(localStorage.getItem('assistfit_historico_cronometros')) || {};

            historicoTempos[id] = {
                tempo: tempoCapturado,
                data: dataFormatada,
                hora: horaFormatada
            };

            localStorage.setItem('assistfit_historico_cronometros', JSON.stringify(historicoTempos));
            if (lastDisplay) {
                lastDisplay.innerHTML = `Último tempo: ${tempoCapturado} <span style="color: rgba(255,255,255,0.4); font-weight: normal; margin-left: 4px;">(${dataFormatada} às ${horaFormatada})</span>`;

            }
        } display.innerText = "00:00.00";
    }
}


function recuperarCronometrosAtivos() {
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('timer_start_')) {
            const id = key.replace('timer_start_', '');
            const startTimeOriginal = parseInt(localStorage.getItem(key));
            const display = document.getElementById(`timer-set-${id}`);
            const btn = document.getElementById(`btn-timer-set-${id}`);

            if (display && btn) {
                btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><rect x="6" y="6" width="12" height="12"></rect></svg>`;

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

// função auxiliar para exibição do texto na tela xx NAO MEXER ! xx

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


// xxx---xxx---xxx---xxx---xxx---xxx---xxx---xxx---xxx---xxx---xxx---xxx---xxx---xxx---xxx---xxx---xxx---xxx---xxx---xxx

function verDetalhesTreino(nomeTreino) {
    // Esconde o botão de voltar ao Lobby e mostra o de voltar à lista
    document.getElementById('btn-sair-consulta').classList.add('hidden');
    document.getElementById('btn-voltar-consulta').classList.remove('hidden');

    // Troca o título para o nome do treino selecionado

    document.getElementById('cabecalho-consulta').innerText = nomeTreino;

    // Lógica para esconder a lista e mostrar os detalhes (Ajuste os IDs se necessário)

    document.getElementById('lista-nomes-treinos').classList.add('hidden');

    document.getElementById('detalhes-treino-consulta').classList.remove('hidden');
    // Aqui entraria sua lógica existente de preencher os detalhes...

}


// 2. SUBSTITUA a sua função atual por esta

function voltarListaConsulta() {
    // Mostra o botão de voltar ao Lobby e esconde o de voltar à lista
    document.getElementById('btn-sair-consulta').classList.remove('hidden');
    document.getElementById('btn-voltar-consulta').classList.add('hidden');

    // Reseta o título da página
    document.getElementById('cabecalho-consulta').innerText = "Consultar Treinos";
    // Mostra a lista e esconde os detalhes
    document.getElementById('lista-nomes-treinos').classList.remove('hidden');
    document.getElementById('detalhes-treino-consulta').classList.add('hidden');

    // Chama a renderização das fichas que você já tinha
    renderizarFichasConsulta();
}

// --- 5. GESTÃO DE EXERCÍCIOS (LOG / REGISTRO) ---
function atualizarListaExercicios() {
    // 1. Buscamos o elemento usando o ID REAL do seu HTML ('select-grupo-sub')
    const campoGrupo = document.getElementById('select-grupo-sub');
    
    // TRAVA DE SEGURANÇA: Se o campo não existir na tela atual (como no logout), para aqui e não quebra!
    if (!campoGrupo) return;

    // 2. Captura o valor selecionado
    const grupo = campoGrupo.value;
    const selectEx = document.getElementById('select-exercicio');
    const camposForca = document.getElementById('campos-forca');
    const camposCardio = document.getElementById('campos-cardio');

    if (!selectEx) return;
    if (!grupo) {
        selectEx.innerHTML = '<option value="">Selecione o Exercício...</option>';
        return;
    }
    // Alternar campos entre Peso (Força) e Tempo (Cardio)
    if (grupo === "Cardio & Aeróbico") {
        if (camposForca) camposForca.classList.add('hidden');
        if (camposCardio) camposCardio.classList.remove('hidden');
    } else {
        if (camposForca) camposForca.classList.remove('hidden');
        if (camposCardio) camposCardio.classList.add('hidden');
    }
    const lista = dicionarioExercicios[grupo] || [];
    selectEx.innerHTML = '<option value="">Selecione o Exercício...</option>' +
        lista.map(ex => `<option value="${ex}">${ex}</option>`).join('');
}


function adicionarExercicio() {
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    if (!ativa) return mostrarAviso("Selecione uma ficha!");

    // 1. Busca os elementos usando o ID correto do HTML
    const campoGrupo = document.getElementById('select-grupo-sub');
    const campoExercicio = document.getElementById('select-exercicio');
    const campoSeries = document.getElementById('series-ex');
    const campoReps = document.getElementById('reps-ex');
    const campoCarga = document.getElementById('carga-ex');
    const campoTempo = document.getElementById('tempo-ex');

    // TRAVA DE SEGURANÇA: Se os elementos principais não estiverem na tela, para imediatamente
    if (!campoGrupo || !campoExercicio) return;

    // 2. Captura os valores com segurança
    const grupo = campoGrupo.value;
    const exercicio = campoExercicio.value;

    // Validação básica para não salvar campos vazios
    if (!grupo || !exercicio) {
        mostrarAviso("Por favor, selecione o grupo e o exercício.");
        return;
    }

    const isCardio = (grupo === "Cardio & Aeróbico");
    const seriesValue = campoSeries ? campoSeries.value : "";
    const repsValue = campoReps ? campoReps.value : "";
    const tempoValue = campoTempo ? campoTempo.value : "";

    // Validações originais de preenchimento obrigatório baseadas no tipo
    if (isCardio) {
        if (!tempoValue) return mostrarAviso("Informe o tempo do cardio!");
    } else {
        if (!seriesValue || !repsValue) return mostrarAviso("Preencha séries e repetições!");
    }

    // 3. Cria o objeto do novo set com a estrutura exata exigida pelo seu sistema
    const novo = {
        id: Date.now(),
        grupo: grupo,
        nome: exercicio,
        series: seriesValue,
        reps: repsValue,
        carga: campoCarga ? (campoCarga.value || 0) : 0,
        tempo: tempoValue,
        tipo: isCardio ? 'tempo' : 'forca'
    };

    // 4. LÓGICA RESTAURADA: Salva diretamente dentro da ficha ativa no Banco de Dados Real
    if (!bancoDeDados.fichas[ativa]) {
        bancoDeDados.fichas[ativa] = [];
    }
    bancoDeDados.fichas[ativa].unshift(novo);
    
    // 5. Grava as alterações permanentemente
    salvarBanco();
    
    console.log("Set estruturado e salvo com sucesso no banco:", novo);

    // 6. Atualiza todas as interfaces de forma síncrona e imediata
    renderizarLogTreino();
    renderizarResumoFicha(ativa);
    if (typeof renderizarFichasConsulta === 'function') {
        renderizarFichasConsulta();
    }

    // 7. Limpa os campos de digitação após salvar com sucesso
    if (campoSeries) campoSeries.value = "";
    if (campoReps) campoReps.value = "";
    if (campoCarga) campoCarga.value = "";
    if (campoTempo) campoTempo.value = "";
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



    const estiloEsconderSetas = `

        <style>

            input::-webkit-outer-spin-button,

            input::-webkit-inner-spin-button {

                -webkit-appearance: none;

                margin: 0;

            }

            input[type=number] {

                -moz-appearance: textfield;

            }

        </style>

    `;



    // DISTINÇÃO GARANTIDA: Se o exercício possui a propriedade tempo preenchida, assume o formato Cardio

    if (ex.tempo && ex.tempo.toString().trim() !== "") {

        const valorTempo = ex.tempo || "00:00:00";



        // inputmode definido para numérico e evento chamando a automação da máscara em tempo real

        document.getElementById(dadosId).innerHTML = estiloEsconderSetas + `

            <div style="display: flex; flex-direction: column; align-items: center; margin-top: 6px; width: 100%;">

                <input type="text" id="edit-tempo-${id}" value="${valorTempo}" placeholder="00:00:00" inputmode="numeric"

                    oninput="automatizarMascaraTempo(this)"

                    style="width: 110px; background: #0f172a; border: 1px solid #3b82f6; color: #f8fafc; border-radius: 6px; text-align: center; padding: 6px 4px; font-size: 13px; font-weight: 800; letter-spacing: 2px; outline: none;">

                <small style="color: var(--text-secondary); font-size: 9px; display: block; text-align: center; margin-top: 4px; text-transform: uppercase;">

            </div>`;

    } else {

        // Formato para Musculação Pura (Séries x Reps — KG)

        document.getElementById(dadosId).innerHTML = estiloEsconderSetas + `

            <div style="display: flex; gap: 6px; align-items: center; margin-top: 6px;">

                <input type="number" inputmode="numeric" pattern="[0-9]*" id="edit-series-${id}" value="${parseInt(ex.series) || 0}" style="width: 42px; background: #0f172a; border: 1px solid #3b82f6; color: #f8fafc; border-radius: 6px; text-align: center; padding: 6px 4px; font-size: 13px; font-weight: 600; outline: none;">

                <span style="color: #64748b; font-size: 11px; font-weight: bold;">×</span>

               

                <input type="number" inputmode="numeric" pattern="[0-9]*" id="edit-reps-${id}" value="${parseInt(ex.reps) || 0}" style="width: 42px; background: #0f172a; border: 1px solid #3b82f6; color: #f8fafc; border-radius: 6px; text-align: center; padding: 6px 4px; font-size: 13px; font-weight: 600; outline: none;">

                <span style="color: #64748b; font-size: 11px; font-weight: bold;">—</span>

               

                <input type="number" inputmode="numeric" pattern="[0-9]*" id="edit-carga-${id}" value="${parseFloat(ex.carga) || 0}" style="width: 52px; background: #0f172a; border: 1px solid #3b82f6; color: #f8fafc; border-radius: 6px; text-align: center; padding: 6px 4px; font-size: 13px; font-weight: 600; outline: none;">

                <span style="color: #64748b; font-size: 11px; font-weight: bold;">KG</span>

            </div>`;

    }



    // Botões de Confirmação e Cancelamento Inline

    document.getElementById(acoesId).innerHTML = `

        <div style="display: flex; gap: 8px; align-items: center;">

            <button onclick="salvarEdicaoInline(${id}, '${tipo}')"

                style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; color: #10b981; font-size: 14px; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s;"

                onmouseover="this.style.background='#10b981'; this.style.color='white'"

                onmouseout="this.style.background='rgba(16, 185, 129, 0.15)'; this.style.color='#10b981'">

                ✓

            </button>

            <button onclick="${tipo === 'resumo' ? 'renderizarResumoFicha(fichaAtiva)' : 'renderizarLogTreino()'}"

                style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; color: #ef4444; font-size: 14px; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s;"

                onmouseover="this.style.background='#ef4444'; this.style.color='white'"

                onmouseout="this.style.background='rgba(239, 68, 68, 0.15)'; this.style.color='#ef4444'">

                ✕

            </button>

        </div>`;

}



function ativarEdicaoInline(id, tipo) {
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    const ex = bancoDeDados.fichas[ativa].find(t => t.id === id);
    
    const dadosId = tipo === 'resumo' ? `dados-resumo-${id}` : `dados-log-${id}`;
    const acoesId = tipo === 'resumo' ? `acoes-resumo-${id}` : `acoes-log-${id}`;

    const estiloEsconderSetas = `
        <style>
            input::-webkit-outer-spin-button,
            input::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }
            input[type=number] {
                -moz-appearance: textfield;
            }
        </style>
    `;

    // DISTINÇÃO GARANTIDA: Se o exercício possui a propriedade tempo preenchida, assume o formato Cardio
    if (ex.tempo && ex.tempo.toString().trim() !== "") {
        const valorTempo = ex.tempo || "00:00:00";

        // inputmode definido para numérico e evento chamando a automação da máscara em tempo real
        document.getElementById(dadosId).innerHTML = estiloEsconderSetas + `
            <div style="display: flex; flex-direction: column; align-items: center; margin-top: 6px; width: 100%;">
                <input type="text" id="edit-tempo-${id}" value="${valorTempo}" placeholder="00:00:00" inputmode="numeric" 
                    oninput="automatizarMascaraTempo(this)"
                    style="width: 110px; background: #0f172a; border: 1px solid #3b82f6; color: #f8fafc; border-radius: 6px; text-align: center; padding: 6px 4px; font-size: 13px; font-weight: 800; letter-spacing: 2px; outline: none;">
                <small style="color: var(--text-secondary); font-size: 9px; display: block; text-align: center; margin-top: 4px; text-transform: uppercase;">Formato: HH:MM:SS</small>
            </div>`;
    } else {
        // Formato para Musculação Pura (Séries x Reps — KG)
        document.getElementById(dadosId).innerHTML = estiloEsconderSetas + `
            <div style="display: flex; gap: 6px; align-items: center; margin-top: 6px;">
                <input type="number" inputmode="numeric" pattern="[0-9]*" id="edit-series-${id}" value="${parseInt(ex.series) || 0}" style="width: 42px; background: #0f172a; border: 1px solid #3b82f6; color: #f8fafc; border-radius: 6px; text-align: center; padding: 6px 4px; font-size: 13px; font-weight: 600; outline: none;">
                <span style="color: #64748b; font-size: 11px; font-weight: bold;">×</span>
                
                <input type="number" inputmode="numeric" pattern="[0-9]*" id="edit-reps-${id}" value="${parseInt(ex.reps) || 0}" style="width: 42px; background: #0f172a; border: 1px solid #3b82f6; color: #f8fafc; border-radius: 6px; text-align: center; padding: 6px 4px; font-size: 13px; font-weight: 600; outline: none;">
                <span style="color: #64748b; font-size: 11px; font-weight: bold;">—</span>
                
                <input type="number" inputmode="numeric" pattern="[0-9]*" id="edit-carga-${id}" value="${parseFloat(ex.carga) || 0}" style="width: 52px; background: #0f172a; border: 1px solid #3b82f6; color: #f8fafc; border-radius: 6px; text-align: center; padding: 6px 4px; font-size: 13px; font-weight: 600; outline: none;">
                <span style="color: #64748b; font-size: 11px; font-weight: bold;">KG</span>
            </div>`;
    }

    // Botões de Confirmação e Cancelamento Inline
    document.getElementById(acoesId).innerHTML = `
        <div style="display: flex; gap: 8px; align-items: center;">
            <button onclick="salvarEdicaoInline(${id}, '${tipo}')" 
                style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; color: #10b981; font-size: 14px; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s;"
                onmouseover="this.style.background='#10b981'; this.style.color='white'" 
                onmouseout="this.style.background='rgba(16, 185, 129, 0.15)'; this.style.color='#10b981'">
                ✓
            </button>
            <button onclick="${tipo === 'resumo' ? 'renderizarResumoFicha(fichaAtiva)' : 'renderizarLogTreino()'}" 
                style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 8px; width: 32px; height: 32px; cursor: pointer; color: #ef4444; font-size: 14px; display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s;"
                onmouseover="this.style.background='#ef4444'; this.style.color='white'" 
                onmouseout="this.style.background='rgba(239, 68, 68, 0.15)'; this.style.color='#ef4444'">
                ✕
            </button>
        </div>`;
}

function salvarEdicaoInline(id, tipo) {
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    const ex = bancoDeDados.fichas[ativa].find(t => t.id === id);
    
    if (ex) {
        const inputTempo = document.getElementById(`edit-tempo-${id}`);
        
        if (inputTempo) {
            // Atualiza o tempo digitado no formato correto
            ex.tempo = inputTempo.value || "00:00:00";
            ex.series = "";
            ex.reps = "";
            ex.carga = "";
        } else {
            // Atualiza os valores convencionais de musculação
            ex.series = parseInt(document.getElementById(`edit-series-${id}`).value) || 0;
            ex.reps = parseInt(document.getElementById(`edit-reps-${id}`).value) || 0;
            ex.carga = parseFloat(document.getElementById(`edit-carga-${id}`).value) || 0;
            ex.tempo = "";
        }

        if (typeof salvarBancoDeDadosLocal === 'function') {
            salvarBancoDeDadosLocal();
        } else {
            localStorage.setItem('assistfit_banco', JSON.stringify(bancoDeDados));
        }

        if (tipo === 'resumo') {
            renderizarResumoFicha(ativa);
        } else {
            renderizarLogTreino();
        }
    }
}

// FUNÇÃO AUXILIAR: Executa a máscara de tempo inteligente HH:MM:SS diretamente no input de edição
function automatizarMascaraTempo(input) {
    // Remove tudo o que não for número puro
    let v = input.value.replace(/\D/g, "");
    
    // Limita a digitação a no máximo 6 números (HHMMSS)
    if (v.length > 6) {
        v = v.substring(0, 6);
    }
    
    // Aplica formatação de trás para frente inserindo os dois pontos dinamicamente
    if (v.length >= 5) {
        v = v.replace(/^(\d{2})(\d{2})(\d{1,2})$/, "$1:$2:$3");
    } else if (v.length >= 3) {
        v = v.replace(/^(\d{2})(\d{1,2})$/, "$1:$2");
    }
    
    input.value = v;
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
    if (!ativa) return;

    // 1. Criamos o container do modal com o fundo escuro e desfoque
    const modalConfirmacao = document.createElement('div');
    modalConfirmacao.style = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(2, 6, 23, 0.9); backdrop-filter: blur(12px);
        display: flex; align-items: center; justify-content: center;
        z-index: 100000; padding: 20px;
    `;

    // 2. Inserimos o HTML com a mesma estrutura premium e classes do seu app
    modalConfirmacao.innerHTML = `
        <div class="glass-panel fade-in" style="max-width: 400px; width: 100%; padding: 35px; border: 1px solid #ef4444; background: var(--bg-card); border-radius: 28px;">
            <div class="card-icon" style="margin: 0 auto 20px; background: rgba(239, 68, 68, 0.1); border-color: #ef4444; display: flex; align-items: center; justify-content: center; width: 60px; height: 60px; border-radius: 50%; border: 2px solid #ef4444;">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </div>
            <h3 class="italic-bold" style="color: white; text-align: center; margin-bottom: 10px; font-size: 1.2rem; text-transform: uppercase;">LIMPAR TREINO?</h3>
            <p style="color: var(--text-secondary); text-align: center; margin-bottom: 25px; font-size: 13px; line-height: 1.4;">
                Deseja remover todos os registros e exercícios do treino <span style="color: #ef4444; font-weight: bold;">${ativa}</span>? Esta ação não pode ser desfeita.
            </p>

            <div style="display: flex; gap: 12px;">
                <button id="btn-cancelar-limpeza" style="flex: 1; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 14px; border-radius: 14px; font-weight: 700; cursor: pointer; transition: background 0.2s;">
                    CANCELAR
                </button>
                <button id="btn-confirmar-limpeza" style="flex: 1; background: #ef4444; color: white; border: none; padding: 14px; border-radius: 14px; font-weight: 900; cursor: pointer; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3); transition: transform 0.2s;">
                    LIMPAR
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modalConfirmacao);

    // Fechar o modal caso clique em Cancelar
    document.getElementById('btn-cancelar-limpeza').onclick = () => modalConfirmacao.remove();

    // Executar a limpeza original caso clique em Limpar
    document.getElementById('btn-confirmar-limpeza').onclick = () => {
        bancoDeDados.fichas[ativa] = [];
        salvarBanco();
        renderizarLogTreino();
        
        // Se a tela de consulta estática também precisar atualizar o resumo:
        if (typeof renderizarResumoFicha === "function") {
            renderizarResumoFicha(ativa);
        }

        mostrarAviso("Log de treino limpo.");
        modalConfirmacao.remove();
    };
}

async function salvarBanco() {
    if (!usuarioAtualId) {
        console.warn("Nenhum usuário logado. Dados não foram salvos no nuvem.");
        return;
    }

    try {
        // 1. Salva as Fichas de Treino no Firestore do Usuário
        await db.collection("usuarios").doc(usuarioAtualId)
                .collection("treinos").doc("fichas")
                .set(bancoDeDados);

        // 2. Salva o Histórico de Dias Treinados (Calendário)
        await db.collection("usuarios").doc(usuarioAtualId)
                .collection("historico").doc("frequencia")
                .set({ dias: diasTreinados });

        console.log("Dados sincronizados com o Firestore com sucesso!");
    } catch (error) {
        console.error("Erro ao salvar dados no Firestore:", error);
        mostrarAvisoNotificacao("Erro ao sincronizar dados com o servidor.", "erro");
    }
}

// Mantém o atalho que você já usa no resto do sistema
const salvarDados = () => { 
    salvarBanco(); 
};

function renderizarPaginaCronograma() {
    const container = document.getElementById('view-calendario');
    if (!container) return;

    const agora = new Date();
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const dataFormatada = `${agora.getDate()} de ${meses[agora.getMonth()]} de ${agora.getFullYear()}`;

    const modoTimerAtivo = (typeof isCountdownMode !== 'undefined' && isCountdownMode);
    const estiloLivreBg = !modoTimerAtivo ? '#3b82f6' : 'transparent';
    const estiloLivreTexto = !modoTimerAtivo ? 'white' : '#3b82f6';
    const estiloTimerBg = modoTimerAtivo ? '#3b82f6' : 'transparent';
    const estiloTimerTexto = modoTimerAtivo ? 'white' : '#3b82f6';
    const classeContainerInput = modoTimerAtivo ? '' : 'hidden';

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
                    <button onclick="setTimerMode(false)" id="btn-modo-livre" style="font-size: 10px; padding: 5px 12px; border-radius: 20px; border: 1px solid #3b82f6; background: ${estiloLivreBg}; color: ${estiloLivreTexto}; cursor: pointer;">LIVRE</button>
                    <button onclick="setTimerMode(true)" id="btn-modo-timer" style="font-size: 10px; padding: 5px 12px; border-radius: 20px; border: 1px solid #3b82f6; background: ${estiloTimerBg}; color: ${estiloTimerTexto}; cursor: pointer;">TIMER</button>
                </div>

                <div id="timer-input-container" class="${classeContainerInput}" style="margin-bottom: 15px;">
                    <p style="color: gray; font-size: 10px; margin-bottom: 5px;">DEFINIR TEMPO (HORAS:MIN:SEG)</p>
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
                    <h3 style="color: white; font-size: 12px; margin: 0;" class="italic-bold uppercase">Frequência semanal (Toque para alternar)</h3>
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

function gerarCalendario() {
    const calContainer = document.getElementById('calendario-semanal');
    if (!calContainer) return;

    const diasSemana = ["D", "S", "T", "Q", "Q", "S", "S"];
    calContainer.innerHTML = "";

    for (let i = 0; i < 7; i++) {
        const registro = diasTreinados.find(d => d.dia === i);
        const letraTreino = registro ? registro.treino : ""; 
        
        let estiloAtivo = "border: 1px solid rgba(255,255,255,0.1);";
        if (registro) {
            if (registro.treino === "★") {
                estiloAtivo = "border: 2px solid #eab308; background: rgba(234,179,8,0.15); color: #facc15;";
            } else {
                estiloAtivo = "border: 2px solid #3b82f6; background: rgba(59,130,246,0.2); color: white;";
            }
        }

        calContainer.innerHTML += `
            <div onclick="alternarTreinoDia(${i})" style="cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                <span style="font-size: 10px; color: gray; font-weight: bold;">${diasSemana[i]}</span>
                <div id="dia-${i}" style="width: 40px; height: 40px; ${estiloAtivo} border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1.2rem; transition: all 0.2s;">
                    ${letraTreino}
                </div>
            </div>
        `;
    }
}

function alternarTreinoDia(index) {
    const ciclos = ["", "A", "B", "C", "D", "E", "F", "G", "★"];
    
    let registroIdx = diasTreinados.findIndex(d => d.dia === index);
    let novaLetra = "";

    if (registroIdx === -1) {
        novaLetra = "A";
        diasTreinados.push({ dia: index, treino: novaLetra });
    } else {
        let atualLetra = diasTreinados[registroIdx].treino;
        let proximoIdx = (ciclos.indexOf(atualLetra) + 1) % ciclos.length;
        novaLetra = ciclos[proximoIdx];

        if (novaLetra === "") {
            diasTreinados.splice(registroIdx, 1);
        } else {
            diasTreinados[registroIdx].treino = novaLetra;
        }
    }

    localStorage.setItem('frequenciaTreino', JSON.stringify(diasTreinados));
    gerarCalendario();
}

function limparFrequencia() {
    const modalExistente = document.getElementById('modal-confirmacao-cronograma');
    if (modalExistente) modalExistente.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-confirmacao-cronograma';
    modal.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999; animation: fadeInModal 0.2s ease-out;
    `;

    modal.innerHTML = `
        <div class="glass-panel" style="background: var(--bg-card, #1e293b); border: 1px solid var(--border-color, rgba(59,130,246,0.3)); border-radius: 24px; padding: 25px; width: 90%; max-width: 320px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
            <h4 class="italic-bold" style="color: white; margin: 0 0 10px 0; font-size: 1rem; letter-spacing: 1px; text-transform: uppercase;">ZERAR SEMANA?</h4>
            <p style="color: #94a3b8; font-size: 12px; margin: 0 0 20px 0; line-height: 1.5;">Tem certeza que deseja apagar todas as marcações de treino da frequência semanal?</p>
            
            <div style="display: flex; gap: 10px;">
                <button id="btn-modal-cancelar" style="flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #f8fafc; padding: 10px; border-radius: 10px; cursor: pointer; font-size: 11px; font-weight: bold; text-transform: uppercase;">CANCELAR</button>
                <button id="btn-modal-confirmar" style="flex: 1; background: #ef4444; border: none; color: white; padding: 10px; border-radius: 10px; cursor: pointer; font-size: 11px; font-weight: bold; text-transform: uppercase;">CONFIRMAR</button>
            </div>
        </div>
        <style>
            @keyframes fadeInModal {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
            }
        </style>
    `;

    document.body.appendChild(modal);

    document.getElementById('btn-modal-cancelar').onclick = function() {
        modal.remove();
    };

    document.getElementById('btn-modal-confirmar').onclick = function() {
        diasTreinados = [];
        localStorage.setItem('frequenciaTreino', JSON.stringify(diasTreinados));
        gerarCalendario();
        modal.remove();
    };
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

    lembretes.unshift(novo);
    input.value = "";
    localStorage.setItem('fitai_lembretes', JSON.stringify(lembretes));
    renderizarLembretes();
}

function renderizarLembretes() {
    const container = document.getElementById('lista-lembretes');
    if (!container) return;

    if (lembretes.length === 0) {
        container.innerHTML = `<p style="color: gray; font-size: 11px; text-align: center; margin-top: 10px;">Vázio. (Ex: A - triceps, B - biceps) é possível "riscar" na lista. </p>`;
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
            const timeVal = document.getElementById('input-timer-native').value;
            
            if (!timeVal) return mostrarAviso("Defina o tempo!");

            const partes = timeVal.split(':');
            let segundosIniciais = 0;

            // Tratamento inteligente caso o input retorne 2 ou 3 partes (HH:MM:SS ou MM:SS)
            if (partes.length === 3) {
                segundosIniciais = (+partes[0]) * 3600 + (+partes[1]) * 60 + (+partes[2]);
            } else if (partes.length === 2) {
                segundosIniciais = (+partes[0]) * 60 + (+partes[1]);
            }

            if (segundosIniciais <= 0) return mostrarAviso("Tempo inválido!");
            milissegundosTotais = segundosIniciais * 1000;
        }

        isTimerRunning = true;
        btn.innerText = "PAUSAR";
        btn.style.background = "#ef4444"; // Cor vermelha ao rodar
        
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

/**
 * Função auxiliar de pausa ajustada de forma única (Texto vira RETOMAR)
 */
function pausarTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    
    const btn = document.getElementById('btn-timer-toggle');
    if (btn) {
        btn.innerText = "RETOMAR";
        btn.style.background = "#3b82f6"; // Sua cor azul padrão de destaque
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    milissegundosTotais = 0;
    atualizarDisplayTimer();
    const btn = document.getElementById('btn-timer-toggle');
    if (btn) { btn.innerText = "INICIAR"; btn.style.background = "#3b82f6"; }
}

// funções notificação de tempo esgotado fora da pagina cronograma 

function finalizarTimer() {
    clearInterval(timerInterval);
    isTimerRunning = false;
    milissegundosTotais = 0;
    atualizarDisplayTimer();
    const btn = document.getElementById('btn-timer-toggle');
    if (btn) { btn.innerText = "INICIAR"; btn.style.background = "#3b82f6"; }
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    mostrarAviso(" Timer Cronograma finalizado ❗");
}

function atualizarDisplayTimer() {
    const display = document.getElementById('display-timer');
    if (!display) return;
    let tempo = Math.max(0, milissegundosTotais);
    
    // Extração matemática correta de Horas, Minutos, Segundos e Milissegundos
    const horas = Math.floor(tempo / 3600000);
    const min = Math.floor((tempo % 3600000) / 60000);
    const seg = Math.floor((tempo % 60000) / 1000);
    const ms = Math.floor((tempo % 1000) / 10);
    
    // Injeta o formato HH:MM:SS mantendo os milissegundos isolados no span menor
    display.innerHTML = `${horas.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}<span style="font-size: 1.5rem; color: #3b82f6;">.${ms.toString().padStart(2, '0')}</span>`;
}

// Vinculação inteligente corrigida: Redireciona de forma direta sem causar loop
window.setTimerMode = function(modo) {
    if (typeof modo === 'string') {
        if (typeof window.setWodTimerMode === 'function') {
            window.setWodTimerMode(modo);
        }
        return;
    }

    isCountdownMode = modo;
    resetTimer();
    
    const btnTimer = document.getElementById('btn-modo-timer');
    const btnLivre = document.getElementById('btn-modo-livre');
    const inputContainer = document.getElementById('timer-input-container');

    if (btnTimer) {
        btnTimer.style.background = modo ? "#3b82f6" : "transparent";
        btnTimer.style.color = modo ? "white" : "#3b82f6";
    }
    if (btnLivre) {
        btnLivre.style.background = !modo ? "#3b82f6" : "transparent";
        btnLivre.style.color = !modo ? "white" : "#3b82f6";
    }
    if (inputContainer) {
        inputContainer.className = modo ? "" : "hidden";
    }
};

async function toggleLembrete(id) {
    if (!usuarioAtualId) return;

    const l = lembretes.find(item => item.id === id);
    if (l) {
        l.feito = !l.feito;
        
        try {
            // Atualiza diretamente no banco de dados do usuário logado
            await db.collection("usuarios").doc(usuarioAtualId)
                    .collection("lembretes").doc(id.toString()).update({
                        feito: l.feito
                    });
            
            renderizarLembretes();
        } catch (error) {
            console.error("Erro ao atualizar lembrete no banco:", error);
        }
    }
}

function removerLembrete(id) {
    lembretes = lembretes.filter(l => l.id !== id);
    localStorage.setItem('fitai_lembretes', JSON.stringify(lembretes));
    renderizarLembretes();
}

window.addEventListener('DOMContentLoaded', () => {
    // Escuta mudanças no estado de login do Firebase
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            usuarioAtualId = user.uid; // Guarda o ID único do atleta no banco
            
            try {
                // CORREÇÃO: Chama a função nova correta passando o UID do usuário
                await carregarDadosDoAtleta(user.uid);
                
                showView('lobby');
                if (typeof atualizarListaExercicios === 'function') atualizarListaExercicios(); 
                if (typeof gerarCalendario === 'function') gerarCalendario();
                if (typeof renderizarLembretes === 'function') renderizarLembretes();
            } catch (error) {
                console.error("Erro ao carregar dados do atleta:", error);
            }
        } else {
            usuarioAtualId = null;
            showView('login');
        }
    });
});

// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Funções pagina blog de evolução  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx


function renderizarBlog() {
    const container = document.getElementById('view-blog');
    if (!container) return;
    container.innerHTML = `
        <div class="glass-panel" style="padding: 16px; min-height: 85vh; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <button onclick="showView('lobby')" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; padding: 10px 15px; border-radius: 12px; cursor: pointer; font-size: 0.7rem; font-weight: bold; letter-spacing: 1px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-right: 5px; vertical-align: middle;"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>VOLTAR
                </button>
                <div style="text-align: right;">
                    <h2 class="italic-bold" style="color: white; margin: 0; font-size: 1.1rem; letter-spacing: 2px; text-transform: uppercase;">Meu Feed
                    </h2>
                    <p style="color: #3b82f6; font-size: 9px; margin: 0; font-weight: 900; letter-spacing: 1px;">EVOLUÇÃO PRO</p>
                </div>
            </div>
            <div class="glass-panel" style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 20px; margin-bottom: 25px; border: 1px solid rgba(59,130,246,0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                <textarea id="post-texto" placeholder="Como foi o treino hoje? Relate sua evolução..." style="width: 100%; background: transparent; border: none; color: white; font-family: inherit; resize: none; outline: none; margin-bottom: 15px; font-size: 14px; min-height: 60px;"></textarea>
                <div id="preview-midia" style="margin-bottom: 15px; display: flex; flex-wrap: wrap; gap: 10px;"></div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
                    <div style="display: flex; gap: 12px;">
                        <label style="cursor: pointer; background: rgba(255,255,255,0.05); width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1); transition: 0.3s;">
                            <input type="file" accept="image/*" onchange="anexarMidia(this)" style="display: none;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        </label>
                        <button id="btn-mic" onclick="toggleGravacaoAudio()" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); width: 42px; height: 42px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                        </button>
                    </div>
                    <button onclick="postarNoFeed()" style="background: #3b82f6; color: white; border: none; padding: 12px 28px; border-radius: 12px; font-weight: 900; font-size: 13px; cursor: pointer; box-shadow: 0 4px 15px rgba(59,130,246,0.4); text-transform: uppercase; letter-spacing: 1px;">POSTAR</button>
                </div>
            </div>
            <div id="feed-container" style="display: flex; flex-direction: column; gap: 15px;"></div>
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
                    <img src="${e.target.result}" style="width: 90px; height: 90px; object-fit: cover; border-radius: 10px; border: 2px solid #3b82f6;">
                    <button onclick="midiaAnexada = null; document.getElementById('preview-midia').innerHTML = ''" style="position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-size: 11px; font-weight: bold;">X</button>
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
                    <div style="background: #1e293b; padding: 10px; border-radius: 10px; color: #3b82f6; display: flex; align-items: center; gap: 10px; font-size: 13px;">
                        🎙️ Áudio Gravado <button onclick="midiaAnexada = null; document.getElementById('preview-midia').innerHTML = ''" style="color: #ef4444; border: none; background: none; cursor: pointer; font-weight: bold; margin-left: 5px;">Remover</button>
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
    if (!texto && !midiaAnexada) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        mostrarAviso("O post não pode estar vazio!");
        return;
    }

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
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mostrarAviso("Postagem realizada!");
}

function atualizarFeedUI() {
    const container = document.getElementById('feed-container');
    if (!container) return;

    const nomeAtleta = localStorage.getItem('user_nome') || "ATLETA";
    const fotoAtleta = localStorage.getItem('user_foto');

    container.innerHTML = feedEvolucao.map(post => `
        <div class="glass-panel" style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 22px; margin-bottom: 5px; position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 38px; height: 38px; border-radius: 10px; background: #3b82f6; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                        ${fotoAtleta ? `<img src="${fotoAtleta}" style="width:100%; height:100%; object-fit:cover;">` : `<span style="color:white; font-weight:900;">F</span>`}
                    </div>
                    <div>
                        <p style="color: white; font-size: 13px; font-weight: 800; margin: 0; text-transform: uppercase;">${nomeAtleta}</p>
                        <p style="color: #64748b; font-size: 10px; margin: 0;">${post.data}</p>
                    </div>
                </div>
                <button onclick="excluirPost(${post.id})" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 22px; font-weight: bold; padding: 0 5px; line-height: 1;">&times;</button>
            </div>

            ${post.texto ? `<p style="color: white; font-size: 14px; margin-bottom: 12px; line-height: 1.4;">${post.texto}</p>` : ''}

            ${post.midia && post.midia.data ? `
                <div style="width: 100%; border-radius: 14px; overflow: hidden; margin-top: 10px; background: rgba(0,0,0,0.2); display: flex; justify-content: center; align-items: center;">
                    <img src="${post.midia.data}" style="width: 100%; max-height: 250px; display: block; object-fit: contain;">
                </div>
            ` : ''}
        </div>
    `).join('') || `<p style="color: #64748b; text-align: center; margin-top: 40px; font-size: 13px;">SEM ATIVIDADES</p>`;
}

async function toggleGravacao() {
    const btn = document.getElementById('btn-mic');
    const timer = document.getElementById('timer-gravacao');

    if (!gravando) {
        try {
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
                    midiaAnexada = { tipo: 'audio', data: reader.result };
                    if (typeof atualizarPreviewMidia === 'function') atualizarPreviewMidia(); 
                };
                reader.readAsDataURL(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            gravando = true;
            
            btn.style.background = "#ef4444"; 
            btn.classList.add('mic-gravando');
            if(timer) timer.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            mostrarAviso("Gravando áudio...");

        } catch (err) {
            console.error("Erro ao capturar áudio:", err);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                mostrarAviso("Nenhum microfone foi detectado no seu dispositivo.");
            } else {
                mostrarAviso("Erro ao acessar microfone. Verifique as permissões.");
            }
        }
    } else {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        gravando = false;
        
        btn.style.background = "rgba(255,255,255,0.05)"; 
        btn.classList.remove('mic-gravando');
        if(timer) timer.classList.add('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        mostrarAviso("Gravação finalizada e anexada.");
    }
}

function excluirPost(id) {
    // Força a página a rolar para o topo instantaneamente para receber o modal centralizado
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const modalConfirm = document.createElement('div');
    modalConfirm.id = 'modal-confirmacao-exclusao';
    modalConfirm.style = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(2, 6, 23, 0.92); backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        display: flex; align-items: center; justify-content: center;
        z-index: 100000; padding: 20px;
    `;

    modalConfirm.innerHTML = `
        <div class="glass-panel" style="max-width: 320px; width: 100%; padding: 25px; text-align: center; border: 1px solid #ef4444; background: #0f172a; border-radius: 24px; box-shadow: 0 0 40px rgba(239, 68, 68, 0.2);">
            <div style="width: 55px; height: 55px; background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px; color: #ef4444;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </div>
            <h3 class="italic-bold" style="color: white; margin-bottom: 8px; font-size: 1.05rem; letter-spacing: 1px;">EXCLUIR POST?</h3>
            <p style="color: #94a3b8; margin-bottom: 20px; font-size: 13px; line-height: 1.5;">Essa ação não pode ser desfeita e removerá este momento da sua história.</p>
            
            <div style="display: flex; gap: 10px;">
                <button id="btn-cancelar-exclusao" style="flex: 1; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 14px; border-radius: 12px; font-weight: 700; cursor: pointer; font-size: 12px;">CANCELAR</button>
                <button id="btn-confirmar-exclusao" style="flex: 1; background: #ef4444; color: white; border: none; padding: 14px; border-radius: 12px; font-weight: 900; cursor: pointer; font-size: 12px; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);">EXCLUIR</button>
            </div>
        </div>
    `;

    const viewBlog = document.getElementById('view-blog');
    if (viewBlog) {
        viewBlog.appendChild(modalConfirm);
    } else {
        document.body.appendChild(modalConfirm);
    }

    document.getElementById('btn-cancelar-exclusao').onclick = () => modalConfirm.remove();

    document.getElementById('btn-confirmar-exclusao').onclick = () => {
        feedEvolucao = feedEvolucao.filter(p => p.id !== id);
        localStorage.setItem('fitai_feed', JSON.stringify(feedEvolucao));
        modalConfirm.remove();
        atualizarFeedUI(); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
        mostrarAviso("Post removido com sucesso.");
    };
}

function confirmarAcaoOriginal(titulo, messaging, callback) {
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
            <p style="color: var(--text-secondary); margin-bottom: 25px; font-size: 13px;">${messaging}</p>
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

    // Correção contra quebra de escopo: Só executa se os elementos existirem na tela atual
    if (campoEmail) {
        if (emailSalvo) campoEmail.value = emailSalvo;
        if (checkbox && emailSalvo) checkbox.checked = true;
    }
});


// xxxxxxxxxxxxxxxxxxxxxxxxxx Funções página sugestão (Plano B) xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

if (typeof cfIsPaused === 'undefined') {
    window.cfIsPaused = false; 
}

function gerarSugestao() {
    const grupo = document.getElementById('select-grupo-sub').value;
    const exOcupado = document.getElementById('select-ex-ocupado').value;
    const resultadoDiv = document.getElementById('resultado-sugestao');
    const loader = document.getElementById('loader-sugestao');
    const conteudo = document.getElementById('conteudo-sugestao');
    const nomeSugestao = document.getElementById('nome-sugestao');

    if (!grupo || !exOcupado) {
        mostrarAvisoAparelhoOcupado("Por favor, selecione o grupo muscular e qual aparelho está ocupado para podermos sugerir.");
        return;
    }

    let sugestaoEncontrada = "";

    // Lógica 1: Equivalências
    for (let categoria in equivalencias) {
        if (equivalencias[categoria].includes(exOcupado)) {
            const opcoes = equivalencias[categoria].filter(ex => ex !== exOcupado);
            if (opcoes.length > 0) {
                sugestaoEncontrada = opcoes[Math.floor(Math.random() * opcoes.length)];
                break;
            }
        }
    }

    // Lógica 2: Fallback grupo
    if (!sugestaoEncontrada) {
        const listaGrupo = dicionarioExercicios[grupo].filter(ex => ex !== exOcupado);
        if (listaGrupo.length > 0) {
            sugestaoEncontrada = listaGrupo[Math.floor(Math.random() * listaGrupo.length)];
        }
    }

    if (sugestaoEncontrada) {
        // Fluxo de Animação Premium
        if (resultadoDiv) resultadoDiv.classList.remove('hidden');
        if (conteudo) {
            conteudo.classList.add('hidden');
            conteudo.classList.remove('animar-resultado');
        }
        if (loader) loader.classList.remove('hidden');

        setTimeout(() => {
            if (loader) loader.classList.add('hidden');
            if (nomeSugestao) nomeSugestao.innerText = sugestaoEncontrada;
            if (conteudo) {
                conteudo.classList.remove('hidden');
                conteudo.classList.add('animar-resultado');
            }
        }, 750); // Tempo do efeito simulando a busca (750 milissegundos)

    } else {
        mostrarAvisoAparelhoOcupado("Não encontramos uma alternativa para este exercício no momento.");
    }
}

function carregarExerciciosSub() {
    const grupo = document.getElementById('select-grupo-sub').value;
    const selectEx = document.getElementById('select-ex-ocupado');
    
    if (!selectEx) return;

    selectEx.innerHTML = '<option value="">Qual aparelho está ocupado?</option>';
    if (!grupo) return;

    const exercicios = dicionarioExercicios[grupo] || [];
    if (exercicios.length === 0) {
        console.warn("Nenhum exercício encontrado para o grupo:", grupo);
        return;
    }

    exercicios.forEach(ex => {
        const opt = document.createElement('option');
        opt.value = ex;
        opt.textContent = ex;
        selectEx.appendChild(opt);
    });
}

const listaDeExercicios = dicionarioExercicios;

/**
 * Correção do bug crítico da variável 'message' inexistente
 */
function mostrarAvisoAparelhoOcupado(mensagem) {
    const textoModal = document.getElementById('texto-modal-aviso');
    const modalAviso = document.getElementById('modal-aviso');
    if (textoModal && modalAviso) {
        textoModal.innerText = mensagem; // Corrigido aqui (removido o 'message ||')
        modalAviso.classList.remove('hidden');
    }
}

function fecharModalAviso() {
    const modalAviso = document.getElementById('modal-aviso');
    if (modalAviso) modalAviso.classList.add('hidden');
}

function gerarSugestaoComModal() {
    const grupo = document.getElementById('select-grupo-sub').value;
    const exOcupado = document.getElementById('select-ex-ocupado').value;
    const resultadoDiv = document.getElementById('resultado-sugestao');
    const nomeSugestao = document.getElementById('nome-sugestao');

    if (!grupo || !exOcupado) {
        mostrarAvisoAparelhoOcupado("Por favor, selecione o grupo muscular e qual aparelho está ocupado para podermos sugerir.");
        return;
    }

    let sugestaoEncontrada = "";

    for (let categoria in equivalencias) {
        if (equivalencias[categoria].includes(exOcupado)) {
            const opcoes = equivalencias[categoria].filter(ex => ex !== exOcupado);
            if (opcoes.length > 0) {
                sugestaoEncontrada = opcoes[Math.floor(Math.random() * opcoes.length)];
                break;
            }
        }
    }

    if (!sugestaoEncontrada) {
        const listaGrupo = dicionarioExercicios[grupo].filter(ex => ex !== exOcupado);
        if (listaGrupo.length > 0) {
            sugestaoEncontrada = listaGrupo[Math.floor(Math.random() * listaGrupo.length)];
        }
    }

    if (sugestaoEncontrada) {
        if (nomeSugestao) nomeSugestao.innerText = sugestaoEncontrada;
        if (resultadoDiv) {
            resultadoDiv.classList.remove('hidden');
            resultadoDiv.classList.add('fade-in'); 
        }
    } else {
        mostrarAvisoAparelhoOcupado("Não encontramos uma alternativa para este exercício no momento.");
    }
}


// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Funções timer wods crossfit xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

function calcularCargasCF() {
    const input = document.getElementById('input-1rm');
    const container = document.getElementById('lista-cargas-cf');
    const valorMax = parseFloat(input.value);

    if (!valorMax || valorMax <= 0) {
        container.innerHTML = '<p style="grid-column: span 2; color: var(--text-secondary); text-align: center; font-size: 0.8rem; padding: 40px 0;">Digite um valor...</p>';
        return;
    }

    const porcentagens = [95, 90, 85, 80, 75, 70, 60, 50];
    
    container.innerHTML = porcentagens.map(p => {
        // Define a cor da tag lateral baseado na zona de intensidade do CrossFit
        let corZona = '#22c55e'; // Verde (50% a 70%)
        if (p >= 75 && p <= 85) corZona = '#ffae00'; // Amarelo (75% a 85%)
        if (p >= 90) corZona = '#ef4444'; // Vermelho (90% a 95%)

        return `
            <div class="glass-card" style="padding: 10px; border: 1px solid rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: space-between; background: rgba(15, 23, 42, 0.5); border-radius: 10px;">
                <div style="background: ${corZona}15; color: ${corZona}; font-size: 0.75rem; font-weight: 900; padding: 4px 8px; border-radius: 6px; border: 1px solid ${corZona}30;">${p}%</div>
                <div style="font-size: 1.15rem; font-weight: 900; color: #fff; text-align: right;">${(valorMax * (p/100)).toFixed(1)}<span style="font-size: 0.6rem; color: var(--text-secondary); margin-left: 2px;">KG</span></div>
            </div>
        `;
    }).join('');
}


// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Funções timer wods crossfit xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 

if (typeof audioCtx === 'undefined' || !audioCtx) {
    window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

// Elemento oculto de áudio contínuo para manter o navegador acordado em segundo plano
const bgAudioSilence = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==");
bgAudioSilence.loop = true;

function tocarBeep(freq, dur) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = freq;
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
}

function setWodTimerMode(modo) {
    if (typeof modo !== 'string') return;

    if (cfTimerInterval && !cfIsPaused) {
        return; 
    }

    cfModo = modo;
    const btnAmrap = document.getElementById('btn-amrap');
    const btnEmom = document.getElementById('btn-emom');
    const status = document.getElementById('status-timer');
    const groupSec = document.getElementById('group-seconds'); 
    const labelTempo = document.getElementById('label-tempo-wod'); 

    if (modo === 'AMRAP') {
        if (btnAmrap) {
            btnAmrap.style.opacity = "1";
            btnAmrap.style.border = "2px solid var(--accent-blue)";
            btnAmrap.style.filter = "brightness(1.2)";
        }
        if (btnEmom) {
            btnEmom.style.opacity = "0.3";
            btnEmom.style.border = "none";
            btnEmom.style.filter = "none";
        }
        if (status) status.innerText = "AMRAP (CONTAGEM REGRESSIVA)";
        
        if (groupSec) groupSec.style.display = "none";
        if (labelTempo) labelTempo.innerText = "Duração Total (Minutos)";
    } else {
        if (btnEmom) {
            btnEmom.style.opacity = "1";
            btnEmom.style.border = "2px solid var(--accent-blue)";
            btnEmom.style.filter = "brightness(1.2)";
        }
        if (btnAmrap) {
            btnAmrap.style.opacity = "0.3";
            btnAmrap.style.border = "none";
            btnAmrap.style.filter = "none";
        }
        if (status) status.innerText = "EMOM (ALERTA POR INTERVALO)";
        
        if (groupSec) groupSec.style.display = "flex";
        if (labelTempo) labelTempo.innerText = "Intervalo do Alerta (Min:Seg)";
    }
    resetarTimerCF();
}

function travarControlesTempo(deveTravar) {
    const botoes = ['btn-min-down', 'btn-min-up', 'btn-sec-down', 'btn-sec-up', 'btn-amrap', 'btn-emom'];
    botoes.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = deveTravar;
            el.style.pointerEvents = deveTravar ? "none" : "auto";
        }
    });
    const container = document.getElementById('container-ajuste-tempo');
    if (container) container.style.opacity = deveTravar ? "0.4" : "1";
}

function iniciarTimerCF() {
    const btnStart = document.getElementById('btn-start-wod');

    if (cfTimerInterval && !cfIsPaused) {
        pausarTimerCF();
        return;
    }

    // Solicita permissão de notificação do sistema caso o usuário ainda não tenha liberado
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    bgAudioSilence.play().catch(() => {});

    if (cfIsPaused) {
        cfIsPaused = false;
        cfStartTime = Date.now() - (cfTempoDecorridoAcumulado * 1000);
        
        if (btnStart) btnStart.innerHTML = "<span>PAUSAR WOD</span>";
        
        travarControlesTempo(true);
        executarWodReal();
        atualizarAlternadorInterface(false);
        configurarNotificacaoMedia('playing', 'Rodando');
        return;
    }

    const display = document.getElementById('timer-display');
    const status = document.getElementById('status-timer');
    const minSet = parseInt(document.getElementById('wod-minutes').value) || 0;
    
    if (btnStart) btnStart.innerHTML = "<span>PAUSAR WOD</span>";
    travarControlesTempo(true);

    let prep = 10;
    if (status) status.innerText = "PREPARAR...";
    if (display) display.style.color = "#ffae00"; 

    cfTimerInterval = setInterval(() => {
        if (prep > 0) {
            tocarBeep(600, 0.1); 
            if (display) display.innerHTML = `00:${prep.toString().padStart(2, '0')}<span style="font-size: 2.2rem; opacity: 0.75; margin-left: 2px;">:00</span>`;
            
            const txtPrep = `PREP ${prep}`;
            atualizarMiniTimerWidget(txtPrep);
            configurarNotificacaoMedia('playing', txtPrep);
            
            prep--;
        } else {
            clearInterval(cfTimerInterval);
            tocarBeep(880, 0.5); 
            cfTempoDecorridoAcumulado = 0;
            cfStartTime = Date.now();
            executarWodReal(minSet);
            
            atualizarAlternadorInterface(false);
            configurarNotificacaoMedia('playing', '00:00');
        }
    }, 1000);
}

function pausarTimerCF() {
    const btnStart = document.getElementById('btn-start-wod');
    if (!cfTimerInterval) return;
    
    clearInterval(cfTimerInterval);
    cfTimerInterval = null;
    cfIsPaused = true;
    
    const agora = Date.now();
    cfTempoDecorridoAcumulado = (agora - cfStartTime) / 1000;
    
    const status = document.getElementById('status-timer');
    const display = document.getElementById('timer-display');
    
    if (status) status.innerText = "PAUSADO";
    if (display) display.style.color = "#94a3b8";
    
    if (btnStart) btnStart.innerHTML = "<span>RETOMAR WOD</span>";

    configurarNotificacaoMedia('paused', 'Pausado');
    atualizarAlternadorInterface(true);
}

function executarWodReal() {
    const display = document.getElementById('timer-display');
    const status = document.getElementById('status-timer');
    const btnStart = document.getElementById('btn-start-wod');
    
    const mSet = parseInt(document.getElementById('wod-minutes').value) || 0;
    const sSet = parseInt(document.getElementById('wod-seconds')?.value) || 0;
    const intervaloTotalSegundos = (mSet * 60) + sSet;

    if (status) status.innerText = "WORK!";
    if (display) display.style.color = "#22c55e"; 
    if (btnStart) btnStart.innerHTML = "<span>PAUSAR WOD</span>";

    let ultimoSegundoApitado = -1;
    atualizarAlternadorInterface(false);

    cfTimerInterval = setInterval(() => {
        const agora = Date.now();
        const decorrido = (agora - cfStartTime) / 1000;
        let tempoFinal = 0;

        if (cfModo === 'AMRAP') {
            tempoFinal = intervaloTotalSegundos - decorrido;
            
            if (tempoFinal <= 5 && tempoFinal > 0) {
                if (display) {
                    const blink = Math.floor(decorrido * 5) % 2 === 0;
                    display.style.color = blink ? "#ff4444" : "white";
                }
                const segAtual = Math.floor(tempoFinal);
                if (segAtual !== ultimoSegundoApitado) {
                    tocarBeep(440, 0.05);
                    ultimoSegundoApitado = segAtual;
                }
            }

            if (tempoFinal <= 0) {
                tocarBeep(220, 1);
                return finalizarTudo();
            }
        } else {
            tempoFinal = decorrido;
            
            const cicloAtual = Math.floor(decorrido / intervaloTotalSegundos);
            if (decorrido > 0 && cicloAtual !== ultimoSegundoApitado) {
                tocarBeep(880, 0.6);
                ultimoSegundoApitado = cicloAtual;
                
                if (display && status) {
                    display.style.color = "#00d4ff";
                    status.innerText = "NOVO ROUND!";
                    status.style.color = "#00d4ff";
                    
                    setTimeout(() => {
                        if(!cfIsPaused && cfTimerInterval) {
                            display.style.color = "#22c55e";
                            status.innerText = "WORK!";
                            status.style.color = "var(--accent-blue)";
                        }
                    }, 1500);
                }
            }
        }

        const m = Math.floor(Math.abs(tempoFinal) / 60);
        const s = Math.floor(Math.abs(tempoFinal) % 60);
        const ms = Math.floor((Math.abs(tempoFinal) % 1) * 100);
        
        const tempoFormatado = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        
        if (display) {
            display.innerHTML = `${tempoFormatado}<span style="font-size: 2.2rem; opacity: 0.75; margin-left: 2px;">:${ms.toString().padStart(2, '0')}</span>`;
        }

        document.title = `${tempoFormatado} | ${cfModo}`;
        
        atualizarMiniTimerWidget(tempoFormatado);
        configurarNotificacaoMedia('playing', tempoFormatado);
    }, 10);
}

function finalizarTudo() {
    pararTimerCF();
    bgAudioSilence.pause();
    document.title = "AssisFiT PRO";
    ocultarMiniTimerWidget();
    limparNotificacaoMedia();
    travarControlesTempo(false);
    
    const display = document.getElementById('timer-display');
    const btnStart = document.getElementById('btn-start-wod');
    const status = document.getElementById('status-timer');

    if (display) {
        display.innerHTML = `00:00<span style="font-size: 2.2rem; opacity: 0.75; margin-left: 2px;">:00</span>`;
        display.style.color = "#ff4444";
    }
    if (status) status.innerText = "FIM DO TREINO!";
    if (btnStart) btnStart.innerHTML = "<span>INICIAR WOD</span>";
}

function resetarTimerCF() {
    pararTimerCF();
    bgAudioSilence.pause();
    document.title = "AssisFiT PRO";
    ocultarMiniTimerWidget();
    limparNotificacaoMedia();
    travarControlesTempo(false);
    cfTempoDecorridoAcumulado = 0;
    cfIsPaused = false;
    
    const display = document.getElementById('timer-display');
    const btnStart = document.getElementById('btn-start-wod');
    const status = document.getElementById('status-timer');

    if (display) {
        display.innerHTML = `00:00<span style="font-size: 2.2rem; opacity: 0.75; margin-left: 2px;">:00</span>`;
        display.style.color = "white";
    }
    if (status) status.innerText = "PRONTO";
    if (btnStart) btnStart.innerHTML = "<span>INICIAR WOD</span>";
}

function pararTimerCF() {
    clearInterval(cfTimerInterval);
    cfTimerInterval = null;
}

// --- CONTROLE DA ABA DE NOTIFICAÇÕES DISPOSITIVO MÓVEL (MEDIA SESSION) ---
function configurarNotificacaoMedia(estado, tempoStr) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: `${cfModo}: ${tempoStr}`,
            artist: 'Treino em Andamento',
            album: 'AssisFiT PRO'
        });

        navigator.mediaSession.playbackState = estado;

        navigator.mediaSession.setActionHandler('pause', () => {
            pausarTimerCF();
        });
        navigator.mediaSession.setActionHandler('play', () => {
            iniciarTimerCF();
        });
    }
}

function limparNotificacaoMedia() {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
    }
}

// --- CONTROLE LOGICO DO MINI-WIDGET COMPATIVEL ---
function atualizarMiniTimerWidget(tempoStr) {
    const widget = document.getElementById('mini-timer-widget');
    const text = document.getElementById('mini-timer-text');
    if (!widget || !text) return;

    // Se houver uma contagem ativa ou pausada E o usuário não estiver visualizando a página de timers
    if ((cfTimerInterval || cfIsPaused) && window.currentView !== 'crossfit-timers') {
        widget.style.display = "flex";
        if (tempoStr !== "") {
            text.innerText = `${cfModo}: ${tempoStr}`;
        }
    } else {
        widget.style.display = "none";
    }
}

function alternarPlayPauseWidget() {
    if (cfTimerInterval && !cfIsPaused) {
        pausarTimerCF();
    } else {
        iniciarTimerCF();
    }
}

function atualizarAlternadorInterface(estaPausado) {
    const iconPause = document.getElementById('mini-icon-pause');
    const iconPlay = document.getElementById('mini-icon-play');
    if (!iconPause || !iconPlay) return;

    if (estaPausado) {
        iconPause.style.display = "none";
        iconPlay.style.display = "block";
    } else {
        iconPause.style.display = "block";
        iconPlay.style.display = "none";
    }
    
    const btnStart = document.getElementById('btn-start-wod');
    if (btnStart) {
        btnStart.innerHTML = estaPausado ? "<span>RETOMAR WOD</span>" : "<span>PAUSAR WOD</span>";
    }
}

function ocultarMiniTimerWidget() {
    const widget = document.getElementById('mini-timer-widget');
    if (widget) widget.style.display = "none";
}

window.alternarPlayPauseWidget = alternarPlayPauseWidget;
window.setWodTimerMode = setWodTimerMode;
window.iniciarTimerCF = iniciarTimerCF;
window.pausarTimerCF = pausarTimerCF;
window.resetarTimerCF = resetarTimerCF;
