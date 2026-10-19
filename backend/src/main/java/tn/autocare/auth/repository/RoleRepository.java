package tn.autocare.auth.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import tn.autocare.auth.entity.Role;

public interface RoleRepository extends JpaRepository<Role, Long> {

	Optional<Role> findByName(String name);

	@Query("select r from Role r where r.id in (select ur.roleId from UserRole ur where ur.userId = :userId) order by r.name")
	List<Role> findAllByUserId(Long userId);

}
