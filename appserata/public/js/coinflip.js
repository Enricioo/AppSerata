const db = firebase.database();
const resultArea = document.getElementById('result-area');
const flipButton = document.getElementById('flip-button');
const coin3d = document.getElementById('coin-3d');

// Riferimenti agli elementi HTML
const redDisplay = document.getElementById('red-multiplier-display');
const blueDisplay = document.getElementById('blue-multiplier-display');
const coinVisual = document.getElementById('coin-visual');

const redValueElement = redDisplay.querySelector('.value-to-animate');
const blueValueElement = blueDisplay.querySelector('.value-to-animate');

// Variabili globali per i moltiplicatori del round
let redMultiplier = 0;
let blueMultiplier = 0;

function handleRoundStart() {
    
    // Disconnetti questo gestore e disabilita il pulsante
    flipButton.onclick = null;
    flipButton.disabled = true;
    flipButton.textContent = "GENERAZIONE MOLTIPLICATORI...";

    // 1. Generazione Moltiplicatori
    resultArea.textContent = 'Generazione dei moltiplicatori...';
    
    const possibleMultipliers = [2, 3, 4, 5, 8, 10, 15, 20, 50, 100];
    
    redMultiplier = possibleMultipliers[Math.floor(Math.random() * possibleMultipliers.length)];
    blueMultiplier = possibleMultipliers[Math.floor(Math.random() * possibleMultipliers.length)];

    redValueElement.textContent = `X 0`;
    blueValueElement.textContent = `X 0`;

    const animateMultiplier = (element, finalValue) => {
        return new Promise(resolve => {
            // Un oggetto fittizio per animare il numero
            const number = { val: 0 }; 

            anime({
                targets: number,
                val: finalValue, // Anima dal valore 0 al valore finale
                easing: 'easeOutQuad',
                duration: 1500,
                round: 1, // Arrotonda all'intero
                
                // Effetto "pop" sul target (il contenitore del valore)
                scale: [0.8, 1.2, 1], 
                
                // Aggiorna il testo ad ogni tick
                update: function() {
                    element.textContent = `X ${number.val}`;
                },
                complete: resolve // Risolvi la Promise quando l'animazione è finita
            });
        });
    };
    
    // 2. Esegui entrambe le animazioni contemporaneamente e aspetta che finiscano
    Promise.all([
        animateMultiplier(redValueElement, redMultiplier),
        animateMultiplier(blueValueElement, blueMultiplier)
    ]).then(() => {
        // Codice eseguito DOPO che ENTRAMBE le animazioni sono terminate.
        resultArea.textContent = 'Ora lancia la moneta!';
        flipButton.textContent = "LANCIA LA MONETA!";
        flipButton.disabled = false;
        flipButton.onclick = handleCoinFlip;
    });
}


function handleCoinFlip() {
    flipButton.disabled = true;
    resultArea.textContent = 'Moneta in volo...';
    
    // Rimuovi eventuali classi di rotazione precedenti e resetta
    coin3d.classList.remove('rotate-to-red', 'rotate-to-blue');
    anime.set(coin3d, { rotateY: 0, scale: 1 }); // Resetta la moneta all'inizio del flip

    // 1. Determina il risultato
    const isRedWinner = Math.random() < 0.5;
    const winningColor = isRedWinner ? 'RED' : 'BLUE';
    const finalMultiplier = isRedWinner ? redMultiplier : blueMultiplier;

    // Animazione di rotazione per la moneta bicolore
    anime({
        targets: coin3d,
        rotateY: [0, 360 * 6], // Rotazione multipla per simulare il lancio
        scale: [1, 1.2, 1], // Effetto di ingrandimento/rimpicciolimento
        easing: 'easeInOutQuad',
        duration: 4000,
        
        complete: function() {
            // Animazione completata, ora imposta il risultato finale
            resultArea.textContent = `RISULTATO: ${winningColor} ha vinto X${finalMultiplier}!`;

            // Applica la classe di rotazione per mostrare il lato vincente
            if (isRedWinner) {
                coin3d.classList.add('rotate-to-red'); // Gira al rosso
            } else {
                coin3d.classList.add('rotate-to-blue'); // Gira al blu
            }
            
            // 2. Aggiorna lo stato di Firebase e ritorna all'Host
            setTimeout(() => {
                updateFinalResult(finalMultiplier);
            }, 2000); // Breve pausa per visualizzare la vincita
        }
    });
}


function updateFinalResult(finalMultiplier) {
    
    // Legge lo stato del gioco per ottenere il nome del bonus e l'ID del round
    db.ref('GAME_STATE').once('value').then(snapshot => {
        const gameState = snapshot.val();
        
        // Controllo robusto dei dati
        if (!gameState || !gameState.activeBonus || !gameState.currentRoundId) {
            console.error("Dati di stato del gioco incompleti. Impossibile registrare il risultato.");
            resultArea.textContent = "ERRORE CRITICO: Dati round mancanti. Ritorno...";
            setTimeout(() => { window.location.href = "../crazytime.html"; }, 3000); 
            return;
        }
        
        const winningTarget = gameState.activeBonus; 
        const roundId = gameState.currentRoundId;    
        
        // 1. Scrive il risultato finale su RISULTATO_ULTIMO_GIRO
        db.ref('RISULTATO_ULTIMO_GIRO').set({
            segment: winningTarget, 
            finalMultiplier: finalMultiplier, 
            roundId: roundId,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        // 2. Pulisce lo stato del bonus e reimposta su WAITING
        db.ref('GAME_STATE').update({
            status: 'WAITING_FOR_SPIN', // Torna allo stato di attesa del giro
            activeBonus: null,
            currentRoundId: null 
        });

        // 3. Ritorna alla schermata Host principale
        resultArea.textContent = "Risultato registrato. Tornando alla Ruota...";
        setTimeout(() => {
            window.location.href = "../crazytime.html"; 
        }, 5000); 
        
    }).catch(error => {
        console.error("Errore durante la scrittura del risultato:", error);
        resultArea.textContent = `ERRORE CRITICO: ${error.message}`;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Il pulsante all'avvio avvia il round, non lancia la moneta
    flipButton.onclick = handleRoundStart;
});