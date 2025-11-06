package com.example.appserata.service;


import com.example.appserata.MoltiplicatoreSlot;
import com.example.appserata.SegmentoRuota;
import com.example.appserata.RisultatoGiro;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
public class RuotaService {



        private final List<SegmentoRuota> ruota;
        private final int pesoTotaleRuota;
        private final List<MoltiplicatoreSlot> topSlotMoltiplicatori;
        private final int pesoTotaleTopSlot;
        private final List<SegmentoRuota> topSlotSegmenti; // Solo numeri e bonus

        @Autowired
        public RuotaService() {
            // --- INIZIALIZZAZIONE RUOTA (54 Segmenti totali) ---
            this.ruota = new ArrayList<>();
            ruota.add(new SegmentoRuota("Numero 1", 1, 21, false));
            ruota.add(new SegmentoRuota("Numero 2", 2, 13, false));
            ruota.add(new SegmentoRuota("Numero 5", 5, 7, false));
            ruota.add(new SegmentoRuota("Numero 10", 10, 4, false));
            ruota.add(new SegmentoRuota("Cash Hunt", 0, 2, true));
            ruota.add(new SegmentoRuota("Pachinko", 0, 2, true));
            ruota.add(new SegmentoRuota("Coin Flip", 0, 4, true));
            ruota.add(new SegmentoRuota("Crazy Time", 0, 1, true));

            this.pesoTotaleRuota = ruota.stream()
                    .mapToInt(SegmentoRuota::getPesoProbabilistico)
                    .sum(); // Totale: 54

            // --- INIZIALIZZAZIONE SLOT MOLTIPLICATORI ---
            this.topSlotMoltiplicatori = List.of(
                    new MoltiplicatoreSlot(2, 50),
                    new MoltiplicatoreSlot(3, 30),
                    new MoltiplicatoreSlot(5, 15),
                    new MoltiplicatoreSlot(10, 5) // Raro
            );
            this.pesoTotaleTopSlot = topSlotMoltiplicatori.stream()
                    .mapToInt(MoltiplicatoreSlot::getPesoProbabilistico)
                    .sum(); // Totale: 100

            // --- INIZIALIZZAZIONE TOP SLOT SEGMENTI (Solo quelli possibili) ---
            // Il Top Slot può selezionare qualsiasi segmento della ruota
            this.topSlotSegmenti = ruota;
        }

        // --- Metodo di Estrazione Ponderata ---
        private <T> T estraiPonderato(List<T> elementi, int pesoTotale, java.util.function.ToIntFunction<T> getWeight) {
            int risultatoCasuale = new Random().nextInt(pesoTotale);
            int contatorePeso = 0;
            for (T elemento : elementi) {
                contatorePeso += getWeight.applyAsInt(elemento);
                if (risultatoCasuale < contatorePeso) {
                    return elemento;
                }
            }
            throw new IllegalStateException("Errore nel calcolo del risultato ponderato.");
        }

        // --- IL METODO PRINCIPALE DEL GIOCO ---
        public RisultatoGiro avviaGiro() {

            // 1. Estrazione del Bonus (Segmento e Moltiplicatore)
            MoltiplicatoreSlot moltiplicatoreTS = estraiPonderato(topSlotMoltiplicatori, pesoTotaleTopSlot, MoltiplicatoreSlot::getPesoProbabilistico);
            SegmentoRuota segmentoTS = estraiPonderato(topSlotSegmenti, pesoTotaleRuota, SegmentoRuota::getPesoProbabilistico);

            // 2. Rotazione della Ruota
            SegmentoRuota risultatoRuota = estraiPonderato(ruota, pesoTotaleRuota, SegmentoRuota::getPesoProbabilistico);

            // 3. Applicazione del Moltiplicatore Top Slot
            int moltiplicatoreFinale = risultatoRuota.getMoltiplicatore();
            boolean topSlotAttivato = false;
            String messaggioBase = "Ruota: " + risultatoRuota.getNome();

            if (risultatoRuota.getNome().equalsIgnoreCase(segmentoTS.getNome())) {
                moltiplicatoreFinale = risultatoRuota.getMoltiplicatore() > 0 ?
                        risultatoRuota.getMoltiplicatore() * moltiplicatoreTS.getValore() :
                        moltiplicatoreTS.getValore(); // Bonus ottiene solo il moltiplicatore
                topSlotAttivato = true;
                messaggioBase = messaggioBase + " + Top Slot x" + moltiplicatoreTS.getValore() + "!";
            }

            return new RisultatoGiro(
                    messaggioBase,
                    risultatoRuota.getNome(),
                    moltiplicatoreFinale,
                    topSlotAttivato
            );
        }

}
