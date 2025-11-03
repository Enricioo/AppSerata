package com.example.appserata.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import java.io.Serializable;

public class squadraModel {
    @Entity
    public class Squadra implements Serializable {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;
        private String nome;
        private int punteggioAttuale; // Punteggio in punti/crediti

        public Squadra() {}

        public Squadra(String nome, int punteggioAttuale) {
            this.nome = nome;
            this.punteggioAttuale = punteggioAttuale;
        }

        public Long getId() { return id; }
        public String getNome() { return nome; }
        public int getPunteggioAttuale() { return punteggioAttuale; }

        public void setNome(String nome) { this.nome = nome; }
        public void setPunteggioAttuale(int punteggioAttuale) { this.punteggioAttuale = punteggioAttuale; }
    }
}
