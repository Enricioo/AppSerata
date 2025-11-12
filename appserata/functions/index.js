/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { setGlobalOptions } = require("firebase-functions");
const { onCall } = require("firebase-functions/https");
const admin = require('firebase-admin');

setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();
const db = admin.database();

// Totale 54 segmenti
const segments = [
            'CrazyTime', '1', '2', '5', '1', '2', 'Pachinko', '1', '5', '1', 
            '2', '1', 'CoinFlip', '1', '2', '1', '10', '2', 'CashHunt', '1', 
            '2', '1', '5', '1', 'CoinFlip', '1', '5', '2', '10', '1', 
            'Pachinko', '1', '2', '5', '1', '2', 'CoinFlip', '1', '10', '1',
            '5', '1', 'CashHunt', '1', '2', '5', '1', '2', 'CoinFlip', '2',
            '1', '10', '2', '1' 
        ];

const multipliers = {
    '1': 1, '2': 2, '5': 5, '10': 10, 
    'CoinFlip': 2, 'CashHunt': 5, 'Pachinko': 10, 'CrazyTime': 20 
};


exports.piazzascommessa = onCall(async (data, context) => {

    const { teamId, segmentoScelto, importoPuntato } = data;

    // 1. Validazione di base
    if (!teamId || !segmentoScelto || !importoPuntato || typeof importoPuntato !== 'number' || importoPuntato <= 0) {
        throw new Error('Dati di puntata mancanti o non validi.');
    }

    // 2. Transazione sicura sul saldo
    try {
        const saldoAggiornato = await db.ref(`SQUADRE/${teamId}/saldo`).transaction(currentSaldo => {
            if (currentSaldo === null) {
                return undefined; // Squadra non trovata
            }
            if (currentSaldo < importoPuntato) {
                // Genera un errore interno che verrà gestito dal blocco catch
                throw new Error("Saldo insufficiente!"); 
            }
            return currentSaldo - importoPuntato; // Nuovo saldo da scrivere
        });

        // 3. Registra la scommessa se la transazione è andata a buon fine
        if (saldoAggiornato.committed) {
            await db.ref('PUNTATE_ATTUALI').push({
                teamId: teamId,
                segmento: segmentoScelto,
                valorePuntato: importoPuntato,
                timestamp: admin.database.ServerValue.TIMESTAMP
            });

            return { success: true, message: `${teamId} ha puntato ${importoPuntato} su ${segmentoScelto}.` };
            
        } else {
            // Se la transazione non è stata completata (es. 'Saldo insufficiente!' o conflitto)
            return { success: false, message: "Puntata fallita: verifica il saldo." };
        }

    } catch (error) {
        // Cattura l'errore generato dalla transazione e lo restituisce al client
        if (error.message.includes("Saldo insufficiente")) {
             throw new Error('Saldo insufficiente per la puntata.');
        }
        throw new Error(`Errore interno nel piazzare la scommessa: ${error.message}`);
    }
});

// Funzione per l'host del gioco per avviare il giro
exports.giraRuota = onCall(async (data, context) => {
    // 1. Controlla che il giro non sia già in corso o che ci sia un solo "host" ad attivare
    // (Per semplicità, saltiamo la logica di autenticazione dell'host per ora)

    // 2. Esegui il tuo RNG ponderato
    // **********************************************
    // QUI DEVI INSERIRE LA TUA LOGICA JS ESISTENTE
    // Esempio:
    const topslotOutcome = calcolaTopSlot();
    const wheelOutcome = calcolaRisultatoRuota(segments); // Usa la funzione creata

    let segmentoVincente = wheelOutcome.segmentoVincente;
    let moltiplicatore = baseMultipliers[segmentoVincente] || 1; // Usa il moltiplicatore base

    let topslotTarget = topslotOutcome.target;
    let topslotMultiplier = topslotOutcome.multiplier;
    let messaggioTopSlot = "";

    if (segmentoVincente === topslotTarget) {
    moltiplicatore = moltiplicatore * topslotMultiplier;
    messaggioTopSlot = ` *BONUS!* Top Slot X${topslotMultiplier} applicato!`;
}
    // **********************************************
    
    // PER ORA, USIAMO UN RISULTATO FITTIZIO PER TESTARE IL FLOW
    const numeroGiro = await db.ref('GIOCO_STATO/turnoCorrente').once('value').then(snap => snap.val() || 1);

    // Aggiorna lo stato nel DB prima del calcolo (Ruota in Animazione)
    await db.ref('GIOCO_STATO').update({
        fase: 'IN_GIRO',
        timer: 0
    });

    // 3. Recupera tutte le puntate per questo giro
    const puntateSnap = await db.ref('PUNTATE_ATTUALI').once('value');
    const puntate = puntateSnap.val() || {};

    // 4. Calcolo dei Payout
    const aggiornamentiSaldo = {}; // Contiene i saldi finali di tutte le squadre

    for (const puntataId in puntate) {
        const p = puntate[puntataId];
        const teamId = p.teamId;
        const puntata = p.valorePuntato;
        const scelta = p.segmento;
        let importoVinto = 0;

        // Assicurati che ogni squadra abbia un punto di partenza per il saldo aggiornato
        if (!aggiornamentiSaldo[teamId]) {
            // Se non hai ancora il saldo di partenza, recuperalo (o usa 0)
            const saldoAttualeSnap = await db.ref(`SQUADRE/${teamId}/saldo`).once('value');
            aggiornamentiSaldo[teamId] = saldoAttualeSnap.val() || 0;
        }

        if (scelta === segmentoVincente) {
            // Esegui qui il tuo calcolo di vincita: Vincita = Puntata * Moltiplicatore
            importoVinto = puntata * moltiplicatore;
        }

        // Aggiunge la vincita (0 se non ha vinto) al saldo
        aggiornamentiSaldo[teamId] += importoVinto;
    }

    // 5. Applica gli aggiornamenti di Saldo al Database
    const saldiDaAggiornare = {};
    for (const teamId in aggiornamentiSaldo) {
        saldiDaAggiornare[`SQUADRE/${teamId}/saldo`] = aggiornamentiSaldo[teamId];
    }
    
    // Aggiornamento massivo dei saldi
    await db.ref('/').update(saldiDaAggiornare);


    // 6. Aggiorna il Risultato e lo Stato di Gioco (tutti i client si aggiorneranno)
    await db.ref('RISULTATO_ULTIMO_GIRO').set({
        numeroGiro: numeroGiro,
        segmentoVincente: segmentoVincente,
        moltiplicatoreFinale: moltiplicatore,
        messaggio: `Risultato: ${segmentoVincente} x${moltiplicatore}!${messaggioTopSlot}`,
        topslotTarget: topslotTarget,
        topslotMultiplier: topslotMultiplier
    });
    
    // Svuota le puntate per il prossimo giro
    await db.ref('PUNTATE_ATTUALI').remove();

    // Aggiorna lo stato di gioco per il prossimo turno
    await db.ref('GIOCO_STATO').update({
        turnoCorrente: numeroGiro + 1,
        fase: 'APERTURA_PUNTATE',
        timer: 20 // Tempo per il prossimo turno
    });

    return { message: `Giro ${numeroGiro} completato. Vincitore: ${segmentoVincente} x${moltiplicatore}. Payout eseguiti.` };
});

function spinTopSlot() {
    // Logica per scegliere un Moltiplicatore Casuale
    const possibleMultipliers = [2, 3, 4, 5, 7, 10, 20, 30, 40, 50, 100];
    const chosenMultiplier = possibleMultipliers[Math.floor(Math.random() * possibleMultipliers.length)];
    
    // Logica per scegliere un Target Casuale
    const bettableSegments = ['1', '2', '5', '10', 'CoinFlip', 'CashHunt', 'Pachinko', 'CrazyTime'];
    const chosenTarget = bettableSegments[Math.floor(Math.random() * bettableSegments.length)];
    
    return { 
        target: chosenTarget, 
        multiplier: chosenMultiplier 
    };
}

function spinMainWheel(segments) {
    // NOTA: Il tuo codice usa Math.random() che è un buon RNG per il party.
    const chosenSegmentIndex = Math.floor(Math.random() * segments.length);
    const chosenResult = segments[chosenSegmentIndex];

    return {
        segmentoVincente: chosenResult,
        indice: chosenSegmentIndex
    };
}



