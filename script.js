
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
