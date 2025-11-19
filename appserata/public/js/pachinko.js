// =====================================================================
// === PACHINKO GAME: JAVASCRIPT FINALE (16 SLOT & DOUBLE FISSO) ===
// =====================================================================

const { Engine, Render, Runner, Bodies, World, Events, Body } = Matter;
const db = firebase.database(); 
// Elementi DOM (Assumendo che gli ID siano corretti)
const boardContainer = document.getElementById('pachinkoBoard');
const dropPointsContainer = document.getElementById('dropPointsContainer');
const statusText = document.getElementById('statusText');
const dropButton = document.getElementById('dropButton');

const PACHINKO_DOUBLE = 'DOUBLE';
let multiplierOdds = [
    { value: PACHINKO_DOUBLE, odd: 5.47 },
    { value: 2, odd: 2.34 },
    { value: 3, odd: 3.13 },
    { value: 5, odd: 6.25 },
    { value: 7, odd: 21.88 },
    { value: 10, odd: 23.44 },
    { value: 15, odd: 14.06 },
    { value: 20, odd: 8.98 },
    { value: 25, odd: 3.91 },
    { value: 35, odd: 3.52 },
    { value: 40, odd: 1.95 },
    { value: 50, odd: 2.73 },
    { value: 100, odd: 1.56 },
    { value: 200, odd: 0.78 }
];
let topSlotEvent = null;
let topSlotMultiplier = 1;
let currentMultipliers = []; // Inizializzato vuoto, verrà popolato da resetBoard()
let currentRoundMultiplier = 1; // Moltiplicatore attivo (1, 2, 4, 8, ...)
let ballBody = null; 
let multiplierBodies = []; // Array che contiene i corpi sensore di Matter.js

// Variabili di configurazione fisica e grafica
const BOARD_WIDTH = 600; 
const BOARD_HEIGHT = 800; 
const BALL_RADIUS = 9; 
const X_ALIGNMENT_OFFSET = 0; 

const engine = Engine.create({
    positionIterations: 10, 
    velocityIterations: 8
});
const world = engine.world;
let render; 

// === 1. FUNZIONI DI BASE PER LA FISICA ===

async function registerFinalResult(finalMultiplier) { 
    const resultArea = document.getElementById('statusText');
    
    if (typeof db === 'undefined' || typeof firebase === 'undefined' || !firebase.database.ServerValue) {
        console.error("ERRORE: Oggetto Firebase (db o ServerValue) non definito. Impossibile registrare il risultato.");
        resultArea.textContent = "ERRORE CRITICO: Configurazione Firebase mancante.";
        return false;
    }
    
    try {
        // Legge lo stato del gioco per ottenere il nome del bonus e l'ID del round
        const snapshot = await db.ref('GAME_STATE').once('value');
        const gameState = snapshot.val();
        
        // Controllo robusto dei dati
        if (!gameState || !gameState.activeBonus || !gameState.currentRoundId) {
            console.error("Dati di stato del gioco incompleti. Impossibile registrare il risultato.");
            resultArea.textContent = "ERRORE CRITICO: Dati round mancanti. Ritorno...";
            // setTimeout(() => { window.location.href = "../crazytime.html"; }, 3000); 
            return false;
        }
        
        const winningTarget = gameState.activeBonus; 
        const roundId = gameState.currentRoundId;
        
        // 1. Scrive il risultato finale su RISULTATO_ULTIMO_GIRO
        await db.ref('RISULTATO_ULTIMO_GIRO').set({
            segment: winningTarget, 
            finalMultiplier: finalMultiplier, 
            roundId: roundId,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });

        // 2. Pulisce lo stato del bonus e reimposta su WAITING
        await db.ref('GAME_STATE').update({
            status: 'WAITING_FOR_SPIN', // Torna allo stato di attesa del giro
            activeBonus: null,
            currentRoundId: null 
        });

        console.log(`Risultato ${finalMultiplier}x registrato su Firebase con successo.`);
        // Il pagamento effettivo ai giocatori deve avvenire tramite una Cloud Function
        return true;
        
    } catch (error) {
        console.error("Errore durante la scrittura del risultato:", error);
        resultArea.textContent = `ERRORE CRITICO: ${error.message}`;
        return false;
    }
}

/**
 * Aggiorna le etichette dei sensori Matter.js con i nuovi valori raddoppiati.
 */
function updateSensorLabels() {
    multiplierBodies.forEach((body, index) => {
        const baseValue = currentMultipliers[index];
        
        // Calcola il valore finale (valore base * currentRoundMultiplier)
        const finalValue = typeof baseValue === 'number' 
                                ? baseValue * currentRoundMultiplier
                                : PACHINKO_DOUBLE;
        
        const sensorValue = finalValue;

        const newLabel = `multiplier_idx${index}_val${sensorValue}`;
        Body.set(body, 'label', newLabel);
    });
}


function setupPhysics() {
    // Gravità rallentata
    world.gravity.y = 0.3; 

    render = Render.create({
        element: boardContainer,
        engine: engine,
        options: {
            width: BOARD_WIDTH,
            height: BOARD_HEIGHT,
            wireframes: false, 
            background: 'transparent' 
        }
    });

    Render.run(render);
    Runner.run(Runner.create(), engine);

    boardContainer.style.overflow = 'visible'; 
    boardContainer.style.position = 'relative';

    World.clear(world, false); 

    const WALL_THICKNESS = 10;
    const wallOptionsInvisible = { isStatic: true, render: { fillStyle: 'transparent', strokeStyle: 'transparent' } }; 
    
    // Muri di confine
    World.add(world, [
        Bodies.rectangle(BOARD_WIDTH / 2, -50, BOARD_WIDTH, 100, wallOptionsInvisible), 
        Bodies.rectangle(-WALL_THICKNESS / 2, BOARD_HEIGHT / 2, WALL_THICKNESS, BOARD_HEIGHT, wallOptionsInvisible), 
        Bodies.rectangle(BOARD_WIDTH + WALL_THICKNESS / 2, BOARD_HEIGHT / 2, WALL_THICKNESS, BOARD_HEIGHT, wallOptionsInvisible),
        Bodies.rectangle(BOARD_WIDTH / 2, BOARD_HEIGHT, BOARD_WIDTH, WALL_THICKNESS, wallOptionsInvisible)
    ]);
    
    // Genera i pioli (pegs)
    const PEG_RADIUS = 2; 
    const ROWS = 11;
    const COLS = 16; 
    const spacingX = BOARD_WIDTH / COLS;
    const spacingY = BOARD_HEIGHT / ROWS;
    const VERTICAL_OFFSET = -30;
    
    for (let r = 1; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const xOffset = r % 2 === 0 ? spacingX / 2 : 0;
            const x = c * spacingX + xOffset + spacingX / 2; 
            const y = r * spacingY + VERTICAL_OFFSET;
            
            World.add(world, Bodies.circle(x, y, PEG_RADIUS, { 
                isStatic: true, 
                restitution: 0.5, 
                label: 'peg',
                render: { fillStyle: 'rgba(255, 255, 255, 0.7)' }
            }));
        }
    }

    // Divisori
    const SLOT_HEIGHT_PX = 100; 
    const DIVIDER_WIDTH = 4; // Modificato a 4px per un divisore leggermente più sottile
    const DIVIDER_HEIGHT = SLOT_HEIGHT_PX; 

    const numSlots = currentMultipliers.length; // 16
    const numDivisors = numSlots; // 17
    const divisorSpacing = BOARD_WIDTH / numSlots; // 600 / 16 = 37.5px
    
    for (let i = 0; i < numDivisors; i++) {
        // 💥 CORREZIONE: Rimosso X_ALIGNMENT_OFFSET. Allineamento da 0 a 600.
        const x = i * divisorSpacing; 
        const yPosition = BOARD_HEIGHT - 10; 
        
        World.add(world, Bodies.rectangle(x, yPosition, DIVIDER_WIDTH, DIVIDER_HEIGHT, { 
            isStatic: true,
            label: 'divisor',
            render: { fillStyle: '#ffd700' } 
        }));
    }

    // Zone sensore invisibili
    multiplierBodies = [];
    currentMultipliers.forEach((value, index) => {
        // 💥 CORREZIONE: Usa la larghezza corretta (37.5px) per slotWidth
        const slotWidth = divisorSpacing; // Larghezza di uno slot
        
        // Calcola la posizione centrale del sensore
        // 💥 CORREZIONE: Rimosso X_ALIGNMENT_OFFSET
        const x = index * slotWidth + slotWidth / 2; 

        const sensorYPosition = BOARD_HEIGHT - 10; 
        const sensorWidth = slotWidth - DIVIDER_WIDTH;
        
        const sensorValue = typeof value === 'number' ? `${value * currentRoundMultiplier}` : value;

        const body = Bodies.rectangle(x, sensorYPosition, sensorWidth, DIVIDER_HEIGHT, { 
            isStatic: true,
            isSensor: true, 
            label: `multiplier_idx${index}_val${sensorValue}`, 
            render: { fillStyle: 'transparent' } 
        });
        multiplierBodies.push(body);
    });
    World.add(world, multiplierBodies);
    
    // Aggiorna le label iniziali
    updateSensorLabels();
}

function launchBall(dropPointIndex) {
    if (ballBody) {
        World.remove(world, ballBody);
    }
    
    const slotWidth = BOARD_WIDTH / currentMultipliers.length;
    // 💥 CORREZIONE: Rimosso X_ALIGNMENT_OFFSET
    const startX = dropPointIndex * slotWidth + slotWidth / 2; 
    
    ballBody = Bodies.circle(startX, 10, BALL_RADIUS, {
        restitution: 0.6, 
        friction: 0.001,
        density: 1.0,
        label: 'ball',
        render: { fillStyle: '#ff0000', strokeStyle: '#ffffff', lineWidth: 2 }
    });
    
    World.add(world, ballBody);
    Body.applyForce(ballBody, ballBody.position, { 
        x: (Math.random() - 0.5) * 0.05, 
        y: 0.01 
    });
}

function setupCollisionHandler(resolveCallback) {
    const collisionListener = (event) => {
        const pairs = event.pairs;
        for (const pair of pairs) {
            let ball = pair.bodyA.label === 'ball' ? pair.bodyA : pair.bodyB;
            let sensor = pair.bodyA.label.startsWith('multiplier_') ? pair.bodyA : pair.bodyB;
            
            if (ball.label === 'ball' && sensor.label.startsWith('multiplier_')) {
                Events.off(engine, 'collisionStart', collisionListener);
                
                setTimeout(() => {
                    World.remove(world, ball);
                    ballBody = null;
                    
                    const labelParts = sensor.label.split('_');
                    const winningIndex = parseInt(labelParts[1].replace('idx', '')); 
                    const resultValue = labelParts[2].replace('val', '');         
                    
                    resolveCallback({ index: winningIndex, value: resultValue }); 
                }, 500); 
                return;
            }
        }
    };
    
    Events.on(engine, 'collisionStart', collisionListener);
}

function startDropPhysics(dropPointIndex) {
    return new Promise(resolve => {
        launchBall(dropPointIndex);
        setupCollisionHandler(resolve);

        setTimeout(() => {
            if (ballBody) {
                World.remove(world, ballBody);
                ballBody = null;
                Events.off(engine, 'collisionStart'); 
                resolve(null);
            }
        }, 15000); 
    });
}

// === 2. FUNZIONI DI GIOCO HTML/VISUALE ===

function setupBoard() {
    const numDropPoints = currentMultipliers.length; 
    dropPointsContainer.innerHTML = '';
    
    for(let i = 0; i < numDropPoints; i++) {
        const dropPoint = document.createElement('div');
        dropPoint.className = 'drop-point';
        dropPoint.id = `drop-point-${i}`;
        dropPointsContainer.appendChild(dropPoint);
    }

    const slotsContainer = document.getElementById('multiplierSlots');
    slotsContainer.innerHTML = '';
    currentMultipliers.forEach((baseValue, index) => {
        const slot = document.createElement('div');
        slot.className = 'slot';
        
        // Applica il moltiplicatore del round e del top slot
        const finalValue = typeof baseValue === 'number' 
                           ? baseValue * currentRoundMultiplier 
                           : PACHINKO_DOUBLE;
        
        const displayValue = typeof finalValue === 'number' ? `${finalValue}x` : finalValue;
        
        slot.innerHTML = `<span class="vertical-text-all">${displayValue}</span>`;

        slot.id = `slot-${index}`;
        slotsContainer.appendChild(slot);
    });
}

function weightedRandomSelection() {
    // 💥 CORREZIONE: Utilizza 'multiplierOdds' (minuscolo)
    let totalWeight = multiplierOdds.reduce((sum, item) => sum + item.odd, 0); 
    let randomNumber = Math.random() * totalWeight;

    // 💥 CORREZIONE: Utilizza 'multiplierOdds' (minuscolo)
    for (const item of multiplierOdds) { 
        randomNumber -= item.odd;
        if (randomNumber <= 0) {
            return item.value;
        }
    }
    // 💥 CORREZIONE: Utilizza 'multiplierOdds' (minuscolo)
    return multiplierOdds[multiplierOdds.length - 1].value; 
}

function generateRandomInitialMultipliers() {
    const totalSlots = 16; 
    const newMultipliers = [];
    for (let i = 0; i < totalSlots; i++) {
        newMultipliers.push(weightedRandomSelection());
    }
    return newMultipliers;
}

function resetBoard() {
    if (ballBody) {
        World.remove(world, ballBody);
        ballBody = null;
    }

    const randomBaseMultipliers = generateRandomInitialMultipliers();

    // Applica solo il Top Slot Multiplier alla base (currentRoundMultiplier è sempre 1 all'inizio)
    currentMultipliers = randomBaseMultipliers.map(val => 
        typeof val === 'number' ? val * topSlotMultiplier : PACHINKO_DOUBLE
    );

    currentRoundMultiplier = 1; // Resetta il moltiplicatore DOUBLE a 1

    shuffleArray(currentMultipliers);
    setupBoard(); 
    setupPhysics(); // Reinizializza la fisica con i nuovi sensori
    updateSensorLabels();

    const slotsContainer = document.getElementById('multiplierSlots');
    slotsContainer.querySelectorAll('.slot').forEach((slot) => {
        slot.style.backgroundColor = 'transparent';
        slot.style.color = 'white';
        slot.querySelector('.vertical-text-all').classList.remove('double-animation'); 
    });

    dropPointsContainer.querySelectorAll('.drop-point').forEach(dp => {
        dp.style.boxShadow = 'none';
        dp.style.backgroundColor = 'transparent';
    });
    
    statusText.textContent = "Pronto per il Prossimo Lancio";
    dropButton.textContent = "▶️ CLICCA PER AVVIARE LA CADUTA";
    dropButton.disabled = false;
}

/**
 * Funzione di raddoppio: raddoppia i valori visivi e i sensori tramite currentRoundMultiplier.
 */
function doubleMultipliers() {

    currentRoundMultiplier *= 2;
    
    // Aggiorna la visualizzazione HTML usando il nuovo currentRoundMultiplier
    setupBoard(); 
    
    // Aggiorna le etichette dei sensori Matter.js
    updateSensorLabels(); 
}

function shuffleMultipliers() {
    // Questa funzione non è utilizzata nel loop principale ma è mantenuta per completezza.
    shuffleArray(currentMultipliers);
    setupBoard(); 
    updateSensorLabels(); 
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function animateSlotSelection() {
    return new Promise(async (resolve) => {
        const dropPoints = dropPointsContainer.querySelectorAll('.drop-point'); 
        const numSlots = dropPoints.length;
        const totalRolls = numSlots * 3 + Math.floor(Math.random() * numSlots); 
        let currentSlot = 0;
        
        statusText.textContent = "Selezione Casuale Punto di Caduta...";

        for (let i = 0; i < totalRolls; i++) {
            dropPoints[(currentSlot - 1 + numSlots) % numSlots].style.boxShadow = 'none';
            dropPoints[(currentSlot - 1 + numSlots) % numSlots].style.backgroundColor = 'transparent';
            
            dropPoints[currentSlot].style.boxShadow = '0 0 20px 5px #00ff00'; 
            dropPoints[currentSlot].style.backgroundColor = '#006400'; 
            
            const speed = 50 + Math.max(0, 100 - i * 5); 
            await new Promise(r => setTimeout(r, speed));
            
            currentSlot = (currentSlot + 1) % numSlots;
        }

        const winningIndex = (currentSlot - 1 + numSlots) % numSlots;
        
        dropPoints.forEach((s, index) => {
            s.style.boxShadow = 'none';
            s.style.backgroundColor = 'transparent';
            if (index === winningIndex) {
                s.style.boxShadow = '0 0 30px 10px #ff0000'; 
                s.style.backgroundColor = '#8B0000'; 
            }
        });
        
        statusText.textContent = `LANCIO PALLINA`;
        
        await new Promise(r => setTimeout(r, 1000));
        
        dropPoints[winningIndex].style.backgroundColor = 'transparent'; 

        resolve(winningIndex);
    });
}

// === 3. LOOP DI GIOCO FINALE (Attivato dal click) ===

async function handlePachinkoDrop() {
    if (dropButton.disabled) return; 

    dropButton.disabled = true;
    dropButton.textContent = "GIOCO IN CORSO...";
    
    let continueDrop = true;
    
    while (continueDrop) {

        const dropPointIndex = await animateSlotSelection();

        statusText.textContent = "Palla in Caduta...";
        const result = await startDropPhysics(dropPointIndex); 
        
        if (result === null || result.value === undefined) {
             statusText.textContent = "Errore: La pallina si è persa o il tempo è scaduto.";
             break;
        }

        const { index: winningIndex, value: resultValue } = result;

        const winningSlot = document.getElementById(`slot-${winningIndex}`);
        if(winningSlot) {
            winningSlot.style.backgroundColor = 'yellow';
            winningSlot.style.color = 'black';
        }

        if (resultValue === PACHINKO_DOUBLE) {
            statusText.textContent = "DOUBLE! I moltiplicatori sono raddoppiati!";
            await animateDoubleTransition(winningIndex);
            doubleMultipliers(); 
            // Aspetta 3 secondi per mostrare l'animazione e il raddoppio
            await new Promise(resolve => setTimeout(resolve, 3000));
            
        } else {
            continueDrop = false; 
            
            const finalPayoutMultiplier = parseFloat(resultValue);
            statusText.textContent = `RISULTATO FINALE: ${finalPayoutMultiplier}x! Registrazione in corso su Firebase...`;
            
            // Evidenzia la slot vincente normale (come fatto nel tuo codice precedente)
            const winningSlot = document.getElementById(`slot-${winningIndex}`);
            if(winningSlot) {
                winningSlot.style.backgroundColor = 'yellow';
                winningSlot.style.color = 'black';
            }
            
            const registrationSuccess = await registerFinalResult(finalPayoutMultiplier);
            
            if (registrationSuccess) {
                // Tempo per mostrare il risultato finale all'utente
                await new Promise(resolve => setTimeout(resolve, 3000)); 

                statusText.textContent = "Risultato registrato. Tornando alla Ruota...";
                // Usa l'URL che hai specificato nel tuo codice CoinFlip
                setTimeout(() => {
                    window.location.href = "../crazytime.html"; 
                }, 2000); // 2 secondi di ritardo prima del reindirizzamento
                
            } else {
                // La funzione registerFinalResult gestisce già gli errori, ma lasciamo un fallback.
                setTimeout(() => {
                    resetBoard();
                    dropButton.disabled = false; 
                }, 5000);
            }
        }
    }
}

function animateDoubleTransition(winningIndex) {
    return new Promise(resolve => {
        const slotsContainer = document.getElementById('multiplierSlots');
        
        // Applica l'animazione di "uscita" a tutti gli slot.
        slotsContainer.querySelectorAll('.slot').forEach(slot => {
            // Aggiungi una classe che fa sparire o ruotare la slot (p. es., flip-out)
            slot.classList.add('flip-out');
        });

        // Dopo un breve ritardo aggiorniamo i valori e applichiamo l'animazione di "entrata".
        setTimeout(() => {
            
            doubleMultipliers(); 

            slotsContainer.querySelectorAll('.slot').forEach(slot => {
                // Rimuovi l'animazione di uscita e prepara l'animazione di entrata
                slot.classList.remove('flip-out');
                slot.classList.add('flip-in');
            });
            
            // 3. Tempo totale dell'animazione
            setTimeout(() => {
                // Rimuoviamo l'animazione di entrata una volta finita
                slotsContainer.querySelectorAll('.slot').forEach(slot => {
                    slot.classList.remove('flip-in');
                });
                
                resolve();
            }, 600); // Durata di 'flip-in'
            
        }, 400); // Durata di 'flip-out'
        
        // 4. Animiamo la slot DOUBLE vincente
        const winningSlot = document.getElementById(`slot-${winningIndex}`);
        if(winningSlot) {
            winningSlot.style.boxShadow = '0 0 30px 10px #00FFFF'; // Effetto luce
            setTimeout(() => {
                 winningSlot.style.boxShadow = 'none';
            }, 1000); 
        }
    });
}

async function loadTopSlotData() {
    if (typeof db === 'undefined') {
        console.error("ERRORE: Oggetto Firebase 'db' non definito.");
        return;
    }

    try {
        // Assumo che il risultato sia qui (adatta il percorso se necessario)
        const snapshot = await db.ref('LAST_TOPSLOT_RESULT').once('value'); 
        const result = snapshot.val(); 

        if (result && result.event && result.multiplier) {
            topSlotEvent = result.event;
            
            // Applica il moltiplicatore solo se l'evento è "Pachinko"
            if (topSlotEvent.toUpperCase() === 'PACHINKO') {
                topSlotMultiplier = parseFloat(result.multiplier);
                console.log(`Moltiplicatore Top Slot Pachinko caricato: ${topSlotMultiplier}x`);
            } else {
                console.log(`Top Slot vinto: ${topSlotEvent}. Nessun moltiplicatore applicato al Pachinko.`);
                topSlotMultiplier = 1; // Nessun effetto se è Coinflip o Cash Hunt, etc.
            }
        } else {
            console.log("Nessun dato Top Slot valido trovato. Uso moltiplicatore 1x.");
            topSlotMultiplier = 1;
        }

    } catch (error) {
        console.error("Errore nel caricamento dei dati Top Slot:", error);
        topSlotMultiplier = 1;
    }
}

// === 4. INIZIALIZZAZIONE GLOBALE ===

document.addEventListener('DOMContentLoaded', async () => {
    // setupPhysics(); // Verrà chiamato da resetBoard
    
    await loadTopSlotData();
    
    resetBoard(); 

    if (dropButton) {
        dropButton.addEventListener('click', handlePachinkoDrop);
    }
});