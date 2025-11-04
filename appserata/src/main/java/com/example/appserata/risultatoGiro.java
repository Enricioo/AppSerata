package com.example.appserata;

public class risultatoGiro {

    private final String messaggio; // Es: "Vincitore: Cash Hunt!"
    private final String segmentoVincente;
    private final int moltiplicatoreFinale;
    private final boolean topSlotAttivato;

    public risultatoGiro(String messaggio, String segmentoVincente, int moltiplicatoreFinale, boolean topSlotAttivato) {
        this.messaggio = messaggio;
        this.segmentoVincente = segmentoVincente;
        this.moltiplicatoreFinale = moltiplicatoreFinale;
        this.topSlotAttivato = topSlotAttivato;
    }
    
    public String getMessaggio() {
        return messaggio;
    }

    public String getSegmentoVincente() {
        return segmentoVincente;
    }

    public int getMoltiplicatoreFinale() {
        return moltiplicatoreFinale;
    }

    public boolean isTopSlotAttivato() {
        return topSlotAttivato;
    }

}
