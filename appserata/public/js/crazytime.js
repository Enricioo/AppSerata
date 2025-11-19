const auth = firebase.auth();
const functions = firebase.functions();
const db = firebase.database();
const BETTING_TIME_MS = 5000;
const gameStateRef = db.ref('GAME_STATE');

function startApplication() {
    document.addEventListener('DOMContentLoaded', () => {
        const spinButton = document.getElementById('spin-button');
        const wheel = document.getElementById('crazy-time-wheel');
        const resultDisplay = document.getElementById('current-result');
        const topslotDisplay = document.getElementById('topslot-result');
        const statusMessage = document.getElementById('current-status-message');
        const countdownBar = document.getElementById('countdown-bar');
        const pixelTimerDisplay = document.getElementById('pixelTimerDisplay');

        let isSpinning = false;
        let topslotTarget = '';
        let topslotMultiplier = 1;

        let currentRoundId = Date.now().toString();

        const segments = [
            'CrazyTime', '1', '2', '5', '1', '2', 'Pachinko', '1', '5', '1', 
            '2', '1', 'CoinFlip', '1', '2', '1', '10', '2', 'CashHunt', '1', 
            '2', '1', '5', '1', 'CoinFlip', '1', '5', '2', '10', '1', 
            'Pachinko', '1', '2', '5', '1', '2', 'CoinFlip', '1', '10', '1',
            '5', '1', 'CashHunt', '1', '2', '5', '1', '2', 'CoinFlip', '2',
            '1', '10', '2', '1' // Totale 54 segmenti
        ];

        const multipliers = {
            '1': 2, '2': 3, '5': 6, '10': 11, 
            'CoinFlip': 1, 'CashHunt': 1, 'Pachinko': 1, 'CrazyTime': 1 
        };

        function formatTime(totalSeconds) {
            if (totalSeconds < 0) totalSeconds = 0;
            
            // Calcola minuti e secondi
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            
            // Aggiunge lo zero iniziale se il numero è inferiore a 10
            const formattedMinutes = String(minutes).padStart(2, '0');
            const formattedSeconds = String(seconds).padStart(2, '0');
            
            return `${formattedMinutes}:${formattedSeconds}`;
        }

        function processRoundResult(segmentoVincente, moltiplicatoreFinale, roundId) {
            
            // 2. Prepara l'oggetto risultato
            const risultatoDaScrivere = {
                roundId: roundId,
                segment: segmentoVincente,
                finalMultiplier: moltiplicatoreFinale
            };

            // 3. ESEGUI LA SCRITTURA ATOMICA DEL RISULTATO (Soluzione al problema del listener)
            db.ref('RISULTATO_ULTIMO_GIRO').set(risultatoDaScrivere)
                .then(() => {
                    console.log(`Risultato ${segmentoVincente} scritto correttamente con ID: ${roundId}`);
                    
                    // 4. Aggiorna lo stato del gioco per aprire le puntate
                    return db.ref('GAME_STATE/status').set('WAITING_FOR_SPIN');
                })
                .then(() => {
                    console.log("[FIREBASE] Stato settato su WAITING_FOR_SPIN. Puntate NON aperte.");
                })
                .catch(error => {
                    console.error("Errore critico durante la chiusura del giro:", error);
                });
        }

        const segmentAngle = 360 / segments.length; // 6.666 gradi per segmento

        async function registerTopSlotResult(event, multiplier) {
            if (typeof db === 'undefined' || typeof firebase === 'undefined' || !firebase.database.ServerValue) {
                console.error("Firebase db o ServerValue non disponibili per registrare Top Slot.");
                return;
            }

            try {
                await db.ref('LAST_TOPSLOT_RESULT').set({
                    event: event,       // Es: 'PACHINKO', 'COINFLIP'
                    multiplier: multiplier, // Es: 2, 5, 10
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });
                console.log(`Risultato Top Slot registrato: ${event} ${multiplier}x`);
            } catch (error) {
                console.error("Errore registrazione Top Slot:", error);
            }
        }

        // Funzione per gestire il Top Slot
        function spinTopSlot() {
            return new Promise(async resolve => {
                topslotDisplay.textContent = 'Top Slot: Girando...';
                
                // Scegli un Moltiplicatore Casuale
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

                    complete: async () => {
                    
                        // Assegna i valori globali
                        topslotTarget = chosenTarget;
                        topslotMultiplier = chosenMultiplier;
                        
                        await registerTopSlotResult(topslotTarget, topslotMultiplier);

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
            return new Promise((resolve, reject) => {
                console.log("3. Funzione spinMainWheel avviata.");
                const chosenSegmentIndex = Math.floor(Math.random() * segments.length);
                const winningTarget = "Pachinko"// segments[chosenSegmentIndex];
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
                    
                    complete: function() {
                        isSpinning = false;
                        spinButton.disabled = false;
                        const BONUS_GAMES = ['CoinFlip', 'CashHunt', 'Pachinko', 'CrazyTime'];
                        const isBonusGame = BONUS_GAMES.includes(winningTarget);

                        if (isBonusGame) {
                            
                            startBonusGame(winningTarget);
                            return; // Interrompe l'esecuzione del resto del blocco
                        }

                        // Calcola la vincita
                        let finalMultiplier = multipliers[winningTarget] || 1;

                        if (winningTarget === topslotTarget) {
                            finalMultiplier += topslotMultiplier;
                        }

                        resultDisplay.textContent = `Risultato: ${winningTarget}`;
                        console.log("Segmento Vincente inviato:", winningTarget);
                        console.log("Moltiplicatore inviato:", finalMultiplier);

                        resolve({ 
                            segmentoVincente: winningTarget, 
                            moltiplicatoreFinale: Number(finalMultiplier)                     
                            });
                        
                    }
                });
                topslotDisplay.textContent = `Top Slot: ${topslotTarget} X${topslotMultiplier}`;
            });
        }

        async function spinWheel() {
            
            if (isSpinning) return;
            isSpinning = true;
            resultDisplay.textContent = 'Invia le puntate ORA!';

            currentRoundId = Date.now().toString();

            await gameStateRef.update({
                status: 'BETTING_OPEN',
                startTime: firebase.database.ServerValue.TIMESTAMP, // Utile per il timer lato client
                duration: BETTING_TIME_MS 
            });

            let timeLeft = BETTING_TIME_MS / 1000;

            const timerInterval = setInterval(() => {
                pixelTimerDisplay.textContent = formatTime(timeLeft);
                timeLeft--;

                if (timeLeft >= 0) {

                    const newTimeText = formatTime(timeLeft);
                    statusMessage.textContent = '';
                    
                    // Animazione: Scala (scalabilità) per un effetto "pulsante"
                    anime({
                        targets: pixelTimerDisplay,
                        translateY: ['0%', '100%'], // Sposta in basso
                        opacity: [1, 1],
                        easing: 'easeInQuad',
                        duration: 150,
                        
                        complete: () => {
                            // Aggiorna il testo quando è nascosto
                            pixelTimerDisplay.textContent = newTimeText;

                            // Riporta il numero appena aggiornato nella posizione originale
                            anime({
                                targets: pixelTimerDisplay,
                                translateY: ['-100%', '0%'], // Torna dall'alto
                                opacity: [1, 1],            // Appare
                                easing: 'easeOutQuad',
                                duration: 150, // Breve durata per l'effetto di entrata
                            });
                        }
                    });
                    anime({
                        targets: pixelTimerDisplay,
                        color: [timeLeft <= 10 ? '#FF4136' : '#FFFFFF', '#FFFFFF'], 
                        duration: 500,
                        easing: 'easeInOutSine'
                    });

                } else {
                    clearInterval(timerInterval);
                }
            }, 1000);

            await new Promise(resolve => setTimeout(resolve, BETTING_TIME_MS));

            clearInterval(timerInterval);
            anime.set(countdownBar, {
                scaleX: 1, 
            });

            resultDisplay.textContent = 'FASE PUNTATE: CHIUSA.';

            await gameStateRef.update({
                status: 'BETTING_CLOSED'
            });
            
            spinButton.disabled = true;
            await spinTopSlot();
            console.log("1. In attesa del Top Slot...");
            console.log(`2. Top Slot risolto. Moltiplicatore: ${topslotMultiplier}. Avvio Ruota...`);

            // Gira la Ruota Principale con il moltiplicatore ricevuto
            const risultatiGiro = await spinMainWheel();
            const { segmentoVincente, moltiplicatoreFinale } = risultatiGiro;
            console.log(`[DEBUG] Moltiplicatore che registro nel DB: ${moltiplicatoreFinale}`);
            try {

                processRoundResult(segmentoVincente, moltiplicatoreFinale, currentRoundId);

                topslotTarget = '';
                topslotMultiplier = 1;
        
                console.log(`Risultato inviato: ${segmentoVincente}. Moltiplicatore: ${moltiplicatoreFinale}x`);

            } catch (error) {
                console.error("Errore durante l'elaborazione del giro:", error);
            }
        }
        
        spinButton.addEventListener('click', spinWheel);

        async function startBonusGame(gameName) {
            console.log(`Avvio minigioco: ${gameName}`);

            const roundId = currentRoundId
            
            // Aggiorna lo stato del gioco su Firebase
            db.ref('GAME_STATE').update({
                status: 'BONUS_GAME',
                activeBonus: gameName,
                currentRoundId: roundId
            });
            window.location.href = `bonus/${gameName.toLowerCase()}.html`;
        }

    });
}

startApplication();