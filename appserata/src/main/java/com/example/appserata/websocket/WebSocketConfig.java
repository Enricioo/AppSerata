package com.example.appserata.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Il prefisso per le destinazioni a cui il server invierà i messaggi (pubblicazione)
        config.enableSimpleBroker("/topic");
        // Il prefisso per gli endpoint a cui i client invieranno i messaggi (ricezione)
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // L'endpoint per la connessione WebSocket
        registry.addEndpoint("/ws-crazytime").setAllowedOriginPatterns("*");
    }
}
