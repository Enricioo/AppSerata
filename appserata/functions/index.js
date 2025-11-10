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





