package com.example.appserata.repository;

import com.example.appserata.model.squadraModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ruotaRepository extends JpaRepository<squadraModel.Squadra, Long> {

    Optional<squadraModel.Squadra> findByNome(String nome);

}
