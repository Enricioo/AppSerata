const auth = firebase.auth();
const functions = firebase.functions();
const db = firebase.database();
const BETTING_TIME_MS = 1000;
const gameStateRef = db.ref('GAME_STATE');

const applicaRisultato = functions.httpsCallable('applicaRisultato');
function startApplication() {
    document.addEventListener('DOMContentLoaded', () => {
        const spinButton = document.getElementById('spin-button');
        const wheel = document.getElementById('crazy-time-wheel');
        const resultDisplay = document.getElementById('current-result');
        const topslotDisplay = document.getElementById('topslot-result');

        let isSpinning = false;
        let topslotTarget = '';
        let topslotMultiplier = 1;

        const segments = [
            'CrazyTime', '1', '2', '5', '1', '2', 'Pachinko', '1', '5', '1', 
            '2', '1', 'CoinFlip', '1', '2', '1', '10', '2', 'CashHunt', '1', 
            '2', '1', '5', '1', 'CoinFlip', '1', '5', '2', '10', '1', 
            'Pachinko', '1', '2', '5', '1', '2', 'CoinFlip', '1', '10', '1',
            '5', '1', 'CashHunt', '1', '2', '5', '1', '2', 'CoinFlip', '2',
            '1', '10', '2', '1' // Totale 54 segmenti
        ];

        const multipliers = {
            '1': 1, '2': 2, '5': 5, '10': 10, 
            'CoinFlip': 2, 'CashHunt': 5, 'Pachinko': 10, 'CrazyTime': 20 
        };

        const segmentAngle = 360 / segments.length; // 6.666 gradi per segmento

        // Funzione per gestire il Top Slot
        function spinTopSlot() {
            return new Promise(resolve => {
                topslotDisplay.textContent = 'Top Slot: Girando...';
                
                // 1. Scegli un Moltiplicatore Casuale
                const possibleMultipliers = [2, 3, 4, 5, 7, 10, 20, 30, 40, 50, 100];
                const chosenMultiplier = possibleMultipliers[Math.floor(Math.random() * possibleMultipliers.length)];
                const bettableSegments = ['1', '2', '5', '10', 'CoinFlip', 'CashHunt', 'Pachinko', 'CrazyTime'];
                const chosenTarget = bettableSegments[Math.floor(Math.random() * bettableSegments.length)];
                const finalMessage = `${chosenTarget} X${chosenMultiplier}`;
                topslotDisplay.textContent = 'Spinning...';
                // Simula l'animazione Top Slot con un timeout

                anime({
                    targets: topslotDisplay,
                    // Simula un effetto di scuotimento rapido
                    translateX: [
                        { value: 10, duration: 50, easing: 'easeInOutSine' },
                        { value: -10, duration: 50, easing: 'easeInOutSine' },
                        { value: 0, duration: 50, easing: 'easeInOutSine' }
                    ],
                    opacity: [0.5, 1],
                    
                    duration: 150,
                    loop: 10, 
                    easing: 'linear',

                    complete: () => {
                    
                        // Assegna i valori globali
                        topslotTarget = chosenTarget;
                        topslotMultiplier = chosenMultiplier;
                        
                        topslotDisplay.textContent = finalMessage;
                        anime({
                            targets: topslotDisplay,
                            scale: [3, 1.1, 1],
                            duration: 1500
                        });
                        resolve(true);
                    }
                });
            });
        }

        function spinMainWheel() {
            console.log("3. Funzione spinMainWheel avviata.");
            const chosenSegmentIndex = Math.floor(Math.random() * segments.length);
            const winningTarget = segments[chosenSegmentIndex];
            // Calcola l'angolo di arrivo
            let targetAngle = (chosenSegmentIndex * segmentAngle) + (segmentAngle / 2);
            const fullRotations = 5; 
            const finalAngle = (fullRotations * 360) + targetAngle;
            
            console.log(`[DEBUG] Moltiplicatore Top Slot: ${topslotMultiplier}`);
            // Avvia la rotazione
            anime({
                targets: wheel,
                rotate: [0, -finalAngle], 
                duration: 5000, 
                easing: 'easeOutQuart',
                
                complete: async function() {
                    isSpinning = false;
                    spinButton.disabled = false;

                    // Calcola la vincita
                    let finalMultiplier = multipliers[winningTarget] || 1;

                    if (winningTarget === topslotTarget) {
                        finalMultiplier *= topslotMultiplier;
                    }

                    resultDisplay.textContent = `Risultato: ${winningTarget}`;

                    try {
                        // IMPOSTA LO STATO DEI RISULTATI prima di chiamare la CF
                        await gameStateRef.update({
                            status: 'SPIN_RESULT',
                            vincitore: winningTarget, // Opzionale, ma utile per i giocatori
                            moltiplicatore: finalMultiplier
                        });
                        
                        // CHIAMATA AL BACKEND PER IL PAYOUT GENERALE
                        await applicaRisultato({
                            segmentoVincente: winningTarget,
                            moltiplicatoreFinale: finalMultiplier,
                        });      
                        
                        resultDisplay.textContent = `Risultato: ${winningTarget} x${finalMultiplier}! Payout completato.`;

                        // 5. Reset: dopo 5 secondi, riabilita il pulsante "Gira" e resetta lo stato
                        setTimeout(() => {
                            spinButton.disabled = false;
                            gameStateRef.update({ status: 'READY_TO_SPIN' });
                            topslotTarget = '';
                            topslotMultiplier = 1;
                            resultDisplay.textContent = 'Pronto per il prossimo giro.';
                        }, 5000); // Dai tempo ai giocatori di vedere il risultato
                        
                    } catch (error) {
                        resultDisplay.textContent = `ERRORE Payout: ${error.message}`;
                        // ...
                    }

                    topslotDisplay.textContent = `Top Slot: ${topslotTarget} X${topslotMultiplier}`;
                    
                    topslotTarget = '';
                    topslotMultiplier = 1;
                }
            });
            
        }

        async function spinWheel() {
            
            if (isSpinning) return;
            isSpinning = true;

            resultDisplay.textContent = 'FASE PUNTATE: APERTA (30s)...';

            await gameStateRef.update({
                status: 'BETTING_OPEN',
                startTime: firebase.database.ServerValue.TIMESTAMP, // Utile per il timer lato client
                duration: BETTING_TIME_MS 
            });

            await new Promise(resolve => setTimeout(resolve, BETTING_TIME_MS));

            resultDisplay.textContent = 'FASE PUNTATE: CHIUSA. In attesa risultato...';

            await gameStateRef.update({
                status: 'BETTING_CLOSED'
            });
            
            spinButton.disabled = true;
            await spinTopSlot();
            console.log("1. In attesa del Top Slot...");
            console.log(`2. Top Slot risolto. Moltiplicatore: ${topslotMultiplier}. Avvio Ruota...`);

            // Gira la Ruota Principale con il moltiplicatore ricevuto
            spinMainWheel();
        }
        
        spinButton.addEventListener('click', spinWheel);
    });
}

startApplication();
/* auth.onAuthStateChanged((user) => {
    const gameTeamIdFromStorage = localStorage.getItem('gameTeamId');
if (user && gameTeamIdFromStorage === 'ADMIN_CONTROL_PANEL') {   
        // Utente Admin loggato: avvia la funzione di controllo
        console.log("Accesso Admin riuscito. Avvio Pagina Admin.");
        
     } else {
         // Utente non loggato: reindirizza al login
         if (window.location.pathname !== '/login.html' && window.location.pathname !== '/login') {
             window.location.href = 'login.html'; 
         }
     }
}); */