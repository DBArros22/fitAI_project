// Configurações iniciais
const API_KEY = "AIzaSyC5tl94NA-0LFpBDNigfRIxjPQjOapbWO8"; // Você vai colar a chave aqui depois
const URL_API = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${'AIzaSyC5tl94NA-0LFpBDNigfRIxjPQjOapbWO8'}`;

async function gerarTreino() {
    const promptUsuario = document.getElementById('userInput').value;
    const elementoTexto = document.getElementById('textoIA');
    const boxResultado = document.getElementById('resultado');
    const btn = document.getElementById('btnGerar');

    if (!promptUsuario) {
        alert("Por favor, descreva seu objetivo ou treino.");
        return;
    }

    // Feedback visual de carregamento
    btn.innerText = "Consultando Personal IA...";
    btn.disabled = true;
    boxResultado.classList.remove('hidden');
    elementoTexto.innerText = "Analisando seus dados e montando a melhor estratégia...";

    // O "System Prompt" que torna a IA especialista em Fitness
    const corpoRequisicao = {
        contents: [{
            parts: [{
                text: `Você é um Personal Trainer IA de elite. 
                Sua missão é criar treinos eficazes e seguros. 
                O usuário disse: "${promptUsuario}".
                Responda com uma estrutura clara: 
                1. Divisão de Treino (Ex: A, B, C).
                2. Lista de exercícios com Séries e Repetições.
                3. Uma dica técnica de execução para o exercício principal.`
            }]
        }]
    };

    try {
        const resposta = await fetch(URL_API, {
            method: 'POST',
            body: JSON.stringify(corpoRequisicao),
            headers: { 'Content-Type': 'application/json' }
        });

        const dados = await resposta.json();
        
        // Extraindo a resposta da estrutura do Gemini
        const textoFormatado = dados.candidates[0].content.parts[0].text;
        
        elementoTexto.innerText = textoFormatado;

    } catch (erro) {
        elementoTexto.innerText = "Erro ao conectar com a IA. Verifique sua chave API.";
        console.error(erro);
    } finally {
        btn.innerText = "Gerar Plano de Treino";
        btn.disabled = false;
    }
}
