package com.example.appserata.controller;

import com.example.appserata.RisultatoGiro;
import com.example.appserata.service.RuotaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/gioco")
public class RuotaController {

    private final RuotaService ruotaService;
    private final SimpMessagingTemplate messagingTemplate; // Per inviare messaggi WebSocket

    @Autowired
    public RuotaController(RuotaService ruotaService, SimpMessagingTemplate messagingTemplate) {
        this.ruotaService = ruotaService;
        this.messagingTemplate = messagingTemplate;

    }

    @GetMapping("/avvia-giro")
    public RisultatoGiro avviaGiro() {
        // 1. Esegui la logica di gioco
        RisultatoGiro risultato = ruotaService.avviaGiro();

        // 2. Invia il risultato a tutti i client WebSocket connessi al topic '/topic/risultato'
        // I client remoti si iscriveranno a questo topic per ricevere il risultato in tempo reale.
        messagingTemplate.convertAndSend("/topic/risultato", risultato);

        // 3. Ritorna il risultato (opzionale, utile per il debug)
        return risultato;
    }

}
