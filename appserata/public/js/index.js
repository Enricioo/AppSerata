document.addEventListener('DOMContentLoaded', () => {

    const gamesBlock = document.getElementById('games-block');
    const mainPlayButton = document.getElementById('main-play-button');
    const starField = document.getElementById('star-field');
    const numStars = 150;
    const carouselTrack = document.querySelector('.carousel-track');
    const cardTemplate = document.getElementById('card-template');
    const numCards = 23;
    const totalCards = numCards * 2;

    // Animazione del Titolo (Apparizione dal basso)
    anime({
        targets: '[data-anime="title"]',
        translateY: [50, 0],
        opacity: [0, 1],
        duration: 1200,
        easing: 'easeOutQuad'
    });

    // Animazione del Sottotitolo e pulsante
    anime({
        targets: '[data-anime="subtitle"], [data-anime="button"]',
        opacity: [0, 1],
        delay: anime.stagger(200, {start: 800}), // Inizia dopo 800ms
        duration: 800,
        easing: 'easeOutQuad'
    });

    // --- Generazione delle Stelle ---
    for (let i = 0; i < numStars; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        
        // Posizionamento casuale su tutto lo schermo
        star.style.left = `${Math.random() * 100}vw`;
        star.style.top = `${Math.random() * 100}vh`;
        
        // Dimensione casuale
        const size = Math.random() * 3 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        
        starField.appendChild(star);
    }

    // Animazione delle Stelle
    anime({
        targets: '.star',
        // Animazione di "pulsazione" e movimento leggero
        opacity: [
            { value: 1, duration: 100, easing: 'linear' },
            { value: 0.2, duration: 1000, easing: 'easeInOutQuad' }
        ],
        scale: [
            { value: 1.5, duration: 500 },
            { value: 1, duration: 500 }
        ],
        translateX: function() { return anime.random(-100, 100); }, // Spostamento laterale casuale
        translateY: function() { return anime.random(-100, 100); }, // Spostamento verticale casuale
        delay: anime.stagger(100), // Inizio a cascata
        duration: function() { return anime.random(2000, 5000); }, // Durata variabile
        loop: true, // Animazione infinita
        direction: 'alternate', // Alterna andata e ritorno
        easing: 'easeInOutSine'
    });
    
    // Animazione d'Ingresso del Contenuto
    anime({
        targets: '[data-anime="title"]',
        translateY: [50, 0],
        opacity: [0, 1],
        duration: 1200,
        easing: 'easeOutQuad'
    });

    anime({
        targets: '[data-anime="subtitle"], [data-anime="button"]',
        opacity: [0, 1],
        delay: anime.stagger(200, {start: 800}),
        duration: 800,
        easing: 'easeOutQuad'
    });

    
    anime({
        targets: mainPlayButton,
        opacity: [0, 1],
        delay: 800,
        duration: 800,
        easing: 'easeOutQuad'
    });

    mainPlayButton.addEventListener('click', () => {
                
        if (gamesBlock.classList.contains('h-0')) {
            
            gamesBlock.classList.remove('h-0', 'overflow-hidden');
            const height = gamesBlock.scrollHeight; 
            gamesBlock.style.height = `${height}px`;

            mainPlayButton.style.display = 'none';

        } else {
            gamesBlock.style.height = '0px';
            gamesBlock.addEventListener('transitionend', () => {
                gamesBlock.classList.add('h-0', 'overflow-hidden');
                mainPlayButton.style.display = 'inline-block';
            }, { once: true });
        }
    });

    function populateCarousel() {
        // Dati base dei giocatori (da cui estrarre casualmente)
        const names = [
        "Enrico M.",   // Giocatore 1
        "Sharon S.",      // Giocatore 2
        "Daniele P.",      // Giocatore 3
        "Giovanni S.",     // Giocatore 4
        "Giuseppe M.",      // Giocatore 5
        "Sara V.",     // Giocatore 6
        "Gabriele P.",     // Giocatore 7
        "Claudio C.",  // Giocatore 8
        "Nicolò F.",    // Giocatore 9
        "Andrea B.",     // Giocatore 10
        "Miriam F.",   // Giocatore 11
        "Giammarco P.",      // Giocatore 12
        "Gabriele V.",      // Giocatore 13
        "Debora S.",     // Giocatore 14
        "Federico C.",      // Giocatore 15
        "Stefano C.C.",     // Giocatore 16
        "Alessandro M.",     // Giocatore 17
        "Steven C.",  // Giocatore 18
        "Nicola R.",    // Giocatore 19
        "Samuele L.",     // Giocatore 20
        "Francesco I.",  // Giocatore 21
        "Azzurra C.",   // Giocatore 22
    ];

        const imagePaths = [
                'assets/partecipanti/Enrico.jpg',
                'assets/partecipanti/Sharon.jpg',
                'assets/partecipanti/Daniele.jpg',
                'assets/partecipanti/Giovanni.jpg',
                'assets/partecipanti/Giuseppe.jpg',
                'assets/partecipanti/Sara.jpg',
                'assets/partecipanti/Gabriele.jpg',
                'assets/partecipanti/Claudio.jpg',
                'assets/partecipanti/Nicolò.jpg',
                'assets/partecipanti/Andrea.jpg',
                'assets/partecipanti/Miriam.jpg',
                'assets/partecipanti/Giammarco.jpg',
                'assets/partecipanti/Gigino.jpg',
                'assets/partecipanti/Debora.jpg',
                'assets/partecipanti/Federico.jpg',
                'assets/partecipanti/Stefano.jpg',
                'assets/partecipanti/Alessandro.jpg',
                'assets/partecipanti/Steven.jpg',
                'assets/partecipanti/Nicola.jpg',
                'assets/partecipanti/Samuele.jpg',
                'assets/partecipanti/Francesco.jpg',
        ];

        if (!cardTemplate) {
        console.error("Card template non trovato!");
        return;
        }
            
        // Genera le card per l'intero track (doppio per loop)
        for (let i = 0; i < totalCards; i++) {
                const uniqueIndex = i % numCards; // Per ripetere i dati dopo 10
                
                const card = cardTemplate.content.cloneNode(true);
                
                // Setta l'immagine avatar casuale (indice da 1 a 20)
                card.querySelector('#avatar-img').src = imagePaths[uniqueIndex];
                
                // Setta nome e saldo
                card.querySelector('#user-name').textContent = names[uniqueIndex];
                
                const randomBalance = (Math.random() * 5000 + 500).toFixed(0);
                card.querySelector('p:nth-child(2)').textContent = `Live • Saldo: €${randomBalance}`;
                
                carouselTrack.appendChild(card);
            }
    }

    populateCarousel();

});


