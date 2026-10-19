package tn.autocare.auth.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import tn.autocare.auth.entity.UserRole;

public interface UserRoleRepository extends JpaRepository<UserRole, Long> {

	boolean existsByUserIdAndRoleId(Long userId, Long roleId);

	List<UserRole> findAllByUserId(Long userId);

	List<UserRole> findAllByRoleId(Long roleId);

	/** roleId, number of users holding it. */
	@Query("select ur.roleId, count(ur) from UserRole ur group by ur.roleId")
	List<Object[]> countUsersByRole();

}
