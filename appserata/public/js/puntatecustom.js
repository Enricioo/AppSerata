tailwind.config = {
          theme: {
            extend: {
              fontFamily: {
                'pixel': ['"Press Start 2P"', 'cursive'],
              },
              colors: {
                'primary': '#f1c40f', // Giallo per i titoli
                'secondary': '#2ecc71', // Verde per il saldo (Open)
                'danger': '#e74c3c', // Rosso per gli errori (Closed)
                'background-dark': '#2c3e50',
                'container-dark': '#34495e',
                'number-bet': '#e67e22', // Arancione per i numeri
                'bonus-bet': '#9b55d1', // Viola per i bonus
              }
            }
          }
        }