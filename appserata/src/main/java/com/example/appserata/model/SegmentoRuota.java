package com.example.appserata.model;

public class SegmentoRuota {

    private final String nome;
    private final int moltiplicatore;
    private final int probabilita;

    public SegmentoRuota(String nome, int moltiplicatore, int probabilita) {
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

    public int getProbabilita() {
        return probabilita;
    }
    
}


