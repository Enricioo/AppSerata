document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const squadraInput = document.getElementById('squadra-input');
    const passwordInput = document.getElementById('password-input');
    const submitButton = document.getElementById('login-submit-button');
    const errorMessage = document.getElementById('login-error-message');

    submitButton.addEventListener('click', () => {
        const squadra = squadraInput.value.trim();
        const password = passwordInput.value;
        const email = `${squadra}@gioco.locale`;
        
        // Pulizia degli errori
        errorMessage.textContent = ''; 

        if (!squadra || !password) {
            errorMessage.textContent = 'Inserisci squadra e password.';
            return;
        }

        // Tenta il Login
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Autenticazione Riuscita!
                const user = userCredential.user;
                let teamIdToSave = user.uid;

                // Logica di Riconoscimento Admin
                if (user.email === 'admin@gioco.locale') {
                    // SE ADMIN: Salva l'ID speciale di controllo
                    teamIdToSave = 'ADMIN_CONTROL_PANEL';
                    window.location.href = 'crazytime.html'; 
                } else {
                    // SE GIOCATORE: Usa l'UID di Firebase come ID Squadra
                    teamIdToSave = user.uid;
                    // Reindirizza alla pagina del gioco/puntata
                    window.location.href = 'puntate.html';
                }
                
                // Salva l'ID Admin/Giocatore
                localStorage.setItem('gameTeamId', teamIdToSave);

                
            })
            .catch((error) => {
                // Autenticazione Fallita
                let msg;
                if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                    msg = 'ID Squadra o Password non corretti.';
                } else {
                    msg = 'Errore di accesso. Riprova.';
                }
                errorMessage.textContent = msg;
                console.error("Errore di Login: ", error);
            });
    });
});