package com.example.appserata.controller;

import com.example.appserata.risultatoGiro;
import com.example.appserata.service.ruotaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/gioco")
public class ruotaController {

    private final ruotaService.ServizioGioco servizioGioco;
    private final SimpMessagingTemplate messagingTemplate; // Per inviare messaggi WebSocket

    @Autowired
    public ruotaController(ruotaService.ServizioGioco servizioGioco, SimpMessagingTemplate messagingTemplate) {
        this.servizioGioco = servizioGioco;
        this.messagingTemplate = messagingTemplate;

    }

    @GetMapping("/avvia-giro")
    public risultatoGiro avviaGiro() {
        // 1. Esegui la logica di gioco
        risultatoGiro risultato = servizioGioco.avviaGiro();

        // 2. Invia il risultato a tutti i client WebSocket connessi al topic '/topic/risultato'
        // I client remoti si iscriveranno a questo topic per ricevere il risultato in tempo reale.
        messagingTemplate.convertAndSend("/topic/risultato", risultato);

        // 3. Ritorna il risultato (opzionale, utile per il debug)
        return risultato;
    }

}
