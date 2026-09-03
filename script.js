// 1. CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCQcfeMAGcGFp1MTZTpAevihoSsg57M2U8",
  authDomain: "assisfit-pro.firebaseapp.com",
  projectId: "assisfit-pro",
  storageBucket: "assisfit-pro.firebasestorage.app",
  messagingSenderId: "859765965750",
  appId: "1:859765965750:web:e23c5fe1ec54a7d62df717",
  measurementId: "G-0V4XD960QL"
};

// 1. INICIALIZAÇÃO SEGURA DO FIREBASE
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);function aplicarMascaraTempo(e) {
    let valor = e.target.value.replace(/\D/g, '');
    if (valor.length > 6) {
        valor = valor.slice(0, 6);
    }
    valor = valor.padStart(6, '0');
    const horas = valor.slice(0, 2);
    const minutos = valor.slice(2, 4);
    const segundos = valor.slice(4, 6);
    e.target.value = `${horas}:${minutos}:${segundos}`;
}
    }
    window.auth = firebase.auth();
    window.db = firebase.firestore();

    window.db.settings({ 
        cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED 
    });
} else {
    console.error("SDK do Firebase não foi encontrado! Verifique as tags <script> no index.html.");
}

// Atalhos globais sem redeclarar com const/let
var auth = window.auth;
var db = window.db;

// 2. VARIÁVEIS GLOBAIS DE ESTADO
let usuarioAtualId = null;
let bancoDeDados = JSON.parse(localStorage.getItem('fitai_pro_data')) || { fichas: {} }; // variável das fichas cadastradas 
let diasTreinados = [];
let lembretes = [];
let feedEvolucao = [];
let assisData = null;

let midiaAnexada = null; // var global de midias anexadas para postagem no feed 
let cronometrosAtivos = {}; 
let tempoMestreAtivo = null;
let milisegundosAcumulados = 0;
let timestampInicio = null;
window.cfIsPaused = false;
let fluxoTrocaEmailPendente = null;

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

 // váriaveis blog evolução.
let nomeUsuarioAtual = "ATLETA";
let fotoUsuarioAtual = null; 

const getSeries = () => parseInt(document.getElementById('series-ex')?.value) || 0;
const getReps = () => parseInt(document.getElementById('reps-ex')?.value) || 0;
const getCarga = () => parseFloat(document.getElementById('carga-ex')?.value) || 0;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

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

window.dicionarioExercicios = dicionarioExercicios;

// 3. ESCUTA DE AUTENTICAÇÃO (Controla o acesso Login vs Lobby)
document.addEventListener('DOMContentLoaded', () => {
    // 1. Configuração das abas de Login e Cadastro
    const btnTabLogin = document.getElementById('btn-tab-login');
    const btnTabCadastro = document.getElementById('btn-tab-cadastro');

    if (btnTabLogin) {
        btnTabLogin.addEventListener('click', () => toggleAuthTab('login'));
    }

    if (btnTabCadastro) {
        btnTabCadastro.addEventListener('click', () => toggleAuthTab('cadastro'));
    }

    // 2. Botão de submissão do login
    const btnLogin = document.getElementById('btn-login-submit');
    if (btnLogin) {
        btnLogin.onclick = handleLogin;
    }

    // 3. Recuperação de e-mail salvo
    const savedEmail = localStorage.getItem('fitai_remember_email');
    const inputLoginEmail = document.getElementById('login-email');
    const rememberCheckbox = document.getElementById('remember-me');

    if (savedEmail && inputLoginEmail) {
        inputLoginEmail.value = savedEmail;
        if (rememberCheckbox) rememberCheckbox.checked = true;
    }
});


// 4. Monitoramento seguro do Firebase Auth (Fica fora do DOMContentLoaded pois gerencia o estado do Firebase)
if (typeof auth !== 'undefined' && auth) {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            window.usuarioAtualId = user.uid;        
            localStorage.setItem('user_email_ativo', user.email);
            try {
                if (typeof carregarBancoDoFirebase === 'function') {
                    await carregarBancoDoFirebase();
                }

                if (typeof window.carregarDadosDoAtleta === 'function') {
                    await window.carregarDadosDoAtleta(user.uid);
                }
                if (typeof carregarDadosPerfil === 'function') {
                    await carregarDadosPerfil();
                }

                // CHAMA DIRETAMENTE A SUA FUNÇÃO QUE JÁ EXISTE:
                if (typeof carregarFeedDoBanco === 'function') {
                    await carregarFeedDoBanco();
                }

            } catch (err) {
                console.error("Erro ao carregar dados do atleta no login:", err);
            }
            
            if (typeof showView === 'function') {
                showView('lobby');
            }
        } else {
            window.usuarioAtualId = null;
            localStorage.removeItem('user_email_ativo');
            bancoDeDados = { fichas: {} }; 
            
            if (typeof showView === 'function') {
                showView('login');
            }
        }
    });
}


window.toggleAuthTab = function(tab) {
    const formLogin = document.getElementById('form-login');
    const formCadastro = document.getElementById('form-cadastro');
    const btnTabLogin = document.getElementById('btn-tab-login');
    const btnTabCadastro = document.getElementById('btn-tab-cadastro');
    const tabSystem = document.getElementById('auth-tab-selector');

    if (tab === 'cadastro') {
        if (formLogin) formLogin.classList.add('hidden');
        if (formCadastro) formCadastro.classList.remove('hidden');
        if (btnTabLogin) btnTabLogin.classList.remove('active');
        if (btnTabCadastro) btnTabCadastro.classList.add('active');
        if (tabSystem) tabSystem.classList.add('cadastro-active');
    } else {
        if (formCadastro) formCadastro.classList.add('hidden');
        if (formLogin) formLogin.classList.remove('hidden');
        if (btnTabCadastro) btnTabCadastro.classList.remove('active');
        if (btnTabLogin) btnTabLogin.classList.add('active');
        if (tabSystem) tabSystem.classList.remove('cadastro-active');
    }
};

window.alternarAbaAuth = window.toggleAuthTab;


async function handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();

    // 1. LIMPEZA IMEDIATA: Antes de tentar logar, garantimos que não haja cache residual
    localStorage.removeItem('bancoDeDados');
    localStorage.removeItem('perfil_usuario'); 
    
    // Forçamos a limpeza visual da foto no DOM aqui também
    const fotoPerfil = document.getElementById('foto-perfil-feed');
    if (fotoPerfil) fotoPerfil.src = ''; 

    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-pass');

    // ... (o restante do seu código segue igual) ...
    const email = emailInput.value.trim();
    const pass = passInput.value;

    if (!email || !pass) {
        return mostrarAvisoNotificacao("Preencha o e-mail e a senha!");
    }

    try {
        if (!auth) throw new Error("Firebase não está carregado.");
        
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        await auth.signInWithEmailAndPassword(email, pass);
        
        mostrarAvisoNotificacao("SEJA BEM-VINDO!", "sucesso");

        if (typeof showView === 'function') {
            showView('lobby');
        }

    } catch (error) {
        console.error("Erro ao fazer login:", error);

        if (
            error.code === 'auth/invalid-credential' || 
            error.code === 'auth/user-not-found' || 
            error.code === 'auth/wrong-password' ||
            error.code === 'auth/invalid-login-credentials'
        ) {
            mostrarAvisoNotificacao("E-mail ou senha incorretos!");
        } else if (error.code === 'auth/invalid-email') {
            mostrarAvisoNotificacao("Formato de e-mail inválido!");
        } else {
            mostrarAvisoNotificacao("Erro de conexão. Tente novamente!");
        }
    }
}

// Força limpeza localStorage

function limparCacheLocalSessao() {
    localStorage.removeItem('bancoDeDados');
    localStorage.removeItem('perfil_usuario'); // Ajuste para a chave exata que você usa para a foto
    // Remova também outras chaves locais que pertencem ao usuário, se houver
}

let dadosOriginaisPerfil = {};

async function carregarDadosPerfil() {
    const user = auth.currentUser;
    if (!user) return;

    // TRAVA DEFINITIVA DO E-MAIL
    const inputEmail = document.getElementById('perfil-email');
    if (inputEmail) {
        inputEmail.value = user.email || "";
        inputEmail.disabled = true;
        inputEmail.style.opacity = "0.6";
        inputEmail.style.cursor = "not-allowed";
    }

    // 1. Pega os dados salvos no localStorage específico do usuário
    const dadosLocais = JSON.parse(localStorage.getItem(`fitai_user_data_${user.uid}`)) || {};
    
    // CORREÇÃO CRUCIAL: Garante que busca o nome salvo no objeto local, depois no displayName, e só por último usa o fallback "Atleta" se realmente não houver nada
    let nomeFinal = dadosLocais.nome || user.displayName || (user.email ? user.email.split('@')[0] : "Atleta");
    let telFinal = dadosLocais.tel || dadosLocais.telefone || "";
    let fotoFinal = localStorage.getItem(`user_foto_${user.uid}`) || localStorage.getItem('user_foto') || "";

    // Se o nome encontrado for genérico ou vazio, mas existir no perfil do Google/Auth, usa ele
    if ((!nomeFinal || nomeFinal.toLowerCase() === "atleta") && user.displayName) {
        nomeFinal = user.displayName;
    }

    // 2. Busca na nuvem (Firestore) em segundo plano para atualizar se houver dados novos
    try {
        if (typeof db !== 'undefined' && db) {
            const docRef = await db.collection("usuarios").doc(user.uid).get();
            if (docRef.exists) {
                const dadosDoc = docRef.data();
                
                if (dadosDoc.nome && dadosDoc.nome.trim() !== "") {
                    nomeFinal = dadosDoc.nome;
                    dadosLocais.nome = nomeFinal; // Atualiza o objeto local
                }
                if (dadosDoc.tel || dadosDoc.telefone) {
                    telFinal = dadosDoc.tel || dadosDoc.telefone;
                    dadosLocais.tel = telFinal;
                }
                
                if (dadosDoc.fotoPerfil) {
                    fotoFinal = dadosDoc.fotoPerfil;
                    localStorage.setItem(`user_foto_${user.uid}`, fotoFinal);
                    localStorage.setItem('user_foto', fotoFinal);
                }

                // Salva preventivamente no localStorage para o feed nunca mais ler "Atleta"
                localStorage.setItem(`fitai_user_data_${user.uid}`, JSON.stringify(dadosLocais));
            }
        }
    } catch (error) {
        console.error("Erro ao buscar dados do perfil no Firestore:", error);
    }

    // Guarda nos dados originais para controle de alterações se necessário
    dadosOriginaisPerfil = { nome: nomeFinal, tel: telFinal };

    // Preenche os inputs de texto na tela de perfil
    const inputNome = document.getElementById('perfil-nome');
    if (inputNome) {
        inputNome.value = nomeFinal;
        inputNome.disabled = true; // Mantém travado até o usuário clicar em editar
        inputNome.classList.remove('input-pendente');
    }
    
    const inputTel = document.getElementById('perfil-tel');
    if (inputTel) {
        inputTel.value = telFinal;
        inputTel.disabled = true;
        inputTel.classList.remove('input-pendente');
    }

    // 3. Aplica a foto e o nome na interface de forma definitiva (Avatar e Miniaturas do Feed)
    const preview = document.getElementById('perfil-foto-preview');
    const navIcon = document.getElementById('nav-perfil-icon');

    const svgBonecoGrande = `<svg viewBox="0 0 24 24" width="40" height="40" stroke="white" stroke-width="1.5" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    const svgBonecoPequeno = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="white" stroke-width="1.5" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;

    if (fotoFinal && fotoFinal.trim() !== "") {
        if (preview) preview.innerHTML = `<img src="${fotoFinal}" style="width:100%; height:100%; object-fit:cover;">`;
        if (navIcon) navIcon.innerHTML = `<img src="${fotoFinal}" style="width:100%; height:100%; object-fit:cover; border-radius: 50%;">`;
    } else {
        if (preview) preview.innerHTML = svgBonecoGrande;
        if (navIcon) navIcon.innerHTML = svgBonecoPequeno;
    }

    // Atualiza também elementos do feed se houverem na página atual
    document.querySelectorAll(`.nome-usuario-atual, [data-user-name-id="${user.uid}"]`).forEach(el => {
        el.innerText = nomeFinal;
    });
}  

window.carregarDadosPerfil = carregarDadosPerfil;

// Função peril // código OTP simulado 

async function persistirDadosPerfilFinal(nome, telefone, btn) {
    const user = auth.currentUser;
    if (!user) return;

    const dadosAtuais = JSON.parse(localStorage.getItem(`fitai_user_data_${user.uid}`)) || {};
    dadosAtuais.nome = nome;
    dadosAtuais.tel = telefone;
    
    localStorage.setItem(`fitai_user_data_${user.uid}`, JSON.stringify(dadosAtuais));

    if (typeof db !== 'undefined' && db) {
        try {
            await db.collection('usuarios').doc(user.uid).set({
                nome: nome,
                telefone: telefone
            }, { merge: true });
        } catch (err) {
            console.error("Erro ao atualizar dados no Firestore:", err);
        }
    }

    // Bloqueia os inputs novamente e remove o alerta visual
    ['perfil-nome', 'perfil-tel'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = true;
            el.classList.remove('input-pendente');
        }
    });

    dadosOriginaisPerfil = { nome: nome, tel: telefone };

    if (btn) exibirFeedbackSucessoBotao(btn);
    mostrarAvisoNotificacao("Perfil atualizado com sucesso!", "sucesso");
    
    if (typeof atualizarFeedUI === "function") {
        atualizarFeedUI();
    }
}

window.carregarDadosPerfil = carregarDadosPerfil;

async function carregarDadosDoUsuarioDoBanco() {
    if (typeof usuarioAtualId !== 'undefined' && usuarioAtualId) {
        await window.carregarDadosDoAtleta(usuarioAtualId);
    } else if (auth && auth.currentUser) {
        await window.carregarDadosDoAtleta(auth.currentUser.uid);
    } else {
        console.warn("Tentativa de carregar dados, mas nenhum ID de usuário foi encontrado.");
    }
}

// -- ** Esqueceu a senha ** -- 

function handleRecuperar(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (typeof abrirModalEsqueceuSenha === 'function') {
        abrirModalEsqueceuSenha();
    } else {
        console.error("A função abrirModalEsqueceuSenha não foi encontrada.");
    }
}
window.handleRecuperar = handleRecuperar;

function habilitarEdicaoCampo(idInput, btnElement) {
    const input = document.getElementById(idInput);
    if (!input) return;

    if (input.disabled) {
        input.disabled = false;
        input.focus();
        // Muda visualmente o ícone ou cor para indicar que está editável
        btnElement.style.opacity = "1";
        btnElement.style.transform = "scale(1.1)";
    } else {
        input.disabled = true;
        btnElement.style.opacity = "0.7";
        btnElement.style.transform = "scale(1)";
    }
}

if (typeof window.novaFotoBase64Temp === 'undefined') {
    window.novaFotoBase64Temp = null;
}

if (typeof window.novaFotoBase64Temp === 'undefined') {
    window.novaFotoBase64Temp = null;
}

window.habilitarEdicaoCampo = habilitarEdicaoCampo;


async function salvarDadosPerfil(event) {
    const user = auth.currentUser;
    if (!user) return;

    const inputNome = document.getElementById('perfil-nome');
    const inputTel = document.getElementById('perfil-tel');

    const nome = inputNome ? inputNome.value.trim() : "";
    const novoTel = inputTel ? inputTel.value.trim() : "";
    
    const dadosAtuais = JSON.parse(localStorage.getItem(`fitai_user_data_${user.uid}`)) || {};
    const telAntigo = (dadosAtuais.tel || "").trim();
    
    // Pega a foto nova (se houver) ou mantém a atual
    let fotoParaSalvar = window.novaFotoBase64Temp || localStorage.getItem(`user_foto_${user.uid}`) || "";

    // 1. SALVA PRIMEIRO NO FIRESTORE (Nuvem)
    try {
        if (typeof db !== 'undefined' && db) {
            await db.collection('usuarios').doc(user.uid).set({
                nome: nome,
                telefone: telAntigo, // Mantém o antigo se não passou pela confirmação de senha
                fotoPerfil: fotoParaSalvar
            }, { merge: true });
        }
    } catch (error) {
        console.error("Erro ao salvar na nuvem:", error);
        if (typeof mostrarAvisoNotificacao === "function") {
            mostrarAvisoNotificacao("Erro de conexão. As alterações não foram salvas na nuvem.", "erro");
        }
        return; // Para aqui para não dessincronizar
    }

    // 2. SE A NUVEM ACEITOU, ATUALIZA O CACHE LOCAL E A INTERFACE
    dadosAtuais.nome = nome;
    dadosAtuais.tel = telAntigo;
    dadosAtuais.fotoPerfil = fotoParaSalvar;
    
    localStorage.setItem(`fitai_user_data_${user.uid}`, JSON.stringify(dadosAtuais));
    localStorage.setItem('user_nome', nome);
    
    if (fotoParaSalvar) {
        localStorage.setItem(`user_foto_${user.uid}`, fotoParaSalvar);
        localStorage.setItem('user_foto', fotoParaSalvar);
    }

    window.novaFotoBase64Temp = null;

    if (typeof mostrarAvisoNotificacao === "function") {
        mostrarAvisoNotificacao("Perfil atualizado com sucesso na nuvem!", "sucesso");
    }

    if (typeof atualizarFeedUI === "function") {
        atualizarFeedUI();
    }
}
window.salvarDadosPerfil = salvarDadosPerfil;


async function executarTrocaTelefoneDefinitiva() {
    const p1 = document.getElementById('confirm-pass-atual').value;
    const p2 = document.getElementById('confirm-pass-atual-2').value;

    if (!p1 || !p2 || p1 !== p2) {
        if (typeof mostrarAvisoNotificacao === "function") {
            mostrarAvisoNotificacao("As senhas não coincidem ou estão vazias!", "erro");
        }
        return;
    }

    try {
        const dados = window.fluxoTrocaPendente;
        if (!dados) return;

        // Reautentica no Firebase com a senha atual
        const credencial = firebase.auth.EmailAuthProvider.credential(dados.user.email, p1);
        await firebase.auth().currentUser.reauthenticateWithCredential(credencial);

        // Atualiza LocalStorage
        const dadosLocais = JSON.parse(localStorage.getItem(`fitai_user_data_${dados.user.uid}`)) || {};
        dadosLocais.nome = dados.nome;
        dadosLocais.tel = dados.novoTel;
        localStorage.setItem(`fitai_user_data_${dados.user.uid}`, JSON.stringify(dadosLocais));

        // Atualiza Firestore
        if (typeof db !== 'undefined' && db) {
            await db.collection('usuarios').doc(dados.user.uid).set({
                nome: dados.nome,
                telefone: dados.novoTel
            }, { merge: true });
        }

        if (typeof mostrarAvisoNotificacao === "function") {
            mostrarAvisoNotificacao("Telefone alterado com sucesso!", "sucesso");
        }

        fecharModalSenha();
        location.reload();

    } catch (error) {
        console.error("Erro na reautenticação:", error);
        if (typeof mostrarAvisoNotificacao === "function") {
            mostrarAvisoNotificacao("Senha atual incorreta!", "erro");
        }
    }
}

window.executarTrocaTelefoneDefinitiva = executarTrocaTelefoneDefinitiva;


// 2. Função para atualizar a foto de perfil temporariamente
if (typeof window.novaFotoBase64Temp === 'undefined') {
    window.novaFotoBase64Temp = null;
}


// Atualização de foto de perfil (Otimizada para feedback visual instantâneo)
if (typeof window.novaFotoBase64Temp === 'undefined') {
    window.novaFotoBase64Temp = null;
}

function atualizarFotoPerfil(input) {
    const user = auth.currentUser;
    if (!user) return;

    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            window.novaFotoBase64Temp = e.target.result; 
            
            const imgHtml = `<img src="${window.novaFotoBase64Temp}" style="width:100%; height:100%; object-fit:cover;">`;
            
            // 1. Atualiza o preview grande na página de perfil na hora
            const preview = document.getElementById('perfil-foto-preview');
            if (preview) {
                preview.innerHTML = imgHtml;
            }

            // 2. ATUALIZAÇÃO INSTANTÂNEA DA MINIATURA NO TOPO E NO FEED (Sem delay)
            localStorage.setItem(`user_foto_${user.uid}`, window.novaFotoBase64Temp);
            localStorage.setItem('user_foto', window.novaFotoBase64Temp);
            
            if (typeof aplicarFotoNaInterface === "function") {
                aplicarFotoNaInterface(user.uid, window.novaFotoBase64Temp);
            }
            
            // Adiciona a classe de pendência nos inputs
            ['perfil-nome', 'perfil-tel'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('input-pendente');
            });
        };
        reader.readAsDataURL(input.files[0]);
    }
}

window.atualizarFotoPerfil = atualizarFotoPerfil;

// Função auxiliar para aplicar a foto instantaneamente na interface (topo e feed)
function aplicarFotoNaInterface(uid, fotoUrl) {
    if (!fotoUrl) return;
    
    const navIcon = document.getElementById('nav-perfil-icon');
    if (navIcon) {
        navIcon.innerHTML = `<img src="${fotoUrl}" style="width:100%; height:100%; object-fit:cover; border-radius: 50%;">`;
    }

    document.querySelectorAll(`img[data-user-avatar="${uid}"], .avatar-usuario-atual`).forEach(imgEl => {
        imgEl.src = fotoUrl;
    });

    // Atualiza também o feed se ele já estiver carregado na tela
    if (typeof atualizarFeedUI === "function") {
        atualizarFeedUI();
    }
}

window.aplicarFotoNaInterface = aplicarFotoNaInterface;

function iniciarMonitoramentoPendenciaPerfil() {
    const inputNome = document.getElementById('perfil-nome');
    const inputTel = document.getElementById('perfil-tel');

    [inputNome, inputTel].forEach(el => {
        if (el && !el._monitorPendenciaAtivo) {
            el._monitorPendenciaAtivo = true; 
            
            el.addEventListener('input', () => {
                const user = auth.currentUser;
                if (!user) return;
                
                const dadosAtuais = JSON.parse(localStorage.getItem(`fitai_user_data_${user.uid}`)) || {};
                const valorOriginal = el.id === 'perfil-nome' ? (dadosAtuais.nome || "") : (dadosAtuais.tel || "");
                const valorAtual = el.value.trim();

                if (valorAtual !== valorOriginal) {
                    el.classList.add('input-pendente');
                } else {
                    el.classList.remove('input-pendente');
                }
            });
        }
    });
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

window.exibirFeedbackSucessoBotao = exibirFeedbackSucessoBotao;


function alterarSenhaPerfil() {
    const nova = document.getElementById('pass-nova').value;
    const confirmar = document.getElementById('pass-confirmar') ? document.getElementById('pass-confirmar').value : "";

    if (nova.length < 6) {
        mostrarAvisoNotificacao("A nova senha precisa ter no mínimo 6 caracteres!", "erro");
        return;
    }

    if (nova !== confirmar) {
        mostrarAvisoNotificacao("As senhas digitadas não coincidem!", "erro");
        return;
    }

    const modal = document.getElementById('modal-confirmar-senha');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
    const inputPass = document.getElementById('confirm-pass-atual');
    if (inputPass) inputPass.focus();
}

function fecharModalSenha() {
    const modal = document.getElementById('modal-confirmar-senha');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
    
    // Restaura o scroll da página
    document.body.style.overflow = "auto";

    const inputPass1 = document.getElementById('confirm-pass-atual');
    const inputPass2 = document.getElementById('confirm-pass-atual-2');
    if (inputPass1) inputPass1.value = "";
    if (inputPass2) inputPass2.value = "";
    
    window.fluxoTrocaPendente = null;
}

window.fecharModalSenha = fecharModalSenha;

async function processarTrocaSenha() {
    const senhaAtualInput = document.getElementById('confirm-pass-atual');
    const novaSenhaInput = document.getElementById('pass-nova');
    const confirmarSenhaInput = document.getElementById('pass-confirmar');

    const senhaAtual = senhaAtualInput ? senhaAtualInput.value.trim() : "";
    const novaSenha = novaSenhaInput ? novaSenhaInput.value : "";
    const confirmarSenha = confirmarSenhaInput ? confirmarSenhaInput.value : "";

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
        mostrarAvisoNotificacao("Preencha todos os campos de senha!", "erro");
        return;
    }

    if (novaSenha !== confirmarSenha) {
        mostrarAvisoNotificacao("As novas senhas não coincidem!", "erro");
        return;
    }

    if (novaSenha.length < 6) {
        mostrarAvisoNotificacao("A nova senha deve ter pelo menos 6 caracteres!", "erro");
        return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
        mostrarAvisoNotificacao("Usuário não autenticado!", "erro");
        return;
    }

    try {
        // 1. Cria a credencial com a senha atual digitada
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, senhaAtual);

        // 2. Reautentica o usuário de forma segura antes de trocar a senha
        await user.reauthenticateWithCredential(credential);

        // 3. Atualiza para a nova senha no Firebase Auth
        await user.updatePassword(novaSenha);

        // 4. Limpa os campos de senha
        if (senhaAtualInput) senhaAtualInput.value = "";
        if (novaSenhaInput) novaSenhaInput.value = "";
        if (confirmarSenhaInput) confirmarSenhaInput.value = "";

        // 5. Fecha o modal de senha sem recarregar a página ou mandar para o lobby
        if (typeof fecharModalSenha === 'function') {
            fecharModalSenha();
        }

        mostrarAvisoNotificacao("Senha alterada com sucesso!", "sucesso");

    } catch (error) {
        console.error("Erro ao alterar senha:", error);
        if (error.code === 'auth/invalid-login-credentials' || error.code === 'auth/wrong-password') {
            mostrarAvisoNotificacao("A senha atual está incorreta!", "erro");
        } else {
            mostrarAvisoNotificacao("Erro ao alterar senha. Tente novamente.", "erro");
        }
    }
}

window.processarTrocaSenha = processarTrocaSenha;

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

function showView(viewId) {
    if (!viewId) {
        viewId = 'view-crossfit-lobby';
    }

    const modalAvisoGlobal = document.getElementById('modal-aviso');
    if (modalAvisoGlobal) {
        modalAvisoGlobal.classList.add('hidden');
    }

    const cleanId = viewId.replace('view-', '');
    const viewLogin = document.getElementById('view-login');

    if (cleanId === 'login' || viewId === 'login') {
        if (viewLogin) viewLogin.classList.remove('hidden');
        document.querySelectorAll('section, main, .page-container').forEach(el => {
            if (el.id !== 'view-login') el.classList.add('hidden');
        });
        window.currentView = cleanId;
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        return;
    }

    if (viewLogin) viewLogin.classList.add('hidden');

    // Oculta todas as telas da aplicação de forma segura sem depender de um seletor pai inexistente
    document.querySelectorAll('section, main, .page-container').forEach(tela => {
        if (tela.id && tela.id !== 'view-login') {
            tela.classList.add('hidden');
        }
    });

    // Mapeamento assertivo baseado nos IDs reais
    let viewAlvo = document.getElementById(viewId) || document.getElementById(`view-${viewId}`);
    
    if (!viewAlvo) {
        if (cleanId === 'perfil' || viewId === 'perfil') {
            viewAlvo = document.getElementById('view-perfil') || document.getElementById('perfil');
        } else if (cleanId === 'crossfit' || cleanId === 'crossfit-lobby' || viewId === 'crossfit-lobby') {
            viewAlvo = document.getElementById('view-crossfit-lobby') || document.getElementById('crossfit-lobby') || document.getElementById('crossfit');
        } else {
            viewAlvo = document.getElementById(viewId) || 
                       document.getElementById(`view-${cleanId}`) || 
                       document.getElementById(cleanId) ||
                       document.getElementById(`crossfit-${cleanId}`);
        }
    }

    // Fallback de segurança para nunca deixar em branco
    if (!viewAlvo) {
        viewAlvo = document.getElementById('view-crossfit-lobby') || document.getElementById('view-perfil');
    }

    if (viewAlvo) {
        viewAlvo.classList.remove('hidden');
    }

    // Callbacks de inicialização de dados
    if (cleanId === 'planilhas' && typeof renderizarFichas === 'function') {
        renderizarFichas();
    } else if (cleanId === 'lobby' && typeof renderizarFichas === 'function') {
        renderizarFichas();
    } else if ((cleanId === 'consulta' || cleanId === 'consulta-geral') && typeof renderizarFichasConsulta === 'function') {
        renderizarFichasConsulta();
    } else if (cleanId === 'calendario' && typeof renderizarPaginaCronograma === 'function') {
        renderizarPaginaCronograma();
    } else if (cleanId === 'perfil') {
        if (typeof carregarDadosPerfil === 'function') carregarDadosPerfil();
        if (typeof renderizarPerfil === 'function') renderizarPerfil();
    } else if (cleanId.includes('crossfit')) {
        if (cleanId === 'crossfit-record-hub' && typeof atualizarListaRecordsCF === 'function') {
            atualizarListaRecordsCF();
        } else if (cleanId === 'crossfit-benchmark-hub' && typeof atualizarListaBenchmarksCF === 'function') {
            atualizarListaBenchmarksCF();
        } else if (cleanId === 'crossfit-gymnastic' && typeof atualizarListaRecordsCF === 'function') {
            atualizarListaRecordsCF('gymnastic');
        } else if (cleanId === 'crossfit-endurance' && typeof atualizarListaRecordsCF === 'function') {
            atualizarListaRecordsCF('endurance');
        }
    }

    window.currentView = cleanId;
    
    setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }, 10);
}

window.showView = showView;
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-aviso');
    if (modal) {
        modal.remove();
    }
});

window.toggleAuthTab = function(tab) {
    const formLogin = document.getElementById('form-login');
    const formCadastro = document.getElementById('form-cadastro');
    const btnTabLogin = document.getElementById('btn-tab-login');
    const btnTabCadastro = document.getElementById('btn-tab-cadastro');
    const tabSystem = document.getElementById('auth-tab-selector');

    const inputLoginPass = document.getElementById('login-pass');
    const inputRegNome = document.getElementById('reg-nome');
    const inputRegEmail = document.getElementById('reg-email');
    const inputRegTel = document.getElementById('reg-tel');
    const inputRegPass = document.getElementById('reg-pass');
    const inputRegPassConf = document.getElementById('reg-pass-conf');

    if (tab === 'cadastro') {
        if (formLogin) formLogin.classList.add('hidden');
        if (formCadastro) formCadastro.classList.remove('hidden');
        
        if (btnTabLogin) btnTabLogin.classList.remove('active');
        if (btnTabCadastro) btnTabCadastro.classList.add('active');
        if (tabSystem) tabSystem.classList.add('cadastro-active');

        if (inputLoginPass) inputLoginPass.value = '';

    } else {
        if (formCadastro) formCadastro.classList.add('hidden');
        if (formLogin) formLogin.classList.remove('hidden');
        
        if (btnTabCadastro) btnTabCadastro.classList.remove('active');
        if (btnTabLogin) btnTabLogin.classList.add('active');
        if (tabSystem) tabSystem.classList.remove('cadastro-active');

        if (inputRegNome) inputRegNome.value = '';
        if (inputRegEmail) inputRegEmail.value = '';
        if (inputRegTel) inputRegTel.value = '';
        if (inputRegPass) inputRegPass.value = '';
        if (inputRegPassConf) inputRegPassConf.value = '';
    }
};

window.alternarAbaAuth = window.toggleAuthTab;

async function handleCadastro(e) {
    if (e && e.preventDefault) e.preventDefault();

    // Captura os elementos com garantia
    const inputNome = document.getElementById('reg-nome');
    const inputEmail = document.getElementById('reg-email');
    const inputTel = document.getElementById('reg-tel');
    const inputPass = document.getElementById('reg-pass');
    const inputPassConf = document.getElementById('reg-pass-conf');

    const nome = inputNome ? inputNome.value.trim() : "";
    const email = inputEmail ? inputEmail.value.trim() : "";
    const tel = inputTel ? inputTel.value.trim() : "";
    const pass = inputPass ? inputPass.value : "";
    const passConf = inputPassConf ? inputPassConf.value : "";

    // Validações
    if (!nome || !email || !pass) {
        return mostrarAvisoNotificacao("Preencha todos os campos obrigatórios!");
    }

    // RegEx para validar formato de e-mail e evitar erro 400 no Firebase
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return mostrarAvisoNotificacao("Digite um e-mail válido (ex: usuario@email.com)!");
    }

    if (pass !== passConf) {
        return mostrarAvisoNotificacao("As senhas não coincidem!");
    }

    try {
        // Cria a conta
        const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
        const user = userCredential.user;

        // Salva os dados no Firestore
        await db.collection("usuarios").doc(user.uid).set({
            nome: nome,
            email: email,
            tel: tel || "",
            criadoEm: new Date()
        });

        mostrarAvisoNotificacao("CONTA CRIADA COM SUCESSO!", "sucesso");

        if (typeof showView === 'function') {
            showView('lobby');
        }

    } catch (error) {
        console.error("Erro ao cadastrar:", error);
        if (error.code === 'auth/email-already-in-use') {
            mostrarAvisoNotificacao("Este e-mail já está cadastrado!");
        } else if (error.code === 'auth/weak-password') {
            mostrarAvisoNotificacao("A senha deve ter no mínimo 6 caracteres!");
        } else if (error.code === 'auth/invalid-email') {
            mostrarAvisoNotificacao("E-mail com formato inválido!");
        } else {
            mostrarAvisoNotificacao("Erro ao cadastrar. Verifique os dados!");
        }
    }
}

// Torna a função acessível ao onclick do HTML
window.handleCadastro = handleCadastro;

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

async function logout() {
    // Cria o modal de confirmação
    const modalSair = document.createElement('div');
    modalSair.style = `
        position: fixed; 
        top: 0; left: 0; 
        width: 100%; height: 100%;
        background: rgba(2, 6, 23, 0.85); 
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
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

    document.getElementById('btn-confirmar-sair').onclick = async () => {
        try {
            // 1. Limpa identificadores e sessões locais
            localStorage.removeItem('user_email');
            localStorage.removeItem('fitai_session');
            if (typeof usuarioAtualId !== 'undefined') {
                usuarioAtualId = null;
            }

            modalSair.remove();

            // 2. Desconecta do Firebase (O onAuthStateChanged assume daqui e redireciona para o login)
            if (typeof auth !== 'undefined' && auth) {
                await auth.signOut();
            } else if (window.auth) {
                await window.auth.signOut();
            }
        } catch (error) {
            console.error("Erro ao encerrar sessão no Firebase:", error);
            modalSair.remove();
        }
    };
}

// --- 2. GESTAO RECUPERACAO DE SENHA

function abrirModalEsqueceuSenha() {
    const modal = document.getElementById('modal-esqueceu-senha');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    } else {
        // Cria dinamicamente caso o modal ainda não esteja no HTML
        criarModalEsqueceuSenhaDinamico();
    }
}
window.abrirModalEsqueceuSenha = abrirModalEsqueceuSenha;

function fecharModalEsqueceuSenha() {
    const modal = document.getElementById('modal-esqueceu-senha');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}
window.fecharModalEsqueceuSenha = fecharModalEsqueceuSenha;

// Variável para gerenciar o estado da recuperação
let fluxoRecuperacaoSenha = null;

function criarModalEsqueceuSenhaDinamico() {
    const existente = document.getElementById('modal-esqueceu-senha');
    if (existente) existente.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-esqueceu-senha';
    modal.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(2, 6, 23, 0.85); backdrop-filter: blur(12px);
        display: flex; align-items: center; justify-content: center;
        z-index: 100000; padding: 20px; display: flex;
    `;

    modal.innerHTML = `
        <div class="glass-panel" style="max-width: 380px; width: 100%; padding: 30px; text-align: center; border: 1px solid rgba(255,255,255,0.1); background: #0f172a; border-radius: 28px; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
            <h3 class="italic-bold" style="color: white; margin-bottom: 10px; font-size: 1.2rem;">RECUPERAR SENHA</h3>
            <p style="color: #94a3b8; margin-bottom: 20px; font-size: 13px;">Digite seu e-mail cadastrado para receber o código de verificação:</p>
            
            <div id="pass-step-1">
                <input type="email" id="recup-email-input" placeholder="seu-email@exemplo.com" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: white; margin-bottom: 15px; font-size: 14px; box-sizing: border-box;">
                <div style="display: flex; gap: 10px;">
                    <button onclick="fecharModalEsqueceuSenha()" style="flex: 1; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 12px; border-radius: 12px; font-weight: bold; cursor: pointer;">CANCELAR</button>
                    <button onclick="solicitarCodigoRecuperacao()" style="flex: 1; background: #3b82f6; color: white; border: none; padding: 12px; border-radius: 12px; font-weight: bold; cursor: pointer;">AVANÇAR</button>
                </div>
            </div>

            <div id="pass-step-2" style="display: none;">
                <p id="recup-canal-info" style="color: #3b82f6; font-size: 12px; margin-bottom: 15px; font-weight: bold;"></p>
                <input type="text" id="recup-codigo-input" placeholder="Digite o código de 6 dígitos" maxlength="6" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: white; margin-bottom: 15px; font-size: 16px; text-align: center; letter-spacing: 3px; box-sizing: border-box;">
                <button onclick="validarCodigoRecuperacao()" style="width: 100%; background: #22c55e; color: white; border: none; padding: 12px; border-radius: 12px; font-weight: bold; cursor: pointer; margin-bottom: 10px;">VALIDAR CÓDIGO</button>
            </div>

            <div id="pass-step-3" style="display: none;">
                <input type="password" id="recup-nova-senha" placeholder="Nova senha (mín. 6 caracteres)" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: white; margin-bottom: 10px; font-size: 14px; box-sizing: border-box;">
                <input type="password" id="recup-confirma-senha" placeholder="Confirme a nova senha" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: white; margin-bottom: 15px; font-size: 14px; box-sizing: border-box;">
                <button onclick="concluirRedefinicaoSenha()" style="width: 100%; background: #3b82f6; color: white; border: none; padding: 12px; border-radius: 12px; font-weight: bold; cursor: pointer;">REDEFINIR SENHA</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function solicitarCodigoRecuperacao() {
    const email = document.getElementById('recup-email-input').value.trim();
    if (!email) {
        mostrarAvisoNotificacao("Digite o seu e-mail de login!", "erro");
        return;
    }

    // Gera um código OTP simulado de 6 dígitos
    const codigoGerado = Math.floor(100000 + Math.random() * 900000).toString();
    fluxoRecuperacaoSenha = { email: email, codigo: codigoGerado };

    // Como estamos rodando em WebApp, exibimos o token simulado de forma amigável ou via Firebase se integrado
    console.log("Código de recuperação gerado para " + email + ": " + codigoGerado);
    
    document.getElementById('pass-step-1').style.display = 'none';
    document.getElementById('pass-step-2').style.display = 'block';
    document.getElementById('recup-canal-info').innerText = `Enviamos um código de verificação para o e-mail: ${email} (Simulação OTP: ${codigoGerado})`;
    
    mostrarAvisoNotificacao("Código gerado com sucesso!", "sucesso");
}

function validarCodigoRecuperacao() {
    const codigoDigitado = document.getElementById('recup-codigo-input').value.trim();
    if (!fluxoRecuperacaoSenha || codigoDigitado !== fluxoRecuperacaoSenha.codigo) {
        mostrarAvisoNotificacao("Código de verificação incorreto!", "erro");
        return;
    }

    document.getElementById('pass-step-2').style.display = 'none';
    document.getElementById('pass-step-3').style.display = 'block';
    mostrarAvisoNotificacao("Código validado com sucesso!", "sucesso");
}

async function concluirRedefinicaoSenha() {
    const novaSenha = document.getElementById('recup-nova-senha').value;
    const confirmaSenha = document.getElementById('recup-confirma-senha').value;

    if (!novaSenha || novaSenha.length < 6) {
        mostrarAvisoNotificacao("A nova senha deve ter no mínimo 6 caracteres!", "erro");
        return;
    }

    if (novaSenha !== confirmaSenha) {
        mostrarAvisoNotificacao("As senhas não coincidem!", "erro");
        return;
    }

    try {
        // Utiliza o recurso nativo do Firebase para enviar o link de reset ou atualizar diretamente se houver permissão
        if (typeof auth !== 'undefined' && auth) {
            await auth.sendPasswordResetEmail(fluxoRecuperacaoSenha.email);
            mostrarAvisoNotificacao("Instruções de redefinição enviadas para o e-mail!", "sucesso");
        } else {
            mostrarAvisoNotificacao("Senha redefinida com sucesso!", "sucesso");
        }

        fecharModalEsqueceuSenha();
    } catch (error) {
        console.error("Erro ao redefinir senha:", error);
        mostrarAvisoNotificacao("Erro ao processar solicitação. Tente novamente.", "erro");
    }
}

// --- 3. PAGINA DE TREINOS E EXERCICIOS ---

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

    if (!bancoDeDados || !bancoDeDados.fichas) {
        bancoDeDados = { fichas: {} };
    }

    const keys = Object.keys(bancoDeDados.fichas);
    if (keys.length === 0) {
        container.innerHTML += `<p style="color: gray; text-align: center; margin-top: 20px;">Nenhuma ficha criada.</p>`;
        return;
    }

    keys.forEach(nome => {
        const exerciciosDaFicha = bancoDeDados.fichas[nome];
        const totalExercicios = Array.isArray(exerciciosDaFicha) ? exerciciosDaFicha.length : 0;
        
        container.innerHTML += `
            <div class="ficha-item" onclick="abrirFicha('${nome}')" style="cursor: pointer;">
                <div class="treino-info">
                    <h4 class="italic-bold" style="color:white; text-transform:uppercase;">${nome}</h4>
                    <p style="font-size:10px; color:gray;">${totalExercicios} Exercícios</p>
                </div>
                <button onclick="event.stopPropagation(); confirmarAcaoOriginal('EXCLUIR FICHA?', 'Deseja remover toda a ficha ${nome}?', () => excluirFicha('${nome}'))" class="btn-action btn-delete-action">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>`;
    });
}

async function criarNovaFicha() {
    solicitarNomeFichaCustom(async (nome) => {
        if (!bancoDeDados.fichas) bancoDeDados.fichas = {};

        if (nome && !bancoDeDados.fichas[nome]) {
            bancoDeDados.fichas[nome] = [];
            
            await salvarBanco();
            
            if (typeof renderizarFichas === 'function') renderizarFichas();
            if (typeof renderizarFichasConsulta === 'function') renderizarFichasConsulta();

            mostrarAviso(`Treino ${nome} criado com sucesso!`);
        } else if (bancoDeDados.fichas[nome]) {
            mostrarAviso("Este nome de treino já existe.");
        }
    });
}

async function carregarBancoDoFirebase() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const docRef = await db.collection('usuarios').doc(user.uid).get();
        if (docRef.exists) {
            const dadosDoBanco = docRef.data().bancoDeDados;
            if (dadosDoBanco) {
                bancoDeDados = dadosDoBanco;
                if (!bancoDeDados.fichas) bancoDeDados.fichas = {};
                
                if (typeof renderizarFichas === 'function') renderizarFichas();
                if (typeof renderizarFichasConsulta === 'function') renderizarFichasConsulta();
            }
        }
    } catch (error) {
        console.error("Erro ao carregar dados do Firebase:", error);
    }
}

async function salvarBanco() {
    const user = auth.currentUser;
    if (!user) {
        console.warn("Usuário não autenticado. Impossível salvar no Firebase.");
        return;
    }

    try {
        await db.collection('usuarios').doc(user.uid).set({
            bancoDeDados: bancoDeDados
        }, { merge: true });
        console.log("Banco de dados sincronizado com o Firebase com sucesso!");
    } catch (error) {
        console.error("Erro ao salvar no Firebase:", error);
        mostrarAviso("Erro ao salvar dados na nuvem.");
    }
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

    document.getElementById('btn-cancelar-nome').onclick = () => modalInput.remove();

    document.getElementById('btn-confirmar-nome').onclick = () => {
        const nome = inputField.value.trim().toUpperCase();
        if (nome) {
            callback(nome);
            modalInput.remove();
        } else {
            inputField.style.borderColor = "#ef4444";
        }
    };

    inputField.onkeydown = (e) => {
        if (e.key === 'Enter') document.getElementById('btn-confirmar-nome').click();
    };
}

function abrirFicha(nome) {
    fichaAtivaNoMomento = nome;
    fichaAtiva = nome;
    showView('consulta'); // ou a view de detalhes/edição
    
    const titulo = document.getElementById('titulo-consulta');
    if(titulo) titulo.innerText = nome.toUpperCase();
    
    // CORREÇÃO: Garante que os exercícios salvos aparecem na hora que abre a ficha
    renderizarResumoFicha(nome);
    
    if (typeof renderizarLogTreino === 'function') {
        renderizarLogTreino();
    }
}

function voltarParaFichas() {
    // Garante que a lista de treinos seja renderizada com os dados atualizados antes de exibir
    if (typeof renderizarFichas === 'function') {
        renderizarFichas();
    }
    showView('fichas'); // Altere para o nome correto da view de listagem de fichas se necessário
}

function mascaraTempo(input) {
    let v = input.value.replace(/\D/g, ''); 
    if (v.length > 6) v = v.slice(0, 6); 

    if (v.length >= 5) {
        v = v.replace(/^(\d{2})(\d{2})(\d{2}).*/, '$1:$2:$3');
    } else if (v.length >= 3) {
        v = v.replace(/^(\d{2})(\d{2}).*/, '$1:$2');
    }
    input.value = v;
}

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

async function excluirFicha(nome) {
    if (bancoDeDados.fichas && bancoDeDados.fichas[nome]) {
        delete bancoDeDados.fichas[nome];
        await salvarBanco();
       
        if (typeof renderizarFichas === 'function') renderizarFichas();
        if (typeof renderizarFichasConsulta === 'function') renderizarFichasConsulta();
       
        mostrarAviso("Ficha excluída com sucesso!");
    } else {
        console.error("Ficha não encontrada para exclusão:", nome);
    }
}

// XXXXXXXXX fim das funções da pagina registro de treinos XXXXXXXXXXXXXX

// Inicio das functions da pagina de consulta treinos 

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

    let htmlGerado = "";

    if (!bancoDeDados || !bancoDeDados.fichas) return;

    Object.keys(bancoDeDados.fichas).forEach(nome => {
        const exerciciosDaFicha = bancoDeDados.fichas[nome];
        const qtdExercicios = Array.isArray(exerciciosDaFicha) ? exerciciosDaFicha.length : 0;

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
    const historicoTempos = JSON.parse(localStorage.getItem('assistfit_historico_cronometros')) || {};
    
    containerDetalhes.innerHTML = exercicios.map(ex => {
        const infoEsquerda = ex.tipo === 'tempo'
            ? `<p style="color:#10b981; font-weight:900; margin:0;">${formatarTempoParaExibicao(ex.tempo)}</p>`
            : `<p style="color:white; font-weight:900; margin:0;">${ex.series}x${ex.reps} <span style="color:gray; font-size:10px;">${ex.carga}KG</span></p>`;

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
        clearInterval(cronometrosAtivos[id]);

        delete cronometrosAtivos[id];
        localStorage.removeItem(`timer_start_${id}`);
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
        } 
        if (display) display.innerText = "00:00.00";
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

function verDetalhesTreino(nomeTreino) {
    document.getElementById('btn-sair-consulta').classList.add('hidden');
    document.getElementById('btn-voltar-consulta').classList.remove('hidden');
    document.getElementById('cabecalho-consulta').innerText = nomeTreino;
    document.getElementById('lista-nomes-treinos').classList.add('hidden');
    document.getElementById('detalhes-treino-consulta').classList.remove('hidden');
}

function voltarListaConsulta() {
    document.getElementById('btn-sair-consulta').classList.remove('hidden');
    document.getElementById('btn-voltar-consulta').classList.add('hidden');
    document.getElementById('cabecalho-consulta').innerText = "Consultar Treinos";
    document.getElementById('lista-nomes-treinos').classList.remove('hidden');
    document.getElementById('detalhes-treino-consulta').classList.add('hidden');
    renderizarFichasConsulta();
}

function atualizarListaExercicios() {
    const campoGrupo = document.getElementById('select-grupo-sub');
    if (!campoGrupo) return;

    const grupo = campoGrupo.value;
    const selectEx = document.getElementById('select-exercicio');
    const camposForca = document.getElementById('campos-forca');
    const camposCardio = document.getElementById('campos-cardio');

    if (!selectEx) return;
    if (!grupo) {
        selectEx.innerHTML = '<option value="">Selecione o Exercício...</option>';
        return;
    }

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

// ATENÇÃO: Modificada para 'async' para aguardar o salvamento na nuvem via await salvarBanco()
async function adicionarExercicio() {
    const ativa = fichaAtivaNoMomento || fichaAtiva;
    if (!ativa) return mostrarAviso("Selecione uma ficha!");

    const campoGrupo = document.getElementById('select-grupo-sub');
    const campoExercicio = document.getElementById('select-exercicio');
    const campoSeries = document.getElementById('series-ex');
    const campoReps = document.getElementById('reps-ex');
    const campoCarga = document.getElementById('carga-ex');
    const campoTempo = document.getElementById('tempo-ex');

    if (!campoGrupo || !campoExercicio) return;

    const grupo = campoGrupo.value;
    const exercicio = campoExercicio.value;

    if (!grupo || !exercicio) {
        mostrarAviso("Por favor, selecione o grupo e o exercício.");
        return;
    }

    const isCardio = (grupo === "Cardio & Aeróbico");
    const seriesValue = campoSeries ? campoSeries.value : "";
    const repsValue = campoReps ? campoReps.value : "";
    const tempoValue = campoTempo ? campoTempo.value : "";

    if (isCardio) {
        if (!tempoValue) return mostrarAviso("Informe o tempo do cardio!");
    } else {
        if (!seriesValue || !repsValue) return mostrarAviso("Preencha séries e repetições!");
    }

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

    if (!bancoDeDados.fichas[ativa]) {
        bancoDeDados.fichas[ativa] = [];
    }
    bancoDeDados.fichas[ativa].unshift(novo);
    
    // 1. Aguarda o salvamento no Firebase
    await salvarBanco();
    
    // 2. ATUALIZAÇÃO DINÂMICA: Renderiza a lista de fichas (atualiza o contador imediatamente)
    if (typeof renderizarFichas === 'function') {
        renderizarFichas();
    }
    
    // 3. Atualiza os detalhes da tela de consulta e logs
    if (typeof renderizarLogTreino === 'function') {
        renderizarLogTreino();
    }
    renderizarResumoFicha(ativa);
    if (typeof renderizarFichasConsulta === 'function') {
        renderizarFichasConsulta();
    }

    // Limpa campos
    if (campoSeries) campoSeries.value = "";
    if (campoReps) campoReps.value = "";
    if (campoCarga) campoCarga.value = "";
    if (campoTempo) campoTempo.value = "";
    
    mostrarAviso("Exercício adicionado com sucesso!");
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

// Fuynções da pagina cronograma

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

window.addEventListener('DOMContentLoaded', () => {
    const session = localStorage.getItem('fitai_session');
    if (session) showView('lobby'); else showView('login');
    
    atualizarListaExercicios(); 
    gerarCalendario();
});


// Fim da pagina cronograma
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
 
// Ouvinte reativo Listener global para SPA WebApp

window.addEventListener('fitaiPerfilAtualizado', (e) => {
    const novoNome = e.detail ? e.detail.nome : null;
    if (novoNome) {
        nomeUsuarioAtual = novoNome.trim().split(" ")[0].toUpperCase();
        localStorage.setItem('user_nome', nomeUsuarioAtual);
    }
    document.querySelectorAll('.usuario-nome-display, [data-user-name]').forEach(el => {
        if (novoNome) el.innerText = novoNome;
    });

    // RECARREGA O FEED DO BANCO/CACHE PARA ATUALIZAR TODOS OS POSTS INSTANTANEAMENTE
    if (typeof carregarFeedDoBanco === "function") {
        carregarFeedDoBanco();
    } else if (typeof atualizarFeedUI === "function") {
        atualizarFeedUI();
    }
});

window.addEventListener('fitaiFotoAtualizada', (e) => {
    const novaFoto = e.detail ? e.detail.foto : localStorage.getItem(`user_foto_${auth.currentUser?.uid}`);
    if (novaFoto) {
        fotoUsuarioAtual = novaFoto;
    }
    
    const imgHtmlPequeno = novaFoto ? `<img src="${novaFoto}" style="width:100%; height:100%; object-fit:cover; border-radius: 50%;">` : '';
    
    const navIcon = document.getElementById('nav-perfil-icon');
    if (navIcon && imgHtmlPequeno) navIcon.innerHTML = imgHtmlPequeno;

    document.querySelectorAll('.avatar-usuario-global').forEach(el => {
        if (imgHtmlPequeno) el.innerHTML = imgHtmlPequeno;
    });

    // RECARREGA O FEED PARA ATUALIZAR AS FOTOS DOS POSTS INSTANTANEAMENTE
    if (typeof carregarFeedDoBanco === "function") {
        carregarFeedDoBanco();
    } else if (typeof atualizarFeedUI === "function") {
        atualizarFeedUI();
    }
});


// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Funções pagina blog de evolução  xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx



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
                    <h2 class="italic-bold" style="color: white; margin: 0; font-size: 1.1rem; letter-spacing: 2px; text-transform: uppercase;">Meu Feed</h2>
                    <p style="color: #3b82f6; font-size: 9px; margin: 0; font-weight: 900; letter-spacing: 1px;">EVOLUÇÃO PRO</p>
                </div>
            </div>
            
            <!-- Composer Unificado -->
            <div class="glass-panel" style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 20px; margin-bottom: 25px; border: 1px solid rgba(59,130,246,0.3); box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                <textarea id="post-texto" placeholder="Como foi o treino hoje? Relate sua evolução..." style="width: 100%; background: transparent; border: none; color: white; font-family: inherit; resize: none; outline: none; margin-bottom: 10px; font-size: 14px; min-height: 70px;"></textarea>
                
                <div id="preview-midia" style="margin-bottom: 12px; display: flex; flex-direction: column; gap: 10px;"></div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px; margin-top: 5px;">
                    <div style="display: flex; gap: 10px;">
                        <label style="cursor: pointer; background: rgba(255,255,255,0.05); width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1); transition: 0.3s;">
                            <input type="file" id="input-media" accept="image/*,video/*,audio/*" onchange="previewMidia(event)" style="display: none;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        </label>
                        <button id="btn-mic" onclick="toggleGravacao()" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); width: 40px; height: 40px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                        </button>
                    </div>
                    <button onclick="postarNoFeed()" style="background: #3b82f6; color: white; border: none; padding: 10px 24px; border-radius: 12px; font-weight: 900; font-size: 13px; cursor: pointer; box-shadow: 0 4px 15px rgba(59,130,246,0.4); text-transform: uppercase; letter-spacing: 1px;">POSTAR</button>
                </div>
            </div>
            
            <div id="feed-container" style="display: flex; flex-direction: column; gap: 15px;"></div>
        </div>
    `;

    // Carrega o feed inicialmente
    atualizarFeedUI();

    // --- ESCUTA REATIVA PARA O WEBAPP ---
    // Se o usuário estiver com o blog aberto ou voltar para ele, atualiza automaticamente ao disparar os eventos
    if (!window._blogListenersAtivados) {
        window._blogListenersAtivados = true; // Evita duplicação de listeners globais
        
        window.addEventListener('fitaiPerfilAtualizado', () => {
            if (document.getElementById('view-blog') && document.getElementById('view-blog').style.display !== 'none') {
                atualizarFeedUI();
            }
        });

        window.addEventListener('fitaiFotoAtualizada', () => {
            if (document.getElementById('view-blog') && document.getElementById('view-blog').style.display !== 'none') {
                atualizarFeedUI();
            }
        });
    }
}

function previewMidia(event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById('preview-midia') || document.getElementById('preview-container');
    
    if (!file) {
        midiaAnexada = null;
        if (previewContainer) previewContainer.innerHTML = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64Data = e.target.result;
        let tipoMidia = 'foto';
        if (file.type.startsWith('video/')) tipoMidia = 'video';
        if (file.type.startsWith('audio/')) tipoMidia = 'audio';
        
        midiaAnexada = { tipo: tipoMidia, data: base64Data };
        
        if (previewContainer) {
            if (tipoMidia === 'foto') {
                previewContainer.innerHTML = `
                    <div style="position: relative; display: inline-block; width: 100%;">
                        <img src="${base64Data}" style="width: 100%; max-height: 220px; object-fit: cover; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
                        <button onclick="removerMidia()" style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-weight: bold;">×</button>
                    </div>`;
            } else if (tipoMidia === 'video') {
                previewContainer.innerHTML = `
                    <div style="position: relative; display: inline-block; width: 100%;">
                        <video src="${base64Data}" controls style="width: 100%; max-height: 220px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);"></video>
                        <button onclick="removerMidia()" style="position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; cursor: pointer; font-weight: bold;">×</button>
                    </div>`;
            } else {
                previewContainer.innerHTML = `
                    <div style="position: relative; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 10px 14px; border-radius: 10px;">
                        <span style="font-size: 13px; color: #ccc;">🎵 Áudio Anexado Pronto</span>
                        <button onclick="removerMidia()" style="background: rgba(255,0,0,0.2); color: #ff4d4d; border: none; border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 12px;">Remover</button>
                    </div>`;
            }
        }
    };
    reader.readAsDataURL(file);
}

function removerMidia() {
    midiaAnexada = null;
    const previewContainer = document.getElementById('preview-midia') || document.getElementById('preview-container');
    const inputMedia = document.getElementById('input-media');
    if (previewContainer) previewContainer.innerHTML = "";
    if (inputMedia) inputMedia.value = "";
}

async function postarNoFeed() {
    const user = auth.currentUser;
    if (!user) {
        mostrarAviso("Você precisa estar logado para postar!");
        return;
    }

    // ======= SUBSTITUA A LINHA ANTIGA POR ESTAS TRÊS ABAIXO =======
    const dadosLocais = JSON.parse(localStorage.getItem(`fitai_user_data_${user.uid}`)) || {};
    const nomeBruto = dadosLocais.nome || localStorage.getItem('user_nome') || (typeof window.nomeUsuarioAtual !== 'undefined' ? window.nomeUsuarioAtual : "ATLETA");
    const nomeUsuarioAtual = nomeBruto.trim().split(" ")[0].toUpperCase();
    // ===============================================================

    const inputTexto = document.getElementById('texto-evolucao');
    const texto = inputTexto ? inputTexto.value.trim() : "";
    
    const temTexto = texto.length > 0;
    const temMidia = midiaAnexada !== null && midiaAnexada !== undefined;

    if (!temTexto && !temMidia) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        mostrarAviso("O post não pode estar vazio!");
        return;
    }

    // Pega a foto mais atualizada do localStorage para garantir sincronia no post
    const fotoPerfilAtual = localStorage.getItem(`user_foto_${user.uid}`) || localStorage.getItem('user_foto') || user.photoURL || null;

    const novoPost = {
        uid: user.uid,
        nomeAtleta: nomeUsuarioAtual, 
        fotoPerfil: fotoPerfilAtual, 
        texto: texto,
        midia: temMidia ? { tipo: midiaAnexada.tipo, data: midiaAnexada.data } : null,
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('feed').add(novoPost);
        
        if (inputTexto) inputTexto.value = "";
        removerMidia();

        await carregarFeedDoBanco();
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        mostrarAviso("Postagem realizada com sucesso!");
    } catch (error) {
        console.error("Erro ao publicar no feed:", error);
        mostrarAviso("Erro ao salvar a postagem.");
    }
}

window.postarNoFeed = postarNoFeed;


async function carregarFeedDoBanco() {
    const user = auth.currentUser;
    if (!user) return; 

    // 1. CARREGAMENTO INSTANTÂNEO VIA LOCALSTORAGE (Zero delay para a miniatura)
    const fotoLocalStorage = localStorage.getItem(`user_foto_${user.uid}`) || localStorage.getItem('user_foto');
    const dadosLocais = JSON.parse(localStorage.getItem(`fitai_user_data_${user.uid}`)) || {};
    const nomeLocalStorage = dadosLocais.nome || localStorage.getItem('user_nome');
    
    if (fotoLocalStorage) fotoUsuarioAtual = fotoLocalStorage;
    if (nomeLocalStorage) nomeUsuarioAtual = nomeLocalStorage.trim().split(" ")[0].toUpperCase();

    // Atualiza a interface imediatamente com o cache local
    if (typeof atualizarFeedUI === "function") {
        atualizarFeedUI();
    }

    // 2. BUSCA NO FIRESTORE EM SEGUNDO PLANO (Apenas para sincronizar se mudou em outro lugar)
    try {
        const userDoc = await db.collection('usuarios').doc(user.uid).get();
        if (userDoc.exists) {
            const dados = userDoc.data();
            const nomeCompleto = dados.nome || dados.nomeCompleto || dados.name || user.displayName || "";
            if (nomeCompleto) {
                nomeUsuarioAtual = nomeCompleto.trim().split(" ")[0].toUpperCase();
                localStorage.setItem('user_nome', nomeUsuarioAtual);
            }

            const fotoFirestore = dados.fotoPerfil || dados.foto || dados.avatar || dados.urlFoto || null;
            if (fotoFirestore) {
                fotoUsuarioAtual = fotoFirestore;
                localStorage.setItem(`user_foto_${user.uid}`, fotoFirestore);
                localStorage.setItem('user_foto', fotoFirestore);
            }
        }
    } catch (error) {
        console.warn("Aviso: Sincronização em segundo plano indisponível.", error);
    }

    // 3. BUSCA OS POSTS DO FEED NO BANCO
    try {
        const snapshot = await db.collection('feed')
            .where('uid', '==', user.uid)
            .orderBy('criadoEm', 'desc')
            .get();
        
        feedEvolucao = [];
        snapshot.forEach(doc => {
            const postData = doc.data();
            feedEvolucao.push({
                id: doc.id,
                ...postData,
                fotoPerfil: postData.fotoPerfil || fotoUsuarioAtual,
                data: postData.criadoEm && postData.criadoEm.toDate ? postData.criadoEm.toDate().toLocaleString('pt-BR') : "Recentemente"
            });
        });
    } catch (feedError) {
        console.error("Erro ao carregar posts do feed:", feedError);
    }

    if (typeof atualizarFeedUI === "function") {
        atualizarFeedUI();
    }
}


window.carregarFeedDoBanco = carregarFeedDoBanco;


function atualizarFeedUI() {
    const container = document.getElementById('feed-container');
    if (!container) return;

    const user = typeof auth !== 'undefined' && auth.currentUser ? auth.currentUser : null;
    if (!user) return;

    // 1. Captura o nome atualizado do localStorage (igualzinho você já faz)
    const dadosLocais = JSON.parse(localStorage.getItem(`fitai_user_data_${user.uid}`)) || {};
    const nomeSalvo = dadosLocais.nome || user.displayName || "ATLETA";
    const primeiroNome = nomeSalvo.trim().split(" ")[0].toUpperCase();

    // 2. Captura a FOTO atualizada do localStorage do usuário (Chave exata do perfil)
    const fotoPerfilAtual = localStorage.getItem(`user_foto_${user.uid}`) || localStorage.getItem('user_foto') || null;

    const listaPosts = typeof feedEvolucao !== 'undefined' ? feedEvolucao : [];

    container.innerHTML = listaPosts.map(post => {
        let midiaHTML = '';
        if (post.midia) {
            const tipo = typeof post.midia === 'object' ? post.midia.tipo : (post.midia.startsWith('data:video') ? 'video' : (post.midia.startsWith('data:audio') ? 'audio' : 'foto'));
            const urlMidia = typeof post.midia === 'object' ? post.midia.data : post.midia;

            if (tipo === 'foto') {
                midiaHTML = `<div style="width: 100%; border-radius: 14px; overflow: hidden; margin-top: 10px; background: rgba(0,0,0,0.2); position: relative;"><img src="${urlMidia}" style="width: 100%; max-height: 250px; display: block; object-fit: contain;"></div>`;
            } else if (tipo === 'video') {
                midiaHTML = `<div style="width: 100%; border-radius: 14px; overflow: hidden; margin-top: 10px; background: rgba(0,0,0,0.2); position: relative;"><video src="${urlMidia}" controls style="width: 100%; max-height: 250px; display: block;"></video></div>`;
            } else if (tipo === 'audio') {
                midiaHTML = `<div style="width: 100%; border-radius: 14px; margin-top: 10px; background: rgba(255,255,255,0.05); padding: 12px;"><audio src="${urlMidia}" controls style="width: 100%;"></audio></div>`;
            }
        }

        // REGRA DEFINITIVA: Força a foto atual do perfil a dominar todos os posts (igual ao nome)
        const fotoFinal = fotoPerfilAtual;

        return `
            <div class="glass-panel" style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 22px; margin-bottom: 12px; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 38px; height: 38px; border-radius: 10px; background: #3b82f6; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                            ${fotoFinal ? `<img src="${fotoFinal}" style="width:100%; height:100%; object-fit:cover;">` : `<span style="color:white; font-weight:900;">${primeiroNome.charAt(0)}</span>`}
                        </div>
                        <div>
                            <p style="color: white; font-size: 13px; font-weight: 800; margin: 0; text-transform: uppercase;">${primeiroNome}</p>
                            <p style="color: #64748b; font-size: 10px; margin: 0;">${post.data}</p>
                        </div>
                    </div>
                    <button onclick="excluirPost('${post.id}')" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 22px; font-weight: bold;">&times;</button>
                </div>
                ${post.texto ? `<p style="color: white; font-size: 14px; margin-bottom: 12px; line-height: 1.4;">${post.texto}</p>` : ''}
                ${midiaHTML}
            </div>
        `;
    }).join('') || `<p style="color: #64748b; text-align: center; margin-top: 40px; font-size: 13px;">SEM ATIVIDADES</p>`;
}

window.atualizarFeedUI = atualizarFeedUI;

function excluirPost(id) {
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

    document.getElementById('btn-confirmar-exclusao').onclick = async () => {
        try {
            await db.collection('feed').doc(id).delete();
            feedEvolucao = feedEvolucao.filter(p => p.id !== id);
            modalConfirm.remove();
            atualizarFeedUI(); 
            window.scrollTo({ top: 0, behavior: 'smooth' });
            mostrarAviso("Post removido com sucesso.");
        } catch (error) {
            console.error("Erro ao excluir post no banco:", error);
            modalConfirm.remove();
            mostrarAviso("Erro ao excluir. Verifique sua conexão.");
        }
    };
}



// xxxxxxxxxxxxxxxxxxxxxxxxxx Funções página sugestão (Plano B) xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

if (typeof cfIsPaused === 'undefined') {
    window.cfIsPaused = false; 
}

function gerarSugestao(foiDisparadoPeloUsuario = false) {
    const grupoSelect = document.getElementById('select-grupo-sub-ocupado');
    const exOcupadoSelect = document.getElementById('select-ex-ocupado');
    
    const grupo = grupoSelect ? grupoSelect.value : "";
    const exOcupado = exOcupadoSelect ? exOcupadoSelect.value : "";
    
    const resultadoDiv = document.getElementById('resultado-sugestao');
    const loader = document.getElementById('loader-sugestao');
    const conteudo = document.getElementById('conteudo-sugestao');
    const nomeSugestao = document.getElementById('nome-sugestao');

    // BLINDAGEM ABSOLUTA: Se a função rodar de forma fantasma/automática sem clique, ela aborta silenciosamente e NÃO abre o modal
    if (!grupo || !exOcupado) {
        if (foiDisparadoPeloUsuario) {
            mostrarAvisoAparelhoOcupado("Por favor, selecione o grupo muscular e qual aparelho está ocupado para podermos sugerir.");
        }
        return;
    }

    let sugestaoEncontrada = "";

    const dicEquiv = typeof equivalencias !== 'undefined' ? equivalencias : {};
    for (let categoria in dicEquiv) {
        if (dicEquiv[categoria].includes(exOcupado)) {
            const opcoes = dicEquiv[categoria].filter(ex => ex !== exOcupado);
            if (opcoes.length > 0) {
                sugestaoEncontrada = opcoes[Math.floor(Math.random() * opcoes.length)];
                break;
            }
        }
    }

    const dicEx = typeof dicionarioExercicios !== 'undefined' ? dicionarioExercicios : {};
    if (!sugestaoEncontrada) {
        const normalizar = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const grupoBusca = normalizar(grupo);
        const chaveEncontrada = Object.keys(dicEx).find(k => normalizar(k) === grupoBusca);
        const listaGrupo = chaveEncontrada ? dicEx[chaveEncontrada].filter(ex => ex !== exOcupado) : [];
        
        if (listaGrupo.length > 0) {
            sugestaoEncontrada = listaGrupo[Math.floor(Math.random() * listaGrupo.length)];
        }
    }

    if (sugestaoEncontrada) {
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
        }, 750); 

    } else {
        if (foiDisparadoPeloUsuario) {
            mostrarAvisoAparelhoOcupado("Não encontramos uma alternativa para este exercício no momento.");
        }
    }
}

// (Dicionário de exercícios mantido compactado/completo para funcionamento perfeito)

function carregarExerciciosSubOcupado() {
    const selectGrupo = document.getElementById('select-grupo-sub-ocupado');
    const selectEx = document.getElementById('select-ex-ocupado');
    
    if (!selectEx || !selectGrupo) return;

    const grupoSelecionado = selectGrupo.value ? selectGrupo.value.trim() : "";
    selectEx.innerHTML = '<option value="">Qual aparelho está ocupado?</option>';
    
    if (!grupoSelecionado) return;

    const normalizar = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const grupoBusca = normalizar(grupoSelecionado);

    const chaveEncontrada = Object.keys(dicionarioExercicios).find(k => normalizar(k) === grupoBusca);
    const exercicios = chaveEncontrada ? dicionarioExercicios[chaveEncontrada] : [];

    exercicios.forEach(ex => {
        const opt = document.createElement('option');
        opt.value = ex;
        opt.textContent = ex;
        selectEx.appendChild(opt);
    });
}

function mostrarAvisoAparelhoOcupado(mensagem) {
    const textoModal = document.getElementById('texto-modal-aviso');
    const modalAviso = document.getElementById('modal-aviso');
    if (textoModal && modalAviso) {
        textoModal.innerText = mensagem; 
        modalAviso.classList.remove('hidden');
        modalAviso.style.display = 'flex'; // Exibe o modal na tela
    }
}

function fecharModalAviso() {
    console.log("Tentando fechar o modal..."); // Se aparecer no console, o botão está funcionando
    const modalAviso = document.getElementById('modal-aviso');
    if (modalAviso) {
        modalAviso.classList.add('hidden');
        modalAviso.style.setProperty('display', 'none', 'important');
    } else {
        console.error("Elemento #modal-aviso não foi encontrado no DOM!");
    }
}
window.fecharModalAviso = fecharModalAviso;

// Garante que o modal comece oculto assim que o documento carregar
document.addEventListener('DOMContentLoaded', () => {
    const modalAviso = document.getElementById('modal-aviso');
    if (modalAviso) {
        modalAviso.classList.add('hidden');
        modalAviso.style.display = 'none';
    }
});

function gerarSugestaoComModal() {
    gerarSugestao(true);
}

window.gerarSugestao = gerarSugestao;
window.carregarExerciciosSubOcupado = carregarExerciciosSubOcupado;
window.mostrarAvisoAparelhoOcupado = mostrarAvisoAparelhoOcupado;
window.fecharModalAviso = fecharModalAviso;
window.gerarSugestaoComModal = gerarSugestaoComModal;


// xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx Funções timer wods crossfit xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx



function calcularCargasCF() {
    const input = document.getElementById('input-1rm');
    const container = document.getElementById('lista-cargas-cf');
    if (!input || !container) return;
    
    const valorMax = parseFloat(input.value);

    if (!valorMax || valorMax <= 0) {
        container.innerHTML = '<p style="grid-column: span 2; color: var(--text-secondary); text-align: center; font-size: 0.8rem; padding: 40px 0;">Digite um valor...</p>';
        return;
    }

    const porcentagens = [95, 90, 85, 80, 75, 70, 60, 50];
    
    container.innerHTML = porcentagens.map(p => {
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
        if (labelTempo) labelTempo.innerText = "DEFINIR TEMPO (HORAS : MINUTOS : SEGUNDOS)";
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
        if (labelTempo) labelTempo.innerText = "DEFINIR TEMPO (HORAS : MINUTOS : SEGUNDOS)";
    }
    resetarTimerCF();
}

function travarControlesTempo(deveTravar) {
    // Atualizado com os IDs corretos dos novos inputs (horas, minutos e segundos)
    const botoes = ['wod-hours', 'wod-minutes', 'wod-seconds', 'wod-interval-seconds', 'btn-amrap', 'btn-emom'];
    botoes.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = deveTravar;
            el.style.pointerEvents = deveTravar ? "none" : "auto";
            el.style.opacity = deveTravar ? "0.5" : "1";
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
    
    if (btnStart) btnStart.innerHTML = "<span>PAUSAR WOD</span>";
    travarControlesTempo(true);

    let prep = 10;
    if (status) status.innerText = "PREPARAR...";
    if (display) display.style.color = "#ffae00"; 

    cfTimerInterval = setInterval(() => {
        if (prep > 0) {
            tocarBeep(600, 0.1); 
            if (display) display.innerHTML = `00:${prep.toString().padStart(2, '0')}<span style="font-size: 1.5rem; opacity: 0.75; margin-left: 2px;">:00</span>`;
            
            const txtPrep = `PREP ${prep}`;
            atualizarMiniTimerWidget(txtPrep);
            configurarNotificacaoMedia('playing', txtPrep);
            
            prep--;
        } else {
            clearInterval(cfTimerInterval);
            tocarBeep(880, 0.5); 
            cfTempoDecorridoAcumulado = 0;
            cfStartTime = Date.now();
            executarWodReal();
            
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
    
    // Garante que o widget atualize para o estado pausado mesmo fora da aba
    const m = Math.floor(cfTempoDecorridoAcumulado / 60);
    const s = Math.floor(cfTempoDecorridoAcumulado % 60);
    atualizarMiniTimerWidget(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} (Pausado)`);
}

function executarWodReal() {
    const display = document.getElementById('timer-display');
    const status = document.getElementById('status-timer');
    const btnStart = document.getElementById('btn-start-wod');
    
    // Captura Horas, Minutos e Segundos informados pelo usuário
    const hSet = parseInt(document.getElementById('wod-hours').value) || 0;
    const mSet = parseInt(document.getElementById('wod-minutes').value) || 0;
    const sSet = parseInt(document.getElementById('wod-seconds').value) || 0;
    const intervaloTotalSegundos = (hSet * 3600) + (mSet * 60) + sSet;

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

        const absTempo = Math.abs(tempoFinal);
        const hh = Math.floor(absTempo / 3600);
        const mm = Math.floor((absTempo % 3600) / 60);
        const ss = Math.floor(absTempo % 60);
        const ms = Math.floor((absTempo % 1) * 100);
        
        let tempoFormatado = `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
        if (hh > 0) {
            tempoFormatado = `${hh.toString().padStart(2, '0')}:${tempoFormatado}`;
        }
        
        if (display) {
            display.innerHTML = `${tempoFormatado}<span style="font-size: 1.5rem; opacity: 0.75; margin-left: 2px;">:${ms.toString().padStart(2, '0')}</span>`;
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
        display.innerHTML = `00:00<span style="font-size: 1.5rem; opacity: 0.75; margin-left: 2px;">:00</span>`;
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
        display.innerHTML = `00:00<span style="font-size: 1.5rem; opacity: 0.75; margin-left: 2px;">:00</span>`;
        display.style.color = "white";
    }
    if (status) status.innerText = "PRONTO";
    if (btnStart) btnStart.innerHTML = "<span>INICIAR WOD</span>";
}

function pararTimerCF() {
    clearInterval(cfTimerInterval);
    cfTimerInterval = null;
}

// Script responsavel por mover o mini widegt enquanti minizado da pagina timer wods CROSSFIT

const widget = document.getElementById('mini-timer-widget');
let hasMoved = false;
let startX, startY, initialX, initialY;

widget.addEventListener('pointerdown', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
    
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = widget.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    
    widget.setPointerCapture(e.pointerId);
    widget.style.cursor = 'grabbing';
});

widget.addEventListener('pointermove', (e) => {
    if (startX === undefined || startY === undefined) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    // Aumentada a tolerância para evitar falsos positivos ao tentar apenas tocar/clicar
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        hasMoved = true;
    }
    
    if (hasMoved) {
        let newX = initialX + dx;
        let newY = initialY + dy;
        
        const maxX = window.innerWidth - widget.offsetWidth;
        const maxY = window.innerHeight - widget.offsetHeight;
        
        newX = Math.max(10, Math.min(newX, maxX - 10));
        newY = Math.max(10, Math.min(newY, maxY - 10));
        
        widget.style.left = `${newX}px`;
        widget.style.top = `${newY}px`;
        widget.style.bottom = 'auto';
        widget.style.right = 'auto';
    }
});

widget.addEventListener('pointerup', (e) => {
    startX = undefined;
    startY = undefined;
    widget.style.cursor = 'grab';
});

// Função dedicada para controlar o clique sem conflito com o arrasto
function handleWidgetClick(e) {
    if (hasMoved) {
        // Se o usuário arrastou, impede que o clique abra a tela
        e.stopImmediatePropagation();
        hasMoved = false;
        return;
    }
    // Se foi apenas um toque/clique limpo, abre a tela de timers
    showView('crossfit-timers');
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

    // Se houver contagem ativa/pausada E o usuário sair da tela de timers
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
    if (iconPause && iconPlay) {
        if (estaPausado) {
            iconPause.style.display = "none";
            iconPlay.style.display = "block";
        } else {
            iconPause.style.display = "block";
            iconPlay.style.display = "none";
        }
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

// Funções área cross fit 

// Biblioteca Estática de WODs Históricos e Oficiais
const bibliotecaDeBenchmarks = {
    'girls': [
        { detalhe: '21-15-9 Repetições por tempo de:<br>• Thrusters<br>• Pull-ups<br>• Chest-to-Bar Pull-ups<br>• Bar Muscle-ups' },
        { detalhe: 'AMRAP de 20 Minutos de:<br>• 5 Pull-ups<br>• 10 Push-ups<br>• 15 Air Squats<br>• 20 Walking Lunges<br>• 25 Double Unders' },
        { detalhe: '30 Repetições por tempo de:<br>• Clean & Jerk<br>• Power Clean<br>• Squat Clean<br>• Split Jerk' },
        { detalhe: '3 Rounds por tempo de:<br>• 400m Corrida<br>• 21 KB Swings<br>• 12 Pull-ups<br>• 15 Wall Balls<br>• 30 Double Unders' },
        { detalhe: '21-15-9 Repetições por tempo de:<br>• Deadlifts<br>• Handstand Push-ups<br>• Strict HSPU<br>• Deficit HSPU' },
        { detalhe: '150 Repetições por tempo de:<br>• Wall Ball Shots<br>• Target Burpees<br>• Box Jump Overs' }
    ],
    'heroes': [
        { detalhe: 'Por tempo (com colete opcional):<br>• 1 Milha de corrida<br>• 100 Pull-ups<br>• 200 Push-ups<br>• 300 Air Squats<br>• 1 Milha de corrida<br>• Chest-to-Bar Pull-ups<br>• Hand Release Push-ups' },
        { detalhe: '5 Rounds por tempo de:<br>• 12 Deadlifts<br>• 9 Hang Power Cleans<br>• 6 Push Jerks<br>• Clean & Jerk<br>• Power Snatches' },
        { detalhe: '3 Rounds por tempo de:<br>• 30 Squat Cleans<br>• 30 Pull-ups<br>• 800m Corrida<br>• Overhead Squats<br>• Bar Muscle-ups' },
        { detalhe: 'Por tempo:<br>• 400m Corrida<br>• 30 Over-the-bar Burpees<br>• 30 Deadlifts<br>• 400m Corrida de Carga' },
        { detalhe: 'Por tempo:<br>• 800m Corrida<br>• 50 Pull-ups<br>• 100 Push-ups<br>• 150 Air Squats<br>• 800m Corrida' }
    ],
    'notables': [
        { detalhe: 'Por tempo (50 repetições de cada):<br>• Box Jumps<br>• Jumping Pull-ups<br>• KB Swings<br>• Walking Lunges<br>• Knees-to-Elbows<br>• Push Press<br>• Back Extensions<br>• Wall Balls<br>• Burpees<br>• Double Unders<br>• Toes-to-Bar<br>• Thrusters' },
        { detalhe: '3 Rounds (1 min por estação para repetições máximas):<br>• Wall Balls<br>• Sumo Deadlift High-Pull<br>• Box Jumps<br>• Push Press<br>• Remo (Calorias)<br>• Assault Bike (Calorias)' },
        { detalhe: 'EMOM de 30 Minutos:<br>• 5 Pull-ups<br>• 10 Push-ups<br>• 15 Air Squats<br>• Bar Muscle-ups<br>• Handstand Push-ups' }
    ],
    'open': [
        { detalhe: 'Por tempo (Time Cap 15 Minutos):<br>• 21 Dumbbell Snatches<br>• 21 Lateral Burpees Over Dumbbell<br>• 21 Dumbbell Clean and Jerk<br>• 15-9 Sequências de repetições completas' },
        { detalhe: 'AMRAP de 14 Minutos de:<br>• 60 Calorias de Remo<br>• 50 Toes-to-bars<br>• 40 Wall-ball shots<br>• 30 Cleans<br>• 20 Muscle-ups<br>• Ring Muscle-ups' },
        { detalhe: 'AMRAP de 15 Minutos de:<br>• 3 Wall Walks<br>• 12 Toes-to-bars<br>• 15 Box Jump Overs' }
    ]
};

// ==========================================
// SEÇÃO DE RECORDE PESSOAL (PRs)
// ==========================================

let cfCategoriaAtual = '';

function abrirRecordsHub(tipo) {
    // ATUALIZA A CATEGORIA GLOBAL AQUI PARA EVITAR MISTURA ENTRE AS PÁGINAS
    cfCategoriaAtual = tipo;

    // Dicionário de títulos com os SVGs padronizados em branco platinado
    const titulosRecords = {
        'barbell': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M6 12h12M6 7v10M18 7v10M3 9h3v6H3zm15 0h3v6h-3z"></path></svg> Barbell Records',
        'complex': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Complex LPO',
        'gymnastic': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M18 21a6 6 0 0 0-12 0"></path><circle cx="12" cy="10" r="4"></circle><path d="M12 2v2"></path></svg> Gymnastic Records',
        'endurance': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M18 8h4M6 8h4M2 8h4M13 2.5l-3 6.5h5l-4 7.5"></path></svg> Endurance Records'
    };

    // 1. Abre a view padrão de recordes
    if (typeof showView === 'function') {
        showView('crossfit-record-hub');
    }

    // 2. Atualiza o título dinamicamente com o SVG
    const tituloEl = document.getElementById('titulo-cf-record');
    if (tituloEl) {
        tituloEl.innerHTML = titulosRecords[tipo] || "Recordes";
    }

    // 3. Ajusta dinamicamente os placeholders e o teclado numérico (inputmode) conforme a categoria
    const inputMarca = document.getElementById('input-cf-valor');
    const inputNome = document.getElementById('input-cf-movimento');

    if (inputMarca && inputNome) {
        if (tipo === 'gymnastic') {
            inputNome.placeholder = "Movimento (Ex: PULL-UPS, HSPU)";
            inputMarca.placeholder = "Marca / Reps (Ex: 50 reps unbroken)";
            inputMarca.removeAttribute('inputmode');
        } else if (tipo === 'endurance') {
            inputNome.placeholder = "Exercício / Distância (Ex: 5K RUN, ROW)";
            inputMarca.placeholder = "00:00:00";
            inputMarca.setAttribute('inputmode', 'numeric');
        } else {
            inputNome.placeholder = "Nome do Movimento / Exercício";
            inputMarca.placeholder = "Carga / Marca (Ex: 100 kg)";
            inputMarca.removeAttribute('inputmode');
        }
    }

    // 4. Atualiza a lista de registros na tela para a categoria correta
    if (typeof atualizarListaRecordsCF === 'function') {
        atualizarListaRecordsCF();
    }
}

window.abrirRecordsHub = abrirRecordsHub;


function abrirBenchmarksHub(categoria) {
    cfCategoriaAtual = categoria;
    
    const dicionarioTitulos = {
        'girls': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F1F5F9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-6 9.5c0-2.5 3-3.5 6-3.5s6 1 6 3.5V18H6v-2.5z"></path></svg> The Girls Recordistas',
        'heroes': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F1F5F9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"></polygon><line x1="12" y1="2" x2="12" y2="22"></line></svg> Heroes da Box',
        'notables': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F1F5F9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> WODs Notáveis',
        'open': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F1F5F9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 8px;"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z"></path></svg> Open Leaderboard'
    };

    const tituloEl = document.getElementById('titulo-cf-benchmark');
    if (tituloEl) tituloEl.innerHTML = dicionarioTitulos[categoria] || 'Benchmarks';
    
    const inputNome = document.getElementById('input-bench-nome');
    const inputMarca = document.getElementById('input-bench-marca');
    const inputAtleta = document.getElementById('input-bench-atleta');
    if (inputNome) inputNome.value = '';
    if (inputMarca) {
        inputMarca.value = '';
        // Configura o input de benchmarks para o formato de tempo e teclado numérico em celulares
        inputMarca.placeholder = "00:00:00";
        inputMarca.setAttribute('inputmode', 'numeric');
    }
    if (inputAtleta) inputAtleta.value = '';
    
    atualizarListaBenchmarksCF();
    
    if (typeof showView === 'function') {
        showView('crossfit-benchmark-hub');
    }
}

window.abrirBenchmarksHub = abrirBenchmarksHub;


function atualizarListaRecordsCF() {
    const container = document.getElementById('lista-cf-records');
    if (!container) return;
    container.innerHTML = '';
    
    if (!window.bancoDeDados) window.bancoDeDados = {};
    if (!bancoDeDados.crossfit_records) bancoDeDados.crossfit_records = {};
    if (!bancoDeDados.crossfit_records[cfCategoriaAtual]) bancoDeDados.crossfit_records[cfCategoriaAtual] = {};
    
    const registros = bancoDeDados.crossfit_records[cfCategoriaAtual];
    const movimentos = Object.keys(registros);
    
    if (movimentos.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; font-size: 0.8rem; padding: 15px 0;">Nenhum recorde salvo nesta categoria ainda.</p>';
        return;
    }
    
    movimentos.forEach(movimento => {
        let listaAtletas = registros[movimento];
        
        if (!Array.isArray(listaAtletas)) {
            listaAtletas = [{ atleta: 'Atleta', valorTexto: listaAtletas }];
            registros[movimento] = listaAtletas;
        }
        
        const converterParaNumero = (valorStr) => {
            if (!valorStr) return 0;
            if (valorStr.includes(':')) {
                const partes = valorStr.split(':').map(p => parseFloat(p) || 0);
                if (partes.length === 3) {
                    return (partes[0] * 3600) + (partes[1] * 60) + partes[2];
                } else if (partes.length === 2) {
                    return (partes[0] * 60) + partes[1];
                }
            }
            const match = valorStr.match(/[0-9.]+/);
            return match ? parseFloat(match[0]) : 0;
        };

        listaAtletas.sort((a, b) => {
            const numA = converterParaNumero(a.valorTexto);
            const numB = converterParaNumero(b.valorTexto);
            
            if (cfCategoriaAtual === 'barbell' || cfCategoriaAtual === 'complex') {
                return numB - numA; 
            } else {
                return numA - numB; 
            }
        });

        bancoDeDados.crossfit_records[cfCategoriaAtual][movimento] = listaAtletas;
        if (typeof salvarBanco === 'function') salvarBanco();
        
        let htmlAtletas = '';
        listaAtletas.forEach((item, index) => {
            const posicao = index + 1;
            let corBadge = 'var(--text-secondary)';
            if (posicao === 1) corBadge = '#eab308';
            else if (posicao === 2) corBadge = '#94a3b8';
            else if (posicao === 3) corBadge = '#b45309';
            
            let valorExibido = item.valorTexto;
            const valorUpper = valorExibido.toUpperCase();
            if (cfCategoriaAtual === 'barbell' || cfCategoriaAtual === 'complex') {
                if (!valorUpper.includes('KG')) {
                    valorExibido = `${valorExibido} KG`;
                }
            } else {
                if (!valorUpper.includes('MIN') && !valorUpper.includes('SEG') && !valorUpper.includes(':') && !valorUpper.includes('REPS') && !valorUpper.includes('ROUNDS')) {
                    valorExibido = `${valorExibido} MIN`;
                }
            }
            
            htmlAtletas += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 0.75rem; font-weight: 900; color: ${corBadge}; width: 20px;">#${posicao}</span>
                        <span style="color: white; font-size: 0.85rem; font-weight: 700;">${item.atleta}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span class="italic-bold" style="color: var(--accent-blue); font-size: 0.95rem;">${valorExibido}</span>
                        <button onclick="removerAtletaRecordeCF('${movimento}', ${index})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0; font-size: 0.75rem;">🗑️</button>
                    </div>
                </div>
            `;
        });
        
        const cardHtml = `
            <div class="glass-card" style="padding: 12px 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; margin-bottom: 10px;">
                <div class="italic-bold uppercase" style="color: var(--text-secondary); font-size: 0.75rem; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 4px;">${movimento}</div>
                <div>${htmlAtletas}</div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHtml);
    });
}

window.atualizarListaRecordsCF = atualizarListaRecordsCF;


function adicionarRecordeCF() {
    const inputMov = document.getElementById('input-cf-movimento');
    const inputAtleta = document.getElementById('input-cf-atleta');
    const inputVal = document.getElementById('input-cf-valor');
    
    if (!inputMov || !inputAtleta || !inputVal) return;
    
    const movimento = inputMov.value.trim().toUpperCase();
    const atleta = inputAtleta.value.trim();
    let valorTexto = inputVal.value.trim();
    
    if (!movimento || !atleta || !valorTexto) {
        if (typeof exibirAvisoValidacao === 'function') {
            exibirAvisoValidacao('Por favor, preencha todos os campos do recorde.');
        }
        return;
    }
    
    const valorUpper = valorTexto.toUpperCase();
    
    if (cfCategoriaAtual === 'barbell' || cfCategoriaAtual === 'complex') {
        if (!valorUpper.includes('KG')) {
            valorTexto = `${valorTexto} KG`;
        }
    } else {
        if (!valorUpper.includes('MIN') && !valorUpper.includes('SEG') && !valorUpper.includes(':') && !valorUpper.includes('REPS') && !valorUpper.includes('ROUNDS')) {
            valorTexto = `${valorTexto} MIN`;
        }
    }
    
    if (!window.bancoDeDados) window.bancoDeDados = {};
    if (!bancoDeDados.crossfit_records) bancoDeDados.crossfit_records = {};
    if (!bancoDeDados.crossfit_records[cfCategoriaAtual]) bancoDeDados.crossfit_records[cfCategoriaAtual] = {};

    if (!Array.isArray(bancoDeDados.crossfit_records[cfCategoriaAtual][movimento])) {
        bancoDeDados.crossfit_records[cfCategoriaAtual][movimento] = [];
    }
    
    bancoDeDados.crossfit_records[cfCategoriaAtual][movimento].push({
        atleta: atleta,
        valorTexto: valorTexto
    });
    
    if (typeof salvarBanco === 'function') salvarBanco();
    atualizarListaRecordsCF();
    
    inputMov.value = '';
    inputAtleta.value = '';
    inputVal.value = '';
}

window.adicionarRecordeCF = adicionarRecordeCF;


function removerAtletaRecordeCF(movimento, index) {
    if (bancoDeDados.crossfit_records && bancoDeDados.crossfit_records[cfCategoriaAtual]) {
        bancoDeDados.crossfit_records[cfCategoriaAtual][movimento].splice(index, 1);
        if (bancoDeDados.crossfit_records[cfCategoriaAtual][movimento].length === 0) {
            delete bancoDeDados.crossfit_records[cfCategoriaAtual][movimento];
        }
        if (typeof salvarBanco === 'function') salvarBanco();
        atualizarListaRecordsCF();
    }
}

function aplicarMascaraTempo(e) {
    let valor = e.target.value.replace(/\D/g, '');
    if (valor.length > 6) {
        valor = valor.slice(0, 6);
    }
    valor = valor.padStart(6, '0');
    const horas = valor.slice(0, 2);
    const minutos = valor.slice(2, 4);
    const segundos = valor.slice(4, 6);
    e.target.value = `${horas}:${minutos}:${segundos}`;
}

function atualizarListaBenchmarksCF() {
    const container = document.getElementById('lista-cf-benchmarks');
    if (!container) return;
    container.innerHTML = '';
    
    if (!window.bancoDeDados) window.bancoDeDados = {};
    if (!bancoDeDados.crossfit_benchmarks) bancoDeDados.crossfit_benchmarks = {};
    if (!bancoDeDados.crossfit_benchmarks[cfCategoriaAtual]) bancoDeDados.crossfit_benchmarks[cfCategoriaAtual] = {};
    
    const registros = bancoDeDados.crossfit_benchmarks[cfCategoriaAtual];
    
    // Se ainda estiver como array legado, converte para objeto agrupado por WOD
    if (Array.isArray(registros)) {
        const convertido = {};
        registros.forEach(item => {
            if (item && item.nome) {
                const nomeWod = item.nome.trim().toUpperCase();
                if (!convertido[nomeWod]) convertido[nomeWod] = [];
                convertido[nomeWod].push({
                    atleta: item.atleta || 'Atleta',
                    marca: item.marca || ''
                });
            }
        });
        bancoDeDados.crossfit_benchmarks[cfCategoriaAtual] = convertido;
    }
    
    const registrosAtualizados = bancoDeDados.crossfit_benchmarks[cfCategoriaAtual];
    const nomesWods = Object.keys(registrosAtualizados);
    
    if (nomesWods.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; font-size: 0.8rem; padding: 15px 0;">Nenhum recorde cadastrado nesta categoria.</p>';
        return;
    }
    
    const converterParaNumero = (valorStr) => {
        if (!valorStr) return 0;
        if (valorStr.includes(':')) {
            const partes = valorStr.split(':').map(p => parseFloat(p) || 0);
            if (partes.length === 3) {
                return (partes[0] * 3600) + (partes[1] * 60) + partes[2];
            } else if (partes.length === 2) {
                return (partes[0] * 60) + partes[1];
            }
        }
        const match = valorStr.match(/[0-9.]+/);
        return match ? parseFloat(match[0]) : 0;
    };

    nomesWods.forEach(nomeWod => {
        let listaAtletas = registrosAtualizados[nomeWod];
        
        if (!Array.isArray(listaAtletas)) {
            listaAtletas = [{ atleta: 'Atleta', marca: listaAtletas }];
            registrosAtualizados[nomeWod] = listaAtletas;
        }
        
        // Ordena do melhor para o pior (menor tempo primeiro)
        listaAtletas.sort((a, b) => {
            const numA = converterParaNumero(a.marca);
            const numB = converterParaNumero(b.marca);
            return numA - numB;
        });

        bancoDeDados.crossfit_benchmarks[cfCategoriaAtual][nomeWod] = listaAtletas;
        if (typeof salvarBanco === 'function') salvarBanco();
        
        let htmlAtletas = '';
        listaAtletas.forEach((item, index) => {
            const posicao = index + 1;
            let corBadge = 'var(--text-secondary)';
            if (posicao === 1) corBadge = '#eab308';
            else if (posicao === 2) corBadge = '#94a3b8';
            else if (posicao === 3) corBadge = '#b45309';
            
            let marcaExibida = item.marca;
            const marcaUpper = marcaExibida.toUpperCase();
            if (!marcaUpper.includes('MIN') && !marcaUpper.includes('SEG') && !marcaUpper.includes('KG') && !marcaUpper.includes('REPS') && !marcaUpper.includes('ROUNDS')) {
                marcaExibida = `${marcaExibida} MIN`;
            }
            
            htmlAtletas += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 0.75rem; font-weight: 900; color: ${corBadge}; width: 20px;">#${posicao}</span>
                        <span style="color: white; font-size: 0.85rem; font-weight: 700;">${item.atleta}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span class="italic-bold" style="color: var(--accent-green); font-size: 0.95rem;">${marcaExibida}</span>
                        <button onclick="removerAtletaBenchmarkCF('${nomeWod}', ${index})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0; font-size: 0.75rem;">🗑️</button>
                    </div>
                </div>
            `;
        });
        
        const cardHtml = `
            <div class="glass-card" style="padding: 12px 15px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 12px; margin-bottom: 10px;">
                <div class="italic-bold uppercase" style="color: var(--text-secondary); font-size: 0.75rem; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 4px;">${nomeWod}</div>
                <div>${htmlAtletas}</div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHtml);
    });
}

function adicionarBenchmarkCustom() {
    const inputNome = document.getElementById('input-bench-nome');
    const inputMarca = document.getElementById('input-bench-marca');
    const inputAtleta = document.getElementById('input-bench-atleta');
    
    if (!inputNome || !inputMarca || !inputAtleta) return;
    
    const nome = inputNome.value.trim().toUpperCase();
    const atleta = inputAtleta.value.trim();
    let marcaTexto = inputMarca.value.trim();
    
    if (!nome || !marcaTexto || !atleta) {
        if (typeof exibirAvisoValidacao === 'function') {
            exibirAvisoValidacao('Por favor, preencha todos os campos do benchmark.');
        }
        return;
    }
    
    // Formata a unidade de medida automaticamente baseada na categoria ativa
    const marcaUpper = marcaTexto.toUpperCase();
    if (cfCategoriaAtual === 'barbell' || cfCategoriaAtual === 'complex') {
        if (!marcaUpper.includes('KG')) {
            marcaTexto = `${marcaTexto} KG`;
        }
    } else {
        // Para Heroes, Girls, Notables e Open (que são predominantemente WODs de tempo ou repetições)
        if (!marcaUpper.includes('MIN') && !marcaUpper.includes('SEG') && !marcaUpper.includes(':') && !marcaUpper.includes('REPS') && !marcaUpper.includes('ROUNDS')) {
            marcaTexto = `${marcaTexto} MIN`;
        }
    }
    
    if (!window.bancoDeDados) window.bancoDeDados = {};
    if (!bancoDeDados.crossfit_benchmarks) bancoDeDados.crossfit_benchmarks = {};
    
    // Tratamento de conversão caso o banco estivesse em formato array legado
    if (Array.isArray(bancoDeDados.crossfit_benchmarks[cfCategoriaAtual])) {
        const antigo = bancoDeDados.crossfit_benchmarks[cfCategoriaAtual];
        bancoDeDados.crossfit_benchmarks[cfCategoriaAtual] = {};
        antigo.forEach(item => {
            if (item && item.nome) {
                const w = item.nome.trim().toUpperCase();
                if (!bancoDeDados.crossfit_benchmarks[cfCategoriaAtual][w]) {
                    bancoDeDados.crossfit_benchmarks[cfCategoriaAtual][w] = [];
                }
                bancoDeDados.crossfit_benchmarks[cfCategoriaAtual][w].push({
                    atleta: item.atleta || 'Atleta',
                    marca: item.marca || ''
                });
            }
        });
    }
    
    if (!bancoDeDados.crossfit_benchmarks[cfCategoriaAtual]) {
        bancoDeDados.crossfit_benchmarks[cfCategoriaAtual] = {};
    }
    
    if (!Array.isArray(bancoDeDados.crossfit_benchmarks[cfCategoriaAtual][nome])) {
        bancoDeDados.crossfit_benchmarks[cfCategoriaAtual][nome] = [];
    }
    
    bancoDeDados.crossfit_benchmarks[cfCategoriaAtual][nome].push({
        atleta: atleta,
        marca: marcaTexto
    });
    
    if (typeof salvarBanco === 'function') salvarBanco();
    atualizarListaBenchmarksCF();
    
    inputNome.value = '';
    inputMarca.value = '';
    inputAtleta.value = '';
}


function removerBenchmarkCF(index) {
    if (bancoDeDados.crossfit_benchmarks && bancoDeDados.crossfit_benchmarks[cfCategoriaAtual]) {
        bancoDeDados.crossfit_benchmarks[cfCategoriaAtual].splice(index, 1);
        if (typeof salvarBanco === 'function') salvarBanco();
        atualizarListaBenchmarksCF();
    }
}


function exibirAvisoValidacao(mensagem) {
    console.warn(mensagem);
}


function adicionarRecordCustom() {
    adicionarRecordeCF();
}


window.adicionarRecordCustom = adicionarRecordCustom;
window.adicionarRecordeCF = adicionarRecordeCF;
window.adicionarBenchmarkCustom = adicionarBenchmarkCustom;
window.removerAtletaRecordeCF = removerAtletaRecordeCF;
window.removerBenchmarkCF = removerBenchmarkCF;