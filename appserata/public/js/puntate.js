const db = firebase.database();
const gameStateRef = db.ref('GAME_STATE');
let currentTeamId = null;

// Segmenti definiti per riferimento, non per la UI (che usa data-segment)
const allSegments = ['1', '2', '5', '10', 'Pachinko', 'Cash Hunt', 'CoinFlip', 'Crazy Time']; 
const PAYOUT_MULTIPLIERS = {
    '1': 2,    // Vinci 1x + riottieni la puntata = 2
    '2': 3,    // Vinci 2x + riottieni la puntata = 3
    '5': 6,    // Vinci 5x + riottieni la puntata = 6
    '10': 11,  // Vinci 10x + riottieni la puntata = 11
    'Pachinko': 20, 
    'Cash Hunt': 20,
    'CoinFlip': 20,
    'Crazy Time': 50  
};

let roundMultipliers = [];
let roundIcons = [];       
let targetSelected = false;

const auth = firebase.auth();

// 2. LOGICA DI AVVIO PRINCIPALE
document.addEventListener('DOMContentLoaded', () => {

    // Riferimenti agli elementi UI
    const teamNameDisplay = document.getElementById('teamNameDisplay');
    const messageArea = document.getElementById('messageArea');
    
    // Inizializza i Listener UI (Bottoni)
    document.getElementById('betMinus10').addEventListener('click', () => adjustBetAmount(-10));
    document.getElementById('betMinus1').addEventListener('click', () => adjustBetAmount(-1));
    document.getElementById('betPlus1').addEventListener('click', () => adjustBetAmount(1));
    document.getElementById('betPlus10').addEventListener('click', () => adjustBetAmount(10));

    document.querySelectorAll('.segment-bet-btn').forEach(button => {
        button.addEventListener('click', (event) => placeBet(event.target.dataset.segment));
    });

    // Stato iniziale del nome squadra
    teamNameDisplay.textContent = 'Verifica Autenticazione...';
    messageArea.textContent = 'Attendere la connessione a Firebase.';


    // 💥 ATTENDE LO STATO DI AUTENTICAZIONE
    auth.onAuthStateChanged(user => {
        if (user) {
            // Utente loggato: l'UID è il Team ID
            currentTeamId = user.uid;
            messageArea.textContent = 'Utente connesso.';
            
            // Avvia il caricamento dei dati della squadra
            loadTeamData(currentTeamId); 
            
        } else {
            // Utente NON loggato
            teamNameDisplay.textContent = 'Errore di Accesso';
            messageArea.textContent = 'NON AUTORIZZATO. Reindirizzare alla pagina di login.';
        }
    });
});

async function findTeamIdAndLoadData(uid) {
    const loadingMessage = document.getElementById('loadingMessage');
    const userTeamMapRef = db.ref(`UTENTI_SQUADRA/${uid}/teamId`); // Verifica il tuo path
    
    try {
        const snapshot = await userTeamMapRef.once('value');
        const teamId = snapshot.val();

        if (teamId) {
            // 💥 Trovato l'ID squadra! Avvia il caricamento dei dati di gioco
            currentTeamId = teamId; // Imposta la variabile globale
            loadTeamData(teamId); // Chiama la funzione di caricamento dati di gioco
        } else {
            // UID non mappato a un TeamId
            loadingMessage.textContent = 'Errore: Il tuo account non è associato a una squadra.';
        }
    } catch (error) {
        console.error("Errore lettura mappatura UID/TeamId:", error);
        loadingMessage.textContent = 'Errore durante la lettura della configurazione della squadra.';
    }
}


// 3. FUNZIONE DI CARICAMENTO DATI INIZIALI
async function loadTeamData(teamUid) {
    const teamRef = db.ref(`SQUADRE/${teamUid}`);
    const messageArea = document.getElementById('messageArea');
    const teamNameDisplay = document.getElementById('teamNameDisplay');
    
    try {
        const snapshot = await teamRef.once('value');
        const teamData = snapshot.val();

        if (teamData && teamData.nome) { 
            // SUCCESS: I dati esistono
            teamNameDisplay.textContent = teamData.nome;
            messageArea.textContent = 'Pronto per piazzare le puntate!';
            
            // Avvia gli ascoltatori real-time (saldo, stato gioco, ecc.)
            startListeners(); 
            
        } else {
            // Loggato ma senza nodo /SQUADRE/UID
            teamNameDisplay.textContent = 'Configurazione Errata';
            messageArea.textContent = 'Account non associato a una squadra valida nel database.';
        }
    } catch (error) {
        console.error("Errore accesso Firebase/Squadre:", error);
        teamNameDisplay.textContent = 'Errore di Rete';
        messageArea.textContent = 'Impossibile connettersi al database. Controlla la connessione.';
    }
}

// 4. ASCOLTATORI REAL-TIME
function startListeners() {
    const teamRef = db.ref(`SQUADRE/${currentTeamId}`);
    const statusDisplay = document.getElementById('statusDisplay');
    const bettingSection = document.getElementById('bettingSection');
    const segmentBetButtons = document.querySelectorAll('.segment-bet-btn');
    const cashHuntSection = document.getElementById('cashHuntSection');

    const resultRef = db.ref('RISULTATO_ULTIMO_GIRO'); // Riferimento al risultato
    
    // 1. ASCOLTATORE STATO GIOCO (Apre/Chiude le puntate)
    gameStateRef.on('value', snapshot => {
        const state = snapshot.val();
        
        statusDisplay.textContent = `FASE ATTUALE: ${state.status}`;

        const isBetting = state.status === 'BETTING_OPEN';
        const isCashHunt = state.status === 'CASH_HUNT_SELECTION';
        const gameContainer = document.getElementById('game-container')

        const isClosedOrMinigame = !isBetting;
        
        // 1. Visibilità della Sezione Puntate
        bettingSection.classList.toggle('hidden', isClosedOrMinigame);

        // 2. Visibilità della Sezione Minigioco (Cash Hunt)
        cashHuntSection.classList.toggle('hidden', !isCashHunt);
        
        // 3. Abilitazione dei Bottoni di Puntata
        segmentBetButtons.forEach(button => {
            button.disabled = !isBetting;
        });

        if (isCashHunt) {
            // Carica la griglia Cash Hunt solo se non è già stata caricata per questo round
            loadCashHuntData();
            gameContainer.classList.toggle('hidden')
        } else {
            gameContainer.classList.remove('hidden')
        }

        // 5. Gestione colore statusDisplay
        if (isBetting) {
            statusDisplay.classList.remove('bg-danger');
            statusDisplay.classList.add('bg-secondary'); 
        } else {
            // Se non è Betting Open, è rosso (Chiuso/In gioco/Minigioco)
            statusDisplay.classList.remove('bg-secondary');
            statusDisplay.classList.add('bg-danger');
        }
    });

    // 2. 💥 ASCOLTATORE RISULTATO (Triggera il Payout e il Reset)
    resultRef.on('value', snapshot => {
        const resultObject = snapshot.val(); 
        
        // Controlla se il risultato ha la struttura corretta (deve avere roundId e segment)
        if (resultObject && resultObject.segment && resultObject.roundId) {
            
            const currentRoundId = resultObject.roundId;
            const lastProcessedRoundId = localStorage.getItem('lastProcessedRoundId');
            
            // Se il giro attuale è NUOVO, procedi
            if (currentRoundId !== lastProcessedRoundId) {

                let revealPromise = Promise.resolve();
                const isCashHuntResult = resultObject.segment === 'Cash Hunt';
                const isCashHuntActive = !document.getElementById('cashHuntSection').classList.contains('hidden');
                
                if (isCashHuntResult && isCashHuntActive) {
                    
                    // Ottiene i dati di selezione (quale bersaglio ha scelto l'utente)
                    revealPromise = db.ref('CASH_HUNT_RESULT').once('value').then(cashHuntSnapshot => {
                            const cashHuntResult = cashHuntSnapshot.val();
                            // Prende l'indice selezionato dal giocatore (-1 se non ha scelto)
                            const selectedIndex = cashHuntResult ? cashHuntResult.selectedTargetIndex : -1; 
                            
                            // Chiama la nuova funzione di rivelazione
                            return showCashHuntReveal(selectedIndex, resultObject.finalMultiplier);
                        });
                }

                console.log(`NUOVO GIRO RILEVATO: ${currentRoundId}. Elaborazione risultato: ${resultObject.segment}`); // 💥 Log di verifica
                
                // Avvia la logica di Payout e Reset
                revealPromise
                    .then(() => {
                        // Quando revealPromise si risolve (dopo l'animazione Cash Hunt O immediatamente se non è Cash Hunt),
                        // eseguiamo processRoundResult
                        return processRoundResult(resultObject.segment, resultObject.finalMultiplier);
                    })
                    .then((payoutResult) => {
                       if (payoutResult && payoutResult.committed) {
                        localStorage.setItem('lastProcessedRoundId', currentRoundId);
                        console.log(`Transazione completata. Salvato ID giro: ${currentRoundId}`);
                    } else {
                        console.warn("Transazione Payout non committata o fallita. Non aggiornato lastProcessedRoundId.");
                    }
                    })
                    .catch(error => {
                        // Qualsiasi errore nella catena (rivelazione o payout) viene catturato qui
                        console.error("Errore nell'elaborazione del risultato con transazione:", error);
                        // Non aggiornare il lastProcessedRoundId in caso di errore
                    });
            } else {
                console.log(`Risultato ${currentRoundId} già elaborato. Ignorato.`);
            }
        } else {
            console.log("Nodo RISULTATO_ULTIMO_GIRO incompleto. Attendere il server.");
        }
    });


    // 3. DATI SQUADRA (Aggiorna Saldo e Puntate Attive)
    teamRef.on('value', snapshot => {
        const teamData = snapshot.val();
        if (!teamData) return;

        document.getElementById('saldoDisplay').textContent = `${teamData.saldo || 0}`; 
        renderActiveBets(teamData.puntateAttive || {});
    });
}


// 5. FUNZIONE DI AGGIUSTAMENTO IMPORTO
function adjustBetAmount(delta) {
    const betAmountInput = document.getElementById('betAmountInput');
    let currentAmount = Number(betAmountInput.value);
    let newAmount = currentAmount + delta;
    if (newAmount < 1) newAmount = 1; 
    betAmountInput.value = newAmount;
}


// 6. FUNZIONE DI RENDER PUNTATE ATTIVE
function renderActiveBets(bets) {
    const list = document.getElementById('activeBetsList');
    list.innerHTML = ''; 

    let hasBets = false;
    for (const segment in bets) {
        const amount = bets[segment];
        if (amount > 0) { 
            hasBets = true;
            const item = document.createElement('li');
            item.className = 'bg-gray-700 text-gray-100 p-2 rounded-md shadow-inner text-sm font-semibold'; 
            item.textContent = `Su ${segment}: ${amount}€`;
            list.appendChild(item);
        }
    }

    if (!hasBets) {
        const item = document.createElement('li');
        item.className = 'text-sm italic text-gray-500';
        item.textContent = 'Nessuna puntata piazzata.';
        list.appendChild(item);
    }
}


// 7. FUNZIONE PER PIAZZARE LA PUNTA (Transaction)
async function placeBet(segment) { 
    const betAmountInput = document.getElementById('betAmountInput');
    const messageArea = document.getElementById('messageArea');

    const amount = Number(betAmountInput.value);

    messageArea.textContent = ''; 

    if (amount <= 0 || isNaN(amount)) {
        messageArea.textContent = 'Inserisci un importo valido.';
        return;
    }
    
    const teamRef = db.ref(`SQUADRE/${currentTeamId}`);

    try {
        const result = await teamRef.transaction(currentData => {
            if (currentData === null) {
                messageArea.textContent = 'Errore: dati squadra non disponibili.';
                return;
            }

            const currentSaldo = currentData.saldo || 0;
            const currentBets = currentData.puntateAttive || {};
            const existingBet = currentBets[segment] || 0;
            
            const costOfThisBet = amount;
            
            if (currentSaldo < costOfThisBet) {
                messageArea.textContent = 'Saldo insufficiente per piazzare questa puntata.';
                return;
            }

            // Aggiorna saldo e puntate
            currentData.saldo = currentSaldo - costOfThisBet;
            currentBets[segment] = existingBet + costOfThisBet;
            currentData.puntateAttive = currentBets;

            return currentData;
        });

        if (result && result.committed) {
            messageArea.textContent = `Puntata di ${amount} su ${segment} piazzata con successo!`;
        } else if (result && !result.committed) {
             // La transazione è fallita a causa del return implicito (es. saldo insufficiente)
             // Il messaggio di errore è già stato impostato all'interno del transaction.
        }
        
    } catch (error) {
        console.error("Errore Transazione Puntata:", error);
        messageArea.textContent = 'Errore durante l\'invio della puntata.';
    }
}

function loadCashHuntData() {
    db.ref('CASH_HUNT_ROUND').once('value')
        .then(snapshot => {
            const roundData = snapshot.val();
            if (roundData && roundData.multipliers) {
                roundMultipliers = roundData.multipliers;
                roundIcons = roundData.icons;
                targetSelected = false; // Reset per il nuovo round
                renderCashHuntGrid(); // Rinominata per chiarezza
            } else {
                document.getElementById('cashHuntSection').innerHTML = '<p class="text-center text-red-500">Errore: Dati Cash Hunt non trovati. Attendere Host.</p>';
            }
        });
}

function showCashHuntReveal(selectedIndex, winningMultiplier) {
    return new Promise(resolve => {
        const messageArea = document.getElementById('messageArea');
        const allTargets = document.querySelectorAll('.player-target');
        
        // Se per qualche motivo i moltiplicatori di round non sono disponibili, risolvi subito.
        if (roundMultipliers.length === 0) {
            resolve();
            return;
        }

        // 1. Aggiorna lo stato per la rivelazione
        document.getElementById('player-status').textContent = `RISULTATO RIVELATO: ${winningMultiplier}x!`;
        messageArea.textContent = 'Rivelazione in corso...';
        
        // 2. Mostra tutti i moltiplicatori e applica gli stili di vittoria/sconfitta
        allTargets.forEach((target, index) => {
            // Mostra il valore del moltiplicatore
            target.textContent = `x${roundMultipliers[index]}`; 
            
            // Rimuovi classi interattive/di selezione
            target.classList.remove('bg-gray-600', 'hover:bg-red-500', 'ring-4', 'ring-blue-500', 'ring-offset-4', 'ring-offset-[#2a2a2a]', 'scale-105');
            target.onclick = null; // Blocca tutti i click
            
            if (index === selectedIndex) {
                // Bersaglio selezionato (vincente o perdente, a seconda se si è puntato su Cash Hunt)
                target.classList.add('bg-green-700', 'ring-4', 'ring-yellow-400', 'font-extrabold', 'text-2xl', 'scale-[1.1]');
                target.classList.remove('text-[#ffd700]');
                target.classList.add('text-white');
                messageArea.textContent = `Bersaglio scelto: x${winningMultiplier}! Elaborazione Payout...`;
            } else {
                // Altri bersagli
                target.classList.add('bg-gray-900', 'opacity-60'); 
            }
        });
        
        // 3. Ritardo di 4 secondi per permettere al giocatore di vedere il risultato
        setTimeout(() => {
            resolve(); // Risolve la Promise, consentendo al payout di procedere
        }, 4000); 
    });
}

function renderCashHuntGrid() {
    const cashHuntSection = document.getElementById('cashHuntSection');
    cashHuntSection.innerHTML = ''; // Pulisce la sezione prima di ricostruire
    
    // Aggiungi un div per centrare meglio il titolo e le istruzioni
    const headerContainer = document.createElement('div');
    headerContainer.className = "w-full max-w-7xl mx-auto text-center mb-6"; // Centra il testo all'interno
    headerContainer.innerHTML = `
        <h1 class="text-2xl font-extrabold text-[#ffd700] mb-4">🎯 TROVA IL MOLTIPLICATORE! 🎯</h1>
        <p id="player-status" class="text-xl font-semibold text-[#e0e0e0]">Scegli il tuo bersaglio! Solo il primo conta!</p>
    `;
    cashHuntSection.appendChild(headerContainer);

    const gridContainer = document.createElement('div');
    gridContainer.id = 'player-multiplier-grid';
    
    // CLASSI AGGIORNATE: max-w-7xl + mx-auto per centrare la griglia stessa all'interno di cashHuntSection
    // padding aumentato a p-8
    gridContainer.className = 'w-full max-w-7xl mx-auto p-8 bg-gray-700 rounded-lg shadow-inner min-h-[600px]';
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateColumns = 'repeat(12, 1fr)';
    gridContainer.style.gap = '0.75rem'; // Aumentato il gap tra i bersagli
    
    for (let i = 0; i < roundMultipliers.length; i++) {
        const target = document.createElement('div');
        
        // Aumentato il testo a 6xl, aggiunto border per un look più definito
        target.className = 'player-target flex justify-center items-center text-6xl aspect-square bg-gray-600 hover:bg-red-500 cursor-pointer rounded transition duration-150 shadow-md text-[#ffd700] border-2 border-gray-500';
        
        target.textContent = roundIcons[i]; 
        target.dataset.index = i;
        target.onclick = handlePlayerSelection; 
        gridContainer.appendChild(target);
    }
    
    cashHuntSection.appendChild(gridContainer);
    listenForWinningResult(); 
}

function handlePlayerSelection(event) {
    if (targetSelected) return;
    
    const selectedTarget = event.currentTarget;
    const selectedIndex = parseInt(selectedTarget.dataset.index);

    // 1. Stile selezione locale
    selectedTarget.classList.add('ring-4', 'ring-[#ffd700]', 'ring-offset-4', 'ring-offset-[#2a2a2a]', 'scale-105');
    document.getElementById('player-status').textContent = `Hai scelto il bersaglio #${selectedIndex}! In attesa della rivelazione...`;
    
    targetSelected = true;
    
    // 2. Registra la selezione in Firebase
    db.ref('CASH_HUNT_RESULT').set({
        selectedTargetIndex: selectedIndex,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    })
    .catch(error => {
        console.error("Errore nel salvataggio della selezione:", error);
        targetSelected = false; 
    });
    
    // 3. Disabilita bersagli
    const allTargets = document.querySelectorAll('.player-target');
    allTargets.forEach(t => {
        t.onclick = null;
        t.style.cursor = 'default';
        t.classList.remove('hover:bg-red-500');
    });
}


function listenForWinningResult() {
    db.ref('CASH_HUNT_RESULT').on('value', snapshot => {
        const result = snapshot.val();
        
        if (result && result.selectedTargetIndex !== undefined && !targetSelected) {
            // Un altro giocatore ha scelto
            targetSelected = true;
            document.getElementById('player-status').textContent = `Bersaglio #${result.selectedTargetIndex} scelto da un altro giocatore! In attesa della rivelazione...`;
            
            const allTargets = document.querySelectorAll('.player-target');
            allTargets.forEach(t => {
                t.onclick = null;
                t.style.cursor = 'default';
                t.classList.remove('hover:bg-red-500');
            });

            // Evidenzia il bersaglio vincente
            const winningTarget = document.querySelector(`#player-multiplier-grid [data-index="${result.selectedTargetIndex}"]`);
            if(winningTarget) {
                 winningTarget.classList.add('ring-4', 'ring-blue-500', 'ring-offset-4', 'ring-offset-[#2a2a2a]', 'scale-105');
            }
        }
    });
}

async function processRoundResult(winningSegment, finalMultiplier) {
    const teamRef = db.ref(`SQUADRE/${currentTeamId}`);
    const messageArea = document.getElementById('messageArea');

    let multiplier = Number(finalMultiplier);
    const isCashHunt = winningSegment === 'Cash Hunt';

    // 1. RECUPERO ASINCRONO DEL MOLTIPLICATORE CASH HUNT (CRITICO)
    // Se è Cash Hunt e il moltiplicatore è 0/nullo, lo recuperiamo
    if (isCashHunt && (!multiplier || isNaN(multiplier) || multiplier < 1)) {
        console.warn("Cash Hunt: finalMultiplier non valido. Recupero il moltiplicatore dalla selezione del team...");
        
        try {
            // Legge il risultato del round, dove il server ha scritto i moltiplicatori di tutti i bersagli
            const roundSnapshot = await db.ref('CASH_HUNT_ROUND').once('value');
            const roundData = roundSnapshot.val();
            
            // Assumiamo che la selezione della squadra sia salvata in CASH_HUNT_RESULT/selectedTargetIndex
            const selectionSnapshot = await db.ref('CASH_HUNT_RESULT').once('value'); 
            const resultData = selectionSnapshot.val();

            if (roundData && roundData.multipliers && resultData && resultData.selectedTargetIndex !== undefined) {
                
                const selectedIndex = resultData.selectedTargetIndex;
                const actualMultiplier = roundData.multipliers[selectedIndex];
                
                if (actualMultiplier) {
                    multiplier = Number(actualMultiplier);
                    console.log(`Cash Hunt Moltiplicatore recuperato: ${multiplier}x`);
                }
            }
        } catch (error) {
            console.error("Errore nel recupero dati Cash Hunt per payout:", error);
            // Se fallisce, usiamo un valore di fallback, ma non 0
            multiplier = 2; 
        }
    }
    
    // 2. ESECUZIONE DELLA TRANSAZIONE (DOPO aver ottenuto il moltiplicatore)
    try {
        const result = await teamRef.transaction(currentData => {
            if (currentData === null) return;
            
            const currentSaldo = currentData.saldo || 0;
            const activeBets = currentData.puntateAttive || {};
            const betOnWinner = activeBets[winningSegment] || 0;
            
            let winnings = 0;
            let multiplierToUse = 0; 
            let message = `Il risultato è ${winningSegment}. Nessuna vittoria.`; // Messaggio di default

            if (betOnWinner > 0) {
                
                // Determina il moltiplicatore corretto
                if (isCashHunt) {
                    // Usa il moltiplicatore recuperato dal punto 1
                    multiplierToUse = multiplier; 
                } else {
                    // Per numeri o altri minigiochi, usa il finalMultiplier (o il valore di base)
                    multiplierToUse = Number(finalMultiplier) || parseInt(winningSegment);
                }
                
                // Calcola le vincite (anche se multiplierToUse è 0, il calcolo è corretto)
                winnings = betOnWinner * multiplierToUse;
                
                if (winnings > 0) {
                     message = `HAI VINTO! ${winnings}€ su ${winningSegment}!`;
                } else {
                     message = `Puntata su ${winningSegment} persa.`; // O Cash Hunt non ha pagato (moltiplicatore zero)
                }

            }
            
            // === 💥 SOLUZIONE AL PUNTO 2 (PUNTATA ATTIVA) 💥 ===
            // 3. Aggiorna il saldo con le vincite
            currentData.saldo = currentSaldo + winnings;
            
            // 4. AZZERA SEMPRE LE PUNTATE (indipendentemente da vittoria o sconfitta)
            currentData.puntateAttive = {};
            
            // Aggiorna l'area messaggio (fuori dalla transazione l'aggiornamento UI è più sicuro)
            setTimeout(() => {
                messageArea.textContent = message;
            }, 100); 

            return currentData; 
        });

        return result;
        
    } catch (error) {
        console.error("Errore critico nella transazione del payout:", error);
        messageArea.textContent = `Errore Payout! Controlla la console.`;
    }
}

function checkAndProcessResult() {
    const resultRef = db.ref('RISULTATO_ULTIMO_GIRO');
    
    resultRef.once('value').then(snapshot => {
        const resultObject = snapshot.val(); 
        
        if (resultObject && resultObject.segment && resultObject.roundId) {
            const currentRoundId = resultObject.roundId;
            const lastProcessedRoundId = localStorage.getItem('lastProcessedRoundId');
            
            // Se il giro attuale è NUOVO, procedi (usa la logica esistente)
            if (currentRoundId !== lastProcessedRoundId) {
                console.log(`FORZATURA: Rilevato NUOVO GIRO ${currentRoundId} tramite cambio di stato.`); 

                processRoundResult(resultObject.segment, resultObject.finalMultiplier)
                    .then(() => {
                        localStorage.setItem('lastProcessedRoundId', currentRoundId);
                    })
                    .catch(error => {
                        console.error("Errore forzato elaborazione risultato:", error);
                    });
            } else {
                console.log(`FORZATURA: Risultato ${currentRoundId} già elaborato.`);
            }
        }
    });
}