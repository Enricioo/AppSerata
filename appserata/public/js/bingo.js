document.addEventListener('DOMContentLoaded', () => {
    const board = document.getElementById('bingo-board');
    const drawButton = document.getElementById('draw-button');
    const currentNumberDisplay = document.getElementById('current-number-display');
    const drawnCountDisplay = document.getElementById('drawn-count');
    
    const totalNumbers = 90;
    let availableNumbers = [];
    let drawnNumbers = [];
    
    // Inizializzazione del Tabellone
    function initializeBoard() {
        for (let i = 1; i <= totalNumbers; i++) {
            availableNumbers.push(i);
        }
        
        for (let i = 1; i <= totalNumbers; i++) {
            const cell = document.createElement('div');
            cell.textContent = i;
            cell.classList.add('bingo-cell');
            cell.setAttribute('data-number', i.toString()); 
            
            board.appendChild(cell);
        }
    }
    
    // Estrazione
    function drawNumber() {
        if (availableNumbers.length === 0) {
            currentNumberDisplay.textContent = "FINITO!";
            drawButton.disabled = true;
            drawButton.textContent = "Estrazione Completata";
            return;
        }
        
        drawButton.disabled = true;
        currentNumberDisplay.textContent = '...'; 

        setTimeout(() => { 
            
            const randomIndex = Math.floor(Math.random() * availableNumbers.length);
            const drawnNumber = availableNumbers[randomIndex];
            
            availableNumbers.splice(randomIndex, 1);
            drawnNumbers.push(drawnNumber);

            const cellElement = document.querySelector(`[data-number="${drawnNumber}"]`); 

            // Aggiorna il display del numero corrente con animazione
            currentNumberDisplay.classList.add('transform', 'scale-110'); 

            setTimeout(() => {
                currentNumberDisplay.textContent = drawnNumber;
                currentNumberDisplay.classList.remove('scale-110'); 
                
                // Se l'elemento è stato trovato, segnalo in rosso (classe 'drawn')
                if (cellElement) {
                    cellElement.classList.add('drawn');
                }
                
                drawnCountDisplay.textContent = `Estratti: ${drawnNumbers.length} / ${totalNumbers}`;
                drawButton.disabled = false;
            }, 300);

        }, 500); 
    }

    
    // Evento di click sul bottone
    drawButton.addEventListener('click', drawNumber);
    
    // Inizializzazione
    
    initializeBoard();
});