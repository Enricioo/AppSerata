package com.example.appserata;

import java.util.List;

public class ruotaBonusCrazyTime {

    private final List<SegmentoRuota> ruotaBonus;
    private final int pesoTotaleBonus;

    public ruotaBonusCrazyTime() {
        this.ruotaBonus = List.of(
                new SegmentoRuota("10x", 10, 15, false),
                new SegmentoRuota("25x", 25, 10, false),
                new SegmentoRuota("DOUBLE", 0, 3, true)

        );
        this.pesoTotaleBonus = ruotaBonus.stream().mapToInt(SegmentoRuota::getPesoProbabilistico).sum();
    }

    // Metodo per estrarre il risultato del bonus
    public SegmentoRuota giraBonus() {

        // da modificare
        return null;

    }

}
