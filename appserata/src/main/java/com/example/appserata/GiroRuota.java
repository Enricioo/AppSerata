package com.example.appserata;

public class GiroRuota {

    private final String nome;
    private final int moltiplicatore;
    private final int pesoProbabilistico;
    private final boolean isBonus;

    public GiroRuota(String nome, int moltiplicatore, int pesoProbabilistico, boolean isBonus) {
        this.nome = nome;
        this.moltiplicatore = moltiplicatore;
        this.pesoProbabilistico = pesoProbabilistico;
        this.isBonus = isBonus;
    }

    public String getNome() {
        return nome;
    }

    public int getMoltiplicatore() {
        return moltiplicatore;
    }

    public int getPesoProbabilistico() {
        return pesoProbabilistico;
    }

    public boolean isBonus() {
        return isBonus;
    }
}
