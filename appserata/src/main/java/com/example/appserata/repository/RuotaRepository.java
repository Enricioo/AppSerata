package com.example.appserata.repository;

import com.example.appserata.model.SquadraModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RuotaRepository extends JpaRepository<SquadraModel, Long> {

    Optional<SquadraModel> findByNome(String nome);

}
