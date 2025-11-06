package com.example.appserata;

public class SegmentoRuota {

    private final String nome;
    private final int moltiplicatore;
    private final int probabilita;

    public SegmentoRuota(String nome, int moltiplicatore, int probabilita, boolean b) {
        this.nome = nome;
        this.moltiplicatore = moltiplicatore;
        this.probabilita = probabilita;
    }

    public String getNome() {
        return nome;
    }

    public int getMoltiplicatore() {
        return moltiplicatore;
    }

    public int getPesoProbabilistico() {
        return probabilita;
    }
}


